document.addEventListener("DOMContentLoaded", function () {
    const signupForm = document.getElementById("signupForm");

    const emailStep = document.getElementById("emailStep");
    const otpStep = document.getElementById("otpStep");
    const accountStep = document.getElementById("accountStep");

    const email = document.getElementById("email");
    const otp = document.getElementById("otp");
    const verificationEmail = document.getElementById("verificationEmail");

    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    const agreeTerms = document.getElementById("agreeTerms");
    const signupStatus = document.getElementById("signupStatus");

    const sendOtpButton = document.getElementById("sendOtpButton");
    const verifyOtpButton = document.getElementById("verifyOtpButton");

    const resendOtpButton = document.getElementById("resendOtpButton");
    const createAccountButton = document.getElementById("createAccountButton");
    const passwordToggle = document.getElementById("passwordToggle");
    const confirmPasswordToggle = document.getElementById("confirmPasswordToggle");

    const passwordIcon = document.getElementById("passwordIcon");
    const confirmPasswordIcon = document.getElementById("confirmPasswordIcon");

    let challengeToken = "";
    let resendTimer;

    function showStep(step) {
        emailStep.hidden = step !== "email";
        otpStep.hidden = step !== "otp";
        accountStep.hidden = step !== "account";
    }

    function showStatus(message, state = "") {
        signupStatus.textContent = message;
        signupStatus.dataset.state = state;
    }

    function togglePassword(input, icon, button) {
        if (!input || !icon || !button) {
            return;
        }

        const passwordIsHidden = input.type === "password";

        input.type = passwordIsHidden
            ? "text"
            : "password";

        button.setAttribute(
            "aria-label",
            passwordIsHidden
                ? "Hide password"
                : "Show password"
        );

        icon.setAttribute(
            "data-lucide",
            passwordIsHidden
                ? "eye-off"
                : "eye"
        );

        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }

    function validatePassword() {
        if (password.value.length < 6) {
            password.setCustomValidity(
                "Password must be at least 6 characters."
            );

            return false;
        }

        password.setCustomValidity("");
        return true;
    }

    function validateConfirmPassword() {
        if (confirmPassword.value === "") {
            confirmPassword.setCustomValidity(
                "Please confirm your password."
            );

            return false;
        }

        if (password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity(
                "Passwords do not match."
            );

            return false;
        }

        confirmPassword.setCustomValidity("");
        return true;
    }

    async function readResponse(response) {
        const result = await response.json();

        if (!response.ok) {
            const error = new Error(
                result.message || "The request failed."
            );

            error.code = result.code;
            error.retryAfterSeconds = Number(
                response.headers.get("Retry-After") || 0
            );

            throw error;
        }

        return result;
    }

    async function requestSignupOtp() {
        const response = await fetch(
            "/api/auth/signup/request-otp",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email.value.trim().toLowerCase()
                })
            }
        );

        return readResponse(response);
    }

    function startResendCountdown(seconds) {
        clearInterval(resendTimer);

        let remainingSeconds = Math.max(
            Number(seconds) || 60,
            1
        );

        resendOtpButton.disabled = true;

        function updateButton() {
            resendOtpButton.textContent =
                `Resend code in ${remainingSeconds}s`;
        }

        updateButton();

        resendTimer = setInterval(function () {
            remainingSeconds -= 1;

            if (remainingSeconds <= 0) {
                clearInterval(resendTimer);
                resendOtpButton.disabled = false;
                resendOtpButton.textContent = "Resend code";
                return;
            }

            updateButton();
        }, 1000);
    }

    sendOtpButton.addEventListener("click", async function () {
        if (!email.checkValidity()) {
            email.reportValidity();
            return;
        }

        sendOtpButton.disabled = true;
        sendOtpButton.textContent = "Sending code...";
        showStatus("");

        try {
            const result = await requestSignupOtp();

            challengeToken = result.challengeToken;
            verificationEmail.textContent =
                email.value.trim().toLowerCase();

            email.readOnly = true;
            showStep("otp");
            showStatus(result.message, "success");
            startResendCountdown(60);
            otp.focus();
        } catch (error) {
            showStatus(error.message, "error");

            if (error.retryAfterSeconds > 0) {
                startResendCountdown(
                    error.retryAfterSeconds
                );
            }
        } finally {
            sendOtpButton.disabled = false;
            sendOtpButton.textContent =
                "Send verification code";
        }
    });

    resendOtpButton.addEventListener(
        "click",
        async function () {
            resendOtpButton.disabled = true;
            resendOtpButton.textContent = "Sending...";
            showStatus("");

            try {
                const result = await requestSignupOtp();

                challengeToken = result.challengeToken;
                otp.value = "";

                showStatus(result.message, "success");
                startResendCountdown(60);
                otp.focus();
            } catch (error) {
                showStatus(error.message, "error");

                if (error.retryAfterSeconds > 0) {
                    startResendCountdown(
                        error.retryAfterSeconds
                    );
                } else {
                    resendOtpButton.disabled = false;
                    resendOtpButton.textContent =
                        "Resend code";
                }
            }
        }
    );

    verifyOtpButton.addEventListener(
        "click",
        async function () {
            const enteredOtp = otp.value.trim();

            if (!/^\d{6}$/.test(enteredOtp)) {
                otp.setCustomValidity(
                    "Enter the six-digit verification code."
                );

                otp.reportValidity();
                return;
            }

            otp.setCustomValidity("");
            verifyOtpButton.disabled = true;
            verifyOtpButton.textContent = "Verifying...";
            showStatus("");

            try {
                const response = await fetch(
                    "/api/auth/signup/verify-otp",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            challengeToken,
                            otp: enteredOtp
                        })
                    }
                );

                const result = await readResponse(response);

                challengeToken = result.challengeToken;
                showStep("account");
                showStatus(result.message, "success");
                firstName.focus();
            } catch (error) {
                showStatus(error.message, "error");
                verifyOtpButton.disabled = false;
                verifyOtpButton.textContent = "Verify email";
            }
        }
    );

    passwordToggle.addEventListener("click", function () {
        togglePassword(
            password,
            passwordIcon,
            passwordToggle
        );
    });

    confirmPasswordToggle.addEventListener(
        "click",
        function () {
            togglePassword(
                confirmPassword,
                confirmPasswordIcon,
                confirmPasswordToggle
            );
        }
    );

    password.addEventListener("input", function () {
        validatePassword();

        if (confirmPassword.value !== "") {
            validateConfirmPassword();
        }
    });

    confirmPassword.addEventListener(
        "input",
        validateConfirmPassword
    );

    agreeTerms.addEventListener("change", function () {
        agreeTerms.setCustomValidity(
            agreeTerms.checked
                ? ""
                : "You must agree to the Terms of Use and Privacy Policy."
        );
    });

    signupForm.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            const passwordIsValid = validatePassword();
            const confirmationIsValid =
                validateConfirmPassword();

            if (!agreeTerms.checked) {
                agreeTerms.setCustomValidity(
                    "You must agree to the Terms of Use and Privacy Policy."
                );
            }

            if (
                !signupForm.checkValidity() ||
                !passwordIsValid ||
                !confirmationIsValid
            ) {
                signupForm.reportValidity();
                return;
            }

            createAccountButton.disabled = true;
            createAccountButton.textContent =
                "Creating account...";

            showStatus("");

            try {
                const response = await fetch(
                    "/api/auth/signup",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            challengeToken,
                            firstName: firstName.value.trim(),
                            lastName: lastName.value.trim(),
                            password: password.value
                        })
                    }
                );

                const result = await readResponse(response);

                showStatus(result.message, "success");

                window.location.href = "login.html";
            } catch (error) {
                showStatus(error.message, "error");

                if (
                    error.code === "OTP_EXPIRED" ||
                    error.code === "EMAIL_NOT_VERIFIED"
                ) {
                    challengeToken = "";
                    email.readOnly = false;
                    otp.value = "";
                    showStep("email");
                }

                createAccountButton.disabled = false;
                createAccountButton.textContent =
                    "Create account";
            }
        }
    );

    const googleButton = document.querySelector(
        ".google-button"
    );

    if (googleButton) {
        googleButton.addEventListener("click", function () {
            alert("Google sign up will be connected later.");
        });
    }

    showStep("email");
});