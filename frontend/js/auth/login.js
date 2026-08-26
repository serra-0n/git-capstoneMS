const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const continueButton = document.getElementById("continueButton");
const rememberMe = document.getElementById("rememberMe");
const googleButton = document.querySelector(".google-button");
const forgotPassword = document.querySelector(".forgot-password");
const passwordIcon = document.getElementById("passwordIcon");


if (passwordToggle && passwordInput && passwordIcon) {
    passwordToggle.addEventListener("click", function() {
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
    loginForm.addEventListener("submit", function (event) {
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

        /*  TEMPORARY LOGIN SIMULATION 
            We will replace this section 
            with the PHP/MySQL authentication 
            once the backend login endpoint 
            is ready. */


        setTimeout(function () {
            alert("Login system is ready for backend connection.");
            continueButton.disabled = false;
            continueButton.textContent = "Sign in";
        }, 1000);
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