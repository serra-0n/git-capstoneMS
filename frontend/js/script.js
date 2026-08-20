function openOnboardingModal(){
    const modal = document.getElementById("onboardingModal");

    if (modal) {
        modal.classList.add("active");
        lucide.createIcons();
    }
}

function closeOnboardingModal(){
    const modal = document.getElementById("onboardingModal");

    if (modal) {
        modal.classList.remove("active");
    }
}

function approveRequest(){
    alert("Billiard Resort has been approved.");
    closeOnboardingModal();
}

function rejectRequest() {
    alert("Billiard Resort has been rejected.");
    closeOnboardingModal();
}

/* search*/
document.addEventListener("DOMContentLoaded", function(){
    const searchInput = document.getElementById("resortSearch");
    
    if (!searchInput){
        return;
    }

    searchInput.addEventListener("input", function() {
        const searchValue = this.value.toLowerCase().trim();
        const resortRows = document.querySelectorAll(
            ".all-resorts-table .table-row"
        );

        resortRows.forEach(function (row) {
            const resortName = row
                .querySelector("span")
                .textContent
                .toLowerCase();

            if (resortName.includes(searchValue)){
                row.style.display = "grid";
            } else {
                row.style.display = "none";
            }
        });
    });

});

// details resort modal

function openResortDetails(resortName, adminName, date, status){
    
    document.getElementById("detailsResortName").textContent = resortName;
    document.getElementById("detailsAdminName").textContent = adminName;
    document.getElementById("detailsDate").textContent = date;

    const statusElement = document.getElementById("detailsStatus");

    statusElement.textContent = status;
    statusElement.className = "";

    if (status === "Approved") {
        statusElement.classList.add("approved");
    }

    if (status === "Rejected") {
        statusElement.classList.add("rejected");
    }

    document.getElementById("resortDetailsModal").classList.add("active");

    lucide.createIcons();
}

function closeResortDetails() {
    document.getElementById("resortDetailsModal").classList.remove("active");
}