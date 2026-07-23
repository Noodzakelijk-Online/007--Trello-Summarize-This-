# Provider Failure Simulation

Date: 2026-07-23 (Phase 048)

## Failure Mode Verification

Provider failure modes are simulated in `adversarial.test.js` using `fake-provider.js`:

1. **HTTP 500 / Network Error:** Simulates API failure; popup falls back seamlessly to built-in local rule-based analysis.
2. **Timeout:** Request timeout triggers error boundary and offers manual retry or local fallback.
3. **Malformed JSON Output:** Unparseable AI response string is caught gracefully by `parseProviderJson()`.
4. **Empty Payload:** Handled without UI exceptions or undefined errors.
