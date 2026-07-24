# Feature Flags and Rollout Controls

Date: 2026-07-23 (Phase 058)

## Architecture & Implementation

Implemented in `feature-flags.js` as a local-first, zero-telemetry feature management module.

## Active Flags

| Flag Key | Default | Purpose |
|---|---|---|
| `ENABLE_CONSENSUS_MODE` | `true` | Multi-provider consensus AI analysis |
| `ENABLE_BATCH_ANALYSIS` | `true` | Batch plan generation from list context |
| `ENABLE_PROXY_MODE` | `true` | Proxy endpoint for AI requests |
| `ENABLE_ATTACHMENT_TEXT_EXTRACTION` | `true` | Bounded text/CSV attachment extraction |
| `ENABLE_TRELLO_COMMENT_POST` | `true` | Approval-gated Trello comment posting |
| `ENABLE_UPDATE_CHECK` | `true` | GitHub release update manifest check |
| `ENABLE_BUDGET_TRACKING` | `true` | Per-provider spend budget tracking |
| `ENABLE_DUTCH_LANGUAGE` | `true` | Dutch language output option |
| `ENABLE_LIST_TREND_SIGNALS` | `true` | List trend signals display |
| `ENABLE_BACKEND_ADMIN` | `false` | Backend admin management endpoints |

## Overrides

Flags can be overridden via environment variables in Node.js (e.g. `ENABLE_BACKEND_ADMIN=true`) or via `localStorage` keys in the browser.
