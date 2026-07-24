# API Usage Audit

Date: 2026-07-23 (Phase 115 update)
Previous: 2026-07-10

## External APIs Used

### Trello Power-Up JS SDK

| Call | Location | Status | Notes |
|---|---|---|---|
| `TrelloPowerUp.initialize()` | connector.js | Active | Registers all 5 capabilities |
| `t.popup()` | connector.js, popup.html | Active | Opens popup, settings, authorize windows |
| `t.card('all')` / `t.card('id')` | popup.html, connector.js | Active | Card context and ID reads |
| `t.board('all')` | popup.html | Active | Board name and context |
| `t.lists('all')` | popup.html | Active | List context and neighboring cards |
| `t.get('member', 'private', ...)` | connector.js, popup.html | Active | Settings, ledger history, review state reads |
| `t.set('member', 'private', ...)` | popup.html | Active | Settings, ledger, review state writes |
| `t.getRestApi()` | connector.js | Active | Auth status check |
| `t.sizeTo('#app')` | popup.html | Active | Popup height adjustment |
| `t.closePopup()` | popup.html | Active | Close popup after action |

### AI Provider APIs (Direct)

| Provider | Endpoint | Location | Status | Notes |
|---|---|---|---|---|
| OpenAI | `https://api.openai.com/v1/chat/completions` | ai-providers.js | Active (when key configured) | GPT-4o, GPT-4o-mini |
| Anthropic | `https://api.anthropic.com/v1/messages` | ai-providers.js | Active (when key configured) | Claude models |
| Google AI | `https://generativelanguage.googleapis.com/v1beta/models/...` | ai-providers.js | Active (when key configured) | Gemini models |

### Proxy API

| Endpoint | Location | Status | Notes |
|---|---|---|---|
| Configurable HTTPS proxy URL | ai-providers.js, popup.html | Active (when configured) | Cloudflare Worker proxy; sanitized endpoint |

### GitHub (Update Check)

| Call | Location | Status | Notes |
|---|---|---|---|
| `fetch(updateManifestUrl, { credentials: "omit", referrerPolicy: "no-referrer" })` | popup.html | Active (manual trigger only) | Only from `raw.githubusercontent.com/Noodzakelijk-Online/...` |

### Trello REST API

| Endpoint | Location | Status | Notes |
|---|---|---|---|
| `GET /1/cards/{id}?...` | trello-integration.js | Active (when Trello token present) | Full card context including comments, checklists, attachments, custom fields |
| `POST /1/cards/{id}/actions/comments` | popup.html | Active (approval-gated) | Comment posting after explicit user approval |

## Backend API Endpoints

All endpoints live in `backend-app.js`. The backend uses an in-memory store and is for local development only.

| Endpoint | Method | Auth | Status | Notes |
|---|---|---|---|---|
| `/api/health` | GET | None | Active | Health and readiness info |
| `/api/readiness` | GET | None | Active | Ready/blocked with missing env list |
| `/api/config` | GET | None | Active | Public config (no secrets) |
| `/api/auth/register` | POST | None | Active | User registration |
| `/api/auth/login` | POST | None | Active | User login → token |
| `/api/user/profile` | GET | Bearer | Active | User profile |
| `/api/user/credits` | GET | Bearer | Active | Credit balance |
| `/api/user/activity` | GET | Bearer | Active | Recent activity |
| `/api/summarize` | POST | Bearer | Active | Summarize text (deducts 5 credits) |
| `/api/credits/purchase` | POST | Bearer | Active | Purchase credits (mock payment) |
| `/api/webhooks/stripe` | POST | Signature | Active | Stripe webhook receiver |
| `/api/admin/auth/login` | POST | None | Active | Admin login |
| `/api/admin/auth/logout` | POST | Admin | Active | Admin logout |
| `/api/admin/auth/refresh` | POST | Admin | Active | Token refresh |
| `/api/admin/auth/verify` | GET | Admin | Active | Verify admin token |
| `/api/admin/system/health` | GET | Admin | Active | System health |
| `/api/admin/dashboard/metrics` | GET | Admin | Active | Dashboard metrics |
| `/api/admin/dashboard/realtime` | GET | Admin | Active | Realtime active tokens + events |
| `/api/admin/users` | GET | Admin | Active | User list (paginated) |
| `/api/admin/users/stats` | GET | Admin | Active | User aggregate stats |
| `/api/admin/users/:id` | GET/PUT/DELETE | Admin | Active | User CRUD |
| `/api/admin/users/:id/activity` | GET | Admin | Active | Per-user activity |
| `/api/admin/users/:id/suspend` | POST | Admin | Active | Suspend user |
| `/api/admin/users/:id/unsuspend` | POST | Admin | Active | Unsuspend user |
| `/api/admin/users/:id/credits` | GET | Admin | Active | User credit balance |
| `/api/admin/users/:id/credits/adjust` | POST | Admin | Active | Credit adjustment |
| `/api/admin/credits/bulk-adjust` | POST | Admin | Active | Bulk credit adjustment |
| `/api/admin/credits/transactions` | GET | Admin | Active | Credit transactions |
| `/api/admin/credits/stats` | GET | Admin | Active | Credit aggregate stats |
| `/api/admin/transactions` | GET | Admin | Active | All transactions |
| `/api/admin/transactions/stats` | GET | Admin | Active | Transaction stats |
| `/api/admin/transactions/:id` | GET | Admin | Active | Transaction detail |
| `/api/admin/transactions/:id/review` | POST | Admin | Active | Flag transaction for review |
| `/api/admin/transactions/:id/refund` | POST | Admin | Active | Refund transaction |
| `/api/admin/settings` | GET/PUT | Admin | Active | System settings |
| `/api/admin/system/alerts` | GET | Admin | Active | System alerts |
| `/api/admin/system/alerts/:id/acknowledge` | POST | Admin | Active | Acknowledge alert |
| `/api/admin/reports` | GET | Admin | Active | Reports list |
| `/api/admin/reports/generate` | POST | Admin | Active | Generate report |
| `/api/admin/backup/create` | POST | Admin | Active | Create backup snapshot |
| `/api/admin/backup/list` | GET | Admin | Active | List backups |
| `/api/admin/maintenance/schedule` | GET/POST | Admin | Active | Maintenance windows |
| `/api/admin/files/upload` | POST | Admin | Active | File upload (stub — multipart not active) |
| `/api/admin/files/:id` | DELETE | Admin | Active | Delete file record |
| `/api/admin/audit` | GET | Admin | Active | Audit event log |

## Phase 115 Security Changes

All API responses now include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- CORS headers with preflight handling (OPTIONS → 204)
