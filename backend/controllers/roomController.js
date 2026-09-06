"use strict";

const Room = require("../models/Room");

const allowedStatuses = new Set([
    "available",
    "maintenance",
    "inactive"
]);

function validId(value) {
    return Number.isInteger(Number(value)) &&
        Number(value) > 0;
}

async function listRooms(request, response) {
    try {
        const rooms = await Room.listForTenant(request.user.tenantId);
        return response.json({ rooms });
    } catch (error) {
        console.error("Room list failed:", error);

        return response.status(500).json({
            message: "Unable to load rooms and cottages."
        });
    }
}

async function updateRoomStatus(request, response) {
    const roomId = Number(request.params.id);
    const status = String(request.body.status || "")
        .trim()
        .toLowerCase();

    if (!validId(roomId)) {
        return response.status(400).json({
            message: "A valid room is required."
        });
    }

    if (!allowedStatuses.has(status)) {
        return response.status(400).json({
            message: "A valid availability status is required."
        });
    }

    try {
        const updated = await Room.updateAvailabilityStatus({
            roomId,
            tenantId: request.user.tenantId,
            status
        });

        if (!updated) {
            return response.status(404).json({
                message: "Room or cottage was not found."
            });
        }

        return response.json({
            message: "Availability status updated.",
            status
        });
    } catch (error) {
        console.error("Room status update failed:", error);

        return response.status(500).json({
            message: "Unable to update availability status."
        });
    }
}

module.exports = {
    listRooms,
    updateRoomStatus
};
