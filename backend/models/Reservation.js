const pool = require("../config/database");

const RESERVATION_SELECT = `
    SELECT r.id, r.reservation_code, r.tenant_id, r.client_id,
           r.accommodation_id, r.guest_name, r.contact_number,
           r.guest_email, r.guest_count, r.check_in, r.check_out,
           r.nightly_rate, r.total_amount, r.deposit_percentage,
           r.deposit_amount, r.amount_paid, r.reservation_status,
           r.payment_status, r.review_notes, r.reviewed_at, r.accepted_at,
           r.deposit_due_at, r.expired_at, r.created_at,
           t.resort_name, t.location AS resort_location,
        CASE
            WHEN (
                r.reservation_status = 'awaiting_deposit'
                AND r.deposit_due_at > NOW()
            ) OR (
                r.reservation_status = 'confirmed'
                AND r.payment_status = 'partially_paid'
            )
            THEN t.gcash_account_name
            ELSE NULL
        END AS gcash_account_name,

        CASE
            WHEN (
                r.reservation_status = 'awaiting_deposit'
                AND r.deposit_due_at > NOW()
            ) OR (
                r.reservation_status = 'confirmed'
                AND r.payment_status = 'partially_paid'
            )
            THEN t.gcash_number
            ELSE NULL
        END AS gcash_number,

        CASE
            WHEN (
                r.reservation_status = 'awaiting_deposit'
                AND r.deposit_due_at > NOW()
            ) OR (
                r.reservation_status = 'confirmed'
                AND r.payment_status = 'partially_paid'
            )
            THEN t.gcash_qr_path
            ELSE NULL
        END AS gcash_qr_path,

           a.name AS accommodation_name,
           a.accommodation_type, a.capacity,
           CONCAT(u.first_name, ' ', u.last_name) AS client_account_name
      FROM reservations r
      JOIN tenants t ON t.id = r.tenant_id
      JOIN accommodations a ON a.id = r.accommodation_id
      JOIN users u ON u.id = r.client_id`;

async function listApprovedResorts() {
    const [rows] = await pool.execute(
        `SELECT t.id, t.resort_name AS name, t.resort_type, t.location
           FROM tenants t
          WHERE t.approval_status = 'approved'
            AND t.tenant_status = 'active'
            AND EXISTS (
                SELECT 1
                FROM accommodations a
                WHERE a.tenant_id = t.id
            )
          ORDER BY t.resort_name`
    );
    return rows;
}

async function expireOverdueReservations(executor = pool) {
    await executor.execute(
        `UPDATE reservations
            SET reservation_status = 'expired',
                payment_status = 'not_required',
                expired_at = COALESCE (
                    expired_at,
                    NOW()
                )
            WHERE reservation_status = 'awaiting_deposit'
                AND payment_status = 'unpaid'
                AND deposit_due_at IS NOT NULL
                AND deposit_due_at <= NOW()`
    );
}

async function listAccommodations(tenantId,
    {checkIn, checkOut} = {}) {

        await expireOverdueReservations();

        const scheduleFilter =
            checkIn && checkOut
                ? `AND NOT EXISTS (
                    SELECT 1
                    FROM reservations r
                    WHERE r.accommodation_id = a.id
                        AND r.reservation_status IN (
                            'pending',
                            'awaiting_deposit',
                            'deposit_verification',
                            'confirmed',
                            'checked_in'
                        )
                        AND r.check_in < ?
                        AND r.check_out > ?
                )`
            : "";
        const parameters =
            checkIn && checkOut
                ? [
                    tenantId,
                    checkOut,
                    checkIn
                ]
                : [tenantId];
        const [rows] = await pool.execute(
            `SELECT
                a.id,
                a.tenant_id AS resort_id,
                a.name,
                a.accommodation_type AS type,
                a.capacity,
                a.amenities,
                a.nightly_rate AS price,
                a.availability_status AS availability
            FROM accommodations a
            WHERE a.tenant_id = ?
                AND a.availability_status = 'available'
                ${scheduleFilter}
            ORDER BY a.name`,
            parameters
        );
        return rows.map(row => ({
            ...row,

            amenities: String(row.amenities || "")
                .split(",")
                .map(value => value.trim())
                .filter(Boolean),

            availability: row.availability === "available"
                ? "Available"
                : row.availability
        }));
}

async function listUnavailableDateRanges(
    accommodationId
) {
    await expireOverdueReservations();

    const [rows] = await pool.execute(
        `SELECT
            DATE_FORMAT(
                check_in,
                '%Y-%m-%d'
            ) AS check_in,
            DATE_FORMAT(
                check_out,
                '%Y-%m-%d'
            ) AS check_out
        FROM reservations
        WHERE accommodation_id = ?
            AND reservation_status IN (
                'pending',
                'awaiting_deposit',
                'deposit_verification',
                'confirmed',
                'checked_in'
            )
            AND check_out > CURDATE()
        ORDER BY check_in`,
        [accommodationId]
    );
    return rows;
}

async function create({
    clientId, tenantId, accommodationId, guestName,
    contactNumber, guestEmail, guestCount, checkIn, checkOut
}) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await expireOverdueReservations(connection);

        const [accommodations] = await connection.execute(
            `SELECT a.id, a.tenant_id, a.nightly_rate, a.capacity
               FROM accommodations a
               JOIN tenants t ON t.id = a.tenant_id
              WHERE a.id = ? AND a.tenant_id = ?
                AND a.availability_status = 'available'
                AND t.approval_status = 'approved'
                AND t.tenant_status = 'active'
              FOR UPDATE`,
            [accommodationId, tenantId]
        );

        if (accommodations.length !== 1) {
            const error = new Error("The selected accommodation is unavailable.");
            error.status = 404;
            throw error;
        }

        const accommodation = accommodations[0];
        if (guestCount > accommodation.capacity) {
            const error = new Error(`This accommodation allows up to ${accommodation.capacity} guests.`);
            error.status = 400;
            throw error;
        }

        const [conflicts] = await connection.execute(
            `SELECT id FROM reservations
              WHERE accommodation_id = ?
                AND reservation_status IN (
                    'pending',
                    'awaiting_deposit',
                    'deposit_verification',
                    'confirmed',
                    'checked_in'
                )
                AND check_in < ? AND check_out > ?
              LIMIT 1 FOR UPDATE`,
            [accommodationId, checkOut, checkIn]
        );

        if (conflicts.length) {
            const error = new Error("The accommodation is already reserved for those dates.");
            error.status = 409;
            throw error;
        }

        const nights = Math.ceil(
            (new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 86400000
        );
        const nightlyRate = Number(accommodation.nightly_rate);
        const totalAmount = nightlyRate * nights;
        const reservationCode = `RH-${Date.now().toString(36).toUpperCase()}-${clientId}`;

        const [result] = await connection.execute(
            `INSERT INTO reservations
                (reservation_code, tenant_id, client_id, accommodation_id,
                 guest_name, contact_number, guest_email, guest_count,
                 check_in, check_out, nightly_rate, total_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [reservationCode, tenantId, clientId, accommodationId, guestName,
             contactNumber, guestEmail, guestCount, checkIn, checkOut,
             nightlyRate, totalAmount]
        );

        await connection.commit();
        return { id: result.insertId, reservationCode, totalAmount };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function listForClient(clientId) {
    const [rows] = await pool.execute(
        `${RESERVATION_SELECT} WHERE r.client_id = ? ORDER BY r.created_at DESC`,
        [clientId]
    );
    return rows;
}

async function findForClient(reservationId, clientId) {
    const [rows] = await pool.execute(
        `${RESERVATION_SELECT} WHERE r.id = ? AND r.client_id = ? LIMIT 1`,
        [reservationId, clientId]
    );
    return rows[0] || null;
}

async function listForTenant(tenantId) {
    const [rows] = await pool.execute(
        `${RESERVATION_SELECT} WHERE r.tenant_id = ? ORDER BY r.created_at DESC`,
        [tenantId]
    );
    return rows;
}

async function updateStatus({ reservationId, tenantId, reviewerId, status, notes }) {
    if (status === "awaiting_deposit") {
        const [result] = await pool.execute(
            `UPDATE reservations
                SET reservation_status = 'awaiting_deposit',
                    payment_status = 'unpaid',
                    deposit_percentage = 50.00,
                    deposit_amount = ROUND(total_amount * 0.50, 2),
                    amount_paid = 0.00,
                    review_notes = ?,
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    accepted_at = NOW(),
                    deposit_due_at = DATE_ADD(NOW(), INTERVAL 12 HOUR),
                    expired_at = NULL
              WHERE id = ?
                AND tenant_id = ?
                AND reservation_status = 'pending'`,
            [
                notes || null,
                reviewerId,
                reservationId,
                tenantId
            ]
        );
        return result.affectedRows === 1;
    }

    if (status === "rejected") {
        const [result] = await pool.execute(
            `UPDATE reservations
                SET reservation_status = 'rejected',
                    payment_status = 'not_required',
                    review_notes = ?,
                    reviewed_by = ?,
                    reviewed_at = NOW()
              WHERE id = ?
                AND tenant_id = ?
                AND reservation_status = 'pending'`,
            [
                notes || null,
                reviewerId,
                reservationId,
                tenantId
            ]
        );
        return result.affectedRows === 1;
    }
    return false;
}

module.exports = {
    listApprovedResorts,
    listAccommodations,
    listUnavailableDateRanges,
    create,
    listForClient,
    findForClient,
    listForTenant,
    updateStatus
};
