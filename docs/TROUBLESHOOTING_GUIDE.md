# Troubleshooting Guide and Error Catalog

Date: 2026-07-23 (Phase 072)

## Error Catalog

### Provider & API Errors

| Error Code / Message | Root Cause | Resolution |
|---|---|---|
| `401 Unauthorized (Provider)` | Invalid or expired API key configured in settings | Re-enter API key in Power-Up settings |
| `429 Too Many Requests` | Exceeded AI provider quota or rate limit | Wait for quota reset or upgrade provider plan |
| `500 Provider Server Error` | AI provider downtime or internal failure | Automatic fallback to local rule-based analysis |
| `Proxy URL invalid or non-HTTPS` | Security restriction: proxy must use HTTPS | Ensure proxy URL starts with `https://` |

### Trello Power-Up & Auth Errors

| Error Code / Message | Root Cause | Resolution |
|---|---|---|
| `Trello REST API token missing` | Trello user hasn't authorized Power-Up | Click "Authorize" link in Power-Up popup |
| `Card data fetch failed` | Trello network issue or insufficient permissions | Refresh card or verify board member access |
| `Comment post failed` | Trello write permission denied or rate limit | Verify Trello token permissions |

### System & Local Server Errors

| Error Code / Message | Root Cause | Resolution |
|---|---|---|
| `Backend startup blocked (Missing ENV)` | Missing `JWT_SECRET` or `ADMIN_PASSWORD` | Set required environment variables before launch |
| `Address already in use (EADDRINUSE)` | Local dev server port 17117 occupied | Set `PORT=17118 npm run dev` |

## Diagnostic Workflow

1. Run local doctor diagnostics: `npm run doctor`
2. Run backend diagnostics: `npm run doctor:backend`
3. Verify test suite: `npm test`
4. Inspect browser console for sanitized error messages.
