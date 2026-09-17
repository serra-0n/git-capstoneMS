"use strict";

const form = document.getElementById("resortSignupForm");
const submitButton = document.getElementById("submitButton");
const formMessage = document.getElementById("formMessage");

const successModal = document.getElementById("successModal");
const successTenantCode = document.getElementById(
    "successTenantCode",
);
const successOcrStatus = document.getElementById(
    "successOcrStatus",
);
const successDashboardButton = document.getElementById(
    "successDashboardButton",
);

const accessToken = sessionStorage.getItem(
    "resorthub_access_token",
);

if (!accessToken) {
    window.location.href = "../auth/login.html";
}

initializeIcons();

if (form && submitButton && formMessage) {
    form.addEventListener(
        "submit",
        submitResortApplication,
    );
}

if (successDashboardButton) {
    successDashboardButton.addEventListener(
        "click",
        returnToDashboard,
    );
}

async function submitResortApplication(event) {
    event.preventDefault();

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    setSubmittingState(true);

    formMessage.textContent = "";
    formMessage.className = "message";

    try {
        const response = await fetch(
            "/api/onboarding/resorts",
            {
                method: "POST",

                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },

                body: new FormData(form),
            },
        );

        const result = await readJsonResponse(response);

        if (!response.ok) {
            throw new Error(
                result.message ||
                    "Unable to submit the application.",
            );
        }

        form.reset();

        showSuccessModal({
            tenantCode: result.tenantCode,
            ocrStatus: result.ocrStatus,
        });
    } catch (error) {
        showFormError(
            error.message ||
                "Unable to submit the application.",
        );
    } finally {
        setSubmittingState(false);
    }
}

function showSuccessModal({
    tenantCode,
    ocrStatus,
}) {
    if (!successModal) {
        return;
    }

    if (successTenantCode) {
        successTenantCode.textContent =
            tenantCode ||
            "Available in your account";
    }

    if (successOcrStatus) {
        successOcrStatus.textContent =
            formatStatus(ocrStatus || "processing");
    }

    successModal.hidden = false;

    document.body.classList.add("modal-open");

    successDashboardButton?.focus();

    initializeIcons();
}

function returnToDashboard() {
    window.location.href =
        "../client/Dashboard.html";
}

function setSubmittingState(submitting) {
    if (!submitButton) {
        return;
    }

    submitButton.disabled = submitting;
    submitButton.textContent = submitting
        ? "Submitting..."
        : "Submit application";
}

function showFormError(message) {
    if (!formMessage) {
        return;
    }

    formMessage.textContent = message;
    formMessage.className = "message error";
}

async function readJsonResponse(response) {
    const contentType =
        response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        throw new Error(
            "The server returned an invalid response.",
        );
    }

    return response.json();
}

function formatStatus(value) {
    return String(value || "")
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            (letter) => letter.toUpperCase(),
        );
}

function initializeIcons() {
    if (
        typeof lucide !== "undefined" &&
        typeof lucide.createIcons === "function"
    ) {
        lucide.createIcons();
    }
}