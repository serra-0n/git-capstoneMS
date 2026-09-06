/* RESORTHUB - BILLING & PAYMENTS File: billingPayments.js Frontend prototype / database-ready structure */

/* SAMPLE BILLING & PAYMENT DATA NOTE: These are temporary sample records. Later, this data will come from the database/API. */

const API_ENDPOINTS = {
    payments: "/api/resort-admin/payments",
    paymentProof(paymentId) {
        return `/api/resort-admin/payments/${encodeURIComponent(paymentId)}/proof`;
    },
    reviewPayment(paymentId) {
        return `/api/resort-admin/payments/${encodeURIComponent(paymentId)}/review`;
    },
};

const accessToken = sessionStorage.getItem("resorthub_access_token");

let billingTransactions = [];
let selectPaymentId = null;

function formatDatabaseValue(value) {
    return String(value || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getTransactionStatus(payment) {
    const verificationStatus = String(payment.verification_status || "").toLowerCase();

    const paymentStage = String(payment.payment_stage || "").toLowerCase();

    if (verificationStatus === "verified") {
        return ["full", "balance"].includes(paymentStage) ? "Paid" : "Partially Paid";
    }

    if (verificationStatus === "rejected") {
        return "Rejected";
    }

    return "Pending Verification";
}

function normalizePayment(payment) {
    const totalAmount = Number(payment.total_amount) || 0;
    const verifiedAmount = Number(payment.amount_paid) || 0;
    const submittedAmount = Number(payment.amount) || 0;

    return {
        id: Number(payment.id),
        reference: payment.transaction_reference || "—",
        guest: payment.guest_name || payment.client_account_name || "Unknown Guest",
        reservation: payment.reservation_code || "—",
        totalAmount,
        amountPaid: payment.verification_status === "verified" ? verifiedAmount : submittedAmount,
        balance: Math.max(totalAmount - verifiedAmount, 0),
        paymentMethod: formatDatabaseValue(payment.payment_method),
        paymentStage: formatDatabaseValue(payment.payment_stage),
        status: getTransactionStatus(payment),
        transactionDate: payment.created_at,
        proofOfPayment: {
            fileName: payment.original_filename || "—",
            filePath: payment.file_path || "",
            transactionReference: payment.transaction_reference || "—",
            amount: submittedAmount,
            method: formatDatabaseValue(payment.payment_method),
            submittedDate: payment.created_at,
        },
        ocrStatus: payment.ocr_status,
        extractedText: payment.extracted_text,
        extractedData: payment.extracted_data,
        ocrConfidence: payment.ocr_confidence,
        verificationNotes: payment.verification_notes,
    };
}

async function loadPayments() {
    if (!accessToken) {
        window.location.href = "../auth/login.html";
        return;
    }

    const response = await fetch(API_ENDPOINTS.payments, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Unable to load payments.");
    }

    billingTransactions = Array.isArray(data.payments) ? data.payments.map(normalizePayment) : [];
}

/*DOM ELEMENTS*/

const transactionSearch = document.getElementById("transactionSearch");

const paymentStatusFilter = document.getElementById("paymentStatusFilter");

const paymentMethodFilter = document.getElementById("paymentMethodFilter");

const transactionTableBody = document.querySelector(".transaction-table tbody");

const clearFilterButton = document.querySelector(".clear-filter");

const statCards = document.querySelectorAll(".stat-card");

const verifyPaymentButtons = document.querySelectorAll(".verify-payment");

const verifyButton = document.querySelector(".btn-verify");

const rejectButton = document.querySelector(".btn-reject");

const previewButton = document.querySelector(".preview-button");

/* FORMAT CURRENCY */

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/* GET STATUS CLASS */

function getStatusClass(status) {
    switch (status) {
        case "Paid":
            return "paid-badge";

        case "Pending Verification":
            return "pending-badge";

        case "Partially Paid":
            return "partial-badge";

        case "Unpaid":
            return "unpaid-badge";

        default:
            return "";
    }
}

/* GET STATUS ICON */

function getStatusIcon(status) {
    switch (status) {
        case "Paid":
            return "circle-check";

        case "Pending Verification":
            return "clock-3";

        case "Partially Paid":
            return "circle-half";

        case "Unpaid":
            return "circle-x";

        default:
            return "circle";
    }
}

/* RENDER TRANSACTIONS */

function renderTransactions(transactions) {
    if (!transactionTableBody) {
        return;
    }

    transactionTableBody.innerHTML = "";

    /* No Results */

    if (transactions.length === 0) {
        const emptyRow = document.createElement("tr");

        emptyRow.innerHTML = `
      <td colspan="9" class="empty-state">
        <div class="empty-state-content">
          <i data-lucide="receipt-text"></i>
          <strong>No transactions found</strong>
          <span>Try changing your search or filters.</span>
        </div>
      </td>
    `;

        transactionTableBody.appendChild(emptyRow);

        refreshIcons();

        return;
    }

    /* Transaction Rows */

    transactions.forEach((transaction) => {
        const row = document.createElement("tr");

        row.innerHTML = `
      <td>
        <strong>${escapeHTML(transaction.reference)}</strong>
      </td>

      <td>
        ${escapeHTML(transaction.guest)}
      </td>

      <td>
        ${escapeHTML(transaction.reservation)}
      </td>

      <td>
        ${formatCurrency(transaction.totalAmount)}
      </td>

      <td>
        ${formatCurrency(transaction.amountPaid)}
      </td>

      <td>
        ${formatCurrency(transaction.balance)}
      </td>

      <td>
        ${escapeHTML(transaction.paymentMethod)}
      </td>

      <td>
        <span class="status-badge ${getStatusClass(transaction.status)}">
          ${escapeHTML(transaction.status)}
        </span>
      </td>

      <td>

        <button
          class="table-action ${
              transaction.status === "Pending Verification" ? "verify-payment" : ""
          }"
          type="button"
          title="${
              transaction.status === "Pending Verification" ? "Verify payment" : "View transaction"
          }"
          data-transaction-id="${transaction.id}">

          <i data-lucide="${
              transaction.status === "Pending Verification" ? "scan-search" : "eye"
          }"></i>

        </button>

      </td>
    `;

        transactionTableBody.appendChild(row);
    });

    refreshIcons();

    /*
     * Reconnect action buttons after
     * dynamically rendering the table.
     */

    attachTransactionActions();
}

/* ESCAPE HTML Prevents database/API values from being inserted directly as executable HTML later. */

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* FILTER TRANSACTIONS */

function filterTransactions() {
    const searchValue = transactionSearch ? transactionSearch.value.trim().toLowerCase() : "";

    const selectedStatus = paymentStatusFilter ? paymentStatusFilter.value : "All Status";

    const selectedMethod = paymentMethodFilter ? paymentMethodFilter.value : "All Methods";

    const filtered = billingTransactions.filter((transaction) => {
        /* Search */

        const matchesSearch =
            searchValue === "" ||
            transaction.reference.toLowerCase().includes(searchValue) ||
            transaction.guest.toLowerCase().includes(searchValue) ||
            transaction.reservation.toLowerCase().includes(searchValue);

        /* Status */

        const matchesStatus =
            selectedStatus === "All Status" || transaction.status === selectedStatus;

        /* Payment Method */

        const matchesMethod =
            selectedMethod === "All Methods" || transaction.paymentMethod === selectedMethod;

        return matchesSearch && matchesStatus && matchesMethod;
    });

    renderTransactions(filtered);
}

/* UPDATE SUMMARY CARDS */

function updateSummary() {
    const totalTransactions = billingTransactions.length;

    const paidTransactions = billingTransactions.filter(
        (transaction) => transaction.status === "Paid",
    ).length;

    const pendingTransactions = billingTransactions.filter(
        (transaction) => transaction.status === "Pending Verification",
    ).length;

    const outstandingBalance = billingTransactions.reduce(
        (total, transaction) => total + transaction.balance,
        0,
    );

    /*
     * The four summary cards are in this order:
     *
     * 1. Total Transactions
     * 2. Paid
     * 3. Pending Verification
     * 4. Outstanding Balance
     */

    if (statCards.length >= 4) {
        statCards[0].querySelector("strong").textContent = totalTransactions;

        statCards[1].querySelector("strong").textContent = paidTransactions;

        statCards[2].querySelector("strong").textContent = pendingTransactions;

        statCards[3].querySelector("strong").textContent = formatCurrency(outstandingBalance);

        /*
         * Since these values are now calculated,
         * replace "Sample data" with a simple
         * data indicator.
         */

        statCards.forEach((card) => {
            const small = card.querySelector("small");

            if (small) {
                small.textContent = "Current records";
            }
        });
    }
}

/* CLEAR FILTERS */

function clearFilters() {
    if (transactionSearch) {
        transactionSearch.value = "";
    }

    if (paymentStatusFilter) {
        paymentStatusFilter.value = "All Status";
    }

    if (paymentMethodFilter) {
        paymentMethodFilter.value = "All Methods";
    }

    filterTransactions();
}

/* VIEW TRANSACTION */

function viewTransaction(transactionId) {
    const transaction = billingTransactions.find((item) => item.id === transactionId);

    if (!transaction) {
        return;
    }

    loadVerificationData(transaction);

    const verificationCard = document.querySelector(".verification-card");

    if (verificationCard) {
        verificationCard.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }
}

/* LOAD VERIFICATION DATA */

function loadVerificationData(transaction) {
    if (!transaction) {
        return;
    }

    selectPaymentId = transaction.id;

    if (!transaction.proofOfPayment) {
        console.log("No proof of payment submitted.");

        return;
    }

    const proof = transaction.proofOfPayment;

    const verificationStatus = document.querySelector(".verification-status");

    const pendingVerification = transaction.status === "Pending Verification";

    const verificationActions = document.querySelector(".ocr-actions");

    if (verificationStatus) {
        verificationStatus.textContent = transaction.status;
    }

    if (verificationActions) {
        verificationActions.hidden = !pendingVerification;

        verificationActions.style.display = pendingVerification ? "" : "none";
    }

    if (verifyButton) {
        verifyButton.disabled = !pendingVerification;
    }

    if (rejectButton) {
        rejectButton.disabled = !pendingVerification;
    }

    /*
     * Verification widget elements
     */

    const documentName = document.querySelector(".document-placeholder small");

    const verificationFields = document.querySelectorAll(".ocr-results .ocr-field strong");

    const referenceField = verificationFields[0];
    const amountField = verificationFields[1];
    const methodField = verificationFields[2];
    const dateField = verificationFields[3];

    if (documentName) {
        documentName.textContent = proof.fileName;
    }

    if (referenceField) {
        referenceField.textContent = proof.transactionReference;
    }

    if (amountField) {
        amountField.textContent = formatCurrency(proof.amount);
    }

    if (methodField) {
        methodField.textContent = proof.method;
    }

    if (dateField) {
        dateField.textContent = new Date(proof.submittedDate).toLocaleString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    }
}

/* OPEN VERIFICATION */

function openVerification(transactionId) {
    const transaction = billingTransactions.find((item) => item.id === transactionId);

    if (!transaction) {
        return;
    }

    if (transaction.status !== "Pending Verification") {
        console.log("This transaction does not require verification.");

        return;
    }

    loadVerificationData(transaction);

    /*
     * Scroll to verification widget.
     */

    const verificationCard = document.querySelector(".verification-card");

    if (verificationCard) {
        verificationCard.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }
}

/* ATTACH TRANSACTION ACTIONS */

function attachTransactionActions() {
    const actionButtons = document.querySelectorAll(".transaction-table .table-action");

    actionButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const transactionId = Number(this.dataset.transactionId);

            const transaction = billingTransactions.find((item) => item.id === transactionId);

            if (!transaction) {
                return;
            }

            if (transaction.status === "Pending Verification") {
                openVerification(transactionId);
            } else {
                viewTransaction(transactionId);
            }
        });
    });
}

async function reviewPayment(decision, notes = "") {
    const transaction = billingTransactions.find((item) => item.id === selectPaymentId);

    if (!transaction) {
        alert("Select a payment to review.");
        return;
    }

    if (transaction.status !== "Pending Verification") {
        alert("This payment has already been reviewed.");
        return;
    }

    const actionName = decision === "verified" ? "verify" : "reject";

    const confirmed = window.confirm(
        `Are you sure you want to ${actionName} payment ${transaction.reference}?`,
    );

    if (!confirmed) {
        return;
    }

    if (verifyButton) {
        verifyButton.disabled = true;
    }

    if (rejectButton) {
        rejectButton.disabled = true;
    }

    try {
        const response = await fetch(API_ENDPOINTS.reviewPayment(transaction.id), {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                decision,
                notes,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to review payment.");
        }

        alert(data.message);
        window.location.reload();
    } catch (error) {
        alert(error.message);

        if (verifyButton) {
            verifyButton.disabled = false;
        }

        if (rejectButton) {
            rejectButton.disabled = false;
        }
    }
}

/*VERIFY PAYMENT*/

async function verifyPayment() {
    await reviewPayment("verified");
}

/*REJECT PAYMENT*/

async function rejectPayment() {
    const notes = window.prompt("Enter the reason for rejecting this payment proof:");

    if (notes === null) {
        return;
    }

    if (!notes.trim()) {
        alert("A rejection reason is required.");
        return;
    }

    await reviewPayment("rejected", notes.trim());
}

/* VIEW DOCUMENT */

async function viewDocument() {
    const transaction = billingTransactions.find((item) => item.id === selectPaymentId);

    if (!transaction) {
        alert("Select a payment first.");
        return;
    }

    const previewWindow = window.open("", "_blank");

    try {
        const response = await fetch(API_ENDPOINTS.paymentProof(transaction.id), {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Unable to load the payment proof.");
        }

        const proofBlob = await response.blob();
        const proofUrl = URL.createObjectURL(proofBlob);

        if (previewWindow) {
            previewWindow.location.href = proofUrl;
        } else {
            URL.revokeObjectURL(proofUrl);
            alert("Allow pop-ups to view the payment proof.");
        }
    } catch (error) {
        if (previewWindow) {
            previewWindow.close();
        }

        alert(error.message);
    }
}

/* REFRESH LUCIDE ICONS */

function refreshIcons() {
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons();
    }
}

/* EVENT LISTENERS */

/* Search */

if (transactionSearch) {
    transactionSearch.addEventListener("input", filterTransactions);
}

/* Status Filter */

if (paymentStatusFilter) {
    paymentStatusFilter.addEventListener("change", filterTransactions);
}

/* Payment Method Filter */

if (paymentMethodFilter) {
    paymentMethodFilter.addEventListener("change", filterTransactions);
}

/* Clear Filters */

if (clearFilterButton) {
    clearFilterButton.addEventListener("click", clearFilters);
}

/* Verify Payment */

if (verifyButton) {
    verifyButton.addEventListener("click", verifyPayment);
}

/* Reject Payment */

if (rejectButton) {
    rejectButton.addEventListener("click", rejectPayment);
}

/* View Document */

if (previewButton) {
    previewButton.addEventListener("click", viewDocument);
}

/* INITIALIZE PAGE */

document.addEventListener("DOMContentLoaded", async function () {
    try {
        await loadPayments();
    } catch (error) {
        console.error("Unable to load payments:", error);
        billingTransactions = [];
    }
    /*Calculate the summary cards from the sample records.*/
    updateSummary();

    /*Render transaction records.*/
    renderTransactions(billingTransactions);

    /*Load the sample pending payment into the verification widget.*/
    const pendingTransaction = billingTransactions.find(
        (transaction) => transaction.status === "Pending Verification",
    );

    const initialTransaction = pendingTransaction || billingTransactions[0];

    if (initialTransaction) {
        loadVerificationData(initialTransaction);
    }

    /*
     * Initialize Lucide icons.
     */

    refreshIcons();
});
