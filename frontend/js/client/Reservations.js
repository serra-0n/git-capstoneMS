"use strict";

/* =========================================================
   RESORTHUB - CLIENT NEW RESERVATION
   File: js/client/Reservations.js

   Frontend development:
   - Uses dummy data while the backend is not connected.
   - Does not use localStorage.
   - Designed for Node.js + Express + MySQL later.
   ========================================================= */


/* =========================================================
   FRONTEND DEVELOPMENT MODE

   true  = use dummy frontend data
   false = use real backend API
   ========================================================= */

const USE_DUMMY_DATA = true;


/* =========================================================
   API ENDPOINTS
   ========================================================= */

const API_ENDPOINTS = {
    clientProfile: "/api/client/profile",

    resorts: "/api/resorts",

    accommodationsByResort(resortId) {
        return `/api/resorts/${encodeURIComponent(resortId)}/accommodations`;
    },

    createReservation: "/api/client/reservations"
};


/* =========================================================
   DUMMY CLIENT DATA

   Frontend sample only.
   NOT a database record.
   ========================================================= */

const DUMMY_CLIENT = {
    id: 1,
    name: "Juan Dela Cruz",
    email: "juan@example.com",
    contact_number: "09123456789"
};


/* =========================================================
   DUMMY RESORT DATA

   Frontend sample only.
   ========================================================= */

const DUMMY_RESORTS = [
    {
        id: 1,
        name: "Sample Resort A"
    },

    {
        id: 2,
        name: "Sample Resort B"
    },

    {
        id: 3,
        name: "Sample Resort C"
    }
];


/* =========================================================
   DUMMY ACCOMMODATION DATA

   The thesis supports displaying:
   - room/cottage type
   - capacity
   - amenities
   - pricing information
   - accommodation availability

   The values below are sample frontend values only.
   ========================================================= */

const DUMMY_ACCOMMODATIONS = [
    {
        id: 101,
        resort_id: 1,
        name: "Family Room",
        type: "Room",
        capacity: 4,
        amenities: [
            "Air Conditioning",
            "Private Bathroom"
        ],
        price: 3500,
        availability: "Available"
    },

    {
        id: 102,
        resort_id: 1,
        name: "Standard Cottage",
        type: "Cottage",
        capacity: 6,
        amenities: [
            "Table",
            "Seating Area"
        ],
        price: 2500,
        availability: "Available"
    },

    {
        id: 201,
        resort_id: 2,
        name: "Family Cottage",
        type: "Cottage",
        capacity: 8,
        amenities: [
            "Table",
            "Seating Area"
        ],
        price: 4000,
        availability: "Available"
    },

    {
        id: 202,
        resort_id: 2,
        name: "Standard Room",
        type: "Room",
        capacity: 2,
        amenities: [
            "Air Conditioning"
        ],
        price: 2200,
        availability: "Available"
    },

    {
        id: 301,
        resort_id: 3,
        name: "Group Cottage",
        type: "Cottage",
        capacity: 10,
        amenities: [
            "Table",
            "Seating Area"
        ],
        price: 4500,
        availability: "Available"
    }
];


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const reservationState = {
    client: null,

    resorts: [],

    accommodations: [],

    selectedResort: null,

    selectedAccommodation: null,

    usingDummyData: false,

    submitting: false
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


/* Form */

const reservationForm =
    document.getElementById("reservationForm");


/* Resort and accommodation */

const resortId =
    document.getElementById("resortId");

const accommodationId =
    document.getElementById("accommodationId");


/* Selected accommodation */

const selectedAccommodation =
    document.getElementById("selectedAccommodation");

const accommodationEmptyState =
    document.getElementById("accommodationEmptyState");

const selectedAccommodationName =
    document.getElementById("selectedAccommodationName");

const selectedAccommodationAvailability =
    document.getElementById("selectedAccommodationAvailability");

const selectedAccommodationType =
    document.getElementById("selectedAccommodationType");

const selectedAccommodationCapacity =
    document.getElementById("selectedAccommodationCapacity");

const selectedAccommodationPrice =
    document.getElementById("selectedAccommodationPrice");

const selectedAccommodationAmenities =
    document.getElementById("selectedAccommodationAmenities");


/* Schedule */

const checkIn =
    document.getElementById("checkIn");

const checkOut =
    document.getElementById("checkOut");

const scheduleMessage =
    document.getElementById("scheduleMessage");


/* Client information */

const clientName =
    document.getElementById("clientName");

const contactNumber =
    document.getElementById("contactNumber");

const clientEmail =
    document.getElementById("clientEmail");


/* Reservation summary */

const summaryResort =
    document.getElementById("summaryResort");

const summaryAccommodation =
    document.getElementById("summaryAccommodation");

const summaryCheckIn =
    document.getElementById("summaryCheckIn");

const summaryCheckOut =
    document.getElementById("summaryCheckOut");


/* Submit */

const submitReservationButton =
    document.getElementById("submitReservationButton");

const reservationFormMessage =
    document.getElementById("reservationFormMessage");


/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeReservationPage
);


async function initializeReservationPage() {

    initializeIcons();

    initializeSidebar();

    initializeProfileButton();

    initializeFormEvents();

    initializeDateInputs();


    if (USE_DUMMY_DATA) {

        loadDummyData();

        return;
    }


    await loadInitialApiData();
}


/* =========================================================
   DUMMY DATA INITIALIZATION
   ========================================================= */

function loadDummyData() {

    reservationState.usingDummyData = true;


    reservationState.client = {
        ...DUMMY_CLIENT
    };


    reservationState.resorts =
        DUMMY_RESORTS.map(
            resort => ({ ...resort })
        );


    reservationState.accommodations = [];


    renderClient();

    populateClientInformation();

    renderResortOptions();

    resetAccommodationSelection();

    renderReservationSummary();
}


/* =========================================================
   LOAD INITIAL API DATA
   ========================================================= */

async function loadInitialApiData() {

    try {

        const [
            clientResponse,
            resortsResponse
        ] = await Promise.all([

            fetch(
                API_ENDPOINTS.clientProfile,
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            ),

            fetch(
                API_ENDPOINTS.resorts,
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            )

        ]);


        if (!clientResponse.ok) {

            throw new Error(
                "Unable to load client information."
            );
        }


        if (!resortsResponse.ok) {

            throw new Error(
                "Unable to load resorts."
            );
        }


        const clientData =
            await clientResponse.json();

        const resortsData =
            await resortsResponse.json();


        reservationState.client =
            normalizeClient(clientData);


        reservationState.resorts =
            normalizeResorts(resortsData);


        reservationState.usingDummyData =
            false;


        renderClient();

        populateClientInformation();

        renderResortOptions();

        resetAccommodationSelection();

        renderReservationSummary();


    } catch (error) {

        console.error(
            "Reservation page API error:",
            error
        );


        showFormMessage(
            "Unable to load reservation information.",
            "error"
        );
    }
}


/* =========================================================
   NORMALIZE CLIENT DATA
   ========================================================= */

function normalizeClient(data) {

    const client =
        data?.client || data;


    if (
        !client ||
        typeof client !== "object"
    ) {

        return null;
    }


    return {
        id:
            client.id ??
            null,

        name:
            client.name ||
            client.full_name ||
            "",

        email:
            client.email ||
            "",

        contact_number:
            client.contact_number ||
            client.phone ||
            ""
    };
}


/* =========================================================
   NORMALIZE RESORT DATA
   ========================================================= */

function normalizeResorts(data) {

    const resorts =
        Array.isArray(data)
            ? data
            : data?.resorts;


    if (!Array.isArray(resorts)) {

        return [];
    }


    return resorts.map(
        resort => ({
            id:
                resort.id ??
                null,

            name:
                resort.name ||
                resort.resort_name ||
                ""
        })
    );
}


/* =========================================================
   NORMALIZE ACCOMMODATION DATA
   ========================================================= */

function normalizeAccommodations(data) {

    const accommodations =
        Array.isArray(data)
            ? data
            : data?.accommodations;


    if (!Array.isArray(accommodations)) {

        return [];
    }


    return accommodations.map(
        accommodation => ({
            id:
                accommodation.id ??
                null,

            resort_id:
                accommodation.resort_id ??
                null,

            name:
                accommodation.name ||
                accommodation.accommodation_name ||
                "",

            type:
                accommodation.type ||
                accommodation.accommodation_type ||
                "",

            capacity:
                accommodation.capacity ??
                "",

            amenities:
                Array.isArray(
                    accommodation.amenities
                )
                    ? accommodation.amenities
                    : [],

            price:
                accommodation.price ??
                null,

            availability:
                accommodation.availability ||
                accommodation.status ||
                ""
        })
    );
}


/* =========================================================
   CLIENT DISPLAY
   ========================================================= */

function renderClient() {

    if (!clientDisplayName) {
        return;
    }


    clientDisplayName.textContent =
        reservationState.client?.name ||
        "Client";
}


/* =========================================================
   POPULATE CLIENT INFORMATION
   ========================================================= */

function populateClientInformation() {

    const client =
        reservationState.client;


    if (!client) {
        return;
    }


    if (clientName) {

        clientName.value =
            client.name || "";
    }


    if (contactNumber) {

        contactNumber.value =
            client.contact_number || "";
    }


    if (clientEmail) {

        clientEmail.value =
            client.email || "";
    }
}


/* =========================================================
   RESORT OPTIONS
   ========================================================= */

function renderResortOptions() {

    if (!resortId) {
        return;
    }


    resortId.innerHTML = "";


    const defaultOption =
        document.createElement("option");


    defaultOption.value = "";

    defaultOption.textContent =
        "Select a resort";


    resortId.appendChild(
        defaultOption
    );


    reservationState.resorts.forEach(
        resort => {

            const option =
                document.createElement("option");


            option.value =
                String(resort.id);


            option.textContent =
                resort.name;


            resortId.appendChild(
                option
            );
        }
    );
}


/* =========================================================
   RESORT CHANGE
   ========================================================= */

async function handleResortChange() {

    const selectedResortId =
        resortId?.value || "";


    reservationState.selectedResort =
        reservationState.resorts.find(
            resort =>
                String(resort.id) ===
                String(selectedResortId)
        ) || null;


    reservationState.selectedAccommodation =
        null;


    resetAccommodationSelection();

    renderReservationSummary();


    if (!selectedResortId) {
        return;
    }


    await loadAccommodations(
        selectedResortId
    );
}


/* =========================================================
   LOAD ACCOMMODATIONS
   ========================================================= */

async function loadAccommodations(
    selectedResortId
) {

    setAccommodationSelectDisabled(
        true
    );


    if (reservationState.usingDummyData) {

        reservationState.accommodations =
            DUMMY_ACCOMMODATIONS.filter(
                accommodation =>
                    String(accommodation.resort_id) ===
                    String(selectedResortId)
            );


        renderAccommodationOptions();

        setAccommodationSelectDisabled(
            false
        );


        return;
    }


    try {

        const response =
            await fetch(
                API_ENDPOINTS.accommodationsByResort(
                    selectedResortId
                ),
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
                "Unable to load accommodations."
            );
        }


        const data =
            await response.json();


        reservationState.accommodations =
            normalizeAccommodations(data);


        renderAccommodationOptions();


    } catch (error) {

        console.error(
            "Accommodation API error:",
            error
        );


        reservationState.accommodations =
            [];


        renderAccommodationOptions();


        showFormMessage(
            "Unable to load accommodations for the selected resort.",
            "error"
        );

    } finally {

        setAccommodationSelectDisabled(
            false
        );
    }
}


/* =========================================================
   ACCOMMODATION OPTIONS
   ========================================================= */

function renderAccommodationOptions() {

    if (!accommodationId) {
        return;
    }


    accommodationId.innerHTML = "";


    const defaultOption =
        document.createElement("option");


    defaultOption.value = "";

    defaultOption.textContent =
        reservationState.accommodations.length > 0
            ? "Select an accommodation"
            : "No accommodations available";


    accommodationId.appendChild(
        defaultOption
    );


    reservationState.accommodations.forEach(
        accommodation => {

            const option =
                document.createElement("option");


            option.value =
                String(accommodation.id);


            option.textContent =
                accommodation.name;


            accommodationId.appendChild(
                option
            );
        }
    );


    accommodationId.disabled =
        reservationState.accommodations.length === 0;
}


/* =========================================================
   ACCOMMODATION CHANGE
   ========================================================= */

function handleAccommodationChange() {

    const selectedAccommodationId =
        accommodationId?.value || "";


    reservationState.selectedAccommodation =
        reservationState.accommodations.find(
            accommodation =>
                String(accommodation.id) ===
                String(selectedAccommodationId)
        ) || null;


    renderSelectedAccommodation();

    renderReservationSummary();
}


/* =========================================================
   SELECTED ACCOMMODATION
   ========================================================= */

function renderSelectedAccommodation() {

    const accommodation =
        reservationState.selectedAccommodation;


    if (!accommodation) {

        resetSelectedAccommodationDisplay();

        return;
    }


    if (selectedAccommodation) {

        selectedAccommodation.hidden =
            false;
    }


    if (accommodationEmptyState) {

        accommodationEmptyState.hidden =
            true;
    }


    setText(
        selectedAccommodationName,
        accommodation.name
    );


    setText(
        selectedAccommodationAvailability,
        accommodation.availability
    );


    setText(
        selectedAccommodationType,
        accommodation.type
    );


    setText(
        selectedAccommodationCapacity,
        formatCapacity(
            accommodation.capacity
        )
    );


    setText(
        selectedAccommodationPrice,
        formatCurrency(
            accommodation.price
        )
    );


    setText(
        selectedAccommodationAmenities,
        formatAmenities(
            accommodation.amenities
        )
    );
}


/* =========================================================
   RESET ACCOMMODATION
   ========================================================= */

function resetAccommodationSelection() {

    reservationState.accommodations =
        [];

    reservationState.selectedAccommodation =
        null;


    if (accommodationId) {

        accommodationId.innerHTML =
            '<option value="">Select a resort first</option>';


        accommodationId.disabled =
            true;
    }


    resetSelectedAccommodationDisplay();
}


function resetSelectedAccommodationDisplay() {

    if (selectedAccommodation) {

        selectedAccommodation.hidden =
            true;
    }


    if (accommodationEmptyState) {

        accommodationEmptyState.hidden =
            false;
    }


    setText(
        selectedAccommodationName,
        "—"
    );

    setText(
        selectedAccommodationAvailability,
        "—"
    );

    setText(
        selectedAccommodationType,
        "—"
    );

    setText(
        selectedAccommodationCapacity,
        "—"
    );

    setText(
        selectedAccommodationPrice,
        "—"
    );

    setText(
        selectedAccommodationAmenities,
        "—"
    );
}


/* =========================================================
   ENABLE / DISABLE ACCOMMODATION SELECT
   ========================================================= */

function setAccommodationSelectDisabled(
    disabled
) {

    if (!accommodationId) {
        return;
    }


    accommodationId.disabled =
        disabled;
}


/* =========================================================
   DATE INPUTS
   ========================================================= */

function initializeDateInputs() {

    const today =
        getTodayDateString();


    if (checkIn) {

        checkIn.min =
            today;
    }


    if (checkOut) {

        checkOut.min =
            today;
    }
}


/* =========================================================
   SCHEDULE CHANGE
   ========================================================= */

function handleScheduleChange() {

    updateCheckOutMinimum();

    validateSchedule();

    renderReservationSummary();
}


/* =========================================================
   UPDATE CHECK-OUT MINIMUM
   ========================================================= */

function updateCheckOutMinimum() {

    if (
        !checkIn ||
        !checkOut
    ) {

        return;
    }


    if (!checkIn.value) {

        checkOut.min =
            getTodayDateString();

        return;
    }


    checkOut.min =
        getNextDateString(
            checkIn.value
        );
}


/* =========================================================
   VALIDATE SCHEDULE
   ========================================================= */

function validateSchedule() {

    clearScheduleMessage();


    const checkInValue =
        checkIn?.value || "";

    const checkOutValue =
        checkOut?.value || "";


    if (
        !checkInValue ||
        !checkOutValue
    ) {

        return true;
    }


    if (
        compareDates(
            checkOutValue,
            checkInValue
        ) <= 0
    ) {

        showScheduleMessage(
            "Check-out date must be after the check-in date.",
            "error"
        );


        return false;
    }


    return true;
}


/* =========================================================
   RESERVATION SUMMARY
   ========================================================= */

function renderReservationSummary() {

    setText(
        summaryResort,
        reservationState.selectedResort?.name
    );


    setText(
        summaryAccommodation,
        reservationState.selectedAccommodation?.name
    );


    setText(
        summaryCheckIn,
        checkIn?.value
            ? formatDate(checkIn.value)
            : "—"
    );


    setText(
        summaryCheckOut,
        checkOut?.value
            ? formatDate(checkOut.value)
            : "—"
    );
}


/* =========================================================
   FORM EVENTS
   ========================================================= */

function initializeFormEvents() {

    if (resortId) {

        resortId.addEventListener(
            "change",
            handleResortChange
        );
    }


    if (accommodationId) {

        accommodationId.addEventListener(
            "change",
            handleAccommodationChange
        );
    }


    if (checkIn) {

        checkIn.addEventListener(
            "change",
            handleScheduleChange
        );
    }


    if (checkOut) {

        checkOut.addEventListener(
            "change",
            handleScheduleChange
        );
    }


    if (reservationForm) {

        reservationForm.addEventListener(
            "submit",
            handleReservationSubmit
        );
    }
}


/* =========================================================
   SUBMIT RESERVATION
   ========================================================= */

async function handleReservationSubmit(
    event
) {

    event.preventDefault();


    clearFormMessage();


    if (reservationState.submitting) {
        return;
    }


    if (!reservationForm) {
        return;
    }


    if (!reservationForm.checkValidity()) {

        reservationForm.reportValidity();

        return;
    }


    if (!reservationState.selectedResort) {

        showFormMessage(
            "Please select a resort.",
            "error"
        );

        return;
    }


    if (!reservationState.selectedAccommodation) {

        showFormMessage(
            "Please select an accommodation.",
            "error"
        );

        return;
    }


    if (!validateSchedule()) {

        return;
    }


    const payload =
        buildReservationPayload();


    /*
     * Dummy mode must not pretend that a
     * database record was actually created.
     */
    if (USE_DUMMY_DATA) {

        console.log(
            "Dummy reservation payload:",
            payload
        );


        showFormMessage(
            "Demo mode: the reservation information is ready, but it was not saved because the backend database is not connected yet.",
            "info"
        );


        return;
    }


    await submitReservation(
        payload
    );
}


/* =========================================================
   BUILD DATABASE-READY PAYLOAD
   ========================================================= */

function buildReservationPayload() {

    return {
        /*
         * The backend should ultimately determine the
         * authenticated client from the login session.
         */
        client_id:
            reservationState.client?.id ??
            null,


        resort_id:
            reservationState.selectedResort?.id ??
            null,


        accommodation_id:
            reservationState.selectedAccommodation?.id ??
            null,


        check_in:
            checkIn?.value ||
            null,


        check_out:
            checkOut?.value ||
            null,


        client_name:
            clientName?.value.trim() ||
            "",


        contact_number:
            contactNumber?.value.trim() ||
            "",


        client_email:
            clientEmail?.value.trim() ||
            ""
    };
}


/* =========================================================
   POST RESERVATION TO API
   ========================================================= */

async function submitReservation(
    payload
) {

    setSubmittingState(
        true
    );


    try {

        const response =
            await fetch(
                API_ENDPOINTS.createReservation,
                {
                    method: "POST",

                    credentials: "include",

                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                }
            );


        const data =
            await readJsonResponse(
                response
            );


        if (!response.ok) {

            throw new Error(
                data?.message ||
                "Unable to submit reservation."
            );
        }


        showFormMessage(
            data?.message ||
            "Reservation request submitted successfully.",
            "success"
        );


        /*
         * Navigate only if the backend actually
         * returns a database reservation ID.
         */
        const reservationId =
            data?.reservation?.id ??
            data?.reservation_id ??
            data?.id ??
            null;


        if (reservationId !== null) {

            window.location.href =
                `ReservationStatus.html?id=${encodeURIComponent(
                    reservationId
                )}`;
        }


    } catch (error) {

        console.error(
            "Reservation submission error:",
            error
        );


        showFormMessage(
            error.message ||
            "Unable to submit reservation.",
            "error"
        );


    } finally {

        setSubmittingState(
            false
        );
    }
}


/* =========================================================
   SUBMITTING STATE
   ========================================================= */

function setSubmittingState(
    submitting
) {

    reservationState.submitting =
        submitting;


    if (!submitReservationButton) {
        return;
    }


    submitReservationButton.disabled =
        submitting;


    submitReservationButton.setAttribute(
        "aria-busy",
        String(submitting)
    );


    const textElement =
        submitReservationButton.querySelector(
            "span"
        );


    if (textElement) {

        textElement.textContent =
            submitting
                ? "Submitting..."
                : "Submit Reservation";
    }
}


/* =========================================================
   JSON RESPONSE
   ========================================================= */

async function readJsonResponse(
    response
) {

    const contentType =
        response.headers.get(
            "content-type"
        );


    if (
        contentType &&
        contentType.includes(
            "application/json"
        )
    ) {

        return await response.json();
    }


    return null;
}


/* =========================================================
   FORM MESSAGE
   ========================================================= */

function showFormMessage(
    message,
    type = "info"
) {

    if (!reservationFormMessage) {
        return;
    }


    reservationFormMessage.hidden =
        false;


    reservationFormMessage.textContent =
        message;


    reservationFormMessage.classList.remove(
        "success",
        "error",
        "info"
    );


    reservationFormMessage.classList.add(
        type
    );
}


function clearFormMessage() {

    if (!reservationFormMessage) {
        return;
    }


    reservationFormMessage.hidden =
        true;


    reservationFormMessage.textContent =
        "";


    reservationFormMessage.classList.remove(
        "success",
        "error",
        "info"
    );
}


/* =========================================================
   SCHEDULE MESSAGE
   ========================================================= */

function showScheduleMessage(
    message,
    type = "error"
) {

    if (!scheduleMessage) {
        return;
    }


    scheduleMessage.hidden =
        false;


    scheduleMessage.textContent =
        message;


    scheduleMessage.classList.remove(
        "success",
        "error",
        "info"
    );


    scheduleMessage.classList.add(
        type
    );
}


function clearScheduleMessage() {

    if (!scheduleMessage) {
        return;
    }


    scheduleMessage.hidden =
        true;


    scheduleMessage.textContent =
        "";


    scheduleMessage.classList.remove(
        "success",
        "error",
        "info"
    );
}


/* =========================================================
   GENERIC TEXT SETTER
   ========================================================= */

function setText(
    element,
    value
) {

    if (!element) {
        return;
    }


    const text =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);


    element.textContent =
        text;
}


/* =========================================================
   FORMAT PRICE
   ========================================================= */

function formatCurrency(
    value
) {

    const numericValue =
        Number(value);


    if (
        value === null ||
        value === undefined ||
        Number.isNaN(numericValue)
    ) {

        return "—";
    }


    return new Intl.NumberFormat(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2
        }
    ).format(
        numericValue
    );
}


/* =========================================================
   FORMAT CAPACITY
   ========================================================= */

function formatCapacity(
    capacity
) {

    if (
        capacity === null ||
        capacity === undefined ||
        capacity === ""
    ) {

        return "—";
    }


    return String(capacity);
}


/* =========================================================
   FORMAT AMENITIES
   ========================================================= */

function formatAmenities(
    amenities
) {

    if (
        !Array.isArray(amenities) ||
        amenities.length === 0
    ) {

        return "—";
    }


    return amenities.join(", ");
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }


    const dateString =
        String(value)
            .slice(0, 10);


    const parts =
        dateString.split("-");


    if (parts.length !== 3) {

        return dateString;
    }


    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);

    const day =
        Number(parts[2]);


    const date =
        new Date(
            year,
            month - 1,
            day
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;
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
   DATE HELPERS
   ========================================================= */

function getTodayDateString() {

    const today =
        new Date();


    return formatDateForInput(
        today
    );
}


function getNextDateString(
    dateValue
) {

    const parts =
        dateValue.split("-");


    if (parts.length !== 3) {

        return getTodayDateString();
    }


    const date =
        new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );


    date.setDate(
        date.getDate() + 1
    );


    return formatDateForInput(
        date
    );
}


function formatDateForInput(
    date
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;
}


function compareDates(
    firstDate,
    secondDate
) {

    if (firstDate > secondDate) {
        return 1;
    }


    if (firstDate < secondDate) {
        return -1;
    }


    return 0;
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