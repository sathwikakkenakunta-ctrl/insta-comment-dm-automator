require("dotenv").config();

const express = require("express");
const cors = require("cors");

const webhookRoutes = require("./routes/webhook");
const commentsRoutes = require("./routes/comments");
const messagesRoutes = require("./routes/messages");
const { ensureStorage } = require("./services/storage");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "commentflow-backend",
    timestamp: new Date().toISOString()
  });
});

app.use("/webhook", webhookRoutes);
app.use("/", commentsRoutes);
app.use("/", messagesRoutes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Route not found"
  });
});

app.use((err, req, res, next) => {
  console.error("[server] Unhandled request error:", err);
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || "Internal server error"
  });
});

ensureStorage()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] CommentFlow backend listening on port ${PORT}`);
      console.log("[server] CORS enabled for frontend access");
    });
  })
  .catch((err) => {
    console.error("[server] Failed to initialize storage:", err);
    process.exit(1);
  });
