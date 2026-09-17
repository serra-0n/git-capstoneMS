const express = require("express");
const pool = require("../config/database");
const { authenticateUser, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateUser, requireRole("system_admin"));

async function getSummary() {
    const [[tenantRows], [userRows], [activityRows], [systemRows]] = await Promise.all([
        pool.query(`SELECT COUNT(*) total, SUM(approval_status = 'approved' AND tenant_status = 'active') active,
            SUM(tenant_status = 'suspended') suspended, SUM(approval_status = 'pending') pending,
            SUM(approval_status = 'rejected') rejected FROM tenants`),
        pool.query(`SELECT COUNT(*) total, SUM(account_status = 'active') active,
            SUM(account_status <> 'active') inactive,
            SUM(role = 'system_admin') system_admin,
            SUM(role = 'resort_admin') resort_admin,
            SUM(role = 'client') client FROM users`),
        pool.query(`SELECT COUNT(*) total, SUM(DATE(a.created_at) = CURDATE()) today,
            SUM(a.user_id IS NOT NULL AND COALESCE(u.role, '') <> 'system_admin') user_actions,
            SUM(u.role = 'system_admin') admin_actions
            FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id`),
        pool.query(`SELECT
            (SELECT COUNT(*) FROM reservations) reservations,
            (SELECT COUNT(*) FROM payments) payments,
            (SELECT COUNT(*) FROM documents) documents`)
    ]);
    const clean = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value || 0)]));
    return { tenants: clean(tenantRows[0]), users: clean(userRows[0]), activities: clean(activityRows[0]), system: clean(systemRows[0]) };
}

router.get("/summary", async (_request, response) => {
    try {
        response.json(await getSummary());
    } catch (error) {
        console.error("Admin summary failed:", error);
        response.status(500).json({ message: "Unable to load the system summary." });
    }
});

router.get("/users", async (_request, response) => {
    try {
        const [rows] = await pool.query(`SELECT u.id, u.first_name, u.last_name, u.email, u.role,
            u.account_status, u.last_login, u.created_at,
            COALESCE(GROUP_CONCAT(DISTINCT t.resort_name ORDER BY t.resort_name SEPARATOR ', '), '') tenant_names
            FROM users u
            LEFT JOIN tenant_memberships tm ON tm.user_id = u.id
            LEFT JOIN tenants t ON t.id = tm.tenant_id OR t.id = u.tenant_id
            GROUP BY u.id ORDER BY u.created_at DESC`);
        response.json(rows);
    } catch (error) {
        console.error("Admin users failed:", error);
        response.status(500).json({ message: "Unable to load platform users." });
    }
});

router.patch("/tenants/:id/monitoring-status", async (request, response) => {
    const tenantId = Number(request.params.id);
    const status = request.body.status;
    if (!Number.isInteger(tenantId) || !["active", "suspended"].includes(status)) {
        return response.status(400).json({ message: "Select an active or suspended status." });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute(`UPDATE tenants SET tenant_status = ?
            WHERE id = ? AND approval_status = 'approved'`, [status, tenantId]);
        if (!result.affectedRows) {
            await connection.rollback();
            return response.status(404).json({ message: "Approved resort was not found." });
        }
        await connection.execute(`UPDATE tenant_memberships SET membership_status = ?
            WHERE tenant_id = ? AND membership_role IN ('owner', 'admin')`, [status, tenantId]);
        await connection.execute(`INSERT INTO activity_logs
            (tenant_id, user_id, action_type, entity_type, entity_id, action_details)
            VALUES (?, ?, ?, 'tenant', ?, ?)`,
            [tenantId, request.user.id, status === "active" ? "tenant_reactivated" : "tenant_suspended", tenantId, `Status changed to ${status}`]);
        await connection.commit();
        response.json({ message: `Resort ${status}.`, status });
    } catch (error) {
        await connection.rollback();
        console.error("Tenant monitoring status failed:", error);
        response.status(500).json({ message: "Unable to change the resort status." });
    } finally {
        connection.release();
    }
});

router.get("/activity-logs", async (_request, response) => {
    try {
        const [rows] = await pool.query(`SELECT a.id, a.action_type, a.entity_type, a.entity_id,
            a.action_details, a.ip_address, a.created_at, a.tenant_id,
            TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) actor_name,
            u.role actor_role, t.resort_name tenant_name
            FROM activity_logs a
            LEFT JOIN users u ON u.id = a.user_id
            LEFT JOIN tenants t ON t.id = a.tenant_id
            ORDER BY a.created_at DESC, a.id DESC LIMIT 500`);
        response.json(rows);
    } catch (error) {
        console.error("Admin activity failed:", error);
        response.status(500).json({ message: "Unable to load activity logs." });
    }
});

router.get("/reports", async (request, response) => {
    const { from, to } = request.query;
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) || (from && to && from > to)) {
        return response.status(400).json({ message: "Select a valid date range." });
    }
    const where = (column) => {
        const parts = [], params = [];
        if (from) { parts.push(`${column} >= ?`); params.push(`${from} 00:00:00`); }
        if (to) { parts.push(`${column} < DATE_ADD(?, INTERVAL 1 DAY)`); params.push(to); }
        return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
    };
    try {
        const t = where("created_at"), u = where("created_at"), a = where("a.created_at");
        const r = where("created_at"), p = where("created_at"), d = where("created_at");
        const [[tenants], [users], [activities], [reservations], [payments], [documents]] = await Promise.all([
            pool.query(`SELECT COUNT(*) total, SUM(approval_status = 'approved' AND tenant_status = 'active') active,
                SUM(tenant_status = 'suspended') suspended, SUM(approval_status = 'pending') pending,
                SUM(approval_status = 'rejected') rejected FROM tenants ${t.sql}`, t.params),
            pool.query(`SELECT COUNT(*) total, SUM(account_status = 'active') active,
                SUM(account_status <> 'active') inactive, SUM(role = 'system_admin') system_admin,
                SUM(role = 'resort_admin') resort_admin, SUM(role = 'client') client
                FROM users ${u.sql}`, u.params),
            pool.query(`SELECT COUNT(*) total, SUM(u.role = 'system_admin') admin_actions,
                SUM(u.role <> 'system_admin' AND a.user_id IS NOT NULL) user_actions
                FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id ${a.sql}`, a.params),
            pool.query(`SELECT COUNT(*) total FROM reservations ${r.sql}`, r.params),
            pool.query(`SELECT COUNT(*) total FROM payments ${p.sql}`, p.params),
            pool.query(`SELECT COUNT(*) total FROM documents ${d.sql}`, d.params)
        ]);
        const clean = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value || 0)]));
        response.json({ from: from || null, to: to || null, tenants: clean(tenants[0]), users: clean(users[0]),
            activities: clean(activities[0]), system: { reservations: Number(reservations[0].total),
                payments: Number(payments[0].total), documents: Number(documents[0].total) } });
    } catch (error) {
        console.error("Admin reports failed:", error);
        response.status(500).json({ message: "Unable to generate the report." });
    }
});

module.exports = router;
