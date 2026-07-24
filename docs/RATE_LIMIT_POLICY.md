# Rate Limits, Cooldowns, and Provider Quotas

Date: 2026-07-23 (Phase 018)

## AI Provider Rate Limits

| Provider | Default limits | Handling |
|---|---|---|
| OpenAI | RPM / TPM per tier | 429 error returned to user with sanitized message |
| Anthropic | RPM / TPM per tier | 429 error returned to user with sanitized message |
| Google AI | RPM / TPM per tier | 429 error returned to user with sanitized message |

The popup does not implement automatic retry with backoff for provider rate limit errors. The user sees a clear error message and can retry manually.

## Proxy Rate Limits

The Cloudflare Worker reference proxy enforces:
- Per-IP rate limiting (configurable in `proxy/cloudflare-worker.mjs`)
- HTTPS-only enforcement
- No credential forwarding to the browser

## Budget Limits (User-Configured)

Users can set per-provider monthly spend limits in settings:

```
budget.providerMonthlyLimits.openai = 0.01   (e.g. $0.01/month)
budget.warningPercent = 75                     (warn at 75% of limit)
```

`evaluateBudgetAlert()` in `summarizer-core.js`:
- Returns `status: "warning"` when projected total exceeds `warningPercent` of limit
- Returns `status: "exceeded"` when projected total would exceed the limit
- Returns `status: "disabled"` when provider is "Local rules" (no cost)
- Returns `status: "ok"` when within budget

## Provider Quota Management Gaps

| Gap | Status |
|---|---|
| Automatic retry with exponential backoff | Missing — user retries manually |
| Cross-session request counting | Missing — counts reset per session |
| Real-time provider quota polling | Blocked — provider APIs don't expose quotas |
| Persistent budget tracking across sessions | Partial — cost records in ledger only for current session |

## Backend Rate Limiting

The backend API has no rate limiting in the current implementation. This must be added before any public-facing deployment:

- Add per-IP rate limiting middleware
- Add per-user request throttling on `/api/summarize`
- Add admin login brute-force protection
