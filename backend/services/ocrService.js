const { createWorker } = require("tesseract.js");

async function extractText(filePath) {
	const worker = await createWorker("eng");

	try {
		const result = await worker.recognize(filePath);
		return result.data.text.trim();
	} finally {
		await worker.terminate();
	}
}

module.exports = { extractText };
