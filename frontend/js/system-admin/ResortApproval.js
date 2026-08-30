document.addEventListener("DOMContentLoaded", () => {
    const applicationList = document.querySelector("#applicationList");
    const searchInput = document.querySelector(".approval-search input");
    const tabs = document.querySelectorAll(".approval-tab");
    const reviewModal = document.querySelector("#reviewModal");
    const reviewModalOverlay = document.querySelector(".review-modal-overlay");
    const closeReviewModal = document.querySelector("#closeReviewModal");
    const approveButton = document.querySelector("#approveApplication");
    const rejectButton = document.querySelector("#rejectApplication");
    const reviewNotes = document.querySelector("#reviewNotes");
    let currentStatus = "pending";
    let currentApplication = null;

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>\'"]/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;",
            "\'": "&#39;", '"': "&quot;"
        }[character]));
    }

    function updateCounts() {
        const counts = { pending: 0, approved: 0, rejected: 0 };
        document.querySelectorAll(".application-item").forEach(application => {
            const status = application.dataset.status;
            if (counts[status] !== undefined) counts[status]++;
        });
        ["pending", "approved", "rejected"].forEach(status => {
            const count = document.querySelector(`#${status}Count`);
            if (count) count.textContent = counts[status];
            const tabCount = document.querySelector(`.approval-tab[data-status="${status}"] .tab-count`);
            if (tabCount) tabCount.textContent = counts[status];
        });
        const totalCount = document.querySelector("#totalCount");
        if (totalCount) totalCount.textContent = counts.pending + counts.approved + counts.rejected;
    }

    function filterApplications() {
        const searchValue = searchInput?.value.trim().toLowerCase() || "";
        document.querySelectorAll(".application-item").forEach(application => {
            const matchesStatus = application.dataset.status === currentStatus;
            const matchesSearch = application.textContent.toLowerCase().includes(searchValue);
            application.style.display = matchesStatus && matchesSearch ? "" : "none";
        });
    }

    function closeModal() {
        reviewModal?.classList.remove("show");
        document.body.style.overflow = "";
        currentApplication = null;
    }

    function bindReviewButtons() {
        document.querySelectorAll(".view-button").forEach(button => {
            button.addEventListener("click", () => {
                currentApplication = button.closest(".application-item");
                document.querySelector("#reviewResortName").textContent = currentApplication?.querySelector(".application-resort strong")?.textContent || "";
                document.querySelector("#reviewLocation").textContent = currentApplication?.querySelector(".application-resort span")?.textContent || "";
                reviewModal?.classList.add("show");
                document.body.style.overflow = "hidden";
            });
        });
    }

    async function loadApplications() {
        try {
            const response = await fetch("/api/admin/tenants");
            const tenants = await response.json();
            if (!response.ok) throw new Error(tenants.message || "Unable to load applications.");
            applicationList.innerHTML = tenants.map(tenant => `
                <article class="application-item" data-tenant-id="${tenant.id}" data-status="${tenant.approval_status}">
                    <div class="application-resort">
                        <div class="resort-avatar"><i data-lucide="building-2"></i></div>
                        <div><strong>${escapeHtml(tenant.resort_name)}</strong><span>${escapeHtml(tenant.location)}</span></div>
                    </div>
                    <div class="application-owner"><span class="application-label">Owner</span><strong>${escapeHtml(tenant.owner_name)}</strong></div>
                    <div class="application-date"><span class="application-label">Submitted</span><strong>${new Date(tenant.created_at).toLocaleDateString()}</strong></div>
                    <div><span class="approval-status ${tenant.approval_status}">${escapeHtml(tenant.approval_status)}</span></div>
                    <div><button type="button" class="view-button"><i data-lucide="eye"></i> Review</button></div>
                </article>
            `).join("");
            if (typeof lucide !== "undefined") lucide.createIcons();
            bindReviewButtons();
            updateCounts();
            filterApplications();
        } catch (error) {
            applicationList.innerHTML = `<p class="message error">${escapeHtml(error.message)}</p>`;
        }
    }

    async function changeStatus(status, notes) {
        const response = await fetch(`/api/admin/tenants/${currentApplication.dataset.tenantId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, reviewNotes: notes })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to update application.");
    }

    tabs.forEach(tab => tab.addEventListener("click", () => {
        tabs.forEach(item => item.classList.remove("active"));
        tab.classList.add("active");
        currentStatus = tab.dataset.status;
        filterApplications();
    }));
    searchInput?.addEventListener("input", filterApplications);
    closeReviewModal?.addEventListener("click", closeModal);
    reviewModalOverlay?.addEventListener("click", closeModal);

    approveButton?.addEventListener("click", async () => {
        if (!currentApplication || !confirm("Approve this resort application?")) return;
        try {
            await changeStatus("approved", "");
            closeModal();
            await loadApplications();
        } catch (error) { alert(error.message); }
    });

    rejectButton?.addEventListener("click", async () => {
        const notes = reviewNotes?.value.trim() || "";
        if (!currentApplication) return;
        if (!notes) {
            alert("Please provide a review note before rejecting this application.");
            reviewNotes?.focus();
            return;
        }
        if (!confirm("Reject this resort application?")) return;
        try {
            await changeStatus("rejected", notes);
            if (reviewNotes) reviewNotes.value = "";
            closeModal();
            await loadApplications();
        } catch (error) { alert(error.message); }
    });

    loadApplications();
});
