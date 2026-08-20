document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !=="undefined"){
        lucide.createIcons();
    }

    const searchInput = document.querySelector(".approval-search input");
    const tabs = document.querySelectorAll(".approval-tab");
    const applications = document.querySelectorAll(".application-item");
    const reviewModal = document.querySelector("#reviewModal");
    const closeReviewModal = document.querySelector("#closeReviewModal");
    const reviewModalOverlay = document.querySelector(".review-modal-overlay");
    const approveButton = document.querySelector("#approveApplication");
    const rejectButton = document.querySelector("#rejectApplication");
    const reviewNotes = document.querySelector("#reviewNotes");

    const pendingCount = document.querySelector("#pendingCount");
    const approvedCount = document.querySelector("#approvedCount");
    const rejectedCount = document.querySelector("#rejectedCount");
    const totalCount = document.querySelector("#totalCount");

    let currentStatus = "pending";
    let currentApplication = null;

    function filterApplications(){
        const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : "";

        applications.forEach(application => {
            const statusElement = application.querySelector(".approval-status");

            if(!statusElement){
                return;
            }

            const status = statusElement.textContent.trim().toLowerCase();
            const applicationText = application.textContent.toLowerCase();
            const statusMatches = status === currentStatus;
            const searchMatches = applicationText.includes(searchValue);

            if(statusMatches && searchMatches) {
                application.style.display = "";
            } else {
                application.style.display = "none";
            }
        });
    }
    
    function updateCounts () {
        let pending = 0;
        let approved = 0;
        let rejected = 0;

        applications.forEach(application => {
            const statusElement = application.querySelector(".approval-status");

            if (!statusElement) {
                return;
            }

            const status = statusElement.textContent
                    .trim()
                    .toLowerCase();

            if (status === "pending") {
                pending++;
            } else if (status === "approved") {
                approved++;
            } else if (status === "rejected") {
                rejected++;
            }
        });

        const total = pending + approved + rejected;

            if (pendingCount) {
                pendingCount.textContent = pending;
            }

            if (approvedCount) {
                approvedCount.textContent = approved;
            }

            if (rejectedCount) {
                rejectedCount.textContent = rejected;
            }

            if (totalCount) {
                totalCount.textContent = total;
            }

            document.querySelectorAll(".approval-tab").forEach(tab => {
                const status = tab.dataset.status;
                const count = tab.querySelector(".tab-count");

                if (!count){
                    return;
                }

                if (status === "pending") {
                    count.textContent = pending;
                }

                if (status === "approved") {
                    count.textContent = approved;
                }

                if (status === "rejected") {
                    count.textContent = rejected;
                }
            });
    }

    
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(item => {
                item.classList.remove("active");
            });

            tab.classList.add("active");

            const selectedTab = tab.textContent
                .trim()
                .toLowerCase();


                if (selectedTab.includes("pending")) {
                    currentStatus = "pending";
                } else if(selectedTab.includes("approved")) {
                    currentStatus = "approved";
                } else if(selectedTab.includes("rejected")) {
                    currentStatus = "rejected";
                }

                filterApplications();
            });
        });

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            filterApplications();
        });
    }

    const reviewButtons = document.querySelectorAll(".view-button");

    reviewButtons.forEach(button => {
        button.addEventListener("click", () => {
            const application = button.closest(".application-item");

            if (!application){
                return;
            }

            currentApplication = application;

            const resort = application.querySelector(".application-resort strong");

            if (!resort) {
                return;
            }

            const reviewResortName = document.querySelector("#reviewResortName");

            if (reviewResortName) {
                reviewResortName.textContent = resort.textContent;
            }

            if (reviewModal) {
                reviewModal.classList.add("show");
                document.body.style.overflow = "hidden";
            }
        });
    });

    function closeReviewModalFunction(){
        if (reviewModal) {
            reviewModal.classList.remove("show");
            document.body.style.overflow = "";
        }
    }

    if (closeReviewModal){ 
        closeReviewModal.addEventListener(
            "click", 
            closeReviewModalFunction
        );
    }

    if (reviewModalOverlay) {
        reviewModalOverlay.addEventListener(
            "click", 
            closeReviewModalFunction
        );
    }

    if (approveButton) {
        approveButton.addEventListener("click", () => {
            if (!currentApplication) {
                return;
            }

            const resort = currentApplication.querySelector(".application-resort strong");
            const resortName = resort ? resort.textContent : "this resort";
            const confirmed = confirm("Are you sure you want to approve " + resortName + "?");

            if (!confirmed) {
                return;
            }

            const status = currentApplication.querySelector(".approval-status");

            if(status) {
                status.textContent = "Approved";
                status.classList.remove("pending");
                status.classList.add("approved");
            }

            closeReviewModalFunction();
            currentApplication = null;
            updateCounts();
            filterApplications();
        });
    }

    if (rejectButton) {
        rejectButton.addEventListener("click", () => {

            if (!currentApplication) {
                return;
            }

            const resort = currentApplication.querySelector(".application-resort strong");
            const resortName = resort ? resort.textContent : "this report";
            const notes = reviewNotes ? reviewNotes.value.trim() : "";

            if (!notes) {
                alert("Please provide a review note before rejecting this application.");

                if (reviewNotes) {
                    reviewNotes.focus();
                }

                return;
            }

            const confirmed = confirm("Are you sure you want to reject" + resortName + "?");

            if (!confirmed) {
                return;
            }

            const status = currentApplication.querySelector(".approval-status");

            if (status) {
                status.textContent = "Rejected";
                status.classList.remove("pending");
                status.classList.add("rejected");
            }

            closeReviewModalFunction();
            currentApplication = null;

            if (reviewNotes) {
                reviewNotes.value = "";
            }

            updateCounts();
            filterApplications();
        });
    }
});