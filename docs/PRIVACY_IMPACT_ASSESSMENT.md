# Privacy Impact Assessment

Date: 2026-07-12

## Data Categories

- Trello card text and metadata
- comments and activity when exposed
- checklist items
- attachment metadata
- optional bounded text/CSV attachment excerpts
- private review, feedback, and export history

## Privacy Protections In Current Scope

- Private history stays in member-private or local preview storage
- Binary attachments are not silently read as content
- Sensitive-card signals require approval before broader provider handoff
- Proxy mode allows provider secrets to stay server-side

## Main Privacy Concern

The largest privacy boundary is whether card content leaves the browser for direct-provider or proxy analysis. The UI and docs should continue to make that explicit.
