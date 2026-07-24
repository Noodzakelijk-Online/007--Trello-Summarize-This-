# API Contract and Error Envelope

Date: 2026-07-23 (Phase 009)

## Response Envelope

All backend JSON responses follow a consistent envelope:

### Success
```json
{ "success": true, "<resource>": { ... } }
```

### Error
```json
{ "success": false, "error": "Human-readable error message" }
```

### Health
```json
{ "status": "ok" | "ready" | "blocked", ... }
```

## Standard HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async/stub) |
| 204 | No content (OPTIONS preflight) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not found |
| 409 | Conflict (duplicate email) |
| 500 | Internal server error |
| 503 | Service unavailable (backend not ready) |

## Key Endpoints

### Health and Readiness
```
GET /api/health    → 200 { status, service, timestamp, readiness, trello }
GET /api/readiness → 200|503 { status, missing, optional }
GET /api/config    → 200 { host, port, trello, backend, paths }
```

### Auth
```
POST /api/auth/register { email, password, name } → 201 { success, user, token }
POST /api/auth/login    { email, password }        → 200 { success, user, token }
```

### User
```
GET  /api/user/profile  → 200 { success, user }
GET  /api/user/credits  → 200 { success, credits }
GET  /api/user/activity → 200 { success, activity }
POST /api/summarize { text } → 200 { success, summary, creditsUsed, remaining }
```

## Error Sanitization

All error messages shown to users pass through `sanitizeErrorMessage()` before display. This strips:
- Bearer tokens, API keys (`sk-*`, `Bearer *`, `api_key=*`)
- Trello tokens (`token=*`)
- Attachment URLs (`https://attachments.*`)
- PII patterns

See `ai-providers.js`, `trello-integration.js`, `attachment-processor.js`.

## Popup Provider Contract

The popup expects AI provider responses to be valid JSON matching:
```json
{
  "about": "string",
  "blockers": ["..."],
  "robertDecisions": ["..."],
  "vaReadyActions": ["..."],
  "nextSteps": ["..."],
  "evidenceClaims": ["..."],
  "validationFindings": ["..."],
  "unresolvedQuestions": ["..."],
  "waitingOn": ["..."],
  "unclearPoints": ["..."],
  "risks": ["..."],
  "insights": ["..."],
  "history": "string",
  "status": "string",
  "recommendations": ["..."]
}
```

Non-JSON or partial responses are handled gracefully with `parseProviderJson()`.
