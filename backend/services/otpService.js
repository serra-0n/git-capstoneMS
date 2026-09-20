"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const OtpChallenge = require("../models/OtpChallenge");
const { sendOtpEmail } = require("./emailService");

const ALLOWED_PURPOSES = new Set([
    "signup",
    "password_login",
    "google_login"
]);

function createOtpError(message, statusCode, code) {
    const error = new Error(message);

    error.statusCode = statusCode;
    error.code = code;

    return error;
}

function validatePurpose(purpose) {
    if (!ALLOWED_PURPOSES.has(purpose)) {
        throw createOtpError(
            "A valid OTP purpose is required",
            400,
            "INVALID_OTP_PURPOSE"
        );
    }
}

function normalizeEmail(email) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

function hasExpired(expiresAt) {
    const normalizeDate = String(expiresAt).replace(" ", "T");
    const expirationTime = new Date(normalizeDate).getTime();

    return(!Number.isFinite(expirationTime) || expirationTime <= Date.now());
}

async function requestOtp({
    email,
    userId = null,
    purpose
}) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        throw createOtpError(
            "An email address is required.",
            400,
            "EMAIL_REQUIRED"
        );
    }

    validatePurpose(purpose);

    const expirationMinutes = Number(process.env.OTP_EXPIRATION_MINUTES || 5);
    const resendSeconds = Number(process.env.OTP_RESEND_SECONDS || 60);
    const latestChallenge = await OtpChallenge.findLatestByEmailAndPurpose(normalizedEmail, purpose);

    if (latestChallenge && Number(latestChallenge.elapsed_seconds) < resendSeconds) {
        const remainingSeconds = resendSeconds - Number(latestChallenge.elapsed_seconds);
        const error = createOtpError(
            `Please wait ${remainingSeconds} seconds before requesting another code.`,
            429,
            "OTP_RESEND_LIMIT"
        );
        error.retryAfterSeconds = remainingSeconds;
        throw error;
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const challengeToken = crypto
        .randomBytes(32)
        .toString("hex");

    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await OtpChallenge.invalidateActive(
            normalizedEmail,
            purpose,
            connection
        );

        await OtpChallenge.create(
            {
                challengeToken,
                userId,
                email: normalizedEmail,
                purpose,
                otpHash,
                expiresAt
            },
            connection
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    await sendOtpEmail({
        email: normalizedEmail,
        otp,
        purpose
    });

    return {
        challengeToken,
        expiresInSeconds: expirationMinutes * 60
    };
}

async function verifyOtp({
    challengeToken,
    otp,
    purpose
}) {
    const normalizedOtp = String(otp || "").trim();

    if (!challengeToken || !/^\d{6}$/.test(normalizedOtp)) {
        throw createOtpError(
            "A valid challenge token and six-digit code are required.",
            400,
            "INVALID_OTP_INPUT"
        );
    }

    validatePurpose(purpose);

    const maximumAttempts = Number(process.env.OTP_MAX_ATTEMPTS || 5);
    const connection = await pool.getConnection();

    let transactionFinished = false;
    
    try {
        await connection.beginTransaction();

        const challenge = await OtpChallenge.findByToken(
            challengeToken,
            purpose,
            connection,
            true
        );

        if (
            !challenge ||
            challenge.consumed_at ||
            challenge.verified_at
        ) {
            throw createOtpError(
                "This verification request is no longer valid.",
                400,
                "OTP_INVALID"
            );
        }

        if (hasExpired(challenge.expires_at)) {
            throw createOtpError(
                "The verification code has expired.",
                400,
                "OTP_EXPIRED"
            );
        }

        if (challenge.attempts >= maximumAttempts) {
            throw createOtpError(
                "Too many incorrect verification attempts.",
                429,
                "OTP_ATTEMPTS_EXCEEDED"
            );
        }

        const otpMatches = await bcrypt.compare(
            normalizedOtp,
            challenge.otp_hash
        );

        if (!otpMatches) {
            await OtpChallenge.incrementAttempts(
                challenge.id,
                connection
            );

            await connection.commit();
            transactionFinished = true;

            throw createOtpError(
                "The verification code is incorrect.",
                401,
                "OTP_INCORRECT"
            );
        }

        const verified = await OtpChallenge.markVerified(challenge.id, connection);

        if (!verified) {
            throw createOtpError(
                "The verification code could not be verified.",
                400,
                "OTP_VERIFICATION_FAILED"
            );
        }

        await connection.commit();
        transactionFinished = true;

        return {
            challengeId: challenge.id,
            challengeToken: challenge.challenge_token,
            userId: challenge.user_id,
            email: challenge.email,
            purpose: challenge.purpose
        };
    } catch (error) {
        if (!transactionFinished) {
            await connection.rollback();
        }

        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    requestOtp,
    verifyOtp
};