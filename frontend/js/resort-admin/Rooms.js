"use strict";

const API_ENDPOINTS = {
    rooms: "/api/resort-admin/rooms",
    room: (roomId) => `/api/resort-admin/rooms/${encodeURIComponent(roomId)}`,
    roomStatus: (roomId) => `/api/resort-admin/rooms/${encodeURIComponent(roomId)}/status`,
};

const accessToken = sessionStorage.getItem("resorthub_access_token");
const fallbackImage = "/assets/images/accommodation-fallback.png";
let roomData = [];
let editingRoomId = null;
let previewObjectUrl = null;

const roomsGrid = document.querySelector(".rooms-grid");
const searchInputs = document.querySelectorAll('.filter-bar input[type="search"], .topbar input[type="search"]');
const typeFilter = document.querySelector(".filter-bar select:nth-of-type(1)");
const statusFilter = document.querySelector(".filter-bar select:nth-of-type(2)");
const clearButton = document.querySelector(".clear-filter");
const gridButton = document.querySelector(".view-button:nth-of-type(1)");
const listButton = document.querySelector(".view-button:nth-of-type(2)");
const exportButton = document.querySelector(".page-actions .btn-secondary");
const addButton = document.getElementById("openAddRoomModal");
const addRoomModal = document.getElementById("addRoomModal");
const addRoomForm = document.getElementById("addRoomForm");
const closeAddRoomModalButton = document.getElementById("closeAddRoomModal");
const closeAddRoomBackdrop = document.getElementById("closeAddRoomBackdrop");
const cancelAddRoomButton = document.getElementById("cancelAddRoom");
const saveRoomButton = document.getElementById("saveRoomButton");
const roomFormMessage = document.getElementById("roomFormMessage");
const roomModalTitle = document.getElementById("addRoomModalTitle");
const roomModalDescription = document.getElementById("roomModalDescription");
const roomImageInput = document.getElementById("roomImage");
const roomImagePreview = document.getElementById("roomImagePreview");
const roomImagePreviewElement = document.getElementById("roomImagePreviewElement");

document.addEventListener("DOMContentLoaded", initializeRoomsPage);

async function initializeRoomsPage() {
    refreshIcons();
    if (!accessToken) {
        window.location.href = "../auth/login.html";
        return;
    }

    setupEvents();
    try {
        await loadRooms();
        renderRooms();
    } catch (error) {
        console.error("Room loading failed:", error);
        showPageError(error.message || "Unable to load rooms and cottages.");
    }
}

function setupEvents() {
    searchInputs.forEach((input) => input.addEventListener("input", filterRooms));
    typeFilter?.addEventListener("change", filterRooms);
    statusFilter?.addEventListener("change", filterRooms);
    clearButton?.addEventListener("click", clearFilters);
    gridButton?.addEventListener("click", () => setView("grid"));
    listButton?.addEventListener("click", () => setView("list"));
    exportButton?.addEventListener("click", exportRooms);
    addButton?.addEventListener("click", openAddDialog);
    closeAddRoomModalButton?.addEventListener("click", closeRoomDialog);
    closeAddRoomBackdrop?.addEventListener("click", closeRoomDialog);
    cancelAddRoomButton?.addEventListener("click", closeRoomDialog);
    addRoomForm?.addEventListener("submit", saveRoom);
    roomImageInput?.addEventListener("change", previewSelectedImage);
    roomsGrid?.addEventListener("click", handleCardAction);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !addRoomModal?.hidden) closeRoomDialog();
    });
}

async function loadRooms() {
    const response = await fetch(API_ENDPOINTS.rooms, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to load rooms and cottages.");
    roomData = Array.isArray(data.rooms) ? data.rooms : [];
}

function renderRooms() {
    if (!roomsGrid) return;
    if (!roomData.length) {
        roomsGrid.innerHTML = `<div class="rooms-empty"><i data-lucide="bed-double"></i><h3>No rooms or cottages yet</h3><p>Add your first accommodation so clients can reserve it.</p></div>`;
    } else {
        roomsGrid.innerHTML = roomData.map(createRoomCardMarkup).join("");
    }
    updateSummaryCards();
    updateOccupancySummary();
    filterRooms();
    refreshIcons();
}

function createRoomCardMarkup(room) {
    const roomType = formatRoomValue(room.accommodation_type);
    const status = formatRoomValue(room.display_status || room.availability_status);
    const amenities = normalizeAmenities(room.amenities);
    const imagePath = escapeHtml(room.image_path || fallbackImage);
    return `
        <article class="room-card" data-room-id="${Number(room.id)}">
            <div class="room-image">
                <img src="${imagePath}" alt="${escapeHtml(room.name)}" onerror="this.onerror=null;this.src='${fallbackImage}'" />
                <span class="status-badge ${getStatusClass(status)}">${escapeHtml(status)}</span>
            </div>
            <div class="room-card-content">
                <div class="room-card-heading">
                    <div><span class="room-type">${escapeHtml(roomType)}</span><h3>${escapeHtml(room.name)}</h3></div>
                    <strong class="room-price">${formatCurrency(room.nightly_rate)}<small>/night</small></strong>
                </div>
                <p class="room-capacity"><i data-lucide="users"></i>Up to ${Number(room.capacity) || 0} guests</p>
                <p class="room-description">${escapeHtml(room.description || "No description has been added yet.")}</p>
                <div class="room-amenities">
                    ${(amenities.length ? amenities.slice(0, 4) : ["No amenities selected"]).map((item) => `<span><i data-lucide="check"></i>${escapeHtml(item)}</span>`).join("")}
                </div>
                <div class="room-card-actions">
                    <button class="edit-room-button" type="button" data-action="edit"><i data-lucide="pencil"></i>Edit</button>
                    <button class="status-button" type="button" data-action="status"><i data-lucide="refresh-cw"></i>Status</button>
                </div>
            </div>
        </article>`;
}

async function handleCardAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const roomId = Number(button.closest(".room-card")?.dataset.roomId);
    const room = roomData.find((item) => Number(item.id) === roomId);
    if (!room) return;
    if (button.dataset.action === "edit") openEditDialog(room);
    if (button.dataset.action === "status") await updateRoomStatus(room, button);
}

function openAddDialog() {
    editingRoomId = null;
    addRoomForm.reset();
    document.getElementById("roomCapacity").value = "2";
    document.getElementById("roomStatus").value = "available";
    roomModalTitle.textContent = "Add Room / Cottage";
    roomModalDescription.textContent = "Create an accommodation clients can reserve.";
    saveRoomButton.innerHTML = '<i data-lucide="plus"></i> Add Accommodation';
    resetMessage();
    clearImagePreview();
    showRoomDialog();
}

function openEditDialog(room) {
    editingRoomId = Number(room.id);
    addRoomForm.reset();
    document.getElementById("roomName").value = room.name || "";
    document.getElementById("roomType").value = room.accommodation_type || "room";
    document.getElementById("roomCapacity").value = room.capacity || 1;
    document.getElementById("roomRate").value = room.nightly_rate || "";
    document.getElementById("roomStatus").value = room.availability_status || "available";
    document.getElementById("roomDescription").value = room.description || "";
    populateAmenities(room.amenities);
    roomModalTitle.textContent = "Edit Room / Cottage";
    roomModalDescription.textContent = "Update what clients see in the resort and reservation pages.";
    saveRoomButton.innerHTML = '<i data-lucide="save"></i> Save Changes';
    resetMessage();
    showImagePreview(room.image_path || fallbackImage);
    showRoomDialog();
}

function showRoomDialog() {
    addRoomModal.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("roomName")?.focus();
    refreshIcons();
}

function closeRoomDialog() {
    if (!addRoomModal) return;
    addRoomModal.hidden = true;
    document.body.style.overflow = "";
    editingRoomId = null;
    clearImagePreview();
    resetMessage();
}

async function saveRoom(event) {
    event.preventDefault();
    if (!addRoomForm.checkValidity()) {
        addRoomForm.reportValidity();
        return;
    }

    const formData = new FormData(addRoomForm);
    const selectedAmenities = [...addRoomForm.querySelectorAll('input[name="amenity"]:checked')].map((input) => input.value);
    const additional = document.getElementById("roomAdditionalAmenities").value.split(",").map((item) => item.trim()).filter(Boolean);
    formData.set("amenities", [...new Set([...selectedAmenities, ...additional])].join(", "));
    formData.delete("amenity");

    const isEditing = Number.isInteger(editingRoomId);
    saveRoomButton.disabled = true;
    saveRoomButton.textContent = isEditing ? "Saving..." : "Adding...";
    showRoomFormMessage("Uploading and saving accommodation...", "success");

    try {
        const response = await fetch(isEditing ? API_ENDPOINTS.room(editingRoomId) : API_ENDPOINTS.rooms, {
            method: isEditing ? "PUT" : "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to save the accommodation.");
        await loadRooms();
        renderRooms();
        closeRoomDialog();
    } catch (error) {
        console.error("Accommodation save failed:", error);
        showRoomFormMessage(error.message, "error");
    } finally {
        saveRoomButton.disabled = false;
        saveRoomButton.innerHTML = isEditing ? '<i data-lucide="save"></i> Save Changes' : '<i data-lucide="plus"></i> Add Accommodation';
        refreshIcons();
    }
}

async function updateRoomStatus(room, button) {
    const selected = prompt(`Update status for ${room.name}\n\nAvailable\nMaintenance\nInactive`, formatRoomValue(room.availability_status));
    if (!selected) return;
    const normalized = normalizeStatus(selected);
    if (!normalized) {
        alert("Please enter Available, Maintenance, or Inactive.");
        return;
    }

    button.disabled = true;
    try {
        const response = await fetch(API_ENDPOINTS.roomStatus(room.id), {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ status: normalized.toLowerCase() }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to update room status.");
        await loadRooms();
        renderRooms();
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
    }
}

function previewSelectedImage() {
    const file = roomImageInput.files?.[0];
    if (!file) return;
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = URL.createObjectURL(file);
    showImagePreview(previewObjectUrl);
}

function showImagePreview(source) {
    roomImagePreviewElement.src = source;
    roomImagePreview.hidden = false;
}

function clearImagePreview() {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
    if (roomImagePreviewElement) roomImagePreviewElement.removeAttribute("src");
    if (roomImagePreview) roomImagePreview.hidden = true;
}

function populateAmenities(value) {
    const amenities = normalizeAmenities(value);
    const known = new Set();
    addRoomForm.querySelectorAll('input[name="amenity"]').forEach((input) => {
        input.checked = amenities.some((item) => item.toLowerCase() === input.value.toLowerCase());
        known.add(input.value.toLowerCase());
    });
    document.getElementById("roomAdditionalAmenities").value = amenities.filter((item) => !known.has(item.toLowerCase())).join(", ");
}

function filterRooms() {
    let keyword = "";
    searchInputs.forEach((input) => { if (input.value.trim()) keyword = input.value.trim().toLowerCase(); });
    const selectedType = typeFilter?.value || "All Types";
    const selectedStatus = statusFilter?.value || "All Status";
    document.querySelectorAll(".room-card").forEach((card) => {
        const title = card.querySelector("h3").textContent.toLowerCase();
        const type = card.querySelector(".room-type").textContent.trim();
        const status = card.querySelector(".status-badge").textContent.trim();
        card.hidden = !((title.includes(keyword) || type.toLowerCase().includes(keyword)) && (selectedType === "All Types" || selectedType === type) && (selectedStatus === "All Status" || selectedStatus === status));
    });
}

function clearFilters() {
    searchInputs.forEach((input) => { input.value = ""; });
    if (typeFilter) typeFilter.selectedIndex = 0;
    if (statusFilter) statusFilter.selectedIndex = 0;
    filterRooms();
}

function setView(view) {
    roomsGrid.classList.toggle("list-view", view === "list");
    roomsGrid.classList.toggle("grid-view", view === "grid");
    gridButton?.classList.toggle("active", view === "grid");
    listButton?.classList.toggle("active", view === "list");
}

function updateSummaryCards() {
    const totals = getStatusTotals();
    const values = { "Total Rooms / Cottages": roomData.length, Available: totals.available, Reserved: totals.reserved, Occupied: totals.occupied, Maintenance: totals.maintenance };
    document.querySelectorAll(".stat-card").forEach((card) => {
        const label = card.querySelector("span")?.textContent.trim();
        if (Object.hasOwn(values, label)) card.querySelector("strong").textContent = values[label];
    });
}

function updateOccupancySummary() {
    const totals = getStatusTotals();
    const rows = document.querySelectorAll(".occupancy-list > div");
    ["available", "reserved", "occupied", "maintenance"].forEach((key, index) => {
        if (rows[index]) rows[index].querySelector("strong").textContent = `${totals[key]} (${totals[`${key}Percent`]}%)`;
    });
    const total = document.querySelector(".donut-center strong");
    if (total) total.textContent = roomData.length;
}

function getStatusTotals() {
    const values = { available: 0, reserved: 0, occupied: 0, maintenance: 0 };
    roomData.forEach((room) => {
        const status = String(room.display_status || room.availability_status || "").toLowerCase();
        if (Object.hasOwn(values, status)) values[status] += 1;
    });
    const total = roomData.length || 1;
    return { ...values, availablePercent: Math.round(values.available / total * 100), reservedPercent: Math.round(values.reserved / total * 100), occupiedPercent: Math.round(values.occupied / total * 100), maintenancePercent: Math.round(values.maintenance / total * 100) };
}

function exportRooms() {
    const rows = [["Name", "Type", "Capacity", "Nightly Rate", "Status", "Amenities"], ...roomData.map((room) => [room.name, room.accommodation_type, room.capacity, room.nightly_rate, room.display_status || room.availability_status, room.amenities || ""])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "rooms-and-cottages.csv";
    link.click();
    URL.revokeObjectURL(url);
}

function showPageError(message) {
    if (roomsGrid) roomsGrid.innerHTML = `<div class="rooms-empty"><i data-lucide="triangle-alert"></i><h3>Unable to load accommodations</h3><p>${escapeHtml(message)}</p></div>`;
    refreshIcons();
}

function showRoomFormMessage(message, type) {
    roomFormMessage.hidden = false;
    roomFormMessage.textContent = message;
    roomFormMessage.className = `room-form-message ${type}`;
}

function resetMessage() {
    roomFormMessage.hidden = true;
    roomFormMessage.textContent = "";
    roomFormMessage.className = "room-form-message";
}

function normalizeAmenities(value) {
    return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeStatus(status) {
    const value = String(status || "").trim().toLowerCase();
    return ["available", "maintenance", "inactive"].includes(value) ? formatRoomValue(value) : null;
}

function formatRoomValue(value) {
    return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function getStatusClass(status) {
    return `${String(status || "").toLowerCase().replaceAll(" ", "-")}-badge`;
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value || "");
    return element.innerHTML;
}

function refreshIcons() {
    if (typeof lucide !== "undefined") lucide.createIcons();
}
