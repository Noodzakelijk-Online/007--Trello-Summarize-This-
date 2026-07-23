# User Guide

Date: 2026-07-23 (Phase 071)

## Getting Started

### What This Power-Up Does

"Summarize This" adds an AI-assisted card analysis button to every Trello card. It reads the card's content — description, comments, attachments, checklists, due dates, labels, and member assignments — and produces a structured summary including:
- What the card is about
- What's blocking progress
- What decisions are needed
- What actions are ready for the VA or team
- Evidence and confidence signals
- Risks and recommendations

### Installation

1. Go to your Trello board
2. Click **Power-Ups** → **Add a Power-Up**
3. Search for "Summarize This" and add it
4. Click **Settings** on the Power-Up → configure your AI provider

### First-Time Setup

1. Open any Trello card
2. Click **Summarize This** (card button)
3. If no AI key is configured, the popup shows a local rule-based summary
4. To use AI: click the settings icon → enter your API key for OpenAI, Anthropic, or Google AI

## Using the Popup

### Running an Analysis

1. Open a Trello card
2. Click **Summarize This**
3. The popup fetches card context and runs analysis
4. Review the summary, evidence, and confidence score

### Exporting Results

Click the copy button to export in your preferred format:
- **Markdown** — formatted summary
- **JSON** — raw structured data
- **VA Handoff Brief** — optimized for VA team handoffs
- **Change Brief** — suitable for stakeholder updates
- **Trello Comment Draft** — ready to post to the card

### Posting to Trello

To post a comment to the Trello card:
1. Switch to "Comment Draft" format
2. Review the draft carefully
3. Tick the **I have reviewed this** checkbox
4. Click **Post to Trello**

Comments are never posted automatically.

### Batch Analysis

To analyze multiple cards on a list:
1. In the popup, scroll to **Batch Analysis**
2. Preview the batch plan — it shows all cards in the current list
3. Review and approve the plan
4. Work through cards manually using the provided checklist

### Feedback

After reviewing a summary, rate it:
- **Correct** — the summary was accurate
- **Wrong** — enter what was incorrect

Your feedback is included in future analysis prompts for this card.

## Settings Reference

| Setting | Purpose |
|---|---|
| AI Provider | Which AI service to use (or "Local only") |
| API Key | Your personal API key for the selected provider |
| Proxy Endpoint | Optional: your Cloudflare Worker URL |
| Analysis Mode | Auto (AI with fallback) / Local only / Consensus (multi-provider) |
| Output Mode | Operational ledger / Status update / Meeting brief / Risk review |
| Output Language | English / Dutch |
| Max Output Tokens | Controls summary length (300–2000) |
| Default Copy Format | What format the copy button uses |
| Budget Limits | Per-provider monthly spend warning |
| Custom Instructions | Additional guidance for the AI |

## Privacy

- Your card content is never stored on any server controlled by this application.
- If you use an AI provider, card content is sent to that provider (OpenAI, Anthropic, or Google).
- All settings and history are stored privately in your Trello account — other Trello members cannot see them.
- See `docs/PRIVACY_IMPACT_ASSESSMENT.md` for full details.
