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

document.addEventListener("DOMContentLoaded", function () {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    const totalTenantElement = document.getElementById("dashboardTotalTenants");
    const totalUserElement = document.getElementById("dashboardTotalUsers");
    const activeTenantElement = document.getElementById("dashboardActiveTenants");
    const pendingApprovalElement = document.getElementById("dashboardPendingApprovals");

    Promise.all([SystemAdmin.get("/api/admin/summary"), SystemAdmin.get("/api/admin/activity-logs")])
        .then(([summary, logs]) => {
            totalTenantElement.textContent = summary.tenants.total;
            totalUserElement.textContent = summary.users.total;
            activeTenantElement.textContent = summary.tenants.active;
            pendingApprovalElement.textContent = summary.tenants.pending;
            const statusRows = document.querySelectorAll(".tenant-status-item strong");
            [summary.tenants.active, summary.tenants.suspended, summary.tenants.pending]
                .forEach((count, index) => { if (statusRows[index]) statusRows[index].textContent = `${count} Tenants`; });
            const pendingCount = document.querySelector(".approval-number strong");
            if (pendingCount) pendingCount.textContent = summary.tenants.pending;
            const recent = document.querySelector(".dashboard-activity-list");
            recent.innerHTML = logs.length
                ? logs.slice(0, 5).map((log) => `<div class="dashboard-activity-item"><strong>${SystemAdmin.escape(log.action_type)}</strong><span>${SystemAdmin.escape(log.actor_name || log.tenant_name || "System")} · ${SystemAdmin.escape(SystemAdmin.date(log.created_at))}</span></div>`).join("")
                : "<p>No recent activity to display.</p>";
        })
        .catch((error) => SystemAdmin.error(document.querySelector(".dashboard-activity-list"), error));

    const reportItems = document.querySelectorAll(".dashboard-report-item");

    reportItems.forEach(function (report) {
        report.addEventListener("click", function () {
            const reportType = report.getAttribute("data-report");

            if (reportType) window.location.href = `SystemReports.html?type=${encodeURIComponent(reportType)}`;
        });
    });

    const menuButton = document.querySelector(".menu-button");
    const sidebar = document.querySelector(".sidebar");

    if (menuButton && sidebar) {
        menuButton.addEventListener("click", function () {
            sidebar.classList.toggle("sidebar-open");
        });
    }

    document.addEventListener("click", function (event) {
        if (!sidebar || !menuButton) {
            return;
        }

        const clickedInsideSidebar = sidebar.contains(event.target);
        const clickedMenuButton = menuButton.contains(event.target);

        if (!clickedInsideSidebar && !clickedMenuButton) {
            sidebar.classList.remove("sidebar-open");
        }
    });

});
