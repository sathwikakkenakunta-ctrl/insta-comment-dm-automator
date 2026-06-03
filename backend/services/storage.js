const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const COMMENTS_FILE = path.join(DATA_DIR, "comments.json");

let writeQueue = Promise.resolve();

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(COMMENTS_FILE);
  } catch (err) {
    await fs.writeFile(COMMENTS_FILE, "[]\n", "utf8");
  }
}

async function getComments() {
  return readComments();
}

async function addComments(newComments) {
  return enqueueWrite(async () => {
    const comments = await readComments();
    const existingIds = new Set(comments.map((comment) => comment.id).filter(Boolean));
    const existingCommentIds = new Set(
      comments.map((comment) => comment.commentId).filter(Boolean)
    );
    const accepted = [];
    const duplicateItems = [];
    let duplicates = 0;

    for (const comment of newComments) {
      const id = comment && (comment.id || comment.commentId);
      const commentId = comment && comment.commentId;

      if (!id || existingIds.has(id) || (commentId && existingCommentIds.has(commentId))) {
        duplicates += 1;
        duplicateItems.push(comment);
        continue;
      }

      existingIds.add(id);
      if (commentId) {
        existingCommentIds.add(commentId);
      }
      accepted.push(comment);
    }

    if (accepted.length > 0) {
      await writeComments([...comments, ...accepted]);
    }

    return {
      added: accepted.length,
      duplicates,
      addedItems: accepted,
      duplicateItems
    };
  });
}

async function markDmSent(commentId, message) {
  return enqueueWrite(async () => {
    const comments = await readComments();
    const index = comments.findIndex(
      (comment) => comment.id === commentId || comment.commentId === commentId
    );

    if (index === -1) {
      return {
        reason: "NOT_FOUND"
      };
    }

    if (comments[index].status === "DM_SENT") {
      return {
        reason: "ALREADY_SENT",
        comment: comments[index]
      };
    }

    comments[index] = {
      ...comments[index],
      status: "DM_SENT",
      dmMessage: message,
      dmSentAt: new Date().toISOString()
    };

    await writeComments(comments);

    return {
      reason: "UPDATED",
      comment: comments[index]
    };
  });
}

async function readComments() {
  await ensureStorage();

  try {
    const content = await fs.readFile(COMMENTS_FILE, "utf8");
    const parsed = JSON.parse(content || "[]");

    if (!Array.isArray(parsed)) {
      console.warn("[storage] comments.json did not contain an array; using empty list");
      return [];
    }

    return parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("[storage] Failed to parse comments.json:", err.message);
      return [];
    }

    throw err;
  }
}

async function writeComments(comments) {
  await ensureStorage();
  const tempFile = `${COMMENTS_FILE}.tmp`;
  const content = `${JSON.stringify(comments, null, 2)}\n`;

  await fs.writeFile(tempFile, content, "utf8");
  await fs.rename(tempFile, COMMENTS_FILE);
}

function enqueueWrite(operation) {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.catch(() => {});
  return next;
}

module.exports = {
  ensureStorage,
  getComments,
  addComments,
  markDmSent
};
