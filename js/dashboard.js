import { badge, emptyState, escapeHtml, formatDate, pageHeader } from "./components.js";
import { findMatchingRule } from "./rules.js";

function metricCard(label, value, note) {
  return `
    <article class="card metric-card">
      <span class="metric-label">${escapeHtml(label)}</span>
      <strong class="metric-value">${escapeHtml(value)}</strong>
      <span class="metric-note">${escapeHtml(note)}</span>
    </article>
  `;
}

function recentActivity(logs) {
  if (!logs.length) {
    return emptyState("No activity yet", "Matched comments, DMs, and ignored comments will appear here.");
  }

  return `
    <div class="activity-list">
      ${logs.slice(0, 6).map((log) => `
        <div class="activity-item">
          <div class="activity-copy">
            <strong>${escapeHtml(log.message)}</strong>
            <span class="muted">${escapeHtml(log.username || "System")} - ${escapeHtml(log.keyword || "No keyword")}</span>
          </div>
          <div>${badge(log.status, log.type)}</div>
          <span class="muted">${formatDate(log.createdAt)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function quickActions() {
  return `
    <div class="quick-actions">
      <button class="button button-primary" type="button" data-action="open-rule-modal"><span aria-hidden="true">+</span><span>Add rule</span></button>
      <button class="button button-secondary" type="button" data-route="comments">Review comments</button>
      <button class="button button-secondary" type="button" data-route="logs">View logs</button>
      <button class="button button-secondary" type="button" data-route="settings">Open settings</button>
    </div>
  `;
}

export function renderDashboardPage(state) {
  const rules = state.rules || [];
  const comments = state.comments || [];
  const logs = state.logs || [];
  const activeRules = rules.filter((rule) => rule.active).length;
  const newComments = comments.filter((comment) => comment.status === "new").length;
  const dmsSent = comments.filter((comment) => comment.status === "sent").length;
  const matchedComments = comments.filter((comment) => findMatchingRule(comment, rules)).length;

  return `
    <section class="page" data-page="dashboard">
      ${pageHeader("Dashboard", "A clean overview of your comment-to-DM workflow.", `
        <button class="button button-primary" type="button" data-action="open-rule-modal"><span aria-hidden="true">+</span><span>Quick add</span></button>
      `)}

      <div class="grid grid-4">
        ${metricCard("Total Rules", rules.length, "Automation rules saved")}
        ${metricCard("Active Rules", activeRules, "Currently listening")}
        ${metricCard("New Comments", newComments, `${matchedComments} comments match rules`)}
        ${metricCard("DMs Sent", dmsSent, "Local simulation only")}
      </div>

      <div class="split-layout">
        <article class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Recent Activity</h3>
              <p class="card-subtitle">Latest local actions across comments and DMs.</p>
            </div>
          </div>
          <div class="card-body">${recentActivity(logs)}</div>
        </article>

        <article class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Quick Actions</h3>
              <p class="card-subtitle">Common workflows stay within one click.</p>
            </div>
          </div>
          <div class="card-body">${quickActions()}</div>
        </article>
      </div>
    </section>
  `;
}
