document.addEventListener("DOMContentLoaded", function () {

    loadComponent(
        "sidebar-container",
        "../../components/resortAdSidebar.html"
    );

    loadComponent(
        "nav-container",
        "../../components/resortAdNav.html"
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

        })
        .catch(error => {

            console.error("Component loading error:", error);

            container.innerHTML = `
                <p style="
                    padding: 20px;
                    color: red;
                    font-size: 13px;
                ">
                    Unable to load component.
                </p>
            `;

        });

}