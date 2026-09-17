const express = require("express");
const authController = require("../controllers/authController");

const {authenticateUser} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", authController.login);

router.post("/google", authController.googleLogin);

router.post("/signup", authController.signup);

router.get("/me", authenticateUser, authController.getCurrentUser);

router.post(
    "/switch-context",
    authenticateUser,
    authController.switchContext
);

module.exports = router;
