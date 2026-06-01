const toastRegion = document.getElementById("toastRegion");
const modalRoot = document.getElementById("modalRoot");

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeQuery(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function badge(label, tone = "inactive") {
  return `<span class="badge badge-${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

export function pageHeader(title, description, actions = "") {
  return `
    <div class="page-header">
      <div class="page-title-block">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(description)}</p>
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ""}
    </div>
  `;
}

export function field({ id, label, type = "text", value = "", placeholder = "", options = [], textarea = false, required = false }) {
  const input = textarea
    ? `<textarea id="${id}" name="${id}" placeholder="${escapeHtml(placeholder)}" ${required ? "required" : ""}>${escapeHtml(value)}</textarea>`
    : type === "select"
      ? `<select id="${id}" name="${id}">${options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select>`
      : `<input id="${id}" name="${id}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${required ? "required" : ""} />`;

  return `
    <div class="field">
      <label for="${id}">${escapeHtml(label)}</label>
      ${input}
      <span class="field-error" data-error-for="${id}"></span>
    </div>
  `;
}

export function emptyState(title, description, action = "") {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(description)}</span>
      ${action}
    </div>
  `;
}

export function loadingState(label = "Loading workspace") {
  return `
    <div class="loading-state">
      <strong>${escapeHtml(label)}</strong>
      <span class="skeleton-line"></span>
      <span class="skeleton-line"></span>
    </div>
  `;
}

export function toast(message, type = "default") {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  toastRegion.appendChild(node);
  window.setTimeout(() => node.remove(), 3200);
}

export function openModal({ title, subtitle = "", body, footer = "", onMount }) {
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-close-modal></div>
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-header">
        <div>
          <h2 id="modalTitle" class="card-title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="card-subtitle">${escapeHtml(subtitle)}</p>` : ""}
        </div>
        <button class="icon-button" type="button" aria-label="Close modal" data-close-modal>x</button>
      </div>
      ${body}
      ${footer}
    </section>
  `;
  modalRoot.querySelectorAll("[data-close-modal]").forEach((item) => item.addEventListener("click", closeModal));
  if (typeof onMount === "function") onMount(modalRoot);
}

export function closeModal() {
  modalRoot.innerHTML = "";
}

export function confirmDialog({ title, message, confirmLabel = "Confirm", danger = false, onConfirm }) {
  openModal({
    title,
    subtitle: message,
    body: `<div class="modal-body"></div>`,
    footer: `
      <div class="modal-footer">
        <button class="button button-secondary" type="button" data-close-modal>Cancel</button>
        <button class="button ${danger ? "button-danger" : "button-primary"}" type="button" id="confirmAction">${escapeHtml(confirmLabel)}</button>
      </div>
    `,
    onMount(root) {
      root.querySelector("#confirmAction").addEventListener("click", () => {
        closeModal();
        onConfirm();
      });
    },
  });
}

export function setFormErrors(form, errors) {
  form.querySelectorAll("[data-error-for]").forEach((node) => {
    node.textContent = errors[node.dataset.errorFor] || "";
  });
}

export function downloadFile(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
