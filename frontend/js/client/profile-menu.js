const PROFILE_MENU_TOKEN_KEY = "resorthub_access_token";

document.addEventListener("DOMContentLoaded", initializeProfileMenu);

async function initializeProfileMenu() {
    const profileButton = document.getElementById("clientProfileButton");

    const container = profileButton?.closest(".topbar-right");

    if (!profileButton || !container) {
        return;
    }

    const menu = document.createElement("div");

    menu.id = "clientProfileMenu";
    menu.className = "client-profile-menu";
    menu.hidden = true;

    container.appendChild(menu);

    profileButton.setAttribute(
        "aria-haspopup",
        "menu"
    );

    profileButton.setAttribute(
        "aria-expanded",
        "false"
    );

    profileButton.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const shouldOpen = menu.hidden;
        menu.hidden = !shouldOpen;

        profileButton.setAttribute(
            "aria-expanded",
            String(shouldOpen)
        );
    }, true);

    document.addEventListener("click", function(event) {
        if (!container.contains(event.target)) {
            closeProfileMenu(profileButton, menu);
        }
    });

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            closeProfileMenu(profileButton, menu);
            profileButton.focus();
        }
    });

    const accessToken = sessionStorage.getItem(PROFILE_MENU_TOKEN_KEY);

    if (!accessToken) {
        window.location.href = "../auth/login.html";
        return;
    }

    renderLoadingMenu(menu);

    try {
        const response = await fetch("/api/auth/me",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to load account options.");
        }

        renderProfileMenu(
            menu,
            result.user,
            accessToken
        );
    } catch (error) {
        renderMenuError(menu, error.message);
    }
}

function closeProfileMenu(profileButton, menu) {
    menu.hidden = true;

    profileButton.setAttribute(
        "aria-expanded",
        "false"
    );
}

function renderLoadingMenu(menu) {
    menu.innerHTML = `
        <div class="profile-menu-status">
            Loading account options...
        </div>
    `;
}

function renderProfileMenu(
    menu,
    user,
    accessToken
) {
    const memberships = Array.isArray(user.memberships)
        ? user.memberships
        : [];

    const activeMemberships = memberships.filter(
        function (membership) {
            return (
                membership.status === "active" &&
                membership.approvalStatus === "approved" &&
                membership.tenantStatus === "active"
            );
        }
    );

    const pendingMembership = memberships.find (
        function (membership) {
            return (
                membership.status === "pending" ||
                membership.approvalStatus === "pending"
            );
        }
    );

    let resortActionHtml = "";

    if (activeMemberships.length > 0) {
        resortActionHtml = activeMemberships
            .map(function (membership) {
                return `
                    <button
                        type="button"
                        class="profile-menu-item"
                        data-switch-tenant="${membership.tenantId}"
                    >
                        Switch to ${escapeHtml(membership.resortName)}
                    </button>`;
            }).join("");
    } else if (pendingMembership) {
        resortActionHtml = `
            <button
                type="button"
                class="profile-menu-item"
                disabled
            >
                Resort application pending
            </button>`;
    } else {
        resortActionHtml = `
            <a
                class="profile-menu-item"
                href="../onboarding/ResortSignup.html"
            >
                Create a Resort
            </a>`;
    }

    menu.innerHTML = `
        <div class="profile-menu-header">
            <strong>
                ${escapeHtml(
                    `${user.firstName} ${user.lastName}`
                )}
            </strong>
            
            <span>
                ${escapeHtml(user.email)}
            </span>
        </div>
        
        <div class="profile-menu-divider"></div>
        
        ${resortActionHtml}
        
        <a
            class="profile-menu-item"
            href="Profile.html"
        >
            Profile
        </a>
        
        <button
            type="button"
            class="profile-menu-item profile-menu-logout"
            id="profileMenuLogout"
        >
            Log out 
        </button>
        
        <div
            class="profile-menu-message"
            id="profileMenuMessage"
            hidden></div>`;

        menu.addEventListener("click",
            async function (event) {
                const switchButton = event.target.closest("[data-switch-tenant]");

                if (switchButton) {
                    await switchToResort(
                        switchButton,
                        accessToken,
                        menu
                    );
                }
            }
        );

        const logoutButton = menu.querySelector("#profileMenuLogout");

        logoutButton?.addEventListener("click", function() {
            sessionStorage.removeItem(PROFILE_MENU_TOKEN_KEY);
            window.location.href = "../auth/login.html";
        });
}

async function switchToResort(
    button,
    accessToken,
    menu
) {
    const tenantId = Number(button.dataset.switchTenant);

    button.disabled = true;
    button.textContent = "Switching...";

    try {
        const response = await fetch("/api/auth/switch-context", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                context: "resort",
                tenantId
            })
        });

        const result = await response.json();

        if(!response.ok) {
            throw new Error(
                result.message || "Unable to switch resort."
            );
        }

        sessionStorage.setItem(
            PROFILE_MENU_TOKEN_KEY,
            result.token
        );

        window.location.href = "../resort-admin/Dashboard.html";
    } catch (error) {
        const message = menu.querySelector("#profileMenuMessage");

        if (message) {
            message.textContent = error.message;
            message.hidden = false;
        }

        button.disabled = false;
        button.textContent = "Switch to Resort Admin";
    }
}

function renderMenuError(menu, message) {
    menu.innerHTML = `
        <div class="profile-menu-status">
            ${escapeHtml(message)}
        </div>
        
        <a
            class="profile-menu-item"
            href="Profile.html"
        >
            Profile
        </a>`;
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value || "");
    return element.innerHTML;
}