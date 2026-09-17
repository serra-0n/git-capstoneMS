const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const continueButton = document.getElementById("continueButton");
const rememberMe = document.getElementById("rememberMe");
const forgotPassword = document.querySelector(".forgot-password");
const passwordIcon = document.getElementById("passwordIcon");

if (passwordToggle && passwordInput && passwordIcon) {
    passwordToggle.addEventListener("click", function () {
        const isPassword = passwordInput.type === "password";

        if (isPassword) {
            passwordInput.type = "text";
            passwordToggle.setAttribute("aria-label", "Hide password");
            passwordIcon.setAttribute("data-lucide", "eye-off");
        } else {
            passwordInput.type = "password";
            passwordToggle.setAttribute("aria-label", "Show password");
            passwordIcon.setAttribute("data-lucide", "eye");
        }

        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    });
}

if (rememberMe && emailInput) {
    const savedEmail = localStorage.getItem("resorthub_remember_email");

    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMe.checked = true;
    }
}

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (email === "") {
            alert("Please enter your email.");
            emailInput.focus();
            return;
        }

        if (!emailInput.checkValidity()) {
            alert("Please enter a valid email address.");
            emailInput.focus();
            return;
        }

        if (password === "") {
            alert("Please enter your password.");
            passwordInput.focus();
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters");
            passwordInput.focus();
            return;
        }

        if (rememberMe && rememberMe.checked) {
            localStorage.setItem("resorthub_remember_email", email);
        } else {
            localStorage.removeItem("resorthub_remember_email");
        }

        continueButton.disabled = true;
        continueButton.textContent = "Signing in...";

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Login failed.");
            }

            sessionStorage.setItem("resorthub_access_token", result.token);

            switch (result.user.role) {
                case "system_admin":
                    window.location.href = "../system-admin/Dashboard.html";
                    break;

                case "resort_admin":
                    window.location.href = "../resort-admin/Dashboard.html";
                    break;

                case "client":
                    window.location.href = "../client/Dashboard.html";
                    break;

                default:
                    throw new Error("The account role is invalid.");
            }
        } catch (error) {
            alert(error.message);
            continueButton.disabled = false;
            continueButton.textContent = "Continue";
        }
    });
}

if (forgotPassword) {
    forgotPassword.addEventListener("click", function (event) {
        event.preventDefault();
        const email = emailInput.value.trim();

        if (email === "") {
            alert("Please enter your email first.");
            emailInput.focus();
            return;
        }

        if (!emailInput.checkValidity()) {
            alert("Please enter a valid email address.");
            emailInput.focus();
            return;
        }

        alert("Password reset will be connected to the backend later.");
    });
}

if (emailInput) {
    emailInput.addEventListener("input", function () {
        if (rememberMe && rememberMe.checked === false) {
            localStorage.removeItem("resorthub_remember_email");
        }
    });
}

let googleSignInPending = false;

function showGoogleLoadError() {
    document.getElementById("googleSignInStatus").textContent = "Google sign-in could not load. Please refresh the page.";
}

function initializeGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: "474374218666-m2t9l2mq4s4jl4j574qrappe194oaom9.apps.googleusercontent.com",
        callback: handleGoogleSignIn,
        ux_mode: "popup",
        auto_select: false
    });

    google.accounts.id.renderButton(
        document.getElementById("googleSignInButton"),
        {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular"
        }
    );
}

async function handleGoogleSignIn(googleResponse) {
    if (googleSignInPending) {
        return;
    }

    const status = document.getElementById("googleSignInStatus");

    if (!googleResponse.credential) {
        status.textContent = "Google did not return a sign-in credential.";
        return;
    }

    googleSignInPending = true;
    status.textContent = "Signing in with Google...";

    try {
        const response = await fetch("/api/auth/google", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                credential: googleResponse.credential
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Google sign-in failed.")
        }

        const destinations = {
            client: "../client/Dashboard.html",
            resort_admin: "../resort-admin/Dashboard.html",
            system_admin: "../system-admin/Dashboard.html"
        };

        const destination = destinations[result.user?.role];

        if (!destination || typeof result.token !== "string") {
            throw new Error("The server returned an invalid login response.");
        }

        sessionStorage.setItem("resorthub_access_token", result.token);
        window.location.href = destination;
    } catch (error) {
        status.textContent = error.message || "Unable to sign in.";
    } finally {
        googleSignInPending = false;
    }
}