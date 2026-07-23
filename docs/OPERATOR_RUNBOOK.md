# Operator Runbook

Date: 2026-07-23 (Phase 115)

## How to Run Locally

### Prerequisites

- Node.js >= 18 (verified: v20.20.2)
- No other dependencies required for the static Power-Up

### Start the Static Power-Up Server

```bash
cd /path/to/007--Trello-Summarize-This-
npm start
# Starts at http://127.0.0.1:17117/
# Connector entrypoint: http://127.0.0.1:17117/connector.html
```

### Start the Backend API Server

The backend requires environment variables. It will refuse to start without them:

```bash
export JWT_SECRET="your-secret-here"
export ADMIN_PASSWORD="your-admin-password-here"
# Optional:
export TRELLO_APP_KEY="your-trello-app-key"
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="AI..."

npm run start:backend
# Starts at http://127.0.0.1:8787/api/health
```

### Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Token signing secret (min 32 chars recommended) |
| `ADMIN_PASSWORD` | Yes | Admin panel password |
| `TRELLO_APP_KEY` | Recommended | Trello Power-Up app key for comment/auth routes |
| `OPENAI_API_KEY` | Optional | Direct OpenAI provider key |
| `ANTHROPIC_API_KEY` | Optional | Direct Anthropic provider key |
| `GOOGLE_API_KEY` | Optional | Direct Google AI provider key |
| `PROXY_ENDPOINT` | Optional | HTTPS proxy endpoint for AI calls |
| `DATABASE_URL` | Optional | Persistent DB (not active; backend uses in-memory store) |
| `STRIPE_SECRET_KEY` | Optional | Stripe integration |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook verification |

## How to Run Migrations

No migrations are required for the current in-memory backend. If a persistent database is provisioned in future, database migration tooling must be added at that time.

## How to Run Workers/Schedulers

No background workers or schedulers exist in the current shipped scope.

## How to Run Tests

```bash
npm test
# Runs: node test.js && node backend.test.js
# Expected output:
#   All summarizer tests passed.
#   Backend contract tests passed.
```

Individual test suites:
```bash
node test.js          # Core logic, popup contract, installer, summarizer
node backend.test.js  # Backend API contract tests
```

## How to Run Diagnostics

```bash
npm run doctor           # Full static Power-Up diagnostics (30 checks)
npm run doctor:backend   # Backend environment and config diagnostics
```

## How to Verify the Critical Path

**Trello card selected → context fetched → attachments/comments/checklists parsed → AI/deterministic summary generated → confidence/evidence shown → user edits/exports → feedback captured → audit stored**

### Automated (local)

```bash
node test.js
# Verifies: normalization, prompt generation, local analysis, batch analysis,
# list trend signals, feedback capture, export shapes, and popup contract.
```

### Manual (requires live Trello board)

1. Install the Power-Up by hosting connector.html at a public HTTPS URL (or use ngrok for local testing)
2. Add the Power-Up to a Trello board using `manifest.json`
3. Open a Trello card with description, labels, comments, and attachments
4. Click "Summarize This" → verify popup opens and card context loads
5. Verify summary is generated (local if no API keys; AI if keys configured)
6. Verify confidence score and evidence sections are displayed
7. Edit/copy the summary → verify clipboard copy works
8. Draft a Trello comment → verify approval gate blocks auto-posting
9. Tick approval and post → verify comment appears on Trello card
10. Reopen popup → verify ledger history shows the previous analysis

## How to Deploy (Static Power-Up)

1. Host all `.html`, `.js`, `.css`, `.svg`, `.json` files at a public HTTPS URL
2. Configure `trello-config.js` with your Trello app key:
   ```js
   window.SummarizeThisTrelloConfig = { appKey: "your-trello-app-key" };
   ```
3. Register the Power-Up at https://trello.com/power-ups/admin with:
   - Connector URL: `https://your-host/connector.html`
   - Capabilities: card-buttons, card-detail-badges, show-settings, authorization-status, show-authorization

## How to Deploy the Proxy (Optional)

```bash
cd proxy/
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your provider keys
npx wrangler deploy
```

See `proxy/README.md` for full instructions.

## Security Warnings

- Do not commit `.dev.vars`, `JWT_SECRET`, or any provider keys.
- Backend stores passwords in plaintext in memory — not production-safe. Add password hashing before any external deployment.
- The `proxy/.dev.vars` file is excluded by `.gitignore`.
- AI summaries must not be presented as verified facts without human review.

## Known Limitations

1. Backend uses in-memory store — data is lost on restart.
2. Passwords are stored in plaintext — not production-safe.
3. No real database integration.
4. Binary attachment content (PDF, Word, images) is metadata-only.
5. Batch execution is manual-first — no automated unattended batch.
6. Trello description writeback is not implemented.
7. Measured accuracy proof is not available — confidence is a heuristic signal.

## Blocked Items and External Requirements

| Item | Blocker |
|---|---|
| Trello Power-Up listing | Requires Trello developer account approval |
| AI provider calls | Requires API key from OpenAI, Anthropic, or Google |
| Stripe payments | Requires Stripe account and key |
| Persistent backend | Requires database provisioning |
| Proxy deployment | Requires Cloudflare account |
