document.addEventListener("DOMContentLoaded", function () {

    loadComponent(
        "sidebar-container",
        "../../components/resort-admin/resortAdSidebar.html"
    );

    loadComponent(
        "nav-container",
        "../../components/resort-admin/resortAdNav.html"
    );

});


function loadComponent(containerId, filePath) {

    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Container not found:", containerId);
        return;
    }

    fetch(filePath)
        .then(response => {

            if (!response.ok) {
                throw new Error(
                    `Failed to load ${filePath}: ${response.status}`
                );
            }

            return response.text();

        })
        .then(data => {

            container.innerHTML = data;

            initializeComponents();

        })
        .catch(error => {

            console.error("Component loading error:", error);

            container.innerHTML = `
                <div style="
                    padding: 20px;
                    color: #dc2626;
                    font-size: 13px;
                ">
                    Unable to load component.
                </div>
            `;

        });

}


function initializeComponents() {

    const sidebarToggle =
        document.querySelector(".sidebar-toggle");

    const sidebar =
        document.querySelector(".resort-sidebar");


    if (sidebarToggle && sidebar) {

        sidebarToggle.addEventListener("click", function () {

            sidebar.classList.toggle("open");

        });

    }


    const sidebarLinks =
        document.querySelectorAll(".sidebar-link");


    sidebarLinks.forEach(link => {

        link.addEventListener("click", function () {

            sidebarLinks.forEach(item => {
                item.classList.remove("active");
            });

            this.classList.add("active");

        });

    });

}