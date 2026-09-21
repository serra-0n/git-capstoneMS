"use strict";

const express = require("express");

const {
    router: paymongoRouter,
    webhook
} = require("../paymongo/routes");

const {
    reconcileBatch
} = require("../paymongo/service");

const existingApp = require("./app");

const serverApp = express();


serverApp.post(
    "/api/webhooks/paymongo",
    express.raw({
        type: "application/json",
        limit: "256kb"
    }),
    webhook
);


serverApp.use(
    "/api/paymongo",
    paymongoRouter
);


serverApp.use((error, request, response, next) => {
    if (response.headersSent) {
        return next(error);
    }

    console.error(
        "PayMongo request failed:",
        error.code || error.name
    );

    const status =
        Number.isInteger(error.status) &&
        error.status >= 400 &&
        error.status <= 599
            ? error.status
            : 500;

    return response.status(status).json({
        message:
            status === 413
                ? "The request body is too large."
                : "Unable to process the payment request."
    });
});


serverApp.use(existingApp);


let reconciling = false;

async function runReconciliation() {
    if (reconciling) {
        return;
    }

    reconciling = true;

    try {
        await reconcileBatch();
    } catch (error) {
        console.error(
            "PayMongo reconciliation failed:",
            error.code || error.message
        );
    } finally {
        reconciling = false;
    }
}

const port = Number(process.env.PORT || 3000);

if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
) {
    throw new Error("PORT must be an integer between 1 and 65535.");
}

const server = serverApp.listen(port, () => {
    console.log(
        `ResortHub running at http://localhost:${port}`
    );


    void runReconciliation();


    const reconciliationTimer = setInterval(() => {
        void runReconciliation();
    }, 60000);

    reconciliationTimer.unref();

    server.once("close", () => {
        clearInterval(reconciliationTimer);
    });
});

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(
            `Port ${port} is already in use. Stop the existing server first.`
        );
    } else {
        console.error(
            "Server startup failed:",
            error.message
        );
    }

    process.exitCode = 1;
});