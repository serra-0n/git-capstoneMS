"use strict";

const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name) {
    const value = String(process.env[name] || "").trim();

    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}

const mode = required("PAYMONGO_MODE");0

if (!["test", "live"].includes(mode)) {
    throw new Error(`PAYMONGO_MODE must be either "test" or "live"`);
}

const secretKey = required("PAYMONGO_SECRET_KEY");

if (!secretKey.startsWith(`sk_${mode}_`)) {
    throw new Error("PAYMONGO_SECRET_KEY does not match PAYMONGO_MODE.");

}

const accountlabel = required("PAYMONGO_ACCOUNT_LABEL");

if (!/^[A-Za-z0-9_-]{1,100}$/.test(accountlabel)) {
    throw new Error("PAYMONGO_ACCOUNT_LABEL must contain only letters, numbers, underscores, or hyphens.");
}

const tenantIds = new Set(required("PAYMONGO_TENANT_IDS").split(",").map((value) => value.trim()));

for (const id of tenantIds) {
    if (!/^[1-9]\d*$/.test(id)) {
        throw new Error("PAYMONGO_TENANT_IDS must contains positive IDs separated by commas.");   
    }
}

const baseUrl = new URL(required("APP_BASE_URL"));

if (!["http:", "https:"].includes(baseUrl.protocol)) {
    throw new Error("APP_BASE_URL must use HTTP or HTTPS.");
}

if (mode === "live" && baseUrl.protocol !== "https:") {
    throw new Error(
        "Live payments require an HTTPS APP_BASE_URL"
    );
}

if (baseUrl.username || baseUrl.password) {
    throw new Error("APP_BASE_URL must not contain credentials");
    };

module.exports = Object.freeze({
    mode,
    live: mode === "live",
    secretKey,
    webhookSecret: required("PAYMONGO_WEBHOOK_SECRET"),
    accountlabel,
    tenantIds,
    appBaseUrl: baseUrl.origin
});
