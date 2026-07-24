# Idempotency Model

Date: 2026-07-23 (Phase 017)

## Power-Up Idempotency

### Analysis Runs

Each analysis run is assigned a unique `runId` (UUID). Re-running analysis on the same card creates a new ledger entry — it does not overwrite previous results. The full history is preserved per card.

The `findReusableLedgerRun()` function in the popup checks whether a cached result exists with the same card context signature (`aiConnectorSignature`). If a match is found within the cache TTL, it is reused without making a new provider call.

### Export Records

Export operations append a new record to the ledger. They do not delete or replace previous exports.

### Trello Comment Posting

Trello comment POST is not idempotent at the Trello API level. The approval gate (explicit user tick + single-post flow) prevents accidental double-posting. Once posted, the popup clears the draft state.

### Settings Writes

Settings are written to Trello member-private storage with `t.set()`. This is a last-write-wins operation. Concurrent settings changes from multiple browser tabs for the same Trello member may conflict — this is a known limitation.

## Backend Idempotency

### User Registration

Duplicate email registration returns `409 Conflict`. The registration endpoint is safe to retry with a unique email.

### Credit Adjustments

Credit adjustments are append-only in the transaction log. Re-submitting the same adjustment creates a duplicate entry in the transaction log. This is a known gap — no idempotency key on adjustment endpoints.

### Summarize Endpoint

Each `POST /api/summarize` call deducts credits. No idempotency key is supported. Retrying a failed call may result in double credit deduction if the first call partially succeeded. This is a known gap.

## Known Idempotency Gaps

| Gap | Risk | Mitigation Required |
|---|---|---|
| Summarize endpoint double-deduction on retry | Medium | Add idempotency key header |
| Credit adjustment duplicates | Low | Add idempotency key to adjustment endpoints |
| Settings concurrent write conflict | Low | Add optimistic concurrency check to settings writes |
