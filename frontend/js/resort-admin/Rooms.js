const API_ENDPOINTS = {
    rooms: "/api/resort-admin/rooms",
    roomStatus(roomId) {
        return `/api/resort-admin/rooms/${encodeURIComponent(roomId)}/status`;
    },
};

const accessToken = sessionStorage.getItem("resorthub_access_token");

let roomData = [];

async function loadRooms() {
    if (!accessToken) {
        window.location.href = "../auth/login.html";
        return false;
    }

    const response = await fetch(API_ENDPOINTS.rooms, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Unable to load rooms and cottages.");
    }

    roomData = Array.isArray(data.rooms) ? data.rooms : [];

    return true;
}

/* ELEMENTS */

const roomsGrid = document.querySelector(".rooms-grid");

let roomCards = document.querySelectorAll(".room-card");

const searchInputs = document.querySelectorAll(
    '.filter-bar input[type="search"], .topbar input[type="search"]',
);

const typeFilter = document.querySelector(".filter-bar select:nth-of-type(1)");
const statusFilter = document.querySelector(".filter-bar select:nth-of-type(2)");

const clearButton = document.querySelector(".clear-filter");

const gridButton = document.querySelector(".view-button:nth-of-type(1)");
const listButton = document.querySelector(".view-button:nth-of-type(2)");

let updateButtons = document.querySelectorAll(".status-button");

const exportButton = document.querySelector(".btn-secondary");
const addButton = document.querySelector(".btn-primary");

function renderRooms() {
    if (!roomsGrid) {
        return;
    }

    roomsGrid.innerHTML = roomData
        .map((room) => {
            const roomType = formatRoomValue(room.accommodation_type);
            const roomStatus = formatRoomValue(room.display_status || room.availability_status);

            return `
      <article
        class="room-card"
        data-room-id="${Number(room.id)}">

        <div class="room-image">
          <i data-lucide="bed-double"></i>
        </div>

        <div class="room-card-content">
          <h3>${escapeHtml(room.name)}</h3>

          <span class="room-type">
            ${escapeHtml(roomType)}
          </span>

          <span class="status-badge ${getStatusClass(roomStatus)}">
            ${escapeHtml(roomStatus)}
          </span>

          <button
            class="status-button"
            type="button">
              Update Status
          </button>
        </div>
      </article>
    `;
        })
        .join("");

    roomCards = document.querySelectorAll(".room-card");
    updateButtons = document.querySelectorAll(".status-button");

    refreshIcons();
}

function formatRoomValue(value) {
    return String(value || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value || "");
    return element.innerHTML;
}

/* INITIALIZE */

document.addEventListener("DOMContentLoaded", async () => {
    refreshIcons();

    try {
        const loaded = await loadRooms();

        if (!loaded) {
            return;
        }

        renderRooms();
        updateSummaryCards();
        updateOccupancySummary();
        setupSearch();
        setupFilters();
        setupClearFilters();
        setupViewButtons();
        setupStatusButtons();
        setupExportButton();
        setupAddButton();
    } catch (error) {
        console.error("Room loading failed:", error);
        alert(error.message || "Unable to load rooms and cottages.");
    }
});

/* SEARCH */

function setupSearch() {
    searchInputs.forEach((input) => {
        input.addEventListener("input", filterRooms);
    });
}

/* FILTERS */

function setupFilters() {
    if (typeFilter) typeFilter.addEventListener("change", filterRooms);

    if (statusFilter) statusFilter.addEventListener("change", filterRooms);
}

/* FILTER LOGIC */

function filterRooms() {
    let keyword = "";

    searchInputs.forEach((input) => {
        if (input.value.trim() !== "") {
            keyword = input.value.trim().toLowerCase();
        }
    });

    const selectedType = typeFilter ? typeFilter.value : "All Types";
    const selectedStatus = statusFilter ? statusFilter.value : "All Status";

    roomCards.forEach((card) => {
        const title = card.querySelector("h3").textContent.toLowerCase();
        const type = card.querySelector(".room-type").textContent.trim();
        const status = card.querySelector(".status-badge").textContent.trim();

        const matchKeyword = title.includes(keyword) || type.toLowerCase().includes(keyword);

        const matchType = selectedType === "All Types" || selectedType === type;

        const matchStatus = selectedStatus === "All Status" || selectedStatus === status;

        if (matchKeyword && matchType && matchStatus) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

/* CLEAR FILTERS */

function setupClearFilters() {
    if (!clearButton) return;

    clearButton.addEventListener("click", () => {
        searchInputs.forEach((input) => (input.value = ""));

        if (typeFilter) typeFilter.selectedIndex = 0;

        if (statusFilter) statusFilter.selectedIndex = 0;

        roomCards.forEach((card) => {
            card.style.display = "block";
        });
    });
}

/* GRID / LIST VIEW */

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

/*UPDATE STATUS*/

function setupStatusButtons() {
    updateButtons.forEach((button) => {
        button.addEventListener("click", updateRoomStatus);
    });
}

async function updateRoomStatus(event) {
    const button = event.currentTarget;
    const card = button.closest(".room-card");
    const roomId = Number(card.dataset.roomId);
    const room = roomData.find((item) => Number(item.id) === roomId);

    if (!room) {
        alert("Room information is unavailable. Refresh the page.");
        return;
    }

    const selectedStatus = prompt(
        `Update status for ${room.name}\n\nAvailable\nMaintenance\nInactive`,
        formatRoomValue(room.availability_status),
    );

    if (!selectedStatus) {
        return;
    }

    const newStatus = normalizeStatus(selectedStatus);

    if (!newStatus) {
        alert("Please enter Available, Maintenance, or Inactive.");
        return;
    }

    button.disabled = true;
    button.textContent = "Updating...";

    let saved = false;

    try {
        const response = await fetch(API_ENDPOINTS.roomStatus(roomId), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                status: newStatus.toLowerCase(),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to update room status.");
        }

        saved = true;

        const loaded = await loadRooms();

        if (!loaded) {
            return;
        }

        renderRooms();
        setupStatusButtons();
        updateSummaryCards();
        updateOccupancySummary();
        filterRooms();
    } catch (error) {
        console.error("Room status update failed:", error);

        alert(
            saved
                ? "Status saved, but the room list could not refresh. Please reload the page."
                : error.message,
        );
    } finally {
        button.disabled = false;
        button.textContent = "Update Status";
    }
}

/* SUMMARY CARDS */

function updateSummaryCards() {
    const statuses = getStatusTotals();

    updateCard("Total Rooms / Cottages", roomCards.length);

    updateCard("Available", statuses.available);

    updateCard("Reserved", statuses.reserved);

    updateCard("Occupied", statuses.occupied);

    updateCard("Maintenance", statuses.maintenance);
}

function updateCard(label, value) {
    document.querySelectorAll(".stat-card").forEach((card) => {
        const text = card.querySelector("span");

        if (!text) return;

        if (text.textContent.trim() === label) {
            const number = card.querySelector("strong");

            if (number) number.textContent = value;
        }
    });
}

/* OCCUPANCY SUMMARY */

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

/* COUNT STATUSES */

function getStatusTotals() {
    let available = 0;
    let reserved = 0;
    let occupied = 0;
    let maintenance = 0;

    roomCards.forEach((card) => {
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
        maintenancePercent: Math.round((maintenance / total) * 100),
    };
}

/* EXPORT REPORT (FRONTEND SAMPLE) */

function setupExportButton() {
    if (!exportButton) return;

    exportButton.addEventListener("click", () => {
        alert(
            "Sample Frontend Only\n\n" +
                "The Export Report feature will generate the Rooms & Cottages report once the database is connected.",
        );
    });
}

/* ADD ROOM BUTTON (FRONTEND SAMPLE) */

function setupAddButton() {
    if (!addButton) return;

    addButton.addEventListener("click", () => {
        alert(
            "Sample Frontend Only\n\n" +
                "This button will open the Add Room / Cottage form after backend integration.",
        );
    });
}

/* HELPERS */

function normalizeStatus(status) {
    const value = status.trim().toLowerCase();

    switch (value) {
        case "available":
            return "Available";

        case "maintenance":
            return "Maintenance";

        case "inactive":
            return "Inactive";

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

        case "Inactive":
            return "inactive-badge";

        default:
            return "";
    }
}

/* KEEP ALL LUCIDE ICONS */

function refreshIcons() {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}
