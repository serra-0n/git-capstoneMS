"use strict";

const fs = require("fs");
const path = require("path");
const Room = require("../models/Room");

const allowedStatuses = new Set(["available", "maintenance", "inactive"]);
const allowedTypes = new Set(["room", "cottage", "villa", "other"]);

function validId(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

function uploadedImagePath(file) {
    return file ? `/uploads/files/${file.filename}` : null;
}

function removeFile(filePath) {
    if (filePath) fs.unlink(filePath, () => {});
}

function removeStoredImage(imagePath) {
    const relativePath = String(imagePath || "").replace(/^\/uploads\//, "");
    if (!relativePath || relativePath.includes("..")) return;
    removeFile(path.resolve(__dirname, "../uploads", relativePath));
}

function parseRoomInput(body) {
    return {
        name: String(body.name || "").trim(),
        accommodationType: String(body.accommodation_type || "").trim().toLowerCase(),
        capacity: Number(body.capacity),
        amenities: String(body.amenities || "").trim(),
        nightlyRate: Number(body.nightly_rate),
        description: String(body.description || "").trim(),
        status: String(body.availability_status || "available").trim().toLowerCase(),
    };
}

function validateRoomInput(room) {
    if (!room.name || room.name.length > 150) return "A valid room or cottage name is required.";
    if (!allowedTypes.has(room.accommodationType)) return "A valid accommodation type is required.";
    if (!Number.isInteger(room.capacity) || room.capacity < 1) return "Capacity must be at least one guest.";
    if (!Number.isFinite(room.nightlyRate) || room.nightlyRate <= 0) return "A valid nightly rate is required.";
    if (!allowedStatuses.has(room.status)) return "A valid availability status is required.";
    if (room.description.length > 2000) return "The description must be 2,000 characters or fewer.";
    if (room.amenities.length > 1000) return "The amenities list is too long.";
    return null;
}

async function listRooms(request, response) {
    try {
        return response.json({ rooms: await Room.listForTenant(request.user.tenantId) });
    } catch (error) {
        console.error("Room list failed:", error);
        return response.status(500).json({ message: "Unable to load rooms and cottages." });
    }
}

async function createRoom(request, response) {
    const input = parseRoomInput(request.body);
    const validationError = validateRoomInput(input);
    if (validationError) {
        removeFile(request.file?.path);
        return response.status(400).json({ message: validationError });
    }

    try {
        const room = await Room.create({
            tenantId: request.user.tenantId,
            ...input,
            imagePath: uploadedImagePath(request.file),
        });
        return response.status(201).json({ message: "Room or cottage added successfully.", room });
    } catch (error) {
        removeFile(request.file?.path);
        console.error("Room creation failed:", error);
        return response.status(500).json({ message: "Unable to add the room or cottage." });
    }
}

async function updateRoom(request, response) {
    const roomId = Number(request.params.id);
    const input = parseRoomInput(request.body);
    const validationError = !validId(roomId) ? "A valid room is required." : validateRoomInput(input);
    if (validationError) {
        removeFile(request.file?.path);
        return response.status(400).json({ message: validationError });
    }

    try {
        const existing = await Room.findForTenant(roomId, request.user.tenantId);
        if (!existing) {
            removeFile(request.file?.path);
            return response.status(404).json({ message: "Room or cottage was not found." });
        }

        const nextImagePath = uploadedImagePath(request.file) || existing.image_path;
        const updated = await Room.update({
            roomId,
            tenantId: request.user.tenantId,
            ...input,
            imagePath: nextImagePath,
        });
        if (!updated) {
            removeFile(request.file?.path);
            return response.status(404).json({ message: "Room or cottage was not found." });
        }

        if (request.file && existing.image_path && existing.image_path !== nextImagePath) {
            removeStoredImage(existing.image_path);
        }
        return response.json({ message: "Accommodation updated successfully." });
    } catch (error) {
        removeFile(request.file?.path);
        console.error("Room update failed:", error);
        return response.status(500).json({ message: "Unable to update the room or cottage." });
    }
}

async function updateRoomStatus(request, response) {
    const roomId = Number(request.params.id);
    const status = String(request.body.status || "").trim().toLowerCase();
    if (!validId(roomId)) return response.status(400).json({ message: "A valid room is required." });
    if (!allowedStatuses.has(status)) return response.status(400).json({ message: "A valid availability status is required." });

    try {
        const updated = await Room.updateAvailabilityStatus({ roomId, tenantId: request.user.tenantId, status });
        if (!updated) return response.status(404).json({ message: "Room or cottage was not found." });
        return response.json({ message: "Availability status updated.", status });
    } catch (error) {
        console.error("Room status update failed:", error);
        return response.status(500).json({ message: "Unable to update availability status." });
    }
}

module.exports = { createRoom, listRooms, updateRoom, updateRoomStatus };
