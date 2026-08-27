/* =========================================================
   RESORTHUB - BILLING & PAYMENTS
   File: billingPayments.js

   Frontend prototype / database-ready structure
   ========================================================= */


/* =========================================================
   SAMPLE BILLING & PAYMENT DATA
   =========================================================
   
   NOTE:
   These are temporary sample records.
   Later, this data will come from the database/API.
   ========================================================= */

const billingTransactions = [
  {
    id: 1,
    reference: "TXN-0001",
    guest: "Juan Dela Cruz",
    reservation: "RES-0012",
    totalAmount: 8500,
    amountPaid: 8500,
    balance: 0,
    paymentMethod: "GCash",
    status: "Paid",
    transactionDate: "2026-08-20",
    proofOfPayment: null
  },

  {
    id: 2,
    reference: "TXN-0002",
    guest: "Maria Santos",
    reservation: "RES-0015",
    totalAmount: 12000,
    amountPaid: 6000,
    balance: 6000,
    paymentMethod: "Maya",
    status: "Partially Paid",
    transactionDate: "2026-08-21",
    proofOfPayment: null
  },

  {
    id: 3,
    reference: "TXN-0003",
    guest: "Pedro Reyes",
    reservation: "RES-0018",
    totalAmount: 6500,
    amountPaid: 6500,
    balance: 0,
    paymentMethod: "Bank Transfer",
    status: "Pending Verification",
    transactionDate: "2026-08-22",

    proofOfPayment: {
      fileName: "Payment_Proof_TXN-0003.jpg",
      transactionReference: "GCR-847291",
      amount: 6500,
      method: "Bank Transfer",
      submittedDate: "August 27, 2026"
    }
  },

  {
    id: 4,
    reference: "TXN-0004",
    guest: "Ana Garcia",
    reservation: "RES-0020",
    totalAmount: 10000,
    amountPaid: 0,
    balance: 10000,
    paymentMethod: "GCash",
    status: "Unpaid",
    transactionDate: "2026-08-23",
    proofOfPayment: null
  }
];


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const transactionSearch =
  document.getElementById("transactionSearch");

const paymentStatusFilter =
  document.getElementById("paymentStatusFilter");

const paymentMethodFilter =
  document.getElementById("paymentMethodFilter");

const transactionTableBody =
  document.querySelector(".transaction-table tbody");

const clearFilterButton =
  document.querySelector(".clear-filter");

const statCards =
  document.querySelectorAll(".stat-card");

const verifyPaymentButtons =
  document.querySelectorAll(".verify-payment");

const verifyButton =
  document.querySelector(".btn-verify");

const rejectButton =
  document.querySelector(".btn-reject");

const previewButton =
  document.querySelector(".preview-button");


/* =========================================================
   FORMAT CURRENCY
   ========================================================= */

function formatCurrency(amount) {

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);

}


/* =========================================================
   GET STATUS CLASS
   ========================================================= */

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


/* =========================================================
   GET STATUS ICON
   ========================================================= */

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


/* =========================================================
   RENDER TRANSACTIONS
   ========================================================= */

function renderTransactions(transactions) {

  if (!transactionTableBody) {
    return;
  }


  transactionTableBody.innerHTML = "";


  /* -----------------------------------------------
     No Results
     ----------------------------------------------- */

  if (transactions.length === 0) {

    const emptyRow =
      document.createElement("tr");

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


  /* -----------------------------------------------
     Transaction Rows
     ----------------------------------------------- */

  transactions.forEach(transaction => {

    const row =
      document.createElement("tr");


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
            transaction.status === "Pending Verification"
              ? "verify-payment"
              : ""
          }"
          type="button"
          title="${
            transaction.status === "Pending Verification"
              ? "Verify payment"
              : "View transaction"
          }"
          data-transaction-id="${transaction.id}">

          <i data-lucide="${
            transaction.status === "Pending Verification"
              ? "scan-search"
              : "eye"
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


/* =========================================================
   ESCAPE HTML
   =========================================================
   
   Prevents database/API values from being inserted
   directly as executable HTML later.
   ========================================================= */

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


/* =========================================================
   FILTER TRANSACTIONS
   ========================================================= */

function filterTransactions() {

  const searchValue =
    transactionSearch
      ? transactionSearch.value
          .trim()
          .toLowerCase()
      : "";


  const selectedStatus =
    paymentStatusFilter
      ? paymentStatusFilter.value
      : "All Status";


  const selectedMethod =
    paymentMethodFilter
      ? paymentMethodFilter.value
      : "All Methods";


  const filtered =
    billingTransactions.filter(transaction => {


      /* ---------------------------------------------
         Search
         --------------------------------------------- */

      const matchesSearch =
        searchValue === "" ||

        transaction.reference
          .toLowerCase()
          .includes(searchValue) ||

        transaction.guest
          .toLowerCase()
          .includes(searchValue) ||

        transaction.reservation
          .toLowerCase()
          .includes(searchValue);


      /* ---------------------------------------------
         Status
         --------------------------------------------- */

      const matchesStatus =
        selectedStatus === "All Status" ||

        transaction.status === selectedStatus;


      /* ---------------------------------------------
         Payment Method
         --------------------------------------------- */

      const matchesMethod =
        selectedMethod === "All Methods" ||

        transaction.paymentMethod === selectedMethod;


      return (
        matchesSearch &&
        matchesStatus &&
        matchesMethod
      );

    });


  renderTransactions(filtered);

}


/* =========================================================
   UPDATE SUMMARY CARDS
   ========================================================= */

function updateSummary() {

  const totalTransactions =
    billingTransactions.length;


  const paidTransactions =
    billingTransactions.filter(
      transaction =>
        transaction.status === "Paid"
    ).length;


  const pendingTransactions =
    billingTransactions.filter(
      transaction =>
        transaction.status === "Pending Verification"
    ).length;


  const outstandingBalance =
    billingTransactions.reduce(
      (total, transaction) =>
        total + transaction.balance,
      0
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

    statCards[0]
      .querySelector("strong")
      .textContent =
      totalTransactions;


    statCards[1]
      .querySelector("strong")
      .textContent =
      paidTransactions;


    statCards[2]
      .querySelector("strong")
      .textContent =
      pendingTransactions;


    statCards[3]
      .querySelector("strong")
      .textContent =
      formatCurrency(outstandingBalance);


    /*
     * Since these values are now calculated,
     * replace "Sample data" with a simple
     * data indicator.
     */

    statCards.forEach(card => {

      const small =
        card.querySelector("small");

      if (small) {
        small.textContent =
          "Current records";
      }

    });

  }

}


/* =========================================================
   CLEAR FILTERS
   ========================================================= */

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


/* =========================================================
   VIEW TRANSACTION
   ========================================================= */

function viewTransaction(transactionId) {

  const transaction =
    billingTransactions.find(
      item =>
        item.id === transactionId
    );


  if (!transaction) {
    return;
  }


  /*
   * Frontend prototype only.
   *
   * Later this can open a transaction
   * detail modal or retrieve the record
   * from the backend.
   */

  console.log(
    "Viewing transaction:",
    transaction
  );

}


/* =========================================================
   LOAD VERIFICATION DATA
   ========================================================= */

function loadVerificationData(transaction) {

  if (!transaction) {
    return;
  }


  if (!transaction.proofOfPayment) {

    console.log(
      "No proof of payment submitted."
    );

    return;
  }


  const proof =
    transaction.proofOfPayment;


  /*
   * Verification widget elements
   */

  const documentName =
    document.querySelector(
      ".document-placeholder small"
    );

  const referenceField =
    document.querySelector(
      ".ocr-field:nth-of-type(1) strong"
    );

  const amountField =
    document.querySelector(
      ".ocr-field:nth-of-type(2) strong"
    );

  const methodField =
    document.querySelector(
      ".ocr-field:nth-of-type(3) strong"
    );

  const dateField =
    document.querySelector(
      ".ocr-field:nth-of-type(4) strong"
    );


  if (documentName) {
    documentName.textContent =
      proof.fileName;
  }


  if (referenceField) {
    referenceField.textContent =
      proof.transactionReference;
  }


  if (amountField) {
    amountField.textContent =
      formatCurrency(proof.amount);
  }


  if (methodField) {
    methodField.textContent =
      proof.method;
  }


  if (dateField) {
    dateField.textContent =
      proof.submittedDate;
  }

}


/* =========================================================
   OPEN VERIFICATION
   ========================================================= */

function openVerification(transactionId) {

  const transaction =
    billingTransactions.find(
      item =>
        item.id === transactionId
    );


  if (!transaction) {
    return;
  }


  if (
    transaction.status !==
    "Pending Verification"
  ) {

    console.log(
      "This transaction does not require verification."
    );

    return;

  }


  loadVerificationData(transaction);


  /*
   * Scroll to verification widget.
   */

  const verificationCard =
    document.querySelector(
      ".verification-card"
    );


  if (verificationCard) {

    verificationCard.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

}


/* =========================================================
   ATTACH TRANSACTION ACTIONS
   ========================================================= */

function attachTransactionActions() {

  const actionButtons =
    document.querySelectorAll(
      ".transaction-table .table-action"
    );


  actionButtons.forEach(button => {

    button.addEventListener(
      "click",
      function () {

        const transactionId =
          Number(
            this.dataset.transactionId
          );


        const transaction =
          billingTransactions.find(
            item =>
              item.id === transactionId
          );


        if (!transaction) {
          return;
        }


        if (
          transaction.status ===
          "Pending Verification"
        ) {

          openVerification(
            transactionId
          );

        } else {

          viewTransaction(
            transactionId
          );

        }

      }
    );

  });

}


/* =========================================================
   VERIFY PAYMENT
   ========================================================= */

function verifyPayment() {

  const transaction =
    billingTransactions.find(
      item =>
        item.status ===
        "Pending Verification"
    );


  if (!transaction) {

    alert(
      "There is no payment pending verification."
    );

    return;

  }


  /*
   * Frontend prototype:
   *
   * Change the local sample status.
   *
   * Later:
   * This will send a request to the backend
   * and update the database.
   */

  transaction.status = "Paid";


  /*
   * Keep the balance at zero because the
   * submitted payment already covers the
   * sample transaction amount.
   */

  transaction.balance =
    Math.max(
      transaction.totalAmount -
      transaction.amountPaid,
      0
    );


  updateSummary();

  filterTransactions();


  /*
   * Update verification status.
   */

  const verificationStatus =
    document.querySelector(
      ".verification-status"
    );


  if (verificationStatus) {

    verificationStatus.textContent =
      "Verified";

    verificationStatus.classList.remove(
      "pending"
    );

    verificationStatus.classList.add(
      "verified"
    );

  }


  alert(
    `Payment ${transaction.reference} has been verified.`
  );

}


/* =========================================================
   REJECT PAYMENT
   ========================================================= */

function rejectPayment() {

  const transaction =
    billingTransactions.find(
      item =>
        item.status ===
        "Pending Verification"
    );


  if (!transaction) {

    alert(
      "There is no payment pending verification."
    );

    return;

  }


  /*
   * Frontend prototype only.
   *
   * We do not permanently delete the record.
   * The transaction remains available for
   * future database implementation.
   */

  transaction.status = "Unpaid";


  /*
   * Since the submitted payment was rejected,
   * the amount is no longer treated as paid.
   */

  transaction.amountPaid = 0;

  transaction.balance =
    transaction.totalAmount;


  updateSummary();

  filterTransactions();


  /*
   * Update verification widget status.
   */

  const verificationStatus =
    document.querySelector(
      ".verification-status"
    );


  if (verificationStatus) {

    verificationStatus.textContent =
      "Rejected";

    verificationStatus.classList.remove(
      "pending"
    );

    verificationStatus.classList.add(
      "rejected"
    );

  }


  alert(
    `Payment ${transaction.reference} has been rejected.`
  );

}


/* =========================================================
   VIEW DOCUMENT
   ========================================================= */

function viewDocument() {

  /*
   * The actual uploaded document will
   * come from the backend/database later.
   *
   * For now, this is only a frontend
   * placeholder.
   */

  console.log(
    "Opening submitted proof of payment..."
  );


  alert(
    "Document preview will display the submitted proof of payment here."
  );

}


/* =========================================================
   REFRESH LUCIDE ICONS
   ========================================================= */

function refreshIcons() {

  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  ) {

    lucide.createIcons();

  }

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */


/* Search */

if (transactionSearch) {

  transactionSearch.addEventListener(
    "input",
    filterTransactions
  );

}


/* Status Filter */

if (paymentStatusFilter) {

  paymentStatusFilter.addEventListener(
    "change",
    filterTransactions
  );

}


/* Payment Method Filter */

if (paymentMethodFilter) {

  paymentMethodFilter.addEventListener(
    "change",
    filterTransactions
  );

}


/* Clear Filters */

if (clearFilterButton) {

  clearFilterButton.addEventListener(
    "click",
    clearFilters
  );

}


/* Verify Payment */

if (verifyButton) {

  verifyButton.addEventListener(
    "click",
    verifyPayment
  );

}


/* Reject Payment */

if (rejectButton) {

  rejectButton.addEventListener(
    "click",
    rejectPayment
  );

}


/* View Document */

if (previewButton) {

  previewButton.addEventListener(
    "click",
    viewDocument
  );

}


/* =========================================================
   INITIALIZE PAGE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    /*
     * Calculate the summary cards
     * from the sample records.
     */

    updateSummary();


    /*
     * Render transaction records.
     */

    renderTransactions(
      billingTransactions
    );


    /*
     * Load the sample pending
     * payment into the verification widget.
     */

    const pendingTransaction =
      billingTransactions.find(
        transaction =>
          transaction.status ===
          "Pending Verification"
      );


    if (pendingTransaction) {

      loadVerificationData(
        pendingTransaction
      );

    }


    /*
     * Initialize Lucide icons.
     */

    refreshIcons();

  }
);