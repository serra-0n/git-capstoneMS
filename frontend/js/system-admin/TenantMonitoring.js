"use strict";

window.SystemAdmin = {
    escape(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
    },
    async get(url, options = {}) {
        const token = sessionStorage.getItem("resorthub_access_token");
        if (!token) {
            window.location.href = "../auth/login.html";
            throw new Error("Authentication is required.");
        }
        const response = await fetch(url, {
            ...options,
            headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...options.headers }
        });
        const data = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                sessionStorage.removeItem("resorthub_access_token");
                window.location.href = "../auth/login.html";
            }
            throw new Error(data.message || "Unable to load system data.");
        }
        return data;
    },
    date(value) {
        if (!value) return "—";
        const parsed = new Date(String(value).replace(" ", "T"));
        return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
    },
    error(container, error) {
        if (container) container.textContent = error.message || "Unable to load records.";
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    document.querySelector(".sidebar-logout")?.addEventListener("click", (event) => {
        event.preventDefault();
        sessionStorage.removeItem("resorthub_access_token");
        window.location.href = "../auth/login.html";
    });
    try {
        const { user } = await window.SystemAdmin.get("/api/auth/me");
        if (user.role !== "system_admin" || user.accountStatus !== "active") {
            window.location.href = "../auth/login.html";
            return;
        }
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "System Admin";
        document.querySelectorAll(".sidebar-user-info strong, .topbar-profile strong").forEach((element) => { element.textContent = name; });
    } catch (error) {
        console.error("System admin account loading failed:", error);
    }
});

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const api = window.SystemAdmin;
    const list = document.querySelector(".tenant-list");
    const search = document.querySelector(".tenant-search input");
    const tabs = [...document.querySelectorAll(".tenant-tab")];
    const modal = document.getElementById("tenantModal");
    let tenants = [];
    let status = "all";
    let selectedTenant = null;

    const displayStatus = (tenant) => tenant.approval_status === "pending" || tenant.approval_status === "rejected"
        ? tenant.approval_status : tenant.tenant_status;

    function updateCounts() {
        const counts = { all: tenants.length, active: 0, suspended: 0, pending: 0, rejected: 0 };
        tenants.forEach((tenant) => { const key = displayStatus(tenant); if (key in counts) counts[key]++; });
        for (const [id, key] of [
            ["totalTenantCount", "all"], ["activeTenantCount", "active"],
            ["suspendedTenantCount", "suspended"], ["pendingTenantCount", "pending"]
        ]) document.getElementById(id).textContent = counts[key];
        tabs.forEach((tab) => { tab.querySelector(".tab-count").textContent = counts[tab.dataset.status] || 0; });
    }

    function render() {
        const query = search.value.trim().toLowerCase();
        const rows = tenants.filter((tenant) => (status === "all" || displayStatus(tenant) === status)
            && [tenant.resort_name, tenant.owner_name, tenant.owner_email, tenant.location, tenant.tenant_code]
                .some((value) => String(value || "").toLowerCase().includes(query)));
        if (!rows.length) {
            list.innerHTML = `<p class="admin-empty-state">${tenants.length ? "No resorts match this filter." : "No resort records to display."}</p>`;
            return;
        }
        list.innerHTML = rows.map((tenant) => {
            const state = displayStatus(tenant);
            const safe = api.escape;
            return `<article class="tenant-item">
                <div class="tenant-resort"><span class="tenant-avatar"><i data-lucide="building-2"></i></span>
                    <div><strong>${safe(tenant.resort_name)}</strong><span>${safe(tenant.tenant_code || `TEN-${tenant.id}`)}</span></div></div>
                <div class="tenant-owner"><span class="tenant-label">Owner</span><strong>${safe(tenant.owner_name || "—")}</strong></div>
                <div class="tenant-plan"><span class="tenant-label">Location</span><strong>${safe(tenant.location || "—")}</strong></div>
                <span class="tenant-status ${safe(state)}">${safe(state.charAt(0).toUpperCase() + state.slice(1))}</span>
                <button type="button" class="tenant-view-button" data-id="${Number(tenant.id)}"><i data-lucide="eye"></i> View Details</button>
            </article>`;
        }).join("");
        window.lucide?.createIcons();
    }

    function openDetails(tenant) {
        selectedTenant = tenant;
        document.getElementById("modaltenantName").textContent = tenant.resort_name || "Resort Details";
        const sections = [...modal.querySelectorAll(".tenant-detail-section")];
        const fields = (section) => [...sections[section].querySelectorAll(".tenant-detail-field strong")];
        const resort = fields(0), owner = fields(1);
        resort[0].textContent = tenant.resort_name || "—";
        resort[1].textContent = tenant.location || "—";
        resort[2].textContent = tenant.resort_type || "—";
        resort[3].textContent = tenant.tenant_code || `TEN-${tenant.id}`;
        owner[0].textContent = tenant.owner_name || "—";
        owner[1].textContent = tenant.owner_email || "—";
        owner[2].textContent = tenant.contact_number || "—";
        const state = displayStatus(tenant);
        owner[3].textContent = state.charAt(0).toUpperCase() + state.slice(1);
        owner[3].className = `tenant-detail-status ${state}`;
        const activity = [...sections[2].querySelectorAll(".tenant-activity-item strong")];
        activity[0].textContent = api.date(tenant.last_login);
        activity[1].textContent = `${Number(tenant.total_users || 0)} Users`;
        activity[2].textContent = `${Number(tenant.active_reservations || 0)} Reservations`;
        const suspensionButton = document.getElementById("suspendedTenant");
        if (suspensionButton) {
            suspensionButton.hidden = tenant.approval_status !== "approved";
            suspensionButton.innerHTML = state === "suspended"
                ? '<i data-lucide="play-circle"></i> Reactivate Resort'
                : '<i data-lucide="pause-circle"></i> Suspend Resort';
            window.lucide?.createIcons();
        }
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    function closeDetails() { modal.classList.remove("show"); document.body.style.overflow = ""; }
    list.addEventListener("click", (event) => {
        const id = event.target.closest(".tenant-view-button")?.dataset.id;
        if (id) { const tenant = tenants.find((item) => String(item.id) === id); if (tenant) openDetails(tenant); }
    });
    ["closeTenantModal", "closeTenantDetails"].forEach((id) => document.getElementById(id)?.addEventListener("click", closeDetails));
    modal.querySelector(".tenant-modal-overlay")?.addEventListener("click", closeDetails);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDetails(); });
    search.addEventListener("input", render);
    tabs.forEach((tab) => tab.addEventListener("click", () => {
        status = tab.dataset.status;
        tabs.forEach((item) => item.classList.toggle("active", item === tab));
        render();
    }));
    document.querySelector(".tenant-filter-button")?.addEventListener("click", () => search.focus());
    document.getElementById("suspendedTenant")?.addEventListener("click", async () => {
        if (!selectedTenant) return;
        const next = selectedTenant.tenant_status === "suspended" ? "active" : "suspended";
        if (!confirm(`${next === "suspended" ? "Suspend" : "Reactivate"} ${selectedTenant.resort_name}?`)) return;
        try {
            await api.get(`/api/admin/tenants/${selectedTenant.id}/monitoring-status`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next })
            });
            selectedTenant.tenant_status = next;
            updateCounts(); render(); closeDetails();
        } catch (error) { alert(error.message); }
    });

    api.get("/api/admin/tenants").then((rows) => { tenants = rows; updateCounts(); render(); })
        .catch((error) => api.error(list, error));
});
