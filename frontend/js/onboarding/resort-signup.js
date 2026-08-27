const form = document.getElementById("resortSignupForm");
const submitButton = document.getElementById("submitButton");
const formMessage = document.getElementById("formMessage");

if (form && submitButton && formMessage) {
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		submitButton.disabled = true;
		submitButton.textContent = "Submitting...";
		formMessage.textContent = "";

		try {
			const response = await fetch("/api/onboarding/resorts", {
				method: "POST",
				body: new FormData(form)
			});
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Submission failed.");
			}

			formMessage.textContent = `Application submitted. Tenant code: ${result.tenantCode}. OCR: ${result.ocrStatus}.`;
			form.reset();
		} catch (error) {
			formMessage.textContent = error.message;
		} finally {
			submitButton.disabled = false;
			submitButton.textContent = "Submit application";
		}
	});
}
