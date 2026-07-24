# Forms, Validation, and Autosave Behavior

Date: 2026-07-23 (Phase 021)

## Settings Form Validation Rules

1. **API Keys:** Trimmed, masked in UI (`type="password"`), validated against key format patterns.
2. **Proxy URL:** Must be valid HTTPS URL without credentials.
3. **Max Tokens:** Integer bounded between 300 and 2000.
4. **Custom Instructions:** Sanitized string capped at 600 characters.

## Autosave & Persistence Behavior

- Settings changes in `settings-powerup.html` are persisted instantly to Trello member-private storage via `t.set('member', 'private', ...)` upon form submission or change debounce.
- Feedback and review approvals in `popup.html` autosave upon interaction to prevent state loss.
