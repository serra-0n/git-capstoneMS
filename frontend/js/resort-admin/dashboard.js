document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons({
      attrs: {
        "stroke-width": 1.8
      }
    });
  }

  const dateCard = document.querySelector(".date-card");
  if (dateCard) {
    const now = new Date();

    const dateText = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const dayText = now.toLocaleDateString("en-US", {
      weekday: "long"
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
    "OCR Verification": "OCRVerification.html"
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