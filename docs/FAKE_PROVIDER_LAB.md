# Fake Provider Lab for Tests Only

Date: 2026-07-23 (Phase 038)

## Purpose & Scope

`fake-provider.js` provides a test-only fake AI provider for isolated unit, contract, and failure mode testing without making external network calls or using API quotas.

## Supported Test Scenarios

- `default`: Standard structured response containing labeled test outputs.
- `error`: Simulates provider network error or 500 status code.
- `timeout`: Simulates request timeout.
- `empty`: Simulates empty JSON response object.
- `malformed`: Returns unparseable JSON string.
- `large`: Returns oversized payload for stress testing.

## Safety Isolation

`fake-provider.js` is isolated to the test harness and is **never** bundled or referenced in the production Trello Power-Up runtime (`connector.js`, `popup.html`).
