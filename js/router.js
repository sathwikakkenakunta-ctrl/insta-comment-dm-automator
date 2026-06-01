export const routes = [
  { id: "dashboard", label: "Dashboard", icon: "DB", title: "Dashboard" },
  { id: "rules", label: "Rules", icon: "RL", title: "Rules Manager" },
  { id: "comments", label: "Comments", icon: "CM", title: "Comments Inbox" },
  { id: "logs", label: "Logs", icon: "LG", title: "Activity Logs" },
  { id: "settings", label: "Settings", icon: "ST", title: "Settings" },
];

function createNavButton(route) {
  return `
    <button class="nav-item" type="button" data-route="${route.id}" aria-label="${route.label}">
      <span class="nav-icon" aria-hidden="true">${route.icon}</span>
      <span>${route.label}</span>
    </button>
  `;
}

export function initializeRouter({ onRouteChange }) {
  const sidebarNav = document.getElementById("sidebarNav");
  const bottomNav = document.getElementById("bottomNav");
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");

  sidebarNav.innerHTML = routes.map(createNavButton).join("");
  bottomNav.innerHTML = routes.map(createNavButton).join("");

  function setActive(routeId) {
    const route = routes.find((item) => item.id === routeId) || routes[0];
    document.getElementById("pageTitle").textContent = route.title;
    document.querySelectorAll("[data-route]").forEach((button) => {
      const isActive = button.dataset.route === route.id;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });
    onRouteChange(route.id);
    sidebar.classList.remove("open");
    document.getElementById("app").focus({ preventScroll: true });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-route]");
    if (!button) return;
    window.location.hash = button.dataset.route;
  });

  menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));

  window.addEventListener("hashchange", () => setActive(window.location.hash.replace("#", "") || "dashboard"));
  setActive(window.location.hash.replace("#", "") || "dashboard");
}
