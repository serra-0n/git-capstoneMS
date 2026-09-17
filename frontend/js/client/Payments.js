"use strict";

const accessToken = sessionStorage.getItem("resorthub_access_token");

if (!accessToken) {
    window.location.href = "../auth/login.html";
}

/* API ENDPOINTS */

const API_ENDPOINTS = {
    clientProfile: "/api/client/profile",
    billings: "/api/client/reservations",
    billingByReservation(reservationId) {
        return `/api/client/reservations/${encodeURIComponent(reservationId)}`;
    },

    submitPayment: "/api/client/payments",
};

/* APPLICATION STATE */

const paymentState = {
    client: null,
    billings: [],
    selectedBilling: null,
    selectedPaymentOption: "deposit",
    selectedFile: null,
    submitting: false,
};

/* DOM ELEMENTS */

/* Shared layout */

const clientApp = document.getElementById("clientApp");

const sidebarToggle = document.getElementById("sidebarToggle");

const clientProfileButton = document.getElementById("clientProfileButton");

const clientDisplayName = document.getElementById("clientDisplayName");

/* Page content */

const paymentEmptyState = document.getElementById("paymentEmptyState");

const paymentContent = document.getElementById("paymentContent");

/* Billing information */

const paymentStatusBadge = document.getElementById("paymentStatusBadge");

const billingReservationReference = document.getElementById("billingReservationReference");

const billingResortName = document.getElementById("billingResortName");

const billingAccommodationName = document.getElementById("billingAccommodationName");

const billingAmount = document.getElementById("billingAmount");

const billingAmountPaid = document.getElementById("billingAmountPaid");

const billingRemainingBalance = document.getElementById("billingRemainingBalance");

const billingPaymentStatus = document.getElementById("billingPaymentStatus");

/* Payment form */

const paymentForm = document.getElementById("paymentForm");

const paymentSubmissionTitle = document.getElementById("paymentSubmissionTitle");

const paymentSubmissionDescription = document.getElementById("paymentSubmissionDescription");

const paymentCompleteMessage = document.getElementById("paymentCompleteMessage");

const paymentOptionInputs = document.querySelectorAll('input[name="payment_option"]');

const fullPaymentOption = document.getElementById("fullPaymentOption");

const depositPaymentOption = document.getElementById("depositPaymentOption");

const balancePaymentOption = document.getElementById("balancePaymentOption");

const balancePaymentAmount = document.getElementById("balancePaymentAmount");

const fullPaymentAmount = document.getElementById("fullPaymentAmount");

const depositPaymentAmount = document.getElementById("depositPaymentAmount");

const payLaterButton = document.getElementById("payLaterButton");

const paymentReservationId = document.getElementById("paymentReservationId");

const paymentBillingId = document.getElementById("paymentBillingId");

const paymentMethod = document.getElementById("paymentMethod");

const gcashPaymentDetails = document.getElementById("gcashPaymentDetails");

const gcashAccountName = document.getElementById("gcashAccountName");

const gcashNumber = document.getElementById("gcashNumber");

const gcashQrContainer = document.getElementById("gcashQrContainer");

const gcashQrImage = document.getElementById("gcashQrImage");

const gcashUnavailableMessage = document.getElementById("gcashUnavailableMessage");

const transactionReference = document.getElementById("transactionReference");

const proofOfPayment = document.getElementById("proofOfPayment");

const proofOfPaymentFileName = document.getElementById("proofOfPaymentFileName");

const paymentFormMessage = document.getElementById("paymentFormMessage");

const submitPaymentButton = document.getElementById("submitPaymentButton");

/* Current status */

const currentPaymentStatus = document.getElementById("currentPaymentStatus");

/* INITIALIZATION */

document.addEventListener("DOMContentLoaded", initializePaymentsPage);

async function initializePaymentsPage() {
    initializeIcons();
    initializeSidebar();
    initializeProfileButton();
    initializePaymentForm();
    initializePaymentOptions();
    initializeFileInput();

    await loadPaymentDataFromDatabase();
}

async function loadPaymentDataFromDatabase() {
    try {
        const requestedReservationId = getReservationIdFromUrl();

        await loadClientFromApi();

        if (requestedReservationId) {
            await loadBillingByReservationFromApi(requestedReservationId);
        } else {
            await loadBillingsFromApi();
        }

        renderClient();

        renderPaymentPage();
    } catch (error) {
        console.error("Unable to load billing information:", error);

        paymentState.selectedBilling = null;

        renderPaymentPage();
    }
}

/* LOAD CLIENT */

async function loadClientFromApi() {
    const response = await fetch(API_ENDPOINTS.clientProfile, {
        method: "GET",

        credentials: "include",

        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error("Unable to load client profile.");
    }

    const data = await response.json();

    paymentState.client = normalizeClient(data);
}

/* LOAD ALL CLIENT BILLINGS */

async function loadBillingsFromApi() {
    const response = await fetch(API_ENDPOINTS.billings, {
        method: "GET",

        credentials: "include",

        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error("Unable to load billing records.");
    }

    const data = await response.json();

    paymentState.billings = normalizeBillings(data);

    /*
     * If the page is opened without a reservation ID,
     * the first record returned by the backend is shown.
     *
     * Backend ordering should eventually determine which
     * billing record appears first.
     */

    paymentState.selectedBilling = paymentState.billings[0] || null;
}

/* LOAD BILLING BY RESERVATION */

async function loadBillingByReservationFromApi(reservationId) {
    const response = await fetch(API_ENDPOINTS.billingByReservation(reservationId), {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (response.status === 404) {
        paymentState.selectedBilling = null;

        return;
    }

    if (!response.ok) {
        throw new Error("Unable to load reservation billing.");
    }

    const data = await response.json();

    const billing = normalizeBilling(data?.reservation || data?.billing || data);

    paymentState.selectedBilling = billing;
}

/* NORMALIZE CLIENT */

function normalizeClient(data) {
    const client = data?.client || data;

    if (!client || typeof client !== "object") {
        return null;
    }

    return {
        id: client.id ?? client.client_id ?? null,

        name: client.name || client.full_name || "",
    };
}

/* NORMALIZE BILLINGS */

function normalizeBillings(data) {
    const records = Array.isArray(data)
        ? data
        : data?.billings || data?.reservations || data?.reservation || [];

    if (!Array.isArray(records)) {
        return [];
    }

    return records.map(normalizeBilling).filter(Boolean);
}

/* NORMALIZE SINGLE BILLING */

function normalizeBilling(billing) {
    if (!billing || typeof billing !== "object") {
        return null;
    }

    return {
        billing_id: billing.billing_id ?? null,

        reservation_id: billing.reservation_id ?? billing.id ?? null,

        client_id: billing.client_id ?? null,

        reservation_reference:
            billing.reservation_reference ||
            billing.reference_number ||
            billing.reservation_code ||
            "",

        resort_name: billing.resort_name || "",

        accommodation_name: billing.accommodation_name || "",

        total_amount: parseNumericValue(billing.total_amount ?? 0),

        deposit_amount: parseNumericValue(billing.deposit_amount ?? 0),

        payment_plan: billing.payment_plan || "half",

        amount_paid: parseNumericValue(billing.amount_paid ?? 0),

        gcash_account_name: billing.gcash_account_name || "",

        gcash_number: billing.gcash_number || "",

        gcash_qr_path: billing.gcash_qr_path || "",

        billing_amount: parseNumericValue(
            billing.deposit_amount ?? billing.billing_amount ?? billing.amount ?? 0,
        ),

        payment_status: billing.payment_status || "Unpaid",

        reservation_status: billing.reservation_status || billing.status || "",

        deposit_due_at: billing.deposit_due_at || null,
    };
}

/* PARSE NUMBER */

function parseNumericValue(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return 0;
    }

    return numericValue;
}

/* RENDER CLIENT */

function renderClient() {
    if (!clientDisplayName) {
        return;
    }

    clientDisplayName.textContent = paymentState.client?.name || "Client";
}

/* RENDER PAYMENT PAGE */

function renderPaymentPage() {
    const billing = paymentState.selectedBilling;

    if (!billing) {
        showPaymentEmptyState();
        return;
    }

    hidePaymentEmptyState();

    setText(fullPaymentAmount, formatCurrency(billing.total_amount));

    setText(depositPaymentAmount, formatCurrency(billing.deposit_amount));

    setText(
        balancePaymentAmount,
        formatCurrency(Math.max(billing.total_amount - billing.amount_paid, 0)),
    );

    configurePaymentOptions(billing);

    updateSelectedPaymentAmount();

    setText(billingReservationReference, billing.reservation_reference);

    setText(billingResortName, billing.resort_name);

    setText(billingAccommodationName, billing.accommodation_name);

    setText(billingAmount, formatCurrency(billing.total_amount));

    setText(billingAmountPaid, formatCurrency(billing.amount_paid));

    setText(
        billingRemainingBalance,
        formatCurrency(Math.max(billing.total_amount - billing.amount_paid, 0)),
    );

    setText(billingPaymentStatus, billing.payment_status);

    setText(currentPaymentStatus, billing.payment_status);

    renderPaymentStatusBadge(billing.payment_status);

    fillPaymentFormIdentifiers(billing);

    updatePaymentFormState(billing);

    initializeIcons();
}
/*FORM IDENTIFIERS*/

function fillPaymentFormIdentifiers(billing) {
    if (paymentReservationId) {
        paymentReservationId.value = billing.reservation_id ?? "";
    }

    if (paymentBillingId) {
        paymentBillingId.value = billing.billing_id ?? "";
    }
}
/*PAYMENT STATUS BADGE*/

function renderPaymentStatusBadge(status) {
    if (!paymentStatusBadge) {
        return;
    }

    paymentStatusBadge.textContent = status || "—";

    paymentStatusBadge.classList.remove(
        "status-success",
        "status-warning",
        "status-danger",
        "status-info",
        "status-neutral",
    );

    paymentStatusBadge.classList.add(getStatusClass(status));
}

/* STATUS PRESENTATION These mappings are for frontend display only. The actual valid status values should eventually be controlled by the backend/database. */

function getStatusClass(status) {
    const normalizedStatus = String(status || "")
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

function configurePaymentOptions(billing) {
    if (!billing) {
        return;
    }

    const reservationStatus = String(billing.reservation_status || "").toLowerCase();

    const paymentStatus = String(billing.payment_status || "").toLowerCase();

    const balanceMode =
        reservationStatus === "confirmed" &&
        (paymentStatus === "partially_paid" ||
            (paymentStatus === "pending" && billing.amount_paid > 0));

    const paymentPlan = String(billing.payment_plan || "half").toLowerCase();
    const depositPlan = paymentPlan === "half";

    if (fullPaymentOption) fullPaymentOption.hidden = balanceMode || depositPlan;
    if (depositPaymentOption) depositPaymentOption.hidden = balanceMode || !depositPlan;
    if (payLaterButton) payLaterButton.hidden = true;

    if (balancePaymentOption) {
        balancePaymentOption.hidden = !balanceMode;
    }

    const selectedOption = balanceMode ? "balance" : depositPlan ? "deposit" : "full";
    const selectedInput = document.querySelector(
        `input[name="payment_option"][value="${selectedOption}"]`,
    );

    if (selectedInput) {
        selectedInput.checked = true;
    }

    paymentState.selectedPaymentOption = selectedOption;
}

function initializePaymentOptions() {
    paymentOptionInputs.forEach((input) => {
        input.addEventListener("change", handlePaymentOptionChange);
    });

    if (payLaterButton) {
        payLaterButton.addEventListener("click", handlePayLater);
    }

    if (paymentMethod) {
        paymentMethod.addEventListener("change", renderGcashPaymentDetails);
    }
}

function handlePaymentOptionChange(event) {
    paymentState.selectedPaymentOption = event.target.value;
    updateSelectedPaymentAmount();
    updatePaymentFormState(paymentState.selectedBilling);
}

function updateSelectedPaymentAmount() {
    const billing = paymentState.selectedBilling;

    if (!billing) {
        return;
    }

    let selectedAmount = billing.deposit_amount;

    if (paymentState.selectedPaymentOption === "full") {
        selectedAmount = billing.total_amount;
    }

    if (paymentState.selectedPaymentOption === "balance") {
        selectedAmount = Math.max(billing.total_amount - billing.amount_paid, 0);
    }

    billing.billing_amount = selectedAmount;
}

function handlePayLater() {
    const reservationId = paymentState.selectedBilling?.reservation_id;

    if (!reservationId) {
        return;
    }

    window.location.href = `ReservationStatus.html?id=${encodeURIComponent(reservationId)}`;
}

function renderGcashPaymentDetails() {
    if (!gcashPaymentDetails) {
        return;
    }

    const gcashSelected = paymentMethod?.value === "gcash";
    gcashPaymentDetails.hidden = !gcashSelected;

    if (!gcashSelected) {
        return;
    }

    const billing = paymentState.selectedBilling;
    const accountName = billing?.gcash_account_name || "";
    const number = billing?.gcash_number || "";
    const qrPath = billing?.gcash_qr_path || "";
    const configured = Boolean(accountName && number);

    setText(gcashAccountName, accountName);
    setText(gcashNumber, number);

    if (gcashUnavailableMessage) {
        gcashUnavailableMessage.hidden = configured;
    }

    if (gcashQrContainer && gcashQrImage) {
        gcashQrContainer.hidden = !qrPath;

        if (qrPath) {
            gcashQrImage.src = `/${qrPath.replaceAll("\\", "/")}`;
        } else {
            gcashQrImage.removeAttribute("src");
        }
    }
}
/*PAYMENT FORM*/

function initializePaymentForm() {
    if (!paymentForm) {
        return;
    }

    paymentForm.addEventListener("submit", handlePaymentSubmission);
}
/*FILE INPUT*/

function initializeFileInput() {
    if (!proofOfPayment) {
        return;
    }

    proofOfPayment.addEventListener("change", handleProofOfPaymentChange);
}

function handleProofOfPaymentChange() {
    const file = proofOfPayment.files?.[0] || null;

    paymentState.selectedFile = file;

    if (!proofOfPaymentFileName) {
        return;
    }

    proofOfPaymentFileName.textContent = file ? file.name : "No file selected";
}
/*SUBMIT PAYMENT*/

async function handlePaymentSubmission(event) {
    event.preventDefault();

    if (paymentState.submitting) {
        return;
    }

    clearPaymentMessage();

    const billing = paymentState.selectedBilling;

    if (!billing) {
        showPaymentMessage("Billing information is unavailable.", "error");
        return;
    }

    const validationMessage = validatePaymentForm();

    if (validationMessage) {
        showPaymentMessage(validationMessage, "error");
        return;
    }

    const formData = createPaymentFormData();

    await submitPaymentToApi(formData);
}
/*VALIDATION*/

function validatePaymentForm() {
    if (!paymentMethod || !paymentMethod.value) {
        return "Please select a payment method.";
    }

    if (
        paymentMethod.value === "gcash" &&
        (!paymentState.selectedBilling?.gcash_account_name ||
            !paymentState.selectedBilling?.gcash_number)
    ) {
        return "The resort has not configured its GCash payment information.";
    }

    if (!transactionReference || !transactionReference.value.trim()) {
        return "Please enter the transaction reference number.";
    }

    if (!paymentState.selectedFile) {
        return "Please upload proof of payment.";
    }
    return "";
}

/* CREATE FORM DATA This is ready for Express + Multer or another compatible multipart/form-data upload middleware. */

function createPaymentFormData() {
    const formData = new FormData();

    formData.append("reservation_id", paymentReservationId?.value || "");

    formData.append("payment_option", paymentState.selectedPaymentOption);

    formData.append("billing_id", paymentBillingId?.value || "");

    formData.append("payment_method", paymentMethod?.value || "");

    formData.append("transaction_reference", transactionReference?.value.trim() || "");

    if (paymentState.selectedFile) {
        formData.append("proof_of_payment", paymentState.selectedFile);
    }

    return formData;
}

/* REAL API PAYMENT SUBMISSION */

async function submitPaymentToApi(formData) {
    setSubmittingState(true);

    try {
        const response = await fetch(API_ENDPOINTS.submitPayment, {
            method: "POST",
            credentials: "include",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
        });

        /*
         * Do NOT manually set Content-Type when using
         * FormData. The browser creates the multipart
         * boundary automatically.
         */

        if (!response.ok) {
            let message = "Unable to submit payment information.";

            try {
                const errorData = await response.json();

                if (errorData?.message) {
                    message = errorData.message;
                }
            } catch (error) {
                /*
                 * Keep default error message when
                 * response is not JSON.
                 */
            }

            throw new Error(message);
        }

        const data = await response.json();

        /*
         * Backend-returned payment/billing record becomes
         * the source of truth.
         */

        const updatedBilling = normalizeBilling(data?.billing || data?.payment || data);

        if (updatedBilling) {
            paymentState.selectedBilling = {
                ...paymentState.selectedBilling,

                ...updatedBilling,
            };
        } else if (data?.payment_status) {
            paymentState.selectedBilling.payment_status = data.payment_status;
        }

        renderPaymentPage();

        resetPaymentSubmissionFields();

        showPaymentMessage(
            data?.message || "Payment information submitted successfully.",
            "success",
        );
    } catch (error) {
        console.error("Payment submission error:", error);

        showPaymentMessage(error.message || "Unable to submit payment information.", "error");
    } finally {
        setSubmittingState(false);
    }
}

/* RESET SUBMISSION FIELDS */

function resetPaymentSubmissionFields() {
    if (paymentMethod) {
        paymentMethod.value = "";
    }

    if (transactionReference) {
        transactionReference.value = "";
    }

    if (proofOfPayment) {
        proofOfPayment.value = "";
    }

    paymentState.selectedFile = null;

    if (proofOfPaymentFileName) {
        proofOfPaymentFileName.textContent = "No file selected";
    }
}

function updatePaymentFormState(billing) {
    const paymentStatus = String(billing?.payment_status || "")
        .trim()
        .toLowerCase();

    const reservationStatus = String(billing?.reservation_status || "")
        .trim()
        .toLowerCase();

    const deadline = billing?.deposit_due_at ? new Date(billing.deposit_due_at) : null;

    const validDeadline = deadline && !Number.isNaN(deadline.getTime());

    const expired = !validDeadline || deadline.getTime() <= Date.now();

    const awaitingDeposit = reservationStatus === "awaiting_deposit";

    const confirmedReservation = reservationStatus === "confirmed";

    const remainingBalance = Math.max(
        Number(billing?.total_amount || 0) - Number(billing?.amount_paid || 0),
        0,
    );

    const paymentSubmitted = ["pending", "pending verification"].includes(paymentStatus);

    const fullyPaid = ["paid", "verified"].includes(paymentStatus);

    if (paymentForm) {
        paymentForm.hidden = fullyPaid;
    }

    if (paymentCompleteMessage) {
        paymentCompleteMessage.hidden = !fullyPaid;
    }

    setText(paymentSubmissionTitle, fullyPaid ? "Payment Complete" : "Payment Submission");

    setText(
        paymentSubmissionDescription,
        fullyPaid
            ? "Your reservation has been fully paid."
            : "Submit payment information for manual verification.",
    );

    const initialPaymentAllowed = awaitingDeposit && !expired && paymentStatus === "unpaid";

    const balancePaymentAllowed =
        confirmedReservation && paymentStatus === "partially_paid" && remainingBalance > 0;

    const paymentAllowed = initialPaymentAllowed || balancePaymentAllowed;

    const controls = [...paymentOptionInputs, paymentMethod, transactionReference, proofOfPayment];

    controls.forEach((control) => {
        if (control) {
            control.disabled = !paymentAllowed;
        }
    });

    if (payLaterButton) {
        payLaterButton.disabled = !initialPaymentAllowed;
    }

    if (!submitPaymentButton) {
        return;
    }

    submitPaymentButton.disabled = !paymentAllowed;

    const buttonText = submitPaymentButton.querySelector("span");

    if (!buttonText) {
        return;
    }

    if (fullyPaid) {
        buttonText.textContent = "Payment Verified";

        return;
    }

    if (paymentSubmitted) {
        buttonText.textContent = "Pending Verification";

        return;
    }

    if (balancePaymentAllowed) {
        buttonText.textContent = "Submit Balance Payment";

        return;
    }

    if (awaitingDeposit && expired) {
        buttonText.textContent = "Payment Period Expired";

        return;
    }

    if (!paymentAllowed) {
        buttonText.textContent = "Payment Not Available";

        return;
    }

    buttonText.textContent =
        paymentState.selectedPaymentOption === "full" ? "Submit Full Payment" : "Submit Deposit";
}

/* SUBMITTING STATE */

function setSubmittingState(submitting) {
    paymentState.submitting = submitting;

    if (!submitPaymentButton) {
        return;
    }

    if (!submitting) {
        updatePaymentFormState(paymentState.selectedBilling);

        return;
    }

    submitPaymentButton.disabled = true;

    const buttonText = submitPaymentButton.querySelector("span");

    if (buttonText) {
        buttonText.textContent = "Submitting...";
    }
}

/* FORM MESSAGE */

function showPaymentMessage(message, type = "info") {
    if (!paymentFormMessage) {
        return;
    }

    paymentFormMessage.textContent = message;

    paymentFormMessage.classList.remove("success", "error", "info");

    paymentFormMessage.classList.add(type);

    paymentFormMessage.hidden = false;
}

function clearPaymentMessage() {
    if (!paymentFormMessage) {
        return;
    }

    paymentFormMessage.textContent = "";

    paymentFormMessage.classList.remove("success", "error", "info");

    paymentFormMessage.hidden = true;
}

/* EMPTY STATE */

function showPaymentEmptyState() {
    if (paymentContent) {
        paymentContent.hidden = true;
    }

    if (paymentEmptyState) {
        paymentEmptyState.hidden = false;
    }

    initializeIcons();
}

function hidePaymentEmptyState() {
    if (paymentContent) {
        paymentContent.hidden = false;
    }

    if (paymentEmptyState) {
        paymentEmptyState.hidden = true;
    }
}

/* CURRENCY */

function formatCurrency(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "—";
    }

    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(amount);
}

/* URL RESERVATION ID Example: Payments.html?reservation=105 */

function getReservationIdFromUrl() {
    const parameters = new URLSearchParams(window.location.search);

    const reservationId = parameters.get("reservation");

    if (!reservationId) {
        return null;
    }

    return reservationId;
}

/* SET TEXT */

function setText(element, value) {
    if (!element) {
        return;
    }

    if (value === null || value === undefined || value === "") {
        element.textContent = "—";

        return;
    }

    element.textContent = String(value);
}

/* SIDEBAR */

function initializeSidebar() {
    if (!sidebarToggle || !clientApp) {
        return;
    }

    sidebarToggle.addEventListener("click", handleSidebarToggle);
}

function handleSidebarToggle() {
    const isMobile = window.matchMedia("(max-width: 760px)").matches;

    if (isMobile) {
        clientApp.classList.toggle("sidebar-mobile-open");

        return;
    }

    clientApp.classList.toggle("sidebar-collapsed");

    const collapsed = clientApp.classList.contains("sidebar-collapsed");

    sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
}

/* PROFILE BUTTON */

function initializeProfileButton() {
    if (!clientProfileButton) {
        return;
    }

    clientProfileButton.addEventListener("click", () => {
        window.location.href = "Profile.html";
    });
}

/* LUCIDE ICONS */

function initializeIcons() {
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons();
    }
}
