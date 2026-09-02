"use strict";

/* =========================================================
   RESORTHUB - CLIENT RESORTS
   File: js/client/Resorts.js

   true  = frontend demo data
   false = Express/MySQL API
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
    }
};


/* =========================================================
   DUMMY CLIENT
   Same structure expected from database/API later.
   ========================================================= */

const DUMMY_CLIENT = {
    id: 1,
    name: "Juan Dela Cruz"
};


/* =========================================================
   DUMMY RESORTS

   Sample frontend records only.
   These are NOT actual resorts from the research.

   Database-ready fields:
   id
   name
   ========================================================= */

const DUMMY_RESORTS = [
    {
        id: 1,
        name: "Azure Garden Resort"
    },
    {
        id: 2,
        name: "Palm Breeze Resort"
    },
    {
        id: 3,
        name: "Serenity Springs Resort"
    }
];


/* =========================================================
   DUMMY ACCOMMODATIONS

   Sample frontend records only.

   Database-ready fields:
   id
   resort_id
   name
   type
   capacity
   amenities
   price
   availability
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
            "Private Bathroom",
            "Television"
        ],
        price: 3500.00,
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
        price: 2500.00,
        availability: "Available"
    },

    {
        id: 201,
        resort_id: 2,
        name: "Standard Room",
        type: "Room",
        capacity: 2,
        amenities: [
            "Air Conditioning",
            "Private Bathroom"
        ],
        price: 2200.00,
        availability: "Available"
    },

    {
        id: 202,
        resort_id: 2,
        name: "Family Cottage",
        type: "Cottage",
        capacity: 8,
        amenities: [
            "Table",
            "Seating Area",
            "Electric Fan"
        ],
        price: 4000.00,
        availability: "Available"
    },

    {
        id: 301,
        resort_id: 3,
        name: "Deluxe Room",
        type: "Room",
        capacity: 4,
        amenities: [
            "Air Conditioning",
            "Private Bathroom",
            "Television"
        ],
        price: 4200.00,
        availability: "Available"
    },

    {
        id: 302,
        resort_id: 3,
        name: "Group Cottage",
        type: "Cottage",
        capacity: 10,
        amenities: [
            "Table",
            "Seating Area",
            "Electric Fan"
        ],
        price: 4500.00,
        availability: "Available"
    }
];


/* =========================================================
   APPLICATION STATE

   This structure stays the same whether the data comes
   from dummy arrays or MySQL.
   ========================================================= */

const resortsState = {
    client: null,
    resorts: [],
    accommodations: [],
    selectedResort: null,
    selectedAccommodation: null
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

const resortList =
    document.getElementById("resortList");

const resortsEmptyState =
    document.getElementById("resortsEmptyState");

const selectedResortSection =
    document.getElementById("selectedResortSection");

const selectedResortName =
    document.getElementById("selectedResortName");

const accommodationList =
    document.getElementById("accommodationList");

const accommodationsEmptyState =
    document.getElementById("accommodationsEmptyState");

const accommodationDetailCard =
    document.getElementById("accommodationDetailCard");

const accommodationDetailName =
    document.getElementById("accommodationDetailName");

const accommodationDetailAvailability =
    document.getElementById("accommodationDetailAvailability");

const accommodationDetailType =
    document.getElementById("accommodationDetailType");

const accommodationDetailCapacity =
    document.getElementById("accommodationDetailCapacity");

const accommodationDetailPrice =
    document.getElementById("accommodationDetailPrice");

const accommodationDetailStatus =
    document.getElementById("accommodationDetailStatus");

const accommodationDetailAmenities =
    document.getElementById("accommodationDetailAmenities");

const reserveAccommodationButton =
    document.getElementById("reserveAccommodationButton");


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeResortsPage
);


async function initializeResortsPage() {

    initializeIcons();

    initializeSidebar();

    initializeProfileButton();


    if (USE_DUMMY_DATA) {

        loadDummyData();

        return;
    }


    await loadDatabaseData();
}


/* =========================================================
   DUMMY DATA MODE
   ========================================================= */

function loadDummyData() {

    resortsState.client = {
        ...DUMMY_CLIENT
    };


    resortsState.resorts =
        DUMMY_RESORTS.map(
            resort => ({
                ...resort
            })
        );


    renderClient();

    renderResorts();
}


/* =========================================================
   DATABASE / API MODE
   ========================================================= */

async function loadDatabaseData() {

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


        resortsState.client =
            clientData.client || clientData;


        resortsState.resorts =
            Array.isArray(resortsData)
                ? resortsData
                : resortsData.resorts || [];


        renderClient();

        renderResorts();


    } catch (error) {

        console.error(
            "Unable to load resorts:",
            error
        );


        resortsState.resorts = [];

        renderResorts();
    }
}


/* =========================================================
   CLIENT
   ========================================================= */

function renderClient() {

    if (!clientDisplayName) {
        return;
    }


    clientDisplayName.textContent =
        resortsState.client?.name ||
        "Client";
}


/* =========================================================
   RESORT LIST
   ========================================================= */

function renderResorts() {

    if (!resortList) {
        return;
    }


    resortList.innerHTML = "";


    if (
        resortsState.resorts.length === 0
    ) {

        if (resortsEmptyState) {
            resortsEmptyState.hidden = false;
        }

        return;
    }


    if (resortsEmptyState) {
        resortsEmptyState.hidden = true;
    }


    resortsState.resorts.forEach(
        resort => {

            resortList.appendChild(
                createResortCard(resort)
            );
        }
    );


    initializeIcons();
}


/* =========================================================
   CREATE RESORT CARD
   ========================================================= */

function createResortCard(resort) {

    const card =
        document.createElement("article");


    card.className =
        "resort-card";


    card.dataset.resortId =
        String(resort.id);


    const header =
        document.createElement("div");

    header.className =
        "resort-card-header";


    const icon =
        document.createElement("span");

    icon.className =
        "resort-card-icon";

    icon.innerHTML =
        '<i data-lucide="building-2"></i>';


    const title =
        document.createElement("div");

    title.className =
        "resort-card-title";


    const heading =
        document.createElement("h3");

    heading.textContent =
        resort.name;


    title.appendChild(heading);

    header.appendChild(icon);

    header.appendChild(title);


    const body =
        document.createElement("div");

    body.className =
        "resort-card-body";


    const description =
        document.createElement("p");

    description.className =
        "resort-card-description";

    description.textContent =
        "View available rooms and cottages for this resort.";


    const actions =
        document.createElement("div");

    actions.className =
        "resort-card-actions";


    const button =
        document.createElement("button");

    button.type =
        "button";

    button.className =
        "resort-view-button";

    button.innerHTML = `
        <i data-lucide="eye"></i>
        <span>View Accommodations</span>
    `;


    button.addEventListener(
        "click",
        () => selectResort(resort)
    );


    actions.appendChild(button);

    body.appendChild(description);

    body.appendChild(actions);

    card.appendChild(header);

    card.appendChild(body);


    return card;
}


/* =========================================================
   SELECT RESORT
   ========================================================= */

async function selectResort(resort) {

    resortsState.selectedResort =
        resort;


    resortsState.selectedAccommodation =
        null;


    updateSelectedResortCard();


    if (selectedResortName) {

        selectedResortName.textContent =
            resort.name;
    }


    if (selectedResortSection) {

        selectedResortSection.hidden =
            false;
    }


    resetAccommodationDetail();


    await loadAccommodations(
        resort.id
    );
}


/* =========================================================
   LOAD ACCOMMODATIONS
   ========================================================= */

async function loadAccommodations(
    resortId
) {

    if (USE_DUMMY_DATA) {

        resortsState.accommodations =
            DUMMY_ACCOMMODATIONS.filter(
                accommodation =>
                    String(
                        accommodation.resort_id
                    ) ===
                    String(resortId)
            );


        renderAccommodations();

        return;
    }


    try {

        const response =
            await fetch(
                API_ENDPOINTS.accommodationsByResort(
                    resortId
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


        resortsState.accommodations =
            Array.isArray(data)
                ? data
                : data.accommodations || [];


        renderAccommodations();


    } catch (error) {

        console.error(
            "Unable to load accommodations:",
            error
        );


        resortsState.accommodations =
            [];


        renderAccommodations();
    }
}


/* =========================================================
   RENDER ACCOMMODATIONS
   ========================================================= */

function renderAccommodations() {

    if (!accommodationList) {
        return;
    }


    accommodationList.innerHTML =
        "";


    if (
        resortsState.accommodations.length === 0
    ) {

        if (accommodationsEmptyState) {

            accommodationsEmptyState.hidden =
                false;
        }


        return;
    }


    if (accommodationsEmptyState) {

        accommodationsEmptyState.hidden =
            true;
    }


    resortsState.accommodations.forEach(
        accommodation => {

            accommodationList.appendChild(
                createAccommodationCard(
                    accommodation
                )
            );
        }
    );


    initializeIcons();
}


/* =========================================================
   CREATE ACCOMMODATION CARD
   ========================================================= */

function createAccommodationCard(
    accommodation
) {

    const card =
        document.createElement("article");


    card.className =
        "accommodation-card";


    card.dataset.accommodationId =
        String(accommodation.id);


    const header =
        document.createElement("div");

    header.className =
        "accommodation-card-header";


    const headingWrapper =
        document.createElement("div");

    headingWrapper.className =
        "accommodation-card-heading";


    const icon =
        document.createElement("span");

    icon.className =
        "accommodation-card-icon";


    if (
        String(accommodation.type)
            .toLowerCase() ===
        "cottage"
    ) {

        icon.innerHTML =
            '<i data-lucide="house"></i>';

    } else {

        icon.innerHTML =
            '<i data-lucide="bed-double"></i>';
    }


    const titleWrapper =
        document.createElement("div");

    titleWrapper.className =
        "accommodation-card-title";


    const heading =
        document.createElement("h3");

    heading.textContent =
        accommodation.name;


    const type =
        document.createElement("span");

    type.textContent =
        accommodation.type || "—";


    titleWrapper.appendChild(heading);

    titleWrapper.appendChild(type);

    headingWrapper.appendChild(icon);

    headingWrapper.appendChild(titleWrapper);


    const availability =
        document.createElement("span");


    applyAvailabilityBadge(
        availability,
        accommodation.availability
    );


    header.appendChild(
        headingWrapper
    );

    header.appendChild(
        availability
    );


    const body =
        document.createElement("div");

    body.className =
        "accommodation-card-body";


    const info =
        document.createElement("div");

    info.className =
        "accommodation-card-info";


    info.appendChild(
        createInformationRow(
            "Capacity",
            formatCapacity(
                accommodation.capacity
            )
        )
    );


    info.appendChild(
        createInformationRow(
            "Price",
            formatCurrency(
                accommodation.price
            )
        )
    );


    const actions =
        document.createElement("div");

    actions.className =
        "accommodation-card-actions";


    const button =
        document.createElement("button");

    button.type =
        "button";

    button.className =
        "accommodation-view-button";

    button.innerHTML = `
        <i data-lucide="eye"></i>
        <span>View Details</span>
    `;


    button.addEventListener(
        "click",
        () => {

            selectAccommodation(
                accommodation
            );
        }
    );


    actions.appendChild(button);

    body.appendChild(info);

    body.appendChild(actions);

    card.appendChild(header);

    card.appendChild(body);


    return card;
}


/* =========================================================
   INFORMATION ROW
   ========================================================= */

function createInformationRow(
    label,
    value
) {

    const row =
        document.createElement("div");


    row.className =
        "accommodation-card-info-row";


    const labelElement =
        document.createElement("span");


    labelElement.textContent =
        label;


    const valueElement =
        document.createElement("strong");


    valueElement.textContent =
        value;


    row.appendChild(
        labelElement
    );


    row.appendChild(
        valueElement
    );


    return row;
}


/* =========================================================
   SELECT ACCOMMODATION
   ========================================================= */

function selectAccommodation(
    accommodation
) {

    resortsState.selectedAccommodation =
        accommodation;


    updateSelectedAccommodationCard();

    renderAccommodationDetail();
}


/* =========================================================
   DETAIL PANEL
   ========================================================= */

function renderAccommodationDetail() {

    const accommodation =
        resortsState.selectedAccommodation;


    if (!accommodation) {
        return;
    }


    if (accommodationDetailCard) {

        accommodationDetailCard.hidden =
            false;
    }


    setText(
        accommodationDetailName,
        accommodation.name
    );


    setText(
        accommodationDetailType,
        accommodation.type
    );


    setText(
        accommodationDetailCapacity,
        formatCapacity(
            accommodation.capacity
        )
    );


    setText(
        accommodationDetailPrice,
        formatCurrency(
            accommodation.price
        )
    );


    setText(
        accommodationDetailStatus,
        accommodation.availability
    );


    setText(
        accommodationDetailAmenities,
        formatAmenities(
            accommodation.amenities
        )
    );


    applyAvailabilityBadge(
        accommodationDetailAvailability,
        accommodation.availability
    );


    updateReserveButton();


    initializeIcons();
}


/* =========================================================
   RESERVE BUTTON

   Uses database IDs instead of names.
   ========================================================= */

function updateReserveButton() {

    if (
        !reserveAccommodationButton ||
        !resortsState.selectedResort ||
        !resortsState.selectedAccommodation
    ) {

        return;
    }


    const resortId =
        encodeURIComponent(
            resortsState.selectedResort.id
        );


    const accommodationId =
        encodeURIComponent(
            resortsState.selectedAccommodation.id
        );


    reserveAccommodationButton.href =
        `Reservations.html?resort=${resortId}&accommodation=${accommodationId}`;
}


/* =========================================================
   SELECTED CARDS
   ========================================================= */

function updateSelectedResortCard() {

    document.querySelectorAll(
        ".resort-card"
    ).forEach(
        card => {

            card.classList.toggle(
                "selected",

                String(
                    card.dataset.resortId
                ) ===
                String(
                    resortsState.selectedResort?.id
                )
            );
        }
    );
}


function updateSelectedAccommodationCard() {

    document.querySelectorAll(
        ".accommodation-card"
    ).forEach(
        card => {

            card.classList.toggle(
                "selected",

                String(
                    card.dataset.accommodationId
                ) ===
                String(
                    resortsState.selectedAccommodation?.id
                )
            );
        }
    );
}


/* =========================================================
   RESET DETAIL
   ========================================================= */

function resetAccommodationDetail() {

    resortsState.selectedAccommodation =
        null;


    if (accommodationDetailCard) {

        accommodationDetailCard.hidden =
            true;
    }
}


/* =========================================================
   AVAILABILITY BADGE

   Presentation only.
   Availability itself comes from data/database.
   ========================================================= */

function applyAvailabilityBadge(
    element,
    availability
) {

    if (!element) {
        return;
    }


    const value =
        String(
            availability || ""
        ).trim();


    element.className =
        "status-badge";


    element.textContent =
        value || "—";


    if (
        value.toLowerCase() ===
        "available"
    ) {

        element.classList.add(
            "status-success"
        );

    } else {

        element.classList.add(
            "status-info"
        );
    }
}


/* =========================================================
   FORMAT VALUES
   ========================================================= */

function formatCapacity(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";
    }


    return String(value);
}


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


function formatCurrency(
    value
) {

    const amount =
        Number(value);


    if (
        value === null ||
        value === undefined ||
        Number.isNaN(amount)
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
    ).format(amount);
}


function setText(
    element,
    value
) {

    if (!element) {
        return;
    }


    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : String(value);
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
        () => {

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


            sidebarToggle.setAttribute(
                "aria-expanded",

                String(
                    !clientApp.classList.contains(
                        "sidebar-collapsed"
                    )
                )
            );
        }
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
   ICONS
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