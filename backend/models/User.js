const pool =  require ("../config/database");

async function findByEmail(email) {
    const [users] = await pool.execute(
        `SELECT
            id,
            tenant_id,
            first_name,
            last_name,
            email,
            password_hash,
            role,
            account_status,
            setup_status
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return users[0] || null;
}

async function updateLastLogin(userId) {
    await pool.execute(
        `UPDATE users
         SET last_login = NOW()
         WHERE id = ?`,
        [userId]
    );
}

async function createClient({
    firstName,
    lastName,
    email,
    passwordHash
}) {
    const [result] = await pool.execute(
        `INSERT INTO users
            (
                tenant_id,
                first_name,
                last_name,
                email,
                password_hash,
                role,
                account_status,
                setup_status
            )
         VALUES (
                NULL,
                ?,
                ?,
                ?,
                ?,
                'client',
                'active',
                'completed'
         )`,
        [
            firstName,
            lastName,
            email,
            passwordHash
        ]
    );

    return result.insertId;
}

async function findById(userId) {
    const [users] = await pool.execute(
        `SELECT
            id,
            tenant_id,
            first_name,
            last_name,
            email,
            role,
            account_status,
            setup_status
        FROM users
        WHERE id = ?
        LIMIT 1`,
        [userId]
    );

    return users[0] || null;
}

module.exports = {
    findByEmail,
    findById,
    updateLastLogin,
    createClient
};