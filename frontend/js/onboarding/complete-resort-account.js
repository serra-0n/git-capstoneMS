document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("completeResortAccountForm");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const passwordToggle = document.getElementById("passwordToggle");
    const confirmPasswordToggle = document.getElementById("confirmPasswordToggle");
    const passwordIcon = document.getElementById("passwordIcon");
    const confirmPasswordIcon = document.getElementById("confirmPasswordIcon");
    const resortLogo = document.getElementById("resortLogo");
    const description = document.getElementById("description");
    const contactNumber = document.getElementById("contactNumber");
    const contactEmail = document.getElementById("contactEmail");
    const resortName = document.getElementById("resortName");
    const resortType = document.getElementById("resortType");
    const location = document.getElementById("location");

    const progressText = document.querySelector(".progress-header strong");
    const progressBar = document.querySelector(".progress-bar span");
    const formMessage = document.getElementById("formMessage");
    const completeAccountButton = document.getElementById("completeAccountButton");

    function setupPasswordToggle(toggleButton, passwordInput, icon) {
        if (!toggleButton || !passwordInput || !icon) {
            return;
        }

        toggleButton.addEventListener("click", function () {
            const isPassword = passwordInput.type === "password";

            if (isPassword) {
                passwordInput.type = "text";
                toggleButton.setAttribute("aria-label", "Hide password");
                icon.setAttribute("data-lucide", "eye-off");
            } else {
                passwordInput.type = "password";
                toggleButton.setAttribute("aria-label", "Show password");
                icon.setAttribute("data-lucide", "eye");
            }

            if (typeof lucide !== "undefined") {
                lucide.createIcons();
            }
        });
    }

    setupPasswordToggle(passwordToggle, password, passwordIcon);

    setupPasswordToggle(confirmPasswordToggle, confirmPassword, confirmPasswordIcon);

    function checkPasswordMatch() {
        if (!password || !confirmPassword) {
            return true;
        }

        if (confirmPassword.value.length > 0 && password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity("Password do not match.");
            return false;
        } else {
            confirmPassword.setCustomValidity("");
            return true;
        }
    }

    password.addEventListener("input", function () {
        checkPasswordMatch();
        updateProgress();
    });

    confirmPassword.addEventListener("input", function () {
        checkPasswordMatch();
        updateProgress();
    });

    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    const allowedFileTypes = ["image/jpeg", "image/png", "image/webp"];

    if (resortLogo) {
        resortLogo.addEventListener("change", function () {
            clearMessage();

            const file = resortLogo.files[0];

            if (!file) {
                updateProgress();
                return;
            }
            /* Check file type */
            if (!allowedFileTypes.includes(file.type)) {
                showMessage("Please upload a JPG, PNG, or WEBP image.", "error");
                resortLogo.value = "";
                updateProgress();
                return;
            }

            /* Check file size */
            if (file.size > MAX_FILE_SIZE) {
                showMessage("The resort logo must not be larger than 5 MB.", "error");
                resortLogo.value = "";
                updateProgress();
                return;
            }

            showMessage("Resort logo selected succcessfully.", "success");
            updateProgress();
        });
    }

    const fields = [
        password,
        confirmPassword,
        resortLogo,
        description,
        contactNumber,
        contactEmail,
        resortName,
        resortType,
        location,
    ];

    fields.forEach(function (field) {
        if (!field) {
            return;
        }

        field.addEventListener("input", updateProgress);
        field.addEventListener("change", updateProgress);
    });

    function isFieldComplete(field) {
        if (!field) {
            return false;
        }
        /* File input */
        if (field.type === "file") {
            return field.files.length > 0;
        }
        /* Select */
        if (field.tagName === "SELECT") {
            return field.value.trim() !== "";
        }
        /* text area */
        return field.value.trim() !== "";
    }

    function updateProgress() {
        const totalFields = fields.length;

        let completedFields = 0;

        fields.forEach(function (field) {
            if (isFieldComplete(field)) {
                completedFields++;
            }
        });

        const percentage = Math.round((completedFields / totalFields) * 100);

        if (progressText) {
            progressText.textContent = percentage + "%";
        }

        if (progressBar) {
            progressBar.style.width = percentage + "%";
        }
    }

    function showMessage(message, type) {
        if (!formMessage) {
            return;
        }

        formMessage.textContent = message;
        formMessage.classList.remove("success", "error");

        if (type) {
            formMessage.classList.add(type);
        }
    }

    function clearMessage() {
        if (!formMessage) {
            return;
        }

        formMessage.textContent = "";
        formMessage.classList.remove("success", "error");
    }

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            clearMessage();
            /* Check normal HTML validation */
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            /* Check password match */
            if (!checkPasswordMatch()) {
                showMessage("Passwords do not match.", "error");
                confirmPassword.focus();
                return;
            }
            /* Check logo */
            if (resortLogo && resortLogo.files.length > 0) {
                const file = resortLogo.files[0];

                if (!allowedFileTypes.includes(file.type)) {
                    showMessage("Please upload a JPG, PNG, or WEBP image.", "error");
                    return;
                }

                if (file.size > MAX_FILE_SIZE) {
                    showMessage("The resort logo must not be larger than 5MB", "error");
                    return;
                }
            }
            if (completeAccountButton) {
                completeAccountButton.disabled = true;
                completeAccountButton.textContent = "Saving...";
            }

            const tenantId = new URLSearchParams(window.location.search).get("tenant_id");

            if (!tenantId) {
                showMessage("This setup link is missing the resort ID.", "error");
                completeAccountButton.disabled = false;
                completeAccountButton.textContent = "Complete resort profile";
                return;
            }

            const apiBaseUrl = window.location.port === "3000" ? "" : "http://localhost:3000";

            fetch(`${apiBaseUrl}/api/onboarding/resorts/${tenantId}/complete`, {
                method: "POST",
                body: new FormData(form),
            })
                .then(async function (response) {
                    const responseText = await response.text();
                    let result;

                    try {
                        result = JSON.parse(responseText);
                    } catch (error) {
                        throw new Error(
                            "The Node.js server did not return a JSON response. Open this page through port 3000.",
                        );
                    }

                    if (!response.ok) {
                        throw new Error(result.message || "Unable to save resort account.");
                    }

                    showMessage(result.message, "success");
                    form.reset();
                    updateProgress();
                })
                .catch(function (error) {
                    showMessage(error.message, "error");
                })
                .finally(function () {
                    completeAccountButton.disabled = false;
                    completeAccountButton.textContent = "Complete resort profile";
                });
        });
    }

    updateProgress();
});
