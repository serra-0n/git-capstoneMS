"use strict";

/* ResortHub client reservation form backed by the authenticated API. */

/* API ENDPOINTS */

const API_ENDPOINTS = {
    clientProfile: "/api/client/profile",

    resorts: "/api/resorts",

    accommodationsByResort(resortId, checkIn, checkOut) {
        const parameters = new URLSearchParams();

        if (checkIn && checkOut) {
            parameters.set("check_in", checkIn);

            parameters.set("check_out", checkOut);
        }

        const query = parameters.toString();

        return `/api/resorts/${encodeURIComponent(resortId)}/accommodations${
            query ? `?${query}` : ""
        }`;
    },

    unavailableDatesByAccommodation(accommodationId) {
        return `/api/accommodations/${encodeURIComponent(accommodationId)}/unavailable-dates`;
    },

    createReservation: "/api/client/reservations",
};

const accessToken = sessionStorage.getItem("resorthub_access_token");

if (!accessToken) {
    window.location.href = "../auth/login.html";
}

/* APPLICATION STATE */

const reservationState = {
    client: null,

    resorts: [],

    accommodations: [],

    selectedResort: null,

    selectedAccommodation: null,

    unavailableDateRanges: [],

    submitting: false,
};

/* DOM ELEMENTS */

const clientApp = document.getElementById("clientApp");

const sidebarToggle = document.getElementById("sidebarToggle");

const clientProfileButton = document.getElementById("clientProfileButton");

const clientDisplayName = document.getElementById("clientDisplayName");

/* Form */

const reservationForm = document.getElementById("reservationForm");

/* Resort and accommodation */

const resortId = document.getElementById("resortId");

const accommodationId = document.getElementById("accommodationId");

/* Selected accommodation */

const selectedAccommodation = document.getElementById("selectedAccommodation");

const accommodationEmptyState = document.getElementById("accommodationEmptyState");

const selectedAccommodationName = document.getElementById("selectedAccommodationName");

const selectedAccommodationAvailability = document.getElementById(
    "selectedAccommodationAvailability",
);

const selectedAccommodationType = document.getElementById("selectedAccommodationType");

const selectedAccommodationCapacity = document.getElementById("selectedAccommodationCapacity");

const selectedAccommodationPrice = document.getElementById("selectedAccommodationPrice");

const selectedAccommodationAmenities = document.getElementById("selectedAccommodationAmenities");

const selectedAccommodationImage = document.getElementById("selectedAccommodationImage");

const selectedAccommodationDescription = document.getElementById(
    "selectedAccommodationDescription",
);

const selectedResortName = document.getElementById("selectedResortName");

const selectedResortLocation = document.getElementById("selectedResortLocation");

/* Schedule */

const checkIn = document.getElementById("checkIn");

const checkOut = document.getElementById("checkOut");

const scheduleMessage = document.getElementById("scheduleMessage");

let checkInCalendar = null;

let checkOutCalendar = null;

/* Client information */

const clientName = document.getElementById("clientName");

const guestCount = document.getElementById("guestCount");

const contactNumber = document.getElementById("contactNumber");

const clientEmail = document.getElementById("clientEmail");

/* Reservation summary */

const summaryResort = document.getElementById("summaryResort");

const summaryAccommodation = document.getElementById("summaryAccommodation");

const summaryCheckIn = document.getElementById("summaryCheckIn");

const summaryCheckOut = document.getElementById("summaryCheckOut");

const summaryNights = document.getElementById("summaryNights");

const summaryTotal = document.getElementById("summaryTotal");

const summaryPaymentPlan = document.getElementById("summaryPaymentPlan");

const summaryInitialPayment = document.getElementById("summaryInitialPayment");

const fullPlanAmount = document.getElementById("fullPlanAmount");

const halfPlanAmount = document.getElementById("halfPlanAmount");

const paymentPlanInputs = document.querySelectorAll('input[name="payment_plan"]');

/* Submit */

const submitReservationButton = document.getElementById("submitReservationButton");

const reservationFormMessage = document.getElementById("reservationFormMessage");

/* PAGE INITIALIZATION */

document.addEventListener("DOMContentLoaded", initializeReservationPage);

async function initializeReservationPage() {
    initializeIcons();

    initializeSidebar();

    initializeProfileButton();

    initializeDateInputs();

    initializeFormEvents();

    await loadInitialApiData();
}

async function loadInitialApiData() {
    try {
        const [clientResponse, resortsResponse] = await Promise.all([
            fetch(API_ENDPOINTS.clientProfile, {
                method: "GET",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            }),

            fetch(API_ENDPOINTS.resorts, {
                method: "GET",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            }),
        ]);

        if (!clientResponse.ok) {
            throw new Error("Unable to load client information.");
        }

        if (!resortsResponse.ok) {
            throw new Error("Unable to load resorts.");
        }

        const clientData = await clientResponse.json();

        const resortsData = await resortsResponse.json();

        reservationState.client = normalizeClient(clientData);

        reservationState.resorts = normalizeResorts(resortsData);

        renderClient();

        populateClientInformation();

        renderResortOptions();

        resetAccommodationSelection();

        if (submitReservationButton) submitReservationButton.disabled = true;

        await applyReservationSelectionFromUrl();

        renderReservationSummary();
    } catch (error) {
        console.error("Reservation page API error:", error);

        showFormMessage("Unable to load reservation information.", "error");
    }
}

/* NORMALIZE CLIENT DATA */

function normalizeClient(data) {
    const client = data?.client || data;

    if (!client || typeof client !== "object") {
        return null;
    }

    return {
        id: client.id ?? null,

        name: client.name || client.full_name || "",

        email: client.email || "",

        contact_number: client.contact_number || client.phone || "",
    };
}

/* NORMALIZE RESORT DATA */

function normalizeResorts(data) {
    const resorts = Array.isArray(data) ? data : data?.resorts;

    if (!Array.isArray(resorts)) {
        return [];
    }

    return resorts.map((resort) => ({
        id: resort.id ?? null,

        name: resort.name || resort.resort_name || "",

        type: resort.resort_type || "",

        location: resort.location || "",

        description: resort.description || "",

        cover_image_path: resort.cover_image_path || "",
    }));
}

/* NORMALIZE ACCOMMODATION DATA */

function normalizeAccommodations(data) {
    const accommodations = Array.isArray(data) ? data : data?.accommodations;

    if (!Array.isArray(accommodations)) {
        return [];
    }

    return accommodations.map((accommodation) => ({
        id: accommodation.id ?? null,

        resort_id: accommodation.resort_id ?? null,

        name: accommodation.name || accommodation.accommodation_name || "",

        type: accommodation.type || accommodation.accommodation_type || "",

        capacity: accommodation.capacity ?? "",

        amenities: Array.isArray(accommodation.amenities) ? accommodation.amenities : [],

        description: accommodation.description || "",

        image_path: accommodation.image_path || "",

        price: accommodation.price ?? null,

        availability: accommodation.availability || accommodation.status || "",
    }));
}

/* CLIENT DISPLAY */

function renderClient() {
    if (!clientDisplayName) {
        return;
    }

    clientDisplayName.textContent = reservationState.client?.name || "Client";
}

/* POPULATE CLIENT INFORMATION */

function populateClientInformation() {
    const client = reservationState.client;

    if (!client) {
        return;
    }

    if (clientName) {
        clientName.value = client.name || "";
    }

    if (contactNumber) {
        contactNumber.value = client.contact_number || "";
    }

    if (clientEmail) {
        clientEmail.value = client.email || "";
    }
}

/* RESORT OPTIONS */

function renderResortOptions() {
    if (!resortId) {
        return;
    }

    resortId.innerHTML = "";

    const defaultOption = document.createElement("option");

    defaultOption.value = "";

    defaultOption.textContent = "Select a resort";

    resortId.appendChild(defaultOption);

    reservationState.resorts.forEach((resort) => {
        const option = document.createElement("option");

        option.value = String(resort.id);

        option.textContent = resort.name;

        resortId.appendChild(option);
    });
}

async function applyReservationSelectionFromUrl() {
    const parameters = new URLSearchParams(window.location.search);
    const requestedResortId = parameters.get("resort");
    const requestedAccommodationId = parameters.get("accommodation");

    if (!requestedResortId || !requestedAccommodationId) {
        if (submitReservationButton) submitReservationButton.disabled = true;
        return;
    }

    const resort = reservationState.resorts.find(
        (item) => String(item.id) === String(requestedResortId),
    );

    if (!resort) {
        showFormMessage("The selected resort is no longer available. Please choose another stay.", "error");
        return;
    }

    reservationState.selectedResort = resort;
    resortId.value = String(resort.id);
    await loadAccommodations(resort.id);

    const accommodation = reservationState.accommodations.find(
        (item) => String(item.id) === String(requestedAccommodationId),
    );

    if (!accommodation) {
        showFormMessage(
            "The selected room or cottage is no longer available. Please choose another stay.",
            "error",
        );
        reservationState.selectedResort = null;
        return;
    }

    reservationState.selectedAccommodation = accommodation;
    accommodationId.value = String(accommodation.id);
    renderSelectedAccommodation();
    renderReservationSummary();
    await loadUnavailableDateRanges(accommodation.id);
    if (submitReservationButton) submitReservationButton.disabled = false;
}

/* RESORT CHANGE */

async function handleResortChange() {
    const selectedResortId = resortId?.value || "";

    reservationState.selectedResort =
        reservationState.resorts.find((resort) => String(resort.id) === String(selectedResortId)) ||
        null;

    reservationState.selectedAccommodation = null;

    resetAvailabilityCalendars();

    resetAccommodationSelection();

    renderReservationSummary();

    if (!selectedResortId) {
        return;
    }

    await loadAccommodations(selectedResortId);
}

/* LOAD ACCOMMODATIONS */

async function loadAccommodations(selectedResortId) {
    setAccommodationSelectDisabled(true);

    try {
        const response = await fetch(
            API_ENDPOINTS.accommodationsByResort(
                selectedResortId,
                checkIn?.value || "",
                checkOut?.value || "",
            ),
            {
                method: "GET",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        );

        if (!response.ok) {
            throw new Error("Unable to load accommodations.");
        }

        const data = await response.json();

        reservationState.accommodations = normalizeAccommodations(data);

        renderAccommodationOptions();
    } catch (error) {
        console.error("Accommodation API error:", error);

        reservationState.accommodations = [];

        renderAccommodationOptions();

        showFormMessage("Unable to load accommodations for the selected resort.", "error");
    } finally {
        setAccommodationSelectDisabled(false);
    }
}

/* ACCOMMODATION OPTIONS */

function renderAccommodationOptions() {
    if (!accommodationId) {
        return;
    }

    accommodationId.innerHTML = "";

    const defaultOption = document.createElement("option");

    defaultOption.value = "";

    defaultOption.textContent =
        reservationState.accommodations.length > 0
            ? "Select an accommodation"
            : checkIn?.value && checkOut?.value
              ? "No accommodations available for these dates"
              : "No accommodations available";

    accommodationId.appendChild(defaultOption);

    reservationState.accommodations.forEach((accommodation) => {
        const option = document.createElement("option");

        option.value = String(accommodation.id);

        option.textContent = accommodation.name;

        accommodationId.appendChild(option);
    });

    accommodationId.disabled = reservationState.accommodations.length === 0;
}

/* ACCOMMODATION CHANGE */

async function handleAccommodationChange() {
    const selectedAccommodationId = accommodationId?.value || "";

    reservationState.selectedAccommodation =
        reservationState.accommodations.find(
            (accommodation) => String(accommodation.id) === String(selectedAccommodationId),
        ) || null;

    resetAvailabilityCalendars();

    renderSelectedAccommodation();

    renderReservationSummary();

    if (!selectedAccommodationId) {
        return;
    }

    await loadUnavailableDateRanges(selectedAccommodationId);
}

async function loadUnavailableDateRanges(selectedAccommodationId) {
    clearScheduleMessage();

    setCheckInCalendarEnabled(false);

    try {
        const response = await fetch(
            API_ENDPOINTS.unavailableDatesByAccommodation(selectedAccommodationId),
            {
                method: "GET",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        );

        const data = await readJsonResponse(response);

        if (!response.ok) {
            throw new Error(data?.message || "Unable to load unavailable dates.");
        }

        reservationState.unavailableDateRanges = normalizeUnavailableDateRanges(data);

        refreshAvailabilityCalendars();
        setCheckInCalendarEnabled(true);
    } catch (error) {
        console.error("Unavailable date API error:", error);

        reservationState.unavailableDateRanges = [];
        refreshAvailabilityCalendars();

        showScheduleMessage(error.message || "Unable to load unavailable dates.", "error");
    }
}

function normalizeUnavailableDateRanges(data) {
    const ranges = Array.isArray(data) ? data : data?.unavailable_ranges;

    if (!Array.isArray(ranges)) {
        return [];
    }

    return ranges
        .map((range) => ({
            check_in: String(range?.check_in || "").slice(0, 10),

            check_out: String(range?.check_out || "").slice(0, 10),
        }))
        .filter(
            (range) =>
                /^\d{4}-\d{2}-\d{2}$/.test(range.check_in) &&
                /^\d{4}-\d{2}-\d{2}$/.test(range.check_out) &&
                range.check_out > range.check_in,
        );
}

/* SELECTED ACCOMMODATION */

function renderSelectedAccommodation() {
    const accommodation = reservationState.selectedAccommodation;

    if (!accommodation) {
        resetSelectedAccommodationDisplay();

        return;
    }

    if (selectedAccommodation) {
        selectedAccommodation.hidden = false;
    }

    if (accommodationEmptyState) {
        accommodationEmptyState.hidden = true;
    }

    setText(selectedAccommodationName, accommodation.name);

    setText(selectedAccommodationAvailability, accommodation.availability);

    setText(selectedAccommodationType, accommodation.type);

    setText(
        selectedAccommodationCapacity,
        `${formatCapacity(accommodation.capacity)} ${Number(accommodation.capacity) === 1 ? "guest" : "guests"}`,
    );

    setText(selectedAccommodationPrice, formatCurrency(accommodation.price));

    setText(selectedResortName, reservationState.selectedResort?.name);

    setText(selectedResortLocation, reservationState.selectedResort?.location || "Location available soon");

    setText(
        selectedAccommodationDescription,
        accommodation.description ||
            `A ${String(accommodation.type || "stay").toLowerCase()} at ${reservationState.selectedResort?.name || "the selected resort"}.`,
    );

    if (selectedAccommodationImage) {
        selectedAccommodationImage.src = accommodation.image_path || "../../assets/images/accommodation-fallback.png";
        selectedAccommodationImage.alt = `${accommodation.name || "Accommodation"} photo`;
        selectedAccommodationImage.onerror = () => {
            selectedAccommodationImage.onerror = null;
            selectedAccommodationImage.src = "../../assets/images/accommodation-fallback.png";
        };
    }

    renderAmenityChips(accommodation.amenities);

    if (guestCount) {
        const capacity = Number(accommodation.capacity);
        if (Number.isInteger(capacity) && capacity > 0) {
            guestCount.max = String(capacity);
            if (Number(guestCount.value) > capacity) guestCount.value = String(capacity);
        }
    }

    initializeIcons();
}

function renderAmenityChips(amenities) {
    if (!selectedAccommodationAmenities) return;
    selectedAccommodationAmenities.replaceChildren();
    const items = Array.isArray(amenities) && amenities.length
        ? amenities
        : ["Amenity details available on request"];

    items.forEach((amenity) => {
        const item = document.createElement("span");
        const icon = document.createElement("i");
        icon.setAttribute("data-lucide", "check");
        item.append(icon, document.createTextNode(String(amenity)));
        selectedAccommodationAmenities.appendChild(item);
    });
}

/* RESET ACCOMMODATION */

function resetAccommodationSelection() {
    reservationState.accommodations = [];

    reservationState.selectedAccommodation = null;

    if (accommodationId) {
        accommodationId.innerHTML = '<option value="">Select a resort first</option>';

        accommodationId.disabled = true;
    }

    resetSelectedAccommodationDisplay();
}

function resetSelectedAccommodationDisplay() {
    if (selectedAccommodation) {
        selectedAccommodation.hidden = true;
    }

    if (accommodationEmptyState) {
        accommodationEmptyState.hidden = false;
    }

    setText(selectedAccommodationName, "—");

    setText(selectedAccommodationAvailability, "—");

    setText(selectedAccommodationType, "—");

    setText(selectedAccommodationCapacity, "—");

    setText(selectedAccommodationPrice, "—");

    if (selectedAccommodationAmenities) selectedAccommodationAmenities.replaceChildren();

    setText(selectedResortName, "—");

    setText(selectedResortLocation, "—");

    setText(selectedAccommodationDescription, "");

    if (guestCount) guestCount.removeAttribute("max");
}

/* ENABLE / DISABLE ACCOMMODATION SELECT */

function setAccommodationSelectDisabled(disabled) {
    if (!accommodationId) {
        return;
    }

    accommodationId.disabled = disabled;
}

/* DATE INPUTS */

function initializeDateInputs() {
    const today = getTodayDateString();

    if (typeof flatpickr !== "function") {
        if (checkIn) {
            checkIn.min = today;
            checkIn.disabled = true;
        }

        if (checkOut) {
            checkOut.min = today;
            checkOut.disabled = true;
        }

        return;
    }

    checkInCalendar = flatpickr(checkIn, {
        altInput: true,
        altFormat: "m/d/Y",
        dateFormat: "Y-m-d",
        minDate: today,
        disableMobile: true,
        disable: [isCheckInDateUnavailable],
        onDayCreate: markUnavailableCalendarDate,
        onChange: handleCheckInCalendarChange,
    });

    checkOutCalendar = flatpickr(checkOut, {
        altInput: true,
        altFormat: "m/d/Y",
        dateFormat: "Y-m-d",
        minDate: today,
        disableMobile: true,
        disable: [isCheckOutDateUnavailable],
        onDayCreate: markUnavailableCalendarDate,
        onChange: handleCheckOutCalendarChange,
    });

    setCheckInCalendarEnabled(false);
}

function handleCheckInCalendarChange() {
    if (checkOutCalendar) {
        checkOutCalendar.clear(false);
    } else if (checkOut) {
        checkOut.value = "";
    }

    updateCheckOutMinimum();
    refreshCheckOutCalendar();
    handleScheduleChange();
}

function handleCheckOutCalendarChange() {
    handleScheduleChange();
}

function resetAvailabilityCalendars() {
    reservationState.unavailableDateRanges = [];

    if (checkInCalendar) {
        checkInCalendar.clear(false);
    } else if (checkIn) {
        checkIn.value = "";
    }

    if (checkOutCalendar) {
        checkOutCalendar.clear(false);
    } else if (checkOut) {
        checkOut.value = "";
    }

    refreshAvailabilityCalendars();
    setCheckInCalendarEnabled(false);
    renderReservationSummary();
}

function refreshAvailabilityCalendars() {
    if (checkInCalendar) {
        checkInCalendar.set("disable", [isCheckInDateUnavailable]);
    }

    refreshCheckOutCalendar();
}

function refreshCheckOutCalendar() {
    const hasCheckIn = Boolean(checkIn?.value);

    if (checkOutCalendar) {
        checkOutCalendar.set(
            "minDate",
            hasCheckIn ? getNextDateString(checkIn.value) : getTodayDateString(),
        );

        checkOutCalendar.set("disable", [isCheckOutDateUnavailable]);
    }

    setCheckOutCalendarEnabled(hasCheckIn);
}

function setCheckInCalendarEnabled(enabled) {
    setCalendarEnabled(checkInCalendar, checkIn, enabled);

    setCheckOutCalendarEnabled(enabled && Boolean(checkIn?.value));
}

function setCheckOutCalendarEnabled(enabled) {
    setCalendarEnabled(checkOutCalendar, checkOut, enabled);
}

function setCalendarEnabled(calendar, input, enabled) {
    if (calendar) {
        calendar.set("clickOpens", enabled);

        if (calendar.altInput) {
            calendar.altInput.disabled = !enabled;
        }

        return;
    }

    if (input) {
        input.disabled = !enabled;
    }
}

function isCheckInDateUnavailable(date) {
    const dateValue = formatDateForInput(date);

    return reservationState.unavailableDateRanges.some(
        (range) => range.check_in <= dateValue && dateValue < range.check_out,
    );
}

function markUnavailableCalendarDate(selectedDates, dateText, calendar, dayElement) {
    if (!isCheckInDateUnavailable(dayElement.dateObj)) {
        return;
    }

    dayElement.classList.add("booked-date");
    dayElement.title = "Unavailable";
}

function isCheckOutDateUnavailable(date) {
    const selectedCheckIn = checkIn?.value || "";

    if (!selectedCheckIn) {
        return false;
    }

    const candidateCheckOut = formatDateForInput(date);

    return reservationState.unavailableDateRanges.some(
        (range) => range.check_in < candidateCheckOut && range.check_out > selectedCheckIn,
    );
}

/* SCHEDULE CHANGE */

function handleScheduleChange() {
    updateCheckOutMinimum();
    validateSchedule();
    renderReservationSummary();
}

/* UPDATE CHECK-OUT MINIMUM */

function updateCheckOutMinimum() {
    if (!checkIn || !checkOut) {
        return;
    }

    if (!checkIn.value) {
        checkOut.min = getTodayDateString();

        return;
    }

    checkOut.min = getNextDateString(checkIn.value);
}

/* VALIDATE SCHEDULE */

function validateSchedule() {
    clearScheduleMessage();

    const checkInValue = checkIn?.value || "";

    const checkOutValue = checkOut?.value || "";

    if (!checkInValue || !checkOutValue) {
        return true;
    }

    if (compareDates(checkOutValue, checkInValue) <= 0) {
        showScheduleMessage("Check-out date must be after the check-in date.", "error");

        return false;
    }

    return true;
}

/* RESERVATION SUMMARY */

function renderReservationSummary() {
    setText(summaryResort, reservationState.selectedResort?.name);

    setText(summaryAccommodation, reservationState.selectedAccommodation?.name);

    setText(summaryCheckIn, checkIn?.value ? formatDate(checkIn.value) : "—");

    setText(summaryCheckOut, checkOut?.value ? formatDate(checkOut.value) : "—");

    const pricing = getReservationPricing();

    setText(summaryNights, pricing.nights > 0 ? pricing.nights : "—");
    setText(summaryTotal, pricing.total > 0 ? formatCurrency(pricing.total) : "—");
    setText(fullPlanAmount, pricing.total > 0 ? formatCurrency(pricing.total) : "—");
    setText(halfPlanAmount, pricing.total > 0 ? formatCurrency(pricing.total * 0.5) : "—");

    const labels = {
        full: "Pay in full",
        half: "Pay 50% deposit",
        later: "Pay later",
    };

    setText(summaryPaymentPlan, labels[pricing.paymentPlan]);
    setText(
        summaryInitialPayment,
        pricing.paymentPlan === "later"
            ? "Due after resort approval"
            : pricing.initialAmount > 0
                ? formatCurrency(pricing.initialAmount)
                : "—",
    );
}

function getReservationPricing() {
    const nightlyRate = Number(reservationState.selectedAccommodation?.price || 0);
    const nights = calculateNights(checkIn?.value, checkOut?.value);
    const total = nightlyRate > 0 && nights > 0 ? nightlyRate * nights : 0;
    const paymentPlan =
        document.querySelector('input[name="payment_plan"]:checked')?.value || "half";
    const initialAmount = paymentPlan === "half" ? total * 0.5 : paymentPlan === "full" ? total : 0;

    return { nightlyRate, nights, total, paymentPlan, initialAmount };
}

function calculateNights(checkInValue, checkOutValue) {
    if (!checkInValue || !checkOutValue || checkOutValue <= checkInValue) return 0;

    const start = new Date(`${checkInValue}T00:00:00Z`);
    const end = new Date(`${checkOutValue}T00:00:00Z`);
    const nights = Math.round((end - start) / 86400000);

    return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

/* FORM EVENTS */

function initializeFormEvents() {
    if (resortId) {
        resortId.addEventListener("change", handleResortChange);
    }

    if (accommodationId) {
        accommodationId.addEventListener("change", handleAccommodationChange);
    }

    if (!checkInCalendar && checkIn) {
        checkIn.addEventListener("change", handleScheduleChange);
    }

    if (!checkOutCalendar && checkOut) {
        checkOut.addEventListener("change", handleScheduleChange);
    }

    paymentPlanInputs.forEach((input) => input.addEventListener("change", renderReservationSummary));

    if (reservationForm) {
        reservationForm.addEventListener("submit", handleReservationSubmit);
    }
}

/* SUBMIT RESERVATION */

async function handleReservationSubmit(event) {
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
        showFormMessage("Please select a resort.", "error");
        return;
    }

    if (!reservationState.selectedAccommodation) {
        showFormMessage("Please select an accommodation.", "error");

        return;
    }

    if (!validateSchedule()) {
        return;
    }

    const payload = buildReservationPayload();

    await submitReservation(payload);
}

/* BUILD DATABASE-READY PAYLOAD */

function buildReservationPayload() {
    return {
        /*
         * The backend should ultimately determine the
         * authenticated client from the login session.
         */
        client_id: reservationState.client?.id ?? null,

        resort_id: reservationState.selectedResort?.id ?? null,

        accommodation_id: reservationState.selectedAccommodation?.id ?? null,

        guest_count: Number(guestCount?.value || 1),

        check_in: checkIn?.value || null,

        check_out: checkOut?.value || null,

        client_name: clientName?.value.trim() || "",

        contact_number: contactNumber?.value.trim() || "",

        client_email: clientEmail?.value.trim() || "",

        payment_plan:
            document.querySelector('input[name="payment_plan"]:checked')?.value || "half",
    };
}

/* POST RESERVATION TO API */

async function submitReservation(payload) {
    setSubmittingState(true);

    try {
        const response = await fetch(API_ENDPOINTS.createReservation, {
            method: "POST",
            credentials: "include",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await readJsonResponse(response);

        if (!response.ok) {
            throw new Error(data?.message || "Unable to submit reservation.");
        }

        showFormMessage(data?.message || "Reservation request submitted successfully.", "success");

        /*Navigate only if the backend actually
          returns a database reservation ID. */
        const reservationId = data?.reservation?.id ?? data?.reservation_id ?? data?.id ?? null;

        if (reservationId !== null) {
            window.location.href = `ReservationStatus.html?id=${encodeURIComponent(reservationId)}`;
        }
    } catch (error) {
        console.error("Reservation submission error:", error);

        showFormMessage(error.message || "Unable to submit reservation.", "error");
    } finally {
        setSubmittingState(false);
    }
}
/* SUBMITTING STATE */

function setSubmittingState(submitting) {
    reservationState.submitting = submitting;

    if (!submitReservationButton) {
        return;
    }

    submitReservationButton.disabled = submitting;

    submitReservationButton.setAttribute("aria-busy", String(submitting));

    const textElement = submitReservationButton.querySelector("span");

    if (textElement) {
        textElement.textContent = submitting ? "Submitting..." : "Submit Reservation";
    }
}
/*JSON RESPONSE*/

async function readJsonResponse(response) {
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }
    return null;
}
/*FORM MESSAGE*/

function showFormMessage(message, type = "info") {
    if (!reservationFormMessage) {
        return;
    }

    reservationFormMessage.hidden = false;
    reservationFormMessage.textContent = message;

    reservationFormMessage.classList.remove("success", "error", "info");

    reservationFormMessage.classList.add(type);
}

function clearFormMessage() {
    if (!reservationFormMessage) {
        return;
    }

    reservationFormMessage.hidden = true;
    reservationFormMessage.textContent = "";

    reservationFormMessage.classList.remove("success", "error", "info");
}

/*SCHEDULE MESSAGE*/

function showScheduleMessage(message, type = "error") {
    if (!scheduleMessage) {
        return;
    }

    scheduleMessage.hidden = false;
    scheduleMessage.textContent = message;

    scheduleMessage.classList.remove("success", "error", "info");
    scheduleMessage.classList.add(type);
}

function clearScheduleMessage() {
    if (!scheduleMessage) {
        return;
    }

    scheduleMessage.hidden = true;
    scheduleMessage.textContent = "";

    scheduleMessage.classList.remove("success", "error", "info");
}
/*GENERIC TEXT SETTER*/

function setText(element, value) {
    if (!element) {
        return;
    }

    const text = value === null || value === undefined || value === "" ? "—" : String(value);

    element.textContent = text;
}
/*FORMAT PRICE*/

function formatCurrency(value) {
    const numericValue = Number(value);

    if (value === null || value === undefined || Number.isNaN(numericValue)) {
        return "—";
    }

    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(numericValue);
}
/*FORMAT CAPACITY*/

function formatCapacity(capacity) {
    if (capacity === null || capacity === undefined || capacity === "") {
        return "—";
    }
    return String(capacity);
}
/*FORMAT AMENITIES*/

function formatAmenities(amenities) {
    if (!Array.isArray(amenities) || amenities.length === 0) {
        return "—";
    }
    return amenities.join(", ");
}
/*FORMAT DATE*/

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const dateString = String(value).slice(0, 10);

    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(date);
}
/*DATE HELPERS*/
function getTodayDateString() {
    const today = new Date();
    return formatDateForInput(today);
}

function getNextDateString(dateValue) {
    const parts = dateValue.split("-");

    if (parts.length !== 3) {
        return getTodayDateString();
    }

    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

    date.setDate(date.getDate() + 1);
    return formatDateForInput(date);
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function compareDates(firstDate, secondDate) {
    if (firstDate > secondDate) {
        return 1;
    }

    if (firstDate < secondDate) {
        return -1;
    }
    return 0;
}
/*SIDEBAR*/

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

    const isCollapsed = clientApp.classList.contains("sidebar-collapsed");

    sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
}
/*PROFILE BUTTON*/

function initializeProfileButton() {
    if (!clientProfileButton) {
        return;
    }

    clientProfileButton.addEventListener("click", () => {
        window.location.href = "Profile.html";
    });
}
/*LUCIDE ICONS*/

function initializeIcons() {
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons();
    }
}
