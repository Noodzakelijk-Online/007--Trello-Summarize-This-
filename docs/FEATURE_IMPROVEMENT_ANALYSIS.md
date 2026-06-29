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
- Extracts blockers, next actions, Robert decision items, and VA/team-ready actions from the existing summary and card data.
- Stores history, review state, feedback/corrections, and copy/export records in member-private Power-Up storage by default.
- Reads matching prior corrections back into the next analysis run as guidance, while keeping them distinct from verified Trello evidence.
- Avoids silently writing analysis results to shared card storage.
- Shows evidence, validation, decision, blocker, review-state, export/postback history, prior-correction, and correction panels in the active popup.

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
- It provides a safe admin autofill bookmarklet that fills matching Trello admin fields and capabilities, but does not save or submit the page.

Still recommended:

- Add one-click deployment documentation for the selected host once the public hosting target is chosen.

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

- AI providers are now prompted to return blockers, next actions, Robert decisions, VA/team-ready actions, missing information, evidence claims, validation findings, and confidence reasons directly.
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

### 5a. Large-Card AI Context Controls

Status: Implemented in `settings-powerup.html` and active AI provider calls.

- AI prompt comments can be set to 6, 12, 20, or 25 latest comments.
- Comment excerpts can be set to 400, 700, 1,200, or 1,500 characters each.
- Description context can be set to 1,500, 2,500, 4,000, or 5,000 characters.
- The settings panel warns that larger context sends more Trello content to the configured AI provider.

### 5b. Sensitive AI Handoff Approval

Status: Implemented in `settings-powerup.html` and the active popup.

- Client, financial, legal, and personal signals are detected before AI provider calls.
- When sensitive signals are present, the popup shows the local result first and requires explicit approval before sending card context to a configured AI provider.
- The setting is enabled by default and can be disabled by the user.
- Approved AI prompts include compact sensitive-signal metadata so the provider response can stay operational and avoid unnecessary private detail.

### 5c. Sensitive Export Approval

Status: Implemented in the active popup and ledger export records.

- The same sensitive-card signals now trigger a visible review step before copying or downloading detailed ledger exports.
- Sensitive Trello comment drafts cannot be copied or posted until the user reviews the exact draft and approves it.
- Export records store whether sensitive review was required and approved, including compact signal categories and matched terms.
- The flow keeps non-sensitive exports fast while making sensitive client, financial, legal, or personal handoffs explicit.

### 5d. Feedback-Guided Reanalysis

Status: Implemented in the active popup, `summarizer-core.js`, and `card-intelligence-ledger.js`.

- Feedback records now store the card id and title, so corrections can be matched back to the same card.
- The next run reads recent matching corrections from private storage and includes compact correction guidance in local analysis, AI prompts, source coverage, and the popup.
- Prior corrections are shown as guidance, not as verified Trello facts, to avoid turning user feedback into unsupported claims.
- Sensitive detection also sees correction text before provider handoff, so sensitive feedback does not silently travel to AI providers.

### 5e. Analysis Review State

Status: Implemented in the active popup and `card-intelligence-ledger.js`.

- Each analysis can be privately marked as reviewed, accepted, or needing follow-up.
- Review records are stored in member-private Power-Up storage and filtered to the current card's analysis run ids.
- The review panel starts from the calculated confidence/review-needed state, but the explicit user review state is stored separately from AI claims.

### 5f. Custom-Field Evidence Context

Status: Implemented in `summarizer-core.js`, `card-intelligence-ledger.js`, and the active popup data path.

- Trello custom field items are normalized into compact name, value, type, and id records when Trello exposes them.
- Custom fields are included in local insights, AI prompt context, source coverage, trust signals, card snapshots, and evidence claims.
- Field values are capped to 180 characters and the analyzer keeps at most 25 custom fields per card.
- Custom field evidence is treated as card context, not as a verified AI conclusion.

### 5g. Activity Evidence Context

Status: Implemented in `summarizer-core.js`, `card-intelligence-ledger.js`, and the active popup data path.

- Recent Trello card activity is read separately from comments when the Power-Up runtime exposes card actions.
- Comment actions are filtered out of the activity feed so comments remain their own evidence source.
- Activity records are normalized into compact id, type, text, date, and author fields.
- Activity is included in local history, local insights, AI prompt context, source coverage, trust signals, card snapshots, and evidence claims.
- Runtime collection is capped to 25 activity items, and prompt/evidence usage is capped to 12 activity items.
- Activity evidence is read-only and never triggers Trello writes.

### 5h. Custom Prompt Guidance

Status: Implemented in `settings-powerup.html`, `popup.html`, `summarizer-core.js`, and `card-intelligence-ledger.js`.

- Settings now include member-private Robert workflow guidance for AI prompts.
- Guidance is capped to 600 characters and sent only as part of the explicit AI prompt context.
- The prompt states that custom guidance cannot override evidence requirements, privacy safeguards, or Trello write-approval rules.
- Ledger runs store only whether custom guidance was present, its character count, and a short hash.
- Structured JSON exports do not include the full custom guidance text.

### 6. Attachment Content Extraction

Problem: Attachments are counted but not deeply summarized in the active Power-Up.

Status: Metadata intelligence implemented in `summarizer-core.js` and `card-intelligence-ledger.js`; deep content extraction remains deferred.

Implemented:

- Attachment metadata is normalized into compact name, MIME type, extension, category, extraction status, and error fields.
- Attachments are classified as document, transcript, recording, spreadsheet, presentation, image, link, or file without fetching content.
- Compact attachment metadata is included in local insights, AI prompt context, source coverage, evidence, snapshots, and validation findings.
- Transcript-like and recording-like attachments are explicitly flagged when their content was not verified as extracted.
- Prompt/evidence usage is capped to 12 attachment records; normalized runtime metadata is capped to 25 attachment records.
- Attachment URLs and extracted content are not sent in the AI prompt by this metadata-only slice.

Recommendation:

- Add optional attachment text extraction only for trusted HTTPS Trello attachment files.
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

Status: Mostly implemented for the active popup. It now copies markdown, plain text, status/email text, and structured ledger JSON; downloads compact JSON; generates a Trello comment draft; and gates Trello comment posting behind explicit review, checkbox approval, and a second confirmation. Sensitive-card exports and comment drafts require a visible approval step before copy, download, or Trello postback.

Recommendation:

- Add copy formats:
  - Markdown. Implemented with bounded evidence-backed claims and source coverage.
  - Plain text. Implemented with bounded evidence-backed claims and source coverage.
  - Structured JSON for Sneup/HAI ingestion. Implemented.
  - Trello comment. Implemented as an approval-gated draft/post flow with compact evidence/source notes when the Trello runtime exposes a supported comment API.
  - Email/status update. Implemented as a copy-ready status format with compact source coverage.
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

## Lower-Priority Improvements

- Bulk summarize selected cards or a full list.
- Saved custom prompt templates. First bounded custom guidance field is implemented; multi-template management remains future work.
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
8. Optional deeper board/list context, such as list-level trends across more than the bounded sample.
9. Attachment extraction through a safer backend path.

This order improves the existing user experience first, then expands capability where it needs more security and product design care.
