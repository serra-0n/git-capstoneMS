document.addEventListener("DOMContentLoaded", function () {
    const signupForm = document.getElementById("signupForm");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const passwordToggle = document.getElementById("passwordToggle");
    const confirmPasswordToggle = document.getElementById("confirmPasswordToggle");
    const passwordIcon = document.getElementById("passwordIcon");
    const confirmPasswordIcon = document.getElementById("confirmPasswordIcon");
    const agreeTerms = document.getElementById("agreeTerms");

    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");
    const email = document.getElementById("email");
    const createAccountButton = document.getElementById("createAccountButton");


    function togglePassword(input, icon, button) {
        if (!input || !icon || !button) {
            return;
        }

        if (input.type === "password") {
            input.type = "text";

            button.setAttribute("aria-label", "Hide password");
            icon.setAttribute("data-lucide", "eye-off");
        } else {
            input.type = "password";

            button.setAttribute("aria-label", "Show password");
            icon.setAttribute("data-lucide", "eye");
        }

        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }

    if (passwordToggle) {
        passwordToggle.addEventListener("click", function () {
            togglePassword(password, passwordIcon, passwordToggle);
        });
    }

    if (confirmPasswordToggle) {
        confirmPasswordToggle.addEventListener("click", function () {
            togglePassword(confirmPassword, confirmPasswordIcon, confirmPasswordToggle);
        });
    }

    function validatePassword () {
        if (!password) {
            return false;
        }

        if (password.value.length < 6) {
            password.setCustomValidity("Password must at least 6 characters.");
            return false;
        }

        password.setCustomValidity("");
        return true;
    }

    function validateConfirmPassword() {
        if (!password || !confirmPassword) {
            return false;
        }

        if (confirmPassword.value === "") {
            confirmPassword.setCustomValidity("Please confirm your password.");
            return false;
        }

        if (password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity("Password do not match.");
            return false;
        }

        confirmPassword.setCustomValidity("");
        return true;
    }

    if (password) {
        password.addEventListener("input", function () {
            validatePassword();

            if (confirmPassword && confirmPassword.value !== "") {
                validateConfirmPassword();
            }
        });
    }

    if (confirmPassword) {
        confirmPassword.addEventListener("input", function () {
            validateConfirmPassword();
        });
    }

    if (signupForm) {
        signupForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const passwordValid = validatePassword();
            const confirmPasswordValid = validateConfirmPassword();

            if (agreeTerms && !agreeTerms.checked) {
                agreeTerms.setCustomValidity("You must agree to the Terms of Use and Privacy Policy");
            } else if (agreeTerms) {
                agreeTerms.setCustomValidity("");
            }

            if (!signupForm.checkValidity()) {
                signupForm.reportValidity();
                return;
            }
            
            if (!passwordValid || !confirmPasswordValid) {
                signupForm.reportValidity();
                return;
            }

            createAccountButton.disabled = true;
            createAccountButton.textContent = "Creating account...";

            try {
                const response = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: {
                        "content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        firstName: firstName.value.trim(),
                        lastName: lastName.value.trim(),
                        email: email.value.trim().toLowerCase(),
                        password: password.value
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message || "Signup failed."
                    );
                }

                alert(result.message);
                window.location.href = "login.html";

            }

            catch (error) {
                alert(error.message);

                createAccountButton.disabled = false;
                createAccountButton.textContent = "Create account";
            }
        });
    }

    if (agreeTerms) {
        agreeTerms.addEventListener("change", function () {
            if (agreeTerms.checked) {
                agreeTerms.setCustomValidity("");
            } else {
                agreeTerms.setCustomValidity("You must agree to the Terms of Use and Privacy Policy.");
            }
        });
    }

    const googleButton = document.querySelector(".google-button");

    if (googleButton) {
        googleButton.addEventListener("click", function () {
            alert("Google sign up will be connected later.");
        });
    }
});
