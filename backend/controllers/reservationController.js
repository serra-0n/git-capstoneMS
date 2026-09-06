const Reservation = require("../models/Reservation");
const User = require("../models/User");

function validId(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

async function listResorts(request, response) {
    try {
        response.json({ resorts: await Reservation.listApprovedResorts() });
    } catch (error) {
        console.error("Resort list failed:", error);
        response.status(500).json({ message: "Unable to load resorts." });
    }
}

async function listAccommodations(request, response) {
    if (!validId(request.params.id)) {
        return response.status(400).json({
            message: "A valid resort is required."
        });
    }

    const checkIn = String(request.query.check_in || "")
        .trim();

    const checkOut = String(request.query.check_out || "")
        .trim();

    const hasCheckIn = Boolean(checkIn);
    const hasCheckOut = Boolean(checkOut);

    if (hasCheckIn !== hasCheckOut) {
        return response.status(400).json({
            message: "Both check-in and check-out dates are required."
        });
    }

    if (hasCheckIn && (
        !validDate(checkIn) ||
        !validDate(checkOut) ||
        checkOut <= checkIn
    )) {
        return response.status(400).json({
            message: "A valid reservation schedule is required."
        });
    }

    try {
        const accommodations = await Reservation.listAccommodations(
            Number(request.params.id),
            {
                checkIn: hasCheckIn
                    ? checkIn
                    : null,

                checkOut: hasCheckOut
                    ? checkOut
                    : null
            }
        );

        return response.json({accommodations});
    } catch (error) {
        console.error("Accommodation list failed:", error);
        return response.status(500).json({
            message: "Unable to load accommodations."
        });
    }
}

async function listUnavailableDates(
    request,
    response
) {
    if (!validId(request.params.id)) {
        return response.status(400).json({
            message:
                "A valid accommodation is required."
        });
    }

    try {
        const unavailableRanges =
            await Reservation.listUnavailableDateRanges(
                Number(request.params.id)
            );

        return response.json({
            unavailable_ranges:
                unavailableRanges
        });
    } catch (error) {
        console.error(
            "Unavailable date list failed:",
            error
        );

        return response.status(500).json({
            message:
                "Unable to load unavailable dates."
        });
    }
}

async function clientProfile(request, response) {
    try {
        const user = await User.findById(request.user.id);
        if (!user) return response.status(404).json({ message: "Client was not found." });
        response.json({
            client: {
                id: user.id,
                name: [user.first_name, user.last_name].filter(Boolean).join(" "),
                email: user.email,
                contact_number: ""
            }
        });
    } catch (error) {
        response.status(500).json({ message: "Unable to load client information." });
    }
}

async function createReservation(request, response) {
    const tenantId = Number(request.body.resort_id);
    const accommodationId = Number(request.body.accommodation_id);
    const guestName = String(request.body.client_name || "").trim();
    const contactNumber = String(request.body.contact_number || "").trim();
    const guestEmail = String(request.body.client_email || "").trim().toLowerCase();
    const guestCount = Number(request.body.guest_count || 1);
    const checkIn = String(request.body.check_in || "");
    const checkOut = String(request.body.check_out || "");

    if (!validId(tenantId) || !validId(accommodationId) || !guestName ||
        !contactNumber || !/^\S+@\S+\.\S+$/.test(guestEmail) ||
        !Number.isInteger(guestCount) || guestCount < 1 ||
        !validDate(checkIn) || !validDate(checkOut) || checkOut <= checkIn) {
        return response.status(400).json({ message: "Valid reservation information is required." });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (checkIn < today) {
        return response.status(400).json({ message: "Check-in cannot be in the past." });
    }

    try {
        const reservation = await Reservation.create({
            clientId: request.user.id, tenantId, accommodationId, guestName,
            contactNumber, guestEmail, guestCount, checkIn, checkOut
        });
        return response.status(201).json({
            message: "Reservation submitted for resort approval.",
            reservation: {
                id: reservation.id,
                reference: reservation.reservationCode,
                totalAmount: reservation.totalAmount,
                status: "pending"
            }
        });
    } catch (error) {
        console.error("Reservation creation failed:", error);
        return response.status(error.status || 500).json({
            message: error.status ? error.message : "Unable to create the reservation."
        });
    }
}

async function listClientReservations(request, response) {
    try {
        response.json({ reservations: await Reservation.listForClient(request.user.id) });
    } catch (error) {
        response.status(500).json({ message: "Unable to load your reservations." });
    }
}

async function getClientReservation(request, response) {
    if (!validId(request.params.id)) {
        return response.status(400).json({ message: "A valid reservation is required." });
    }
    try {
        const reservation = await Reservation.findForClient(Number(request.params.id), request.user.id);
        if (!reservation) return response.status(404).json({ message: "Reservation was not found." });
        response.json({ reservation });
    } catch (error) {
        response.status(500).json({ message: "Unable to load the reservation." });
    }
}

async function listTenantReservations(request, response) {
    try {
        response.json({ reservations: await Reservation.listForTenant(request.user.tenantId) });
    } catch (error) {
        response.status(500).json({ message: "Unable to load resort reservations." });
    }
}

async function updateReservationStatus(request, response) {
    const status = String(request.body.status || "");
    const notes = String(request.body.notes || "").trim();
    if (!validId(request.params.id) || !["awaiting_deposit", "rejected"].includes(status)) {
        return response.status(400).json({ message: "A valid reservation status is required." });
    }
    if (status === "rejected" && !notes) {
        return response.status(400).json({ message: "A rejection note is required." });
    }
    try {
        const updated = await Reservation.updateStatus({
            reservationId: Number(request.params.id),
            tenantId: request.user.tenantId,
            reviewerId: request.user.id,
            status,
            notes
        });
        if (!updated) {
            return response.status(404).json({ message: "A pending reservation was not found." });
        }
        response.json({ message: status === "awaiting_deposit" ? "Reservation accepted. The client has 12 hours to submit the deposit."
            : "Reservation rejected."
        });
    } catch (error) {
        response.status(500).json({ message: "Unable to update the reservation." });
    }
}

module.exports = {
    listResorts,
    listAccommodations,
    listUnavailableDates,
    clientProfile,
    createReservation,
    listClientReservations,
    getClientReservation,
    listTenantReservations,
    updateReservationStatus
};
