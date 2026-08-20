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
            const tenantItem = button.closest(".tenant-item");

            if (!tenantItem) {
                return;
            }

            const tenantName = tenantItem.dataset.name;
            const location = tenantItem.dataset.location;
            const owner = tenantItem.dataset.owner;
            const tenantId = tenantItem.dataset.tenantId;
            const status = tenantItem.dataset.status;
            const resortType = tenantItem.dataset.type;

            if (modalTenantName) {
                modalTenantName.textContent = tenantName;
            }

            if (modalResortName) {
                modalResortName.textContent = tenantName;
            }

            if (modalLocation) {
                modalLocation.textContent = location;
            }

            const detailSections = document.querySelectorAll(".tenant-detail-section");

            if (detailSections.length >= 1) {
                const fields = detailSections[0].querySelectorAll(".tenant-detail-field strong");

                if (fields.length >= 3) {
                    fields[2].textContent = resortType;
                }

                if (fields.length >= 4) {
                    fields[3].textContent = tenantId;
                }
            }

            if (detailSections.length >= 2) {
                const fields = detailSections[1].querySelectorAll(".tenant-detail-field strong");

                if (fields.length >= 1) {
                    fields[0].textContent = owner;
                }

                if (fields.length >= 4) {
                    fields[3].textContent = status;

                    fields[3].classList.remove("active", "suspended", "pending");
                    fields[3].classList.add(status.toLowerCase());
                }   
            }
            openTenantModal();
        });
    });

    if (closeTenantModal) {
        closeTenantModal.addEventListener("click", function() {
            closeModal();
        });
    }

    if (closeTenantDetails) {
        closeTenantDetails.addEventListener("click", function() {
            closeModal();
        });
    }

    if (tenantModalOverlay) {
        tenantModalOverlay.addEventListener("click", function() {
            closeModal();
        });
    }


    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            closeModal();
        }
    });

    if (tenantModal) {
    tenantModal.classList.remove("show");
    }
});