document.addEventListener("DOMContentLoaded", function () {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    const dashboardData = {
        totalTenants: 32,
        totalUsers: 248,
        activeTenants: 9,
        pendingApprovals: 8
    };

    const totalTenantElement = document.getElementById("totalTenantCount");
    const totalUserElement = document.getElementById("totalUserCount");
    const activeTenantElement = document.getElementById("activeTenantCount");
    const pendingApprovalElement = document.getElementById("pendingApprovalCount");

    if (totalTenantElement) {
        totalTenantElement.textContent = dashboardData.totalTenants;
    }

    if (totalUserElement) {
        totalUserElement.textContent = dashboardData.totalUsers;
    }

    if (activeTenantElement) {
        activeTenantElement.textContent = dashboardData.activeTenants;
    }

    if (pendingApprovalElement) {
        pendingApprovalElement.textContent = dashboardData.pendingApprovals;
    }

    const reportItems = document.querySelectorAll(".dashboard-report-item");

    reportItems.forEach(function (report) {
        report.addEventListener("click", function() {
            const reportType = report.getAttribute("data-report");

            if (reportType) {
                console.log("Selected report:", reportType);
            }
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

    console.log("System Admin Dashboard loaded");
});