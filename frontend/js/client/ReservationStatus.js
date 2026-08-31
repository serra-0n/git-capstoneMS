"use strict";

/* =========================================================
   RESORTHUB - CLIENT RESERVATION STATUS
   File: js/client/ReservationStatus.js

   FRONTEND DEVELOPMENT MODE

   true:
   - Uses dummy client/reservation data
   - Does NOT save or update anything in MySQL
   - Does NOT allow the client to change statuses

   false:
   - Loads data from the Express API
   - Reservation, payment, and document statuses
     come from the backend/database
   ========================================================= */

const USE_DUMMY_DATA = true;


/* =========================================================
   API ENDPOINTS
   ========================================================= */

const API_ENDPOINTS = {

    clientProfile: "/api/client/profile",

    reservationById(reservationId) {
        return `/api/client/reservations/${encodeURIComponent(reservationId)}`;
    }
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
   DUMMY RESERVATIONS
   Presentation data only.

   These records are structured similarly to data that can
   later come from MySQL through the Express backend.
   ========================================================= */

const DUMMY_RESERVATIONS = [

    {
        id: 105,
        client_id: 1,

        reference_number: "RES-0105",

        resort_name: "Azure Garden Resort",

        accommodation_name: "Family Room",

        check_in: "2026-09-10",

        check_out: "2026-09-12",

        reservation_status: "Pending",

        payment_status: "Pending Verification",

        document_verification_status: "Pending Verification"
    },

    {
        id: 102,
        client_id: 1,

        reference_number: "RES-0102",

        resort_name: "Palm Breeze Resort",

        accommodation_name: "Standard Room",

        check_in: "2026-09-15",

        check_out: "2026-09-17",

        reservation_status: "Confirmed",

        payment_status: "Pending Verification",

        document_verification_status: "Verified"
    },

    {
        id: 103,
        client_id: 1,

        reference_number: "RES-0103",

        resort_name: "Serenity Springs Resort",

        accommodation_name: "Deluxe Room",

        check_in: "2026-09-20",

        check_out: "2026-09-22",

        reservation_status: "Confirmed",

        payment_status: "Verified",

        document_verification_status: "Verified"
    },

    {
        id: 104,
        client_id: 1,

        reference_number: "RES-0104",

        resort_name: "Azure Garden Resort",

        accommodation_name: "Standard Cottage",

        check_in: "2026-09-25",

        check_out: "2026-09-26",

        reservation_status: "Pending",

        payment_status: "Pending",

        document_verification_status: "Pending Verification"
    }

];


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const reservationStatusState = {

    client: null,

    reservation: null,

    loading: false
};


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

/* Shared */

const clientApp =
    document.getElementById("clientApp");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const clientProfileButton =
    document.getElementById("clientProfileButton");

const clientDisplayName =
    document.getElementById("clientDisplayName");


/* Page states */

const reservationStatusEmptyState =
    document.getElementById("reservationStatusEmptyState");

const reservationStatusContent =
    document.getElementById("reservationStatusContent");


/* Reservation information */

const reservationReference =
    document.getElementById("reservationReference");

const reservationMainStatus =
    document.getElementById("reservationMainStatus");

const reservationResort =
    document.getElementById("reservationResort");

const reservationAccommodation =
    document.getElementById("reservationAccommodation");

const reservationCheckIn =
    document.getElementById("reservationCheckIn");

const reservationCheckOut =
    document.getElementById("reservationCheckOut");


/* Status overview */

const reservationStatusBadge =
    document.getElementById("reservationStatusBadge");

const paymentStatusBadge =
    document.getElementById("paymentStatusBadge");

const documentStatusBadge =
    document.getElementById("documentStatusBadge");


/* Related transaction cards */

const paymentTransactionStatus =
    document.getElementById("paymentTransactionStatus");

const documentTransactionStatus =
    document.getElementById("documentTransactionStatus");

const viewPaymentButton =
    document.getElementById("viewPaymentButton");

const viewDocumentsButton =
    document.getElementById("viewDocumentsButton");


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeReservationStatusPage
);


async function initializeReservationStatusPage() {

    initializeIcons();

    initializeSidebar();

    initializeProfileButton();


    const reservationId =
        getReservationIdFromUrl();


    /*
     * During frontend development, if no ID is supplied,
     * use reservation 105 as the demo record.
     *
     * Example:
     * ReservationStatus.html?id=105
     */

    const selectedReservationId =
        reservationId ||
        (USE_DUMMY_DATA ? "105" : null);


    if (!selectedReservationId) {

        showReservationNotFound();

        return;
    }


    if (USE_DUMMY_DATA) {

        loadDummyReservation(
            selectedReservationId
        );

        return;
    }


    await loadReservationFromDatabase(
        selectedReservationId
    );
}


/* =========================================================
   DUMMY MODE
   ========================================================= */

function loadDummyReservation(
    reservationId
) {

    reservationStatusState.client = {
        ...DUMMY_CLIENT
    };


    const reservation =
        DUMMY_RESERVATIONS.find(
            record =>
                String(record.id) ===
                String(reservationId)
        );


    if (!reservation) {

        renderClient();

        showReservationNotFound();

        return;
    }


    reservationStatusState.reservation = {
        ...reservation
    };


    renderClient();

    renderReservation();
}


/* =========================================================
   DATABASE / API MODE
   ========================================================= */

async function loadReservationFromDatabase(
    reservationId
) {

    setLoadingState(true);


    try {

        await Promise.all([
            loadClientFromApi(),
            loadReservationFromApi(reservationId)
        ]);


        renderClient();


        if (!reservationStatusState.reservation) {

            showReservationNotFound();

            return;
        }


        renderReservation();


    } catch (error) {

        console.error(
            "Reservation Status loading error:",
            error
        );


        showReservationNotFound();


    } finally {

        setLoadingState(false);
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


    reservationStatusState.client =
        normalizeClient(data);
}


/* =========================================================
   LOAD RESERVATION
   ========================================================= */

async function loadReservationFromApi(
    reservationId
) {

    const response =
        await fetch(
            API_ENDPOINTS.reservationById(
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

        reservationStatusState.reservation =
            null;

        return;
    }


    if (!response.ok) {

        throw new Error(
            "Unable to load reservation."
        );
    }


    const data =
        await response.json();


    reservationStatusState.reservation =
        normalizeReservation(data);
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
   NORMALIZE RESERVATION

   This allows the frontend to work even if your backend
   later uses slightly different property names.
   ========================================================= */

function normalizeReservation(data) {

    const reservation =
        data?.reservation ||
        data;


    if (
        !reservation ||
        typeof reservation !== "object"
    ) {

        return null;
    }


    return {

        id:
            reservation.id ??
            reservation.reservation_id ??
            null,

        client_id:
            reservation.client_id ??
            null,

        reference_number:
            reservation.reference_number ||
            reservation.reservation_reference ||
            "",

        resort_name:
            reservation.resort_name ||
            "",

        accommodation_name:
            reservation.accommodation_name ||
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
            reservation.reservation_status ||
            reservation.status ||
            "",

        payment_status:
            reservation.payment_status ||
            "",

        document_verification_status:
            reservation.document_verification_status ||
            reservation.document_status ||
            ""
    };
}


/* =========================================================
   RENDER CLIENT
   ========================================================= */

function renderClient() {

    if (!clientDisplayName) {
        return;
    }


    clientDisplayName.textContent =
        reservationStatusState.client?.name ||
        "Client";
}


/* =========================================================
   RENDER RESERVATION
   ========================================================= */

function renderReservation() {

    const reservation =
        reservationStatusState.reservation;


    if (!reservation) {

        showReservationNotFound();

        return;
    }


    showReservationContent();


    /* Reservation information */

    setText(
        reservationReference,
        reservation.reference_number
    );


    setText(
        reservationResort,
        reservation.resort_name
    );


    setText(
        reservationAccommodation,
        reservation.accommodation_name
    );


    setText(
        reservationCheckIn,
        formatDate(
            reservation.check_in
        )
    );


    setText(
        reservationCheckOut,
        formatDate(
            reservation.check_out
        )
    );


    /* Reservation status */

    applyStatusBadge(
        reservationMainStatus,
        reservation.reservation_status
    );


    applyStatusBadge(
        reservationStatusBadge,
        reservation.reservation_status
    );


    /* Payment status */

    applyStatusBadge(
        paymentStatusBadge,
        reservation.payment_status
    );


    applyStatusBadge(
        paymentTransactionStatus,
        reservation.payment_status
    );


    /* Document verification */

    applyStatusBadge(
        documentStatusBadge,
        reservation.document_verification_status
    );


    applyStatusBadge(
        documentTransactionStatus,
        reservation.document_verification_status
    );


    updateRelatedPageLinks();


    initializeIcons();
}


/* =========================================================
   RELATED PAGE LINKS

   Passes the selected reservation ID to the related pages.

   Examples:
   Payments.html?reservation=105
   UploadDocuments.html?reservation=105
   ========================================================= */

function updateRelatedPageLinks() {

    const reservation =
        reservationStatusState.reservation;


    if (!reservation) {
        return;
    }


    const reservationId =
        encodeURIComponent(
            reservation.id
        );


    if (viewPaymentButton) {

        viewPaymentButton.href =
            `Payments.html?reservation=${reservationId}`;
    }


    if (viewDocumentsButton) {

        viewDocumentsButton.href =
            `UploadDocuments.html?reservation=${reservationId}`;
    }
}


/* =========================================================
   STATUS BADGE

   Status values remain backend/database values.
   This function only controls presentation.
   ========================================================= */

function applyStatusBadge(
    element,
    status
) {

    if (!element) {
        return;
    }


    const value =
        String(
            status || ""
        ).trim();


    element.className =
        "status-badge";


    element.textContent =
        value || "—";


    switch (
        value.toLowerCase()
    ) {

        case "confirmed":

        case "verified":

            element.classList.add(
                "status-success"
            );

            break;


        case "pending verification":

            element.classList.add(
                "status-warning"
            );

            break;


        case "pending":

            element.classList.add(
                "status-info"
            );

            break;


        case "rejected":

            element.classList.add(
                "status-danger"
            );

            break;


        default:

            element.classList.add(
                "status-neutral"
            );
    }
}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(
    value
) {

    if (!value) {

        return "—";
    }


    /*
     * YYYY-MM-DD values are parsed manually so the
     * displayed date is not shifted by timezone conversion.
     */

    const dateOnlyPattern =
        /^\d{4}-\d{2}-\d{2}$/;


    if (
        dateOnlyPattern.test(value)
    ) {

        const [
            year,
            month,
            day
        ] = value
            .split("-")
            .map(Number);


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


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);
    }


    return new Intl.DateTimeFormat(
        "en-PH",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    ).format(date);
}


/* =========================================================
   SHOW RESERVATION CONTENT
   ========================================================= */

function showReservationContent() {

    if (reservationStatusEmptyState) {

        reservationStatusEmptyState.hidden =
            true;
    }


    if (reservationStatusContent) {

        reservationStatusContent.hidden =
            false;
    }
}


/* =========================================================
   RESERVATION NOT FOUND
   ========================================================= */

function showReservationNotFound() {

    reservationStatusState.reservation =
        null;


    if (reservationStatusContent) {

        reservationStatusContent.hidden =
            true;
    }


    if (reservationStatusEmptyState) {

        reservationStatusEmptyState.hidden =
            false;
    }


    initializeIcons();
}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setLoadingState(
    loading
) {

    reservationStatusState.loading =
        loading;


    if (loading) {

        if (reservationStatusContent) {

            reservationStatusContent.hidden =
                true;
        }


        if (reservationStatusEmptyState) {

            reservationStatusEmptyState.hidden =
                true;
        }
    }
}


/* =========================================================
   URL RESERVATION ID

   Example:
   ReservationStatus.html?id=105
   ========================================================= */

function getReservationIdFromUrl() {

    const parameters =
        new URLSearchParams(
            window.location.search
        );


    return parameters.get(
        "id"
    );
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