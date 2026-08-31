const express = require("express");
const authController = require("../controllers/authController");

const {authenticateUser} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", authController.login);

router.post("/signup", authController.signup);

router.get("/me", authenticateUser, authController.getCurrentUser);

module.exports = router;