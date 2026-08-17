document.addEventListener("DOMContentLoaded", function(){
    const tenantModal = document.getElementById("tenantModal");
    const closeTenantModal = document.getElementById("closeTenantModal");
    const closeTenantDetails = document.getElementById("closeTenantDetails");
    const tenantModalOverlay = document.querySelector(".tenant-modal-overlay");

    const viewButtons = document.querySelectorAll(".tenant-view-button");

    const modalTenantName = document.getElementById("modaltenantName");
    const modalResortName = document.getElementById("modalResortName");
    const modalLocation = document.getElementById("modalLocation");
    
    function openTenantModal(){
        tenantModal.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    function closeModal(){
        tenantModal.classList.remove("show");
        document.body.style.overflow = "";
    }

    viewButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            openTenantModal();
        });
    });

    closeTenantModal.addEventListener("click", function() {
        closeModal();
    });

    closeTenantDetails.addEventListener("click", function() {
        closeModal();
    });

    tenantModalOverlay.addEventListener("click", function() {
        closeModal();
    });

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            closeModal();
        }
    });

    tenantModal.classList.remove("show");
});