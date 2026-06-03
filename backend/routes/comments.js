const express = require("express");
const { getComments } = require("../services/storage");

const router = express.Router();

router.get("/comments", async (req, res, next) => {
  try {
    const comments = await getComments();

    res.json({
      ok: true,
      count: comments.length,
      comments
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
