# Data Invariants and Constraints

Date: 2026-07-23 (Phase 061)

## Data Invariants

1. **Card Read Isolation:** Card data is never written back to Trello unless explicitly authorized by the user.
2. **Key Security:** API keys are stored only in member-private storage and never transmitted to the application server.
3. **No Unreviewed Writes:** Comment drafts cannot be posted to Trello without the approval checkbox set to true.
4. **Sanitized Error Output:** Error messages displayed to users must never contain credentials, Bearer tokens, or raw attachment tokens.
5. **No False AI Attribution:** Local rule-based fallback results must always be explicitly labeled as "Local rules".
