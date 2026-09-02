"use strict";

const { authenticateUser } = require("../../../backend/middleware/authMiddleware");

/* =========================================================
   RESORTHUB - CLIENT DASHBOARD
   File: js/client/Dashboard.js
   ========================================================= */


/* =========================================================
   API ENDPOINT
   ========================================================= */

const API_ENDPOINTS = {
    dashboard: "/api/client/dashboard"
};


/* =========================================================
   DUMMY DATA
   Frontend testing only.
   This is NOT database data.
   ========================================================= */

const DUMMY_DASHBOARD_DATA = {
    client: {
        id: 1,
        name: "Juan Dela Cruz"
    },

    summary: {
        active_reservation_count: 1,
        payment_status: "Pending Verification",
        uploaded_document_count: 2
    },

    current_reservation: {
        id: 1,
        reference_number: "RES-001",
        status: "Pending",
        resort_name: "Azure Garden Resort",
        accommodation_name: "Family Room",
        check_in: "2026-09-10",
        check_out: "2026-09-12"
    }
};


/* =========================================================
   DASHBOARD STATE
   ========================================================= */

const dashboardState = {
    client: null,

    summary: {
        active_reservation_count: 0,
        payment_status: null,
        uploaded_document_count: 0
    },

    current_reservation: null,

    usingDummyData: false
};


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const clientApp =
    document.getElementById("clientApp");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const clientProfileButton =
    document.getElementById("clientProfileButton");

const clientDisplayName =
    document.getElementById("clientDisplayName");

const dashboardClientName =
    document.getElementById("dashboardClientName");


/* Dashboard Summary */

const activeReservationCount =
    document.getElementById("activeReservationCount");

const dashboardPaymentStatus =
    document.getElementById("dashboardPaymentStatus");

const uploadedDocumentCount =
    document.getElementById("uploadedDocumentCount");


/* Current Reservation */

const currentReservationContent =
    document.getElementById("currentReservationContent");

const currentReservationEmptyState =
    document.getElementById("currentReservationEmptyState");

const currentReservationReference =
    document.getElementById("currentReservationReference");

const currentReservationStatus =
    document.getElementById("currentReservationStatus");

const currentResortName =
    document.getElementById("currentResortName");

const currentAccommodationName =
    document.getElementById("currentAccommodationName");

const currentCheckIn =
    document.getElementById("currentCheckIn");

const currentCheckOut =
    document.getElementById("currentCheckOut");

const viewReservationStatusButton =
    document.getElementById("viewReservationStatusButton");


/* =========================================================
   INITIALIZE DASHBOARD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);

async function requireAuthenticatedClient() {
    const token = sessionStorage.getItem("resorthub_access_token");

    if (!token) {
        window.location.href = "../auth/login.html";
        return null;
    }

    try {
        const response = await fetch("/api/auth/me", {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Session is invalid.");
        }

        const result = await response.json();

        if (result.user.role !== "client") {
            throw new Error("This page is only available to clients.");
        }

        return result.user;
    } catch (error) {
        sessionStorage.removeItem("resorthub_access_token");
        window.location.href = "../auth/login.html";
        return null;
    }
}

async function initializeDashboard() {
    initializeIcons();
    initializeSidebar();
    initializeProfileButton();

    const authenticatedUser = await requireAuthenticatedClient();

    if (!authenticatedUser) {
        return;
    }

    useDummyDashboardData(authenticatedUser);
    await loadDashboardData();
}


/* =========================================================
   USE DUMMY DATA
   ========================================================= */

function useDummyDashboardData() {
    dashboardState.usingDummyData = true;

    const fullName = [
        authenticateUser.firstName,
        authenticateUser.lastName
    ]

        .filter(Boolean)
        .join(" ");

    updateDashboardState({
        ...DUMMY_DASHBOARD_DATA,

        client: {
            id: authenticateUser.id,
            name: fullName || "Client"
        }
    });

    renderDashboard();
}


/* =========================================================
   LOAD DATABASE DATA
   ========================================================= */

async function loadDashboardData() {
    const token = sessionStorage.getItem("resorthub_access_token");
    try {
        const response = await fetch(
            API_ENDPOINTS.dashboard,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        if (!response.ok) {
            throw new Error(
                "Dashboard data could not be loaded."
            );
        }


        const data = await response.json();
        dashboardState.usingDummyData = false;

        updateDashboardState(data);
        renderDashboard();


    } catch (error) {

        /*
         * The backend is not connected yet.
         * Keep displaying the dummy data.
         */

        console.info(
            "Dashboard API is unavailable. Dummy frontend data is being displayed."
        );
    }
}


/* =========================================================
   UPDATE DASHBOARD STATE
   ========================================================= */

function updateDashboardState(data) {
    if (!data || typeof data !== "object") {
        return;
    }


    dashboardState.client =
        data.client || null;


    dashboardState.summary = {
        active_reservation_count:
            Number(
                data.summary?.active_reservation_count
            ) || 0,

        payment_status:
            data.summary?.payment_status || null,

        uploaded_document_count:
            Number(
                data.summary?.uploaded_document_count
            ) || 0
    };


    dashboardState.current_reservation =
        data.current_reservation || null;
}


/* =========================================================
   RENDER DASHBOARD
   ========================================================= */

function renderDashboard() {
    renderClient();

    renderSummary();

    renderCurrentReservation();

    initializeIcons();
}


/* =========================================================
   RENDER CLIENT
   ========================================================= */

function renderClient() {
    const clientName =
        dashboardState.client?.name ||
        "Client";


    if (clientDisplayName) {
        clientDisplayName.textContent =
            clientName;
    }


    if (dashboardClientName) {
        dashboardClientName.textContent =
            clientName;
    }
}


/* =========================================================
   RENDER SUMMARY
   ========================================================= */

function renderSummary() {
    if (activeReservationCount) {
        activeReservationCount.textContent =
            dashboardState.summary
                .active_reservation_count;
    }


    if (dashboardPaymentStatus) {
        dashboardPaymentStatus.textContent =
            dashboardState.summary
                .payment_status ||
            "No Payment";
    }


    if (uploadedDocumentCount) {
        uploadedDocumentCount.textContent =
            dashboardState.summary
                .uploaded_document_count;
    }
}


/* =========================================================
   RENDER CURRENT RESERVATION
   ========================================================= */

function renderCurrentReservation() {
    const reservation =
        dashboardState.current_reservation;


    if (!reservation) {
        showReservationEmptyState();

        return;
    }


    showReservationContent();


    if (currentReservationReference) {
        currentReservationReference.textContent =
            reservation.reference_number ||
            "—";
    }


    if (currentReservationStatus) {
        currentReservationStatus.textContent =
            reservation.status ||
            "—";

        updateStatusBadge(
            currentReservationStatus,
            reservation.status
        );
    }


    if (currentResortName) {
        currentResortName.textContent =
            reservation.resort_name ||
            "—";
    }


    if (currentAccommodationName) {
        currentAccommodationName.textContent =
            reservation.accommodation_name ||
            "—";
    }


    if (currentCheckIn) {
        currentCheckIn.textContent =
            formatDate(
                reservation.check_in
            );
    }


    if (currentCheckOut) {
        currentCheckOut.textContent =
            formatDate(
                reservation.check_out
            );
    }


    updateReservationStatusLink(
        reservation
    );
}


/* =========================================================
   RESERVATION CONTENT
   ========================================================= */

function showReservationContent() {
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
   RESERVATION EMPTY STATE
   ========================================================= */

function showReservationEmptyState() {
    if (currentReservationContent) {
        currentReservationContent.hidden =
            true;
    }


    if (currentReservationEmptyState) {
        currentReservationEmptyState.hidden =
            false;
    }
}


/* =========================================================
   STATUS BADGE
   Presentation only.
   This does NOT change reservation status.
   ========================================================= */

function updateStatusBadge(element, status) {
    if (!element) {
        return;
    }


    element.classList.remove(
        "status-success",
        "status-warning",
        "status-danger",
        "status-info"
    );


    const normalizedStatus =
        String(status || "")
            .trim()
            .toLowerCase();


    if (
        normalizedStatus.includes("pending")
    ) {
        element.classList.add(
            "status-warning"
        );

        return;
    }


    if (
        normalizedStatus.includes("approved") ||
        normalizedStatus.includes("confirmed") ||
        normalizedStatus.includes("verified")
    ) {
        element.classList.add(
            "status-success"
        );

        return;
    }


    if (
        normalizedStatus.includes("rejected") ||
        normalizedStatus.includes("failed")
    ) {
        element.classList.add(
            "status-danger"
        );

        return;
    }


    if (normalizedStatus) {
        element.classList.add(
            "status-info"
        );
    }
}


/* =========================================================
   RESERVATION STATUS LINK
   ========================================================= */

function updateReservationStatusLink(
    reservation
) {
    if (!viewReservationStatusButton) {
        return;
    }


    const reservationId =
        reservation.id;


    if (!reservationId) {
        viewReservationStatusButton.href =
            "ReservationStatus.html";

        return;
    }


    viewReservationStatusButton.href =
        `ReservationStatus.html?id=${
            encodeURIComponent(
                reservationId
            )
        }`;
}


/* =========================================================
   DATE FORMATTER
   ========================================================= */

function formatDate(value) {
    if (!value) {
        return "—";
    }


    /*
     * Parse YYYY-MM-DD manually so the displayed
     * calendar date does not shift because of
     * browser timezone differences.
     */

    const parts =
        String(value).split("-");


    if (parts.length === 3) {
        const year =
            Number(parts[0]);

        const month =
            Number(parts[1]);

        const day =
            Number(parts[2]);


        if (
            Number.isInteger(year) &&
            Number.isInteger(month) &&
            Number.isInteger(day)
        ) {
            const date =
                new Date(
                    year,
                    month - 1,
                    day
                );


            return new Intl.DateTimeFormat(
                "en-PH",
                {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            ).format(date);
        }
    }


    return String(value);
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


    const isCollapsed =
        clientApp.classList.contains(
            "sidebar-collapsed"
        );


    sidebarToggle.setAttribute(
        "aria-expanded",
        String(!isCollapsed)
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