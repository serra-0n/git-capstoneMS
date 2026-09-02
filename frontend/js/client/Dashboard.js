"use strict";


/* =========================================================
   RESORTHUB - CLIENT DASHBOARD
   File: js/client/Dashboard.js

   DEVELOPMENT MODE

   true:
   - Uses dummy data
   - Does not call the API
   - Does not use localStorage
   - Does not write to MySQL

   false:
   - Loads dashboard data from Express
   - Backend/database becomes source of truth
   ========================================================= */

const USE_DUMMY_DATA = true;


/* =========================================================
   API ENDPOINT
   ========================================================= */

const API_ENDPOINTS = {

    dashboard: "/api/client/dashboard"

};


/* =========================================================
   DUMMY DATA
   ========================================================= */

const DUMMY_DASHBOARD_DATA = {

    client: {

        id: 1,

        name: "Juan Dela Cruz"

    },


    summary: {

        active_reservations: 1,

        payment_status:
            "Pending Verification",

        uploaded_documents: 2

    },


    current_reservation: {

        id: 105,

        reservation_reference:
            "RES-0105",

        resort_name:
            "Azure Garden Resort",

        accommodation_name:
            "Family Room",

        check_in:
            "2026-09-15",

        check_out:
            "2026-09-17",

        reservation_status:
            "Pending"

    }

};


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const dashboardState = {

    client: null,


    summary: {

        active_reservations: 0,

        payment_status: "",

        uploaded_documents: 0

    },


    current_reservation: null

};


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const clientApp =
    document.getElementById(
        "clientApp"
    );


const sidebarToggle =
    document.getElementById(
        "sidebarToggle"
    );


const clientProfileButton =
    document.getElementById(
        "clientProfileButton"
    );


const clientDisplayName =
    document.getElementById(
        "clientDisplayName"
    );


const dashboardWelcomeTitle =
    document.getElementById(
        "dashboardWelcomeTitle"
    );


/* Summary */

const activeReservationsCount =
    document.getElementById(
        "activeReservationsCount"
    );


const dashboardPaymentStatus =
    document.getElementById(
        "dashboardPaymentStatus"
    );


const uploadedDocumentsCount =
    document.getElementById(
        "uploadedDocumentsCount"
    );


/* Current reservation */

const currentReservationContent =
    document.getElementById(
        "currentReservationContent"
    );


const currentReservationEmptyState =
    document.getElementById(
        "currentReservationEmptyState"
    );


const currentReservationReference =
    document.getElementById(
        "currentReservationReference"
    );


const currentReservationStatus =
    document.getElementById(
        "currentReservationStatus"
    );


const currentReservationResort =
    document.getElementById(
        "currentReservationResort"
    );


const currentReservationAccommodation =
    document.getElementById(
        "currentReservationAccommodation"
    );


const currentReservationCheckIn =
    document.getElementById(
        "currentReservationCheckIn"
    );


const currentReservationCheckOut =
    document.getElementById(
        "currentReservationCheckOut"
    );


const viewReservationStatusButton =
    document.getElementById(
        "viewReservationStatusButton"
    );


/* =========================================================
   START PAGE

   Dashboard.js is loaded at the bottom of the HTML, after
   Lucide, so the DOM and Lucide library are already ready.
   ========================================================= */

initializeDashboard();


async function initializeDashboard() {

    initializeIcons();

    initializeSidebar();

    initializeProfileButton();


    if (USE_DUMMY_DATA) {

        loadDummyDashboard();

        return;
    }


    await loadDashboardFromApi();
}


/* =========================================================
   DUMMY MODE
   ========================================================= */

function loadDummyDashboard() {

    dashboardState.client = {

        ...DUMMY_DASHBOARD_DATA.client

    };


    dashboardState.summary = {

        ...DUMMY_DASHBOARD_DATA.summary

    };


    dashboardState.current_reservation =
        DUMMY_DASHBOARD_DATA.current_reservation
            ? {
                ...DUMMY_DASHBOARD_DATA
                    .current_reservation
            }
            : null;


    renderDashboard();
}


/* =========================================================
   API MODE
   ========================================================= */

async function loadDashboardFromApi() {

    try {

        const response =
            await fetch(
                API_ENDPOINTS.dashboard,
                {
                    method: "GET",

                    credentials:
                        "include",

                    headers: {

                        "Accept":
                            "application/json"

                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load dashboard information."
            );

        }


        const data =
            await response.json();


        const normalized =
            normalizeDashboardData(
                data
            );


        dashboardState.client =
            normalized.client;


        dashboardState.summary =
            normalized.summary;


        dashboardState.current_reservation =
            normalized.current_reservation;


        renderDashboard();


    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );


        dashboardState.client =
            null;


        dashboardState.summary = {

            active_reservations: 0,

            payment_status: "",

            uploaded_documents: 0

        };


        dashboardState.current_reservation =
            null;


        renderDashboard();
    }
}


/* =========================================================
   NORMALIZE API RESPONSE
   ========================================================= */

function normalizeDashboardData(
    data
) {

    const dashboard =
        data?.dashboard ||
        data?.data ||
        data ||
        {};


    const client =
        dashboard.client
            ? {

                id:
                    dashboard.client.id ??
                    dashboard.client.client_id ??
                    null,

                name:
                    dashboard.client.name ||
                    dashboard.client.full_name ||
                    ""

            }
            : null;


    const sourceSummary =
        dashboard.summary ||
        {};


    const summary = {

        active_reservations:
            toSafeNumber(
                sourceSummary
                    .active_reservations
            ),

        payment_status:
            sourceSummary
                .payment_status ||
            "",

        uploaded_documents:
            toSafeNumber(
                sourceSummary
                    .uploaded_documents
            )

    };


    return {

        client,

        summary,

        current_reservation:
            normalizeReservation(
                dashboard
                    .current_reservation
            )

    };
}


/* =========================================================
   NORMALIZE RESERVATION
   ========================================================= */

function normalizeReservation(
    reservation
) {

    if (
        !reservation ||
        typeof reservation !==
            "object"
    ) {

        return null;
    }


    return {

        id:
            reservation.id ??
            reservation.reservation_id ??
            null,

        reservation_reference:
            reservation
                .reservation_reference ||
            reservation.reference ||
            reservation.reference_number ||
            "",

        resort_name:
            reservation.resort_name ||
            "",

        accommodation_name:
            reservation
                .accommodation_name ||
            "",

        check_in:
            reservation.check_in ||
            reservation.check_in_date ||
            "",

        check_out:
            reservation.check_out ||
            reservation.check_out_date ||
            "",

        reservation_status:
            reservation
                .reservation_status ||
            reservation.status ||
            ""

    };
}


/* =========================================================
   RENDER DASHBOARD
   ========================================================= */

function renderDashboard() {

    renderClient();

    renderSummary();

    renderCurrentReservation();


    /*
     * Re-run Lucide after rendering.
     * This also supports future dynamically inserted icons.
     */

    initializeIcons();
}


/* =========================================================
   CLIENT
   ========================================================= */

function renderClient() {

    const clientName =
        dashboardState.client?.name ||
        "Client";


    setText(
        clientDisplayName,
        clientName
    );


    if (dashboardWelcomeTitle) {

        dashboardWelcomeTitle.textContent =
            `Welcome, ${clientName}`;

    }
}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderSummary() {

    setText(
        activeReservationsCount,

        dashboardState.summary
            .active_reservations
    );


    setText(
        dashboardPaymentStatus,

        dashboardState.summary
            .payment_status
    );


    setText(
        uploadedDocumentsCount,

        dashboardState.summary
            .uploaded_documents
    );
}


/* =========================================================
   CURRENT RESERVATION
   ========================================================= */

function renderCurrentReservation() {

    const reservation =
        dashboardState
            .current_reservation;


    if (!reservation) {

        showCurrentReservationEmptyState();

        return;
    }


    hideCurrentReservationEmptyState();


    setText(
        currentReservationReference,

        reservation
            .reservation_reference
    );


    setText(
        currentReservationResort,

        reservation.resort_name
    );


    setText(
        currentReservationAccommodation,

        reservation
            .accommodation_name
    );


    setText(
        currentReservationCheckIn,

        formatDate(
            reservation.check_in
        )
    );


    setText(
        currentReservationCheckOut,

        formatDate(
            reservation.check_out
        )
    );


    renderReservationStatus(
        reservation.reservation_status
    );


    if (
        viewReservationStatusButton &&
        reservation.id
    ) {

        viewReservationStatusButton.href =
            `ReservationStatus.html?id=${encodeURIComponent(
                reservation.id
            )}`;

    }
}


/* =========================================================
   STATUS
   ========================================================= */

function renderReservationStatus(
    status
) {

    if (!currentReservationStatus) {

        return;
    }


    currentReservationStatus.textContent =
        status || "—";


    currentReservationStatus
        .classList.remove(
            "status-success",
            "status-warning",
            "status-danger",
            "status-info",
            "status-neutral"
        );


    currentReservationStatus
        .classList.add(
            getStatusClass(
                status
            )
        );
}


/* =========================================================
   STATUS PRESENTATION
   ========================================================= */

function getStatusClass(
    status
) {

    const normalized =
        String(status || "")
            .trim()
            .toLowerCase();


    switch (normalized) {

        case "confirmed":
        case "verified":

            return "status-success";


        case "pending":
        case "pending verification":

            return "status-warning";


        case "rejected":

            return "status-danger";


        default:

            return "status-neutral";
    }
}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function showCurrentReservationEmptyState() {

    if (currentReservationContent) {

        currentReservationContent.hidden =
            true;

    }


    if (currentReservationEmptyState) {

        currentReservationEmptyState.hidden =
            false;

    }
}


function hideCurrentReservationEmptyState() {

    if (currentReservationContent) {

        currentReservationContent.hidden =
            false;

    }


    if (currentReservationEmptyState) {

        currentReservationEmptyState.hidden =
            true;

    }
}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(
    dateValue
) {

    if (!dateValue) {

        return "—";
    }


    const dateParts =
        String(dateValue)
            .split("-");


    if (dateParts.length !== 3) {

        return String(
            dateValue
        );

    }


    const year =
        Number(
            dateParts[0]
        );


    const month =
        Number(
            dateParts[1]
        );


    const day =
        Number(
            dateParts[2]
        );


    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)
    ) {

        return String(
            dateValue
        );

    }


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


    return new Intl.DateTimeFormat(
        "en-PH",
        {
            year: "numeric",

            month: "short",

            day: "numeric",

            timeZone: "UTC"
        }
    ).format(
        date
    );
}


/* =========================================================
   SAFE NUMBER
   ========================================================= */

function toSafeNumber(
    value
) {

    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : 0;
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
   PROFILE
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
   LUCIDE ICON INITIALIZATION
   ========================================================= */

function initializeIcons() {

    if (
        typeof window.lucide ===
            "undefined"
    ) {

        console.error(
            "Lucide library did not load."
        );

        return;
    }


    if (
        typeof window.lucide
            .createIcons !==
        "function"
    ) {

        console.error(
            "lucide.createIcons() is unavailable."
        );

        return;
    }


    window.lucide.createIcons();
}