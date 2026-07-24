# Security

Date: 2026-07-23 (Phase 115)

## Credential Handling

**Critical rules:**
- API keys (OpenAI, Anthropic, Google) are stored in browser member-private Trello storage only. They are never logged or transmitted to the Trello server.
- Proxy endpoint credentials are configured separately from browser-held keys.
- Backend JWT secret and admin password must be provided as environment variables — never hardcoded.
- The `proxy/.dev.vars` file is `.gitignore`d and must never be committed.
- Error messages are sanitized in all three integration modules (`ai-providers.js`, `trello-integration.js`, `attachment-processor.js`) to strip tokens, keys, and sensitive URLs before display.

## AI Summary Honesty Boundaries

- AI summaries must separate facts, inferences, uncertainty, and unsupported claims.
- Confidence scores are review signals, not measured accuracy guarantees.
- Do not claim 99.9% accuracy without measured evidence.
- Attachment text must not be claimed as read unless extraction actually succeeded.

## Sensitive Card Gating

- Cards matching sensitive signal patterns (client, financial, legal) are gated.
- Sensitive card attachment text extraction and provider AI handoff are blocked until explicit operator approval.
- The `detectSensitiveSignals` function in `summarizer-core.js` drives this gate.

## Trello Comment Safety

- Trello comment posting is approval-gated. The user must review and tick approval before any comment can be posted.
- Auto-posting is not implemented and must never be added without explicit approval flow.

## Local Dev Server Security (Phase 115)

The local dev server (`local-dev-server.js`) now sends:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: no-referrer`
- CORS headers for local development
- OPTIONS preflight handling
- Graceful SIGINT/SIGTERM shutdown

## Backend API Security (Phase 115)

The backend API (`backend-app.js`) now sends:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- CORS headers with preflight handling

## Known Security Gaps (Not Production-Safe)

| Gap | Risk | Mitigation Required |
|---|---|---|
| Backend stores passwords in plaintext | High | Add bcrypt or argon2 hashing before production deployment |
| In-memory token store | Medium | Lost on restart; add persistent session store for production |
| No rate limiting on API endpoints | Medium | Add rate limiting middleware before production deployment |
| No HTTPS enforcement in backend | Medium | Run behind reverse proxy (nginx/caddy) with TLS |
| Backend CORS allows all origins | Low (dev only) | Restrict to known origins in production |

## Update Check Safety

- Update manifests are fetched with `credentials: "omit"` and `referrerPolicy: "no-referrer"`.
- Only URLs from `github.com/Noodzakelijk-Online/007--Trello-Summarize-This-` or `raw.githubusercontent.com` are accepted.
- Download URLs from any other domain are rejected by `safeUpdateUrl()` in `summarizer-core.js`.
- Update checks are not triggered automatically on page load.

## No Secrets Committed

Verified on 2026-07-23:
- `.gitignore` covers `.npm-cache/`, `.tmp/`, and `proxy/.dev.vars`.
- No API keys, tokens, or credentials appear in committed source files.
- `trello-config.js` contains a placeholder comment, not a real key.
