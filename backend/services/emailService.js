"use strict";

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_APP_PASSWORD,
    },
});

function getOtpPurposeText(purpose) {
    const description = {
        signup: {
            subject: "Verify your ResortHub email",
            heading: "Complete your ResortHub registration",
            message: "Use this verification code to verify your email and continue creating your account.",
        },
        password_login: {
            subject: "Your ResortHub login code",
            heading: "Verify your ResortHub login",
            message: "Use this verification code to finish signing in to your ResortHub account.",
        },
        google_login: {
            subject: "Verify your ResortHub Google sign-in",
            heading: "Complete your Google sign-in",
            message: "Use this verification code to complete your ResortHub sign-in.",
        },
    };
    return description[purpose] || description.password_login;
}

async function sendOtpEmail({ email, otp, purpose }) {
    if (!email || !otp) {
        throw new Error("An email address and OTP are required.");
    }

    const content = getOtpPurposeText(purpose);
    const expirationMinutes = Number(process.env.OTP_EXPIRATION_MINUTES || 5,);

    await transporter.sendMail({
        from: `"ResortHub" <${process.env.SMTP_USER}>`,
        to: email,
        subject: content.subject,
        text: [
            content.heading,
            "",
            content.message,
            "",
            `Verification code: ${otp}`,
            "",
            `This code expires in ${expirationMinutes} minutes.`,
            "If you did not request this code, you may ignore this email.",
        ].join("\n"),
        html: `
            <!doctype html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    </head>

                    <body
                        style="
                            margin: 0;
                            padding: 32px 16px;
                            background: #f4f7fb;
                            color: #172033;
                            font-family: Arial, sans-serif;
                        "
                    >
                        <div
                            style="
                                max-width: 520px;
                                margin: 0 auto;
                                overflow: hidden;
                                background: #ffffff;
                                border: 1px solid #dce5f2;
                                border-radius: 16px;
                            "
                        >
                            <div
                                style="
                                    padding: 22px 28px;
                                    color: #ffffff;
                                    background: #2563eb;
                                "
                            >
                                <strong style="font-size: 22px;">
                                    ResortHub
                                </strong>
                            </div>

                            <div style="padding: 30px 28px;">
                                <h1
                                    style="
                                        margin: 0 0 12px;
                                        font-size: 23px;
                                    "
                                >
                                    ${content.heading}
                                </h1>

                                <p
                                    style="
                                        margin: 0;
                                        color: #5d6b82;
                                        font-size: 15px;
                                        line-height: 1.7;
                                    "
                                >
                                    ${content.message}
                                </p>

                                <div
                                    style="
                                        margin: 26px 0;
                                        padding: 20px;
                                        color: #1d4ed8;
                                        background: #eff6ff;
                                        border: 1px solid #bfdbfe;
                                        border-radius: 12px;
                                        font-size: 34px;
                                        font-weight: 700;
                                        letter-spacing: 9px;
                                        text-align: center;
                                    "
                                >
                                    ${otp}
                                </div>

                                <p
                                    style="
                                        margin: 0;
                                        color: #5d6b82;
                                        font-size: 14px;
                                        line-height: 1.7;
                                    "
                                >
                                    This code expires in
                                    <strong>${expirationMinutes} minutes</strong>.
                                    Do not share this code with anyone.
                                </p>

                                <p
                                    style="
                                        margin: 22px 0 0;
                                        color: #8793a7;
                                        font-size: 12px;
                                        line-height: 1.6;
                                    "
                                >
                                    If you did not request this verification code,
                                    you can safely ignore this email.
                                </p>
                        </div>
                    </div>
                </body>
            </html>
        `,
    });
}

async function verifyEmailConnection() {
    return transporter.verify();
}

module.exports = {
    sendOtpEmail,
    verifyEmailConnection
};