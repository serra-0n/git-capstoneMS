const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const upload = require("../middleware/uploadMiddleware");
const { extractText } = require("../services/ocrService");
const { analyzeBusinessLicense } = require("../services/ocrAnalysisService");
const authRoutes = require("../routes/authRoutes");
const reservationRoutes = require("../routes/reservationRoutes");

const {
    authenticateUser,
    requireRole
} = require("../middleware/authMiddleware");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api", reservationRoutes);
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

app.get("/api/admin/tenants",authenticateUser,requireRole("system_admin"), async (request, response) => {
	try {
		const [tenants] = await pool.execute(
			`SELECT t.id, t.tenant_code, t.resort_name, t.business_name,
					t.business_registration_number, t.resort_type, t.location,
					t.owner_name, t.owner_email, t.approval_status, t.tenant_status,
					t.review_notes, t.created_at,
					d.original_filename AS license_filename,
					d.mime_type AS license_mime_type,
					d.ocr_status AS license_ocr_status,
					d.verification_status AS license_verification_status,
					d.extracted_text AS license_extracted_text,
					d.extracted_data AS license_extracted_data
			 FROM tenants t
			 LEFT JOIN documents d
				ON d.tenant_id = t.id
				AND d.document_type = 'resort_license'
			 ORDER BY t.created_at DESC`
		);

		response.json(tenants);
	} catch (error) {
		response.status(500).json({ message: "Unable to load resort applications." });
	}
});

app.get(
	"/api/admin/tenants/:id/license",
	authenticateUser,
	requireRole("system_admin"),
	async (request, response) => {
		const tenantId = Number(request.params.id);

		if (!Number.isInteger(tenantId)) {
			return response.status(400).json({ message: "A valid tenant is required." });
		}

		try {
			const [documents] = await pool.execute(
				`SELECT original_filename, file_path, mime_type
				 FROM documents
				 WHERE tenant_id = ? AND document_type = 'resort_license'
				 ORDER BY created_at DESC
				 LIMIT 1`,
				[tenantId]
			);

			if (documents.length !== 1) {
				return response.status(404).json({ message: "No uploaded license was found." });
			}

			const document = documents[0];
			const absolutePath = path.resolve(__dirname, "../..", document.file_path);

			response.type(document.mime_type);
			response.set(
				"Content-Disposition",
				`inline; filename*=UTF-8''${encodeURIComponent(document.original_filename)}`
			);

			return response.sendFile(absolutePath);
		} catch (error) {
			console.error("License retrieval failed:", error);
			return response.status(500).json({ message: "Unable to load the uploaded license." });
		}
	}
);

app.post(
	"/api/admin/tenants/:id/license/reanalyze",
	authenticateUser,
	requireRole("system_admin"),
	async (request, response) => {
		const tenantId = Number(request.params.id);

		if (!Number.isInteger(tenantId)) {
			return response.status(400).json({ message: "A valid tenant is required." });
		}

		try {
			const [records] = await pool.execute(
				`SELECT t.business_name, t.business_registration_number,
					d.id AS document_id, d.file_path
				 FROM tenants t
				 JOIN documents d
					ON d.tenant_id = t.id
					AND d.document_type = 'resort_license'
				 WHERE t.id = ?
				 ORDER BY d.created_at DESC
				 LIMIT 1`,
				[tenantId]
			);

			if (records.length !== 1) {
				return response.status(404).json({ message: "No uploaded license was found." });
			}

			const record = records[0];
			const ocrResult = await extractText(
				path.resolve(__dirname, "../..", record.file_path)
			);
			const analysis = analyzeBusinessLicense({
				text: ocrResult.text,
				confidence: ocrResult.confidence,
				businessName: record.business_name,
				businessRegistrationNumber: record.business_registration_number
			});

			await pool.execute(
				`UPDATE documents
				 SET ocr_status = 'completed', extracted_text = ?, extracted_data = ?
				 WHERE id = ?`,
				[ocrResult.text || null, JSON.stringify(analysis), record.document_id]
			);

			return response.json({
				message: "OCR analysis completed.",
				extractedText: ocrResult.text,
				analysis
			});
		} catch (error) {
			console.error("License OCR reanalysis failed:", error);
			return response.status(500).json({ message: "Unable to analyze the uploaded license." });
		}
	}
);

app.get(
	"/api/resort-admin/context",
	authenticateUser,
	requireRole("resort_admin"),
	async (request, response) => {
		try {
			const [accounts] = await pool.execute(
				`SELECT u.id, u.first_name, u.last_name, u.email,
					t.id AS tenant_id, t.resort_name, t.resort_type,
					t.location, t.logo_path
				 FROM users u
				 JOIN tenants t ON t.id = u.tenant_id
				 WHERE u.id = ? AND t.id = ?
				 LIMIT 1`,
				[request.user.id, request.user.tenantId]
			);

			if (accounts.length !== 1) {
				return response.status(404).json({ message: "Resort account was not found." });
			}

			const account = accounts[0];

			return response.json({
				user: {
					id: account.id,
					firstName: account.first_name,
					lastName: account.last_name,
					email: account.email
				},
				resort: {
					id: account.tenant_id,
					name: account.resort_name,
					type: account.resort_type,
					location: account.location,
					hasLogo: Boolean(account.logo_path)
				}
			});
		} catch (error) {
			console.error("Resort-admin context failed:", error);
			return response.status(500).json({ message: "Unable to load the resort account." });
		}
	}
);

app.get(
	"/api/resort-admin/logo",
	authenticateUser,
	requireRole("resort_admin"),
	async (request, response) => {
		try {
			const [tenants] = await pool.execute(
				"SELECT logo_path FROM tenants WHERE id = ? LIMIT 1",
				[request.user.tenantId]
			);

			if (tenants.length !== 1 || !tenants[0].logo_path) {
				return response.status(404).json({ message: "No resort logo was found." });
			}

			return response.sendFile(
				path.resolve(__dirname, "../..", tenants[0].logo_path)
			);
		} catch (error) {
			console.error("Resort logo retrieval failed:", error);
			return response.status(500).json({ message: "Unable to load the resort logo." });
		}
	}
);

app.patch("/api/admin/tenants/:id/status", authenticateUser, requireRole("system_admin"), async (request, response) => {
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

		await connection.execute(
			`UPDATE documents
			 SET verification_status = ?, verification_notes = ?, verified_by = ?, verified_at = NOW()
			 WHERE tenant_id = ? AND document_type = 'resort_license'`,
			[
				status === "approved" ? "verified" : "rejected",
				reviewNotes?.trim() || null,
				request.user.id,
				tenantId
			]
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
		businessName,
		businessRegistrationNumber,
		resortType,
		location,
		ownerName,
		ownerEmail
	} = request.body;

	if (!resortName?.trim() || !businessName?.trim() ||
		!businessRegistrationNumber?.trim() || !resortType?.trim() ||
		!location?.trim() || !ownerName?.trim() || !ownerEmail?.trim() || !request.file) {
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
				(tenant_code, resort_name, business_name, business_registration_number,
				 resort_type, location, owner_name, owner_email,
				 approval_status, tenant_status)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'inactive')`,
			[
				tenantCode,
				resortName.trim(),
				businessName.trim(),
				businessRegistrationNumber.trim(),
				resortType.trim(),
				location.trim(),
				ownerName.trim(),
				ownerEmail.trim().toLowerCase()
			]
		);

		let ocrText = "";
		let ocrStatus = "processing";
		let ocrAnalysis = null;

		try {
			const ocrResult = await extractText(request.file.path);
			ocrText = ocrResult.text;
			ocrAnalysis = analyzeBusinessLicense({
				text: ocrResult.text,
				confidence: ocrResult.confidence,
				businessName: businessName.trim(),
				businessRegistrationNumber: businessRegistrationNumber.trim()
			});
			ocrStatus = "completed";
		} catch (error) {
			ocrStatus = "failed";
		}

		await connection.execute(
			`INSERT INTO documents
				(tenant_id, document_type, original_filename, file_path, mime_type,
				 file_size, ocr_status, extracted_text, extracted_data, verification_status)
			 VALUES (?, 'resort_license', ?, ?, ?, ?, ?, ?, ?, 'pending')`,
			[
				tenantResult.insertId,
				request.file.originalname,
				path.relative(path.resolve(__dirname, "../.."), request.file.path),
				request.file.mimetype,
				request.file.size,
				ocrStatus,
				ocrText || null,
				ocrAnalysis ? JSON.stringify(ocrAnalysis) : null
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
