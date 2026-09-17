const pool =  require ("../config/database");

async function findByEmail(email) {
    const [users] = await pool.execute(
        `SELECT
            id,
            tenant_id,
            first_name,
            last_name,
            email,
            contact_number,
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
            contact_number,
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

async function findByGoogleId(googleId) {
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
        WHERE google_id = ?
        LIMIT 1`,
        [googleId]
    );
    return users[0] || null;
}

async function createGoogleClient({
    googleId,
    firstName,
    lastName,
    email
}) {
    const [result] = await pool.execute(
        `INSERT INTO users (
            tenant_id,
            google_id,
            first_name,
            last_name,
            email,
            password_hash,
            role,
            account_status,
            setup_status
        )
        VALUE (
        NULL, ?, ?, ?, ?, NULL,
        'client', 'active', 'completed')`,
        [
            googleId,
            firstName,
            lastName,
            email
        ]
    );
    return result.insertId;
}

async function updateClientProfile(userId, {
    firstName,
    lastName,
    contactNumber
}) {
    await pool.execute(
        `UPDATE users
         SET first_name = ?,
             last_name = ?,
             contact_number = ?
         WHERE id = ?
           AND role = 'client'`,
        [firstName, lastName, contactNumber || null, userId]
    );

    return findById(userId);
}

module.exports = {
    findByEmail,
    findById,
    findByGoogleId,
    updateLastLogin,
    updateClientProfile,
    createClient,
    createGoogleClient
};
