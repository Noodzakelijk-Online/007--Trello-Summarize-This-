# Support Debug Bundle Design

Date: 2026-07-12

## Goal

Provide a future safe export for troubleshooting without leaking provider secrets or more card content than necessary.

## Proposed Bundle Contents

- app version
- output mode and language
- provider mode used
- whether local, direct, or proxy path was used
- source coverage summary
- confidence summary
- validation findings
- attachment fact summary
- sanitized error messages

## Explicit Exclusions

- raw API keys
- bearer tokens
- full private Trello member storage
- full card descriptions unless the operator explicitly chooses to include them

## Current Status

Not yet implemented as a dedicated export, but this design should guide any future support bundle feature.
