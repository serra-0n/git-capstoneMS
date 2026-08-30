const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadDirectory = path.resolve(__dirname, "../uploads/files");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
	destination: uploadDirectory,
	filename: (request, file, callback) => {
		const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
		callback(null, `${Date.now()}-${safeName}`);
	}
});

module.exports = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (request, file, callback) => {
		const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

		if (!allowedTypes.includes(file.mimetype)) {
			return callback(new Error("Only JPG, PNG, and WEBP files are allowed."));
		}

		callback(null, true);
	}
});
