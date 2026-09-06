"use strict";

const pool = require("../config/database");

async function findByTransactionReference(transactionReference) {
    const [rows] = await pool.execute(
        `SELECT id
            FROM payments
            WHERE transaction_reference = ?
            LIMIT 1`,
        [transactionReference]
    );

    return rows[0] || null;
}

async function create(
    {
        reservationId,
        tenantId,
        clientId,
        paymentStage,
        paymentMethod,
        transactionReference,
        amount,
        originalFilename,
        filePath,
        mimeType,
        fileSize
    },
    connection = pool
) {
    const [result] = await connection.execute(
        `INSERT INTO payments (
            reservation_id,
            tenant_id,
            client_id,
            payment_stage,
            payment_method,
            transaction_reference,
            amount,
            original_filename,
            file_path,
            mime_type,
            file_size,
            ocr_status,
            verification_status
        )
            VALUES(
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                'pending', 'pending'
            )`,
            [
                reservationId,
                tenantId,
                clientId,
                paymentStage,
                paymentMethod,
                transactionReference,
                amount,
                originalFilename,
                filePath,
                mimeType,
                fileSize
            ]
    );
    return {
        id: result.insertId
    };
}

async function listForTenant(tenantId) {
    const [rows] = await pool.execute(
        `SELECT
            p.id,
            p.reservation_id,
            p.payment_stage,
            p.payment_method,
            p.transaction_reference,
            p.amount,
            p.original_filename,
            p.file_path,
            p.mime_type,
            p.ocr_status,
            p.extracted_text,
            p.extracted_data,
            p.ocr_confidence,
            p.verification_status,
            p.verification_notes,
            p.verified_at,
            p.created_at,
            r.reservation_code,
            r.guest_name,
            r.total_amount,
            r.amount_paid,
            r.payment_status,
            r.check_in,
            r.check_out,
            a.name AS accommodation_name,
            CONCAT(u.first_name, ' ', u.last_name)
                AS client_account_name
        FROM payments p
        JOIN reservations r
            ON r.id = p.reservation_id
        JOIN accommodations a
            ON a.id = r.accommodation_id
        JOIN users u
            ON u.id = p.client_id
        WHERE p.tenant_id = ?
        ORDER BY p.created_at DESC`,
        [tenantId]
    );
    return rows;
}

async function findProofForTenant(
    paymentId,
    tenantId
) {
    const [rows] = await pool.execute(
        `SELECT
            p.original_filename,
            p.file_path,
            p.mime_type
        FROM payments p
        JOIN reservations r
            ON r.id = p.reservation_id
        WHERE p.id = ?
            AND p.tenant_id = ?
            AND r.tenant_id = ?
        LIMIT 1`,
        [
            paymentId,
            tenantId,
            tenantId
        ]
    );

    return rows[0] || null;
}

async function reviewForTenant({
    paymentId,
    tenantId,
    reviewerId,
    decision,
    notes
}) {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();
        const [payments] =
            await connection.execute(
                `SELECT
                    p.id,
                    p.reservation_id,
                    p.amount,
                    p.payment_stage,
                    p.verification_status,
                    r.total_amount,
                    r.amount_paid,
                    r.deposit_due_at
                FROM payments p
                JOIN reservations r
                    ON r.id = p.reservation_id
                WHERE p.id = ?
                    AND p.tenant_id = ?
                    AND r.tenant_id = ?
                LIMIT 1
                FOR UPDATE`,
                [
                    paymentId,
                    tenantId,
                    tenantId
                ]
            );

        if (payments.length !== 1) {
            await connection.rollback();

            return {
                success: false,
                reason: "not_found"
            };
        }

        const payment = payments[0];

        if (
            payment.verification_status !==
            "pending"
        ) {
            await connection.rollback();
            return {
                success: false,
                reason: "already_reviewed"
            };
        }

        if (decision === "rejected") {
            await connection.execute(
                `UPDATE payments
                    SET verification_status = 'rejected',
                        verification_notes = ?,
                        verified_by = ?,
                        verified_at = NOW()
                  WHERE id = ?`,
                [
                    notes || null,
                    reviewerId,
                    paymentId
                ]
            );

            await connection.execute(
                `UPDATE reservations
                    SET payment_status =
                        CASE
                            WHEN amount_paid > 0
                                THEN 'partially_paid'
                            ELSE 'unpaid'
                        END
                    WHERE id = ?
                    AND tenant_id = ?`,
                [
                    payment.reservation_id,
                    tenantId
                ]
            );

            await connection.commit();
            return {
                success: true,
                decision: "rejected"
            };
        }

        const submittedAmount = Number(payment.amount);

        const totalAmount = Number(payment.total_amount);

        const currentAmountPaid = Number(payment.amount_paid);

        const newAmountPaid =
            Math.min(
                totalAmount,
                currentAmountPaid +
                submittedAmount
            );

        const paymentStatus =
            newAmountPaid >= totalAmount
                ? "paid"
                : "partially_paid";

        await connection.execute(
            `UPDATE payments
                SET verification_status = 'verified',
                    verification_notes = ?,
                    verified_by = ?,
                    verified_at = NOW()
              WHERE id = ?`,
            [
                notes || null,
                reviewerId,
                paymentId
            ]
        );

        await connection.execute(
            `UPDATE reservations
                SET amount_paid = ?,
                    payment_status = ?,
                    reservation_status = 'confirmed',
                    deposit_due_at = NULL
              WHERE id = ?
                AND tenant_id = ?`,
            [
                newAmountPaid,
                paymentStatus,
                payment.reservation_id,
                tenantId
            ]
        );

        await connection.commit();
        return {
            success: true,
            decision: "verified",
            paymentStatus,
            amountPaid: newAmountPaid
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    findByTransactionReference,
    create,
    listForTenant,
    findProofForTenant,
    reviewForTenant
};
