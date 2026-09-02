"use strict";

const readline = require("readline");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");

function askQuestion(interfaceInstance, question) {
    return new Promise(resolve => {
        interfaceInstance.question(question, answer => {
            resolve(answer.trim());
        });
    });
}

function askHidden(question) {
    return new Promise((resolve, reject) => {
        const input = process.stdin;
        const output = process.stdout;

        if (!input.isTTY || typeof input.setRawMode !== "function") {
            reject(new Error("Run this command in an interactive terminal."));
            return;
        }

        let value = "";
        output.write(question);
        input.setEncoding("utf8");
        input.setRawMode(true);
        input.resume();

        function cleanup() {
            input.removeListener("data", handleInput);
            input.setRawMode(false);
            input.pause();
        }

        function handleInput(character) {
            if (character === "\u0003") {
                cleanup();
                output.write("\n");
                reject(new Error("System-admin creation was cancelled."));
                return;
            }

            if (character === "\r" || character === "\n") {
                cleanup();
                output.write("\n");
                resolve(value);
                return;
            }

            if (character === "\u0008" || character === "\u007f") {
                if (value.length > 0) {
                    value = value.slice(0, -1);
                    output.write("\b \b");
                }
                return;
            }

            if (character >= " ") {
                value += character;
                output.write("*");
            }
        }

        input.on("data", handleInput);
    });
}

async function createSystemAdmin() {
    const prompt = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const firstName = await askQuestion(prompt, "First name: ");
    const lastName = await askQuestion(prompt, "Last name: ");
    const email = (await askQuestion(prompt, "Email: ")).toLowerCase();
    prompt.close();

    if (!firstName || !lastName) {
        throw new Error("First name and last name are required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Enter a valid email address.");
    }

    const password = await askHidden("Password (at least 12 characters): ");
    const confirmation = await askHidden("Confirm password: ");

    if (password.length < 12) {
        throw new Error("The system-admin password must have at least 12 characters.");
    }

    if (password !== confirmation) {
        throw new Error("The passwords do not match.");
    }

    const [existingUsers] = await pool.execute(
        "SELECT id, role FROM users WHERE email = ? LIMIT 1",
        [email]
    );

    if (existingUsers.length > 0) {
        throw new Error(
            `An account already uses that email with role ${existingUsers[0].role}.`
        );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
        `INSERT INTO users
            (tenant_id, first_name, last_name, email, password_hash,
             role, account_status, setup_status)
         VALUES
            (NULL, ?, ?, ?, ?, 'system_admin', 'active', 'completed')`,
        [firstName, lastName, email, passwordHash]
    );

    console.log(`System-admin account created with user ID ${result.insertId}.`);
    console.log("The plain password was not stored.");
}

createSystemAdmin()
    .catch(error => {
        console.error(`Unable to create system admin: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
