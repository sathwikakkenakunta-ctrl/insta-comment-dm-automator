import {
  badge,
  closeModal,
  confirmDialog,
  emptyState,
  escapeHtml,
  field,
  formatDate,
  normalizeQuery,
  openModal,
  pageHeader,
  setFormErrors,
  toast,
} from "./components.js";
import { generateId } from "./storage.js";

export function findMatchingRule(comment, rules) {
  const text = normalizeQuery(comment?.text);
  const mediaId = String(comment?.mediaId ?? "").trim();
  return (rules || []).find((rule) => {
    return rule.active && String(rule.mediaId).trim() === mediaId && text.includes(normalizeQuery(rule.keyword));
  }) || null;
}

function getFilteredRules(state) {
  const query = normalizeQuery(state.ui.search);
  const status = state.ui.status || "all";

  return (state.rules || []).filter((rule) => {
    const statusMatch = status === "all" || (status === "active" ? rule.active : !rule.active);
    const queryMatch = !query || [rule.title, rule.mediaId, rule.keyword, rule.message].some((value) => normalizeQuery(value).includes(query));
    return statusMatch && queryMatch;
  });
}

function ruleRows(rules) {
  return rules.map((rule) => `
    <tr>
      <td>
        <strong>${escapeHtml(rule.title)}</strong>
        <div class="muted">Updated ${formatDate(rule.updatedAt || rule.createdAt)}</div>
      </td>
      <td>${escapeHtml(rule.mediaId)}</td>
      <td>${escapeHtml(rule.keyword)}</td>
      <td><div class="text-clip">${escapeHtml(rule.message)}</div></td>
      <td>${badge(rule.active ? "Active" : "Inactive", rule.active ? "active" : "inactive")}</td>
      <td>
        <div class="table-actions">
          <button class="button button-secondary button-small" type="button" data-action="edit-rule" data-id="${rule.id}">Edit</button>
          <button class="button button-ghost button-small" type="button" data-action="delete-rule" data-id="${rule.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function ruleCards(rules) {
  return rules.map((rule) => `
    <article class="card item-card">
      <div class="item-card-head">
        <div>
          <p class="item-title">${escapeHtml(rule.title)}</p>
          <p class="item-meta">Media ${escapeHtml(rule.mediaId)} - ${escapeHtml(rule.keyword)}</p>
        </div>
        ${badge(rule.active ? "Active" : "Inactive", rule.active ? "active" : "inactive")}
      </div>
      <p class="item-message">${escapeHtml(rule.message)}</p>
      <div class="actions-stack">
        <button class="button button-secondary button-small" type="button" data-action="edit-rule" data-id="${rule.id}">Edit</button>
        <button class="button button-ghost button-small" type="button" data-action="delete-rule" data-id="${rule.id}">Delete</button>
      </div>
    </article>
  `).join("");
}

export function renderRulesPage(state) {
  const filtered = getFilteredRules(state);
  const hasRules = (state.rules || []).length > 0;

  return `
    <section class="page" data-page="rules">
      ${pageHeader("Rules Manager", "Create, search, edit, and control automated DM rules.", `
        <button class="button button-primary" type="button" data-action="open-rule-modal"><span aria-hidden="true">+</span><span>Add rule</span></button>
      `)}

      <div class="filter-bar">
        <div class="field">
          <label for="ruleSearch">Search</label>
          <input id="ruleSearch" type="search" value="${escapeHtml(state.ui.search)}" placeholder="Search title, media ID, keyword, or message" data-filter="search" />
        </div>
        <div class="field">
          <label for="ruleStatus">Status</label>
          <select id="ruleStatus" data-filter="status">
            <option value="all" ${state.ui.status === "all" ? "selected" : ""}>All rules</option>
            <option value="active" ${state.ui.status === "active" ? "selected" : ""}>Active</option>
            <option value="inactive" ${state.ui.status === "inactive" ? "selected" : ""}>Inactive</option>
          </select>
        </div>
      </div>

      <article class="card">
        ${filtered.length ? `
          <div class="table-wrap desktop-table">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Reel/Post title</th>
                  <th>Media ID</th>
                  <th>Keyword</th>
                  <th>DM Message</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>${ruleRows(filtered)}</tbody>
            </table>
          </div>
          <div class="mobile-card-list">${ruleCards(filtered)}</div>
        ` : emptyState(hasRules ? "No matching rules" : "No rules yet", hasRules ? "Adjust search or filters to see more rules." : "Add your first keyword rule to start organizing automations.", `
          <button class="button button-primary" type="button" data-action="open-rule-modal">Add rule</button>
        `)}
      </article>
    </section>
  `;
}

function validateRule(formData, rules, editingId) {
  const errors = {};
  const title = formData.get("ruleTitle").trim();
  const mediaId = formData.get("mediaId").trim();
  const keyword = formData.get("keyword").trim().toUpperCase();
  const message = formData.get("message").trim();

  if (!title) errors.ruleTitle = "Enter a reel or post title.";
  if (!mediaId) errors.mediaId = "Enter a media ID.";
  if (!keyword) errors.keyword = "Enter a keyword.";
  if (!message) errors.message = "Enter the DM message.";

  const duplicate = rules.some((rule) => {
    return rule.id !== editingId && normalizeQuery(rule.mediaId) === normalizeQuery(mediaId) && normalizeQuery(rule.keyword) === normalizeQuery(keyword);
  });

  if (duplicate) {
    errors.keyword = "This media ID and keyword already exist.";
  }

  return { errors, values: { title, mediaId, keyword, message, active: formData.get("active") === "on" } };
}

export function openRuleForm({ state, rule = null, updateState }) {
  const isEditing = Boolean(rule);
  openModal({
    title: isEditing ? "Edit rule" : "Add rule",
    subtitle: "Rules are local only for now and ready to connect to a backend later.",
    body: `
      <form id="ruleForm">
        <div class="modal-body form-grid">
          ${field({ id: "ruleTitle", label: "Reel/Post title", value: rule?.title || "", placeholder: "Launch guide reel", required: true })}
          ${field({ id: "mediaId", label: "Media ID", value: rule?.mediaId || "", placeholder: "178900001", required: true })}
          ${field({ id: "keyword", label: "Keyword", value: rule?.keyword || "", placeholder: "GUIDE", required: true })}
          <div class="field">
            <span class="field-label">Status</span>
            <label class="switch-row">
              <span class="switch">
                <input id="active" name="active" type="checkbox" ${rule?.active === false ? "" : "checked"} />
                <span aria-hidden="true"></span>
              </span>
              <span>Active</span>
            </label>
          </div>
          <div class="span-2">${field({ id: "message", label: "DM message", value: rule?.message || "", placeholder: "Thanks for commenting. Here is the link.", textarea: true, required: true })}</div>
        </div>
        <div class="modal-footer">
          <button class="button button-secondary" type="button" data-close-modal>Cancel</button>
          <button class="button button-primary" type="submit">${isEditing ? "Save changes" : "Create rule"}</button>
        </div>
      </form>
    `,
    onMount(root) {
      const form = root.querySelector("#ruleForm");
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const { errors, values } = validateRule(formData, state.rules, rule?.id || "");
        setFormErrors(form, errors);
        if (Object.keys(errors).length) {
          toast("Please fix the highlighted fields.", "error");
          return;
        }

        const timestamp = new Date().toISOString();
        const nextRules = isEditing
          ? state.rules.map((item) => item.id === rule.id ? { ...item, ...values, updatedAt: timestamp } : item)
          : [{ id: generateId("rule"), ...values, createdAt: timestamp, updatedAt: timestamp }, ...state.rules];

        updateState({ rules: nextRules });
        closeModal();
        toast(isEditing ? "Rule updated." : "Rule created.", "success");
      });
    },
  });
}

export function handleRulesAction(action, state, updateState) {
  if (action.name === "open-rule-modal") {
    openRuleForm({ state, updateState });
  }

  if (action.name === "edit-rule") {
    const rule = state.rules.find((item) => item.id === action.id);
    if (rule) openRuleForm({ state, rule, updateState });
  }

  if (action.name === "delete-rule") {
    const rule = state.rules.find((item) => item.id === action.id);
    if (!rule) return;
    confirmDialog({
      title: "Delete rule",
      message: `Delete "${rule.title}"? Comments and logs will stay saved.`,
      confirmLabel: "Delete rule",
      danger: true,
      onConfirm() {
        updateState({ rules: state.rules.filter((item) => item.id !== rule.id) });
        toast("Rule deleted.", "success");
      },
    });
  }
}
