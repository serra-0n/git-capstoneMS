"use strict";

const { randomUUID } = require("node:crypto");

const pool = require("../config/database");
const config = require("./config");
const provider = require("./provider");

if (!config.accountLabel) {
    throw new Error(
        "PayMongo config must export accountLabel with a capital L."
    );
}

for (const name of [
    "createCheckout",
    "retrieveCheckout",
    "expireCheckout",
    "validateCheckoutUrl"
]) {
    if (typeof provider[name] !== "function") {
        throw new Error(
            `PayMongo provider is missing the ${name} function.`
        );
    }
}

function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}


function cents(value) {
    const text = String(value);

    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
        throw new Error("Invalid monetary value in the database.");
    }

    const [whole, fraction = ""] = text.split(".");

    const result =
        Number(whole) * 100 +
        Number(fraction.padEnd(2, "0"));

    if (!Number.isSafeInteger(result)) {
        throw new Error("Monetary value exceeds the supported range.");
    }

    return result;
}

function pesos(value) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error("Invalid centavo amount.");
    }

    return (
        `${Math.floor(value / 100)}.` +
        String(value % 100).padStart(2, "0")
    );
}

async function transaction(callback) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const result = await callback(connection);

        await connection.commit();

        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function findAttempt(id, executor = pool) {
    const [rows] = await executor.execute(
        `SELECT *
         FROM paymongo_attempts
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
}

function assertAccount(attempt) {
    if (
        attempt.account_label !== config.accountLabel ||
        attempt.mode !== config.mode
    ) {
        throw httpError(
            409,
            "This attempt belongs to another merchant account or mode."
        );
    }
}


async function lockAttempt(connection, attemptId) {
    const initial = await findAttempt(attemptId, connection);

    if (!initial) {
        throw httpError(404, "Payment attempt was not found.");
    }

    const [reservations] = await connection.execute(
        `SELECT *,
                deposit_due_at > NOW() AS deadline_open
         FROM reservations
         WHERE id = ?
         FOR UPDATE`,
        [initial.reservation_id]
    );

    const [attempts] = await connection.execute(
        `SELECT *,
                expires_at <= NOW() AS is_due
         FROM paymongo_attempts
         WHERE id = ?
         FOR UPDATE`,
        [attemptId]
    );

    const reservation = reservations[0];
    const attempt = attempts[0];

    if (!reservation || !attempt) {
        throw httpError(
            404,
            "The reservation or payment attempt was not found."
        );
    }

    assertAccount(attempt);

    if (
        String(reservation.client_id) !== String(attempt.client_id) ||
        String(reservation.tenant_id) !== String(attempt.tenant_id)
    ) {
        throw new Error(
            "The payment attempt does not match its reservation."
        );
    }

    return { reservation, attempt };
}

async function markForReview(connection, attemptId, reason) {
    await connection.execute(
        `UPDATE paymongo_attempts
         SET status = 'needs_review',
             review_reason = ?
         WHERE id = ?`,
        [reason.slice(0, 255), attemptId]
    );
}


async function releaseUnpaid(
    connection,
    attempt,
    reservation,
    status
) {
    const ownsActiveSlot =
        String(attempt.active_reservation_id) ===
        String(reservation.id);

    await connection.execute(
        `UPDATE paymongo_attempts
         SET status = ?,
             active_reservation_id = NULL
         WHERE id = ?`,
        [status, attempt.id]
    );

    if (!ownsActiveSlot || reservation.payment_status !== "pending") {
        return;
    }

    if (
        reservation.reservation_status === "awaiting_deposit" &&
        !Number(reservation.deadline_open)
    ) {
        await connection.execute(
            `UPDATE reservations
             SET reservation_status = 'expired',
                 payment_status = 'not_required',
                 expired_at = COALESCE(expired_at, NOW())
             WHERE id = ?`,
            [reservation.id]
        );

        return;
    }

    if (
        !["awaiting_deposit", "confirmed"].includes(
            reservation.reservation_status
        )
    ) {
        return;
    }

    const paymentStatus =
        cents(reservation.amount_paid) > 0
            ? "partially_paid"
            : "unpaid";

    await connection.execute(
        `UPDATE reservations
         SET payment_status = ?
         WHERE id = ?`,
        [paymentStatus, reservation.id]
    );
}

async function startCheckout(
    clientId,
    reservationId,
    requestedStage
) {
    if (!["deposit", "full", "balance"].includes(requestedStage)) {
        throw httpError(400, "A valid payment option is required.");
    }

    const result = await transaction(async (connection) => {
        const [rows] = await connection.execute(
            `SELECT *,
                    deposit_due_at > NOW() AS deadline_open
             FROM reservations
             WHERE id = ?
               AND client_id = ?
             FOR UPDATE`,
            [reservationId, clientId]
        );

        const reservation = rows[0];

        if (!reservation) {
            throw httpError(404, "Reservation was not found.");
        }

        if (!config.tenantIds.has(String(reservation.tenant_id))) {
            throw httpError(
                409,
                "Online GCash payment is not enabled for this resort."
            );
        }

        const [tenants] = await connection.execute(
            `SELECT id
             FROM tenants
             WHERE id = ?
               AND approval_status = 'approved'
               AND tenant_status = 'active'
             LIMIT 1`,
            [reservation.tenant_id]
        );

        if (!tenants.length) {
            throw httpError(
                409,
                "This resort is not currently accepting online payments."
            );
        }

        const [activeAttempts] = await connection.execute(
            `SELECT *,
                    expires_at <= NOW() AS is_due
             FROM paymongo_attempts
             WHERE active_reservation_id = ?
             FOR UPDATE`,
            [reservation.id]
        );

        const active = activeAttempts[0];

        if (active) {
            assertAccount(active);

            if (active.payment_stage !== requestedStage) {
                throw httpError(
                    409,
                    "Another payment stage already has an active checkout."
                );
            }

            if (!["awaiting_deposit", "confirmed"].includes(
                reservation.reservation_status
            )) {
                throw httpError(
                    409,
                    "This reservation can no longer use its checkout."
                );
            }

            if (
                active.status === "pending" &&
                (
                    Number(active.is_due) ||
                    (
                        active.payment_stage !== "balance" &&
                        !Number(reservation.deadline_open)
                    )
                )
            ) {
                throw httpError(
                    409,
                    "The previous checkout is being reconciled. Try again shortly."
                );
            }

            return {
                attempt: active,
                created: false
            };
        }

        const total = cents(reservation.total_amount);
        const alreadyPaid = cents(reservation.amount_paid);

        let stage;
        let amount;

        if (
            reservation.reservation_status === "confirmed" &&
            reservation.payment_status === "partially_paid"
        ) {
            stage = "balance";
            amount = total - alreadyPaid;
        } else {
            if (
                reservation.reservation_status !== "awaiting_deposit" ||
                reservation.payment_status !== "unpaid"
            ) {
                throw httpError(
                    409,
                    "This reservation is not awaiting an initial payment."
                );
            }

            if (!Number(reservation.deadline_open)) {
                throw httpError(
                    410,
                    "The reservation payment deadline has passed."
                );
            }

            if (alreadyPaid !== 0) {
                throw httpError(
                    409,
                    "The existing payment totals need review."
                );
            }

            if (!["half", "full", "later"].includes(
                reservation.payment_plan
            )) {
                throw httpError(409, "The payment plan is invalid.");
            }

            stage =
                reservation.payment_plan === "half"
                    ? "deposit"
                    : "full";

            amount =
                stage === "deposit"
                    ? cents(reservation.deposit_amount)
                    : total;
        }

        if (requestedStage !== stage) {
            throw httpError(
                409,
                `This reservation requires ${stage} payment.`
            );
        }

        if (
            !Number.isSafeInteger(amount) ||
            amount <= 0 ||
            amount > total - alreadyPaid
        ) {
            throw httpError(409, "The payable amount is invalid.");
        }

        const id = randomUUID();

        await connection.execute(
            `INSERT INTO paymongo_attempts (
                id,
                reservation_id,
                tenant_id,
                client_id,
                account_label,
                mode,
                payment_stage,
                expected_centavos,
                previous_paid_centavos,
                active_reservation_id,
                expires_at
             )
             VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                CASE
                    WHEN ? = 'balance'
                        THEN DATE_ADD(NOW(), INTERVAL 30 MINUTE)
                    ELSE LEAST(
                        ?,
                        DATE_ADD(NOW(), INTERVAL 30 MINUTE)
                    )
                END
             )`,
            [
                id,
                reservation.id,
                reservation.tenant_id,
                clientId,
                config.accountLabel,
                config.mode,
                stage,
                amount,
                alreadyPaid,
                reservation.id,
                stage,
                reservation.deposit_due_at
            ]
        );


        await connection.execute(
            `UPDATE reservations
             SET payment_status = 'pending'
             WHERE id = ?`,
            [reservation.id]
        );

        return {
            attempt: await findAttempt(id, connection),
            created: true
        };
    });

    if (!result.created) {
        return result.attempt;
    }


    try {
        const session = await provider.createCheckout(result.attempt);

        await attachSession(result.attempt.id, session);
    } catch (error) {
        const definitelyRejected =
            [400, 401, 403, 422].includes(error.providerStatus);

        await transaction(async (connection) => {
            const { attempt, reservation } =
                await lockAttempt(connection, result.attempt.id);


            if (
                attempt.checkout_id ||
                attempt.status !== "creating"
            ) {
                return;
            }

            if (definitelyRejected) {
                await releaseUnpaid(
                    connection,
                    attempt,
                    reservation,
                    "failed"
                );
            } else {
                await markForReview(
                    connection,
                    attempt.id,
                    "Checkout creation outcome is unknown. Check PayMongo before retrying."
                );
            }
        });

        console.error(
            "PayMongo checkout creation failed:",
            error.message
        );
    }

    return findAttempt(result.attempt.id);
}

async function attachSession(attemptId, session) {
    const attributes = session?.attributes;

    if (
        session?.type !== "checkout_session" ||
        typeof session.id !== "string" ||
        !attributes ||
        attributes.reference_number !== attemptId ||
        attributes.livemode !== config.live
    ) {
        throw new Error(
            "The checkout reference or mode does not match."
        );
    }

    const checkoutUrl = attributes.checkout_url
        ? provider.validateCheckoutUrl(attributes.checkout_url)
        : null;

    return transaction(async (connection) => {
        const { attempt } = await lockAttempt(connection, attemptId);

        if (
            attempt.checkout_id &&
            attempt.checkout_id !== session.id
        ) {
            throw new Error(
                "This attempt is already linked to another checkout."
            );
        }


        const recoveredCreation =
            attempt.status === "creating" ||
            (
                attempt.status === "needs_review" &&
                !attempt.checkout_id &&
                !attempt.provider_payment_id
            );

        await connection.execute(
            `UPDATE paymongo_attempts
             SET checkout_id = ?,
                 checkout_url = COALESCE(?, checkout_url),
                 status = ?,
                 review_reason = ?
             WHERE id = ?`,
            [
                session.id,
                checkoutUrl,
                recoveredCreation ? "pending" : attempt.status,
                recoveredCreation ? null : attempt.review_reason,
                attempt.id
            ]
        );
    });
}

function paidPayments(session) {
    const attributes = session.attributes || {};

    const directPayments =
        Array.isArray(attributes.payments)
            ? attributes.payments
            : [];

    const intentPayments =
        Array.isArray(
            attributes.payment_intent?.attributes?.payments
        )
            ? attributes.payment_intent.attributes.payments
            : [];

    const unique = new Map();

    for (const payment of [...directPayments, ...intentPayments]) {
        if (payment?.attributes?.status === "paid") {
            unique.set(payment.id, payment);
        }
    }

    return [...unique.values()];
}

async function applySession(attemptId, session) {
    return transaction(async (connection) => {
        const { attempt, reservation } =
            await lockAttempt(connection, attemptId);

        if (
            session?.type !== "checkout_session" ||
            session.id !== attempt.checkout_id ||
            session.attributes?.reference_number !== attempt.id ||
            session.attributes?.livemode !== config.live
        ) {
            throw new Error(
                "The provider session does not match this attempt."
            );
        }

        const payments = paidPayments(session);

        if (payments.length > 1) {
            await markForReview(
                connection,
                attempt.id,
                "Multiple paid payments exist for this checkout."
            );

            return;
        }

        const payment = payments[0];


        if (attempt.provider_payment_id) {
            if (
                payment &&
                payment.id !== attempt.provider_payment_id
            ) {
                await markForReview(
                    connection,
                    attempt.id,
                    "The provider payment ID changed. Investigate this checkout."
                );
            }

            return;
        }

        if (attempt.status === "paid") {
            return;
        }

        if (!payment) {
            if (
                session.attributes.status === "expired" &&
                ["pending", "creating"].includes(attempt.status)
            ) {
                await releaseUnpaid(
                    connection,
                    attempt,
                    reservation,
                    "expired"
                );
            }

            return;
        }

        const attributes = payment.attributes;
        const received = Number(attributes.amount);

        if (
            typeof payment.id !== "string" ||
            !Number.isSafeInteger(received) ||
            received <= 0 ||
            !/^[A-Z]{3}$/.test(attributes.currency || "")
        ) {
            throw new Error(
                "The provider payment data is incomplete."
            );
        }

        const currentPaid = cents(reservation.amount_paid);
        const total = cents(reservation.total_amount);

        const ownsActiveSlot =
            String(attempt.active_reservation_id) ===
            String(reservation.id);

        let reason = null;

        if (attributes.livemode !== config.live) {
            reason = "The payment mode does not match.";
        } else if (
            attributes.currency !== "PHP" ||
            received !== Number(attempt.expected_centavos)
        ) {
            reason = "The received amount or currency does not match.";
        } else if (attributes.source?.type !== "gcash") {
            reason = "The payment source is not GCash.";
        } else if (attempt.status === "needs_review") {
            reason =
                attempt.review_reason ||
                "This attempt already requires manual review.";
        } else if (
            ["expired", "failed"].includes(attempt.status) ||
            !ownsActiveSlot
        ) {
            reason = "Payment arrived after this attempt was closed.";
        } else if (
            currentPaid !== Number(attempt.previous_paid_centavos) ||
            currentPaid + received > total
        ) {
            reason =
                "Reservation totals changed or payment exceeds the balance.";
        } else if (reservation.payment_status !== "pending") {
            reason = "The reservation is no longer awaiting this payment.";
        } else if (attempt.payment_stage === "balance") {
            if (reservation.reservation_status !== "confirmed") {
                reason = "The reservation is no longer confirmed.";
            }
        } else if (
            reservation.reservation_status !== "awaiting_deposit" ||
            !Number(reservation.deadline_open)
        ) {
            reason =
                "The initial payment arrived after the reservation state or deadline changed.";
        }

        const rawPaidAt = Number(attributes.paid_at);

        const providerPaidAt =
            Number.isSafeInteger(rawPaidAt) && rawPaidAt > 0
                ? rawPaidAt
                : null;

        const finalStatus = reason ? "needs_review" : "paid";

        await connection.execute(
            `UPDATE paymongo_attempts
             SET provider_payment_id = ?,
                 received_centavos = ?,
                 received_currency = ?,
                 provider_paid_at = FROM_UNIXTIME(?),
                 status = ?,
                 review_reason = ?,
                 settled_at = CASE
                     WHEN ? = 'paid' THEN NOW()
                     ELSE settled_at
                 END,
                 active_reservation_id = CASE
                     WHEN ? = 'paid' THEN NULL
                     ELSE active_reservation_id
                 END
             WHERE id = ?`,
            [
                payment.id,
                received,
                attributes.currency,
                providerPaidAt,
                finalStatus,
                reason,
                finalStatus,
                finalStatus,
                attempt.id
            ]
        );

        if (reason) {

            if (
                ownsActiveSlot &&
                reservation.reservation_status === "awaiting_deposit" &&
                !Number(reservation.deadline_open)
            ) {
                await connection.execute(
                    `UPDATE reservations
                     SET reservation_status = 'expired',
                         expired_at = COALESCE(expired_at, NOW())
                     WHERE id = ?`,
                    [reservation.id]
                );
            }

            return;
        }

        const newPaid = currentPaid + received;

        await connection.execute(
            `UPDATE reservations
             SET amount_paid = ?,
                 payment_status = ?,
                 reservation_status = 'confirmed',
                 deposit_due_at = NULL
             WHERE id = ?`,
            [
                pesos(newPaid),
                newPaid === total ? "paid" : "partially_paid",
                reservation.id
            ]
        );
    });
}

async function reconcileAttempt(attemptId) {
    const attempt = await findAttempt(attemptId);

    if (!attempt?.checkout_id) {
        return;
    }

    assertAccount(attempt);

    try {
        let session = await provider.retrieveCheckout(
            attempt.checkout_id
        );

        await applySession(attempt.id, session);

        const [rows] = await pool.execute(
            `SELECT *,
                    expires_at <= NOW() AS is_due
             FROM paymongo_attempts
             WHERE id = ?`,
            [attempt.id]
        );

        const current = rows[0];

        if (
            current?.status === "pending" &&
            Number(current.is_due) &&
            paidPayments(session).length === 0 &&
            session.attributes.status !== "expired"
        ) {
            try {
                await provider.expireCheckout(attempt.checkout_id);
            } catch (error) {
                console.error(
                    "Checkout expiration request failed:",
                    error.message
                );
            }


            session = await provider.retrieveCheckout(
                attempt.checkout_id
            );

            await applySession(attempt.id, session);
        }
    } finally {
        await pool.execute(
            `UPDATE paymongo_attempts
             SET last_checked_at = NOW()
             WHERE id = ?`,
            [attempt.id]
        );
    }
}

async function reconcileBatch() {

    await pool.execute(
        `UPDATE paymongo_attempts
         SET status = 'needs_review',
             review_reason =
                'Checkout creation was interrupted. Check PayMongo before retrying.'
         WHERE status = 'creating'
           AND checkout_id IS NULL
           AND account_label = ?
           AND mode = ?
           AND created_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)`,
        [
            config.accountLabel,
            config.mode
        ]
    );

    const [attempts] = await pool.execute(
        `SELECT id
         FROM paymongo_attempts
         WHERE account_label = ?
           AND mode = ?
           AND checkout_id IS NOT NULL
           AND status = 'pending'
           AND (
               last_checked_at IS NULL
               OR last_checked_at < DATE_SUB(NOW(), INTERVAL 45 SECOND)
           )
         ORDER BY COALESCE(last_checked_at, created_at)
         LIMIT 25`,
        [
            config.accountLabel,
            config.mode
        ]
    );

    for (const attempt of attempts) {
        try {
            await reconcileAttempt(attempt.id);
        } catch (error) {
            console.error(
                `Reconciliation failed for ${attempt.id}:`,
                error.message
            );
        }
    }
}

module.exports = {
    cents,
    startCheckout,
    findAttempt,
    attachSession,
    applySession,
    reconcileAttempt,
    reconcileBatch
};