# Bug Hunt Log

Date: 2026-07-12

## Confirmed Repo-Level Findings

1. `database-user.js` is not currently verified as runnable in this repo state.
2. `connection.js` depends on undeclared modules for the current package manifest.
3. `adminApi.js` depends on undeclared modules for the current package manifest.
4. Historical docs previously overstated production readiness and completion.
5. Binary attachment extraction was previously easy to overread as more complete than the shipped behavior.

## Current Handling

- Backend/admin files are treated as inactive until proven otherwise.
- Historical docs are downgraded and audit docs are the source of truth.
- Attachment behavior is now documented as metadata-only unless text was truly extracted.
