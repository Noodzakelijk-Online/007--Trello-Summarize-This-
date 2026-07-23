# Internationalization and Dutch/English Readiness

Date: 2026-07-23 (Phase 057)

## Localization Architecture

- Supported output languages: **English (`en`)** and **Dutch (`nl`)**.
- Core localization logic handled in `summarizer-core.js` via `normalizeOutputLanguage()`.
- Local rule-based analyzer generates Dutch or English headers and action labels based on selected language setting.
- AI prompt templates instruct the provider to emit output in the designated language.
