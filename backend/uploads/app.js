const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("../config/database");
const upload = require("../middleware/uploadMiddleware");
const { extractText } = require("../services/ocrService");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
