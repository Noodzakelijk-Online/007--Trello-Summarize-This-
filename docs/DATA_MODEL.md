# Data Model, Ownership, and Persistence Design

Date: 2026-07-23 (Phase 005)

## Data Model

### Trello Card (input — read-only)

| Field | Source | Notes |
|---|---|---|
| id | Trello API | Unique card identifier |
| name | Trello API | Card title |
| desc | Trello API | Card description |
| due / dueComplete | Trello API | Due date and completion status |
| labels | Trello API | Array of {name, color} |
| members | Trello API | Array of {fullName, id} |
| checklists | Trello API | Array of {name, checkItems[]} |
| attachments | Trello API | Array of {name, mimeType, url} |
| actions (comments/activity) | Trello API | Array of {type, data, date, memberCreator} |
| customFieldItems | Trello API | Array of {name, value} |
| listContext.cards | Trello API | Sampled neighboring cards (bounded) |

### Analysis Run (private ledger — member-private Trello storage)

```
{
  runId: string,
  cardId: string,
  cardTitle: string,
  timestamp: ISO8601 string,
  provider: string,
  model: string,
  outputMode: string,
  outputLanguage: string,
  qualityScore: number (0-100),
  summary: { about, status, history, nextSteps, insights, risks, recommendations },
  evidence: [...],
  reviewState: "pending" | "approved" | "rejected",
  feedbackRating: "correct" | "wrong" | null,
  correctionText: string | null,
  exportedAt: ISO8601 string | null,
  costRecord: { provider, model, tokens, cost, createdAt } | null,
  timingRecord: { phases[], totalMs, createdAt } | null
}
```

### Settings (member-private Trello storage)

```
{
  provider: string,
  apiKeys: { openai, anthropic, google } — stored locally, never transmitted to server,
  proxy: { enabled, endpoint },
  analysisMode: "auto" | "local" | "consensus",
  outputMode: string,
  outputLanguage: "en" | "nl",
  maxOutputTokens: number,
  defaultCopyFormat: string,
  budget: { warningPercent, providerMonthlyLimits },
  promptTemplates: [...],
  selectedPromptTemplateId: string | null,
  customInstructions: string,
  promptContext: { commentLimit, listContextEnabled },
  extractTextAttachments: boolean,
  requireSensitiveAiApproval: boolean
}
```

### Backend User (in-memory store — not persisted)

```
{
  id: UUID,
  email: string,
  passwordHash: string (plaintext in current implementation — NOT production safe),
  name: string,
  role: "user" | "admin",
  credits: number,
  suspended: boolean,
  createdAt: ISO8601
}
```

## Ownership Model

| Data | Owner | Access |
|---|---|---|
| Card context | Trello (read-only) | Power-Up reads; never writes without approval |
| Settings | Member-private (Trello) | Only the individual Trello member can read/write |
| Ledger history | Member-private (Trello) | Only the individual Trello member can read/write |
| Export records | Member-private (Trello) | Only the individual Trello member can read/write |
| Backend users | In-memory store | Server-side; isolated per session |
| Backend credits | In-memory store | Per-user; not shared |

## Persistence

| Data | Persistence | Notes |
|---|---|---|
| Settings | Trello member-private storage | Survives browser restarts |
| Ledger history | Trello member-private storage | Survives browser restarts |
| Backend state | In-memory (RAM) | Lost on server restart — not production safe |
| AI provider keys | Trello member-private storage | Never sent to any server by default |
