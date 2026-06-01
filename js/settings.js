import {
  confirmDialog,
  downloadFile,
  escapeHtml,
  field,
  pageHeader,
  toast,
} from "./components.js";
import { clearState, exportState } from "./storage.js";

function switchSetting(id, label, description, checked) {
  return `
    <div class="settings-row">
      <div class="preference-copy">
        <strong>${escapeHtml(label)}</strong>
        <span class="muted">${escapeHtml(description)}</span>
      </div>
      <label class="switch-row">
        <span class="switch">
          <input type="checkbox" data-setting="${id}" ${checked ? "checked" : ""} />
          <span aria-hidden="true"></span>
        </span>
      </label>
    </div>
  `;
}

export function renderSettingsPage(state) {
  const settings = state.settings || {};

  return `
    <section class="page" data-page="settings">
      ${pageHeader("Settings", "Store placeholder Meta API, webhook, and app preferences locally.")}

      <div class="grid grid-2">
        <article class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Meta API placeholders</h3>
              <p class="card-subtitle">No real API calls are made from this frontend.</p>
            </div>
          </div>
          <form class="card-body settings-list" id="settingsForm">
            ${field({ id: "metaAppId", label: "Meta App ID", value: settings.metaAppId || "", placeholder: "Placeholder only" })}
            ${field({ id: "accessToken", label: "Access token", value: settings.accessToken || "", placeholder: "Do not use production tokens yet" })}
            ${field({ id: "webhookUrl", label: "Webhook URL", value: settings.webhookUrl || "", placeholder: "https://example.com/webhook" })}
            ${field({ id: "webhookVerifyToken", label: "Webhook verify token", value: settings.webhookVerifyToken || "", placeholder: "Local placeholder" })}
            <button class="button button-primary" type="submit">Save settings</button>
          </form>
        </article>

        <article class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">App preferences</h3>
              <p class="card-subtitle">These settings are saved in localStorage.</p>
            </div>
          </div>
          <div class="card-body settings-list">
            ${switchSetting("autoSend", "Auto-send matched comments", "Placeholder preference for future backend automation.", settings.autoSend)}
            ${switchSetting("compactTables", "Compact table density", "Reduce row spacing for data-heavy views.", settings.compactTables)}
            ${switchSetting("reduceMotion", "Reduce motion", "Keep transitions subtle across the interface.", settings.reduceMotion)}
          </div>
        </article>
      </div>

      <article class="card settings-danger">
        <div class="settings-row">
          <div class="preference-copy">
            <strong>Local data controls</strong>
            <span class="muted">Export the current workspace or clear local data after confirmation.</span>
          </div>
          <div class="actions-stack">
            <button class="button button-secondary" type="button" data-action="export-data">Export data</button>
            <button class="button button-danger" type="button" data-action="clear-data">Clear local data</button>
          </div>
        </div>
      </article>
    </section>
  `;
}

export function handleSettingsAction(action, state, updateState) {
  if (action.name === "export-data") {
    downloadFile("insta-comment-dm-automator-data.json", exportState(state));
    toast("Local data exported.", "success");
  }

  if (action.name === "clear-data") {
    confirmDialog({
      title: "Clear local data",
      message: "This removes rules, comments, logs, and settings from localStorage.",
      confirmLabel: "Clear data",
      danger: true,
      onConfirm() {
        clearState();
        updateState(null, { reset: true });
        toast("Local data cleared and sample data restored.", "success");
      },
    });
  }
}
