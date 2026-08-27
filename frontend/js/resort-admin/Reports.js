/* =========================================================
   RESORTHUB - REPORTS
   File: reports.js

   Frontend prototype / database-ready structure

   Supported report areas:
   - Reservation Summary
   - Occupancy Monitoring
   - Payment Records
   - Transaction Summary
   - Document Verification

   NOTE:
   The data below is SAMPLE DATA ONLY.
   It will later be replaced with database/API data.
   ========================================================= */


/* =========================================================
   SAMPLE RESERVATION DATA
   ========================================================= */

const reservationRecords = [

  {
    id: 1,
    reservationId: "RES-0001",
    guest: "Juan Dela Cruz",
    accommodation: "Deluxe Room",
    status: "Confirmed",
    date: "2026-08-20"
  },

  {
    id: 2,
    reservationId: "RES-0002",
    guest: "Maria Santos",
    accommodation: "Family Cottage",
    status: "Confirmed",
    date: "2026-08-20"
  },

  {
    id: 3,
    reservationId: "RES-0003",
    guest: "Pedro Reyes",
    accommodation: "Standard Room",
    status: "Pending",
    date: "2026-08-21"
  },

  {
    id: 4,
    reservationId: "RES-0004",
    guest: "Ana Garcia",
    accommodation: "Beach Cottage",
    status: "Cancelled",
    date: "2026-08-22"
  },

  {
    id: 5,
    reservationId: "RES-0005",
    guest: "Carlos Mendoza",
    accommodation: "Deluxe Room",
    status: "Confirmed",
    date: "2026-08-23"
  },

  {
    id: 6,
    reservationId: "RES-0006",
    guest: "Sofia Cruz",
    accommodation: "Family Cottage",
    status: "Confirmed",
    date: "2026-08-24"
  }

];


/* =========================================================
   SAMPLE ACCOMMODATION DATA
   ========================================================= */

const accommodationRecords = [

  {
    id: 1,
    name: "Deluxe Room 01",
    type: "Room",
    status: "Occupied"
  },

  {
    id: 2,
    name: "Deluxe Room 02",
    type: "Room",
    status: "Available"
  },

  {
    id: 3,
    name: "Standard Room 01",
    type: "Room",
    status: "Reserved"
  },

  {
    id: 4,
    name: "Standard Room 02",
    type: "Room",
    status: "Occupied"
  },

  {
    id: 5,
    name: "Family Cottage 01",
    type: "Cottage",
    status: "Reserved"
  },

  {
    id: 6,
    name: "Family Cottage 02",
    type: "Cottage",
    status: "Occupied"
  },

  {
    id: 7,
    name: "Beach Cottage 01",
    type: "Cottage",
    status: "Available"
  },

  {
    id: 8,
    name: "Beach Cottage 02",
    type: "Cottage",
    status: "Reserved"
  }

];


/* =========================================================
   SAMPLE PAYMENT DATA
   ========================================================= */

const paymentRecords = [

  {
    id: 1,
    transactionId: "TXN-0001",
    reservationId: "RES-0001",
    amount: 8500,
    status: "Paid",
    date: "2026-08-20"
  },

  {
    id: 2,
    transactionId: "TXN-0002",
    reservationId: "RES-0002",
    amount: 6000,
    status: "Paid",
    date: "2026-08-20"
  },

  {
    id: 3,
    transactionId: "TXN-0003",
    reservationId: "RES-0003",
    amount: 6500,
    status: "Pending Verification",
    date: "2026-08-21"
  },

  {
    id: 4,
    transactionId: "TXN-0004",
    reservationId: "RES-0004",
    amount: 5000,
    status: "Outstanding",
    date: "2026-08-22"
  },

  {
    id: 5,
    transactionId: "TXN-0005",
    reservationId: "RES-0005",
    amount: 10000,
    status: "Paid",
    date: "2026-08-23"
  }

];


/* =========================================================
   SAMPLE DOCUMENT VERIFICATION DATA
   ========================================================= */

const verificationRecords = [

  {
    id: 1,
    documentId: "DOC-0001",
    transactionId: "TXN-0001",
    status: "Verified",
    date: "2026-08-20"
  },

  {
    id: 2,
    documentId: "DOC-0002",
    transactionId: "TXN-0002",
    status: "Verified",
    date: "2026-08-20"
  },

  {
    id: 3,
    documentId: "DOC-0003",
    transactionId: "TXN-0003",
    status: "Pending Verification",
    date: "2026-08-21"
  },

  {
    id: 4,
    documentId: "DOC-0004",
    transactionId: "TXN-0004",
    status: "Rejected",
    date: "2026-08-22"
  }

];


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const reportType =
  document.getElementById("reportType");

const startDate =
  document.getElementById("startDate");

const endDate =
  document.getElementById("endDate");

const applyFilterButton =
  document.getElementById("applyFilterButton");

const generateReportButton =
  document.getElementById("generateReportButton");

const printReportButton =
  document.getElementById("printReportButton");

const reportSections =
  document.querySelectorAll(".report-section");

const statCards =
  document.querySelectorAll(".stat-card");

const exportButtons =
  document.querySelectorAll(".report-action");


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
   FORMAT NUMBER
   ========================================================= */

function formatNumber(number) {

  return new Intl.NumberFormat("en-PH")
    .format(number);

}


/* =========================================================
   DATE FILTER
   ========================================================= */

function isDateInRange(dateValue, start, end) {

  const recordDate =
    new Date(dateValue + "T00:00:00");


  if (start) {

    const startDateValue =
      new Date(start + "T00:00:00");

    if (recordDate < startDateValue) {
      return false;
    }

  }


  if (end) {

    const endDateValue =
      new Date(end + "T23:59:59");

    if (recordDate > endDateValue) {
      return false;
    }

  }


  return true;

}


/* =========================================================
   GET FILTERED RESERVATIONS
   ========================================================= */

function getFilteredReservations() {

  const start =
    startDate
      ? startDate.value
      : "";

  const end =
    endDate
      ? endDate.value
      : "";


  return reservationRecords.filter(
    reservation =>
      isDateInRange(
        reservation.date,
        start,
        end
      )
  );

}


/* =========================================================
   GET FILTERED PAYMENTS
   ========================================================= */

function getFilteredPayments() {

  const start =
    startDate
      ? startDate.value
      : "";

  const end =
    endDate
      ? endDate.value
      : "";


  return paymentRecords.filter(
    payment =>
      isDateInRange(
        payment.date,
        start,
        end
      )
  );

}


/* =========================================================
   GET FILTERED VERIFICATION RECORDS
   ========================================================= */

function getFilteredVerificationRecords() {

  const start =
    startDate
      ? startDate.value
      : "";

  const end =
    endDate
      ? endDate.value
      : "";


  return verificationRecords.filter(
    record =>
      isDateInRange(
        record.date,
        start,
        end
      )
  );

}


/* =========================================================
   CALCULATE RESERVATION REPORT
   ========================================================= */

function calculateReservationReport() {

  const records =
    getFilteredReservations();


  const total =
    records.length;


  const confirmed =
    records.filter(
      record =>
        record.status === "Confirmed"
    ).length;


  const pending =
    records.filter(
      record =>
        record.status === "Pending"
    ).length;


  const cancelled =
    records.filter(
      record =>
        record.status === "Cancelled"
    ).length;


  return {

    total,

    confirmed,

    pending,

    cancelled

  };

}


/* =========================================================
   CALCULATE OCCUPANCY REPORT
   ========================================================= */

function calculateOccupancyReport() {

  const total =
    accommodationRecords.length;


  const available =
    accommodationRecords.filter(
      accommodation =>
        accommodation.status ===
        "Available"
    ).length;


  const reserved =
    accommodationRecords.filter(
      accommodation =>
        accommodation.status ===
        "Reserved"
    ).length;


  const occupied =
    accommodationRecords.filter(
      accommodation =>
        accommodation.status ===
        "Occupied"
    ).length;


  const occupiedAndReserved =
    occupied + reserved;


  const occupancyPercentage =
    total > 0
      ? Math.round(
          (occupiedAndReserved / total) *
          100
        )
      : 0;


  return {

    total,

    available,

    reserved,

    occupied,

    occupancyPercentage

  };

}


/* =========================================================
   CALCULATE PAYMENT REPORT
   ========================================================= */

function calculatePaymentReport() {

  const records =
    getFilteredPayments();


  const total =
    records.reduce(
      (sum, payment) =>
        sum + payment.amount,
      0
    );


  const paid =
    records
      .filter(
        payment =>
          payment.status === "Paid"
      )
      .reduce(
        (sum, payment) =>
          sum + payment.amount,
        0
      );


  const pending =
    records
      .filter(
        payment =>
          payment.status ===
          "Pending Verification"
      )
      .reduce(
        (sum, payment) =>
          sum + payment.amount,
        0
      );


  const outstanding =
    records
      .filter(
        payment =>
          payment.status ===
          "Outstanding"
      )
      .reduce(
        (sum, payment) =>
          sum + payment.amount,
        0
      );


  return {

    total,

    paid,

    pending,

    outstanding

  };

}


/* =========================================================
   CALCULATE TRANSACTION REPORT
   ========================================================= */

function calculateTransactionReport() {

  const records =
    getFilteredPayments();


  const total =
    records.length;


  const completed =
    records.filter(
      payment =>
        payment.status === "Paid"
    ).length;


  const pending =
    records.filter(
      payment =>
        payment.status ===
        "Pending Verification"
    ).length;


  const unpaid =
    records.filter(
      payment =>
        payment.status ===
        "Outstanding"
    ).length;


  return {

    total,

    completed,

    pending,

    unpaid

  };

}


/* =========================================================
   CALCULATE DOCUMENT VERIFICATION REPORT
   ========================================================= */

function calculateVerificationReport() {

  const records =
    getFilteredVerificationRecords();


  const submitted =
    records.length;


  const verified =
    records.filter(
      record =>
        record.status === "Verified"
    ).length;


  const pending =
    records.filter(
      record =>
        record.status ===
        "Pending Verification"
    ).length;


  const rejected =
    records.filter(
      record =>
        record.status === "Rejected"
    ).length;


  return {

    submitted,

    verified,

    pending,

    rejected

  };

}


/* =========================================================
   UPDATE SUMMARY CARDS
   ========================================================= */

function updateSummaryCards() {

  const reservationReport =
    calculateReservationReport();


  const occupancyReport =
    calculateOccupancyReport();


  const paymentReport =
    calculatePaymentReport();


  const transactionReport =
    calculateTransactionReport();


  /*
   * Reservation
   */

  const reservationTotal =
    document.getElementById(
      "reservationTotal"
    );


  if (reservationTotal) {

    reservationTotal.textContent =
      formatNumber(
        reservationReport.total
      );

  }


  /*
   * Occupancy
   */

  const occupancyTotal =
    document.getElementById(
      "occupancyTotal"
    );


  if (occupancyTotal) {

    occupancyTotal.textContent =
      `${occupancyReport.occupancyPercentage}%`;

  }


  /*
   * Payments
   */

  const paymentTotal =
    document.getElementById(
      "paymentTotal"
    );


  if (paymentTotal) {

    paymentTotal.textContent =
      formatCurrency(
        paymentReport.total
      );

  }


  /*
   * Transactions
   */

  const transactionTotal =
    document.getElementById(
      "transactionTotal"
    );


  if (transactionTotal) {

    transactionTotal.textContent =
      formatNumber(
        transactionReport.total
      );

  }

}


/* =========================================================
   UPDATE RESERVATION REPORT
   ========================================================= */

function updateReservationReport() {

  const report =
    calculateReservationReport();


  const section =
    document.querySelector(
      '[data-report-section="reservation"]'
    );


  if (!section) {
    return;
  }


  const items =
    section.querySelectorAll(
      ".report-item strong"
    );


  if (items.length >= 4) {

    items[0].textContent =
      formatNumber(report.total);

    items[1].textContent =
      formatNumber(report.confirmed);

    items[2].textContent =
      formatNumber(report.pending);

    items[3].textContent =
      formatNumber(report.cancelled);

  }

}


/* =========================================================
   UPDATE OCCUPANCY REPORT
   ========================================================= */

function updateOccupancyReport() {

  const report =
    calculateOccupancyReport();


  const section =
    document.querySelector(
      '[data-report-section="occupancy"]'
    );


  if (!section) {
    return;
  }


  const items =
    section.querySelectorAll(
      ".report-item strong"
    );


  if (items.length >= 4) {

    items[0].textContent =
      formatNumber(report.total);

    items[1].textContent =
      formatNumber(report.available);

    items[2].textContent =
      formatNumber(report.reserved);

    items[3].textContent =
      formatNumber(report.occupied);

  }

}


/* =========================================================
   UPDATE PAYMENT REPORT
   ========================================================= */

function updatePaymentReport() {

  const report =
    calculatePaymentReport();


  const section =
    document.querySelector(
      '[data-report-section="payment"]'
    );


  if (!section) {
    return;
  }


  const items =
    section.querySelectorAll(
      ".report-item strong"
    );


  if (items.length >= 4) {

    items[0].textContent =
      formatCurrency(report.total);

    items[1].textContent =
      formatCurrency(report.paid);

    items[2].textContent =
      formatCurrency(report.pending);

    items[3].textContent =
      formatCurrency(report.outstanding);

  }

}


/* =========================================================
   UPDATE TRANSACTION REPORT
   ========================================================= */

function updateTransactionReport() {

  const report =
    calculateTransactionReport();


  const section =
    document.querySelector(
      '[data-report-section="transaction"]'
    );


  if (!section) {
    return;
  }


  const items =
    section.querySelectorAll(
      ".report-item strong"
    );


  if (items.length >= 4) {

    items[0].textContent =
      formatNumber(report.total);

    items[1].textContent =
      formatNumber(report.completed);

    items[2].textContent =
      formatNumber(report.pending);

    items[3].textContent =
      formatNumber(report.unpaid);

  }

}


/* =========================================================
   UPDATE VERIFICATION REPORT
   ========================================================= */

function updateVerificationReport() {

  const report =
    calculateVerificationReport();


  const section =
    document.querySelector(
      '[data-report-section="verification"]'
    );


  if (!section) {
    return;
  }


  const items =
    section.querySelectorAll(
      ".report-item strong"
    );


  if (items.length >= 4) {

    items[0].textContent =
      formatNumber(report.submitted);

    items[1].textContent =
      formatNumber(report.verified);

    items[2].textContent =
      formatNumber(report.pending);

    items[3].textContent =
      formatNumber(report.rejected);

  }

}


/* =========================================================
   UPDATE ALL REPORTS
   ========================================================= */

function updateAllReports() {

  updateSummaryCards();

  updateReservationReport();

  updateOccupancyReport();

  updatePaymentReport();

  updateTransactionReport();

  updateVerificationReport();

}


/* =========================================================
   SHOW SELECTED REPORT
   ========================================================= */

function showSelectedReport() {

  const selectedType =
    reportType
      ? reportType.value
      : "all";


  /*
   * Summary cards
   *
   * Always remain visible because they provide
   * the quick report overview.
   */

  statCards.forEach(card => {

    card.style.display = "";

  });


  /*
   * Show or hide individual report sections.
   */

  reportSections.forEach(section => {

    const sectionType =
      section.dataset.reportSection;


    if (
      selectedType === "all" ||
      selectedType === sectionType
    ) {

      section.style.display = "";

    } else {

      section.style.display = "none";

    }

  });

}


/* =========================================================
   VALIDATE DATE RANGE
   ========================================================= */

function validateDateRange() {

  const start =
    startDate
      ? startDate.value
      : "";

  const end =
    endDate
      ? endDate.value
      : "";


  if (!start || !end) {

    return true;

  }


  const startValue =
    new Date(start + "T00:00:00");


  const endValue =
    new Date(end + "T00:00:00");


  if (startValue > endValue) {

    alert(
      "The start date cannot be later than the end date."
    );

    return false;

  }


  return true;

}


/* =========================================================
   APPLY FILTER
   ========================================================= */

function applyReportFilter() {

  if (!validateDateRange()) {
    return;
  }


  updateAllReports();

  showSelectedReport();


  /*
   * Scroll to the report content
   * after applying the filter.
   */

  const selectedType =
    reportType
      ? reportType.value
      : "all";


  let targetSection = null;


  if (selectedType !== "all") {

    targetSection =
      document.querySelector(
        `[data-report-section="${selectedType}"]`
      );

  } else {

    targetSection =
      document.querySelector(
        ".report-section"
      );

  }


  if (targetSection) {

    targetSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

}


/* =========================================================
   GENERATE REPORT
   ========================================================= */

function generateReport() {

  if (!validateDateRange()) {
    return;
  }


  updateAllReports();

  showSelectedReport();


  /*
   * Get selected report type.
   */

  const selectedType =
    reportType
      ? reportType.value
      : "all";


  let reportName =
    "All Reports";


  switch (selectedType) {

    case "reservation":
      reportName =
        "Reservation Summary";
      break;

    case "occupancy":
      reportName =
        "Occupancy Monitoring";
      break;

    case "payment":
      reportName =
        "Payment Records";
      break;

    case "transaction":
      reportName =
        "Transaction Summary";
      break;

    case "verification":
      reportName =
        "Document Verification";
      break;

  }


  /*
   * Get date information.
   */

  const start =
    startDate
      ? startDate.value
      : "";

  const end =
    endDate
      ? endDate.value
      : "";


  let periodText =
    "All available dates";


  if (start && end) {

    periodText =
      `${start} to ${end}`;

  } else if (start) {

    periodText =
      `From ${start}`;

  } else if (end) {

    periodText =
      `Until ${end}`;

  }


  console.log(
    "Report generated:",
    {
      report: reportName,
      period: periodText
    }
  );


  /*
   * Simple user feedback.
   */

  alert(
    `${reportName} generated successfully.\n\n` +
    `Period: ${periodText}`
  );

}


/* =========================================================
   PRINT REPORT
   ========================================================= */

function printReport() {

  if (!validateDateRange()) {
    return;
  }


  /*
   * Make sure the current report data
   * is updated before printing.
   */

  updateAllReports();

  showSelectedReport();


  /*
   * Browser print dialog.
   *
   * reports.css already contains @media print
   * rules to hide navigation and controls.
   */

  window.print();

}


/* =========================================================
   EXPORT REPORT
   ========================================================= */

function exportReport(button) {

  if (!button) {
    return;
  }


  const section =
    button.closest(".report-section");


  if (!section) {
    return;
  }


  const title =
    section.querySelector("h2");


  const reportTitle =
    title
      ? title.textContent.trim()
      : "Report";


  /*
   * For the frontend prototype, we generate
   * a simple CSV file from the visible report items.
   *
   * Later this can be replaced with a backend
   * report-generation endpoint.
   */

  const items =
    section.querySelectorAll(
      ".report-item"
    );


  const rows = [

    [
      "Report",
      reportTitle
    ],

    [
      "Generated",
      new Date().toLocaleString("en-PH")
    ],

    [
      "",
      ""
    ],

    [
      "Category",
      "Value"
    ]

  ];


  items.forEach(item => {

    const label =
      item.querySelector("span");

    const value =
      item.querySelector("strong");


    if (label && value) {

      rows.push([

        label.textContent.trim(),

        value.textContent.trim()

      ]);

    }

  });


  /*
   * Convert rows into CSV.
   */

  const csv =
    rows
      .map(row =>
        row
          .map(value =>
            `"${String(value)
              .replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");


  /*
   * Create downloadable CSV file.
   */

  const blob =
    new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;


  link.download =
    `${reportTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}.csv`;


  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);


  URL.revokeObjectURL(url);

}


/* =========================================================
   LUCIDE ICON REFRESH
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


/* Apply Filter */

if (applyFilterButton) {

  applyFilterButton.addEventListener(
    "click",
    applyReportFilter
  );

}


/* Generate Report */

if (generateReportButton) {

  generateReportButton.addEventListener(
    "click",
    generateReport
  );

}


/* Print Report */

if (printReportButton) {

  printReportButton.addEventListener(
    "click",
    printReport
  );

}


/* Report Type */

if (reportType) {

  reportType.addEventListener(
    "change",
    function () {

      /*
       * Update the visible sections immediately
       * when the user changes report type.
       */

      showSelectedReport();

    }
  );

}


/* Export Buttons */

exportButtons.forEach(button => {

  button.addEventListener(
    "click",
    function () {

      exportReport(this);

    }
  );

});


/* =========================================================
   INITIALIZE REPORT PAGE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    /*
     * Calculate and display the
     * initial sample report values.
     */

    updateAllReports();


    /*
     * Show all report sections
     * when the page first loads.
     */

    showSelectedReport();


    /*
     * Initialize all Lucide icons.
     */

    refreshIcons();

  }
);