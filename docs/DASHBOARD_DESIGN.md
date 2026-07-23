# User-Facing Dashboard and Next-Action Design

Date: 2026-07-23 (Phase 020)

## Design Overview

In the static Trello Power-Up context, the popup modal (`popup.html`) serves as the card-level operational dashboard.

## Key Dashboard Components

1. **Executive Digest & Overview:** Concise 2-3 sentence operational summary of card state.
2. **Actionable Next Steps:** Explicit task checklist categorized for VA/team execution.
3. **Evidence & Quality Scoring:** Quality score badge (0-100%) and evidence verification list.
4. **Risk & Blocker Indicators:** Visual alerts for overdue, stale, or sensitive cards.
5. **Ledger & Review Panel:** Historical analysis runs, review approval toggle, and export buttons.

## Next-Action Recommendation Engine

The dashboard ranks next actions by priority:
- **Priority 1 (Urgent):** Unresolved blockers or overdue checklist items.
- **Priority 2 (Action Ready):** Approved VA-ready tasks and comment drafts.
- **Priority 3 (Review):** Quality score warnings requiring human verification.
