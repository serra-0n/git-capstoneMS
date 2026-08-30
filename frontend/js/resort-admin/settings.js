/* =========================================================
   RESORTHUB - SETTINGS
   File: settings.js

   Frontend functionality:
   - Resort information
   - Account settings
   - Password visibility
   - Password validation
   - System preferences
   - Sidebar toggle
   - Lucide icon refresh

   Database/API integration will be added later.
   ========================================================= */


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  initializeSettings();

});


/* =========================================================
   MAIN INITIALIZATION
   ========================================================= */

function initializeSettings() {

  initializeResortSettings();

  initializeAccountSettings();

  initializePasswordSettings();

  initializePreferences();

  initializeSidebarToggle();

  refreshIcons();

}


/* =========================================================
   RESORT INFORMATION
   ========================================================= */

function initializeResortSettings() {

  const saveResortButton =
    document.getElementById("saveResortButton");


  if (!saveResortButton) {
    return;
  }


  saveResortButton.addEventListener(
    "click",
    function () {

      saveResortInformation();

    }
  );

}


/* =========================================================
   SAVE RESORT INFORMATION
   ========================================================= */

function saveResortInformation() {

  const resortName =
    document.getElementById("resortName");

  const resortContact =
    document.getElementById("resortContact");

  const resortAddress =
    document.getElementById("resortAddress");


  if (!resortName) {
    return;
  }


  const name =
    resortName.value.trim();

  const contact =
    resortContact
      ? resortContact.value.trim()
      : "";

  const address =
    resortAddress
      ? resortAddress.value.trim()
      : "";


  /* ---------------------------------------------
     BASIC VALIDATION
     --------------------------------------------- */

  if (name === "") {

    alert(
      "Please enter the resort name."
    );

    resortName.focus();

    return;

  }


  /*
   * Temporary frontend behavior.
   *
   * Later this information will be sent
   * to the backend/database.
   */

  console.log(
    "Resort Information:",
    {
      resortName: name,
      contactNumber: contact,
      address: address
    }
  );


  showSaveMessage(
    "Resort information saved successfully."
  );

}


/* =========================================================
   ACCOUNT SETTINGS
   ========================================================= */

function initializeAccountSettings() {

  const saveAccountButton =
    document.getElementById("saveAccountButton");


  if (!saveAccountButton) {
    return;
  }


  saveAccountButton.addEventListener(
    "click",
    function () {

      saveAccountInformation();

    }
  );

}


/* =========================================================
   SAVE ACCOUNT INFORMATION
   ========================================================= */

function saveAccountInformation() {

  const adminName =
    document.getElementById("adminName");

  const adminEmail =
    document.getElementById("adminEmail");


  if (!adminName) {
    return;
  }


  const name =
    adminName.value.trim();

  const email =
    adminEmail
      ? adminEmail.value.trim()
      : "";


  /* ---------------------------------------------
     NAME VALIDATION
     --------------------------------------------- */

  if (name === "") {

    alert(
      "Please enter the administrator's name."
    );

    adminName.focus();

    return;

  }


  /* ---------------------------------------------
     EMAIL VALIDATION
     --------------------------------------------- */

  if (
    email !== "" &&
    !isValidEmail(email)
  ) {

    alert(
      "Please enter a valid email address."
    );

    adminEmail.focus();

    return;

  }


  /*
   * Temporary frontend behavior.
   *
   * No account information is actually
   * written to the database yet.
   */

  console.log(
    "Account Information:",
    {
      name: name,
      email: email
    }
  );


  showSaveMessage(
    "Account information saved successfully."
  );

}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function isValidEmail(email) {

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  return emailPattern.test(email);

}


/* =========================================================
   PASSWORD SETTINGS
   ========================================================= */

function initializePasswordSettings() {

  const passwordToggles =
    document.querySelectorAll(
      ".password-toggle"
    );


  passwordToggles.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          togglePasswordVisibility(
            button
          );

        }
      );

    }
  );


  const changePasswordButton =
    document.getElementById(
      "changePasswordButton"
    );


  if (changePasswordButton) {

    changePasswordButton.addEventListener(
      "click",
      function () {

        changePassword();

      }
    );

  }

}


/* =========================================================
   TOGGLE PASSWORD VISIBILITY
   ========================================================= */

function togglePasswordVisibility(button) {

  const targetId =
    button.dataset.target;


  if (!targetId) {
    return;
  }


  const passwordInput =
    document.getElementById(targetId);


  if (!passwordInput) {
    return;
  }


  const isPassword =
    passwordInput.type === "password";


  passwordInput.type =
    isPassword
      ? "text"
      : "password";


  const icon =
    button.querySelector("i");


  if (icon) {

    icon.setAttribute(
      "data-lucide",
      isPassword
        ? "eye-off"
        : "eye"
    );

  }


  button.setAttribute(
    "aria-label",
    isPassword
      ? "Hide password"
      : "Show password"
  );


  refreshIcons();

}


/* =========================================================
   CHANGE PASSWORD
   ========================================================= */

function changePassword() {

  const currentPassword =
    document.getElementById(
      "currentPassword"
    );

  const newPassword =
    document.getElementById(
      "newPassword"
    );

  const confirmPassword =
    document.getElementById(
      "confirmPassword"
    );


  if (
    !currentPassword ||
    !newPassword ||
    !confirmPassword
  ) {

    return;

  }


  const currentValue =
    currentPassword.value;

  const newValue =
    newPassword.value;

  const confirmValue =
    confirmPassword.value;


  /* ---------------------------------------------
     REQUIRED FIELDS
     --------------------------------------------- */

  if (
    currentValue === "" ||
    newValue === "" ||
    confirmValue === ""
  ) {

    alert(
      "Please complete all password fields."
    );

    return;

  }


  /* ---------------------------------------------
     NEW PASSWORD LENGTH
     --------------------------------------------- */

  if (newValue.length < 8) {

    alert(
      "The new password must contain at least 8 characters."
    );

    newPassword.focus();

    return;

  }


  /* ---------------------------------------------
     PASSWORD MATCH
     --------------------------------------------- */

  if (newValue !== confirmValue) {

    alert(
      "The new password and confirmation password do not match."
    );

    confirmPassword.focus();

    return;

  }


  /*
   * IMPORTANT:
   *
   * Do not store passwords in localStorage,
   * sessionStorage, HTML, or JavaScript.
   *
   * When the backend is implemented, the password
   * change should be processed securely by the
   * server and stored as a secure password hash.
   */


  console.log(
    "Password change request validated."
  );


  showSaveMessage(
    "Password change request validated. Backend connection is required to update the account."
  );


  /*
   * Clear password fields after the request.
   */

  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";

}


/* =========================================================
   SYSTEM PREFERENCES
   ========================================================= */

function initializePreferences() {

  const savePreferencesButton =
    document.getElementById(
      "savePreferencesButton"
    );


  if (!savePreferencesButton) {
    return;
  }


  savePreferencesButton.addEventListener(
    "click",
    function () {

      savePreferences();

    }
  );

}


/* =========================================================
   SAVE SYSTEM PREFERENCES
   ========================================================= */

function savePreferences() {

  const notificationToggle =
    document.getElementById(
      "systemNotifications"
    );

  const reservationToggle =
    document.getElementById(
      "reservationConfirmation"
    );


  const preferences = {

    systemNotifications:
      notificationToggle
        ? notificationToggle.checked
        : false,

    reservationConfirmation:
      reservationToggle
        ? reservationToggle.checked
        : false

  };


  /*
   * Temporary frontend behavior.
   *
   * Later these values will be saved
   * to the user's database settings.
   */

  console.log(
    "System Preferences:",
    preferences
  );


  showSaveMessage(
    "System preferences saved successfully."
  );

}


/* =========================================================
   SAVE MESSAGE
   ========================================================= */

function showSaveMessage(message) {

  /*
   * Simple temporary notification.
   *
   * This can later be replaced with a
   * reusable ResortHub notification/toast
   * component.
   */

  const existingMessage =
    document.querySelector(
      ".settings-save-message"
    );


  if (existingMessage) {

    existingMessage.remove();

  }


  const messageElement =
    document.createElement("div");


  messageElement.className =
    "settings-save-message";


  messageElement.textContent =
    message;


  /*
   * Basic inline styling so the JavaScript
   * works even before a notification component
   * is added to the CSS.
   */

  messageElement.style.position =
    "fixed";

  messageElement.style.right =
    "20px";

  messageElement.style.bottom =
    "20px";

  messageElement.style.zIndex =
    "1000";

  messageElement.style.maxWidth =
    "320px";

  messageElement.style.padding =
    "10px 14px";

  messageElement.style.border =
    "1px solid #dce5f2";

  messageElement.style.borderRadius =
    "6px";

  messageElement.style.background =
    "#ffffff";

  messageElement.style.color =
    "#28364b";

  messageElement.style.fontSize =
    "8px";

  messageElement.style.fontWeight =
    "600";

  messageElement.style.boxShadow =
    "0 4px 12px rgba(31, 55, 85, 0.10)";


  document.body.appendChild(
    messageElement
  );


  setTimeout(
    function () {

      messageElement.remove();

    },
    3000
  );

}


/* =========================================================
   SIDEBAR TOGGLE
   ========================================================= */

function initializeSidebarToggle() {

  const toggleButton =
    document.querySelector(
      ".sidebar-toggle"
    );

  const sidebar =
    document.querySelector(
      ".sidebar"
    );


  if (
    !toggleButton ||
    !sidebar
  ) {

    return;

  }


  toggleButton.addEventListener(
    "click",
    function () {

      sidebar.classList.toggle(
        "sidebar-collapsed"
      );

    }
  );

}


/* =========================================================
   LUCIDE ICON REFRESH
   ========================================================= */

function refreshIcons() {

  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  ) {

    lucide.createIcons();

  }

}