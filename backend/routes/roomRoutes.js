"use strict";

const express = require("express");
const controller = require("../controllers/roomController");

const {
    authenticateUser,
    requireRole
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/resort-admin/rooms",
    authenticateUser,
    requireRole("resort_admin"),
    controller.listRooms
);

router.patch(
    "/resort-admin/rooms/:id/status",
    authenticateUser,
    requireRole("resort_admin"),
    controller.updateRoomStatus
);

module.exports = router;