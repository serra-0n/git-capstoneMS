const express = require("express");
const authController = require("../controllers/authController");

const {authenticateUser} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", authController.login);

router.post("/login/verify-otp", authController.verifyLoginOtp);

router.post("/google", authController.googleLogin);

router.post("/google/verify-otp", authController.verifyGoogleLoginOtp);

router.post("/signup/request-otp", authController.requestSignupOtp);

router.post("/signup/verify-otp", authController.verifySignupOtp);

router.post("/signup", authController.signup);

router.get("/me", authenticateUser, authController.getCurrentUser);

router.post("/switch-context", authenticateUser, authController.switchContext);

module.exports = router;
