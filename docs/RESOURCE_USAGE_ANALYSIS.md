# Resource Usage Analysis

Date: 2026-06-29

## Summary

The active Trello Power-Up is already lightweight because it is a static browser app. The biggest resource risk was not CPU or memory, but unbounded AI request size on very large cards and unnecessary static surface area in a Windows install. Both were reduced without removing user-facing features.

## Measured Footprint

Measured with:

```powershell
npm run analyze:resources
```

Current results:

- Active popup initial local files: about 300.6 KB (`popup.html`, `attachment-processor.js`, `summarizer-core.js`, `card-intelligence-ledger.js`, `icon.svg`).
- Windows installer runtime payload: about 450.5 KB.
- Whole repository source footprint, excluding `.git` and `dist`: about 1.65 MB.
- Generated Windows installer executable: 275,968 bytes.
- Large-card AI prompt after caps: 19,392 characters.
- Large-card prompt comments included: 12.
- Longest included comment: 700 characters.
- Included card description: 2,499 characters.

## Optimizations Applied

1. Bounded AI prompt size:
   - Card descriptions sent to AI default to 2,500 characters and can be set from 1,500 to 5,000 characters.
   - AI prompt comments default to the latest 12 comments and can be set from 6 to 25 comments.
   - Each included comment defaults to 700 characters and can be set from 400 to 1,500 characters.
   - Labels and members are capped to 25 each.
   - The prompt now asks for a structured operational schema so fewer downstream repair steps are needed.
   - Larger context settings are user-selected and warn that more Trello content is sent to the configured AI provider.
   - Output modes add a short prompt focus instruction without changing default comment or description caps.
   - Output language adds a short prompt instruction and compact ledger metadata without changing default comment or description caps.
   - Waiting-on extraction reuses bounded card, comment, activity, blocker, and AI summary context instead of adding another Trello read.
   - List context is bounded to at most 25 current-list card titles, labels, and due states, and can be disabled in settings.
   - Custom fields are capped to 25 compact name/value/type records, with values capped to 180 characters each.
   - Optional text/CSV attachment previews are capped before they enter the prompt, and the feature is off by default.

2. Bounded AI response size and time:
   - OpenAI and Google outputs are capped at 900 output tokens.
   - Anthropic output is capped at 900 tokens.
   - AI provider requests time out after 30 seconds and fall back cleanly in auto mode.
   - Sensitive-card detection runs before provider calls and keeps analysis local until the user explicitly approves AI handoff.
   - Provider key validation is user-triggered only, uses a 10-second timeout, and sends the smallest practical validation request.

3. Reduced background polling:
   - Trello card badge refresh moved from 60 seconds to 300 seconds.
   - This avoids repeated settings reads while keeping the badge useful.

4. Lightweight Windows runtime:
   - The installer includes only runtime static files and launcher scripts, not the full repository, docs, benchmarks, or prototype modules.
   - The Windows launcher uses PowerShell and a tiny local HTTP server, avoiding Electron and background services.
   - The Trello setup assistant, deployment presets, deployment guide, URL validation, readiness package, admin field map, and admin autofill helper add about 47.1 KB to the runtime payload and are not loaded by the active popup.
   - Runtime entry pages declare the existing `icon.svg` as their favicon, avoiding an extra failed `/favicon.ico` request in local preview.

5. No always-on service:
   - The installed app starts only when the user launches it.
   - Closing the launcher window stops the local server.

6. Lightweight ledger:
   - The card intelligence ledger runs in the popup only when an analysis is created.
   - It stores compact card snapshots with hashes instead of full descriptions.
   - History, review state, feedback, and export records use member-private Power-Up storage.
   - History comparison uses hashes, counts, and structured result metadata instead of re-reading full card bodies.
   - Prior feedback readback is capped to 5 compact correction records, with each correction capped before it is shown or sent as AI prompt guidance.
   - Section-specific correction metadata stores only bounded ids, so it improves reanalysis targeting without retaining extra card content.
   - Review-state history is filtered to current-card analysis run ids and capped to 8 visible records.
   - The Trello comment draft is generated from the existing ledger result and capped at 4,000 characters.
   - Export/postback history is filtered to current-card analysis run ids and capped to 8 visible records.
   - Plain text, status update, Robert decision, VA/team handoff, and JSON exports are generated on demand from the existing compact ledger result.
   - Mode-specific briefs are generated on demand from the existing compact ledger result.
   - Unresolved questions are compact derived records capped to 10 items and reuse existing evidence/source ids instead of storing full card text.
   - Runtime diagnostic logs are bounded and redact key-like strings, tokens, and URLs instead of printing raw Error objects or generated report payloads.
   - Local preview strips API keys from `localStorage` and saves only non-key settings; Trello runtime still uses member-private Power-Up storage for provider keys.
   - Waiting-on items are compact derived records capped to 6 items and reuse existing evidence/source ids instead of storing full card text.
   - Unclear or conflicting points are compact derived records capped to 6 items and reuse existing evidence/source ids instead of storing full card text.
   - Trello comment drafts cap individual list sections before the 4,000-character draft cap, preserving the source coverage and review footer on larger cards.
   - Human-readable export evidence/source notes are bounded to compact claim and source-coverage summaries instead of duplicating full card content.
   - Sensitive export approval stores only compact review metadata, categories, and matched signal terms instead of duplicating exported content.
   - Source coverage, trust signals, and list context store compact source statuses, warning labels, neighboring-card names, label counts, and confidence factors instead of duplicating full card bodies.
   - The list planning brief is generated on demand from existing bounded list context, capped to 12 sampled preview cards in the exported brief, and does not include neighboring descriptions, comments, attachments, or AI output.
   - The batch analysis plan is generated on demand from the same bounded list context, capped to 12 queue seed cards, and does not run AI, fetch neighboring full card bodies, or start background processing.
   - Custom field evidence stores compact field names and short values only, so it can support traceability without copying large card content.
   - Recent activity is capped to 25 normalized action records, with AI prompt and evidence usage capped to 12 records.
   - Attachment intelligence is metadata-first, capped to 25 normalized records and 12 AI prompt/evidence records. The Attachment facts panel renders from the same existing normalized records and caps visible facts to 8 rows.
   - Optional text/CSV extraction is off by default and only fetches small HTTPS text-like files, up to 5 attachments, 200 KB each, 3,000 extracted characters each, and a 10-second fetch timeout. Sensitive cards stay metadata-only until approval.
   - PDF, Word, image, audio, video, and arbitrary link attachments remain metadata-only in the active popup.
   - Custom prompt guidance is capped to 600 characters, saved prompt templates are capped to 10 member-private records, and ledger exports store only prompt/language metadata, not the full guidance text.
   - Cost budget tracking stores only compact provider, model, token, cost, card id/title, run id, and timestamp records in member-private storage, capped to 200 records.
   - Runtime timing metrics store only compact stage durations, provider/source, card id, run id, and timestamp in member-private storage, capped to 100 records.

## Resource Risk Review

### CPU

Low. The local summarizer and ledger use simple string processing, checklist counting, and keyword extraction. Runtime timing uses `performance.now()` marks during the existing analysis flow and does not add polling, animation loops, workers, or recurring CPU tasks. AI work runs on provider APIs, not locally.

### Memory

Low. The active popup loads a small static HTML page and three shared JS helpers. Runtime timing keeps only the latest compact timing records and renders the latest run's stage list. List planning and batch planning use the already-normalized bounded list context and render short focus/queue bullets. Optional text/CSV extraction is user-enabled and bounded, so it does not add background memory pressure. The local Windows launcher holds one lightweight PowerShell process while the local app is open.

### Disk

Low for installed users. The installer runtime payload is about 450.5 KB, and the generated `SummarizeThisSetup.exe` is 275,968 bytes because the payload is compressed into a self-extracting .NET Framework executable.

### Network

Moderate only when AI is enabled and approved. The app sends Trello card context to the selected AI provider or configured backend proxy, but sensitive client, financial, legal, or personal signals now force a local result first until the user approves the handoff. The same sensitive signals also require review before detailed export copy/download or Trello comment draft handoff. Prior correction text is included only as bounded guidance and participates in sensitive-signal detection. The prompt caps reduce token use, latency, and provider cost for large cards. Optional text/CSV attachment extraction adds bounded HTTPS fetches only when enabled in settings, and sensitive cards skip those fetches until approval. Per-provider monthly budget alerts now warn on estimated spend thresholds without adding any network calls. Runtime diagnostics now redact key-like strings, tokens, and URLs. In local-only mode no AI provider or proxy network request is made.

Local preview does not persist provider API keys, so AI-only mode requires either the Trello Power-Up runtime where member-private storage is available or a valid backend proxy endpoint. Proxy endpoints are saved only after normalization: HTTPS is required for Trello use, localhost/127.0.0.1 are allowed for development, and query strings, fragments, and embedded credentials are stripped or rejected.

### Trello Runtime

Low. The Power-Up reads card, board, list, and settings data on demand. Badge refresh now uses a slower interval to reduce background reads.

## Tradeoffs

- The default prompt caps preserve the feature but may omit very old or very long comment text from AI analysis. This is intentional: the latest 12 comments and card description usually carry the strongest context, and the local summary still uses structured metadata. Users can raise the caps for unusually large cards.
- The Windows `.exe` installer runs the standalone/local version. Trello Power-Up usage still requires hosting the static files on HTTPS, because Trello cannot load a private local Windows installer path inside Trello. The installed setup assistant now provides GitHub Pages, Netlify, Vercel, and custom HTTPS presets so the correct public connector URL can be prepared with less manual work.

## Remaining Opportunities

- Add Cloudflare WAF or managed rate limiting in front of the optional proxy endpoint for durable global quotas beyond the Worker-local per-client burst guard.
- Add explicit provider-response caching if repeated identical prompts become common and privacy policy allows it.
- Split the standalone `index.html` demo from the production install if the installer should become even smaller.
