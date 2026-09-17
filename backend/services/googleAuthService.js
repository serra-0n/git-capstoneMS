const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client();

async function verifyGoogleCredential(credential) {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        throw new Error("GOOGLE_CLIENT_ID is not configured.");
    }

    if (typeof credential !== "string" || !credential.trim()) {
        throw new Error("A Google sign-in credential is required.");
    }

    const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new Error("A verified Google email is required.");
    }

    return {
        googleId: payload.sub,
        email: payload.email,
        firstName: payload.given_name || "",
        lastName: payload.family_name || ""
    };
}

module.exports = { verifyGoogleCredential };