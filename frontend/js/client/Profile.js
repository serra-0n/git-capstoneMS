"use strict";

/* RESORTHUB - CLIENT PROFILE File: js/client/Profile.js FRONTEND DEVELOPMENT MODE true: - Uses dummy client data - Simulates saving only in memory - Does NOT save to localStorage - Does NOT update MySQL false: - Loads the client profile from the Express backend - Sends profile updates to the backend */

const USE_DUMMY_DATA = true;

/* API ENDPOINTS */

const API_ENDPOINTS = {
    profile: "/api/client/profile",
};

/* DUMMY CLIENT DATA Presentation data only. */

const DUMMY_CLIENT = {
    id: 1,

    full_name: "Juan Dela Cruz",

    email: "juan.delacruz@example.com",

    contact_number: "09171234567",

    role: "Client",
};

/* APPLICATION STATE */

const profileState = {
    client: null,

    saving: false,
};

/* DOM ELEMENTS */

const clientApp = document.getElementById("clientApp");

const sidebarToggle = document.getElementById("sidebarToggle");

const clientProfileButton = document.getElementById("clientProfileButton");

const clientDisplayName = document.getElementById("clientDisplayName");

/* Profile overview */

const profileDisplayName = document.getElementById("profileDisplayName");

const profileDisplayEmail = document.getElementById("profileDisplayEmail");

/* Form */

const profileForm = document.getElementById("profileForm");

const clientId = document.getElementById("clientId");

const fullName = document.getElementById("fullName");

const emailAddress = document.getElementById("emailAddress");

const contactNumber = document.getElementById("contactNumber");

const accountRole = document.getElementById("accountRole");

/* Form message */

const profileFormMessage = document.getElementById("profileFormMessage");

const saveProfileButton = document.getElementById("saveProfileButton");

/* INITIALIZATION */

document.addEventListener("DOMContentLoaded", initializeProfilePage);

async function initializeProfilePage() {
    initializeIcons();

    initializeSidebar();

    initializeProfileButton();

    initializeProfileForm();

    if (USE_DUMMY_DATA) {
        loadDummyProfile();

        return;
    }

    await loadProfileFromDatabase();
}

/* DUMMY PROFILE */

function loadDummyProfile() {
    profileState.client = {
        ...DUMMY_CLIENT,
    };

    renderProfile();
}

/* LOAD PROFILE FROM BACKEND */

async function loadProfileFromDatabase() {
    setSavingState(true);

    try {
        const response = await fetch(API_ENDPOINTS.profile, {
            method: "GET",

            credentials: "include",

            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error("Unable to load client profile.");
        }

        const data = await response.json();

        profileState.client = normalizeClient(data);

        if (!profileState.client) {
            throw new Error("Client profile data is unavailable.");
        }

        renderProfile();
    } catch (error) {
        console.error("Profile loading error:", error);

        showProfileMessage("Unable to load your profile.", "error");
    } finally {
        setSavingState(false);
    }
}

/* NORMALIZE CLIENT DATA Supports responses such as: { client: {...} } or directly: {...} */

function normalizeClient(data) {
    const client = data?.client || data;

    if (!client || typeof client !== "object") {
        return null;
    }

    return {
        id: client.id ?? client.client_id ?? null,

        full_name: client.full_name || client.name || "",

        email: client.email || "",

        contact_number: client.contact_number || client.phone || "",

        role: client.role || "Client",
    };
}

/* RENDER PROFILE */

function renderProfile() {
    const client = profileState.client;

    if (!client) {
        return;
    }

    /* Top navigation */

    setText(clientDisplayName, client.full_name || "Client");

    /* Overview */

    setText(profileDisplayName, client.full_name);

    setText(profileDisplayEmail, client.email);

    /* Form */

    if (clientId) {
        clientId.value = client.id ?? "";
    }

    if (fullName) {
        fullName.value = client.full_name || "";
    }

    if (emailAddress) {
        emailAddress.value = client.email || "";
    }

    if (contactNumber) {
        contactNumber.value = client.contact_number || "";
    }

    if (accountRole) {
        accountRole.value = client.role || "Client";
    }
}

/* INITIALIZE PROFILE FORM */

function initializeProfileForm() {
    if (!profileForm) {
        return;
    }

    profileForm.addEventListener("submit", handleProfileSubmit);
}

/* PROFILE SUBMIT */

async function handleProfileSubmit(event) {
    event.preventDefault();

    clearProfileMessage();

    if (profileState.saving) {
        return;
    }

    const formData = collectProfileFormData();

    const validationMessage = validateProfileForm(formData);

    if (validationMessage) {
        showProfileMessage(validationMessage, "error");

        return;
    }

    if (USE_DUMMY_DATA) {
        saveDummyProfile(formData);

        return;
    }

    await saveProfileToDatabase(formData);
}

/* COLLECT FORM DATA */

function collectProfileFormData() {
    return {
        client_id: clientId?.value ? Number(clientId.value) : null,

        full_name: fullName?.value.trim() || "",

        email: emailAddress?.value.trim() || "",

        contact_number: contactNumber?.value.trim() || "",
    };
}

/* FORM VALIDATION */

function validateProfileForm(data) {
    if (!data.full_name) {
        return "Full name is required.";
    }

    if (!data.email) {
        return "Email address is required.";
    }

    if (!isValidEmail(data.email)) {
        return "Please enter a valid email address.";
    }

    if (!data.contact_number) {
        return "Contact number is required.";
    }

    return "";
}

/* EMAIL VALIDATION */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* DUMMY SAVE This changes only the current page state. Nothing is stored permanently. */

function saveDummyProfile(formData) {
    setSavingState(true);

    /*
     * Small delay only for frontend interaction feedback.
     * This is not a real database request.
     */

    window.setTimeout(() => {
        profileState.client = {
            ...profileState.client,

            id: formData.client_id ?? profileState.client?.id ?? null,

            full_name: formData.full_name,

            email: formData.email,

            contact_number: formData.contact_number,

            role: profileState.client?.role || "Client",
        };

        renderProfile();

        showProfileMessage("Profile changes saved for frontend preview.", "success");

        setSavingState(false);
    }, 500);
}

/* SAVE PROFILE TO BACKEND */

async function saveProfileToDatabase(formData) {
    setSavingState(true);

    try {
        const response = await fetch(API_ENDPOINTS.profile, {
            method: "PUT",

            credentials: "include",

            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                full_name: formData.full_name,

                email: formData.email,

                contact_number: formData.contact_number,
            }),
        });

        if (!response.ok) {
            throw new Error("Unable to update client profile.");
        }

        const data = await response.json();

        /*
         * Prefer the backend-returned record.
         * If the backend only returns a success response,
         * fall back to the submitted values.
         */

        const updatedClient = normalizeClient(data);

        profileState.client = updatedClient || {
            ...profileState.client,

            full_name: formData.full_name,

            email: formData.email,

            contact_number: formData.contact_number,
        };

        renderProfile();

        showProfileMessage("Profile updated successfully.", "success");
    } catch (error) {
        console.error("Profile update error:", error);

        showProfileMessage("Unable to update your profile.", "error");
    } finally {
        setSavingState(false);
    }
}

/* SAVING STATE */

function setSavingState(saving) {
    profileState.saving = saving;

    if (!saveProfileButton) {
        return;
    }

    saveProfileButton.disabled = saving;

    const buttonText = saveProfileButton.querySelector("span");

    if (buttonText) {
        buttonText.textContent = saving ? "Saving..." : "Save Changes";
    }
}

/* FORM MESSAGE */

function showProfileMessage(message, type = "info") {
    if (!profileFormMessage) {
        return;
    }

    profileFormMessage.textContent = message;

    profileFormMessage.classList.remove("success", "error", "info");

    profileFormMessage.classList.add(type);

    profileFormMessage.hidden = false;
}

function clearProfileMessage() {
    if (!profileFormMessage) {
        return;
    }

    profileFormMessage.textContent = "";

    profileFormMessage.classList.remove("success", "error", "info");

    profileFormMessage.hidden = true;
}

/* SET TEXT */

function setText(element, value) {
    if (!element) {
        return;
    }

    if (value === null || value === undefined || value === "") {
        element.textContent = "—";

        return;
    }

    element.textContent = String(value);
}

/* SIDEBAR */

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

    const collapsed = clientApp.classList.contains("sidebar-collapsed");

    sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
}

/* PROFILE BUTTON The user is already on Profile.html, so no redirect is necessary. */

function initializeProfileButton() {
    if (!clientProfileButton) {
        return;
    }

    clientProfileButton.addEventListener("click", () => {
        window.location.href = "Profile.html";
    });
}

/* LUCIDE ICONS */

function initializeIcons() {
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons();
    }
}
