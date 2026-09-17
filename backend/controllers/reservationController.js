const Reservation = require("../models/Reservation");
const User = require("../models/User");
const pool = require("../config/database");
const path = require("path");
const fs = require("fs");

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
                contact_number: user.contact_number || "",
                role: user.role
            }
        });
    } catch (error) {
        response.status(500).json({ message: "Unable to load client information." });
    }
}

async function updateClientProfile(request, response) {
    const fullName = String(request.body.full_name || "").trim();
    const contactNumber = String(request.body.contact_number || "").trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || "";
    const lastName = nameParts.join(" ");

    if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80) {
        return response.status(400).json({
            message: "Enter both a first and last name, up to 80 characters each."
        });
    }

    if (contactNumber && !/^[0-9+()\-\s]{7,30}$/.test(contactNumber)) {
        return response.status(400).json({ message: "Enter a valid contact number." });
    }

    try {
        const user = await User.updateClientProfile(request.user.id, {
            firstName,
            lastName,
            contactNumber
        });

        return response.json({
            message: "Profile updated successfully.",
            client: {
                id: user.id,
                name: [user.first_name, user.last_name].filter(Boolean).join(" "),
                email: user.email,
                contact_number: user.contact_number || "",
                role: user.role
            }
        });
    } catch (error) {
        console.error("Client profile update failed:", error);
        return response.status(500).json({ message: "Unable to update your profile." });
    }
}

async function clientDashboard(request, response) {
    try {
        const user = await User.findById(request.user.id);
        const reservations = await Reservation.listForClient(request.user.id);
        const activeStatuses = new Set(["pending", "awaiting_deposit", "confirmed"]);
        const active = reservations.filter((item) => activeStatuses.has(item.reservation_status));
        const current = active[0] || null;
        const [[documentCount]] = await pool.execute(
            "SELECT COUNT(*) AS total FROM documents WHERE client_id = ?",
            [request.user.id]
        );

        return response.json({
            dashboard: {
                client: {
                    id: user.id,
                    name: [user.first_name, user.last_name].filter(Boolean).join(" ")
                },
                summary: {
                    active_reservations: active.length,
                    payment_status: current?.payment_status || "No active payment",
                    uploaded_documents: Number(documentCount.total)
                },
                current_reservation: current
            }
        });
    } catch (error) {
        console.error("Client dashboard failed:", error);
        return response.status(500).json({ message: "Unable to load dashboard information." });
    }
}

async function listClientNotifications(request, response) {
    try {
        const [reservationRows] = await pool.execute(
            `SELECT id, reservation_code, reservation_status, updated_at
             FROM reservations WHERE client_id = ? ORDER BY updated_at DESC LIMIT 25`,
            [request.user.id]
        );
        const [paymentRows] = await pool.execute(
            `SELECT p.id, p.reservation_id, r.reservation_code,
                    p.verification_status, p.updated_at
             FROM payments p
             JOIN reservations r ON r.id = p.reservation_id
             WHERE p.client_id = ? ORDER BY p.updated_at DESC LIMIT 25`,
            [request.user.id]
        );
        const [documentRows] = await pool.execute(
            `SELECT d.id, d.reservation_id, r.reservation_code,
                    d.verification_status, d.updated_at
             FROM documents d
             JOIN reservations r ON r.id = d.reservation_id
             WHERE d.client_id = ? ORDER BY d.updated_at DESC LIMIT 25`,
            [request.user.id]
        );

        const notifications = [
            ...reservationRows.map((item) => ({
                id: `reservation-${item.id}`,
                reservation_id: item.id,
                reservation_reference: item.reservation_code,
                related_type: "reservation",
                message: `Reservation status: ${item.reservation_status.replaceAll("_", " ")}.`,
                updated_at: item.updated_at
            })),
            ...paymentRows.map((item) => ({
                id: `payment-${item.id}`,
                reservation_id: item.reservation_id,
                reservation_reference: item.reservation_code,
                related_type: "payment",
                message: `Payment verification status: ${item.verification_status.replaceAll("_", " ")}.`,
                updated_at: item.updated_at
            })),
            ...documentRows.map((item) => ({
                id: `document-${item.id}`,
                reservation_id: item.reservation_id,
                reservation_reference: item.reservation_code,
                related_type: "document",
                message: `Document verification status: ${item.verification_status.replaceAll("_", " ")}.`,
                updated_at: item.updated_at
            }))
        ].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, 50);

        return response.json({ notifications });
    } catch (error) {
        console.error("Client notification list failed:", error);
        return response.status(500).json({ message: "Unable to load notifications." });
    }
}

async function listClientDocuments(request, response) {
    try {
        const [documents] = await pool.execute(
            `SELECT d.id, d.client_id, d.reservation_id, r.reservation_code,
                    d.document_type, d.original_filename AS file_name,
                    d.verification_status, d.created_at
             FROM documents d
             JOIN reservations r ON r.id = d.reservation_id
             WHERE d.client_id = ?
             ORDER BY d.created_at DESC`,
            [request.user.id]
        );
        return response.json({ documents });
    } catch (error) {
        console.error("Client document list failed:", error);
        return response.status(500).json({ message: "Unable to load uploaded documents." });
    }
}

async function uploadClientDocument(request, response) {
    const reservationId = Number(request.body.reservation_id);
    const documentType = String(request.body.document_type || "").trim();
    const allowedTypes = new Set(["valid_id", "reservation_form", "other"]);

    if (!validId(reservationId) || !allowedTypes.has(documentType) || !request.file) {
        if (request.file?.path) {
            fs.unlink(request.file.path, () => {});
        }
        return response.status(400).json({ message: "A reservation, document type, and image are required." });
    }

    try {
        const reservation = await Reservation.findForClient(reservationId, request.user.id);
        if (!reservation) {
            fs.unlink(request.file.path, () => {});
            return response.status(404).json({ message: "Reservation was not found." });
        }

        const projectRoot = path.resolve(__dirname, "../..");
        const storedPath = path.relative(projectRoot, request.file.path).replaceAll("\\", "/");
        const [result] = await pool.execute(
            `INSERT INTO documents
                (tenant_id, client_id, reservation_id, uploaded_by, document_type,
                 original_filename, file_path, mime_type, file_size, ocr_status,
                 verification_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
            [reservation.tenant_id, request.user.id, reservation.id, request.user.id,
             documentType, request.file.originalname, storedPath,
             request.file.mimetype, request.file.size]
        );

        return response.status(201).json({
            message: "Document uploaded successfully.",
            document: {
                id: result.insertId,
                client_id: request.user.id,
                reservation_id: reservation.id,
                reservation_reference: reservation.reservation_code,
                document_type: documentType,
                file_name: request.file.originalname,
                verification_status: "pending"
            }
        });
    } catch (error) {
        if (request.file?.path) {
            fs.unlink(request.file.path, () => {});
        }
        console.error("Client document upload failed:", error);
        return response.status(500).json({ message: "Unable to upload document." });
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
    const paymentPlan = String(request.body.payment_plan || "half").trim().toLowerCase();
    const allowedPaymentPlans = new Set(["full", "half", "later"]);

    if (!validId(tenantId) || !validId(accommodationId) || !guestName ||
        !contactNumber || !/^\S+@\S+\.\S+$/.test(guestEmail) ||
        !Number.isInteger(guestCount) || guestCount < 1 ||
        !validDate(checkIn) || !validDate(checkOut) || checkOut <= checkIn ||
        !allowedPaymentPlans.has(paymentPlan)) {
        return response.status(400).json({ message: "Valid reservation information is required." });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (checkIn < today) {
        return response.status(400).json({ message: "Check-in cannot be in the past." });
    }

    try {
        const reservation = await Reservation.create({
            clientId: request.user.id, tenantId, accommodationId, guestName,
            contactNumber, guestEmail, guestCount, checkIn, checkOut, paymentPlan
        });
        return response.status(201).json({
            message: "Reservation submitted for resort approval.",
            reservation: {
                id: reservation.id,
                reference: reservation.reservationCode,
                totalAmount: reservation.totalAmount,
                paymentPlan: reservation.paymentPlan,
                requiredPaymentAmount: reservation.requiredPaymentAmount,
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
    updateClientProfile,
    clientDashboard,
    listClientNotifications,
    listClientDocuments,
    uploadClientDocument,
    createReservation,
    listClientReservations,
    getClientReservation,
    listTenantReservations,
    updateReservationStatus
};
