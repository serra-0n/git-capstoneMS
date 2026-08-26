/* =========================================================
   RESORTHUB - ROOM & COTTAGE MONITORING
   File: rooms.js
   Frontend Prototype (Option A)

   NOTE:
   - Uses sample data only.
   - Database integration will be Option B.
   - Does NOT remove or replace existing icons.
   ========================================================= */


/* =========================================================
   SAMPLE DATA
   ========================================================= */

const roomData = [
  { id: 1, name: "Family Cottage 1", type: "Cottage", status: "Available" },
  { id: 2, name: "Family Cottage 2", type: "Cottage", status: "Available" },
  { id: 3, name: "Deluxe Room 101", type: "Room", status: "Occupied" },
  { id: 4, name: "Deluxe Room 102", type: "Room", status: "Reserved" },
  { id: 5, name: "Beachfront Villa 1", type: "Cottage", status: "Occupied" },
  { id: 6, name: "Beachfront Villa 2", type: "Cottage", status: "Available" },
  { id: 7, name: "Standard Cottage 1", type: "Cottage", status: "Maintenance" },
  { id: 8, name: "Standard Cottage 2", type: "Cottage", status: "Available" }
];


/* =========================================================
   ELEMENTS
   ========================================================= */

const roomCards = document.querySelectorAll(".room-card");

const searchInputs = document.querySelectorAll(
  '.filter-bar input[type="search"], .topbar input[type="search"]'
);

const typeFilter = document.querySelector(".filter-bar select:nth-of-type(1)");
const statusFilter = document.querySelector(".filter-bar select:nth-of-type(2)");

const clearButton = document.querySelector(".clear-filter");

const gridButton = document.querySelector(".view-button:nth-of-type(1)");
const listButton = document.querySelector(".view-button:nth-of-type(2)");

const updateButtons = document.querySelectorAll(".status-button");

const exportButton = document.querySelector(".btn-secondary");
const addButton = document.querySelector(".btn-primary");


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  refreshIcons();

  updateSummaryCards();

  updateOccupancySummary();

  setupSearch();

  setupFilters();

  setupClearFilters();

  setupViewButtons();

  setupStatusButtons();

  setupExportButton();

  setupAddButton();

});


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

  searchInputs.forEach(input => {

    input.addEventListener("input", filterRooms);

  });

}


/* =========================================================
   FILTERS
   ========================================================= */

function setupFilters() {

  if (typeFilter)
    typeFilter.addEventListener("change", filterRooms);

  if (statusFilter)
    statusFilter.addEventListener("change", filterRooms);

}


/* =========================================================
   FILTER LOGIC
   ========================================================= */

function filterRooms() {

  let keyword = "";

  searchInputs.forEach(input => {
    if (input.value.trim() !== "") {
      keyword = input.value.trim().toLowerCase();
    }
  });

  const selectedType = typeFilter ? typeFilter.value : "All Types";
  const selectedStatus = statusFilter ? statusFilter.value : "All Status";

  roomCards.forEach(card => {

    const title = card.querySelector("h3").textContent.toLowerCase();
    const type = card.querySelector(".room-type").textContent.trim();
    const status = card.querySelector(".status-badge").textContent.trim();

    const matchKeyword =
      title.includes(keyword) ||
      type.toLowerCase().includes(keyword);

    const matchType =
      selectedType === "All Types" ||
      selectedType === type;

    const matchStatus =
      selectedStatus === "All Status" ||
      selectedStatus === status;

    if (matchKeyword && matchType && matchStatus) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }

  });

}


/* =========================================================
   CLEAR FILTERS
   ========================================================= */

function setupClearFilters() {

  if (!clearButton) return;

  clearButton.addEventListener("click", () => {

    searchInputs.forEach(input => input.value = "");

    if (typeFilter) typeFilter.selectedIndex = 0;

    if (statusFilter) statusFilter.selectedIndex = 0;

    roomCards.forEach(card => {
      card.style.display = "block";
    });

  });

}


/* =========================================================
   GRID / LIST VIEW
   ========================================================= */

function setupViewButtons() {

  const grid = document.querySelector(".rooms-grid");

  if (!grid) return;

  if (gridButton) {

    gridButton.addEventListener("click", () => {

      grid.classList.remove("list-view");
      grid.classList.add("grid-view");

      gridButton.classList.add("active");
      listButton.classList.remove("active");

    });

  }

  if (listButton) {

    listButton.addEventListener("click", () => {

      grid.classList.remove("grid-view");
      grid.classList.add("list-view");

      listButton.classList.add("active");
      gridButton.classList.remove("active");

    });

  }

}


/* =========================================================
   UPDATE STATUS
   ========================================================= */

function setupStatusButtons() {

  updateButtons.forEach(button => {

    button.addEventListener("click", () => {

      const card = button.closest(".room-card");

      const badge = card.querySelector(".status-badge");

      const roomName = card.querySelector("h3").textContent;

      const status = prompt(
        `Update status for ${roomName}

Available
Reserved
Occupied
Maintenance`,
        badge.textContent.trim()
      );

      if (!status) return;

      const newStatus = normalizeStatus(status);

      if (!newStatus) {
        alert("Invalid status.");
        return;
      }

      badge.textContent = newStatus;

      badge.className = "status-badge " + getStatusClass(newStatus);

      updateSummaryCards();
      updateOccupancySummary();

    });

  });

}


/* =========================================================
   SUMMARY CARDS
   ========================================================= */

function updateSummaryCards() {

  const statuses = getStatusTotals();

  updateCard("Total Rooms / Cottages", roomCards.length);

  updateCard("Available", statuses.available);

  updateCard("Reserved", statuses.reserved);

  updateCard("Occupied", statuses.occupied);

  updateCard("Maintenance", statuses.maintenance);

}


function updateCard(label, value) {

  document.querySelectorAll(".stat-card").forEach(card => {

    const text = card.querySelector("span");

    if (!text) return;

    if (text.textContent.trim() === label) {

      const number = card.querySelector("strong");

      if (number) number.textContent = value;

    }

  });

}


/* =========================================================
   OCCUPANCY SUMMARY
   ========================================================= */

function updateOccupancySummary() {

  const summary = getStatusTotals();

  const rows = document.querySelectorAll(".occupancy-list div");

  if (rows.length < 4) return;

  rows[0].querySelector("strong").textContent =
    `${summary.available} (${summary.availablePercent}%)`;

  rows[1].querySelector("strong").textContent =
    `${summary.reserved} (${summary.reservedPercent}%)`;

  rows[2].querySelector("strong").textContent =
    `${summary.occupied} (${summary.occupiedPercent}%)`;

  rows[3].querySelector("strong").textContent =
    `${summary.maintenance} (${summary.maintenancePercent}%)`;

  const donutCenter = document.querySelector(".donut-center strong");

  if (donutCenter) {
    donutCenter.textContent = roomCards.length;
  }

}


/* =========================================================
   COUNT STATUSES
   ========================================================= */

function getStatusTotals() {

  let available = 0;
  let reserved = 0;
  let occupied = 0;
  let maintenance = 0;

  roomCards.forEach(card => {

    const badge = card.querySelector(".status-badge").textContent.trim();

    if (badge === "Available") available++;
    if (badge === "Reserved") reserved++;
    if (badge === "Occupied") occupied++;
    if (badge === "Maintenance") maintenance++;

  });

  const total = roomCards.length;

  return {

    available,
    reserved,
    occupied,
    maintenance,

    availablePercent: Math.round((available / total) * 100),
    reservedPercent: Math.round((reserved / total) * 100),
    occupiedPercent: Math.round((occupied / total) * 100),
    maintenancePercent: Math.round((maintenance / total) * 100)

  };

}


/* =========================================================
   EXPORT REPORT (FRONTEND SAMPLE)
   ========================================================= */

function setupExportButton() {

  if (!exportButton) return;

  exportButton.addEventListener("click", () => {

    alert(
      "Sample Frontend Only\n\n" +
      "The Export Report feature will generate the Rooms & Cottages report once the database is connected."
    );

  });

}


/* =========================================================
   ADD ROOM BUTTON (FRONTEND SAMPLE)
   ========================================================= */

function setupAddButton() {

  if (!addButton) return;

  addButton.addEventListener("click", () => {

    alert(
      "Sample Frontend Only\n\n" +
      "This button will open the Add Room / Cottage form after backend integration."
    );

  });

}


/* =========================================================
   HELPERS
   ========================================================= */

function normalizeStatus(status) {

  const value = status.trim().toLowerCase();

  switch (value) {

    case "available":
      return "Available";

    case "reserved":
      return "Reserved";

    case "occupied":
      return "Occupied";

    case "maintenance":
      return "Maintenance";

    default:
      return null;

  }

}


function getStatusClass(status) {

  switch (status) {

    case "Available":
      return "available-badge";

    case "Reserved":
      return "reserved-badge";

    case "Occupied":
      return "occupied-badge";

    case "Maintenance":
      return "maintenance-badge";

    default:
      return "";

  }

}


/* =========================================================
   KEEP ALL LUCIDE ICONS
   ========================================================= */

function refreshIcons() {

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

}