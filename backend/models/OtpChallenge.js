"use strict";

const pool = require("../config/database");

const ALLOWED_PURPOSES = new Set([
    "signup",
    "password_login",
    "google_login"
]);

function validatePurpose(purpose) {
    if (!ALLOWED_PURPOSES.has(purpose)) {
        throw new Error("A valid OTP purpose is required.");
    }
}

async function findLatestByEmailAndPurpose(
    email,
    purpose,
    executor = pool
) {
    validatePurpose(purpose);

    const [challenges] = await executor.execute(
        `SELECT
            id,
            challenge_token,
            user_id,
            email,
            purpose,
            attempts,
            expires_at,
            verified_at,
            consumed_at,
            created_at,
            TIMESTAMPDIFF(
                SECOND,
                created_at,
                NOW()
            ) AS elapsed_seconds
        FROM email_otp_challenges
        WHERE email = ?
            AND purpose = ?
        ORDER BY created_at DESC
        LIMIT 1`,
        [email, purpose]
    );
    return challenges[0] || null;
}

async function invalidateActive (
    email,
    purpose,
    executor = pool
) {
    validatePurpose(purpose);

    await executor.execute(
        `UPDATE email_otp_challenges
        SET consumed_at = NOW()
        WHERE email = ?
            AND purpose = ?
            AND consumed_at IS NULL`,
        [email, purpose]
    );
}

async function create(
    {
        challengeToken,
        userId,
        email,
        purpose,
        otpHash,
        expiresAt
    },
    executor = pool
) {
    validatePurpose(purpose);

    const [result] = await executor.execute(
        `INSERT INTO email_otp_challenges (
            challenge_token,
            user_id,
            email,
            purpose,
            otp_hash,
            expires_at
         )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            challengeToken,
            userId || null,
            email,
            purpose,
            otpHash,
            expiresAt,
        ],
    );

    return {
        id: result.insertId,
        challengeToken,
        userId: userId || null,
        email,
        purpose,
        expiresAt,
    };
}

async function findByToken(
    challengeToken,
    purpose,
    executor = pool,
    lockForUpdate = false
) {
    validatePurpose(purpose);

    const lockClause = lockForUpdate
        ? " FOR UPDATE"
        : "";

    const [challenges] = await executor.execute(
        `SELECT
            id,
            challenge_token,
            user_id,
            email,
            purpose,
            otp_hash,
            attempts,
            expires_at,
            verified_at,
            consumed_at,
            created_at
        FROM email_otp_challenges
        WHERE challenge_token = ?
            AND purpose = ?
        LIMIT 1${lockClause}`,
        [challengeToken, purpose]
    );
    return challenges[0] || null;
}

async function incrementAttempts(
    challengeId,
    executor = pool
) {
    await executor.execute(
        `UPDATE email_otp_challenges
        SET attempts = attempts + 1
        WHERE id = ?`,
        [challengeId]
    );
}

async function markVerified(
    challengeId,
    executor = pool
) {
    const [result] = await executor.execute(
        `UPDATE email_otp_challenges
        SET verified_at = NOW()
        WHERE id = ?
            AND verified_at IS NULL
            AND consumed_at IS NULL
            AND expires_at > NOW()`,
        [challengeId]
    );
    return result.affectedRows === 1;
}

async function markConsumed(
    challengeId,
    executor = pool
) {
    const [result] = await executor.execute(
        `UPDATE email_otp_challenges
        SET consumed_at = NOW()
        WHERE id = ?
            AND verified_at IS NOT NULL
            AND consumed_at IS NULL
            AND expires_at > NOW()`,
        [challengeId]
    );
    return result.affectedRows === 1;
}

async function removeExpired() {
    const [result] = await pool.execute(
        `DELETE FROM email_otp_challenges
        WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY)
            OR consumed_at < DATE_SUB(NOW(), INTERVAL 1 DAY)`
    );
    return result.affectedRows;
}

module.exports = {
    findLatestByEmailAndPurpose,
    invalidateActive,
    create,
    findByToken,
    incrementAttempts,
    markVerified,
    markConsumed,
    removeExpired
};