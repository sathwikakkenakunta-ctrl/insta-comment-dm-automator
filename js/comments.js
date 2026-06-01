import { badge, emptyState, escapeHtml, formatDate, normalizeQuery, pageHeader, toast } from "./components.js";
import { generateId } from "./storage.js";
import { findMatchingRule } from "./rules.js";

function getCommentStatus(comment, rules) {
  if (comment.status !== "new") return comment.status;
  return findMatchingRule(comment, rules) ? "matched" : "new";
}

function getFilteredComments(state) {
  const query = normalizeQuery(state.ui.search);
  const status = state.ui.status || "all";
  const ruleKeyword = state.ui.keyword || "all";

  return (state.comments || []).filter((comment) => {
    const rule = findMatchingRule(comment, state.rules);
    const derivedStatus = getCommentStatus(comment, state.rules);
    const statusMatch = status === "all" || derivedStatus === status || comment.status === status;
    const keywordMatch = ruleKeyword === "all" || rule?.keyword === ruleKeyword;
    const queryMatch = !query || [comment.username, comment.postTitle, comment.text, rule?.keyword, rule?.message].some((value) => normalizeQuery(value).includes(query));
    return statusMatch && keywordMatch && queryMatch;
  });
}

function actionButtons(comment) {
  const disabled = comment.status === "sent" || comment.status === "ignored";
  return `
    <div class="table-actions">
      <button class="button button-primary button-small" type="button" data-action="send-dm" data-id="${comment.id}" ${disabled ? "disabled" : ""}>Send DM</button>
      <button class="button button-secondary button-small" type="button" data-action="ignore-comment" data-id="${comment.id}" ${comment.status === "ignored" || comment.status === "sent" ? "disabled" : ""}>Ignore</button>
    </div>
  `;
}

function commentRows(comments, rules) {
  return comments.map((comment) => {
    const rule = findMatchingRule(comment, rules);
    const status = getCommentStatus(comment, rules);
    return `
      <tr>
        <td><strong>@${escapeHtml(comment.username)}</strong></td>
        <td>${escapeHtml(comment.postTitle)}</td>
        <td>${escapeHtml(comment.text)}</td>
        <td>${escapeHtml(rule?.keyword || "No match")}</td>
        <td><div class="text-clip">${escapeHtml(rule?.message || "No suggested DM available")}</div></td>
        <td>${badge(status.replace("_", " "), status)}</td>
        <td>${formatDate(comment.receivedAt)}</td>
        <td>${actionButtons(comment)}</td>
      </tr>
    `;
  }).join("");
}

function commentCards(comments, rules) {
  return comments.map((comment) => {
    const rule = findMatchingRule(comment, rules);
    const status = getCommentStatus(comment, rules);
    return `
      <article class="card item-card">
        <div class="item-card-head">
          <div>
            <p class="item-title">@${escapeHtml(comment.username)}</p>
            <p class="item-meta">${escapeHtml(comment.postTitle)} - ${formatDate(comment.receivedAt)}</p>
          </div>
          ${badge(status.replace("_", " "), status)}
        </div>
        <p class="item-message">${escapeHtml(comment.text)}</p>
        <div class="status-line">
          <span>Keyword: ${escapeHtml(rule?.keyword || "No match")}</span>
          <span>Media: ${escapeHtml(comment.mediaId)}</span>
        </div>
        <p class="item-message">${escapeHtml(rule?.message || "No suggested DM available")}</p>
        ${actionButtons(comment)}
      </article>
    `;
  }).join("");
}

export function renderCommentsPage(state) {
  const filtered = getFilteredComments(state);
  const keywords = [...new Set((state.rules || []).map((rule) => rule.keyword))];
  const hasComments = (state.comments || []).length > 0;

  return `
    <section class="page" data-page="comments">
      ${pageHeader("Comments Inbox", "Review matched comments and simulate private replies safely.")}

      <div class="filter-bar">
        <div class="field">
          <label for="commentSearch">Search</label>
          <input id="commentSearch" type="search" value="${escapeHtml(state.ui.search)}" placeholder="Search username, post, comment, or message" data-filter="search" />
        </div>
        <div class="field">
          <label for="commentStatus">Status</label>
          <select id="commentStatus" data-filter="status">
            ${["all", "new", "matched", "sent", "ignored", "failed"].map((status) => `<option value="${status}" ${state.ui.status === status ? "selected" : ""}>${status === "all" ? "All comments" : status}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="commentKeyword">Keyword</label>
          <select id="commentKeyword" data-filter="keyword">
            <option value="all">All keywords</option>
            ${keywords.map((keyword) => `<option value="${escapeHtml(keyword)}" ${state.ui.keyword === keyword ? "selected" : ""}>${escapeHtml(keyword)}</option>`).join("")}
          </select>
        </div>
      </div>

      <article class="card">
        ${filtered.length ? `
          <div class="table-wrap desktop-table">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Reel/Post</th>
                  <th>Comment text</th>
                  <th>Matched keyword</th>
                  <th>Suggested DM</th>
                  <th>Status</th>
                  <th>Date/time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>${commentRows(filtered, state.rules)}</tbody>
            </table>
          </div>
          <div class="mobile-card-list">${commentCards(filtered, state.rules)}</div>
        ` : emptyState(hasComments ? "No matching comments" : "No comments yet", hasComments ? "Adjust filters to review more comments." : "Webhook comments will appear here when a backend is connected.")}
      </article>
    </section>
  `;
}

function createLog(type, comment, rule, status, message) {
  return {
    id: generateId("log"),
    type,
    status,
    message,
    username: comment.username,
    mediaId: comment.mediaId,
    keyword: rule?.keyword || "",
    commentId: comment.id,
    createdAt: new Date().toISOString(),
  };
}

export function handleCommentsAction(action, state, updateState) {
  const comment = state.comments.find((item) => item.id === action.id);
  if (!comment) return;

  if (action.name === "send-dm") {
    if (comment.status === "sent") {
      toast("This comment already has a sent DM.", "error");
      return;
    }
    if (comment.status === "ignored") {
      toast("Ignored comments cannot be sent unless restored later.", "error");
      return;
    }
    const rule = findMatchingRule(comment, state.rules);
    if (!rule) {
      const failed = createLog("failed", comment, null, "failed", `No active rule matched ${comment.username}.`);
      updateState({ logs: [failed, ...state.logs] });
      toast("No active matching rule found.", "error");
      return;
    }

    const now = new Date().toISOString();
    const comments = state.comments.map((item) => item.id === comment.id ? { ...item, status: "sent", sentAt: now } : item);
    const logs = [
      createLog("dm_sent", comment, rule, "sent", `DM sent to ${comment.username} for keyword ${rule.keyword}.`),
      ...state.logs,
    ];
    updateState({ comments, logs });
    toast("DM marked as sent.", "success");
  }

  if (action.name === "ignore-comment") {
    if (comment.status === "sent") {
      toast("Sent comments cannot be ignored.", "error");
      return;
    }
    const rule = findMatchingRule(comment, state.rules);
    const now = new Date().toISOString();
    const comments = state.comments.map((item) => item.id === comment.id ? { ...item, status: "ignored", ignoredAt: now } : item);
    const logs = [
      createLog("ignored", comment, rule, "ignored", `Comment from ${comment.username} was ignored.`),
      ...state.logs,
    ];
    updateState({ comments, logs });
    toast("Comment ignored.", "success");
  }
}
