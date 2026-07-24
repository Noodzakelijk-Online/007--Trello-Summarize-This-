# Supply Chain Review

Date: 2026-07-12

## Current State

- The active shipped surface is mostly static HTML/CSS/JS with a small shared test harness.
- The optional proxy introduces an additional deployment artifact and provider-facing dependency boundary.
- Historical/inactive backend/admin files increase repo complexity without adding verified shipped value.

## Primary Supply-Chain Risks

- Reintroducing inactive backend code without dependency audit
- Adding binary extraction libraries without security and privacy review
- Relying on third-party provider SDK changes without verification

## Guidance

- Prefer small, auditable additions to the shipped static surface
- Audit new dependencies before expanding the active scope
- Treat backend reactivation as a separate hardening project
