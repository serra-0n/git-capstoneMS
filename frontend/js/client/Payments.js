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

const gcashState = {
    ready: false,
    enabled: false,
    active: null,
    pollVersion: 0,

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
    if (!accessToken){
        return;
    }

    initializeIcons();
    initializeSidebar();
    initializeProfileButton();
    initializePaymentForm();
    initializePaymentOptions();
    initializeFileInput();

    if (paymentForm && paymentFormMessage){
        paymentForm.insertAdjacentElement(
            "beforebegin",
            paymentFormMessage
        );
    }

    await loadPaymentDataFromDatabase();

    if (!paymentState.selectedBilling){
        return;
    }

    try {
        await loadGcashOverview();

        const parameters = new URLSearchParams(window.location.search);

        const attemptId =
            gcashState.active?.id ||
            parameters.get("attempt");

        if (attemptId){
            void monitorGcashAttempt(attemptId);
        }
    }catch(error)   {
        showPaymentMessage(
            `${error.message} refresh the page before making a payment.`,
            "error"
        );
    }

    updatePaymentFormState(paymentState.selectedBilling);
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
    const gcashSelected = paymentMethod?.value === "gcash";

    if (gcashPaymentDetails) {
        gcashPaymentDetails.hidden = !gcashSelected;
    }

    for (const field of [transactionReference, proofOfPayment]){
        if (!field){
            continue;
        }

        const group = field.closest(".form_group");

        if (group){
            group.hidden = gcashSelected;
        }
    }

    const notice = paymentForm?.querySelector(
        ".payment-verification-notice p"
    );

    if (notice) {
        notice.textContent = gcashSelected
        ? "Your payment will be verified automatically. Returning from checkout does not by itself confirm payment."
        : "Submitted payment information and proof of payment will be reviewed by authorized resort personnel."
    }

    updatePaymentFormState(paymentState.selectedBilling);

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

    if (!paymentState.selectedBilling){
        showPaymentMessage(
            "Billing information is unavailable.",
            "error"
        );
        return;
    }

    const validationMessage = validatePaymentForm();

    if (validationMessage) {
        showPaymentMessage(validationMessage, "error");
        return;
    }
    if (paymentMethod.value === "gcash") {
        await startGcashCheckout();
        return;
    }

    await submitPaymentToApi(createPaymentFormData());
}
/*VALIDATION*/

function validatePaymentForm() {
    if (!gcashState.ready) {
        return "Payment information is unavailable. Refresh the page first.";
    }

    if (!paymentMethod?.value){
        return "Please select a payment method.";
    }

    if (gcashState.active){
        if (paymentMethod.value !== "gcash"){
            return "An online payment is already in progress.";
        }
        if (gcashState.active.status !== "pending"){
            return "Your existing payment is still being checked";
        }
    }

    if (paymentMethod.value === "gcash"){
        if(!gcashState.enabled) {
            return "Online Gcash payments are unavailable for this resort.";
        }

        return "";
    }
    if (!transactionReference?.value.trim()) {
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

    let submitted = false;

    try {
        const response = await fetch(API_ENDPOINTS.submitPayment, {
            method: "POST",
            credentials: "include",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to submit payment information."
            );
        }
        submitted = true;

        resetPaymentSubmissionFields();

        await refreshCurrentPayment();

        renderGcashPaymentDetails();

        showPaymentMessage(
            data.message || "Payment submitted for manual verification.",
            "success"
        );
    }catch (error) {
        if (submitted) {
            gcashState.ready = false;
        }

        showPaymentMessage(
            submitted
                ? "Payment was submitted, but the update information could not be loaded. Refresh the page before submitting again."
                : error.message,
            "error"
        );
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
        .toLowerCase();

    const reservationStatus = String(billing?.reservation_status || "")
        .toLowerCase();

    const deadline = billing?.deposit_due_at ? new Date(billing.deposit_due_at) : null;

    const deadlineOpen = deadline && Number.isFinite(deadline.getTime()) &&
        deadline.getTime() > Date.now();

    const remainingBalance = Math.max(
        Number(billing?.total_amount || 0) - Number(billing?.amount_paid || 0),
        0,
    );


    const fullyPaid = ["paid", "verified"].includes(paymentStatus);

    const initialAllowed =
        reservationStatus === "awaiting_deposit" &&
        paymentStatus === "unpaid" &&
        deadlineOpen;

    const balanceAllowed =
        reservationStatus === "confirmed" &&
        paymentStatus === "partially_paid" &&
        remainingBalance > 0;

    const active = gcashState.active;

    if(active && paymentMethod) {
        paymentMethod.value = "gcash"
    }

    const gcashSelected = paymentMethod?.value === "gcash";

    const resumeAllowed =
        active?.status ==="pending" &&
        ((
            reservationStatus === "awaiting_deposit" &&
            deadlineOpen
        )||
        reservationStatus === "confirmed"
    );

    const allowed =
        Boolean(billing) &&
        gcashState.ready &&
        !fullyPaid &&
        (
            active
                ? resumeAllowed
                :initialAllowed || balanceAllowed
        ) &&
        (!gcashSelected || gcashState.enabled);

    const enabled = allowed && !paymentState.submitting;

    if (paymentForm) {
        paymentForm.hidden = fullyPaid;
    }

    if (paymentCompleteMessage) {
        paymentCompleteMessage.hidden = !fullyPaid;
    }

    setText(
        paymentSubmissionTitle,
        fullyPaid ? "payment complete" : "Reservation Payment"
    );

    setText(
        paymentSubmissionDescription,
        fullyPaid
        ? "Your reservation has been fully paid"
        :gcashSelected
        ? "Continue to checkout to pay with Gcash."
        : "submit your payment details for manual verification"
    );

    paymentOptionInputs.forEach((input) => {
        input.disabled = !enabled || Boolean(active);

    });

    if (paymentMethod) {
        paymentMethod.disabled = !enabled || Boolean(active);
    }

    for (const field of [transactionReference, proofOfPayment]) {
        if (!field){
            continue;
        }

        field.required = !gcashSelected;
        field.disabled = !enabled || gcashSelected;

        const group = field.closest(".form-group");

        if (group){
            group.hidden = gcashSelected;
        }
    }

    if (gcashPaymentDetails) {
        gcashPaymentDetails.hidden = !gcashSelected;
    }

    if (payLaterButton) {
        payLaterButton.hidden = true;
    }

    if (!submitPaymentButton){
        return;
    }

    submitPaymentButton.disabled = !enabled;

    const buttonText = submitPaymentButton.querySelector("span");

    if (!buttonText) {
        return;
    }

    if (paymentState.submitting) {
        buttonText.textContent = "processing...";
    }else if (fullyPaid) {
        buttonText.textContent = "Payment Complete";
    }else if (!gcashState.ready) {
        buttonText.textContent = "Payment Information Unavailable";
    }else if (active?.status === "needs_review") {
        buttonText.textContent = "Payment Under Review";
    }else if (active?.status === "creating") {
        buttonText.textContent = "Checking Checkout";
    }else if (active && resumeAllowed && gcashState.enabled) {
        buttonText.textContent = "Continue Gcash Checkout";
    }else if (!allowed) {
        buttonText.textContent =
            paymentStatus === "pending"
                ? "Payment Pending"
                : "Payment Not Available";
    } else {
        buttonText.textContent = gcashSelected
            ? "Continue to Gcash"
            : "Submit Manual Payment";
    }
}

/* SUBMITTING STATE */

function setSubmittingState(submitting) {
    paymentState.submitting = submitting;
    updatePaymentFormState(paymentState.selectedBilling);
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

async function gcashApi(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(`/api/paymongo${path}`, {
            ...options,
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
                ...(options.body
                    ?{ "Content-Type": "application/json"}
                    :{}),
            },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.message ||
                `Payment request failed (${response.status}).`
            );
        }
        if (!data){
            throw new Error("The server returned an invalid payment response");
        }

        return data;
    }catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "The payment request timed out. Its result must be checked before trying again."
            );
        }

        throw error;
    }finally {
        clearTimeout(timeout);
    }
}

async function  loadGcashOverview() {
    const data = await gcashApi("/overview");

    if (
        data.role !== "client" ||
        !Array.isArray(data.reservations) ||
        !Array.isArray(data.payments)
    ){
        throw new Error("Unable to load online payments information.");
    }

    const reservationId = String(
        paymentState.selectedBilling?.reservation_id || ""
    );

    const reservation = data.reservations.find(
        (item) => String(item.id) === reservationId
    );

    if (!reservation) {
        throw new Error("The reservation is unavailable for this account.");
    }

    gcashState.enabled = reservation.online_enabled === true;

    gcashState.active = data.payments.find(
        (attempt) =>
            String(attempt.reservation_id) === reservationId &&
            String(attempt.active_reservation_id) === reservationId
    ) || null;

    gcashState.ready = true;

    if (gcashState.active && paymentMethod) {
        paymentMethod.value = "gcash";
    }
}

async function refreshCurrentPayment() {
    const reservationId =
        paymentState.selectedBilling?.reservation_id;

    if (!reservationId) {
        throw new Error("No reservation is selected.");
    }

    await loadBillingByReservationFromApi(reservationId);

    if (!paymentState.selectedBilling) {
        throw new Error("The reservation could not be loaded.");
    }

    await loadGcashOverview();

    renderPaymentPage();
}

function rememberGcashAttempt(attemptId) {
    const url = new URL(window.location.href);

    url.searchParams.set(
        "reservation",
        String(paymentState.selectedBilling.reservation_id)
    );

    url.searchParams.set("attempt", attemptId);
    url.searchParams.delete("returned");

    // Keep the attempt available if the page is refreshed.
    window.history.replaceState(null, "", url);
}

async function startGcashCheckout() {
    // Stop an older status loop while starting or resuming checkout.
    gcashState.pollVersion += 1;

    setSubmittingState(true);

    let monitorId = null;
    let redirecting = false;

    try {
        const reservationId =
            paymentState.selectedBilling.reservation_id;

        const stage =
            gcashState.active?.payment_stage ||
            paymentState.selectedPaymentOption;

        const data = await gcashApi(
            `/reservations/${encodeURIComponent(reservationId)}/checkout`,
            {
                method: "POST",
                body: JSON.stringify({
                    payment_option: stage,
                }),
            }
        );

        if (
            typeof data.attempt_id !== "string" ||
            !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(
                data.attempt_id
            )
        ) {
            throw new Error("The server returned an invalid payment attempt.");
        }

        rememberGcashAttempt(data.attempt_id);

        monitorId = data.attempt_id;

        gcashState.active = {
            id: data.attempt_id,
            reservation_id: reservationId,
            payment_stage: stage,
            status: data.status,
        };

        if (data.status === "pending" && data.checkout_url) {
            const checkoutUrl = new URL(data.checkout_url);

            if (
                checkoutUrl.protocol !== "https:" ||
                checkoutUrl.hostname !== "checkout.paymongo.com" ||
                checkoutUrl.username ||
                checkoutUrl.password ||
                checkoutUrl.port
            ) {
                throw new Error("The server returned an invalid checkout URL.");
            }

            window.location.assign(checkoutUrl.href);
            redirecting = true;
            return;
        }

        showPaymentMessage(
            data.message || "Checking your payment status...",
            "info"
        );
    } catch (error) {
        // A failed network response does not prove checkout creation failed.
        // Reload before allowing another payment submission.
        gcashState.ready = false;

        showPaymentMessage(
            `${error.message} Refresh this page to check for an existing payment before trying again.`,
            "error"
        );
    } finally {
        if (!redirecting) {
            setSubmittingState(false);
        }
    }

    if (monitorId && gcashState.ready) {
        void monitorGcashAttempt(monitorId);
    }
}

async function monitorGcashAttempt(attemptId) {
    const version = ++gcashState.pollVersion;

    if (
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(
            String(attemptId)
        )
    ) {
        showPaymentMessage("The payment attempt ID is invalid.", "error");
        return;
    }

    const reservationId = String(
        paymentState.selectedBilling?.reservation_id || ""
    );

    const returnedFromCancel =
        new URLSearchParams(window.location.search)
            .get("returned") === "cancel";

    // Bounded polling: stop after 24 checks.
    for (let check = 0; check < 24; check += 1) {
        if (version !== gcashState.pollVersion) {
            return;
        }

        try {
            const data = await gcashApi(
                `/attempts/${encodeURIComponent(attemptId)}`
            );

            if (version !== gcashState.pollVersion) {
                return;
            }

            const attempt = data.attempt;

            if (
                !attempt ||
                String(attempt.id) !== String(attemptId) ||
                String(attempt.reservation_id) !== reservationId
            ) {
                throw new Error(
                    "This payment attempt does not match the selected reservation."
                );
            }

            const terminal = [
                "paid",
                "failed",
                "expired",
                "needs_review",
            ].includes(attempt.status);

            if (terminal) {
                // Refresh totals and availability from the backend.
                await refreshCurrentPayment();

                if (version !== gcashState.pollVersion) {
                    return;
                }

                const messages = {
                    paid: [
                        "Payment verified. Your reservation payment information has been updated.",
                        "success",
                    ],
                    failed: [
                        "This payment attempt failed. Check the updated reservation before trying again.",
                        "error",
                    ],
                    expired: [
                        "This checkout expired. You can try again if the reservation still allows payment.",
                        "info",
                    ],
                    needs_review: [
                        "This payment needs review. Contact the resort and do not send another payment for this attempt.",
                        "info",
                    ],
                };

                const [message, type] = messages[attempt.status];

                showPaymentMessage(message, type);
                return;
            }

            if (!["creating", "pending"].includes(attempt.status)) {
                throw new Error("The server returned an unknown payment status.");
            }

            gcashState.active = {
                ...gcashState.active,
                ...attempt,
            };

            if (paymentMethod) {
                paymentMethod.value = "gcash";
            }

            renderGcashPaymentDetails();

            showPaymentMessage(
                returnedFromCancel
                    ? "You returned from checkout. Payment is not confirmed yet. You can resume an available checkout below."
                    : "Waiting for payment verification. Do not submit another payment.",
                "info"
            );
        } catch (error) {
            if (version !== gcashState.pollVersion) {
                return;
            }

            gcashState.ready = false;

            updatePaymentFormState(paymentState.selectedBilling);

            showPaymentMessage(
                `${error.message} Refresh the page to check the payment again.`,
                "error"
            );

            return;
        }

        if (check < 23) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }

    if (version === gcashState.pollVersion) {
        showPaymentMessage(
            "Payment is still awaiting confirmation. Refresh this page later to check again. Do not make a second payment if you already completed checkout.",
            "info"
        );
    }
}

window.addEventListener("pagehide", () => {
    gcashState.pollVersion += 1;
});
