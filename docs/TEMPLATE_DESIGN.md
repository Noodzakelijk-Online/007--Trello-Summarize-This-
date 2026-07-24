# Templates, Presets, and Reusable User Defaults

Date: 2026-07-23 (Phase 024)

## Prompt Template System

The Power-Up supports custom and pre-set prompt templates managed via `summarizer-core.js`:

### Pre-Set Output Modes
- `operational-ledger`: Default operational summary focusing on blockers, next steps, and evidence.
- `status-update`: Concise executive update format for board stakeholders.
- `meeting-brief`: Structured discussion topics and key decisions needed.
- `risk-review`: Emphasizes risks, stale status, and missing evidence.

### Template CRUD & Storage
- Templates are stored in Trello member-private storage.
- Custom templates include `id`, `name`, `instruction`, and `isDefault` properties.
- Normalized via `SummarizeThis.normalizePromptTemplateSettings()`.
