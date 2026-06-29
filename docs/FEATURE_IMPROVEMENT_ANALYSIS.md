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
- Stores history, feedback/corrections, and copy/export records in member-private Power-Up storage by default.
- Avoids silently writing analysis results to shared card storage.
- Shows evidence, validation, decision, blocker, and correction panels in the active popup.

Impact: High. This turns the active popup into the first real card intelligence layer instead of only a summary display.

### 1. Trello Setup Assistant

Problem: The Windows installer can run the standalone tool locally, but Trello Power-Up use still needs HTTPS hosting and Trello admin configuration.

Status: Improved in `trello-setup.html` and `trello-admin-config.js`.

Implemented:

- The setup assistant explains that local Windows mode and Trello Power-Up mode are separate.
- It generates the hosted HTTPS iframe Connector URL, icon URL, manifest values, and capability list.
- It provides a copy-all setup block for manual Trello Power-Up admin entry.
- It provides a safe admin autofill bookmarklet that fills matching Trello admin fields and capabilities, but does not save or submit the page.

Still recommended:

- Add deployment presets for Netlify, Vercel, and GitHub Pages.

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

Recommendation:

- Optionally include list name, neighboring card count, and label patterns.
- For AI mode, summarize how this card relates to its list or sprint.
- Keep this optional to avoid extra Trello reads and larger prompts.

Impact: Medium. Stronger summaries for planning workflows.

### 5a. Large-Card AI Context Controls

Status: Implemented in `settings-powerup.html` and active AI provider calls.

- AI prompt comments can be set to 6, 12, 20, or 25 latest comments.
- Comment excerpts can be set to 400, 700, 1,200, or 1,500 characters each.
- Description context can be set to 1,500, 2,500, 4,000, or 5,000 characters.
- The settings panel warns that larger context sends more Trello content to the configured AI provider.

### 6. Attachment Content Extraction

Problem: Attachments are counted but not deeply summarized in the active Power-Up.

Recommendation:

- Add optional attachment text extraction only for trusted HTTPS Trello attachment files.
- Prefer backend extraction for PDFs/docs to avoid browser-side arbitrary fetch risks.
- Show attachment-derived facts separately so users know where claims came from.

Impact: Medium-high, but should be implemented carefully for security and resource use.

### 7. Better Trust Signals

Problem: Users need to know why the summary is confident or uncertain.

Status: Partially implemented. The active popup now shows Source coverage with available, partial, missing, and failed source reads for card fields, board/list context, comments, checklists, attachments, members, labels, due date, and custom fields.

Recommendation:

- Show “Based on” chips: description, comments, checklist, labels, due date, attachments.
- Show missing-context warnings, such as “No owner” or “No description.”
- Add a compact “Why this score?” tooltip.

Impact: Medium. Improves confidence without adding heavy features.

### 8. One-Click Export Formats

Problem: Copying markdown is useful, but some workflows need issue comments, email text, or meeting notes.

Status: Mostly implemented for the active popup. It now copies markdown, plain text, status/email text, and structured ledger JSON; downloads compact JSON; generates a Trello comment draft; and gates Trello comment posting behind explicit review, checkbox approval, and a second confirmation.

Recommendation:

- Add copy formats:
  - Markdown. Implemented.
  - Plain text. Implemented.
  - Structured JSON for Sneup/HAI ingestion. Implemented.
  - Trello comment. Implemented as an approval-gated draft/post flow when the Trello runtime exposes a supported comment API.
  - Email/status update. Implemented as a copy-ready status format.

Impact: Medium. Low implementation cost, high workflow usefulness.

## Lower-Priority Improvements

- Bulk summarize selected cards or a full list.
- Saved custom prompt templates.
- Cost budget alerts per provider.
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
7. Optional board/list context.
8. Attachment extraction through a safer backend path.

This order improves the existing user experience first, then expands capability where it needs more security and product design care.
