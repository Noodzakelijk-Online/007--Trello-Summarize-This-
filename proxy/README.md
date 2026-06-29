# Optional AI Proxy

This folder contains an optional Cloudflare Worker that keeps OpenAI, Google AI, or Anthropic provider keys server-side while the Trello Power-Up remains a static HTML/CSS/JavaScript app.

The Power-Up sends the bounded prompt produced by `summarizer-core.js` to this Worker. The Worker adds the provider API key from Cloudflare secrets, calls the selected provider, and returns the same structured summary shape expected by `popup.html`.

## What It Protects

- Provider API keys are not stored in Trello, local preview, or the browser when proxy mode is enabled.
- The Worker validates request size, schema, provider choice, prompt length, content type, and allowed origin before calling a provider.
- The Worker applies a lightweight per-origin/per-client request limit before reading or forwarding the prompt.
- Provider errors are redacted before being returned.
- Responses use `Cache-Control: no-store`.

## What It Does Not Replace

- Sensitive-card approval in the popup still controls whether card context may leave the browser.
- Cloudflare WAF or managed rate limiting is still recommended for durable global quotas on a public endpoint.
- This proxy does not store analysis history. The Power-Up ledger remains member-private/client-side.

## Deploy

1. Copy `wrangler.example.jsonc` to `wrangler.jsonc`.
2. Set `ALLOWED_ORIGINS` in `wrangler.jsonc` to the exact HTTPS origin that hosts the Power-Up static files.
3. Set `RATE_LIMIT_PER_MINUTE` to the maximum number of proxy requests one client/origin pair may make per minute. Use `0` only for trusted local testing.
4. Add provider secrets with Wrangler:

```powershell
wrangler secret put OPENAI_API_KEY
wrangler secret put GOOGLE_API_KEY
wrangler secret put ANTHROPIC_API_KEY
```

Only one provider secret is required. Set `DEFAULT_PROVIDER` to the provider you want `auto` mode to prefer.

5. Deploy:

```powershell
wrangler deploy --config proxy/wrangler.jsonc
```

6. In Summarize This settings, enable **Use backend proxy for AI calls** and paste the deployed Worker URL as the proxy endpoint.

## Local Development

Copy `.dev.vars.example` to `.dev.vars` and fill in one provider key. Do not commit `.dev.vars`.

```powershell
wrangler dev --config proxy/wrangler.jsonc
```

For local Power-Up preview, set the proxy endpoint to the local Worker URL. Local preview accepts `http://localhost` and `http://127.0.0.1`; Trello Power-Up mode should use HTTPS.

## Request Shape

The static popup sends:

```json
{
  "schemaVersion": "summarize-this-ai-proxy-request-v1",
  "provider": "auto",
  "model": "",
  "strategy": "cost-effective",
  "outputMode": "operational-ledger",
  "outputLanguage": "en",
  "prompt": "bounded AI prompt"
}
```

The Worker returns:

```json
{
  "summary": {
    "about": "...",
    "history": "...",
    "currentStatus": "...",
    "nextSteps": [],
    "blockers": [],
    "robertDecisions": [],
    "vaReadyActions": [],
    "evidenceClaims": [],
    "validationFindings": []
  },
  "metadata": {
    "provider": "OpenAI via proxy",
    "model": "gpt-4o-mini",
    "tokens": 0,
    "cost": 0
  }
}
```
