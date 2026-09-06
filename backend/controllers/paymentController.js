"use strict";

const fs = require("fs");
const path = require("path");
const pool = require("../config/database");
const Payment = require("../models/Payment");

function removeUploadFile(file) {
    if (!file?.path) {
        return;
    }
    fs.unlink(file.path, () => {});
}

async function submitDeposit(request, response) {
    const reservationId = Number(request.body.reservation_id);
    const paymentOption = String(request.body.payment_option || "")
        .trim()
        .toLowerCase();

    const allowedPaymentOptions = ["full", "deposit", "balance"];

    const paymentMethod = String(request.body.payment_method || "")
        .trim();

    const transactionReference = String(request.body.transaction_reference || "")
        .trim();

    const allowedMethods = [
        "gcash",
        "manual_transaction"
    ];

    if (!Number.isInteger(reservationId) || reservationId < 1) {
        removeUploadFile(request.file);

        return response.status(400).json({
            message: "A valid reservation is required."
        });
    }

    if (!allowedMethods.includes(paymentMethod)) {
        removeUploadFile(request.file);

        return response.status(400).json({
            message: "A valid payment method is required."
        });
    }

    if (!allowedPaymentOptions.includes(paymentOption)) {
        removeUploadFile(request.file);

        return response.status(400).json({
            message: "A valid payment option is required."
        });
    }

    if (!/^[A-Za-z0-9-]{6,100}$/.test(transactionReference)) {
        removeUploadFile(request.file);

        return response.status(400).json({
            message: "A valid transaction reference is required."
        });
    }

    if (!request.file) {
        return response.status(400).json({
            message: "A proof-of-payment image is required."
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [reservations] = await connection.execute(
            `SELECT id, tenant_id, client_id,
                    total_amount,
                    deposit_amount,
                    amount_paid,
                    reservation_status,
                    payment_status,
                    deposit_due_at
                FROM reservations
                WHERE id = ?
                AND client_id = ?
                LIMIT 1
                FOR UPDATE`,
                [
                    reservationId,
                    request.user.id
                ]
        );

        if (reservations.length !== 1) {
            await connection.rollback();
            removeUploadFile(request.file);

            return response.status(404).json({
                message: "Reservation was not found."
            });
        }

        const reservation = reservations[0];

        const paymentStage = paymentOption;
        const totalAmount = Number(reservation.total_amount);
        const amountPaid = Number(reservation.amount_paid);

        const requiredAmount = paymentOption === "full"
            ? totalAmount
            : paymentOption === "balance"
                ? Math.max(totalAmount - amountPaid, 0)
                : Number(reservation.deposit_amount);

        if (!Number.isFinite(requiredAmount) || requiredAmount <= 0) {
            await connection.rollback();
            removeUploadFile(request.file);

            return response.status(500).json({
                message: "The required payment amount is unavailable."
            });
        }

        const balancePayment = paymentOption === "balance";

        if (balancePayment) {
            const balanceAvailable = reservation.reservation_status === "confirmed"
                && reservation.payment_status === "partially_paid";

            if (!balanceAvailable) {
                await connection.rollback();
                removeUploadFile(request.file);

                return response.status(409).json({
                    message: "This reservation is not awaiting a balance payment."
                });
            }
        } else {
            if (reservation.reservation_status !== "awaiting_deposit") {
                await connection.rollback();
                removeUploadFile(request.file);

                return response.status(409).json({
                    message: "This reservation is not awaiting an initial payment."
                });
            }

            const depositDeadline = reservation.deposit_due_at
                ? new Date(reservation.deposit_due_at)
                : null;

            if (!depositDeadline || depositDeadline.getTime() <= Date.now()) {
                await connection.execute(
                    `UPDATE reservations
                        SET reservation_status = 'cancelled',
                            expired_at = NOW()
                        WHERE id = ?`,
                    [reservation.id]
                );

                await connection.commit();
                removeUploadFile(request.file);

                return response.status(410).json({
                    message: "The initial payment period has expired."
                });
            }

            if (reservation.payment_status !== "unpaid") {
                await connection.rollback();
                removeUploadFile(request.file);

                return response.status(409).json({
                    message: "An initial payment has already been submitted."
                });
            }
        }

        const existingPayment = await Payment.findByTransactionReference(transactionReference);

        if (existingPayment) {
            await connection.rollback();
            removeUploadFile(request.file);

            return response.status(409).json({
                message: "This transaction reference was already used."
            });
        }

        const projectRoot = path.resolve(__dirname, "../..");

        const storedPath = path.relative(projectRoot, request.file.path)
            .replaceAll("\\", "/");

        const payment = await Payment.create(
            {
                reservationId: reservation.id,
                tenantId: reservation.tenant_id,
                clientId: request.user.id,
                paymentStage,
                paymentMethod,
                transactionReference,
                amount: requiredAmount,
                originalFilename: request.file.originalname,
                filePath: storedPath,
                mimeType: request.file.mimetype,
                fileSize: request.file.size
            },
            connection
        );

        await connection.execute(
            `UPDATE reservations
                SET payment_status = 'pending'
            WHERE id = ?`,
            [reservation.id]
        );

        await connection.commit();

        return response.status(201).json({
            message: paymentStage === "balance"
                ? "Balance payment proof submitted for verification."
                : paymentStage === "full"
                    ? "Full payment proof submitted for verification."
                    : "Deposit proof submitted for verification.",
            payment: {
                id: payment.id,
                reservation_id: reservation.id,
                payment_stage: paymentStage,
                amount: requiredAmount,
                payment_status: "pending"
            }
        });
    } catch (error) {
        await connection.rollback();
        removeUploadFile(request.file);

        if (error.code === "ER_DUP_ENTRY") {
            return response.status(409).json({
                message: "This transaction reference was already used."
            });
        }

        console.error("Deposit submission failed:", error);

        return response.status(500).json({
            message: "Unable to submit the deposit proof."
        });
    } finally {
        connection.release();
    }
}

async function listTenantPayments(request, response) {
    try {
        const payments = await Payment.listForTenant(request.user.tenantId);
        return response.json({
            payments
        });
    } catch (error) {
        console.error("Unable to load resort payments:", error)
        return response.status(500).json({
            message: "Unable to load resort payment submissions."
        });
    }
}

async function viewTenantPaymentProof(
    request,
    response
) {
    const paymentId = Number(request.params.id);

    if (
        !Number.isInteger(paymentId) ||
        paymentId <= 0
    ) {
        return response.status(400).json({
            message:
                "A valid payment ID is required."
        });
    }

    try {
        const proof =
            await Payment.findProofForTenant(
                paymentId,
                request.user.tenantId
            );

        if (!proof?.file_path) {
            return response.status(404).json({
                message:
                    "The payment proof was not found."
            });
        }

        const projectRoot = path.resolve(
            __dirname,
            "../.."
        );

        const uploadRoot = path.resolve(
            projectRoot,
            "backend/uploads/files"
        );

        const absolutePath = path.resolve(
            projectRoot,
            proof.file_path
        );

        if (
            absolutePath !== uploadRoot &&
            !absolutePath.startsWith(
                `${uploadRoot}${path.sep}`
            )
        ) {
            return response.status(400).json({
                message:
                    "The payment proof path is invalid."
            });
        }

        response.type(
            proof.mime_type ||
            "application/octet-stream"
        );

        response.set(
            "Content-Disposition",
            `inline; filename*=UTF-8''${encodeURIComponent(
                proof.original_filename ||
                "payment-proof"
            )}`
        );

        return response.sendFile(absolutePath);
    } catch (error) {
        console.error(
            "Unable to load payment proof:",
            error
        );

        return response.status(500).json({
            message:
                "Unable to load the payment proof."
        });
    }
}

async function reviewTenantPayment(
    request,
    response
) {
    const paymentId =
        Number(request.params.id);

    const decision =
        String(
            request.body.decision || ""
        )
            .trim()
            .toLowerCase();

    const notes =
        String(
            request.body.notes || ""
        )
            .trim()
            .slice(0, 1000);

    if (
        !Number.isInteger(paymentId) ||
        paymentId <= 0
    ) {
        return response.status(400).json({
            message:
                "A valid payment ID is required."
        });
    }

    if (
        !["verified", "rejected"].includes(
            decision
        )
    ) {
        return response.status(400).json({
            message:
                "The decision must be verified or rejected."
        });
    }

    try {
        const result =
            await Payment.reviewForTenant({
                paymentId,
                tenantId:
                    request.user.tenantId,
                reviewerId:
                    request.user.id,
                decision,
                notes
            });

        if (
            !result.success &&
            result.reason === "not_found"
        ) {
            return response.status(404).json({
                message:
                    "The payment was not found for this resort."
            });
        }

        if (
            !result.success &&
            result.reason ===
                "already_reviewed"
        ) {
            return response.status(409).json({
                message:
                    "This payment has already been reviewed."
            });
        }

        return response.json({
            message:
                decision === "verified"
                    ? "Payment verified successfully."
                    : "Payment rejected successfully.",

            payment: result
        });
    } catch (error) {
        console.error(
            "Unable to review payment:",
            error
        );

        return response.status(500).json({
            message:
                "Unable to review the payment."
        });
    }
}

module.exports = {
    submitDeposit,
    listTenantPayments,
    viewTenantPaymentProof,
    reviewTenantPayment
};
