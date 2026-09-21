"use strict";

const config = require("./config");

const API_ORIGIN = "https://api.paymongo.com";
const REQUEST_TIMEOUT_MS = 15000;

function providerError(message, status = 0) {
    const error = new Error(message);

    error.name = "PayMongoError";
    error.providerStatus = status;

    return error;

}

async function request(method, endpoint, body) {
    const authorization = Buffer
    .from(`${config.secretKey}:`)
    .toString("base64");

    let response;

    try {
        response = await fetch(`${API_ORIGIN}${endpoint}`, {
            method,
            headers: {
                Authorization: `Basic ${authorization}`,
                accept: "application/json",
                "Content-Type": "application/json",
            },
            body:
                body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            redirect: "error"
        });
    }catch{
        throw providerError("Request timeout", 408);
    }

    if (!response.ok) {
        throw providerError(
            `PayMongo rejected the request with HTTP ${response.status}.`,
            response.status
        );
    }
    let payload;

    try{
        payload = await response.json();
        }catch {
            throw providerError("PayMongo returned an unreadable response", response.status);
    }

    if (
        !payload.data ||
        typeof payload.data.id !== "string" ||
        payload.data.type !== "checkout_session" ||
        !payload.data.attributes
    ) {
        throw providerError(
            "PayMongo returned an incomplete checkout response.",
            response.status
        );
    }
    return payload.data;
}

function checkoutPath(checkoutId) {
    if (
        typeof checkoutId !== "string" ||
        !/^cs_[A-Za-z0-9]+$/.test(checkoutId)
    ) {
        throw new Error("A valid PayMongo checkout ID is required.");
    }

    return `/v1/checkout_sessions/${encodeURIComponent(checkoutId)}`;
}

function validateCheckoutUrl(value){
    if (typeof value !== "string") {
        throw new Error("The checkout URL is missing.");
    }

    let url;

    try {
        url = new URL(value);
    } catch {
        throw new Error("The checkout URL is invalid.");
    }

    if(
        url.protocol !== "https:" ||
        url.hostname !== "checkout.paymongo.com" ||
        url.port ||
        url.username ||
        url.password
    ){
        throw new Error(
            "PayMongo returned an unexpected checkout destination"
        );
    }

    return url.toString();
}

async function createCheckout (attempt) {
    if (!attempt || typeof attempt !== "object") {
        throw new Error ("A saved payment attempt is required.");
    }

const uuidPattern =
    /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;

if (
    typeof attempt.id !== "string" ||
    !uuidPattern.test(attempt.id)
) {
    throw new Error("The payment attempt ID is invalid.");
}
    const reservationId = String(attempt.reservation_id);

    if (!/^[1-9]\d*$/.test(reservationId)) {
        throw new Error("The reservation ID is invalid.");

    }

    const paymentStage = attempt.payment_stage;

    if (!["deposit", "full", "balance"].includes(paymentStage)) {
        throw new Error("the payment stage is invalid");
    }

    const amountCentavos = Number(attempt.expected_centavos);

    if (
        !Number.isSafeInteger(amountCentavos) ||
        amountCentavos <= 0
    ){
        throw new Error(
        "The payment amount must be a positive integer in centavos."
        );
    }

    const successUrl = new URL(
        "/pages/client/Payments.html",
        config.appBaseUrl
    );
    successUrl.searchParams.set("reservation", reservationId);
    successUrl.searchParams.set("attempt", attempt.id);

    const cancelUrl = new URL(successUrl.toString());
    cancelUrl.searchParams.set("returned", "cancel");

    const session = await request(
        "POST",
        "/v2/checkout_sessions",
        {
            data:{
                attributes:{
                    reference_number: attempt.id,

                    description:
                    `Reservation ${reservationId}: ${paymentStage}`,

                    payment_method_types: ["gcash"],

                    line_items: [
                        {
                            name:`Reservation ${reservationId} ${paymentStage}` ,
                            amount: amountCentavos,
                            currency: "PHP",
                            quantity: 1

                        }
                    ],

                    success_url: successUrl.toString(),
                    cancel_url: cancelUrl.toString(),

                    show_description: true,
                    show_line_items: true,

                    metadata: {
                        attempt_id: attempt.id,
                        reservation_id: reservationId
                    }
                }
            }
        }
    );

    validateCheckoutUrl(session.attributes.checkout_url);

    return session;
}

async function retrieveCheckout(checkoutId) {
    return request(
        "GET",
        checkoutPath(checkoutId)
    );
}
async function expireCheckout(checkoutId) {
    return request(
        "POST",
        `${checkoutPath(checkoutId)}/expire`,
        {}
    );
}

module.exports = {
    createCheckout,
    retrieveCheckout,
    expireCheckout,
    validateCheckoutUrl
};
