const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const TenantMembership = require("../models/TenantMembership");
const { verifyGoogleCredential } = require("../services/googleAuthService");

function createAccessToken(userId, tenantId, role) {
    return jwt.sign(
        {
            sub: userId,
            tenantId,
            role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "8h"
        }
    );
}

function normalizeMembership(membership) {
    return {
        id: membership.id,
        tenantId: membership.tenant_id,
        role: membership.membership_role,
        status: membership.membership_status,
        tenantCode: membership.tenant_code,
        resortName: membership.resort_name,
        approvalStatus: membership.approval_status,
        tenantStatus: membership.tenant_status
    };
}

async function login(request, response) {
    try {
        const email = String(request.body.email || "")
            .trim()
            .toLowerCase();

        const password = String(request.body.password || "");

        if (!email || !password) {
            return response.status(400).json({
                message: "Email and password are required."
            });
        }

        const user = await User.findByEmail(email);

        if (!user) {
            return response.status(401).json({
                message: "Invalid email or password."
            });
        }

        if (user.account_status !== "active") {
            return response.status(403).json({
                message: "This account is inactive or suspended."
            });
        }

        const passwordMatches = Boolean(user.password_hash)
            && await bcrypt.compare(password, user.password_hash);

        if (!passwordMatches) {
            return response.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = createAccessToken(
            user.id,
            user.tenant_id,
            user.role
        );

        await User.updateLastLogin(user.id);

        return response.json({
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                tenantId: user.tenant_id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login failed:", error);

        return response.status(500).json({
            message: "Unable to log in."
        });
    }
}

async function signup(request, response) {
    try {
        const firstName = String(
            request.body.firstName || ""
        ).trim();

        const lastName = String(
            request.body.lastName || ""
        ).trim();

        const email = String(
            request.body.email || ""
        )
            .trim()
            .toLowerCase();

        const password = String(
            request.body.password || ""
        );

        if (
            !firstName ||
            !lastName ||
            !email ||
            password.length < 6
        ) {
            return response.status(400).json({
                message: "Valid account information is required."
            });
        }

        const existingUser = await User.findByEmail(email);

        if (existingUser) {
            return response.status(409).json({
                message: "An account already uses this email."
            });
        }

        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        const userId = await User.createClient({
            firstName,
            lastName,
            email,
            passwordHash
        });

        return response.status(201).json({
            message: "Account created successfully.",
            userId
        });
    } catch (error) {
        console.error("Signup failed:", error);

        return response.status(500).json({
            message: "Unable to create the account."
        });
    }
}

async function getCurrentUser(request, response) {
    try {
        const user = await User.findById(request.user.id);

        if (!user) {
            return response.status(404).json({
                message: "User was not found."
            });
        }

        const memberships = await TenantMembership.findByUserId(
            user.id
        );

        return response.json({
            user: {
                id: user.id,
                tenantId: request.user.tenantId ?? null,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: request.user.role,
                accountRole: user.role,
                accountStatus: user.account_status,
                memberships: memberships.map(normalizeMembership)
            }
        });
    } catch (error) {
        console.error("Current user lookup failed:", error);

        return response.status(500).json({
            message: "Unable to load the user."
        });
    }
}

async function switchContext(request, response) {
    try {
        const context = String(
            request.body.context || ""
        )
            .trim()
            .toLowerCase();

        const user = await User.findById(request.user.id);

        if (!user || user.account_status !== "active") {
            return response.status(403).json({
                message: "This account is unavailable."
            });
        }

        if (context === "client") {
            if (user.role === "system_admin") {
                return response.status(403).json({
                    message: "A system administrator cannot use the client context."
                });
            }

            const token = createAccessToken(
                user.id,
                null,
                "client"
            );

            return response.json({
                message: "Switched to client.",
                token,
                context: {
                    tenantId: null,
                    role: "client"
                }
            });
        }

        if (context !== "resort") {
            return response.status(400).json({
                message: "A valid account context is required."
            });
        }

        const tenantId = Number(request.body.tenantId);

        if (!Number.isInteger(tenantId) || tenantId <= 0) {
            return response.status(400).json({
                message: "A valid resort is required."
            });
        }

        const membership =
            await TenantMembership.findActiveByUserAndTenant(
                user.id,
                tenantId
            );

        if (
            !membership ||
            !["owner", "admin"].includes(
                membership.membership_role
            )
        ) {
            return response.status(403).json({
                message: "You do not have active administrator access to this resort."
            });
        }

        const token = createAccessToken(
            user.id,
            membership.tenant_id,
            "resort_admin"
        );

        return response.json({
            message: `Switched to ${membership.resort_name}.`,
            token,
            context: {
                tenantId: membership.tenant_id,
                role: "resort_admin",
                resortName: membership.resort_name
            }
        });
    } catch (error) {
        console.error("Account context switch failed:", error);

        return response.status(500).json({
            message: "Unable to switch account context."
        });
    }
}

async function googleLogin(request, response) {
    const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

    if (request.get("origin") !== allowedOrigin) {
        return response.status(403).json({
            message: "This sign-in request is not allowed."
        });
    }

    if (!request.is("application/json")) {
        return response.status(415).json({
            message: "A JSON request is required."
        });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
        return response.status(503).json({
            message: "Google sign-in is not configured."
        });
    }

    let profile;

    try {
        profile = await verifyGoogleCredential(request.body?.credential);
    } catch {
        return response.status(401).json({
            message: "Google sign-in could not be verified. Try again."
        });
    }

    try {
        let user = await User.findByGoogleId(profile.googleId);

        if (!user) {
            const email = profile.email.trim().toLowerCase();
            const firstName = profile.firstName.trim();
            const lastName = profile.lastName.trim();

            if (
                !email ||
                email.length > 254 ||
                firstName.length > 80 ||
                lastName.length > 80
            ) {
                return response.status(400).json({
                    message: "Your Google profile exceeds the supported field lengths."
                });
            }

            const existingUser = await User.findByEmail(email);

            if (existingUser) {
                return response.status(409).json({
                    message: "An account already uses this email. Sign in with your existing method."
                });
            }

            const userId = await User.createGoogleClient({
                googleId: profile.googleId,
                firstName,
                lastName,
                email
            });
            user = await User.findById(userId);
        }

        if (!user || user.account_status !== "active") {
            return response.status(403).json({
                message: "This account is inactive or unavailable."
            });
        }

        const token = createAccessToken(
            user.id,
            user.tenant_id,
            user.role
        );

        await User.updateLastLogin(user.id);

        return response.json({
            message: "Google sign-in successful.",
            token,
            user: {
                id: user.id,
                tenantId: user.tenant_id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return response.status(409).json({
                message: "This account already exists. Please try signing in again."
            });
        }

        console.error("Google login failed:", error.code || error.name);

        return response.status(500).json({
            message: "Unable to sign in with Google."
        });
    }
}

module.exports = {
    login,
    googleLogin,
    signup,
    getCurrentUser,
    switchContext
};
