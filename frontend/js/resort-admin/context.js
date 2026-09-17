"use strict";

document.addEventListener("DOMContentLoaded", initializeResortAdminContext);

async function initializeResortAdminContext() {
    const accessToken = sessionStorage.getItem("resorthub_access_token");

    if (!accessToken) {
        window.location.href = "../auth/login.html";
        return;
    }

    document.querySelector(".nav-link.logout")?.addEventListener("click", (event) => {
        event.preventDefault();
        sessionStorage.removeItem("resorthub_access_token");
        window.location.href = "../auth/login.html";
    });

    try {
        const response = await fetch("/api/resort-admin/context", {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const context = await response.json();

        if (!response.ok) {
            throw new Error(context.message || "Unable to load the resort account.");
        }

        const resortName = context.resort?.name || "Resort";
        const ownerName = [context.user?.firstName, context.user?.lastName]
            .filter(Boolean)
            .join(" ");
        const initials = resortName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0].toUpperCase())
            .join("");

        document.querySelectorAll("[data-context-resort-name]").forEach((element) => {
            element.textContent = resortName;
        });

        document.querySelectorAll("[data-context-resort-avatar]").forEach((element) => {
            element.textContent = initials || "R";
        });

        document.querySelectorAll("[data-context-user-name]").forEach((element) => {
            element.textContent = ownerName || "Resort Owner";
        });
    } catch (error) {
        console.error("Resort context loading failed:", error);
        sessionStorage.removeItem("resorthub_access_token");
        window.location.href = "../auth/login.html";
    }
}
