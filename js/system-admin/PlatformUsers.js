document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.querySelector(".platform-user-search input");
    const roleFilter = document.querySelector(".user-role-filter");
    const statusFilter = document.querySelector(".user-status-filter");

    const userRows = document.querySelectorAll(".platform-user-table tbody tr");
    const actionButtons = document.querySelectorAll(".user-action-button");
    const addUserButton = document.querySelector(".add-user-button");


    function filterUsers(){
        const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const selectedRole = roleFilter ? roleFilter.value.toLowerCase() : "";
        const selectedStatus = statusFilter ? statusFilter.value.toLowerCase() : "";

        userRows.forEach(function (row) {
            const userText = row.textContent.toLowerCase();

            const roleElement = row.querySelector(".user-role");
            const userRole = roleElement ? roleElement.className.toLowerCase() : "";
            const statusElement = row.querySelector(".user-account-status");
            const userStatus = statusElement ? statusElement.className.toLowerCase() : "";

            const matchesSearch = userText.includes(searchValue);

            let matchesRole = true;

            if (selectedRole !== "") {
                if (selectedRole === "system-admin") {
                    matchesRole = userRole.includes ("system-admin");
                } else if (selectedRole === "resort-admin") {
                    matchesRole = userRole.includes("resort-admin");
                } else if (selectedRole === "client") {
                    matchesRole = userRole.includes("client");
                }
            }

            let matchesStatus = true;

            if (selectedStatus !== "") {
                if (selectedStatus === "active") {
                    matchesStatus = userStatus.includes("active");
                } else if (selectedStatus === "inactive") {
                    matchesStatus = userStatus.includes("inactive");
                }
            }

            if (
                matchesSearch &&
                matchesRole &&
                matchesStatus) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterUsers);
    }

    if (roleFilter) {
        roleFilter.addEventListener("change", filterUsers);
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", filterUsers);
    }

    actionButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const row = button.closest("tr");

            if (!row) {
                return;
            }

            const userNameElement = row.querySelector(".platform-user-info strong");
            const emailElement = row.querySelector(".platform-user-info span");
            const roleElement = row.querySelector(".user-role");
            const statusElement = row.querySelector(".user-account-status");

            const userName = userNameElement ? userNameElement.textContent.trim() : "Unknown User";
            const email = emailElement ? emailElement.textContent.trim() : "Unknown Role";
            const role = roleElement ? roleElement.textContent.trim() : "Unknown Role";
            const status = statusElement ? statusElement.textContent.trim() : "Unknown Status";
            
            alert(
                "User Information\n\n" +
                "Name: " + userName + "\n" +
                "Email: " + email + "\n" +
                "Role: " + role + "\n" +
                "Status " + status
            );
        });
    });

    if (addUserButton) {
        addUserButton.addEventListener("click", function(){
            alert("Add User functionally will be connected to the backend later.");
        });
    }

    filterUsers();
});