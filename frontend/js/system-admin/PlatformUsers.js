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
    const body = document.querySelector(".platform-user-table tbody");
    const search = document.querySelector(".platform-user-search input");
    const role = document.querySelector(".user-role-filter");
    const status = document.querySelector(".user-status-filter");
    const counts = [...document.querySelectorAll(".user-overview-card strong")];
    let users = [];
    const labels = { system_admin: "System Administrator", resort_admin: "Resort Administrator", client: "Client" };

    function render() {
        const query = search.value.trim().toLowerCase();
        const rows = users.filter((user) => (!role.value || user.role === role.value.replace("-", "_"))
            && (!status.value || user.account_status === status.value)
            && [user.first_name, user.last_name, user.email, user.tenant_names].some((value) => String(value || "").toLowerCase().includes(query)));
        body.innerHTML = rows.length ? rows.map((user) => {
            const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed user";
            const safe = SystemAdmin.escape;
            return `<tr><td><div class="platform-user-info"><span class="platform-user-avatar"><i data-lucide="user-round"></i></span><div><strong>${safe(name)}</strong><span>${safe(user.email)}</span></div></div></td>
                <td><span class="user-role ${safe(user.role.replace("_", "-"))}">${safe(labels[user.role] || user.role)}</span></td>
                <td>${safe(user.tenant_names || "—")}</td>
                <td>${safe(SystemAdmin.date(user.last_login))}</td>
                <td><span class="user-account-status ${safe(user.account_status)}">${safe(user.account_status)}</span></td>
                <td><button type="button" class="user-action-button" data-id="${Number(user.id)}" aria-label="View ${safe(name)}"><i data-lucide="eye"></i></button></td></tr>`;
        }).join("") : `<tr><td colspan="6">${users.length ? "No users match this filter." : "No registered users."}</td></tr>`;
        window.lucide?.createIcons();
    }

    [search, role, status].forEach((control) => control.addEventListener(control === search ? "input" : "change", render));
    body.addEventListener("click", (event) => {
        const id = event.target.closest(".user-action-button")?.dataset.id;
        const user = users.find((item) => String(item.id) === id);
        if (user) alert(`Name: ${[user.first_name, user.last_name].filter(Boolean).join(" ")}\nEmail: ${user.email}\nRole: ${labels[user.role] || user.role}\nResort: ${user.tenant_names || "—"}\nStatus: ${user.account_status}`);
    });
    const addButton = document.querySelector(".add-user-button");
    if (addButton) addButton.hidden = true;

    SystemAdmin.get("/api/admin/users").then((rows) => {
        users = rows;
        [rows.length, rows.filter((user) => user.account_status === "active").length,
            rows.filter((user) => user.account_status !== "active").length,
            rows.filter((user) => user.role === "system_admin" || user.role === "resort_admin").length]
            .forEach((count, index) => { counts[index].textContent = count; });
        render();
    }).catch((error) => { body.innerHTML = `<tr><td colspan="6">${SystemAdmin.escape(error.message)}</td></tr>`; });
});
