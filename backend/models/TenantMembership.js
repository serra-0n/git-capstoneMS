const pool = require("../config/database");

async function findByUserId(userId) {
    const [memberships] = await pool.execute(
        `SELECT
            tenant_memberships.id,
            tenant_memberships.user_id,
            tenant_memberships.tenant_id,
            tenant_memberships.membership_role,
            tenant_memberships.membership_status,
            tenants.tenant_code,
            tenants.resort_name,
            tenants.approval_status,
            tenants.tenant_status
        FROM tenant_memberships
        INNER JOIN tenants
            ON tenants.id = tenant_memberships.tenant_id
        WHERE tenant_memberships.user_id = ?
        ORDER BY tenant_memberships.created_at DESC`,
        [userId]
    );
    return memberships;
}

async function findActiveByUserAndTenant(userId, tenantId) {
    const [memberships] = await pool.execute(
        `SELECT
            tenant_memberships.id,
            tenant_memberships.user_id,
            tenant_memberships.tenant_id,
            tenant_memberships.membership_role,
            tenant_memberships.membership_status,
            tenants.resort_name
        FROM tenant_memberships
        INNER JOIN tenants
            ON tenants.id = tenant_memberships.tenant_id
        WHERE tenant_memberships.user_id = ?
            AND tenant_memberships.tenant_id = ?
            AND tenant_memberships.membership_status = 'active'
            AND tenants.approval_status = 'approved'
            AND tenants.tenant_status = 'active'
        LIMIT 1`,
        [userId, tenantId]
    );
    return memberships[0] || null;
}

async function createOwnerMembership(
    userId,
    tenantId,
    connection = pool
) {
    const [result] = await connection.execute(
        `INSERT INTO tenant_memberships(
            user_id,
            tenant_id,
            membership_role,
            membership_status
        )
        VALUES (?, ?, 'owner', 'pending')`,
        [userId, tenantId]
    );
    return result.insertId;
}

async function updateOwnerMembershipStatus(
    tenantId,
    membershipStatus,
    connection = pool
) {
    const [result] = await connection.execute(
        `UPDATE tenant_memberships
        SET membership_status = ?
        WHERE tenant_id = ?
            AND membership_role = 'owner'`,
        [
            membershipStatus,
            tenantId
        ]
    );
    return result.affectedRows;
}

module.exports = {
    findByUserId,
    findActiveByUserAndTenant,
    createOwnerMembership,
    updateOwnerMembershipStatus
};