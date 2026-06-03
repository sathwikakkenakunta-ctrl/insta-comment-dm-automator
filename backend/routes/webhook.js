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

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      console.warn("[webhook] Ignored invalid Instagram webhook payload");
      return res.status(400).json({
        ok: false,
        error: "Invalid webhook payload"
      });
    }

    const comments = parseWebhookPayload(payload);

    if (comments.length === 0) {
      console.log("[webhook] Received Instagram webhook with no comment data");
      return res.status(200).json({
        ok: true,
        received: true,
        stored: 0,
        duplicates: 0
      });
    }

    const result = await addComments(comments);
    console.log(
      `[webhook] Stored ${result.added} comment(s), skipped ${result.duplicates} duplicate(s)`
    );

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
