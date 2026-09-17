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
    const body = document.getElementById("activityTableBody");
    const timeline = document.querySelector(".activity-timeline");
    const search = document.getElementById("activitySearch");
    const type = document.getElementById("activityTypeFilter");
    const action = document.getElementById("activityActionFilter");
    const modal = document.getElementById("activityModal");
    let logs = [];
    const kind = (log) => log.actor_role === "system_admin" ? "admin" : "user";
    const category = (log) => {
        const name = String(log.action_type || "").toLowerCase();
        if (name.includes("login")) return "login";
        if (name.includes("approv") || name.includes("reject")) return "approval";
        if (name.includes("reserv")) return "reservation";
        if (name.includes("suspend")) return "suspension";
        if (name.includes("profile")) return "profile";
        return name;
    };
    const details = (log) => {
        if (!log.action_details) return "—";
        if (typeof log.action_details === "object") return JSON.stringify(log.action_details);
        return String(log.action_details);
    };

    function render() {
        const query = search.value.trim().toLowerCase();
        const rows = logs.filter((log) => (!type.value || kind(log) === type.value)
            && (!action.value || category(log) === action.value)
            && [log.actor_name, log.tenant_name, log.action_type, details(log)]
                .some((value) => String(value || "").toLowerCase().includes(query)));
        body.innerHTML = rows.length ? rows.map((log) => {
            const safe = SystemAdmin.escape;
            return `<tr><td><div class="activity-date"><strong>${safe(SystemAdmin.date(log.created_at))}</strong></div></td>
                <td><div class="activity-user"><span class="activity-user-avatar ${kind(log)}"><i data-lucide="user-round"></i></span><div><strong>${safe(log.actor_name || "System")}</strong><span>${safe(log.actor_role || "System")}</span></div></div></td>
                <td><div class="activity-description"><strong>${safe(log.action_type || "Activity")}</strong><span>${safe(details(log))}</span></div></td>
                <td>${safe(log.tenant_name || "—")}</td>
                <td><span class="activity-type ${kind(log)}">${kind(log)}</span></td>
                <td><button type="button" class="activity-view-button" data-id="${Number(log.id)}"><i data-lucide="eye"></i> View</button></td></tr>`;
        }).join("") : `<tr><td colspan="6">${logs.length ? "No activity matches this filter." : "No recorded activity."}</td></tr>`;
        window.lucide?.createIcons();
    }

    function show(log) {
        const set = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value || "—"; };
        set("modalActivityTitle", log.action_type);
        set("modalActivityDescription", details(log));
        set("modalActivityDate", SystemAdmin.date(log.created_at));
        set("modalActivityType", kind(log));
        set("modalActivityUser", log.actor_name || "System");
        set("modalActivityRole", log.actor_role || "System");
        set("modalActivityTenant", log.tenant_name);
        set("modalActivityAction", log.action_type);
        set("modalActivityId", `ACT-${String(log.id).padStart(6, "0")}`);
        set("modalActivityIp", log.ip_address);
        set("modalActivityDevice", "—");
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    }
    const close = () => { modal.classList.remove("show"); document.body.style.overflow = ""; };
    body.addEventListener("click", (event) => {
        const id = event.target.closest(".activity-view-button")?.dataset.id;
        const log = logs.find((item) => String(item.id) === id);
        if (log) show(log);
    });
    ["closeActivityModal", "closeActivityDetails", "activityModalOverlay"].forEach((id) => document.getElementById(id)?.addEventListener("click", close));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    [search, type, action].forEach((control) => control.addEventListener(control === search ? "input" : "change", render));
    document.getElementById("clearActivityFilter")?.addEventListener("click", () => {
        search.value = type.value = action.value = "";
        render();
    });

    async function load() {
        try {
            const [rows, summary] = await Promise.all([
                SystemAdmin.get("/api/admin/activity-logs"), SystemAdmin.get("/api/admin/summary")
            ]);
            logs = rows;
            for (const [id, value] of [
                ["totalActivityCount", summary.activities.total], ["todayActivityCount", summary.activities.today],
                ["userActivityCount", summary.activities.user_actions], ["adminActivityCount", summary.activities.admin_actions]
            ]) document.getElementById(id).textContent = value;
            timeline.innerHTML = logs.length
                ? logs.slice(0, 5).map((log) => `<div class="activity-timeline-item"><span class="activity-timeline-icon"><i data-lucide="activity"></i></span><div class="activity-timeline-content"><strong>${SystemAdmin.escape(log.action_type)}</strong><p>${SystemAdmin.escape(log.actor_name || log.tenant_name || "System")} · ${SystemAdmin.escape(SystemAdmin.date(log.created_at))}</p></div></div>`).join("")
                : "<p>No recent activity to display.</p>";
            render();
        } catch (error) {
            body.innerHTML = `<tr><td colspan="6">${SystemAdmin.escape(error.message)}</td></tr>`;
            SystemAdmin.error(timeline, error);
        }
    }
    document.getElementById("refreshActivityButton")?.addEventListener("click", load);
    load();
});
