/* RESORTHUB - GUESTS PAGE File: guests.js Frontend prototype / database-ready structure Functions: - Guest search - Status filtering - Clear filters - Guest record count - Summary count updates - View guest record - Refresh guest records - Lucide icon refresh NOTE: The guest records currently displayed in Guests.html are SAMPLE DATA ONLY. These records can later be replaced with database/API data without changing the page structure. */

/* DOM ELEMENTS */

const guestSearch = document.getElementById("guestSearch");

const globalSearch = document.getElementById("globalSearch");

const guestStatusFilter = document.getElementById("guestStatusFilter");

const clearGuestFilter = document.getElementById("clearGuestFilter");

const refreshGuestsButton = document.getElementById("refreshGuestsButton");

const guestTableBody = document.getElementById("guestTableBody");

const emptyGuestState = document.getElementById("emptyGuestState");

const recordCount = document.getElementById("recordCount");

const tableResultText = document.getElementById("tableResultText");

const totalGuests = document.getElementById("totalGuests");

const guestsWithReservations = document.getElementById("guestsWithReservations");

const currentGuests = document.getElementById("currentGuests");

const pendingGuests = document.getElementById("pendingGuests");

/* GUEST TABLE ROWS */

function getGuestRows() {
    if (!guestTableBody) {
        return [];
    }

    return Array.from(guestTableBody.querySelectorAll("tr"));
}

/* GET VISIBLE GUEST ROWS */

function getVisibleGuestRows() {
    return getGuestRows().filter((row) => row.style.display !== "none");
}

/* NORMALIZE TEXT */

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .trim();
}

/* FILTER GUESTS */

function filterGuests() {
    const searchValue = guestSearch ? normalizeText(guestSearch.value) : "";

    const statusValue = guestStatusFilter ? guestStatusFilter.value : "all";

    const rows = getGuestRows();

    let visibleCount = 0;

    rows.forEach((row) => {
        const guestName = normalizeText(row.dataset.guest);

        const reservation = normalizeText(row.dataset.reservation);

        const rowStatus = row.dataset.status || "";

        /*
         * Search condition
         */

        const matchesSearch =
            !searchValue || guestName.includes(searchValue) || reservation.includes(searchValue);

        /*
         * Status condition
         */

        const matchesStatus = statusValue === "all" || rowStatus === statusValue;

        /*
         * Display row
         */

        if (matchesSearch && matchesStatus) {
            row.style.display = "";

            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    updateRecordCount(visibleCount, rows.length);

    updateEmptyState(visibleCount);
}

/* UPDATE RECORD COUNT */

function updateRecordCount(visibleCount, totalCount) {
    if (recordCount) {
        if (visibleCount === totalCount) {
            recordCount.textContent = `${totalCount} records`;
        } else {
            recordCount.textContent = `${visibleCount} of ${totalCount} records`;
        }
    }

    if (tableResultText) {
        if (visibleCount === 0) {
            tableResultText.textContent = "No guest records found";
        } else if (visibleCount === totalCount) {
            tableResultText.textContent = `Showing ${totalCount} guest records`;
        } else {
            tableResultText.textContent = `Showing ${visibleCount} of ${totalCount} guest records`;
        }
    }
}

/* UPDATE EMPTY STATE */

function updateEmptyState(visibleCount) {
    if (!emptyGuestState) {
        return;
    }

    if (visibleCount === 0) {
        emptyGuestState.hidden = false;
    } else {
        emptyGuestState.hidden = true;
    }
}

/* UPDATE SUMMARY COUNTS */

function updateSummaryCounts() {
    const rows = getGuestRows();

    const total = rows.length;

    const withReservations = rows.filter(
        (row) => row.dataset.reservation && row.dataset.reservation.trim() !== "",
    ).length;

    const current = rows.filter((row) => row.dataset.status === "Current").length;

    const pending = rows.filter((row) => row.dataset.status === "Pending").length;

    /*
     * Total guests
     */

    if (totalGuests) {
        totalGuests.textContent = total;
    }

    /*
     * Guests with reservations
     */

    if (guestsWithReservations) {
        guestsWithReservations.textContent = withReservations;
    }

    /*
     * Current guests
     */

    if (currentGuests) {
        currentGuests.textContent = current;
    }

    /*
     * Pending guests
     */

    if (pendingGuests) {
        pendingGuests.textContent = pending;
    }
}

/* CLEAR GUEST FILTERS */

function clearFilters() {
    if (guestSearch) {
        guestSearch.value = "";
    }

    if (guestStatusFilter) {
        guestStatusFilter.value = "all";
    }

    filterGuests();
}

/* SEARCH USING GLOBAL SEARCH */

function handleGlobalSearch() {
    if (!globalSearch || !guestSearch) {
        return;
    }

    guestSearch.value = globalSearch.value;

    filterGuests();
}

/* VIEW GUEST RECORD */

function viewGuestRecord(row) {
    if (!row) {
        return;
    }

    const guestName = row.dataset.guest || "Guest";

    const reservation = row.dataset.reservation || "No reservation";

    const status = row.dataset.status || "Unknown";

    /*
     * Get visible information directly
     * from the table row.
     */

    const guestIdElement = row.querySelector(".guest-cell small");

    const accommodationElement = row.children[3];

    const contactElement = row.querySelector(".contact-cell");

    const guestId = guestIdElement ? guestIdElement.textContent.trim() : "Guest ID unavailable";

    const accommodation = accommodationElement
        ? accommodationElement.textContent.trim()
        : "Not specified";

    let contact = "Not specified";

    if (contactElement) {
        const contactText = contactElement.querySelector("span");

        if (contactText) {
            contact = contactText.textContent.trim();
        }
    }

    /*
     * Frontend prototype display.
     *
     * Later this can be replaced with a
     * guest-details modal or dedicated page.
     */

    alert(
        `Guest Details\n\n` +
            `${guestId}\n` +
            `Guest: ${guestName}\n` +
            `Contact: ${contact}\n` +
            `Reservation: ${reservation}\n` +
            `Accommodation: ${accommodation}\n` +
            `Status: ${status}`,
    );
}

/* ATTACH VIEW BUTTON EVENTS */

function attachViewButtons() {
    const rows = getGuestRows();

    rows.forEach((row) => {
        const button = row.querySelector(".table-action");

        if (!button) {
            return;
        }

        /*
         * Prevent duplicate event listeners
         * if this function is called again.
         */

        if (button.dataset.listenerAttached === "true") {
            return;
        }

        button.addEventListener("click", function () {
            viewGuestRecord(row);
        });

        button.dataset.listenerAttached = "true";
    });
}

/* REFRESH GUEST RECORDS */

function refreshGuestRecords() {
    /*
     * For now, refresh means recalculating
     * the current frontend records.
     *
     * When the backend is connected, this
     * function can request fresh records
     * from the database/API.
     */

    updateSummaryCounts();

    filterGuests();

    attachViewButtons();

    refreshIcons();

    /*
     * Small visual feedback.
     */

    if (refreshGuestsButton) {
        const originalText = refreshGuestsButton.innerHTML;

        refreshGuestsButton.innerHTML = `
        <i data-lucide="check"></i>
        Refreshed
      `;

        refreshIcons();

        setTimeout(function () {
            refreshGuestsButton.innerHTML = originalText;

            refreshIcons();
        }, 1000);
    }
}

/* SIDEBAR TOGGLE */

function initializeSidebarToggle() {
    const sidebarToggle = document.querySelector(".sidebar-toggle");

    const sidebar = document.querySelector(".sidebar");

    if (!sidebarToggle || !sidebar) {
        return;
    }

    sidebarToggle.addEventListener("click", function () {
        sidebar.classList.toggle("sidebar-collapsed");
    });
}

/* LOGOUT */

function initializeLogout() {
    const logoutButton = document.querySelector(".logout");

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", function (event) {
        event.preventDefault();

        /*
         * Frontend prototype only.
         *
         * Actual logout will later be handled
         * by the authentication/backend system.
         */

        const confirmLogout = confirm("Are you sure you want to logout?");

        if (!confirmLogout) {
            return;
        }

        /*
         * Temporary frontend behavior.
         *
         * Replace this with the actual
         * authentication logout process
         * when the backend is connected.
         */

        console.log("Logout requested.");
    });
}

/* LUCIDE ICON REFRESH */

function refreshIcons() {
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons();
    }
}

/* EVENT LISTENERS */

/*
 * Guest Search
 */

if (guestSearch) {
    guestSearch.addEventListener("input", filterGuests);
}

/*
 * Guest Status Filter
 */

if (guestStatusFilter) {
    guestStatusFilter.addEventListener("change", filterGuests);
}

/*
 * Clear Filters
 */

if (clearGuestFilter) {
    clearGuestFilter.addEventListener("click", clearFilters);
}

/*
 * Refresh
 */

if (refreshGuestsButton) {
    refreshGuestsButton.addEventListener("click", refreshGuestRecords);
}

/*
 * Global Search
 */

if (globalSearch) {
    globalSearch.addEventListener("input", handleGlobalSearch);
}

/* INITIALIZE PAGE */

document.addEventListener("DOMContentLoaded", function () {
    /*
     * Calculate summary values.
     */

    updateSummaryCounts();

    /*
     * Apply initial filters.
     */

    filterGuests();

    /*
     * Attach View buttons.
     */

    attachViewButtons();

    /*
     * Initialize sidebar behavior.
     */

    initializeSidebarToggle();

    /*
     * Initialize logout behavior.
     */

    initializeLogout();

    /*
     * Render Lucide icons.
     */

    refreshIcons();
});
