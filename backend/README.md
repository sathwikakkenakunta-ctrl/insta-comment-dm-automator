# CommentFlow Backend

Small Node.js + Express backend for receiving Instagram webhook comments, storing them locally, and simulating DM replies.

The current frontend is not connected to this backend yet. LocalStorage can keep working as-is.

## Setup

```bash
cd backend
npm install
```

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update `.env` if needed:

```env
PORT=5000
META_VERIFY_TOKEN=commentflow_secret_123
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_ACCOUNT_ID=
```

Do not put real access tokens in frontend files. Do not commit `.env`.

## Run

```bash
npm run dev
```

For production-style startup:

```bash
npm start
```

Or explicitly:

```bash
npm run start:prod
```

## Test Health

Open this URL in a browser:

```text
http://localhost:5000/health
```

Or use curl:

```bash
curl http://localhost:5000/health
```

## Test Webhook Verification

Use the same token configured in `.env`:

```bash
curl "http://localhost:5000/webhook/instagram?hub.mode=subscribe&hub.verify_token=commentflow_secret_123&hub.challenge=test_challenge"
```

Expected response:

```text
test_challenge
```

## Test Comment Storage

Post a sample webhook payload:

```bash
curl -X POST http://localhost:5000/webhook/instagram \
  -H "Content-Type: application/json" \
  -d "{\"entry\":[{\"changes\":[{\"value\":{\"comment_id\":\"c_123\",\"text\":\"Hello\",\"from\":{\"id\":\"u_1\",\"username\":\"demo_user\"},\"media\":{\"id\":\"m_1\"}}}]}]}"
```

Then read stored comments:

```bash
curl http://localhost:5000/comments
```

## Test Simulated DM

```bash
curl -X POST http://localhost:5000/send-dm \
  -H "Content-Type: application/json" \
  -d "{\"commentId\":\"c_123\",\"message\":\"Thanks for your comment!\"}"
```

The backend does not make real Meta API calls yet. It marks the comment as `DM_SENT` in `data/comments.json`.

## Backup Comment Sync

Webhooks are the primary comment source. If real-time webhook comments are not arriving, manually fetch recent Instagram comments with:

```bash
curl http://localhost:5000/sync-comments
```

This endpoint uses `INSTAGRAM_ACCOUNT_ID` and `INSTAGRAM_ACCESS_TOKEN` from `.env`, fetches recent media, fetches comments for each media item, stores new comments in `data/comments.json`, and skips duplicates by `commentId`.

## Deploy To Render

This backend is ready to deploy as a Render Web Service. The app listens on `process.env.PORT`, which Render provides automatically.

### Option 1: Render Blueprint

Use the root-level `render.yaml` from this repository. It points Render at the `backend` folder, installs dependencies, starts the Express server, and checks `/health`.

Required Render environment variables:

```text
META_VERIFY_TOKEN
INSTAGRAM_ACCESS_TOKEN
INSTAGRAM_ACCOUNT_ID
```

Do not put real tokens in Git. Add them only in the Render dashboard under Environment.

### Option 2: Manual Web Service

Create a new Render Web Service with these settings:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

Then add the same environment variables in Render.

### Verify Deployment

After deployment, open:

```text
https://your-render-service.onrender.com/health
```

Expected JSON shape:

```json
{
  "ok": true,
  "service": "commentflow-backend",
  "timestamp": "..."
}
```

Webhook verification can be tested with:

```bash
curl "https://your-render-service.onrender.com/webhook/instagram?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test_challenge"
```

Expected response:

```text
test_challenge
```
