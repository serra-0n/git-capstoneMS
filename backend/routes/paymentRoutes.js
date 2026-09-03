"use strict";

const express = require("express");
const paymentController = require("../controllers/paymentController");
const upload = require("../middleware/uploadMiddleware");

const {authenticateUser, requireRole} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/resort-admin/payments",
    authenticateUser,
    requireRole("resort_admin"),
    paymentController.listTenantPayments
);

router.post(
    "/client/payments",
    authenticateUser,
    requireRole("client"),
    upload.single("proof_of_payment"),
    paymentController.submitDeposit
);

router.patch(
    "/resort-admin/payments/:id/review",
    authenticateUser,
    requireRole("resort_admin"),
    paymentController.reviewTenantPayment
);

module.exports = router;
