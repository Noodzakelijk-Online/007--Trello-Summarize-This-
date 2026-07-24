# Privacy Controls and Data Deletion

Date: 2026-07-23 (Phase 028)

## Privacy Architecture

1. **Member-Private Storage Isolation:** All settings, API keys, and analysis history are stored in Trello's member-private storage sandbox. Other board members or Power-Ups cannot inspect this data.
2. **Local-First Processing:** Built-in rule-based summarization runs 100% locally in the browser with zero external network requests.
3. **Opt-In AI Handoff:** Card data is only sent to AI providers (OpenAI, Anthropic, Google) if explicitly configured by the user.

## Data Deletion & Export Controls

- **Clear Private Data:** Users can clear saved ledger runs and API keys via settings.
- **Export Data:** Users can export analysis history and settings as JSON at any time.
- **Trello Disconnect:** Uninstalling the Power-Up or revoking authorization removes access to member storage.
