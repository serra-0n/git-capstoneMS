/* =========================================================
   RESORTHUB - STAFF MANAGEMENT
   File: staff-management.js

   Frontend functionality:
   - Staff search
   - Role filtering
   - Account status filtering
   - Staff record counting
   - Summary statistics
   - Add Staff button
   - Staff action buttons
   - Sidebar toggle
   - Lucide icon refresh

   Database/API integration will be added later.
   ========================================================= */


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  initializeStaffManagement();

});


/* =========================================================
   MAIN INITIALIZATION
   ========================================================= */

function initializeStaffManagement() {

  initializeStaffElements();

  initializeStaffFilters();

  initializeAddStaffButton();

  initializeStaffActions();

  initializeSidebarToggle();

  updateStaffSummary();

  updateStaffRecordCount();

  refreshIcons();

}


/* =========================================================
   ELEMENT REFERENCES
   ========================================================= */

let staffTableBody;
let staffRows;
let staffSearch;
let staffRoleFilter;
let staffStatusFilter;
let emptyStaffState;
let staffRecordCount;

let totalStaffElement;
let activeStaffElement;
let inactiveStaffElement;
let roleCountElement;


/* =========================================================
   INITIALIZE ELEMENTS
   ========================================================= */

function initializeStaffElements() {

  staffTableBody =
    document.getElementById("staffTableBody");

  staffSearch =
    document.getElementById("staffSearch");

  staffRoleFilter =
    document.getElementById("staffRoleFilter");

  staffStatusFilter =
    document.getElementById("staffStatusFilter");

  emptyStaffState =
    document.getElementById("emptyStaffState");

  staffRecordCount =
    document.getElementById("staffRecordCount");

  totalStaffElement =
    document.getElementById("totalStaff");

  activeStaffElement =
    document.getElementById("activeStaff");

  inactiveStaffElement =
    document.getElementById("inactiveStaff");

  roleCountElement =
    document.getElementById("roleCount");

  if (staffTableBody) {

    staffRows =
      Array.from(
        staffTableBody.querySelectorAll("tr")
      );

  } else {

    staffRows = [];

  }

}


/* =========================================================
   SEARCH AND FILTERS
   ========================================================= */

function initializeStaffFilters() {

  if (staffSearch) {

    staffSearch.addEventListener(
      "input",
      filterStaff
    );

  }


  if (staffRoleFilter) {

    staffRoleFilter.addEventListener(
      "change",
      filterStaff
    );

  }


  if (staffStatusFilter) {

    staffStatusFilter.addEventListener(
      "change",
      filterStaff
    );

  }

}


/* =========================================================
   FILTER STAFF
   ========================================================= */

function filterStaff() {

  const searchValue =
    staffSearch
      ? staffSearch.value.trim().toLowerCase()
      : "";

  const selectedRole =
    staffRoleFilter
      ? staffRoleFilter.value
      : "all";

  const selectedStatus =
    staffStatusFilter
      ? staffStatusFilter.value
      : "all";


  let visibleCount = 0;


  staffRows.forEach(function (row) {

    const name =
      (row.dataset.name || "").toLowerCase();

    const role =
      (row.dataset.role || "").toLowerCase();

    const status =
      (row.dataset.status || "").toLowerCase();


    /*
     * Search checks the staff name.
     *
     * This can later be expanded to include:
     * - Staff ID
     * - Email
     * - Role
     *
     * when the database is connected.
     */

    const matchesSearch =
      searchValue === "" ||
      name.includes(searchValue);


    const matchesRole =
      selectedRole === "all" ||
      role === selectedRole;


    const matchesStatus =
      selectedStatus === "all" ||
      status === selectedStatus;


    const shouldShow =
      matchesSearch &&
      matchesRole &&
      matchesStatus;


    row.style.display =
      shouldShow ? "" : "none";


    if (shouldShow) {

      visibleCount++;

    }

  });


  updateEmptyState(visibleCount);

  updateFilteredRecordCount(visibleCount);

}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function updateEmptyState(visibleCount) {

  if (!emptyStaffState) {
    return;
  }


  if (visibleCount === 0) {

    emptyStaffState.hidden = false;

  } else {

    emptyStaffState.hidden = true;

  }

}


/* =========================================================
   UPDATE FILTERED RECORD COUNT
   ========================================================= */

function updateFilteredRecordCount(visibleCount) {

  if (!staffRecordCount) {
    return;
  }


  if (visibleCount === 1) {

    staffRecordCount.textContent =
      "1 record";

  } else {

    staffRecordCount.textContent =
      visibleCount + " records";

  }

}


/* =========================================================
   STAFF SUMMARY
   ========================================================= */

function updateStaffSummary() {

  const total =
    staffRows.length;


  let active = 0;
  let inactive = 0;


  const roles =
    new Set();


  staffRows.forEach(function (row) {

    const status =
      (row.dataset.status || "").toLowerCase();

    const role =
      (row.dataset.role || "").toLowerCase();


    if (status === "active") {

      active++;

    }


    if (status === "inactive") {

      inactive++;

    }


    if (role !== "") {

      roles.add(role);

    }

  });


  if (totalStaffElement) {

    totalStaffElement.textContent =
      total;

  }


  if (activeStaffElement) {

    activeStaffElement.textContent =
      active;

  }


  if (inactiveStaffElement) {

    inactiveStaffElement.textContent =
      inactive;

  }


  if (roleCountElement) {

    roleCountElement.textContent =
      roles.size;

  }

}


/* =========================================================
   INITIAL RECORD COUNT
   ========================================================= */

function updateStaffRecordCount() {

  if (!staffRecordCount) {
    return;
  }


  const total =
    staffRows.length;


  if (total === 1) {

    staffRecordCount.textContent =
      "1 record";

  } else {

    staffRecordCount.textContent =
      total + " records";

  }

}


/* =========================================================
   ADD STAFF BUTTON
   ========================================================= */

function initializeAddStaffButton() {

  const addStaffButton =
    document.getElementById("addStaffButton");


  if (!addStaffButton) {
    return;
  }


  addStaffButton.addEventListener(
    "click",
    function () {

      openAddStaffForm();

    }
  );

}


/* =========================================================
   ADD STAFF FORM
   ========================================================= */

function openAddStaffForm() {

  /*
   * Temporary frontend behavior.
   *
   * The actual staff creation form will later
   * connect to the database.
   */


  const staffName =
    window.prompt(
      "Enter staff member name:"
    );


  if (!staffName) {
    return;
  }


  const staffEmail =
    window.prompt(
      "Enter staff email:"
    );


  if (!staffEmail) {
    return;
  }


  const staffRole =
    window.prompt(
      "Enter staff role:\n\n" +
      "Administrator\n" +
      "Front Desk\n" +
      "Staff"
    );


  if (!staffRole) {
    return;
  }


  const normalizedRole =
    normalizeRole(staffRole);


  if (!normalizedRole) {

    alert(
      "Invalid role. Please use Administrator, Front Desk, or Staff."
    );

    return;

  }


  /*
   * At this stage, the form does not write
   * anything to a database.
   *
   * This only demonstrates the intended
   * frontend interaction.
   */

  alert(
    "Staff account form received.\n\n" +
    "Name: " + staffName + "\n" +
    "Email: " + staffEmail + "\n" +
    "Role: " + formatRole(normalizedRole) +
    "\n\n" +
    "Database connection will be added later."
  );

}


/* =========================================================
   NORMALIZE ROLE
   ========================================================= */

function normalizeRole(role) {

  const value =
    role.trim().toLowerCase();


  if (
    value === "administrator" ||
    value === "admin"
  ) {

    return "administrator";

  }


  if (
    value === "front desk" ||
    value === "front-desk" ||
    value === "frontdesk"
  ) {

    return "front-desk";

  }


  if (value === "staff") {

    return "staff";

  }


  return null;

}


/* =========================================================
   FORMAT ROLE
   ========================================================= */

function formatRole(role) {

  if (role === "administrator") {

    return "Administrator";

  }


  if (role === "front-desk") {

    return "Front Desk";

  }


  if (role === "staff") {

    return "Staff";

  }


  return role;

}


/* =========================================================
   STAFF ACTION BUTTONS
   ========================================================= */

function initializeStaffActions() {

  const actionButtons =
    document.querySelectorAll(
      ".table-action"
    );


  actionButtons.forEach(function (button) {

    button.addEventListener(
      "click",
      function (event) {

        handleStaffAction(event.currentTarget);

      }
    );

  });

}


/* =========================================================
   HANDLE STAFF ACTION
   ========================================================= */

function handleStaffAction(button) {

  const row =
    button.closest("tr");


  if (!row) {
    return;
  }


  const name =
    row.dataset.name || "Staff Member";

  const role =
    row.dataset.role || "";

  const status =
    row.dataset.status || "";


  /*
   * Temporary frontend action menu.
   *
   * Actual Edit / Activate / Deactivate
   * functionality will be connected to the
   * database later.
   */

  const action =
    window.prompt(
      "Manage Staff\n\n" +
      "Staff: " + name + "\n" +
      "Role: " + formatRole(role) + "\n" +
      "Status: " + formatStatus(status) +
      "\n\n" +
      "Enter an action:\n" +
      "Edit\n" +
      "Toggle Status\n" +
      "Cancel"
    );


  if (!action) {
    return;
  }


  const normalizedAction =
    action.trim().toLowerCase();


  if (normalizedAction === "edit") {

    editStaffPreview(row);

    return;

  }


  if (
    normalizedAction === "toggle status" ||
    normalizedAction === "toggle"
  ) {

    toggleStaffStatus(row);

    return;

  }


  if (normalizedAction === "cancel") {

    return;

  }


  alert(
    "Invalid action."
  );

}


/* =========================================================
   EDIT STAFF PREVIEW
   ========================================================= */

function editStaffPreview(row) {

  const name =
    row.dataset.name || "";

  const role =
    row.dataset.role || "";

  const newName =
    window.prompt(
      "Edit staff name:",
      name
    );


  if (!newName) {
    return;
  }


  const newRole =
    window.prompt(
      "Edit staff role:\n\n" +
      "Administrator\n" +
      "Front Desk\n" +
      "Staff",
      formatRole(role)
    );


  if (!newRole) {
    return;
  }


  const normalizedRole =
    normalizeRole(newRole);


  if (!normalizedRole) {

    alert(
      "Invalid role."
    );

    return;

  }


  /*
   * Update the frontend row.
   *
   * Later this section will instead
   * send an update request to the backend.
   */

  row.dataset.name =
    newName.trim();

  row.dataset.role =
    normalizedRole;


  const nameElement =
    row.querySelector(
      ".staff-member strong"
    );


  const roleElement =
    row.querySelector(
      ".role-badge"
    );


  if (nameElement) {

    nameElement.textContent =
      newName.trim();

  }


  if (roleElement) {

    roleElement.textContent =
      formatRole(normalizedRole);

    roleElement.className =
      "role-badge " + normalizedRole;

  }


  updateStaffSummary();

  filterStaff();

  refreshIcons();


  alert(
    "Staff information updated in the frontend.\n\n" +
    "Database update will be connected later."
  );

}


/* =========================================================
   TOGGLE STAFF STATUS
   ========================================================= */

function toggleStaffStatus(row) {

  const currentStatus =
    (row.dataset.status || "").toLowerCase();


  const newStatus =
    currentStatus === "active"
      ? "inactive"
      : "active";


  row.dataset.status =
    newStatus;


  const statusElement =
    row.querySelector(
      ".status-badge"
    );


  if (statusElement) {

    statusElement.className =
      "status-badge " + newStatus;


    statusElement.innerHTML =
      '<span class="status-dot"></span>' +
      formatStatus(newStatus);

  }


  updateStaffSummary();

  filterStaff();

  refreshIcons();


  alert(
    "Account status changed to " +
    formatStatus(newStatus) +
    ".\n\n" +
    "Database update will be connected later."
  );

}


/* =========================================================
   FORMAT STATUS
   ========================================================= */

function formatStatus(status) {

  if (status === "active") {

    return "Active";

  }


  if (status === "inactive") {

    return "Inactive";

  }


  return status;

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


  if (!toggleButton || !sidebar) {
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