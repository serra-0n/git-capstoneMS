"use strict";

const accessToken = sessionStorage.getItem("resorthub_access_token");

const reservationList = document.getElementById("reservationList");
const reservationEmptyState = document.getElementById("reservationEmptyState");
const totalReservationCount = document.getElementById("totalReservationCount");
const currentReservationStatus = document.getElementById("currentReservationStatus");

if (!accessToken) {
    window.location.href = "../auth/login.html";
}

document.addEventListener("DOMContentLoaded", loadReservations);

async function loadReservations() {
    try {
        const response = await fetch("/api/client/reservations", {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load your reservations.");
        }

        const reservations = Array.isArray(data.reservations) ? data.reservations : [];
        renderReservations(reservations);
    } catch (error) {
        console.error("Reservation list failed:", error);
        renderLoadError(error.message);
    }
}

function renderReservations(reservations) {
    totalReservationCount.textContent = String(reservations.length);

    const currentReservation = reservations.find(
        (reservation) =>
            !["rejected", "cancelled", "expired", "completed", "no_show"].includes(
                String(reservation.reservation_status || "").toLowerCase(),
            ),
    );

    currentReservationStatus.textContent = currentReservation
        ? formatStatus(currentReservation.reservation_status)
        : "None";

    if (reservations.length === 0) {
        reservationList.hidden = true;
        reservationEmptyState.hidden = false;
        return;
    }

    reservationList.innerHTML = reservations.map(createReservationCard).join("");
    reservationList.hidden = false;
    reservationEmptyState.hidden = true;

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

function createReservationCard(reservation) {
    const status = String(reservation.reservation_status || "pending").toLowerCase();
    const paymentStatus = String(reservation.payment_status || "unpaid").toLowerCase();

    return `
        <article class="reservation-item">
            <div class="reservation-item-header">
                <div class="reservation-reference-group">
                    <span class="reservation-reference-label">Reservation Reference</span>
                    <h3 class="reservation-reference">
                        ${escapeHtml(reservation.reservation_code || "—")}
                    </h3>
                </div>

                <span class="status-badge ${getStatusClass(status)}">
                    ${escapeHtml(formatStatus(status))}
                </span>
            </div>

            <div class="reservation-item-details">
                <div class="reservation-detail">
                    <span>Resort</span>
                    <strong>${escapeHtml(reservation.resort_name || "—")}</strong>
                </div>

                <div class="reservation-detail">
                    <span>Accommodation</span>
                    <strong>${escapeHtml(reservation.accommodation_name || "—")}</strong>
                </div>

                <div class="reservation-detail">
                    <span>Check-in</span>
                    <strong>${escapeHtml(formatDate(reservation.check_in))}</strong>
                </div>

                <div class="reservation-detail">
                    <span>Check-out</span>
                    <strong>${escapeHtml(formatDate(reservation.check_out))}</strong>
                </div>

                <div class="reservation-detail">
                    <span>Total Amount</span>
                    <strong>${escapeHtml(formatCurrency(reservation.total_amount))}</strong>
                </div>

                <div class="reservation-detail">
                    <span>Payment</span>
                    <strong>${escapeHtml(formatStatus(paymentStatus))}</strong>
                </div>
            </div>

            <div class="reservation-item-footer">
                <p class="reservation-item-footer-text">
                    ${escapeHtml(getStatusMessage(status, paymentStatus))}
                </p>

                <a
                    class="view-status-button"
                    href="ReservationStatus.html?id=${encodeURIComponent(reservation.id)}"
                >
                    View Status
                    <i data-lucide="arrow-right"></i>
                </a>
            </div>
        </article>
    `;
}

function renderLoadError(message) {
    totalReservationCount.textContent = "0";
    currentReservationStatus.textContent = "Unavailable";
    reservationList.innerHTML = `
        <div class="reservation-item">
            <p class="reservation-item-footer-text">${escapeHtml(message)}</p>
        </div>
    `;
    reservationList.hidden = false;
    reservationEmptyState.hidden = true;
}

function getStatusClass(status) {
    if (["confirmed", "checked_in", "completed"].includes(status)) {
        return "status-success";
    }

    if (["rejected", "cancelled", "expired", "no_show"].includes(status)) {
        return "status-danger";
    }

    if (["awaiting_deposit", "deposit_verification"].includes(status)) {
        return "status-info";
    }

    return "status-warning";
}

function getStatusMessage(status, paymentStatus) {
    const messages = {
        pending: "Waiting for the resort to review your reservation request.",
        awaiting_deposit: "Reservation accepted. Submit payment before the deadline.",
        deposit_verification: "Your payment proof is waiting for resort verification.",
        confirmed:
            paymentStatus === "partially_paid"
                ? "Your reservation is confirmed. The remaining balance is still due."
                : "Your reservation and payment are confirmed.",
        rejected: "The resort rejected this reservation request.",
        cancelled: "This reservation was cancelled.",
        expired: "The payment deadline for this reservation expired.",
        checked_in: "You are currently checked in.",
        completed: "This stay has been completed.",
        no_show: "This reservation was marked as a no-show.",
    };

    return messages[status] || "Open the reservation to view its latest status.";
}

function formatStatus(value) {
    return String(value || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(Number(value) || 0);
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
}
