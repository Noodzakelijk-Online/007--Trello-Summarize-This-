# Demo Mode with Explicit Labelling

Date: 2026-07-23 (Phase 037)

## Demo Mode Overview

When running locally (`index.html` or static preview without active Trello context), the application operates in **Demo Mode**.

## Explicit Labelling Rules

1. **Local Rules Label:** All deterministic, local rule-based analyses display `[Local Rules Fallback]` or `Local rules` in output headers and ledger runs.
2. **Demo Notice Banner:** `index.html` displays a prominent banner indicating sample card data is in use.
3. **No Fake AI Claims:** Demo outputs are never mislabeled as AI-generated.
