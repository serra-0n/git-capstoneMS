"use strict";

const express = require("express");
const controller = require("../controllers/roomController");
const upload = require("../middleware/uploadMiddleware");

const {
    authenticateUser,
    requireRole
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/resort-admin/rooms",
    authenticateUser,
    requireRole("resort_admin"),
    upload.single("image"),
    controller.createRoom
);

router.put(
    "/resort-admin/rooms/:id",
    authenticateUser,
    requireRole("resort_admin"),
    upload.single("image"),
    controller.updateRoom
);

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
