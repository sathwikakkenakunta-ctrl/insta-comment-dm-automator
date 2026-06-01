import { badge, emptyState, escapeHtml, formatDate, normalizeQuery, pageHeader } from "./components.js";

function getFilteredLogs(state) {
  const query = normalizeQuery(state.ui.search);
  const status = state.ui.status || "all";
  return (state.logs || []).filter((log) => {
    const statusMatch = status === "all" || log.status === status || log.type === status;
    const queryMatch = !query || [log.message, log.username, log.keyword, log.mediaId, log.status].some((value) => normalizeQuery(value).includes(query));
    return statusMatch && queryMatch;
  });
}

function logRows(logs) {
  return logs.map((log) => `
    <tr>
      <td>${badge(log.status, log.type)}</td>
      <td>${escapeHtml(log.message)}</td>
      <td>${escapeHtml(log.username || "System")}</td>
      <td>${escapeHtml(log.keyword || "No keyword")}</td>
      <td>${formatDate(log.createdAt)}</td>
    </tr>
  `).join("");
}

function logCards(logs) {
  return logs.map((log) => `
    <article class="card item-card">
      <div class="item-card-head">
        <div>
          <p class="item-title">${escapeHtml(log.message)}</p>
          <p class="item-meta">${escapeHtml(log.username || "System")} - ${formatDate(log.createdAt)}</p>
        </div>
        ${badge(log.status, log.type)}
      </div>
      <div class="status-line">
        <span>Keyword: ${escapeHtml(log.keyword || "No keyword")}</span>
        <span>Media: ${escapeHtml(log.mediaId || "No media")}</span>
      </div>
    </article>
  `).join("");
}

export function renderLogsPage(state) {
  const filtered = getFilteredLogs(state);
  const hasLogs = (state.logs || []).length > 0;

  return `
    <section class="page" data-page="logs">
      ${pageHeader("Activity Logs", "Audit every local action before real API integration.")}

      <div class="filter-bar">
        <div class="field">
          <label for="logSearch">Search</label>
          <input id="logSearch" type="search" value="${escapeHtml(state.ui.search)}" placeholder="Search action, username, keyword, or media" data-filter="search" />
        </div>
        <div class="field">
          <label for="logStatus">Status</label>
          <select id="logStatus" data-filter="status">
            ${[
              ["all", "All actions"],
              ["matched", "Comment matched"],
              ["sent", "DM sent"],
              ["ignored", "Ignored"],
              ["failed", "Failed"],
            ].map(([value, label]) => `<option value="${value}" ${state.ui.status === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
      </div>

      <article class="card">
        ${filtered.length ? `
          <div class="table-wrap desktop-table">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Action</th>
                  <th>Username</th>
                  <th>Keyword</th>
                  <th>Date/time</th>
                </tr>
              </thead>
              <tbody>${logRows(filtered)}</tbody>
            </table>
          </div>
          <div class="mobile-card-list">${logCards(filtered)}</div>
        ` : emptyState(hasLogs ? "No matching logs" : "No logs yet", hasLogs ? "Try another status or search term." : "Comment matches, sent DMs, ignored comments, and failures will be logged here.")}
      </article>
    </section>
  `;
}
