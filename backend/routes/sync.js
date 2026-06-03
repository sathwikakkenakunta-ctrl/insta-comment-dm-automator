const express = require("express");
const { fetchRecentInstagramComments } = require("../services/instagram");
const { addComments } = require("../services/storage");

const router = express.Router();

router.get("/sync-comments", async (req, res, next) => {
  try {
    console.log("[sync] Sync started");

    const syncResult = await fetchRecentInstagramComments();
    console.log(`[sync] Media fetched count: ${syncResult.mediaCount}`);
    console.log(`[sync] Comments fetched count: ${syncResult.comments.length}`);

    const storageResult = await addComments(syncResult.comments);
    console.log(`[sync] Duplicates skipped: ${storageResult.duplicates}`);
    console.log(`[sync] Sync completed: ${storageResult.added} new comment(s) stored`);

    res.json({
      ok: true,
      syncedComments: storageResult.added,
      duplicatesSkipped: storageResult.duplicates,
      mediaFetched: syncResult.mediaCount,
      commentsFetched: syncResult.comments.length
    });
  } catch (err) {
    console.error("[sync] Sync failed:", err.message);
    next(err);
  }
});

module.exports = router;
