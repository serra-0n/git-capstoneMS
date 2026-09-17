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
    const viewLicenseButton = document.querySelector("#viewLicenseButton");
    const rerunOcrButton = document.querySelector("#rerunOcrButton");
    const ocrReviewSection = document.querySelector("#ocrReviewSection");
    const ocrLoading = document.querySelector("#ocrLoading");
    const ocrLoadingMessage = document.querySelector("#ocrLoadingMessage");
    const accessToken = sessionStorage.getItem("resorthub_access_token");
    let currentStatus = "pending";
    let currentApplication = null;
    let applicationsById = new Map();
    let ocrReviewSequence = 0;

    if (!accessToken) {
        window.location.href = "../auth/login.html";
        return;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(
            /[&<>\'"]/g,
            (character) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    "\'": "&#39;",
                    '"': "&quot;",
                })[character],
        );
    }

    function parseOcrAnalysis(value) {
        if (!value) return null;
        if (typeof value === "object") return value;

        try {
            return JSON.parse(value);
        } catch (error) {
            return null;
        }
    }

    async function readJsonResponse(response, fallbackMessage) {
        const responseText = await response.text();
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            try {
                return JSON.parse(responseText);
            } catch (error) {
                throw new Error("The server returned an invalid JSON response.");
            }
        }

        if (response.status === 404) {
            throw new Error(
                "The OCR endpoint is not available. Restart the backend with npm.cmd start, then try again.",
            );
        }

        throw new Error(fallbackMessage);
    }

    function setComparisonState(elementId, resultId, state, label) {
        const element = document.querySelector(elementId);
        const result = document.querySelector(resultId);

        element?.classList.remove("valid", "warning", "danger");
        if (state) element?.classList.add(state);
        if (result) result.textContent = label;
    }

    function wait(milliseconds) {
        return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    }

    function setOcrLoading(
        isLoading,
        message = "OCR is scanning and checking the submitted document...",
    ) {
        if (ocrLoading) {
            ocrLoading.hidden = !isLoading;
        }

        if (ocrLoadingMessage) {
            ocrLoadingMessage.textContent = message;
        }

        ocrReviewSection?.classList.toggle("ocr-is-loading", isLoading);
    }

    function updateLicenseStatus(tenant) {
        const licenseStatus = document.querySelector("#reviewLicenseStatus");

        if (!licenseStatus) return;

        licenseStatus.textContent = tenant.license_filename
            ? `OCR: ${tenant.license_ocr_status || "pending"} · Verification: ${tenant.license_verification_status || "pending"}`
            : "No uploaded license";
    }

    async function fetchApplicationById(tenantId) {
        const response = await fetch("/api/admin/tenants", {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const tenants = await response.json();

        if (!response.ok) {
            throw new Error(tenants.message || "Unable to refresh the OCR result.");
        }

        tenants.forEach((tenant) => applicationsById.set(String(tenant.id), tenant));

        return applicationsById.get(String(tenantId)) || null;
    }

    async function reviewTenantOcr(initialTenant) {
        const reviewSequence = ++ocrReviewSequence;
        let tenant = initialTenant;

        setOcrLoading(true);
        approveButton.disabled = true;
        rejectButton.disabled = true;
        rerunOcrButton.disabled = true;

        try {
            await wait(700);

            for (let attempt = 0; attempt < 20; attempt += 1) {
                if (reviewSequence !== ocrReviewSequence || !currentApplication) return;

                const ocrStatus = String(tenant.license_ocr_status || "pending").toLowerCase();

                if (!["pending", "processing"].includes(ocrStatus)) break;

                if (attempt > 0) {
                    await wait(1200);
                }

                const refreshedTenant = await fetchApplicationById(tenant.id);

                if (refreshedTenant) {
                    tenant = refreshedTenant;
                }
            }

            if (reviewSequence !== ocrReviewSequence || !currentApplication) return;

            updateLicenseStatus(tenant);
            renderOcrAnalysis(tenant);
        } catch (error) {
            console.error("OCR status refresh failed:", error);
            renderOcrAnalysis(tenant);
        } finally {
            if (reviewSequence === ocrReviewSequence && currentApplication) {
                const applicationPending = currentApplication.dataset.status === "pending";
                const ocrStillProcessing = ["pending", "processing"].includes(
                    String(tenant.license_ocr_status || "pending").toLowerCase(),
                );

                setOcrLoading(false);
                approveButton.disabled = !applicationPending || ocrStillProcessing;
                rejectButton.disabled = !applicationPending || ocrStillProcessing;
                rerunOcrButton.disabled = !tenant.license_filename || ocrStillProcessing;
            }
        }
    }

    function renderOcrAnalysis(tenant) {
        const analysis = parseOcrAnalysis(tenant.license_extracted_data);
        const summary = document.querySelector("#ocrSummary");
        const recommendation = document.querySelector("#ocrRecommendation");
        const score = document.querySelector("#ocrConsistencyScore");
        const confidence = document.querySelector("#ocrConfidence");
        const extractedText = document.querySelector("#ocrExtractedText");
        const submittedNumber = document.querySelector("#ocrSubmittedNumber");
        const detectedNumber = document.querySelector("#ocrDetectedNumber");

        const recommendationLabels = {
            strong_match: "Strong OCR Match",
            manual_review: "Manual Review Required",
            possible_mismatch: "Possible Mismatch",
            unreadable_document: "Unreadable Document",
        };

        if (!analysis) {
            summary.dataset.recommendation = "unavailable";
            recommendation.textContent =
                tenant.license_ocr_status === "failed"
                    ? "OCR Processing Failed"
                    : tenant.license_ocr_status === "processing"
                      ? "OCR Still Processing"
                      : "Not Analyzed";
            score.textContent = "—";
            confidence.textContent = "—";
            submittedNumber.textContent = tenant.business_registration_number || "—";
            detectedNumber.textContent = "—";
            extractedText.textContent =
                tenant.license_extracted_text || "No OCR text is available.";
            setComparisonState(
                "#registrationMatchItem",
                "#registrationMatchResult",
                "",
                "Not checked",
            );
            setComparisonState(
                "#businessNameMatchItem",
                "#businessNameMatchResult",
                "",
                "Not checked",
            );
            setComparisonState("#keywordMatchItem", "#keywordMatchResult", "", "Not checked");
            return;
        }

        const numberMatches = Boolean(analysis.comparisons?.registrationNumberMatch);
        const nameSimilarity = Number(analysis.comparisons?.businessNameSimilarity) || 0;
        const keywords = analysis.comparisons?.keywordsFound || [];

        summary.dataset.recommendation = analysis.recommendation;
        recommendation.textContent =
            recommendationLabels[analysis.recommendation] || "Manual Review Required";
        score.textContent = `${analysis.consistencyScore ?? 0}/100`;
        confidence.textContent = `${analysis.confidence ?? 0}%`;
        submittedNumber.textContent =
            analysis.submitted?.businessRegistrationNumber ||
            tenant.business_registration_number ||
            "—";
        detectedNumber.textContent =
            analysis.detected?.businessRegistrationNumber || "Not detected";
        extractedText.textContent = tenant.license_extracted_text || "No OCR text is available.";

        setComparisonState(
            "#registrationMatchItem",
            "#registrationMatchResult",
            numberMatches ? "valid" : "danger",
            numberMatches ? "Exact Match" : "No Match",
        );
        setComparisonState(
            "#businessNameMatchItem",
            "#businessNameMatchResult",
            nameSimilarity >= 0.75 ? "valid" : nameSimilarity >= 0.4 ? "warning" : "danger",
            `${Math.round(nameSimilarity * 100)}% Similar`,
        );
        setComparisonState(
            "#keywordMatchItem",
            "#keywordMatchResult",
            keywords.length >= 2 ? "valid" : keywords.length === 1 ? "warning" : "danger",
            keywords.length ? `${keywords.length} Found` : "None Found",
        );
    }

    function updateCounts() {
        const counts = { pending: 0, approved: 0, rejected: 0 };
        document.querySelectorAll(".application-item").forEach((application) => {
            const status = application.dataset.status;
            if (counts[status] !== undefined) counts[status]++;
        });
        ["pending", "approved", "rejected"].forEach((status) => {
            const count = document.querySelector(`#${status}Count`);
            if (count) count.textContent = counts[status];
            const tabCount = document.querySelector(
                `.approval-tab[data-status="${status}"] .tab-count`,
            );
            if (tabCount) tabCount.textContent = counts[status];
        });
        const totalCount = document.querySelector("#totalCount");
        if (totalCount) totalCount.textContent = counts.pending + counts.approved + counts.rejected;
    }

    function filterApplications() {
        const searchValue = searchInput?.value.trim().toLowerCase() || "";
        document.querySelectorAll(".application-item").forEach((application) => {
            const matchesStatus = application.dataset.status === currentStatus;
            const matchesSearch = application.textContent.toLowerCase().includes(searchValue);
            application.style.display = matchesStatus && matchesSearch ? "" : "none";
        });
    }

    function closeModal() {
        ocrReviewSequence += 1;
        setOcrLoading(false);
        reviewModal?.classList.remove("show");
        document.body.style.overflow = "";
        currentApplication = null;
    }

    function bindReviewButtons() {
        document.querySelectorAll(".view-button").forEach((button) => {
            button.addEventListener("click", () => {
                currentApplication = button.closest(".application-item");
                const tenant = applicationsById.get(currentApplication?.dataset.tenantId);

                if (!tenant) return;

                document.querySelector("#reviewResortName").textContent = tenant.resort_name || "—";
                document.querySelector("#reviewLocation").textContent = tenant.location || "—";
                document.querySelector("#reviewResortType").textContent = tenant.resort_type || "—";
                document.querySelector("#reviewOwnerName").textContent = tenant.owner_name || "—";
                document.querySelector("#reviewOwnerEmail").textContent = tenant.owner_email || "—";
                document.querySelector("#reviewBusinessName").textContent =
                    tenant.business_name || "—";
                document.querySelector("#reviewBusinessRegistrationNumber").textContent =
                    tenant.business_registration_number || "—";
                document.querySelector("#reviewBusinessAddress").textContent =
                    tenant.location || "—";
                document.querySelector("#reviewSubmittedDate").textContent = tenant.created_at
                    ? new Date(tenant.created_at).toLocaleDateString()
                    : "—";
                document.querySelector("#reviewLicenseName").textContent =
                    tenant.license_filename || "Resort License";
                document.querySelector("#reviewLicenseStatus").textContent = tenant.license_filename
                    ? `OCR: ${tenant.license_ocr_status || "pending"} · Verification: ${tenant.license_verification_status || "pending"}`
                    : "No uploaded license";
                viewLicenseButton.disabled = !tenant.license_filename;
                rerunOcrButton.disabled = !tenant.license_filename;
                reviewModal?.classList.add("show");
                document.body.style.overflow = "hidden";
                reviewTenantOcr(tenant);
            });
        });
    }

    async function loadApplications() {
        try {
            const response = await fetch("/api/admin/tenants", {
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const tenants = await response.json();
            if (!response.ok) throw new Error(tenants.message || "Unable to load applications.");
            applicationsById = new Map(tenants.map((tenant) => [String(tenant.id), tenant]));
            applicationList.innerHTML = tenants
                .map(
                    (tenant) => `
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
            `,
                )
                .join("");
            if (typeof lucide !== "undefined") lucide.createIcons();
            bindReviewButtons();
            updateCounts();
            filterApplications();
        } catch (error) {
            applicationList.innerHTML = `<p class="message error">${escapeHtml(error.message)}</p>`;
        }
    }

    async function changeStatus(status, notes) {
        const response = await fetch(
            `/api/admin/tenants/${currentApplication.dataset.tenantId}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ status, reviewNotes: notes }),
            },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to update application.");
    }

    tabs.forEach((tab) =>
        tab.addEventListener("click", () => {
            tabs.forEach((item) => item.classList.remove("active"));
            tab.classList.add("active");
            currentStatus = tab.dataset.status;
            filterApplications();
        }),
    );
    searchInput?.addEventListener("input", filterApplications);
    closeReviewModal?.addEventListener("click", closeModal);
    reviewModalOverlay?.addEventListener("click", closeModal);

    viewLicenseButton?.addEventListener("click", async () => {
        if (!currentApplication) return;

        const previewWindow = window.open("", "_blank");

        if (!previewWindow) {
            alert("Allow pop-ups to preview the uploaded license.");
            return;
        }

        try {
            const response = await fetch(
                `/api/admin/tenants/${currentApplication.dataset.tenantId}/license`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            );

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || "Unable to open the uploaded license.");
            }

            const licenseBlob = await response.blob();
            const licenseUrl = URL.createObjectURL(licenseBlob);
            previewWindow.location.href = licenseUrl;
            setTimeout(() => URL.revokeObjectURL(licenseUrl), 60000);
        } catch (error) {
            previewWindow.close();
            alert(error.message);
        }
    });

    rerunOcrButton?.addEventListener("click", async () => {
        if (!currentApplication) return;

        const tenantId = currentApplication.dataset.tenantId;
        const tenant = applicationsById.get(tenantId);

        ocrReviewSequence += 1;
        rerunOcrButton.disabled = true;
        approveButton.disabled = true;
        rejectButton.disabled = true;
        setOcrLoading(true, "OCR is scanning the license again...");

        try {
            const response = await fetch(`/api/admin/tenants/${tenantId}/license/reanalyze`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const result = await readJsonResponse(response, "OCR analysis failed.");

            if (!response.ok) {
                throw new Error(result.message || "OCR analysis failed.");
            }

            tenant.license_ocr_status = "completed";
            tenant.license_extracted_text = result.extractedText;
            tenant.license_extracted_data = result.analysis;
            await wait(500);
            renderOcrAnalysis(tenant);
            document.querySelector("#reviewLicenseStatus").textContent =
                `OCR: completed · Verification: ${tenant.license_verification_status || "pending"}`;
        } catch (error) {
            alert(error.message);
        } finally {
            const applicationPending = currentApplication?.dataset.status === "pending";

            setOcrLoading(false);
            approveButton.disabled = !applicationPending;
            rejectButton.disabled = !applicationPending;
            rerunOcrButton.disabled = false;
            rerunOcrButton.innerHTML = '<i data-lucide="refresh-cw"></i> Run OCR Again';
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    });

    approveButton?.addEventListener("click", async () => {
        if (!currentApplication || !confirm("Approve this resort application?")) return;
        try {
            await changeStatus("approved", "");
            closeModal();
            await loadApplications();
        } catch (error) {
            alert(error.message);
        }
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
        } catch (error) {
            alert(error.message);
        }
    });

    loadApplications();
});
