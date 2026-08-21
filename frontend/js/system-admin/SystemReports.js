document.addEventListener("DOMContentLoaded", function () {
    const reportModal = document.getElementById("reportModal");
    const reportModalOverlay = document.getElementById("reportModalOverlay");

    const closeReportModal = document.getElementById("closeReportModal");
    const closeReportDetails = document.getElementById("closeReportDetails");

    const generateReportButton = document.getElementById("generateReportButton");

    const reportTypeSelect = document.getElementById("reportType");
    const reportDateFrom = document.getElementById("reportDateFrom");
    const reportDateTo = document.getElementById("reportDateTo");

    const modalReportTitle = document.getElementById("modalReportTitle");
    const modalReportDescription = document.getElementById("modalReportDescription");
    const modalReportName = document.getElementById("modalReportName");
    const modalReportType = document.getElementById("modalReportType");
    const modalReportDate = document.getElementById("modalReportDate");

    const modalReportDownload = document.getElementById("modalReportDownload");

    const reportItems = document.querySelectorAll(".report-item");
    const reportList = document.querySelector(".report-list");


    const reportData = {
        tenant: {
            title: "Tenant Management Report",
            description: "Summary of registered tenants.",
            type: "Tenant Report",
            date: "June 1, 2025",
            total: "12",
            active: "9",
            suspended: "2",
            pending: "1"
        },

        user: {
            title: "Platform User Report",
            description: "Overview of platform users, roles, and account statuses.",
            type: "User Report",
            date: "June 1, 2025",
            total: "248",
            active: "220",
            suspended: "18",
            pending: "10"
        },

        activity: {
            title: "Activity Report",
            description: "Summary of user and administrator activities.",
            type: "Activity Report",
            date: "May 31, 2025",
            total: "1,248",
            active: "1,100",
            suspended: "0",
            pending: "148"
        },

        system: {
            title: "System Summary Report",
            description: "Overall summary of the ResortHub platform.",
            type: "System Summary Report",
            date: "May 31, 2025",
            total: "12",
            active: "9",
            suspended: "2",
            pending: "1"
        }
    };

    let currentReportType = "tenant";


    function openReportModal(reportType) {
        const report = reportData[reportType];

        if (!report) {
            return;
        }

        currentReportType = reportType;
        modalReportTitle.textContent = report.title;
        modalReportDescription.textContent = report.description;
        modalReportName.textContent = report.title;
        modalReportType.textContent = report.type;
        modalReportDate.textContent = report.date;

        
        const summaryItems = document.querySelectorAll(".report-summary-item strong");

        if (summaryItems.length >= 4) {
            summaryItems[0].textContent = report.total;
            summaryItems[1].textContent = report.active;
            summaryItems[2].textContent = report.suspended;
            summaryItems[3].textContent = report.pending;
        }

        reportModal.classList.add("show");
        document.body.style.overflow = "hidden";

        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }

    function closeModal() {
        reportModal.classList.remove("show");
        document.body.style.overflow = "";
    }

    function attachViewButtons () {
        const viewButtons = document.querySelectorAll(".report-view-button");

        viewButtons.forEach(function (button) {
            button.addEventListener("click", function() {
                const reportType = button.dataset.report;
                openReportModal(reportType);
            });
        });
    }

    attachViewButtons();

    if (closeReportModal) {
        closeReportModal.addEventListener("click", closeModal);
    }

    if (closeReportDetails) {
        closeReportDetails.addEventListener("click", closeModal);
    }

    if (reportModalOverlay) {
        reportModalOverlay.addEventListener("click", closeModal);
    }

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            if (reportModal.classList.contains("show")) {
                closeModal();
            }
        }
    });

    if (generateReportButton) {
        generateReportButton.addEventListener("click", function() {
            const selectedType = reportTypeSelect.value;
            const dateFrom = reportDateFrom.value;
            const dateTo = reportDateTo.value;

            if (!selectedType) {
                alert("Please select a report type.");
                return;
            }

            if (!dateFrom || !dateTo) {
                alert("Please select bote Date From and Date To.");
                return;
            }

            /* Check date order */

            if (dateFrom > dateTo) {
                alert("Date From cannot be later than Date To.");
                return;
            }

            const report = reportData[selectedType];

            if (!report) {
                alert("Invalid report type.");
                return;
            }

            const generatedDate = new Date() 
                .toLocaleDateString(
                    "en-US",
                {
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                }
            );

            const newReport = document.createElement("article");
            newReport.className = "report-item";
            newReport.dataset.reportType = selectedType;

            newReport.innerHTML = `
                <div class="report-item-icon ${selectedType}">
                    <i data-lucide="${getReportIcon(selectedType)}"></i>
                </div>

                <div class="report-item-info">
                    <strong>${report.title}</strong>
                    <span>${report.description}</span>
                    <small>Generated ${generatedDate}</small>
                </div>

                <div class="report-item-actions">
                    <button
                        type="button"
                        class="report-view-button"
                        data-report="${selectedType}">

                        <i data-lucide="eye"></i>
                        View
                    </button>

                    <button
                        type="button"
                        class="report-download-button"
                        data-report="${selectedType}">

                        <i data-lucide="download"></i>
                        Download
                    </button>
                </div>
            `;

            reportList.prepend(newReport);

            const newViewButton = newReport.querySelector(".report-view-button");

            newViewButton.addEventListener("click", function() {
                openReportModal(selectedType);
            });

            const newDownloadButton = newReport.querySelector(".report-download-button");

            newDownloadButton.addEventListener("click", function() {
                downloadReport(selectedType);
            });

            if (typeof lucide !== "undefined") {
                lucide.createIcons();
            }

            alert("Report generated successfully.");
        });
    }

    function getReportIcon(reportType) {
        switch (reportType) {
            case "tenant": return "building-2";
            case "user": return "users";
            case "activity": return "activity";
            case "system": return "file-bar-chart";
            default: return "file-text";
        }
    }

    function downloadReport(reportType) {
        const report = reportData[reportType];

        if (!report) {
            return;
        }

        const reportContent = `
            ResortHub
            System Reports

            Report Name: ${report.title}
            Report Type: ${report.type}
            Generated By: System Admin
            Generated Date: ${report.date}
            
            Report Summary

            Total Records: ${report.total}
            Active: ${report.active}
            Suspended: ${report.suspended}
            Pending: ${report.pending}

            Description: ${report.description}
        `;

        const blob = new Blob(
            [reportContent], 
            {
                type: "text/plain"
            }
        )

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download =
            report.title
                .replace(/\s+/g, "_")
                .toLowerCase() +
            ".txt";
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    const downloadButtons = document.querySelectorAll(".report-download-button");

    downloadButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const reportType = button.dataset.report;

            downloadReport(reportType);
        });
    });

    if (modalReportDownload) {
        modalReportDownload.addEventListener("click", function() {
            downloadReport(currentReportType);
        });
    }

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
});