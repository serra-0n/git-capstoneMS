"use strict";

const accessToken = sessionStorage.getItem("resorthub_access_token");

if (!accessToken) {
    window.location.href = "../auth/login.html";
}

const API_ENDPOINTS = {
    clientProfile: "/api/client/profile",
    resorts: "/api/resorts",
    accommodationsByResort: (resortId) =>
        `/api/resorts/${encodeURIComponent(resortId)}/accommodations`,
};

const FALLBACK_IMAGES = {
    resort: "../../assets/images/resort-fallback.png",
    accommodation: "../../assets/images/accommodation-fallback.png",
};

const resortsState = {
    client: null,
    resorts: [],
    accommodations: [],
    selectedResort: null,
};

const clientApp = document.getElementById("clientApp");
const sidebarToggle = document.getElementById("sidebarToggle");
const clientProfileButton = document.getElementById("clientProfileButton");
const clientDisplayName = document.getElementById("clientDisplayName");
const resortList = document.getElementById("resortList");
const resortsEmptyState = document.getElementById("resortsEmptyState");
const selectedResortSection = document.getElementById("selectedResortSection");
const selectedResortImage = document.getElementById("selectedResortImage");
const selectedResortType = document.getElementById("selectedResortType");
const selectedResortName = document.getElementById("selectedResortName");
const selectedResortLocation = document.getElementById("selectedResortLocation");
const selectedResortDescription = document.getElementById("selectedResortDescription");
const selectedResortBenefits = document.getElementById("selectedResortBenefits");
const accommodationCount = document.getElementById("accommodationCount");
const accommodationList = document.getElementById("accommodationList");
const accommodationsEmptyState = document.getElementById("accommodationsEmptyState");

document.addEventListener("DOMContentLoaded", initializeResortsPage);

async function initializeResortsPage() {
    initializeIcons();
    initializeSidebar();
    initializeProfileButton();
    await loadPageData();
}

async function apiRequest(url) {
    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("resorthub_access_token");
        window.location.href = "../auth/login.html";
        throw new Error("Your session has expired.");
    }

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Unable to load resort information.");
    }

    return response.json();
}

async function loadPageData() {
    try {
        const [clientData, resortsData] = await Promise.all([
            apiRequest(API_ENDPOINTS.clientProfile),
            apiRequest(API_ENDPOINTS.resorts),
        ]);

        resortsState.client = clientData.client || clientData;
        resortsState.resorts = Array.isArray(resortsData)
            ? resortsData
            : resortsData.resorts || [];

        clientDisplayName.textContent = resortsState.client?.name || "Client";
        renderResorts();
    } catch (error) {
        console.error("Unable to load resorts:", error);
        resortsState.resorts = [];
        renderResorts();
    }
}

function renderResorts() {
    resortList.replaceChildren();
    resortsEmptyState.hidden = resortsState.resorts.length > 0;

    resortsState.resorts.forEach((resort) => {
        resortList.appendChild(createResortCard(resort));
    });

    initializeIcons();
}

function createResortCard(resort) {
    const card = document.createElement("article");
    card.className = "resort-card";
    card.dataset.resortId = String(resort.id);

    const image = document.createElement("img");
    image.className = "resort-card-image";
    image.src = resolveImageUrl(resort.cover_image_path, FALLBACK_IMAGES.resort);
    image.alt = `${resort.name || "Resort"} view`;
    applyImageFallback(image, FALLBACK_IMAGES.resort);

    const shade = document.createElement("div");
    shade.className = "resort-card-shade";

    const content = document.createElement("div");
    content.className = "resort-card-content";

    const type = document.createElement("span");
    type.className = "resort-type-pill";
    type.textContent = titleCase(resort.resort_type || "Resort");

    const title = document.createElement("h3");
    title.textContent = resort.name || "Resort";

    const location = document.createElement("p");
    location.className = "resort-card-location";
    location.append(createIcon("map-pin"));
    const locationText = document.createElement("span");
    locationText.textContent = resort.location || "Location available soon";
    location.append(locationText);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "resort-expand-button";
    action.append(document.createTextNode("Explore resort"), createIcon("arrow-up-right"));
    action.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleResort(resort);
    });

    content.append(type, title, location, action);
    card.append(image, shade, content);
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-expanded", "false");
    card.addEventListener("click", () => toggleResort(resort));
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleResort(resort);
        }
    });

    return card;
}

async function toggleResort(resort) {
    const isOpen =
        resortsState.selectedResort &&
        String(resortsState.selectedResort.id) === String(resort.id) &&
        !selectedResortSection.hidden;

    if (isOpen) {
        selectedResortSection.hidden = true;
        resortsState.selectedResort = null;
        updateSelectedResortCards();
        return;
    }

    resortsState.selectedResort = resort;
    selectedResortSection.hidden = false;
    renderSelectedResort(resort);
    updateSelectedResortCards();
    renderAccommodationLoading();

    try {
        const data = await apiRequest(API_ENDPOINTS.accommodationsByResort(resort.id));

        if (String(resortsState.selectedResort?.id) !== String(resort.id)) {
            return;
        }

        resortsState.accommodations = Array.isArray(data) ? data : data.accommodations || [];
        renderAccommodations();
    } catch (error) {
        console.error("Unable to load accommodations:", error);
        resortsState.accommodations = [];
        renderAccommodations();
    }

    selectedResortSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSelectedResort(resort) {
    selectedResortImage.src = resolveImageUrl(resort.cover_image_path, FALLBACK_IMAGES.resort);
    selectedResortImage.alt = `${resort.name || "Resort"} destination`;
    applyImageFallback(selectedResortImage, FALLBACK_IMAGES.resort);
    selectedResortType.textContent = titleCase(resort.resort_type || "Resort");
    selectedResortName.textContent = resort.name || "Resort";
    selectedResortLocation.textContent = resort.location || "Location available soon";
    selectedResortDescription.textContent =
        resort.description ||
        `Discover ${resort.name || "this resort"} and choose the room or cottage that fits your stay.`;

    selectedResortBenefits.replaceChildren();
    const benefits = normalizeList(resort.features);
    const displayBenefits = benefits.length
        ? benefits
        : ["Verified resort", "Rooms & cottages", "Online reservation"];

    displayBenefits.slice(0, 6).forEach((benefit) => {
        const chip = document.createElement("span");
        chip.append(createIcon("check"), document.createTextNode(benefit));
        selectedResortBenefits.appendChild(chip);
    });

    initializeIcons();
}

function renderAccommodationLoading() {
    accommodationList.replaceChildren();
    accommodationsEmptyState.hidden = true;
    accommodationCount.textContent = "Loading stays...";

    for (let index = 0; index < 3; index += 1) {
        const skeleton = document.createElement("div");
        skeleton.className = "accommodation-card accommodation-skeleton";
        skeleton.setAttribute("aria-hidden", "true");
        accommodationList.appendChild(skeleton);
    }
}

function renderAccommodations() {
    accommodationList.replaceChildren();
    const count = resortsState.accommodations.length;
    accommodationCount.textContent = `${count} ${count === 1 ? "stay" : "stays"}`;
    accommodationsEmptyState.hidden = count > 0;

    resortsState.accommodations.forEach((accommodation) => {
        accommodationList.appendChild(createAccommodationCard(accommodation));
    });

    initializeIcons();
}

function createAccommodationCard(accommodation) {
    const card = document.createElement("article");
    card.className = "accommodation-card";

    const media = document.createElement("div");
    media.className = "accommodation-media";
    const image = document.createElement("img");
    image.src = resolveImageUrl(accommodation.image_path, FALLBACK_IMAGES.accommodation);
    image.alt = `${accommodation.name || "Accommodation"} interior`;
    applyImageFallback(image, FALLBACK_IMAGES.accommodation);

    const availability = document.createElement("span");
    availability.className = "availability-pill";
    availability.append(createIcon("circle-check"), document.createTextNode(accommodation.availability || "Available"));
    media.append(image, availability);

    const body = document.createElement("div");
    body.className = "accommodation-body";
    const eyebrow = document.createElement("span");
    eyebrow.className = "accommodation-type";
    eyebrow.textContent = titleCase(accommodation.type || "Accommodation");
    const title = document.createElement("h3");
    title.textContent = accommodation.name || "Accommodation";

    const pax = document.createElement("p");
    pax.className = "accommodation-pax";
    pax.append(createIcon("users"), document.createTextNode(formatPax(accommodation.capacity)));

    const benefits = document.createElement("div");
    benefits.className = "accommodation-benefits";
    const amenities = normalizeList(accommodation.amenities);
    (amenities.length ? amenities : ["Amenity details available on request"]).slice(0, 4).forEach((amenity) => {
        const item = document.createElement("span");
        item.append(createIcon("check"), document.createTextNode(amenity));
        benefits.appendChild(item);
    });

    const footer = document.createElement("div");
    footer.className = "accommodation-footer";
    const price = document.createElement("div");
    price.className = "accommodation-price";
    const amount = document.createElement("strong");
    amount.textContent = formatCurrency(accommodation.price);
    const period = document.createElement("span");
    period.textContent = "per night";
    price.append(amount, period);

    const reserve = document.createElement("a");
    reserve.className = "reserve-stay-button";
    reserve.href = `Reservations.html?resort=${encodeURIComponent(resortsState.selectedResort.id)}&accommodation=${encodeURIComponent(accommodation.id)}`;
    reserve.append(document.createTextNode("Reserve"), createIcon("arrow-right"));
    footer.append(price, reserve);
    body.append(eyebrow, title, pax, benefits, footer);
    card.append(media, body);
    return card;
}

function updateSelectedResortCards() {
    document.querySelectorAll(".resort-card").forEach((card) => {
        const selected =
            resortsState.selectedResort &&
            String(card.dataset.resortId) === String(resortsState.selectedResort.id) &&
            !selectedResortSection.hidden;
        card.classList.toggle("selected", Boolean(selected));
        card.setAttribute("aria-expanded", String(Boolean(selected)));
        const button = card.querySelector(".resort-expand-button");
        if (button) {
            button.firstChild.textContent = selected ? "Close details" : "Explore resort";
        }
    });
}

function normalizeList(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function resolveImageUrl(value, fallback) {
    const source = String(value || "").trim();
    if (!source) return fallback;
    if (/^(https?:|data:|blob:)/i.test(source)) return source;
    return source.startsWith("/") ? source : `/${source.replace(/^\.\//, "")}`;
}

function applyImageFallback(image, fallback) {
    image.addEventListener("error", () => {
        if (!image.src.endsWith(fallback.replace(/^\.\.\/\.\.\//, ""))) {
            image.src = fallback;
        }
    });
}

function formatPax(value) {
    const capacity = Number(value);
    return Number.isFinite(capacity) && capacity > 0
        ? `Up to ${capacity} ${capacity === 1 ? "guest" : "guests"}`
        : "Capacity available on request";
}

function formatCurrency(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "Price on request";
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

function titleCase(value) {
    return String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createIcon(name) {
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", name);
    return icon;
}

function initializeSidebar() {
    if (!sidebarToggle || !clientApp) return;
    sidebarToggle.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 760px)").matches) {
            clientApp.classList.toggle("sidebar-mobile-open");
            return;
        }
        clientApp.classList.toggle("sidebar-collapsed");
        sidebarToggle.setAttribute("aria-expanded", String(!clientApp.classList.contains("sidebar-collapsed")));
    });
}

function initializeProfileButton() {
    if (clientProfileButton) {
        clientProfileButton.addEventListener("click", () => {
            window.location.href = "Profile.html";
        });
    }
}

function initializeIcons() {
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons();
    }
}
