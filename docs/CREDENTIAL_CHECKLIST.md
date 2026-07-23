# Provider Credential Verification Checklist

Date: 2026-07-23 (Phase 063)

## Verification Steps for Operator Setup

- [ ] **OpenAI:** API key starts with `sk-`, key has access to `gpt-4o` / `gpt-4o-mini`, spend limits configured in OpenAI dashboard.
- [ ] **Anthropic:** API key starts with `sk-ant-`, key has access to `claude-3-5-sonnet`, workspace limits set.
- [ ] **Google AI:** API key generated from Google AI Studio, key has access to `gemini-1.5-flash`.
- [ ] **Cloudflare Proxy (Optional):** Worker deployed via `wrangler deploy`, CORS restricted to target domain, provider keys set via `wrangler secret`.
- [ ] **Local Dev Server:** Binds to `127.0.0.1`, security headers verified via `curl -I http://127.0.0.1:17117`.
