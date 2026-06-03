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

async function fetchRecentInstagramComments() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    const err = new Error(
      "INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID are required for comment sync"
    );
    err.status = 500;
    throw err;
  }

  const media = await fetchRecentMedia(accountId, accessToken);
  const comments = [];

  for (const mediaItem of media) {
    let mediaComments = [];

    try {
      mediaComments = await fetchMediaComments(mediaItem.id, accessToken);
    } catch (err) {
      console.warn(
        `[instagram] Failed to fetch comments for media ${mediaItem.id}: ${err.message}`
      );
    }

    for (const comment of mediaComments) {
      comments.push(normalizeSyncedComment(comment, mediaItem));
    }
  }

  return {
    mediaCount: media.length,
    comments
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

async function fetchRecentMedia(accountId, accessToken) {
  const fields = "id,caption,timestamp,permalink,media_type";
  const url = graphUrl(
    `/${accountId}/media`,
    {
      fields,
      limit: "10",
      access_token: accessToken
    }
  );

  const data = await graphGet(url);
  return Array.isArray(data.data) ? data.data : [];
}

async function fetchMediaComments(mediaId, accessToken) {
  const fields = "id,text,username,timestamp,like_count";
  const url = graphUrl(
    `/${mediaId}/comments`,
    {
      fields,
      limit: "50",
      access_token: accessToken
    }
  );

  const data = await graphGet(url);
  return Array.isArray(data.data) ? data.data : [];
}

async function graphGet(url) {
  const response = await fetch(url);
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    const parseError = new Error("Instagram Graph API returned invalid JSON");
    parseError.status = response.status || 502;
    throw parseError;
  }

  if (!response.ok) {
    const message =
      data && data.error && data.error.message
        ? data.error.message
        : `Instagram Graph API request failed with ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return data;
}

function graphUrl(pathname, params) {
  const url = new URL(`https://graph.facebook.com/v19.0${pathname}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}

function normalizeSyncedComment(comment, mediaItem) {
  const receivedAt = new Date().toISOString();
  const commentId = firstString(comment.id, comment.comment_id);
  const commentText = firstString(comment.text, comment.message);

  return {
    id: commentId,
    source: "instagram_sync",
    rawPayload: {
      media: mediaItem,
      comment
    },
    mediaId: firstString(mediaItem.id, ""),
    commentId,
    username: firstString(comment.username, ""),
    commentText,
    status: "NEW",
    receivedAt,
    text: commentText,
    userId: "",
    webhookField: "manual_sync",
    raw: {
      media: mediaItem,
      comment
    }
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
  fetchRecentInstagramComments,
  verifyToken,
  parseWebhookPayload
};
