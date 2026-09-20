const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("../config/database");
const TenantMembership = require("../models/TenantMembership");
const upload = require("../middleware/uploadMiddleware");
const { extractText } = require("../services/ocrService");
const { analyzeBusinessLicense } = require("../services/ocrAnalysisService");
const authRoutes = require("../routes/authRoutes");
const reservationRoutes = require("../routes/reservationRoutes");
const paymentRoutes = require("../routes/paymentRoutes");
const roomRoutes = require("../routes/roomRoutes");
const adminOverviewRoutes = require("../routes/adminOverviewRoutes");

const {
    authenticateUser,
    requireRole
} = require("../middleware/authMiddleware");

const app = express();

async function processResortLicenseOcr({
	documentId,
	filePath,
	businessName,
	businessRegistrationNumber
}) {
	try {
		const ocrResult = await extractText(filePath);
		const analysis = analyzeBusinessLicense({
			text: ocrResult.text,
			confidence: ocrResult.confidence,
			businessName,
			businessRegistrationNumber
		});

		await pool.execute(
			`UPDATE documents
			 SET ocr_status = 'completed',
				 extracted_text = ?,
				 extracted_data = ?
			 WHERE id = ?`,
			[
				ocrResult.text || null,
				JSON.stringify(analysis),
				documentId
			]
		);
	} catch (error) {
		console.error("Resort license OCR failed:", error);

		await pool.execute(
			`UPDATE documents
			 SET ocr_status = 'failed',
				 extracted_text = NULL,
				 extracted_data = NULL
			 WHERE id = ?`,
			[documentId]
		);
	}
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api", reservationRoutes);
app.use("/api", paymentRoutes);
app.use("/api", roomRoutes);
app.use("/api/admin", adminOverviewRoutes);
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
					t.owner_name, t.owner_email, t.contact_number, t.approval_status, t.tenant_status,
					t.review_notes, t.created_at,
					(SELECT COUNT(*) FROM tenant_memberships tm WHERE tm.tenant_id = t.id) AS total_users,
					(SELECT COUNT(*) FROM reservations r WHERE r.tenant_id = t.id
					 AND r.reservation_status NOT IN ('cancelled', 'rejected', 'expired')) AS active_reservations,
					(SELECT MAX(u.last_login) FROM users u JOIN tenant_memberships tm2 ON tm2.user_id = u.id
					 WHERE tm2.tenant_id = t.id) AS last_login,
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
				`SELECT
					users.id,
					users.first_name,
					users.last_name,
					users.email,
					tenants.id AS tenant_id,
					tenants.resort_name,
					tenants.resort_type,
					tenants.location,
					tenants.logo_path,
					tenant_memberships.membership_role
				FROM users
				INNER JOIN tenant_memberships
					ON tenant_memberships.user_id = users.id
				INNER JOIN tenants
					ON tenants.id = tenant_memberships.tenant_id
				WHERE users.id = ?
					AND tenants.id = ?
					AND tenant_memberships.membership_status = 'active'
					AND tenant_memberships.membership_role IN ('owner', 'admin')
					AND tenants.approval_status = 'approved'
					AND tenants.tenant_status = 'active'
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
					membershipRole: account.membership_role,
					hasLogo: Boolean(account.logo_path)
				}
			});
		} catch (error) {
			console.error("Resort-admin context failed:", error);
			return response.status(500).json({ message: "Unable to load the resort account." });
		}
	}
);

app.get("/api/resort-admin/payment-settings",
	authenticateUser,
	requireRole("resort_admin"),
	async function (request, response) {
		try {
			const [tenants] = await pool.execute(
				`SELECT gcash_account_name, gcash_number, gcash_qr_path
				FROM tenants
				WHERE id = ?
				LIMIT 1`,
				[request.user.tenantId],
			);

			if (tenants.length !== 1) {
				return response.status(404).json({
					message: "Resort account was not found.",
				});
			}

			return response.json({paymentSettings: tenants[0],});
		} catch (error) {
			console.error("Gcash settings retrieval failed:", error);
			return response.status(500).json({
				message: "Unable to load Gcash settings."
			});
		}
	},
);

app.patch("/api/resort-admin/payment-settings",
	authenticateUser,
	requireRole("resort_admin"),
	upload.single("gcash_qr"),
	async function (request, response) {
		const accountName = String(request.body.gcash_account_name || "",).trim();

		const gcashNumber = String(request.body.gcash_number || "",)
			.replaceAll(" ", "")
			.replaceAll("-", "")
			.trim();

		if (!accountName) {
			return response.status(400).json({
				message: "The Gcash account name is required.",
			});
		}

		if (!/^09\d{9}$/.test(gcashNumber)) {
			return response.status(400).json({
				message: "Enter a valid 11-digit Gcash number.",
			});
		}

		try {
			const [tenants] = await pool.execute(
				`SELECT gcash_qr_path
				FROM tenants
				WHERE id = ?
				LIMIT 1`,
				[request.user.tenantId],
			);

			if (tenants.length !== 1) {
				return response.status(404).json({
					message: "Resort account was not found.",
				});
			}

			const gcashQrPath = request.file
				? `uploads/files/${request.file.filename}`
				: tenants[0].gcash_qr_path;

			if (!gcashQrPath) {
				return response.status(400).json({
					message: "Upload your Gcash QR image.",
				});
			}

			await pool.execute(
				`UPDATE tenants
				SET gcash_account_name = ?,
					gcash_number = ?,
					gcash_qr_path = ?
				WHERE id = ?`,
				[
					accountName,
					gcashNumber,
					gcashQrPath,
					request.user.tenantId
				],
			);

			return response.json({
				message: "Gcash payment settings saved successfully.",
				paymentSettings: {
					gcash_account_name: accountName,
					gcash_number: gcashNumber,
					gcash_qr_path: gcashQrPath,
				},
			});
		} catch (error) {
			console.error("Gcash settings update failed.", error);
			return response.status(500).json({
				message: "Unable to save Gcash settings."
			})
		}
	}
)

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

		const membershipStatus =
			status === "approved"
				? "active"
				: "suspended";

		await TenantMembership.updateOwnerMembershipStatus(
			tenantId,
			membershipStatus,
			connection
		);

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

app.post("/api/onboarding/resorts", authenticateUser, requireRole("client"), upload.single("license"), async (request, response) => {
	const {
		resortName,
		businessName,
		businessRegistrationNumber,
		resortType,
		location
	} = request.body;

	if (
		!resortName?.trim() ||
		!businessName?.trim() ||
		!businessRegistrationNumber?.trim() ||
		!resortType?.trim() ||
		!location?.trim() ||
		!request.file
	) {
		return response.status(400).json({
			message: "Resort details and a license image are required."
		});
	}

	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		const [owners] = await connection.execute(
			`SELECT first_name, last_name, email
			FROM users
			WHERE id = ?
				AND account_status = 'active'
			LIMIT 1`,
			[request.user.id]
		);

		if (owners.length !== 1) {
			await connection.rollback();

			return response.status(403).json({
				message: "The owner account is unavailable."
			});
		}

		const owner = owners[0];

		const ownerName = [owner.first_name, owner.last_name]
			.filter(Boolean)
			.join(" ");

		const ownerEmail = owner.email;

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
				ownerName,
				ownerEmail
			]
		);

		await TenantMembership.createOwnerMembership(
			request.user.id,
			tenantResult.insertId,
			connection
		);

		const storedFilePath = path.relative(
			path.resolve(__dirname, "../.."),
			request.file.path
		).replaceAll("\\", "/");

		const [documentResult] = await connection.execute(
			`INSERT INTO documents
				(tenant_id, document_type, original_filename, file_path, mime_type,
				 file_size, ocr_status, extracted_text, extracted_data, verification_status)
			 VALUES (?, 'resort_license', ?, ?, ?, ?, 'processing', NULL, NULL, 'pending')`,
			[
				tenantResult.insertId,
				request.file.originalname,
				storedFilePath,
				request.file.mimetype,
				request.file.size
			]
		);

		await connection.commit();

		response.status(201).json({
			message: "Resort application submitted for review.",
			tenantCode,
			ocrStatus: "processing"
		});

		setImmediate(() => {
			processResortLicenseOcr({
				documentId: documentResult.insertId,
				filePath: request.file.path,
				businessName: businessName.trim(),
				businessRegistrationNumber: businessRegistrationNumber.trim()
			}).catch((error) => {
				console.error("Unable to save the OCR failure state:", error);
			});
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
