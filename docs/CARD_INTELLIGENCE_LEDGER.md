# Card Intelligence Ledger

Date: 2026-06-29

## Status

The first working ledger slice is implemented in `card-intelligence-ledger.js` and wired into the active `popup.html` runtime.

## What It Adds

- `CardSnapshot`: compact card state at analysis time, using a description hash instead of storing the full description.
- `AnalysisRun`: provider/model metadata, input hash, timing, structured result, and audit event.
- `EvidenceClaim`: summary claims linked to card title, description, list, due date, checklist, comment, attachment, label, or member evidence.
- `Blocker`: explicit and implied blockers from card text, missing context, overdue state, low checklist progress, and attachment extraction limitations.
- `NextAction`: extracted next steps plus open checklist items.
- `DecisionItem`: Robert-specific approval or Yes/No decision candidates.
- `VA/team-ready action`: delegate-ready actions that do not require Robert approval.
- `ValidationFinding`: missing context, attachment metadata-only state, weak next actions, and decision review signals.
- `HumanFeedback`: private correction/rating records.
- `ExportRecord`: private copy/export history.
- History comparison: source-data, description, checklist, comment, attachment, blocker, decision, VA action, and confidence changes between runs.
- Operational AI schema: providers are prompted to return blockers, next actions, Robert decisions, VA-ready actions, missing information, evidence claims, validation findings, and confidence reasons directly.
- Ledger export formats: the popup can copy markdown, plain text, status/email text, copy structured JSON, and download compact JSON for Sneup/HAI-style ingestion.
- Trello comment approval: the popup generates an exact comment draft, supports copy-only use, and only attempts Trello posting after the user checks an approval box and confirms the action.

## Storage

The active popup stores ledger history, feedback, and export records in Trello member-private Power-Up storage:

- `summarizeThisLedgerHistory`
- `summarizeThisFeedback`
- `summarizeThisExportRecords`

Local preview mode uses `localStorage` for the same keys. The popup no longer silently writes the latest analysis into shared card storage.

## Current Limits

- The history UI shows the current run, recent previous runs, change summary, confidence trend, and copy controls for older runs.
- Attachment evidence is honest about metadata-only extraction; deeper PDF/Word/image extraction still needs a safer extraction path.
- JSON export uses the compact ledger run and card snapshot. It does not include full card descriptions, but evidence excerpts may still contain card context selected by the analysis.
- Trello comment writeback is capability-dependent. If the Trello Power-Up runtime does not expose a supported comment API, the popup remains copy-only.
- Trello description writeback is not implemented.
- The ledger still keeps deterministic extraction as a fallback when an AI provider omits structured operational fields.
