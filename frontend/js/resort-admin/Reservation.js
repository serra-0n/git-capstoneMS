"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const reservationTableBody = document.getElementById("reservationTableBody");
    const totalReservationCount = document.getElementById("totalReservationCount");
    const confirmedReservationCount = document.getElementById("confirmedReservationCount");
    const pendingReservationCount = document.getElementById("pendingReservationCount");
    const cancelledReservationCount = document.getElementById("cancelledReservationCount");
    const accommodationFilter = document.getElementById("accommodationFilter");
    const accessToken = sessionStorage.getItem("resorthub_access_token");

    let reservations = [];

    if (!accessToken) {
        window.location.href = "../auth/login.html";
        return;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[character]
        );
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        return new Date(value).toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat(
            "en-PH",
            {
                style: "currency",
                currency: "PHP"
            }
        ).format(Number(value) || 0);
    }

    function formatStatus(value) {
        return String(value || "")
            .replaceAll("_", " ")
            .replace(/\b\w/g, letter =>
                letter.toUpperCase()
            );
    }

    function getStatusClass(status) {
        const statusClasses = {
            pending: "orange",
            awaiting_deposit: "orange",
            deposit_verification: "orange",
            confirmed: "green",
            completed: "green",
            rejected: "red",
            cancelled: "red",
            expired: "red"
        };

        return statusClasses[status] || "blue";
    }

    function renderMetrics() {
        totalReservationCount.textContent =
            reservations.length;

        confirmedReservationCount.textContent =
            reservations.filter(reservation =>
                reservation.reservation_status ===
                "confirmed"
            ).length;

        pendingReservationCount.textContent =
            reservations.filter(reservation =>
                [
                    "pending",
                    "awaiting_deposit",
                    "deposit_verification"
                ].includes(
                    reservation.reservation_status
                )
            ).length;

        cancelledReservationCount.textContent =
            reservations.filter(reservation =>
                [
                    "cancelled",
                    "expired",
                    "rejected"
                ].includes(
                    reservation.reservation_status
                )
            ).length;
    }

    function renderAccommodationFilter() {
        const accommodationNames = [
            ...new Set(
                reservations.map(reservation =>
                    reservation.accommodation_name
                )
            )
        ].filter(Boolean);

        accommodationFilter.innerHTML =
            '<option value="">All Accommodations</option>';

        accommodationNames.forEach(name => {
            const option =
                document.createElement("option");

            option.value = name;
            option.textContent = name;

            accommodationFilter.appendChild(option);
        });
    }

    function renderReservations() {
        if (reservations.length === 0) {
            reservationTableBody.innerHTML = `
                <tr>
                    <td colspan="10">
                        No reservations were found.
                    </td>
                </tr>
            `;
            return;
        }

        reservationTableBody.innerHTML =
            reservations.map(reservation => `
                <tr data-reservation-id="${reservation.id}">
                    <td>
                        ${escapeHtml(
                            reservation.reservation_code
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            reservation.guest_name
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            reservation.accommodation_name
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            reservation.check_in
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            reservation.check_out
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            reservation.guest_count
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            reservation.total_amount
                        )}
                    </td>

                    <td>
                        <span class="status ${
                            getStatusClass(
                                reservation.payment_status
                            )
                        }">
                            ${escapeHtml(
                                formatStatus(
                                    reservation.payment_status
                                )
                            )}
                        </span>
                    </td>

                    <td>
                        <span class="status ${
                            getStatusClass(
                                reservation.reservation_status
                            )
                        }">
                            ${escapeHtml(
                                formatStatus(
                                    reservation.reservation_status
                                )
                            )}
                        </span>
                    </td>

                    <td>
                        ${
                            reservation.reservation_status === "pending" ?
                            `
                                <button
                                    type="button"
                                    class="button primary"
                                    data-action="accept"
                                    data-reservation-id="${reservation.id}">

                                    Accept
                                </button>

                                <button
                                    type="button"
                                    class="button"
                                    data-action="reject"
                                    data-reservation-id="${reservation.id}">

                                    Reject
                                </button>
                            ` : `
                                <button
                                    type="button"
                                    class="view-reservation-button"
                                    data-action="view"
                                    data-reservation-id="${reservation.id}">

                                    View
                                </button>
                            `
                        }
                    </td>
                </tr>
            `).join("");
    }

    async function loadReservations() {
        try {
            const response = await fetch(
                "/api/resort-admin/reservations",
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "Authorization":
                            `Bearer ${accessToken}`
                    }
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Unable to load reservations."
                );
            }

            reservations =
                Array.isArray(result.reservations)
                    ? result.reservations
                    : [];

            renderReservations();
            renderMetrics();
            renderAccommodationFilter();

            if (typeof lucide !== "undefined") {
                lucide.createIcons({
                    attrs: {
                        "stroke-width": 1.8
                    }
                });
            }
        } catch (error) {
            console.error(error);

            reservationTableBody.innerHTML = `
                <tr>
                    <td colspan="10">
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;
        }

        async function updateReservationStatus(reservationId, status, notes = "") {
            const response = await fetch(
                `/api/resort-admin/reservations/${encodeURIComponent(reservationId)}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({ status, notes })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Unable to update the reservation ");
            }

            alert(result.message);
            await loadReservations();
        }

        reservationTableBody.addEventListener("click", async event => {
            const button = event.target.closest("[data-action]");

            if (!button) {
                return;
            }

            const reservationId = button.dataset.reservationId;
            const action = button.dataset.action;

            try {
                if (action === "accept") {
                    const confirmed = confirm("Accept this reservation and start the 12-hour deposit deadline?");

                    if (!confirmed) {
                        return;
                    }

                    await updateReservationStatus(reservationId, "awaiting_deposit");
                }

                if (action === "reject") {
                    const notes = prompt("Enter the reason for rejecting this reservation:");

                    if (notes === null) {
                        return;
                    }

                    if (!notes.trim()) {
                        alert("A rejection reason is required.");
                        return;
                    }

                    await updateReservationStatus(reservationId, "rejected", notes.trim());
                }
            } catch (error) {
                alert(error.message);
            }
        });
    }

    loadReservations();
});