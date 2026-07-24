# Threat Model And Security Design Review

Date: 2026-07-12

## Primary Threats

- Provider secret leakage
- Over-sharing sensitive card content to AI providers
- Misrepresenting attachment content as verified when it was not read
- Unsafe URL fetching for attachments
- Accidental shared writeback to Trello without review

## Current Mitigations

- Proxy mode keeps provider secrets server-side
- Local preview strips API keys from stored settings
- Sensitive-card approval gates restrict provider handoff and optional extraction
- Attachment fetch rules require HTTPS and block local/private-network targets
- Trello comment posting is approval-gated
- Binary attachments remain metadata-only by default

## Remaining Risks

- Direct-provider mode still places responsibility on the operator's runtime and account safety practices
- Historical docs can still be misread if audit docs are ignored
- No dedicated automated adversarial test suite exists yet
