"use strict";

const pool = require("../config/database");

async function create({
    tenantId,
    name,
    accommodationType,
    capacity,
    amenities,
    nightlyRate,
    description,
    imagePath,
    status
}) {
    const [result] = await pool.execute(
        `INSERT INTO accommodations (
            tenant_id,
            name,
            accommodation_type,
            capacity,
            amenities,
            description,
            image_path,
            nightly_rate,
            availability_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            tenantId,
            name,
            accommodationType,
            capacity,
            amenities || null,
            description || null,
            imagePath || null,
            nightlyRate,
            status
        ]
    );

    const [rooms] = await pool.execute(
        `SELECT
            id,
            tenant_id,
            name,
            accommodation_type,
            capacity,
            amenities,
            description,
            image_path,
            nightly_rate,
            availability_status,
            availability_status AS display_status
        FROM accommodations
        WHERE id = ?
            AND tenant_id = ?
        LIMIT 1`,
        [result.insertId, tenantId]
    );

    return rooms[0];
}

async function listForTenant(tenantId) {
    const [rooms] = await pool.execute(
        `SELECT
        a.id,
        a.tenant_id,
        a.name,
        a.accommodation_type,
        a.capacity,
        a.amenities,
        a.description,
        a.image_path,
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

async function findForTenant(roomId, tenantId) {
    const [rooms] = await pool.execute(
        `SELECT id, tenant_id, name, accommodation_type, capacity, amenities,
                description, image_path, nightly_rate, availability_status
           FROM accommodations
          WHERE id = ? AND tenant_id = ?
          LIMIT 1`,
        [roomId, tenantId]
    );
    return rooms[0] || null;
}

async function update({
    roomId,
    tenantId,
    name,
    accommodationType,
    capacity,
    amenities,
    nightlyRate,
    description,
    imagePath,
    status
}) {
    const [result] = await pool.execute(
        `UPDATE accommodations
            SET name = ?, accommodation_type = ?, capacity = ?, amenities = ?,
                nightly_rate = ?, description = ?, image_path = ?, availability_status = ?
          WHERE id = ? AND tenant_id = ?`,
        [
            name,
            accommodationType,
            capacity,
            amenities || null,
            nightlyRate,
            description || null,
            imagePath || null,
            status,
            roomId,
            tenantId
        ]
    );
    return result.affectedRows === 1;
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
    create,
    listForTenant,
    findForTenant,
    update,
    updateAvailabilityStatus
};
