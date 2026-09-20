const loginForm = document.getElementById("loginForm");

const credentialsStep = document.getElementById(
    "credentialsStep"
);

const loginOtpStep = document.getElementById(
    "loginOtpStep"
);

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginOtpInput = document.getElementById("loginOtp");

const passwordToggle = document.getElementById(
    "passwordToggle"
);

const passwordIcon = document.getElementById(
    "passwordIcon"
);

const continueButton = document.getElementById(
    "continueButton"
);

const verifyLoginOtpButton = document.getElementById(
    "verifyLoginOtpButton"
);

const resendLoginOtpButton = document.getElementById(
    "resendLoginOtpButton"
);

const changeLoginAccountButton = document.getElementById(
    "changeLoginAccountButton"
);

const loginVerificationEmail = document.getElementById(
    "loginVerificationEmail"
);

const loginStatus = document.getElementById("loginStatus");
const rememberMe = document.getElementById("rememberMe");

const forgotPassword = document.querySelector(
    ".forgot-password"
);

let loginChallengeToken = "";
let loginResendTimer;
let loginOtpMethod = "password";
let googleCredential = "";

function showLoginStatus(message, state = "") {
    loginStatus.textContent = message;
    loginStatus.dataset.state = state;
}

function showLoginStep(step) {
    const credentialsAreActive = step === "credentials";
    const otpIsActive = step === "otp";

    credentialsStep.hidden = !credentialsAreActive;
    loginOtpStep.hidden = !otpIsActive;

    emailInput.disabled = !credentialsAreActive;
    passwordInput.disabled = !credentialsAreActive;
    rememberMe.disabled = !credentialsAreActive;
    loginOtpInput.disabled = !otpIsActive;
}

function togglePassword() {
    const passwordIsHidden =
        passwordInput.type === "password";

    passwordInput.type = passwordIsHidden
        ? "text"
        : "password";

    passwordToggle.setAttribute(
        "aria-label",
        passwordIsHidden
            ? "Hide password"
            : "Show password"
    );

    passwordIcon.setAttribute(
        "data-lucide",
        passwordIsHidden
            ? "eye-off"
            : "eye"
    );

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

async function readLoginResponse(response) {
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

async function requestLoginOtp() {
    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: emailInput.value.trim().toLowerCase(),
            password: passwordInput.value
        })
    });

    const result = await readLoginResponse(response);

    if (
        !result.requiresOtp ||
        !result.challengeToken
    ) {
        throw new Error(
            "The server returned an invalid login response."
        );
    }

    return result;
}

async function requestGoogleLoginOtp() {
    if (!googleCredential) {
        throw new Error(
            "Google sign-in has expired. Please choose your Google account again."
        );
    }

    const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            credential: googleCredential
        })
    });

    const result = await readLoginResponse(response);

    if (
        !result.requiresOtp ||
        !result.challengeToken
    ) {
        throw new Error(
            "The server returned an invalid Google sign-in response."
        );
    }

    return result;
}

function requestActiveLoginOtp() {
    return loginOtpMethod === "google"
        ? requestGoogleLoginOtp()
        : requestLoginOtp();
}

function startLoginResendCountdown(seconds) {
    clearInterval(loginResendTimer);

    let remainingSeconds = Math.max(
        Number(seconds) || 60,
        1
    );

    resendLoginOtpButton.disabled = true;

    function updateButton() {
        resendLoginOtpButton.textContent =
            `Resend code in ${remainingSeconds}s`;
    }

    updateButton();

    loginResendTimer = setInterval(function () {
        remainingSeconds -= 1;

        if (remainingSeconds <= 0) {
            clearInterval(loginResendTimer);
            resendLoginOtpButton.disabled = false;
            resendLoginOtpButton.textContent =
                "Resend code";
            return;
        }

        updateButton();
    }, 1000);
}

function completeLogin(result) {
    const destinations = {
        system_admin: "../system-admin/Dashboard.html",
        resort_admin: "../resort-admin/Dashboard.html",
        client: "../client/Dashboard.html"
    };

    const destination = destinations[result.user?.role];

    if (
        typeof result.token !== "string" ||
        !destination
    ) {
        throw new Error(
            "The server returned an invalid login response."
        );
    }

    sessionStorage.setItem(
        "resorthub_access_token",
        result.token
    );

    window.location.href = destination;
}

if (passwordToggle) {
    passwordToggle.addEventListener(
        "click",
        togglePassword
    );
}

if (rememberMe) {
    const savedEmail = localStorage.getItem(
        "resorthub_remember_email"
    );

    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMe.checked = true;
    }
}

loginForm.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        if (!loginOtpStep.hidden) {
            verifyLoginOtpButton.click();
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !emailInput.checkValidity()) {
            emailInput.reportValidity();
            emailInput.focus();
            return;
        }

        if (!password) {
            passwordInput.setCustomValidity(
                "Please enter your password."
            );

            passwordInput.reportValidity();
            passwordInput.focus();
            return;
        }

        passwordInput.setCustomValidity("");

        if (rememberMe.checked) {
            localStorage.setItem(
                "resorthub_remember_email",
                email
            );
        } else {
            localStorage.removeItem(
                "resorthub_remember_email"
            );
        }

        continueButton.disabled = true;
        continueButton.textContent = "Sending code...";
        showLoginStatus("");

        try {
            loginOtpMethod = "password";
            googleCredential = "";

            const result = await requestLoginOtp();

            loginChallengeToken = result.challengeToken;
            loginVerificationEmail.textContent =
                email.toLowerCase();

            showLoginStep("otp");
            showLoginStatus(result.message, "success");
            startLoginResendCountdown(60);
            loginOtpInput.focus();
        } catch (error) {
            showLoginStatus(error.message, "error");
        } finally {
            continueButton.disabled = false;
            continueButton.textContent = "Sign in";
        }
    }
);

loginOtpInput.addEventListener("input", function () {
    loginOtpInput.value = loginOtpInput.value
        .replace(/\D/g, "")
        .slice(0, 6);

    loginOtpInput.setCustomValidity("");
});

verifyLoginOtpButton.addEventListener(
    "click",
    async function () {
        const enteredOtp = loginOtpInput.value.trim();

        if (!/^\d{6}$/.test(enteredOtp)) {
            loginOtpInput.setCustomValidity(
                "Enter the six-digit verification code."
            );

            loginOtpInput.reportValidity();
            return;
        }

        loginOtpInput.setCustomValidity("");
        verifyLoginOtpButton.disabled = true;
        verifyLoginOtpButton.textContent =
            "Verifying...";
        showLoginStatus("");

        try {
            const verificationEndpoint =
                loginOtpMethod === "google"
                    ? "/api/auth/google/verify-otp"
                    : "/api/auth/login/verify-otp";

            const response = await fetch(
                verificationEndpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        challengeToken:
                            loginChallengeToken,
                        otp: enteredOtp
                    })
                }
            );

            const result = await readLoginResponse(
                response
            );

            showLoginStatus(
                result.message,
                "success"
            );

            completeLogin(result);
        } catch (error) {
            showLoginStatus(error.message, "error");
            verifyLoginOtpButton.disabled = false;
            verifyLoginOtpButton.textContent =
                "Verify and sign in";
        }
    }
);

resendLoginOtpButton.addEventListener(
    "click",
    async function () {
        resendLoginOtpButton.disabled = true;
        resendLoginOtpButton.textContent =
            "Sending...";
        showLoginStatus("");

        try {
            const result = await requestActiveLoginOtp();

            loginChallengeToken = result.challengeToken;
            loginOtpInput.value = "";

            showLoginStatus(result.message, "success");
            startLoginResendCountdown(60);
            loginOtpInput.focus();
        } catch (error) {
            showLoginStatus(error.message, "error");

            if (error.retryAfterSeconds > 0) {
                startLoginResendCountdown(
                    error.retryAfterSeconds
                );
            } else {
                resendLoginOtpButton.disabled = false;
                resendLoginOtpButton.textContent =
                    "Resend code";
            }
        }
    }
);

changeLoginAccountButton.addEventListener(
    "click",
    function () {
        clearInterval(loginResendTimer);

        loginChallengeToken = "";
        loginOtpMethod = "password";
        googleCredential = "";
        loginOtpInput.value = "";
        passwordInput.value = "";

        resendLoginOtpButton.disabled = false;
        resendLoginOtpButton.textContent =
            "Resend code";

        showLoginStatus("");
        showLoginStep("credentials");
        emailInput.focus();
    }
);

if (forgotPassword) {
    forgotPassword.addEventListener(
        "click",
        function (event) {
            event.preventDefault();

            if (
                !emailInput.value.trim() ||
                !emailInput.checkValidity()
            ) {
                emailInput.reportValidity();
                emailInput.focus();
                return;
            }

            alert(
                "Password reset will be connected later."
            );
        }
    );
}

emailInput.addEventListener("input", function () {
    if (!rememberMe.checked) {
        localStorage.removeItem(
            "resorthub_remember_email"
        );
    }
});

showLoginStep("credentials");

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
    status.textContent = "Sending verification code...";

    try {
        loginOtpMethod = "google";
        googleCredential = googleResponse.credential;

        const result = await requestGoogleLoginOtp();

        loginChallengeToken = result.challengeToken;
        loginVerificationEmail.textContent = result.email;
        loginOtpInput.value = "";

        status.textContent = "";
        showLoginStep("otp");
        showLoginStatus(result.message, "success");
        startLoginResendCountdown(60);
        loginOtpInput.focus();
    } catch (error) {
        status.textContent = error.message || "Unable to sign in.";
    } finally {
        googleSignInPending = false;
    }
}
