# Formal State Machines

Date: 2026-07-23 (Phase 059)

## Analysis Lifecycle State Machine

```
[Idle] ──(Click 'Summarize This')──> [Loading Context]
  │                                        │
  │                                  (Fetch Card Context)
  ▼                                        ▼
[Failed to Load Context] <──(Error)─── [Context Loaded]
                                           │
                                     (Run Normalizer)
                                           │
                                           ▼
                                    [Executing Provider]
                                           │
                      ┌────────────────────┴────────────────────┐
                      ▼                                         ▼
            (Provider Success)                          (Provider Failure)
                      │                                         │
                      ▼                                         ▼
             [Summary Generated]                    [Fallback to Local Rules]
                      │                                         │
                      └────────────────────┬────────────────────┘
                                           ▼
                                    [Ledger Stored]
                                           │
                                    (User Reviews)
                                           │
                      ┌────────────────────┼────────────────────┐
                      ▼                    ▼                    ▼
                 [Approved]           [Rejected]           [Feedback Saved]
```

## Trello Comment Post State Machine

```
[Draft Generated] ──(Edit Draft)──> [Draft Updated]
       │
 (Tick Approval)
       │
       ▼
[Approval Granted] ──(Click 'Post')──> [Posting to Trello]
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                      (Trello Success)                 (Trello Error)
                              │                               │
                              ▼                               ▼
                      [Comment Posted]               [Post Failed / Retry]
```
