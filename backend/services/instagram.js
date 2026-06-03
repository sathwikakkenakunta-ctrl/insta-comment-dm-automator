const crypto = require("crypto");

function verifyToken(receivedToken) {
  const expectedToken = process.env.META_VERIFY_TOKEN;

  if (!expectedToken) {
    console.warn("[instagram] META_VERIFY_TOKEN is not configured");
    return false;
  }

  return receivedToken === expectedToken;
}

async function sendPrivateReply(commentId, message) {
  const hasMetaConfig =
    Boolean(process.env.INSTAGRAM_ACCESS_TOKEN) &&
    Boolean(process.env.INSTAGRAM_ACCOUNT_ID);

  if (hasMetaConfig) {
    console.log(
      "[instagram] Meta credentials detected, but real DM sending is intentionally disabled for now"
    );
  }

  return {
    simulated: true,
    commentId,
    message,
    sentAt: new Date().toISOString()
  };
}

function parseWebhookPayload(payload) {
  const parsedComments = [];
  const seen = new Set();
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  const receivedAt = new Date().toISOString();

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change && typeof change.value === "object" ? change.value : null;
      const comments = findCommentObjects(value);

      for (const commentValue of comments) {
        const comment = normalizeComment(commentValue, payload, entry, change, receivedAt);

        if (comment && !seen.has(comment.commentId || comment.id)) {
          seen.add(comment.commentId || comment.id);
          parsedComments.push(comment);
        }
      }
    }
  }

  if (parsedComments.length > 0) {
    return parsedComments;
  }

  return [createDebugWebhookEvent(payload, receivedAt)];
}

function normalizeComment(value, payload, entry, change, receivedAt) {
  if (!value || Array.isArray(value)) {
    return null;
  }

  const commentId = firstString(
    value.comment_id,
    value.commentId,
    value.id,
    value.ig_comment_id,
    value.instagram_comment_id,
    value.comment && value.comment.id,
    value.comment && value.comment.comment_id
  );

  if (!commentId) {
    return null;
  }

  const nestedComment = value.comment && typeof value.comment === "object" ? value.comment : {};
  const from = firstObject(value.from, value.user, nestedComment.from, nestedComment.user);
  const media = firstObject(value.media, nestedComment.media);
  const commentText = firstString(
    value.text,
    value.message,
    value.commentText,
    nestedComment.text,
    nestedComment.message
  );

  return {
    id: commentId,
    source: "instagram_webhook",
    rawPayload: payload,
    mediaId: firstString(
      media.id,
      media.media_id,
      value.media_id,
      value.mediaId,
      nestedComment.media_id,
      entry.id
    ),
    commentId,
    username: firstString(from.username, value.username, nestedComment.username, ""),
    commentText,
    status: "NEW",
    receivedAt,
    text: commentText,
    userId: firstString(from.id, value.user_id, value.userId, ""),
    webhookField: firstString(change.field, ""),
    raw: {
      entryId: firstString(entry.id, ""),
      changeValue: value
    }
  };
}

function findCommentObjects(value) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const comments = [];
  const visited = new WeakSet();

  collectCommentObjects(value, comments, visited, 0);

  return comments;
}

function collectCommentObjects(value, comments, visited, depth) {
  if (!value || typeof value !== "object" || depth > 6) {
    return;
  }

  if (visited.has(value)) {
    return;
  }

  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      collectCommentObjects(item, comments, visited, depth + 1);
    }
    return;
  }

  if (looksLikeComment(value)) {
    comments.push(value);
  }

  for (const key of ["comment", "comments", "data", "comment_reply", "replies", "post"]) {
    collectCommentObjects(value[key], comments, visited, depth + 1);
  }
}

function looksLikeComment(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const hasCommentId = Boolean(
    firstString(
      value.comment_id,
      value.commentId,
      value.id,
      value.ig_comment_id,
      value.instagram_comment_id
    )
  );
  const hasCommentText = Boolean(
    firstString(value.text, value.message, value.commentText)
  );

  return hasCommentId && hasCommentText;
}

function createDebugWebhookEvent(payload, receivedAt) {
  return {
    id: `webhook_${Date.now()}_${crypto.randomUUID()}`,
    source: "instagram_webhook_debug",
    rawPayload: payload,
    mediaId: firstEntryId(payload),
    commentId: "",
    username: "",
    commentText: "",
    status: "WEBHOOK_DEBUG",
    receivedAt
  };
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  return {};
}

function firstEntryId(payload) {
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  const entry = entries.find((item) => item && typeof item === "object" && item.id);
  return entry ? firstString(entry.id, "") : "";
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

module.exports = {
  sendPrivateReply,
  verifyToken,
  parseWebhookPayload
};
