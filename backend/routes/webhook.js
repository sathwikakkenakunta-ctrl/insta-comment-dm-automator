const express = require("express");
const { parseWebhookPayload, verifyToken } = require("../services/instagram");
const { addComments } = require("../services/storage");

const router = express.Router();

router.get("/instagram", (req, res) => {
  const mode = req.query["hub.mode"];
  const receivedToken = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!mode || !receivedToken || !challenge) {
    console.warn("[webhook] Verification request missing required query params");
    return res.status(400).json({
      ok: false,
      error: "Missing webhook verification parameters"
    });
  }

  if (mode === "subscribe" && verifyToken(receivedToken)) {
    console.log("[webhook] Instagram webhook verified");
    return res.status(200).send(challenge);
  }

  console.warn("[webhook] Instagram webhook verification failed");
  return res.status(403).json({
    ok: false,
    error: "Webhook verification failed"
  });
});

router.post("/instagram", async (req, res, next) => {
  try {
    const payload = req.body;

    console.log("[webhook] Webhook received");

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      console.warn("[webhook] Ignored invalid Instagram webhook payload");
      return res.status(400).json({
        ok: false,
        error: "Invalid webhook payload"
      });
    }

    console.log("[webhook] Incoming payload:");
    console.log(JSON.stringify(payload, null, 2));

    const comments = parseWebhookPayload(payload);

    const result = await addComments(comments);

    for (const item of result.addedItems) {
      if (item.status === "WEBHOOK_DEBUG") {
        console.log(`[webhook] Stored debug event ${item.id}`);
      } else {
        console.log(`[webhook] Parsed comment ${item.commentId || item.id}`);
      }
    }

    for (const item of result.duplicateItems) {
      console.log(`[webhook] Duplicate ignored ${item.commentId || item.id}`);
    }

    return res.status(200).json({
      ok: true,
      received: true,
      stored: result.added,
      duplicates: result.duplicates
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
