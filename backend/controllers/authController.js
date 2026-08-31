const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return response.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                sub: user.id,
                tenantId: user.tenant_id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "8h"
            }
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
        ).trim().toLowerCase();

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

        if(!user) {
            return response.status(404).json({
                message: "User was not found."
            });
        }

        return response.json({
            user: {
                id: user.id,
                tenantId: user.tenant_id,
                firstName: user.first_name,
                email: user.email,
                role: user.role,
                accountStatus: user.account_status
            }
        });
    }

    catch(error) {
        console.error("Current user lookup failed:", error);

        return response.status(500).json({
            message: "Unable to load the user."
        });
    }
}

module.exports = {
    login,
    signup,
    getCurrentUser
};
