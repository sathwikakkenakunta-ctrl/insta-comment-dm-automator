import { sampleState } from "./data.js";
import { initializeRouter } from "./router.js";
import { loadState, saveState } from "./storage.js";
import { loadingState, normalizeQuery, toast } from "./components.js";
import { renderDashboardPage } from "./dashboard.js";
import { handleRulesAction, openRuleForm, renderRulesPage } from "./rules.js";
import { handleCommentsAction, renderCommentsPage } from "./comments.js";
import { renderLogsPage } from "./logs.js";
import { handleSettingsAction, renderSettingsPage } from "./settings.js";

const app = document.getElementById("app");
const globalSearch = document.getElementById("globalSearch");
const globalAddRule = document.getElementById("globalAddRule");

let state = loadState(sampleState);
let currentRoute = "dashboard";
let pageUi = {
  dashboard: { search: "", status: "all" },
  rules: { search: "", status: "all" },
  comments: { search: "", status: "all", keyword: "all" },
  logs: { search: "", status: "all" },
  settings: { search: "", status: "all" },
};

function pageState() {
  return {
    ...state,
    ui: pageUi[currentRoute] || { search: "", status: "all" },
  };
}

function persist(nextState) {
  state = { ...state, ...nextState };
  saveState(state);
}

function updateState(nextState, options = {}) {
  if (options.reset) {
    state = loadState(sampleState);
    saveState(state);
  } else if (nextState) {
    persist(nextState);
  }
  render();
}

function getFocusSnapshot() {
  const active = document.activeElement;
  if (!active || !app.contains(active) || !active.id) return null;
  return {
    id: active.id,
    start: typeof active.selectionStart === "number" ? active.selectionStart : null,
    end: typeof active.selectionEnd === "number" ? active.selectionEnd : null,
  };
}

function restoreFocus(snapshot) {
  if (!snapshot) return;
  const nextActive = document.getElementById(snapshot.id);
  if (!nextActive) return;
  nextActive.focus({ preventScroll: true });
  if (snapshot.start !== null && typeof nextActive.setSelectionRange === "function") {
    nextActive.setSelectionRange(snapshot.start, snapshot.end);
  }
}

function render(options = {}) {
  const focusSnapshot = options.preserveFocus ? getFocusSnapshot() : null;
  if (options.loading) app.innerHTML = loadingState("Preparing page");

  const renderers = {
    dashboard: renderDashboardPage,
    rules: renderRulesPage,
    comments: renderCommentsPage,
    logs: renderLogsPage,
    settings: renderSettingsPage,
  };

  window.requestAnimationFrame(() => {
    const renderer = renderers[currentRoute] || renderDashboardPage;
    app.innerHTML = renderer(pageState());
    syncGlobalSearch();
    restoreFocus(focusSnapshot);
  });
}

function syncGlobalSearch() {
  const ui = pageUi[currentRoute] || {};
  globalSearch.value = ui.search || "";
  globalSearch.placeholder = currentRoute === "dashboard" ? "Search current page" : `Search ${currentRoute}`;
}

function setPageFilter(name, value) {
  pageUi[currentRoute] = {
    ...pageUi[currentRoute],
    [name]: value,
  };
  render({ preserveFocus: true });
}

function getAction(target) {
  const button = target.closest("[data-action]");
  if (!button) return null;
  return {
    name: button.dataset.action,
    id: button.dataset.id || "",
  };
}

function handlePageAction(action) {
  if (action.name === "open-rule-modal") {
    openRuleForm({ state, updateState });
    return;
  }

  if (currentRoute === "rules") handleRulesAction(action, state, updateState);
  if (currentRoute === "comments") handleCommentsAction(action, state, updateState);
  if (currentRoute === "settings") handleSettingsAction(action, state, updateState);
}

function bindEvents() {
  app.addEventListener("click", (event) => {
    const action = getAction(event.target);
    if (action) handlePageAction(action);
  });

  app.addEventListener("input", (event) => {
    const filter = event.target.dataset.filter;
    if (filter) setPageFilter(filter, event.target.value);
  });

  app.addEventListener("change", (event) => {
    const filter = event.target.dataset.filter;
    if (filter) setPageFilter(filter, event.target.value);

    const setting = event.target.dataset.setting;
    if (setting) {
      const settings = { ...state.settings, [setting]: event.target.checked };
      updateState({ settings });
      toast("Preference saved.", "success");
    }
  });

  app.addEventListener("submit", (event) => {
    if (event.target.id !== "settingsForm") return;
    event.preventDefault();
    const formData = new FormData(event.target);
    const settings = {
      ...state.settings,
      metaAppId: normalizeQuery(formData.get("metaAppId")) ? String(formData.get("metaAppId")).trim() : "",
      accessToken: String(formData.get("accessToken") || "").trim(),
      webhookUrl: String(formData.get("webhookUrl") || "").trim(),
      webhookVerifyToken: String(formData.get("webhookVerifyToken") || "").trim(),
    };
    updateState({ settings });
    toast("Settings saved.", "success");
  });

  globalSearch.addEventListener("input", (event) => {
    pageUi[currentRoute] = { ...pageUi[currentRoute], search: event.target.value };
    render();
  });

  globalAddRule.addEventListener("click", () => openRuleForm({ state, updateState }));
}

function boot() {
  bindEvents();
  initializeRouter({
    onRouteChange(routeId) {
      currentRoute = routeId;
      render({ loading: true });
    },
  });
}

document.addEventListener("DOMContentLoaded", boot);
