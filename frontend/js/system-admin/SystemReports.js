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
    const list = document.querySelector(".report-list");
    const modal = document.getElementById("reportModal");
    const type = document.getElementById("reportType");
    const from = document.getElementById("reportDateFrom");
    const to = document.getElementById("reportDateTo");
    const reports = new Map();
    let selected = null;
    const types = {
        tenant: { title: "Tenant Report", icon: "building-2", section: "tenants",
            fields: [["Total Records", "total"], ["Active", "active"], ["Suspended", "suspended"], ["Pending", "pending"], ["Rejected", "rejected"]] },
        user: { title: "User Report", icon: "users", section: "users",
            fields: [["Total Records", "total"], ["Active", "active"], ["Inactive", "inactive"], ["System Admins", "system_admin"], ["Resort Admins", "resort_admin"], ["Clients", "client"]] },
        activity: { title: "Activity Report", icon: "activity", section: "activities",
            fields: [["Total Records", "total"], ["User Actions", "user_actions"], ["Admin Actions", "admin_actions"]] },
        system: { title: "System Summary Report", icon: "file-chart-column", section: "system",
            fields: [["Reservations", "reservations"], ["Payments", "payments"], ["Documents", "documents"]] }
    };
    const requestedType = new URLSearchParams(window.location.search).get("type");
    if (types[requestedType]) type.value = requestedType;

    function renderList() {
        list.innerHTML = reports.size ? [...reports].reverse().map(([id, report]) => {
            const config = types[report.type];
            return `<article class="report-item"><span class="report-item-icon ${report.type}"><i data-lucide="${config.icon}"></i></span>
                <div class="report-item-info"><strong>${config.title}</strong><span>${SystemAdmin.escape(report.data.from)} to ${SystemAdmin.escape(report.data.to)}</span><small>Generated ${SystemAdmin.escape(SystemAdmin.date(report.generatedAt))}</small></div>
                <div class="report-item-actions"><button type="button" class="report-view-button" data-id="${id}"><i data-lucide="eye"></i> View</button>
                <button type="button" class="report-download-button" data-id="${id}"><i data-lucide="download"></i> Download</button></div></article>`;
        }).join("") : "<p>No generated reports to display.</p>";
        window.lucide?.createIcons();
    }

    function view(report) {
        selected = report;
        const config = types[report.type];
        const put = (id, value) => { document.getElementById(id).textContent = value; };
        put("modalReportTitle", config.title);
        put("modalReportDescription", `Database records created from ${report.data.from} to ${report.data.to}.`);
        put("modalReportName", config.title);
        put("modalReportType", config.title);
        put("modalReportDate", SystemAdmin.date(report.generatedAt));
        const grid = modal.querySelector(".report-summary-grid");
        grid.innerHTML = config.fields.map(([label, key]) => `<div class="report-summary-item"><span>${SystemAdmin.escape(label)}</span><strong>${Number(report.data[config.section][key] || 0)}</strong></div>`).join("");
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    }
    const close = () => { modal.classList.remove("show"); document.body.style.overflow = ""; };

    function download(report) {
        const config = types[report.type];
        const rows = [config.title, `From: ${report.data.from}`, `To: ${report.data.to}`,
            `Generated: ${SystemAdmin.date(report.generatedAt)}`, "",
            ...config.fields.map(([label, key]) => `${label}: ${Number(report.data[config.section][key] || 0)}`)];
        const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/plain;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `resorthub_${report.type}_${report.data.from}_${report.data.to}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    list.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-id]");
        if (!button) return;
        const report = reports.get(button.dataset.id);
        if (!report) return;
        if (button.classList.contains("report-view-button")) view(report);
        else download(report);
    });
    ["closeReportModal", "closeReportDetails", "reportModalOverlay"].forEach((id) => document.getElementById(id)?.addEventListener("click", close));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    document.getElementById("modalReportDownload")?.addEventListener("click", () => { if (selected) download(selected); });

    document.getElementById("generateReportButton")?.addEventListener("click", async () => {
        if (!types[type.value] || !from.value || !to.value || from.value > to.value) {
            alert("Select a report type and a valid date range.");
            return;
        }
        try {
            const data = await SystemAdmin.get(`/api/admin/reports?from=${encodeURIComponent(from.value)}&to=${encodeURIComponent(to.value)}`);
            const report = { type: type.value, data, generatedAt: new Date().toISOString() };
            reports.set(String(Date.now()), report);
            renderList();
            view(report);
        } catch (error) { alert(error.message); }
    });

    SystemAdmin.get("/api/admin/summary").then((summary) => {
        [["totalTenantReport", summary.tenants.total], ["totalUserReport", summary.users.total],
            ["totalActivitiesReport", summary.activities.total], ["activeTenantReport", summary.tenants.active]]
            .forEach(([id, value]) => { document.getElementById(id).textContent = value; });
    }).catch((error) => SystemAdmin.error(list, error));
});
