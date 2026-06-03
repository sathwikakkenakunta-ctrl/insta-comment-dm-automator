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
