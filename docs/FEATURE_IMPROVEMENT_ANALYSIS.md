# Feature Improvement Analysis

Date: 2026-05-24

## Product Direction

The tool is strongest as a Trello card understanding assistant: it should quickly explain what a card is about, what happened, what is blocked, and what the next practical action should be. The best next improvements should reduce setup friction, improve summary usefulness, and make the user trust the output.

## Highest-Value Improvements

### 0. Card Intelligence Ledger

Problem: The active Power-Up previously produced a summary but did not preserve a structured, evidence-backed operational record for the card.

Status: First working slice implemented in `card-intelligence-ledger.js` and `popup.html`.

Implemented:

- Creates a private analysis run per card with a card snapshot, input hash, provider/model metadata, structured result, evidence claims, validation findings, and audit event.
- Extracts blockers, waiting-on items, unclear/conflicting points, next actions, Robert decision items, VA/team-ready actions, and unresolved questions from the existing summary and card data.
- Shows compact operational metadata such as owner, priority, severity, risk, category, Robert-required status, and delegation safety in popup lists and copied briefs.
- Stores history, review state, feedback/corrections, and copy/export records in member-private Power-Up storage by default.
- Reads matching prior corrections back into the next analysis run as guidance, while keeping them distinct from verified Trello evidence.
- Avoids silently writing analysis results to shared card storage.
- Shows evidence, validation, decision, blocker, waiting-on, unclear-point, unresolved-question, review-state, export/postback history, prior-correction, and correction panels in the active popup.

Impact: High. This turns the active popup into the first real card intelligence layer instead of only a summary display.

### 1. Trello Setup Assistant

Problem: The Windows installer can run the standalone tool locally, but Trello Power-Up use still needs HTTPS hosting and Trello admin configuration.

Status: Improved in `trello-setup.html` and `trello-admin-config.js`.

Implemented:

- The setup assistant explains that local Windows mode and Trello Power-Up mode are separate.
- It provides deployment presets for GitHub Pages, Netlify, Vercel, and custom HTTPS hosting.
- It validates setup readiness so placeholder, local, file, and non-HTTPS URLs are not shown as Trello-ready.
- It generates the hosted HTTPS iframe Connector URL, icon URL, manifest values, and capability list.
- It provides a copy-all setup block for manual Trello Power-Up admin entry.
- It shows host-specific deployment steps and verification checks for GitHub Pages, Netlify, Vercel, or custom HTTPS hosting.
- It provides a safe admin autofill bookmarklet that runs only on Trello's Power-Up admin page, fills matching Trello admin fields and capabilities, reports filled/missing fields, and does not save or submit the page.
- It now renders a readiness checklist for HTTPS hosting, connector/manifest/icon URLs, required capabilities, and manual-save safety.
- It can copy a deployment guide, Trello admin runbook, or JSON setup package containing exact admin values, validation state, deployment steps, manual steps, safety notes, and the autofill helper.

Still recommended:

- Add host-specific screenshots or videos once the final hosting target is chosen.

Impact: High. Setup is the biggest barrier for non-technical users.

### 2. Provider Key Validation

Problem: Users can save invalid AI keys and only discover the issue during analysis.

Status: Implemented in `settings-powerup.html`.

Implemented:

- Added user-triggered "Test key" buttons for OpenAI, Google AI, and Anthropic in settings.
- Shows clear success or provider-specific error text without saving the key first.
- Keeps local fallback and Auto mode available even if validation fails.
- Uses short timeouts and tiny validation requests to avoid meaningful background resource cost.

Impact: High. Makes onboarding calmer and reduces failed first runs.

### 3. Summary History Per Card

Problem: The current tool can store the latest summary, but users benefit from seeing how the summary changed over time.

Status: Implemented through the private card intelligence ledger and active popup History panel.

Implemented:

- Shows a compact History view in the popup.
- Stores timestamp, provider, model, confidence, and structured summary snapshot.
- Shows what changed since the previous analysis and a confidence trend.
- Allows copying older structured summaries.

Impact: Medium-high. Useful for project managers and async status tracking.

### 4. Action-Oriented Output Modes

Problem: Different users need different outputs from the same card.

Status: Implemented through the operational AI schema, ledger extraction, settings, and mode-specific exports.

Implemented:

- AI providers are now prompted to return blockers, waiting-on items, unclear points, next actions, Robert decisions, VA/team-ready actions, missing information, unresolved questions, evidence claims, validation findings, and confidence reasons directly.
- The ledger preserves these structured AI fields when present and still falls back to deterministic extraction.
- Settings now include user-selectable output modes:
  - Operational ledger.
  - Status update.
  - Risk review.
  - Meeting brief.
  - Next-action checklist.
  - Client-friendly summary.
- AI prompts include the selected output mode and mode-specific focus instruction.
- Ledger runs and JSON exports preserve the selected output mode.
- The active popup can copy a selected-mode brief without changing Trello or posting anything.

Impact: High. This expands usefulness without changing the core architecture.

### 5. Board/List Context

Problem: A single card can be misleading without nearby board context.

Status: Implemented for the active popup as bounded list context. The settings panel can enable or disable current-list context; when enabled, the popup reads a compact sample of current-list card titles, labels, and due state, then stores summary-only metadata in the ledger and AI prompt.

Recommendation:

- Keep list context bounded to compact neighboring-card metadata.
- Do not include neighboring card descriptions, comments, or attachments unless a later explicit privacy setting is added.
- Use the list-context source coverage signal to tell users when the read failed or was disabled.

Impact: Medium. Stronger summaries for planning workflows.

### 5a. Current-List Planning Brief

Problem: Robert needs lightweight list-level planning context, but full-list AI batch analysis would increase cost, privacy exposure, and runtime risk.

Status: Implemented in `summarizer-core.js` and the active popup as an export-only planning brief. When bounded list context is available, the popup can copy a Markdown brief or structured JSON containing the current card position, nearby cards, common labels, due signals, and suggested next focus.

Safety/resource notes:

- Uses bounded list metadata only: card names, labels, due state, and current position.
- Does not include neighboring card descriptions, comments, attachments, or AI output.
- Does not post to Trello or change card data.
- Uses the existing sensitive-export approval flow before copying detailed list exports.

Impact: Medium. This gives a practical multi-card planning view now while keeping full batch AI analysis as a separate approval-gated future feature.

### 5b. Batch Analysis Plan

Problem: The repository advertised batch processing, but the older batch processor is disconnected from the active popup and assumes broad card processing before the newer privacy and approval rules.

Status: Implemented in `summarizer-core.js` and the active popup as a bounded review queue. When list context is available, the popup can copy a Markdown batch plan or structured JSON queue seed.

Safety/resource notes:

- Uses the same bounded list metadata as list planning: card names, optional ids, labels, due state, and current position.
- Does not fetch neighboring descriptions, comments, attachments, or full card bodies.
- Does not call AI or run batch processing automatically.
- Sets AI handoff to off by default, recommends concurrency 1 and a short delay, and includes an approval checklist for any later full-card batch run.
- Uses the existing sensitive-export approval flow before copying detailed batch plan exports.

Impact: Medium. This makes batch work actionable without reviving unsafe full-list AI execution.

### 5c. Large-Card AI Context Controls

Status: Implemented in `settings-powerup.html` and active AI provider calls.

- AI prompt comments can be set to 6, 12, 20, or 25 latest comments.
- Comment excerpts can be set to 400, 700, 1,200, or 1,500 characters each.
- Description context can be set to 1,500, 2,500, 4,000, or 5,000 characters.
- The settings panel warns that larger context sends more Trello content to the configured AI provider.

### 5d. Sensitive AI Handoff Approval

Status: Implemented in `settings-powerup.html` and the active popup.

- Client, financial, legal, and personal signals are detected before AI provider calls.
- When sensitive signals are present, the popup shows the local result first and requires explicit approval before sending card context to a configured AI provider.
- The setting is enabled by default and can be disabled by the user.
- Approved AI prompts include compact sensitive-signal metadata so the provider response can stay operational and avoid unnecessary private detail.

### 5e. Sensitive Export Approval

Status: Implemented in the active popup and ledger export records.

- The same sensitive-card signals now trigger a visible review step before copying or downloading detailed ledger exports.
- Sensitive Trello comment drafts cannot be copied or posted until the user reviews the exact draft and approves it.
- Export records store whether sensitive review was required and approved, including compact signal categories and matched terms.
- The flow keeps non-sensitive exports fast while making sensitive client, financial, legal, or personal handoffs explicit.

### 5f. Feedback-Guided Reanalysis

Status: Implemented in the active popup, `summarizer-core.js`, and `card-intelligence-ledger.js`.

- Feedback records now store the card id and title, so corrections can be matched back to the same card.
- The correction panel lets the user select the exact wrong or incomplete output sections, including blockers, waiting-on items, unclear points, next actions, Robert decisions, VA/team-ready actions, evidence/validation, and unresolved questions.
- The next run reads recent matching corrections from private storage and includes compact correction guidance in local analysis, AI prompts, source coverage, and the popup.
- Prior corrections are shown as guidance, not as verified Trello facts, to avoid turning user feedback into unsupported claims.
- Sensitive detection also sees correction text before provider handoff, so sensitive feedback does not silently travel to AI providers.

### 5g. Analysis Review State

Status: Implemented in the active popup and `card-intelligence-ledger.js`.

- Each analysis can be privately marked as reviewed, accepted, or needing follow-up.
- Review records are stored in member-private Power-Up storage and filtered to the current card's analysis run ids.
- The review panel starts from the calculated confidence/review-needed state, but the explicit user review state is stored separately from AI claims.

### 5h. Custom-Field Evidence Context

Status: Implemented in `summarizer-core.js`, `card-intelligence-ledger.js`, and the active popup data path.

- Trello custom field items are normalized into compact name, value, type, and id records when Trello exposes them.
- Custom fields are included in local insights, AI prompt context, source coverage, trust signals, card snapshots, and evidence claims.
- Field values are capped to 180 characters and the analyzer keeps at most 25 custom fields per card.
- Custom field evidence is treated as card context, not as a verified AI conclusion.

### 5i. Activity Evidence Context

Status: Implemented in `summarizer-core.js`, `card-intelligence-ledger.js`, and the active popup data path.

- Recent Trello card activity is read separately from comments when the Power-Up runtime exposes card actions.
- Comment actions are filtered out of the activity feed so comments remain their own evidence source.
- Activity records are normalized into compact id, type, text, date, and author fields.
- Activity is included in local history, local insights, AI prompt context, source coverage, trust signals, card snapshots, and evidence claims.
- Runtime collection is capped to 25 activity items, and prompt/evidence usage is capped to 12 activity items.
- Activity evidence is read-only and never triggers Trello writes.

### 5j. Custom Prompt Guidance

Status: Implemented in `settings-powerup.html`, `popup.html`, `summarizer-core.js`, and `card-intelligence-ledger.js`.

- Settings now include member-private Robert workflow guidance for AI prompts.
- Guidance is capped to 600 characters and sent only as part of the explicit AI prompt context.
- The prompt states that custom guidance cannot override evidence requirements, privacy safeguards, or Trello write-approval rules.
- Ledger runs store only whether custom guidance was present, its character count, and a short hash.
- Structured JSON exports do not include the full custom guidance text.

### 5k. Saved Prompt Templates

Status: Implemented in `settings-powerup.html`, `popup.html`, `summarizer-core.js`, and `card-intelligence-ledger.js`.

- Settings now support up to 10 saved member-private prompt guidance templates.
- Each template has a name capped to 60 characters and active guidance capped to 600 characters.
- Selecting a template loads its guidance into the active prompt field, then the active guidance is used by AI prompts.
- AI prompt payloads include only the selected template id/name plus the active guidance, not the full template library.
- Ledger runs and JSON exports preserve selected template id/name plus the existing guidance hash and character count, not the full guidance text.
- Legacy single-field custom guidance still works when no saved template is selected.

### 5l. Output Language Preference

Status: Implemented in `settings-powerup.html`, `popup.html`, `summarizer-core.js`, and `card-intelligence-ledger.js`.

- Settings now support English or Dutch as the member-private output language preference.
- AI prompts include the selected language as an explicit instruction while keeping JSON schema field names stable for exports, Sneup, and HAI.
- The active popup shows the selected output language in the export panel.
- Ledger runs and structured JSON exports preserve the requested language without storing full prompt text.

### 6. Attachment Content Extraction

Problem: Attachments are counted but not deeply summarized in the active Power-Up.

Status: Metadata intelligence and optional bounded text/CSV extraction are implemented in `attachment-processor.js`, `popup.html`, `settings-powerup.html`, `summarizer-core.js`, and `card-intelligence-ledger.js`; deep binary/document extraction remains deferred.

Implemented:

- Attachment metadata is normalized into compact name, MIME type, extension, category, extraction status, and error fields.
- Attachments are classified as document, transcript, recording, spreadsheet, presentation, image, link, or file without fetching content.
- Compact attachment metadata is included in local insights, AI prompt context, source coverage, evidence, snapshots, and validation findings.
- Transcript-like and recording-like attachments are explicitly flagged when their content was not verified as extracted.
- Prompt/evidence usage is capped to 12 attachment records; normalized runtime metadata is capped to 25 attachment records.
- Settings now include an off-by-default option to extract small HTTPS text-like attachments (`.txt`, `.md`, `.csv`, `.tsv`) with strict attachment count, byte, timeout, and character caps.
- Extracted text previews are bounded before they enter source coverage, evidence, ledger JSON, or AI prompt context.
- PDFs, Word files, spreadsheets other than CSV/TSV, images, audio, video, and arbitrary links remain metadata-only in the active popup.

Recommendation:

- Prefer backend extraction for PDFs/docs to avoid browser-side arbitrary fetch risks.
- Show attachment-derived facts separately so users know where claims came from.

Impact: Medium-high, but should be implemented carefully for security and resource use.

### 7. Better Trust Signals

Problem: Users need to know why the summary is confident or uncertain.

Status: Implemented for the active popup. It now shows Source coverage plus a Trust signals panel with Based on chips, missing-context warnings, and a compact Why this score rationale from confidence factors.

Recommendation:

- Show “Based on” chips: description, comments, checklist, labels, due date, attachments.
- Show missing-context warnings, such as “No owner” or “No description.”
- Add a compact “Why this score?” tooltip.

Impact: Medium. Improves confidence without adding heavy features.

### 8. One-Click Export Formats

Problem: Copying markdown is useful, but some workflows need issue comments, email text, or meeting notes.

Status: Mostly implemented for the active popup. It now copies markdown, plain text, selected mode briefs, Robert decision briefs, VA/team handoff briefs, status/email text, and structured ledger JSON; downloads compact JSON; generates a Trello comment draft; and gates Trello comment posting behind explicit review, checkbox approval, and a second confirmation. Sensitive-card exports and comment drafts require a visible approval step before copy, download, or Trello postback.

Recommendation:

- Add copy formats:
  - Markdown. Implemented with bounded evidence-backed claims and source coverage.
  - Plain text. Implemented with bounded evidence-backed claims and source coverage.
  - Structured JSON for Sneup/HAI ingestion. Implemented.
  - Trello comment. Implemented as an approval-gated draft/post flow with compact evidence/source notes when the Trello runtime exposes a supported comment API.
  - Email/status update. Implemented as a copy-ready status format with compact source coverage.
  - Robert decision brief. Implemented as a copy-ready brief with Yes/No framing, blockers, waiting states, unclear points, confidence, evidence claims, and source coverage.
  - VA/team handoff brief. Implemented as a copy-ready handoff separating delegated actions, waiting states, unclear points, and unresolved questions from Robert-only decisions.
- Show recent export/postback records. Implemented as a private per-card popup panel filtered to the current card's analysis run ids.

Impact: Medium. Low implementation cost, high workflow usefulness.

### 9. Cost Budget Alerts

Problem: The popup showed estimated per-run cost, but users had no guardrail for monthly provider spend.

Status: Implemented in `settings-powerup.html`, `popup.html`, and `summarizer-core.js`.

Implemented:

- Settings now supports per-provider monthly budget limits for OpenAI, Google AI, and Anthropic.
- The warning threshold is configurable at 50%, 75%, 80%, 90%, or 100%.
- Completed AI runs write compact member-private cost records with provider, model, token count, cost estimate, card id/title, run id, and timestamp.
- The popup evaluates the current run against the current-month provider budget and shows a visible warning or exceeded alert when applicable.
- Local-only runs and providers without configured limits do not create budget noise.

Impact: Medium. This reduces surprise API spend without blocking analysis or adding a backend.

### 10. Runtime Timing Metrics

Problem: The tool had static footprint checks, but no lightweight in-popup way to spot slower analysis runs over time.

Status: Implemented in `popup.html` and `summarizer-core.js`.

Implemented:

- Each completed analysis records compact stage timings for card context read, local summary, AI provider call when used, ledger build, and history/review UI work.
- Timing records are stored in member-private Power-Up storage and capped to 100 records.
- Records include only run id, card id, provider/source, duration values, and timestamp; they do not include card content, prompt text, API keys, or attachment text.
- The popup shows the latest total duration, recent average, slowest stored run, and the latest stage breakdown.

Impact: Medium. This gives future regression checks a user-visible baseline without adding polling, background services, or network calls.

## Lower-Priority Improvements

- Execute the reviewed batch queue for selected cards, a full list, or a board with approval-gated AI handoff and visible rate-limit controls.
- Dark mode.
- Localization for Dutch and English.
- Optional update checker for the Windows installer.

## Implementation Order

1. Provider key validation.
2. Output modes.
3. Summary history view.
4. Trello setup assistant.
5. Trust signals.
6. Export formats.
7. Cost budget alerts.
8. Runtime timing metrics.
9. Saved prompt templates.
10. Current-list planning brief.
11. Batch analysis plan.
12. Optional deeper board/list context, such as list-level trends across more than the bounded sample.
13. Attachment extraction through a safer backend path.

This order improves the existing user experience first, then expands capability where it needs more security and product design care.
