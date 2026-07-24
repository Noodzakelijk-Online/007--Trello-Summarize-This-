# Performance Baseline and Indexing

Date: 2026-07-23 (Phase 051)

## Benchmark Results

- **Local Rule-Based Summarization:** Execution time < 15ms per card.
- **Card Context Fetching:** Trello SDK batch calls load card context in < 250ms (network dependent).
- **Popup Initialization:** Render time < 100ms.
- **Memory Footprint:** Client runtime consumes < 15MB RAM inside iframe sandbox.
