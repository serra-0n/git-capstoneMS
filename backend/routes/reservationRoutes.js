const express = require("express");
const controller = require("../controllers/reservationController");
const { authenticateUser, requireRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/resorts", authenticateUser, requireRole("client"), controller.listResorts);
router.get("/resorts/:id/accommodations", authenticateUser, requireRole("client"), controller.listAccommodations);
router.get("/accommodations/:id/unavailable-dates", authenticateUser, requireRole("client"), controller.listUnavailableDates);
router.get("/client/profile", authenticateUser, requireRole("client"), controller.clientProfile);
router.put("/client/profile", authenticateUser, requireRole("client"), controller.updateClientProfile);
router.get("/client/dashboard", authenticateUser, requireRole("client"), controller.clientDashboard);
router.get("/client/notifications", authenticateUser, requireRole("client"), controller.listClientNotifications);
router.get("/client/documents", authenticateUser, requireRole("client"), controller.listClientDocuments);
router.post("/client/documents", authenticateUser, requireRole("client"), upload.single("document_file"), controller.uploadClientDocument);
router.post("/client/reservations", authenticateUser, requireRole("client"), controller.createReservation);
router.get("/client/reservations", authenticateUser, requireRole("client"), controller.listClientReservations);
router.get("/client/reservations/:id", authenticateUser, requireRole("client"), controller.getClientReservation);
router.get("/resort-admin/reservations", authenticateUser, requireRole("resort_admin"), controller.listTenantReservations);
router.patch("/resort-admin/reservations/:id/status", authenticateUser, requireRole("resort_admin"), controller.updateReservationStatus);

module.exports = router;
