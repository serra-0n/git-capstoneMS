const { createWorker } = require("tesseract.js");

async function extractText(filePath) {
	const worker = await createWorker("eng");

	try {
		const result = await worker.recognize(filePath);
		return {
			text: result.data.text.trim(),
			confidence: Math.round(Number(result.data.confidence) || 0)
		};
	} finally {
		await worker.terminate();
	}
}

module.exports = { extractText };
