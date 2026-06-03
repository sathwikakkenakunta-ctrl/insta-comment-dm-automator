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
  const comments = [];
  const seen = new Set();
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change && typeof change.value === "object" ? change.value : null;
      const comment = normalizeComment(value, entry, change);

      if (comment && !seen.has(comment.id)) {
        seen.add(comment.id);
        comments.push(comment);
      }
    }
  }

  return comments;
}

function normalizeComment(value, entry, change) {
  if (!value || Array.isArray(value)) {
    return null;
  }

  const id = firstString(
    value.comment_id,
    value.id,
    value.commentId,
    value.comment && value.comment.id
  );

  if (!id) {
    return null;
  }

  const from = value.from && typeof value.from === "object" ? value.from : {};
  const media = value.media && typeof value.media === "object" ? value.media : {};

  return {
    id,
    commentId: id,
    text: firstString(value.text, value.message, value.comment && value.comment.text, ""),
    username: firstString(from.username, value.username, ""),
    userId: firstString(from.id, value.user_id, value.userId, ""),
    mediaId: firstString(media.id, value.media_id, value.mediaId, ""),
    status: "NEW",
    source: "instagram_webhook",
    webhookField: firstString(change.field, ""),
    receivedAt: new Date().toISOString(),
    raw: {
      entryId: firstString(entry.id, ""),
      changeValue: value
    }
  };
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
