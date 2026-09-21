"use strict";

const express = require("express");
const crypto = require("node:crypto");

const pool = require("../config/database");

const {
    authenticateUser,
    requireRole
} = require("../middleware/authMiddleware");

const config = require("./config");
const provider = require("./provider");
const service = require("./service");

const router = express.Router();

function validId(value) {
    return /^[1-9]\d*$/.test(String(value)) &&
        Number.isSafeInteger(Number(value));
}

function validAttemptId(value) {
    return (
        typeof value === "string" &&
        /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(value)
    );
}


function verifySignature(rawBody, signatureHeader) {
    if (
        !Buffer.isBuffer(rawBody) ||
        typeof signatureHeader !== "string"
    ) {
        return false;
    }

    const parts = Object.create(null);

    for (const item of signatureHeader.split(",")) {
        const separator = item.indexOf("=");

        if (separator === -1) {
            return false;
        }

        const key = item.slice(0, separator).trim();
        const value = item.slice(separator + 1).trim();

        if (Object.hasOwn(parts, key)) {
            return false;
        }

        parts[key] = value;
    }

    const timestamp = parts.t;
    const signature = parts[config.live ? "li" : "te"];

    if (
        !/^\d+$/.test(timestamp || "") ||
        !/^[a-fA-F0-9]{64}$/.test(signature || "")
    ) {
        return false;
    }

    const timestampSeconds = Number(timestamp);

    if (
        !Number.isSafeInteger(timestampSeconds) ||
        Math.abs(Date.now() / 1000 - timestampSeconds) > 300
    ) {
        return false;
    }

    const expected = crypto
        .createHmac("sha256", config.webhookSecret)
        .update(`${timestamp}.`)
        .update(rawBody)
        .digest();

    const received = Buffer.from(signature, "hex");

    return received.length === expected.length &&
        crypto.timingSafeEqual(received, expected);
}

function normalizeEvent(payload) {
    const event = payload?.data;

    if (event?.type === "event") {
        return {
            id: event.id,
            type: event.attributes?.type,
            livemode: event.attributes?.livemode,
            resource: event.attributes?.data
        };
    }

    return {
        id: event?.id,
        type: event?.type,
        livemode: event?.livemode,
        resource: event?.data
    };
}

function containsPaidPayment(session) {
    const attributes = session.attributes || {};

    const payments = [
        ...(Array.isArray(attributes.payments)
            ? attributes.payments
            : []),

        ...(Array.isArray(
            attributes.payment_intent?.attributes?.payments
        )
            ? attributes.payment_intent.attributes.payments
            : [])
    ];

    return payments.some(
        (payment) => payment?.attributes?.status === "paid"
    );
}


async function webhook(request, response) {
    if (
        !verifySignature(
            request.body,
            request.get("Paymongo-Signature")
        )
    ) {
        return response.status(401).json({
            message: "Invalid webhook signature."
        });
    }

    let payload;

    try {
        payload = JSON.parse(request.body.toString("utf8"));
    } catch {
        return response.status(400).json({
            message: "Invalid webhook JSON."
        });
    }

    const event = normalizeEvent(payload);

    if (!event.type) {
        return response.status(400).json({
            message: "The webhook event type is missing."
        });
    }

    if (event.type !== "checkout_session.payment.paid") {
        return response.json({
            received: true,
            ignored: true
        });
    }

    if (
        event.livemode !== config.live ||
        event.resource?.type !== "checkout_session" ||
        !/^cs_[A-Za-z0-9]+$/.test(event.resource?.id || "")
    ) {
        return response.status(400).json({
            message: "The webhook checkout or mode is invalid."
        });
    }

    const eventIdentity =
        typeof event.id === "string" && event.id
            ? event.id
            : request.body;

    const eventKey = crypto
        .createHash("sha256")
        .update(`${config.accountLabel}:${config.mode}:`)
        .update(eventIdentity)
        .digest("hex");

    try {
        const [processed] = await pool.execute(
            `SELECT event_key
             FROM paymongo_webhook_events
             WHERE event_key = ?
             LIMIT 1`,
            [eventKey]
        );

        if (processed.length) {
            return response.json({
                received: true,
                duplicate: true
            });
        }


        const session = await provider.retrieveCheckout(
            event.resource.id
        );

        const attemptId = session.attributes?.reference_number;

        if (
            session.id !== event.resource.id ||
            session.attributes?.livemode !== config.live
        ) {
            throw new Error(
                "The retrieved checkout does not match the event."
            );
        }

        if (!validAttemptId(attemptId)) {
            return response.json({
                received: true,
                ignored: true
            });
        }

        const attempt = await service.findAttempt(attemptId);

        if (!attempt) {
            return response.json({
                received: true,
                ignored: true
            });
        }

        if (!containsPaidPayment(session)) {
            throw new Error(
                "The provider has not yet returned the paid payment."
            );
        }

        await service.attachSession(attempt.id, session);
        await service.applySession(attempt.id, session);

        await pool.execute(
            `INSERT INTO paymongo_webhook_events (
                event_key,
                event_type,
                checkout_id
             )
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                event_key = VALUES(event_key)`,
            [
                eventKey,
                event.type,
                session.id
            ]
        );

        return response.json({
            received: true
        });
    } catch (error) {
        console.error(
            "PayMongo webhook processing failed:",
            error.message
        );

        return response.status(500).json({
            message: "Webhook processing failed."
        });
    }
}

async function requireCurrentAccess(request, response, next) {
    const [users] = await pool.execute(
        `SELECT id, role, account_status
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [request.user.id]
    );

    const user = users[0];

    if (!user || user.account_status !== "active") {
        return response.status(403).json({
            message: "Your account is inactive or unavailable."
        });
    }

    if (request.user.role === "client") {
        if (user.role === "system_admin") {
            return response.status(403).json({
                message: "This account cannot use client payment routes."
            });
        }

        return next();
    }

    if (!validId(request.user.tenantId)) {
        return response.status(403).json({
            message: "A valid resort context is required."
        });
    }

    const [memberships] = await pool.execute(
        `SELECT tm.id
         FROM tenant_memberships tm
         INNER JOIN tenants t ON t.id = tm.tenant_id
         WHERE tm.user_id = ?
           AND tm.tenant_id = ?
           AND tm.membership_status = 'active'
           AND tm.membership_role IN ('owner', 'admin')
           AND t.approval_status = 'approved'
           AND t.tenant_status = 'active'
         LIMIT 1`,
        [
            request.user.id,
            request.user.tenantId
        ]
    );

    if (!memberships.length) {
        return response.status(403).json({
            message: "Your resort administrator access is unavailable."
        });
    }

    return next();
}


router.use((request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
});

router.use(express.json({ limit: "16kb" }));
router.use(authenticateUser);
router.use(requireRole("client", "resort_admin"));
router.use(requireCurrentAccess);

router.get("/overview", async (request, response) => {
    if (request.user.role === "resort_admin") {
        const [payments] = await pool.execute(
            `SELECT
                p.id,
                p.reservation_id,
                r.reservation_code,
                p.payment_stage,
                p.expected_centavos,
                p.received_centavos,
                p.status,
                p.provider_payment_id,
                p.review_reason,
                p.created_at
             FROM paymongo_attempts p
             INNER JOIN reservations r
                ON r.id = p.reservation_id
             WHERE p.tenant_id = ?
               AND r.tenant_id = ?
               AND p.account_label = ?
               AND p.mode = ?
             ORDER BY p.created_at DESC
             LIMIT 200`,
            [
                request.user.tenantId,
                request.user.tenantId,
                config.accountLabel,
                config.mode
            ]
        );

        return response.json({
            role: "resort_admin",
            payments
        });
    }

    const [reservations] = await pool.execute(
        `SELECT
            r.id,
            r.reservation_code,
            r.tenant_id,
            r.total_amount,
            r.amount_paid,
            r.deposit_amount,
            r.payment_plan,
            r.reservation_status,
            r.payment_status,
            r.deposit_due_at,
            r.deposit_due_at > NOW() AS deadline_open,
            t.approval_status,
            t.tenant_status
         FROM reservations r
         INNER JOIN tenants t ON t.id = r.tenant_id
         WHERE r.client_id = ?
         ORDER BY r.created_at DESC`,
        [request.user.id]
    );

    const [payments] = await pool.execute(
        `SELECT
            p.id,
            p.reservation_id,
            p.payment_stage,
            p.expected_centavos,
            p.received_centavos,
            p.status,
            p.active_reservation_id,
            p.review_reason,
            p.created_at
         FROM paymongo_attempts p
         INNER JOIN reservations r
            ON r.id = p.reservation_id
         WHERE p.client_id = ?
           AND r.client_id = ?
           AND p.account_label = ?
           AND p.mode = ?
         ORDER BY p.created_at DESC
         LIMIT 200`,
        [
            request.user.id,
            request.user.id,
            config.accountLabel,
            config.mode
        ]
    );

    return response.json({
        role: "client",
        reservations: reservations.map((reservation) => ({
            ...reservation,
            online_enabled:
                config.tenantIds.has(String(reservation.tenant_id)) &&
                reservation.approval_status === "approved" &&
                reservation.tenant_status === "active"
        })),
        payments
    });
});

router.post(
    "/reservations/:id/checkout",
    requireRole("client"),
    async (request, response) => {
        if (!validId(request.params.id)) {
            return response.status(400).json({
                message: "A valid reservation ID is required."
            });
        }

        const stage = request.body?.payment_option;

        if (!["deposit", "full", "balance"].includes(stage)) {
            return response.status(400).json({
                message: "A valid payment option is required."
            });
        }

        const attempt = await service.startCheckout(
            request.user.id,
            Number(request.params.id),
            stage
        );

        return response.json({
            attempt_id: attempt.id,
            status: attempt.status,
            checkout_url:
                attempt.status === "pending"
                    ? attempt.checkout_url
                    : null,
            message: attempt.review_reason || null
        });
    }
);

router.get(
    "/attempts/:id",
    requireRole("client"),
    async (request, response) => {
        if (!validAttemptId(request.params.id)) {
            return response.status(400).json({
                message: "A valid payment attempt ID is required."
            });
        }

        const [rows] = await pool.execute(
            `SELECT
                p.id,
                p.reservation_id,
                p.status,
                p.expected_centavos,
                p.received_centavos,
                p.review_reason,
                r.payment_status,
                r.reservation_status,
                r.amount_paid
             FROM paymongo_attempts p
             INNER JOIN reservations r
                ON r.id = p.reservation_id
             WHERE p.id = ?
               AND p.client_id = ?
               AND r.client_id = ?
               AND p.account_label = ?
               AND p.mode = ?
             LIMIT 1`,
            [
                request.params.id,
                request.user.id,
                request.user.id,
                config.accountLabel,
                config.mode
            ]
        );

        if (!rows.length) {
            return response.status(404).json({
                message: "Payment attempt was not found."
            });
        }

        return response.json({
            attempt: rows[0]
        });
    }
);

router.use((error, request, response, next) => {
    if (response.headersSent) {
        return next(error);
    }

    console.error(
        "PayMongo API request failed:",
        error.code || error.name
    );

    const status =
        Number.isInteger(error.status) &&
        error.status >= 400 &&
        error.status <= 599
            ? error.status
            : 500;

    return response.status(status).json({
        message:
            status < 500
                ? error.message
                : "Unable to process the payment request."
    });
});

module.exports = {
    router,
    webhook,
    verifySignature
};