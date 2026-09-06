document.addEventListener("DOMContentLoaded", () => {
    const accessToken = sessionStorage.getItem("resorthub_access_token");

    if (!accessToken) {
        window.location.href = "../auth/login.html";
        return;
    }

    if (window.lucide) {
        lucide.createIcons({
            attrs: {
                "stroke-width": 1.8,
            },
        });
    }

    async function loadResortContext() {
        try {
            const response = await fetch("/api/resort-admin/context", {
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error("Unable to load the resort account.");
            }

            const context = await response.json();
            const fullName = [context.user.firstName, context.user.lastName]
                .filter(Boolean)
                .join(" ");
            const initials = context.resort.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((word) => word[0].toUpperCase())
                .join("");

            document.getElementById("sidebarResortName").textContent = context.resort.name;
            document.getElementById("topbarResortName").textContent = context.resort.name;
            document.getElementById("resortAdminName").textContent =
                fullName || "Resort Administrator";
            document.getElementById("resortAdminWelcome").textContent =
                `Welcome back, ${context.user.firstName || "Admin"}!`;
            document.getElementById("sidebarResortAvatar").textContent = initials || "R";
            document.getElementById("topbarResortAvatar").textContent = initials || "R";

            if (context.resort.hasLogo) {
                await loadResortLogo();
            }
        } catch (error) {
            sessionStorage.removeItem("resorthub_access_token");
            window.location.href = "../auth/login.html";
        }
    }

    async function loadResortLogo() {
        const response = await fetch("/api/resort-admin/logo", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) return;

        const logoBlob = await response.blob();
        const logoUrl = URL.createObjectURL(logoBlob);

        ["sidebarResortAvatar", "topbarResortAvatar"].forEach((id) => {
            const avatar = document.getElementById(id);
            avatar.textContent = "";
            avatar.style.backgroundImage = `url("${logoUrl}")`;
            avatar.style.backgroundPosition = "center";
            avatar.style.backgroundSize = "cover";
        });

        window.addEventListener(
            "beforeunload",
            () => {
                URL.revokeObjectURL(logoUrl);
            },
            { once: true },
        );
    }

    document.querySelector(".nav-link.logout")?.addEventListener("click", (event) => {
        event.preventDefault();
        sessionStorage.removeItem("resorthub_access_token");
        window.location.href = "../auth/login.html";
    });

    loadResortContext();

    const dateCard = document.querySelector(".date-card");
    if (dateCard) {
        const now = new Date();

        const dateText = now.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });

        const dayText = now.toLocaleDateString("en-US", {
            weekday: "long",
        });

        dateCard.innerHTML = `
      <b>${dateText}</b>
      <span>${dayText}</span>
    `;
    }

    const searchInput = document.querySelector(".search");
    if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const query = searchInput.value.trim();
                if (query) {
                    console.log("Search:", query);
                }
            }
        });
    }

    const actionMap = {
        "New Reservation": "Reservations.html",
        "Walk-in Reservation": "Reservations.html",
        "Add Room / Cottage": "Rooms.html",
        "OCR Verification": "OCRVerification.html",
    };

    document.querySelectorAll(".quick-action").forEach((button) => {
        button.addEventListener("click", () => {
            const text = button.textContent.replace(/\s+/g, " ").trim();

            for (const label in actionMap) {
                if (text.includes(label)) {
                    window.location.href = actionMap[label];
                    return;
                }
            }
        });
    });
});
