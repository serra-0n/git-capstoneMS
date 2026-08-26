// ===============================
// RESERVATION PAGE JAVASCRIPT
// ResortHub
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // SEARCH
    // ===============================

    const searchInput = document.querySelector('.filter-panel input[type="search"]');
    const tableRows = document.querySelectorAll(".data-table tbody tr");

    if (searchInput) {

        searchInput.addEventListener("keyup", function () {

            const keyword = this.value.toLowerCase();

            tableRows.forEach(row => {

                const text = row.textContent.toLowerCase();

                row.style.display = text.includes(keyword)
                    ? ""
                    : "none";

            });

        });

    }

    // ===============================
    // CLEAR FILTERS
    // ===============================

    const clearButton = document.querySelector(".filter-panel .button");

    if (clearButton) {

        clearButton.addEventListener("click", () => {

            document
                .querySelectorAll(".filter-panel input")
                .forEach(input => input.value = "");

            document
                .querySelectorAll(".filter-panel select")
                .forEach(select => select.selectedIndex = 0);

            tableRows.forEach(row => {

                row.style.display = "";

            });

        });

    }

    // ===============================
    // NEW RESERVATION
    // ===============================

    const newReservationBtn =
        document.querySelector(".button.primary");

    if (newReservationBtn) {

        newReservationBtn.addEventListener("click", () => {

            alert("New Reservation page will be added later.");

        });

    }

    // ===============================
    // TABLE ROW HOVER
    // ===============================

    tableRows.forEach(row => {

        row.addEventListener("mouseenter", () => {

            row.style.cursor = "pointer";

        });

    });

    // ===============================
    // ACTION BUTTONS
    // ===============================

    document.querySelectorAll(".data-table button").forEach(button => {

        button.addEventListener("click", function () {

            const action = this.textContent.trim();

            switch (action) {

                case "View":
                    alert("View Reservation");
                    break;

                case "Edit":
                    alert("Edit Reservation");
                    break;

                case "Approve":
                    alert("Reservation Approved");
                    break;

                case "Reject":
                    alert("Reservation Rejected");
                    break;

                case "Cancel":
                    alert("Reservation Cancelled");
                    break;

                default:
                    alert(action);

            }

        });

    });

    // ===============================
    // QUICK ACTIONS
    // ===============================

    document.querySelectorAll(".quick-action").forEach(button => {

        button.addEventListener("click", () => {

            alert(button.textContent.trim());

        });

    });

    // ===============================
    // PAGINATION
    // ===============================

    const pages = document.querySelectorAll(".pagination button");

    pages.forEach(button => {

        button.addEventListener("click", () => {

            pages.forEach(btn => {

                btn.classList.remove("active");

            });

            if (
                button.textContent !== "<" &&
                button.textContent !== ">"
            ) {

                button.classList.add("active");

            }

        });

    });

});