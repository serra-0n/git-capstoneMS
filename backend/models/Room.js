"use strict";

const pool = require("../config/database");

async function listForTenant(tenantId) {
    const [rooms] = await pool.execute(
        `SELECT
        a.id,
        a.tenant_id,
        a.name,
        a.accommodation_type,
        a.capacity,
        a.amenities,
        a.nightly_rate,
        a.availability_status,
        CASE
            WHEN a.availability_status = 'maintenance'
                THEN 'maintenance'
            WHEN a.availability_status = 'inactive'
                THEN 'inactive'
            WHEN EXISTS (
                SELECT 1
                FROM reservations r
                WHERE r.accommodation_id = a.id
                    AND r.tenant_id = a.tenant_id
                    AND r.reservation_status = 'checked_in'
                    AND CURDATE() >= r.check_in
                    AND CURDATE() < r.check_out
            )
                THEN 'occupied'
            WHEN EXISTS (
                SELECT 1
                FROM reservations r
                WHERE r.accommodation_id = a.id
                    AND r.tenant_id = a.tenant_id
                    AND r.reservation_status IN (
                        'pending',
                        'awaiting_deposit',
                        'deposit_verification',
                        'confirmed',
                        'checked_in'
                    )
                    AND r.check_out > CURDATE()
            )
                    THEN 'reserved'
                ELSE 'available'
            END AS display_status
        FROM accommodations a
        WHERE a.tenant_id = ?
        ORDER BY a.name ASC`,
    [tenantId]
    );
    return rooms;
}

async function updateAvailabilityStatus({
    roomId,
    tenantId,
    status
}) {
    const [result] = await pool.execute(
        `UPDATE accommodations
        SET availability_status = ?
        WHERE id = ?
            AND tenant_id = ?`,
        [status, roomId, tenantId]
    );

    return result.affectedRows === 1;
}

module.exports = {
    listForTenant,
    updateAvailabilityStatus
};