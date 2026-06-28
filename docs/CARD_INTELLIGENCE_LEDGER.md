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

## Storage

The active popup stores ledger history, feedback, and export records in Trello member-private Power-Up storage:

- `summarizeThisLedgerHistory`
- `summarizeThisFeedback`
- `summarizeThisExportRecords`

Local preview mode uses `localStorage` for the same keys. The popup no longer silently writes the latest analysis into shared card storage.

## Current Limits

- The history UI currently shows the saved run count, not a full run-by-run comparison.
- Attachment evidence is honest about metadata-only extraction; deeper PDF/Word/image extraction still needs a safer extraction path.
- No Trello comment or description writeback is implemented. Copy/export remains the safe default.
- The ledger uses deterministic rules around the existing summary; future prompt updates should ask AI providers to return the same structured schema directly.
