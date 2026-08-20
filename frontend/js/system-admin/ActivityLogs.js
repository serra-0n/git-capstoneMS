document.addEventListener("DOMContentLoaded", function() {
    const activitySearch = document.getElementById("activitySearch");
    const activityTypeFilter = document.getElementById("activityTypeFilter");
    const activityActionFilter = document.getElementById("activityActionFilter");
    const clearActivityFilter = document.getElementById("clearActivityFilter");

    const activityTableBody = document.getElementById("activityTableBody");
    const activityRows = activityTableBody ? activityTableBody.querySelectorAll("tr") : [];

    const refreshActivityButton = document.getElementById("refreshActivityButton");
    const totalActivityCount = document.getElementById("totalActivityCount");
    const todayActivityCount = document.getElementById("todayActivityCount");
    const userActivityCount = document.getElementById("userActivityCount");
    const adminActivityCount = document.getElementById("adminActivityCount");

    const activityModal = document.getElementById("activityModal");
    const activityModalOverlay = document.getElementById("activityModalOverlay");
    const closeActivityModal = document.getElementById("closeActivityModal");
    const closeActivityDetails = document.getElementById("closeActivityDetails");
    const modalActivityTitle = document.getElementById("modalActivityTitle");

    const modalActivityDescription = document.getElementById("modalActivityDescription");
    const modalActivityDate = document.getElementById("modalActivityDate");
    const modalActivityType = document.getElementById("modalActivityType");
    const modalActivityUser = document.getElementById("modalActivityUser");
    const modalActivityRole = document.getElementById("modalActivityRole");
    const modalActivityTenant = document.getElementById("modalActivityTenant");
    const modalActivityAction = document.getElementById("modalActivityAction");
    const modalActivityId = document.getElementById("modalActivityId");
    const modalActivityIp = document.getElementById("modalActivityIp");
    const modalActivityDevice = document.getElementById("modalActivityDevice");


    function filterActivities () {
        const searchValue = activitySearch ? activitySearch.value.toLowerCase().trim() : "";
        const selectedType = activityTypeFilter ? activityTypeFilter.value.toLowerCase().trim() : "";
        const selectedAction = activityActionFilter ? activityActionFilter.value.toLowerCase().trim() : "";

        activityRows.forEach(function (row) {
            const rowText = row.textContent.toLocaleLowerCase().trim();
            const rowType = (row.dataset.action || "").toLowerCase().trim();
            const rowAction = (row.dataset.action || "").toLowerCase().trim();


            const matchesSearch = searchValue === "" || rowText.includes(searchValue);
            const matchesType = selectedType === "" || rowtype === selectedType;
            const matchesAction = selectedAction === "" || rowAction === selectedAction;

            if (
                matchesSearch &&
                matchesType &&
                matchesAction) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    }

    if (activitySearch) {
        activitySearch.addEventListener("input", filterActivities);
    }

    if (activityTypeFilter) {
        activityTypeFilter.addEventListener("change", filterActivities);
    }

    if (activityActionFilter) {
        activityActionFilter.addEventListener("change", filterActivities);
    }

    if (clearActivityFilter) {
        clearActivityFilter.addEventListener("click", function() {
            if (activitySearch) {
                activitySearch.value = "";
            }

            if (activityTypeFilter) {
                activityTypeFilter.value = "";
            }

            if (activityActionFilter) {
                activityActionFilter.value = "";
            }

            filterActivities();
        });
    }

    function updateActivityCounts() {
        const totalRows = activityRows.length;

        let userCount = 0;
        let adminCount = 0;

        activityRows.forEach(function (row) {
            const type = (row.dataset.type || "").toLowerCase().trim();

            if (type === "user") {
                userCount++;
            }

            if (type === "admin") {
                adminCount++;
            }
        });

        if (totalActivityCount) {
            totalActivityCount.textContent = totalRows;
        }

        if (userActivityCount) {
            userActivityCount.textContent = userCount;
        }

        if (adminActivityCount) {
            adminActivityCount.textContent = adminCount;
        }
    }

    if (refreshActivityButton) {
        refreshActivityButton.addEventListener("click", function() {
            const icon = refreshActivityButton.querySelector("svg");

            if (icon) {
                icon.style.transform = "rotate(360deg)";
                icon.style.transition = "transform 0.5s ease";
            }

            filterActivities();

            setTimeout(function () {
                if (icon) {
                    icon.style.transform = "rotate(0deg)";
                }
            }, 500);
        });
    }

    function getActivityInformation(row) {
        const dateElement = row.querySelector(".activity-date");
        const userElement = row.querySelector(".activity-user");
        const descriptionElement = row.querySelector("activity-description");
        const tenantElement = row.querySelector("td:nth-child(4)");
        const typeElement = row.querySelector(".activity-type");


        const date = dateElement?.querySelector("strong")?.textContent.trim() || "Unknown User";
        const time = dateElement?.querySelector("span")?.textContent.trim() || "Unknown Time";
        const userName = userElement?.querySelector("strong")?.textContent.trim() || "Unknown User";
        const role = userElement?.querySelector("span")?.textContent.trim() || "Unknown Role";
        const activity = descriptionElement?.querySelector("strong")?.textContent.trim() || "Unknown Activity";
        const description = descriptionElement?.querySelector("span")?.textContent.trim() || "No description available";
        
        const tenant = tenantElement?.textContent.trim() || "No Tenant";
        const type = typeElement?.textContent.trim() || "Unknown";

        const action = 
            row.dataset.action 
                ? row.dataset.action 
                    .replace(/-/g, " ") 
                    .replace(/\b\w/g, function (letter) {

                        return letter.toUpperCase();
        }) : "Unknown";

        return {
            date: date,
            time: time,
            user: userName,
            role: role,
            activity: activity,
            description: description,
            tenant: tenant,
            type: type,
            action: action
        };
    }

    /* ==========================================
       OPEN ACTIVITY MODAL
    ========================================== */

    function openActivityModal(row) {
        if (!activityModal || !row) {
            return;
        }

        const activity = getActivityInformation(row);

        if (modalActivityTitle) {
            modalActivityTitle.textContent = activity.activity;
        }
    }
});