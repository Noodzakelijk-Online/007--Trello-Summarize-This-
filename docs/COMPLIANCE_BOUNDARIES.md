# Compliance and Platform Policy Boundaries

Date: 2026-07-23 (Phase 013)

## Trello Platform Policy

- The Power-Up must comply with Trello's Power-Up developer guidelines: https://developer.atlassian.com/cloud/trello/power-ups/
- The Power-Up must not scrape card data beyond what is exposed through the Trello Power-Up SDK.
- The Power-Up must not store card data on external servers without explicit user consent and disclosure.
- Trello comment posting must be user-initiated and approval-gated — this is enforced in the popup UI.

## AI Provider Usage Policies

| Provider | Policy URL | Key Constraints |
|---|---|---|
| OpenAI | https://openai.com/policies/usage-policies | No generating harmful content; no PII storage |
| Anthropic | https://www.anthropic.com/legal/aup | Responsible use; no automated harmful content |
| Google AI | https://policies.google.com/terms/generative-ai | Responsible AI principles apply |

## Data Residency

- Card data processed by AI providers is sent to the provider's infrastructure (OpenAI, Anthropic, or Google servers).
- Users must review their provider's data retention and processing policies.
- The local rule-based analysis path sends no data to any external service.
- The proxy path sends data to the user's own Cloudflare Worker.

## Privacy Compliance

- No personal data is stored server-side by this application in the shipped static Power-Up.
- All user-sensitive data (settings, history) is stored in Trello's member-private storage.
- See `docs/PRIVACY_IMPACT_ASSESSMENT.md` for the full privacy impact assessment.

## Formal Compliance Status

| Compliance area | Status |
|---|---|
| GDPR (EU data subjects) | Partial — no data processing agreement with provider documented |
| CCPA | Partial — no formal data mapping documented |
| SOC 2 | Not applicable to static Power-Up; required for backend if deployed |
| Trello Developer Agreement | Must be accepted by the operator at https://trello.com/power-ups/admin |

## Operator Responsibilities

The operator (the person installing and distributing this Power-Up) must:
1. Accept Trello's developer agreement.
2. Inform users of which AI providers their card data may be sent to.
3. Ensure provider usage policies are complied with for their use case.
4. Not use the Power-Up to process regulated personal data without appropriate agreements.
