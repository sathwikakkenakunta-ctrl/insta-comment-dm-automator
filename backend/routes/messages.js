const express = require("express");
const { sendPrivateReply } = require("../services/instagram");
const { markDmSent } = require("../services/storage");

const router = express.Router();

router.post("/send-dm", async (req, res, next) => {
  try {
    const { commentId, message } = req.body || {};

    if (!commentId || typeof commentId !== "string") {
      return res.status(400).json({
        ok: false,
        error: "commentId is required"
      });
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: "message is required"
      });
    }

    const result = await markDmSent(commentId, message.trim());

    if (result.reason === "NOT_FOUND") {
      return res.status(404).json({
        ok: false,
        error: "Comment not found"
      });
    }

    if (result.reason === "ALREADY_SENT") {
      return res.status(409).json({
        ok: false,
        error: "DM already sent for this comment",
        comment: result.comment
      });
    }

    const delivery = await sendPrivateReply(commentId, message.trim());
    console.log(`[messages] Simulated DM sent for comment ${commentId}`);

    return res.json({
      ok: true,
      status: "DM_SENT",
      delivery,
      comment: result.comment
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
