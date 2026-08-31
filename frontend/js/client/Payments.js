"use strict";

/* =========================================================
   RESORTHUB - CLIENT BILLING & PAYMENT
   File: js/client/Payments.js

   DEVELOPMENT MODE

   true:
   - Uses dummy billing records
   - Payment submission is frontend-only
   - Does NOT save to localStorage
   - Does NOT upload files to a server
   - Does NOT update MySQL
   - Does NOT perform real payment verification

   false:
   - Loads billing records from the Express backend
   - Sends payment information using FormData
   - Backend / database becomes the source of truth
   ========================================================= */

const USE_DUMMY_DATA = true;


/* =========================================================
   API ENDPOINTS
   ========================================================= */

const API_ENDPOINTS = {

    clientProfile: "/api/client/profile",

    billings: "/api/client/billings",

    billingByReservation(reservationId) {
        return `/api/client/reservations/${encodeURIComponent(reservationId)}/billing`;
    },

    submitPayment: "/api/client/payments"

};


/* =========================================================
   DUMMY CLIENT
   Presentation data only.
   ========================================================= */

const DUMMY_CLIENT = {

    id: 1,

    name: "Juan Dela Cruz"

};


/* =========================================================
   DUMMY BILLING DATA

   These values are only for frontend presentation/testing.
   They are NOT thesis/database facts.

   The actual billing amount and payment status must later
   come from the backend / MySQL database.
   ========================================================= */

const DUMMY_BILLINGS = [

    {
        billing_id: 501,

        reservation_id: 105,

        client_id: 1,

        reservation_reference: "RES-0105",

        resort_name: "Azure Garden Resort",

        accommodation_name: "Family Room",

        billing_amount: 7000.00,

        payment_status: "Pending"
    },

    {
        billing_id: 502,

        reservation_id: 102,

        client_id: 1,

        reservation_reference: "RES-0102",

        resort_name: "Palm Breeze Resort",

        accommodation_name: "Standard Room",

        billing_amount: 4400.00,

        payment_status: "Pending Verification"
    },

    {
        billing_id: 503,

        reservation_id: 103,

        client_id: 1,

        reservation_reference: "RES-0103",

        resort_name: "Serenity Springs Resort",

        accommodation_name: "Deluxe Room",

        billing_amount: 8400.00,

        payment_status: "Verified"
    }

];


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const paymentState = {

    client: null,

    billings: [],

    selectedBilling: null,

    selectedFile: null,

    submitting: false

};


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

/* Shared layout */

const clientApp =
    document.getElementById("clientApp");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const clientProfileButton =
    document.getElementById("clientProfileButton");

const clientDisplayName =
    document.getElementById("clientDisplayName");


/* Page content */

const paymentEmptyState =
    document.getElementById("paymentEmptyState");

const paymentContent =
    document.getElementById("paymentContent");


/* Billing information */

const paymentStatusBadge =
    document.getElementById("paymentStatusBadge");

const billingReservationReference =
    document.getElementById("billingReservationReference");

const billingResortName =
    document.getElementById("billingResortName");

const billingAccommodationName =
    document.getElementById("billingAccommodationName");

const billingAmount =
    document.getElementById("billingAmount");

const billingPaymentStatus =
    document.getElementById("billingPaymentStatus");


/* Payment form */

const paymentForm =
    document.getElementById("paymentForm");

const paymentReservationId =
    document.getElementById("paymentReservationId");

const paymentBillingId =
    document.getElementById("paymentBillingId");

const paymentMethod =
    document.getElementById("paymentMethod");

const transactionReference =
    document.getElementById("transactionReference");

const proofOfPayment =
    document.getElementById("proofOfPayment");

const proofOfPaymentFileName =
    document.getElementById("proofOfPaymentFileName");

const paymentFormMessage =
    document.getElementById("paymentFormMessage");

const submitPaymentButton =
    document.getElementById("submitPaymentButton");


/* Current status */

const currentPaymentStatus =
    document.getElementById("currentPaymentStatus");


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializePaymentsPage
);


async function initializePaymentsPage() {

    initializeIcons();

    initializeSidebar();

    initializeProfileButton();

    initializePaymentForm();

    initializeFileInput();


    if (USE_DUMMY_DATA) {

        loadDummyData();

        return;
    }


    await loadPaymentDataFromDatabase();
}


/* =========================================================
   DUMMY DATA MODE
   ========================================================= */

function loadDummyData() {

    paymentState.client = {
        ...DUMMY_CLIENT
    };


    paymentState.billings =
        DUMMY_BILLINGS.map(
            billing => ({
                ...billing
            })
        );


    const requestedReservationId =
        getReservationIdFromUrl();


    if (requestedReservationId) {

        paymentState.selectedBilling =
            paymentState.billings.find(
                billing =>
                    String(billing.reservation_id) ===
                    String(requestedReservationId)
            ) || null;

    } else {

        /*
         * For frontend preview only.
         * The first dummy billing record is displayed.
         */

        paymentState.selectedBilling =
            paymentState.billings[0] ||
            null;
    }


    renderClient();

    renderPaymentPage();
}


/* =========================================================
   DATABASE / API MODE
   ========================================================= */

async function loadPaymentDataFromDatabase() {

    try {

        const requestedReservationId =
            getReservationIdFromUrl();


        await loadClientFromApi();


        if (requestedReservationId) {

            await loadBillingByReservationFromApi(
                requestedReservationId
            );

        } else {

            await loadBillingsFromApi();
        }


        renderClient();

        renderPaymentPage();


    } catch (error) {

        console.error(
            "Unable to load billing information:",
            error
        );


        paymentState.selectedBilling =
            null;


        renderPaymentPage();
    }
}


/* =========================================================
   LOAD CLIENT
   ========================================================= */

async function loadClientFromApi() {

    const response =
        await fetch(
            API_ENDPOINTS.clientProfile,
            {
                method: "GET",

                credentials: "include",

                headers: {
                    "Accept": "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            "Unable to load client profile."
        );
    }


    const data =
        await response.json();


    paymentState.client =
        normalizeClient(data);
}


/* =========================================================
   LOAD ALL CLIENT BILLINGS
   ========================================================= */

async function loadBillingsFromApi() {

    const response =
        await fetch(
            API_ENDPOINTS.billings,
            {
                method: "GET",

                credentials: "include",

                headers: {
                    "Accept": "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            "Unable to load billing records."
        );
    }


    const data =
        await response.json();


    paymentState.billings =
        normalizeBillings(data);


    /*
     * If the page is opened without a reservation ID,
     * the first record returned by the backend is shown.
     *
     * Backend ordering should eventually determine which
     * billing record appears first.
     */

    paymentState.selectedBilling =
        paymentState.billings[0] ||
        null;
}


/* =========================================================
   LOAD BILLING BY RESERVATION
   ========================================================= */

async function loadBillingByReservationFromApi(
    reservationId
) {

    const response =
        await fetch(
            API_ENDPOINTS.billingByReservation(
                reservationId
            ),
            {
                method: "GET",

                credentials: "include",

                headers: {
                    "Accept": "application/json"
                }
            }
        );


    if (response.status === 404) {

        paymentState.selectedBilling =
            null;

        return;
    }


    if (!response.ok) {

        throw new Error(
            "Unable to load reservation billing."
        );
    }


    const data =
        await response.json();


    const billing =
        normalizeBilling(
            data?.billing || data
        );


    paymentState.selectedBilling =
        billing;
}


/* =========================================================
   NORMALIZE CLIENT
   ========================================================= */

function normalizeClient(data) {

    const client =
        data?.client ||
        data;


    if (
        !client ||
        typeof client !== "object"
    ) {

        return null;
    }


    return {

        id:
            client.id ??
            client.client_id ??
            null,

        name:
            client.name ||
            client.full_name ||
            ""
    };
}


/* =========================================================
   NORMALIZE BILLINGS
   ========================================================= */

function normalizeBillings(data) {

    const records =
        Array.isArray(data)
            ? data
            : data?.billings;


    if (!Array.isArray(records)) {

        return [];
    }


    return records
        .map(normalizeBilling)
        .filter(Boolean);
}


/* =========================================================
   NORMALIZE SINGLE BILLING
   ========================================================= */

function normalizeBilling(billing) {

    if (
        !billing ||
        typeof billing !== "object"
    ) {

        return null;
    }


    return {

        billing_id:
            billing.billing_id ??
            billing.id ??
            null,

        reservation_id:
            billing.reservation_id ??
            null,

        client_id:
            billing.client_id ??
            null,

        reservation_reference:
            billing.reservation_reference ||
            billing.reference_number ||
            "",

        resort_name:
            billing.resort_name ||
            "",

        accommodation_name:
            billing.accommodation_name ||
            "",

        billing_amount:
            parseNumericValue(
                billing.billing_amount ??
                billing.amount ??
                0
            ),

        payment_status:
            billing.payment_status ||
            "Pending"
    };
}


/* =========================================================
   PARSE NUMBER
   ========================================================= */

function parseNumericValue(value) {

    const numericValue =
        Number(value);


    if (!Number.isFinite(numericValue)) {

        return 0;
    }


    return numericValue;
}


/* =========================================================
   RENDER CLIENT
   ========================================================= */

function renderClient() {

    if (!clientDisplayName) {

        return;
    }


    clientDisplayName.textContent =
        paymentState.client?.name ||
        "Client";
}


/* =========================================================
   RENDER PAYMENT PAGE
   ========================================================= */

function renderPaymentPage() {

    const billing =
        paymentState.selectedBilling;


    if (!billing) {

        showPaymentEmptyState();

        return;
    }


    hidePaymentEmptyState();


    setText(
        billingReservationReference,
        billing.reservation_reference
    );


    setText(
        billingResortName,
        billing.resort_name
    );


    setText(
        billingAccommodationName,
        billing.accommodation_name
    );


    setText(
        billingAmount,
        formatCurrency(
            billing.billing_amount
        )
    );


    setText(
        billingPaymentStatus,
        billing.payment_status
    );


    setText(
        currentPaymentStatus,
        billing.payment_status
    );


    renderPaymentStatusBadge(
        billing.payment_status
    );


    fillPaymentFormIdentifiers(
        billing
    );


    updatePaymentFormState(
        billing.payment_status
    );


    initializeIcons();
}


/* =========================================================
   FORM IDENTIFIERS
   ========================================================= */

function fillPaymentFormIdentifiers(
    billing
) {

    if (paymentReservationId) {

        paymentReservationId.value =
            billing.reservation_id ?? "";
    }


    if (paymentBillingId) {

        paymentBillingId.value =
            billing.billing_id ?? "";
    }
}


/* =========================================================
   PAYMENT STATUS BADGE
   ========================================================= */

function renderPaymentStatusBadge(
    status
) {

    if (!paymentStatusBadge) {

        return;
    }


    paymentStatusBadge.textContent =
        status || "—";


    paymentStatusBadge.classList.remove(
        "status-success",
        "status-warning",
        "status-danger",
        "status-info",
        "status-neutral"
    );


    paymentStatusBadge.classList.add(
        getStatusClass(status)
    );
}


/* =========================================================
   STATUS PRESENTATION

   These mappings are for frontend display only.
   The actual valid status values should eventually be
   controlled by the backend/database.
   ========================================================= */

function getStatusClass(status) {

    const normalizedStatus =
        String(status || "")
            .trim()
            .toLowerCase();


    switch (normalizedStatus) {

        case "verified":
            return "status-success";


        case "pending verification":
            return "status-warning";


        case "pending":
            return "status-info";


        case "rejected":
            return "status-danger";


        default:
            return "status-neutral";
    }
}


/* =========================================================
   PAYMENT FORM
   ========================================================= */

function initializePaymentForm() {

    if (!paymentForm) {

        return;
    }


    paymentForm.addEventListener(
        "submit",
        handlePaymentSubmission
    );
}


/* =========================================================
   FILE INPUT
   ========================================================= */

function initializeFileInput() {

    if (!proofOfPayment) {

        return;
    }


    proofOfPayment.addEventListener(
        "change",
        handleProofOfPaymentChange
    );
}


function handleProofOfPaymentChange() {

    const file =
        proofOfPayment.files?.[0] ||
        null;


    paymentState.selectedFile =
        file;


    if (!proofOfPaymentFileName) {

        return;
    }


    proofOfPaymentFileName.textContent =
        file
            ? file.name
            : "No file selected";
}


/* =========================================================
   SUBMIT PAYMENT
   ========================================================= */

async function handlePaymentSubmission(
    event
) {

    event.preventDefault();


    if (paymentState.submitting) {

        return;
    }


    clearPaymentMessage();


    const billing =
        paymentState.selectedBilling;


    if (!billing) {

        showPaymentMessage(
            "Billing information is unavailable.",
            "error"
        );

        return;
    }


    const validationMessage =
        validatePaymentForm();


    if (validationMessage) {

        showPaymentMessage(
            validationMessage,
            "error"
        );

        return;
    }


    const formData =
        createPaymentFormData();


    if (USE_DUMMY_DATA) {

        submitDummyPayment(
            formData
        );

        return;
    }


    await submitPaymentToApi(
        formData
    );
}


/* =========================================================
   VALIDATION
   ========================================================= */

function validatePaymentForm() {

    if (
        !paymentMethod ||
        !paymentMethod.value
    ) {

        return "Please select a payment method.";
    }


    if (
        !transactionReference ||
        !transactionReference.value.trim()
    ) {

        return "Please enter the transaction reference number.";
    }


    if (
        !paymentState.selectedFile
    ) {

        return "Please upload proof of payment.";
    }


    return "";
}


/* =========================================================
   CREATE FORM DATA

   This is ready for Express + Multer or another compatible
   multipart/form-data upload middleware.
   ========================================================= */

function createPaymentFormData() {

    const formData =
        new FormData();


    formData.append(
        "reservation_id",
        paymentReservationId?.value || ""
    );


    formData.append(
        "billing_id",
        paymentBillingId?.value || ""
    );


    formData.append(
        "payment_method",
        paymentMethod?.value || ""
    );


    formData.append(
        "transaction_reference",
        transactionReference?.value.trim() || ""
    );


    if (paymentState.selectedFile) {

        formData.append(
            "proof_of_payment",
            paymentState.selectedFile
        );
    }


    return formData;
}


/* =========================================================
   DUMMY PAYMENT SUBMISSION

   This simulates only the frontend interaction.

   It does NOT:
   - process money
   - verify payment
   - store uploaded files
   - write to MySQL
   ========================================================= */

function submitDummyPayment(
    formData
) {

    setSubmittingState(true);


    console.log(
        "Dummy payment submission:"
    );


    for (
        const [key, value]
        of formData.entries()
    ) {

        if (value instanceof File) {

            console.log(
                key,
                value.name
            );

        } else {

            console.log(
                key,
                value
            );
        }
    }


    window.setTimeout(
        () => {

            /*
             * Submitted payment becomes pending verification
             * only for the current frontend session.
             *
             * This does NOT represent actual payment
             * verification.
             */

            if (
                paymentState.selectedBilling
            ) {

                paymentState.selectedBilling.payment_status =
                    "Pending Verification";
            }


            renderPaymentPage();


            resetPaymentSubmissionFields();


            showPaymentMessage(
                "Payment information submitted for frontend preview. Verification has not been performed.",
                "success"
            );


            setSubmittingState(false);

        },
        800
    );
}


/* =========================================================
   REAL API PAYMENT SUBMISSION
   ========================================================= */

async function submitPaymentToApi(
    formData
) {

    setSubmittingState(true);


    try {

        const response =
            await fetch(
                API_ENDPOINTS.submitPayment,
                {
                    method: "POST",

                    credentials: "include",

                    body: formData
                }
            );


        /*
         * Do NOT manually set Content-Type when using
         * FormData. The browser creates the multipart
         * boundary automatically.
         */

        if (!response.ok) {

            let message =
                "Unable to submit payment information.";


            try {

                const errorData =
                    await response.json();


                if (errorData?.message) {

                    message =
                        errorData.message;
                }

            } catch (error) {

                /*
                 * Keep default error message when
                 * response is not JSON.
                 */
            }


            throw new Error(message);
        }


        const data =
            await response.json();


        /*
         * Backend-returned payment/billing record becomes
         * the source of truth.
         */

        const updatedBilling =
            normalizeBilling(
                data?.billing ||
                data?.payment ||
                data
            );


        if (updatedBilling) {

            paymentState.selectedBilling = {

                ...paymentState.selectedBilling,

                ...updatedBilling

            };

        } else if (
            data?.payment_status
        ) {

            paymentState.selectedBilling.payment_status =
                data.payment_status;
        }


        renderPaymentPage();


        resetPaymentSubmissionFields();


        showPaymentMessage(
            data?.message ||
            "Payment information submitted successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Payment submission error:",
            error
        );


        showPaymentMessage(
            error.message ||
            "Unable to submit payment information.",
            "error"
        );


    } finally {

        setSubmittingState(false);
    }
}


/* =========================================================
   RESET SUBMISSION FIELDS
   ========================================================= */

function resetPaymentSubmissionFields() {

    if (paymentMethod) {

        paymentMethod.value =
            "";
    }


    if (transactionReference) {

        transactionReference.value =
            "";
    }


    if (proofOfPayment) {

        proofOfPayment.value =
            "";
    }


    paymentState.selectedFile =
        null;


    if (proofOfPaymentFileName) {

        proofOfPaymentFileName.textContent =
            "No file selected";
    }
}


/* =========================================================
   FORM STATE

   A verified billing record is displayed as completed and
   cannot be submitted again from this frontend form.
   ========================================================= */

function updatePaymentFormState(
    status
) {

    const verified =
        String(status || "")
            .trim()
            .toLowerCase() ===
        "verified";


    const controls = [
        paymentMethod,
        transactionReference,
        proofOfPayment
    ];


    controls.forEach(
        control => {

            if (control) {

                control.disabled =
                    verified;
            }
        }
    );


    if (!submitPaymentButton) {

        return;
    }


    submitPaymentButton.disabled =
        verified;


    const buttonText =
        submitPaymentButton.querySelector(
            "span"
        );


    if (buttonText) {

        buttonText.textContent =
            verified
                ? "Payment Verified"
                : "Submit Payment";
    }
}


/* =========================================================
   SUBMITTING STATE
   ========================================================= */

function setSubmittingState(
    submitting
) {

    paymentState.submitting =
        submitting;


    if (!submitPaymentButton) {

        return;
    }


    const currentStatus =
        paymentState.selectedBilling
            ?.payment_status;


    const verified =
        String(currentStatus || "")
            .trim()
            .toLowerCase() ===
        "verified";


    submitPaymentButton.disabled =
        submitting ||
        verified;


    const buttonText =
        submitPaymentButton.querySelector(
            "span"
        );


    if (!buttonText) {

        return;
    }


    if (verified) {

        buttonText.textContent =
            "Payment Verified";

        return;
    }


    buttonText.textContent =
        submitting
            ? "Submitting..."
            : "Submit Payment";
}


/* =========================================================
   FORM MESSAGE
   ========================================================= */

function showPaymentMessage(
    message,
    type = "info"
) {

    if (!paymentFormMessage) {

        return;
    }


    paymentFormMessage.textContent =
        message;


    paymentFormMessage.classList.remove(
        "success",
        "error",
        "info"
    );


    paymentFormMessage.classList.add(
        type
    );


    paymentFormMessage.hidden =
        false;
}


function clearPaymentMessage() {

    if (!paymentFormMessage) {

        return;
    }


    paymentFormMessage.textContent =
        "";


    paymentFormMessage.classList.remove(
        "success",
        "error",
        "info"
    );


    paymentFormMessage.hidden =
        true;
}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function showPaymentEmptyState() {

    if (paymentContent) {

        paymentContent.hidden =
            true;
    }


    if (paymentEmptyState) {

        paymentEmptyState.hidden =
            false;
    }


    initializeIcons();
}


function hidePaymentEmptyState() {

    if (paymentContent) {

        paymentContent.hidden =
            false;
    }


    if (paymentEmptyState) {

        paymentEmptyState.hidden =
            true;
    }
}


/* =========================================================
   CURRENCY
   ========================================================= */

function formatCurrency(
    value
) {

    const amount =
        Number(value);


    if (!Number.isFinite(amount)) {

        return "—";
    }


    return new Intl.NumberFormat(
        "en-PH",
        {
            style: "currency",
            currency: "PHP"
        }
    ).format(amount);
}


/* =========================================================
   URL RESERVATION ID

   Example:

   Payments.html?reservation=105
   ========================================================= */

function getReservationIdFromUrl() {

    const parameters =
        new URLSearchParams(
            window.location.search
        );


    const reservationId =
        parameters.get(
            "reservation"
        );


    if (!reservationId) {

        return null;
    }


    return reservationId;
}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
    element,
    value
) {

    if (!element) {

        return;
    }


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        element.textContent =
            "—";

        return;
    }


    element.textContent =
        String(value);
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function initializeSidebar() {

    if (
        !sidebarToggle ||
        !clientApp
    ) {

        return;
    }


    sidebarToggle.addEventListener(
        "click",
        handleSidebarToggle
    );
}


function handleSidebarToggle() {

    const isMobile =
        window.matchMedia(
            "(max-width: 760px)"
        ).matches;


    if (isMobile) {

        clientApp.classList.toggle(
            "sidebar-mobile-open"
        );

        return;
    }


    clientApp.classList.toggle(
        "sidebar-collapsed"
    );


    const collapsed =
        clientApp.classList.contains(
            "sidebar-collapsed"
        );


    sidebarToggle.setAttribute(
        "aria-expanded",
        String(!collapsed)
    );
}


/* =========================================================
   PROFILE BUTTON
   ========================================================= */

function initializeProfileButton() {

    if (!clientProfileButton) {

        return;
    }


    clientProfileButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "Profile.html";
        }
    );
}


/* =========================================================
   LUCIDE ICONS
   ========================================================= */

function initializeIcons() {

    if (
        typeof lucide !== "undefined" &&
        typeof lucide.createIcons ===
            "function"
    ) {

        lucide.createIcons();
    }
}