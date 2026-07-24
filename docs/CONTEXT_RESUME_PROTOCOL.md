# Context-Loss Resume Protocol

Date: 2026-07-23 (Phase 088)

## Protocol for Agent Context Recovery

If session context is lost or truncated:

1. **Read Checkpoints:** Inspect `docs/CODEX_CHECKPOINTS.md` for the last recorded state and branch details.
2. **Review Worklog:** Read recent entries in `docs/CODEX_WORKLOG.md`.
3. **Check Ledger:** Inspect `docs/PHASE_STATUS_LEDGER.md` for current phase completion state.
4. **Execute Verification:** Run `npm run test:all && node doctor.js` to establish operational baseline.
