const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const upload = require("../middleware/uploadMiddleware");
const { extractText } = require("../services/ocrService");
const authRoutes = require("../routes/authRoutes");

const {
    authenticateUser,
    requireRole
} = require("../middleware/authMiddleware");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use(express.static(path.resolve(__dirname, "../../frontend")));
app.use("/uploads", express.static(path.resolve(__dirname)));


app.get("/api/health", async (request, response) => {
	try {
		await pool.query("SELECT 1");
		response.json({ status: "ok", database: "connected" });
	} catch (error) {
		response.status(503).json({ status: "error", database: "unavailable" });
	}
});

app.get("/api/admin/tenants", async (request, response) => {
	try {
		const [tenants] = await pool.execute(
			`SELECT id, tenant_code, resort_name, resort_type, location,
					owner_name, owner_email, approval_status, tenant_status, created_at
			 FROM tenants
			 ORDER BY created_at DESC`
		);

		response.json(tenants);
	} catch (error) {
		response.status(500).json({ message: "Unable to load resort applications." });
	}
});

app.patch("/api/admin/tenants/:id/status", async (request, response) => {
	const tenantId = Number(request.params.id);
	const { status, reviewNotes } = request.body;

	if (!Number.isInteger(tenantId) || !["approved", "rejected"].includes(status)) {
		return response.status(400).json({ message: "A valid tenant and status are required." });
	}

	if (status === "rejected" && !reviewNotes?.trim()) {
		return response.status(400).json({ message: "A review note is required when rejecting an application." });
	}

	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();
		const tenantStatus = status === "approved" ? "active" : "inactive";
		const actionType = status === "approved" ? "tenant_approved" : "tenant_rejected";

		const [updateResult] = await connection.execute(
			`UPDATE tenants
			 SET approval_status = ?, tenant_status = ?, review_notes = ?, reviewed_at = NOW()
			 WHERE id = ?`,
			[status, tenantStatus, reviewNotes?.trim() || null, tenantId]
		);

		if (updateResult.affectedRows !== 1) {
			await connection.rollback();
			return response.status(404).json({ message: "Tenant application was not found." });
		}

		await connection.execute(
			`INSERT INTO activity_logs (tenant_id, action_type, entity_type, entity_id, action_details)
			 VALUES (?, ?, 'tenant', ?, ?)`,
			[tenantId, actionType, tenantId, reviewNotes?.trim() || null]
		);

		await connection.commit();
		response.json({ message: `Tenant application ${status}.` });
	} catch (error) {
		await connection.rollback();
		console.error("Tenant status update failed:", error);
		response.status(500).json({ message: "Unable to update tenant application." });
	} finally {
		connection.release();
	}
});

app.post("/api/onboarding/resorts/:id/complete", upload.single("resortLogo"), async (request, response) => {
	const tenantId = Number(request.params.id);
	const {
		password,
		description,
		contactNumber,
		contactEmail,
		resortName,
		resortType,
		location
	} = request.body;

	if (!Number.isInteger(tenantId) || !password || password.length < 6 ||
		!description?.trim() || !contactNumber?.trim() || !contactEmail?.trim() ||
		!resortName?.trim() || !resortType || !location?.trim()) {
		return response.status(400).json({ message: "All required resort information must be completed." });
	}

	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();
		const [tenants] = await connection.execute(
			`SELECT owner_name, owner_email
			 FROM tenants
			 WHERE id = ? AND approval_status = 'approved' AND tenant_status = 'active'`,
			[tenantId]
		);

		if (tenants.length !== 1) {
			await connection.rollback();
			return response.status(403).json({ message: "This resort is not approved for account setup." });
		}

		const nameParts = tenants[0].owner_name.trim().split(/\s+/).reduce(
			(parts, part, index) => {
				if (index === 0) parts[0] = part;
				else parts[1] += `${parts[1] ? " " : ""}${part}`;
				return parts;
			},
			["", ""]
		);
		const passwordHash = await bcrypt.hash(password, 12);
		const logoPath = request.file
			? path.relative(path.resolve(__dirname, "../.."), request.file.path)
			: null;

		const [userResult] = await connection.execute(
			`INSERT INTO users
				(tenant_id, first_name, last_name, email, password_hash, role, account_status, setup_status)
			 VALUES (?, ?, ?, ?, ?, 'resort_admin', 'active', 'completed')`,
			[tenantId, nameParts[0], nameParts[1], tenants[0].owner_email, passwordHash]
		);

		await connection.execute(
			`UPDATE tenants
			 SET resort_name = ?, resort_type = ?, location = ?, description = ?,
				 contact_number = ?, contact_email = ?, logo_path = COALESCE(?, logo_path)
			 WHERE id = ?`,
			[resortName.trim(), resortType, location.trim(), description.trim(), contactNumber.trim(), contactEmail.trim(), logoPath, tenantId]
		);

		await connection.execute(
			`INSERT INTO activity_logs (tenant_id, user_id, action_type, entity_type, entity_id, action_details)
			 VALUES (?, ?, 'user_created', 'user', ?, 'Resort administrator account completed setup')`,
			[tenantId, userResult.insertId, userResult.insertId]
		);

		await connection.commit();
		response.status(201).json({ message: "Resort account setup completed." });
	} catch (error) {
		await connection.rollback();
		console.error("Resort account setup failed:", error);
		response.status(500).json({ message: "Unable to complete resort account setup." });
	} finally {
		connection.release();
	}
});

app.post("/api/onboarding/resorts", upload.single("license"), async (request, response) => {
	const {
		resortName,
		resortType,
		location,
		ownerName,
		ownerEmail
	} = request.body;

	if (!resortName || !resortType || !location || !ownerName || !ownerEmail || !request.file) {
		return response.status(400).json({
			message: "Resort details and a license image are required."
		});
	}

	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		const tenantCode = `TEN-${Date.now().toString().slice(-8)}`;
		const [tenantResult] = await connection.execute(
			`INSERT INTO tenants
				(tenant_code, resort_name, resort_type, location, owner_name, owner_email,
				 approval_status, tenant_status)
			 VALUES (?, ?, ?, ?, ?, ?, 'pending', 'inactive')`,
			[tenantCode, resortName.trim(), resortType, location.trim(), ownerName.trim(), ownerEmail.trim()]
		);

		let ocrText = "";
		let ocrStatus = "processing";

		try {
			ocrText = await extractText(request.file.path);
			ocrStatus = "completed";
		} catch (error) {
			ocrStatus = "failed";
		}

		await connection.execute(
			`INSERT INTO documents
				(tenant_id, document_type, original_filename, file_path, mime_type,
				 file_size, ocr_status, extracted_text, verification_status)
			 VALUES (?, 'resort_license', ?, ?, ?, ?, ?, ?, 'pending')`,
			[
				tenantResult.insertId,
				request.file.originalname,
				path.relative(path.resolve(__dirname, "../.."), request.file.path),
				request.file.mimetype,
				request.file.size,
				ocrStatus,
				ocrText || null
			]
		);

		await connection.commit();
		response.status(201).json({
			message: "Resort application submitted for review.",
			tenantCode,
			ocrStatus
		});
	} catch (error) {
		await connection.rollback();
		response.status(500).json({ message: "Unable to submit resort application." });
	} finally {
		connection.release();
	}
});

app.use((error, request, response, next) => {
	if (error.message) {
		return response.status(400).json({ message: error.message });
	}

	next(error);
});

module.exports = app;
