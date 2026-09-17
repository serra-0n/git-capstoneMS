"use strict";

const accessToken = sessionStorage.getItem("resorthub_access_token");

if (!accessToken) {
    window.location.href = "../auth/login.html";
}

/* API ENDPOINTS */

const API_ENDPOINTS = {
    clientProfile: "/api/client/profile",

    notifications: "/api/client/notifications",
};

/* APPLICATION STATE */

const notificationState = {
    client: null,

    notifications: [],

    selectedNotification: null,

    loading: false,
};

/* DOM ELEMENTS */

/* Shared */

const clientApp = document.getElementById("clientApp");

const sidebarToggle = document.getElementById("sidebarToggle");

const clientProfileButton = document.getElementById("clientProfileButton");

const clientDisplayName = document.getElementById("clientDisplayName");

/* Notification list */

const notificationList = document.getElementById("notificationList");

const notificationEmptyState = document.getElementById("notificationEmptyState");

/* Notification details */

const notificationDetailCard = document.getElementById("notificationDetailCard");

const notificationDetailType = document.getElementById("notificationDetailType");

const notificationDetailMessage = document.getElementById("notificationDetailMessage");

const notificationDetailReservation = document.getElementById("notificationDetailReservation");

const notificationDetailRelatedType = document.getElementById("notificationDetailRelatedType");

const notificationRelatedLink = document.getElementById("notificationRelatedLink");

const notificationRelatedLinkText = document.getElementById("notificationRelatedLinkText");

/* INITIALIZATION */

document.addEventListener("DOMContentLoaded", initializeNotificationsPage);

async function initializeNotificationsPage() {
    initializeIcons();

    initializeSidebar();

    initializeProfileButton();

    await loadNotificationsFromDatabase();
}

async function loadNotificationsFromDatabase() {
    setLoadingState(true);

    try {
        await Promise.all([loadClientFromApi(), loadNotificationsFromApi()]);

        renderClient();

        renderNotifications();
    } catch (error) {
        console.error("Unable to load notifications:", error);

        notificationState.notifications = [];

        renderNotifications();
    } finally {
        setLoadingState(false);
    }
}

/* LOAD CLIENT PROFILE */

async function loadClientFromApi() {
    const response = await fetch(API_ENDPOINTS.clientProfile, {
        method: "GET",

        credentials: "include",

        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error("Unable to load client profile.");
    }

    const data = await response.json();

    notificationState.client = normalizeClient(data);
}

/* LOAD NOTIFICATIONS */

async function loadNotificationsFromApi() {
    const response = await fetch(API_ENDPOINTS.notifications, {
        method: "GET",

        credentials: "include",

        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error("Unable to load notifications.");
    }

    const data = await response.json();

    notificationState.notifications = normalizeNotifications(data);
}

/* NORMALIZE CLIENT */

function normalizeClient(data) {
    const client = data?.client || data;

    if (!client || typeof client !== "object") {
        return null;
    }

    return {
        id: client.id ?? client.client_id ?? null,

        name: client.name || client.full_name || "",
    };
}

/* NORMALIZE NOTIFICATIONS Supports responses such as: { notifications: [...] } or directly: [...] */

function normalizeNotifications(data) {
    const notifications = Array.isArray(data) ? data : data?.notifications;

    if (!Array.isArray(notifications)) {
        return [];
    }

    return notifications.map(normalizeNotification).filter(Boolean);
}

/* NORMALIZE SINGLE NOTIFICATION */

function normalizeNotification(notification) {
    if (!notification || typeof notification !== "object") {
        return null;
    }

    return {
        id: notification.id ?? notification.notification_id ?? null,

        client_id: notification.client_id ?? null,

        reservation_id: notification.reservation_id ?? null,

        reservation_reference:
            notification.reservation_reference || notification.reference_number || "",

        related_type: normalizeRelatedType(notification.related_type || notification.type || ""),

        message: notification.message || "",
    };
}

/* NORMALIZE RELATED TYPE */

function normalizeRelatedType(type) {
    const value = String(type || "")
        .trim()
        .toLowerCase();

    switch (value) {
        case "reservation":
            return "reservation";

        case "payment":
            return "payment";

        case "document":
        case "document verification":
            return "document";

        default:
            return value;
    }
}

/* RENDER CLIENT */

function renderClient() {
    if (!clientDisplayName) {
        return;
    }

    clientDisplayName.textContent = notificationState.client?.name || "Client";
}

/* RENDER NOTIFICATIONS */

function renderNotifications() {
    if (!notificationList) {
        return;
    }

    notificationList.innerHTML = "";

    const notifications = notificationState.notifications;

    if (!Array.isArray(notifications) || notifications.length === 0) {
        showEmptyState();

        return;
    }

    hideEmptyState();

    notifications.forEach((notification) => {
        const item = createNotificationItem(notification);

        notificationList.appendChild(item);
    });

    initializeIcons();
}

/* CREATE NOTIFICATION ITEM */

function createNotificationItem(notification) {
    const button = document.createElement("button");

    button.type = "button";

    button.className = "notification-item";

    button.dataset.notificationId = String(notification.id ?? "");

    button.dataset.notificationType = notification.related_type || "notification";

    /* Icon */

    const iconWrapper = document.createElement("span");

    iconWrapper.className = "notification-item-icon";

    const icon = document.createElement("i");

    icon.setAttribute("data-lucide", getNotificationIcon(notification.related_type));

    iconWrapper.appendChild(icon);

    /* Content */

    const content = document.createElement("div");

    content.className = "notification-item-content";

    /* Heading */

    const heading = document.createElement("div");

    heading.className = "notification-item-heading";

    const title = document.createElement("strong");

    title.textContent = getNotificationTitle(notification.related_type);

    const typeBadge = document.createElement("span");

    typeBadge.className = "notification-type-badge";

    typeBadge.textContent = getRelatedTypeLabel(notification.related_type);

    heading.append(title, typeBadge);

    /* Message */

    const message = document.createElement("p");

    message.className = "notification-item-message";

    message.textContent = notification.message || "Notification update.";

    /* Metadata */

    const meta = document.createElement("div");

    meta.className = "notification-item-meta";

    if (notification.reservation_reference) {
        const reservationMeta = document.createElement("span");

        const reservationIcon = document.createElement("i");

        reservationIcon.setAttribute("data-lucide", "calendar-days");

        const reservationText = document.createElement("span");

        reservationText.textContent = notification.reservation_reference;

        reservationMeta.append(reservationIcon, reservationText);

        meta.appendChild(reservationMeta);
    }

    content.append(heading, message);

    if (meta.children.length > 0) {
        content.appendChild(meta);
    }

    button.append(iconWrapper, content);

    button.addEventListener("click", () => {
        selectNotification(notification.id);
    });

    return button;
}

/* SELECT NOTIFICATION */

function selectNotification(notificationId) {
    const notification = notificationState.notifications.find(
        (item) => String(item.id) === String(notificationId),
    );

    if (!notification) {
        return;
    }

    notificationState.selectedNotification = notification;

    updateSelectedNotificationItem(notification.id);

    renderNotificationDetails(notification);
}

/* SELECTED ITEM STYLE */

function updateSelectedNotificationItem(notificationId) {
    const items = document.querySelectorAll(".notification-item");

    items.forEach((item) => {
        const selected = String(item.dataset.notificationId) === String(notificationId);

        item.classList.toggle("selected", selected);
    });
}

/* RENDER NOTIFICATION DETAILS */

function renderNotificationDetails(notification) {
    if (!notificationDetailCard) {
        return;
    }

    notificationDetailCard.hidden = false;

    setText(notificationDetailType, getNotificationTitle(notification.related_type));

    setText(notificationDetailMessage, notification.message);

    setText(notificationDetailReservation, notification.reservation_reference);

    setText(notificationDetailRelatedType, getRelatedTypeLabel(notification.related_type));

    updateRelatedLink(notification);

    initializeIcons();
}

/* RELATED PAGE LINK Reservation: ReservationStatus.html?id=<reservation_id> Payment: Payments.html?reservation=<reservation_id> Document: UploadDocuments.html?reservation=<reservation_id> */

function updateRelatedLink(notification) {
    if (!notificationRelatedLink || !notificationRelatedLinkText) {
        return;
    }

    const reservationId = notification.reservation_id;

    if (!reservationId) {
        notificationRelatedLink.hidden = true;

        notificationRelatedLink.removeAttribute("href");

        return;
    }

    const encodedReservationId = encodeURIComponent(reservationId);

    switch (notification.related_type) {
        case "reservation":
            notificationRelatedLink.href = `ReservationStatus.html?id=${encodedReservationId}`;

            notificationRelatedLinkText.textContent = "View Reservation Status";

            notificationRelatedLink.hidden = false;

            break;

        case "payment":
            notificationRelatedLink.href = `Payments.html?reservation=${encodedReservationId}`;

            notificationRelatedLinkText.textContent = "View Billing & Payment";

            notificationRelatedLink.hidden = false;

            break;

        case "document":
            notificationRelatedLink.href = `UploadDocuments.html?reservation=${encodedReservationId}`;

            notificationRelatedLinkText.textContent = "View Documents";

            notificationRelatedLink.hidden = false;

            break;

        default:
            notificationRelatedLink.hidden = true;

            notificationRelatedLink.removeAttribute("href");
    }
}

/* NOTIFICATION TITLE */

function getNotificationTitle(relatedType) {
    switch (relatedType) {
        case "reservation":
            return "Reservation Update";

        case "payment":
            return "Payment Update";

        case "document":
            return "Document Verification Update";

        default:
            return "Notification";
    }
}

/* RELATED TYPE LABEL */

function getRelatedTypeLabel(relatedType) {
    switch (relatedType) {
        case "reservation":
            return "Reservation";

        case "payment":
            return "Payment";

        case "document":
            return "Document Verification";

        default:
            return "Update";
    }
}

/* NOTIFICATION ICON */

function getNotificationIcon(relatedType) {
    switch (relatedType) {
        case "reservation":
            return "calendar-clock";

        case "payment":
            return "wallet-cards";

        case "document":
            return "file-check-2";

        default:
            return "bell";
    }
}

/* EMPTY STATE */

function showEmptyState() {
    if (notificationList) {
        notificationList.hidden = true;
    }

    if (notificationEmptyState) {
        notificationEmptyState.hidden = false;
    }

    if (notificationDetailCard) {
        notificationDetailCard.hidden = true;
    }

    notificationState.selectedNotification = null;

    initializeIcons();
}

function hideEmptyState() {
    if (notificationList) {
        notificationList.hidden = false;
    }

    if (notificationEmptyState) {
        notificationEmptyState.hidden = true;
    }
}

/* LOADING STATE No artificial loading notification is displayed because the HTML does not include a separate loading component. */

function setLoadingState(loading) {
    notificationState.loading = loading;

    if (notificationList) {
        notificationList.setAttribute("aria-busy", String(loading));
    }
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

/* PROFILE BUTTON */

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
