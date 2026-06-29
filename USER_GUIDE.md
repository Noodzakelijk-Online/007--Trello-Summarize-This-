# Summarize This - Complete User Guide

Welcome to Summarize This, the AI-powered Trello card analysis tool that helps you understand your projects better.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Features](#basic-features)
3. [Advanced Features](#advanced-features)
4. [AI Providers](#ai-providers)
5. [Analysis Strategies](#analysis-strategies)
6. [Attachment Processing](#attachment-processing)
7. [Analysis History](#analysis-history)
8. [Budget Management](#budget-management)
9. [Runtime Timing](#runtime-timing)
10. [Batch and List Planning](#batch-and-list-planning)
11. [Custom Prompts](#custom-prompts)
12. [Export Options](#export-options)
13. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation

**As a Trello Power-Up:**
1. Go to any Trello board
2. Click "Power-Ups" in the menu
3. Click "Custom" or search for "Summarize This"
4. Click "Add" to install

**Standalone Mode:**
1. Open the application URL in your browser
2. The app works independently without Trello integration

**Windows Setup Assistant:**
1. Open **Configure Trello Power-Up** from the Start Menu after installing.
2. Choose the hosting preset or enter the public HTTPS URL where the static files are deployed.
3. Use the deployment guide to copy host-specific steps and verify `connector.js` and `manifest.json` load publicly.
4. Copy the connector URL, admin checklist, or setup package JSON.
5. Use the autofill helper only on Trello's Power-Up admin page to populate matching fields; review its filled/missing report and save manually in Trello.

### First-Time Setup

1. **API Keys**: Enter at least one AI provider API key in Settings
2. **Trello Credentials** (optional): Add Trello API key and token for standalone mode
3. **Choose Strategy**: Select your preferred analysis strategy
4. **Start Analyzing**: Click "Start Analysis" on any card

---

## Basic Features

### Analyzing a Card

1. **Open a Card**: In Trello, open any card you want to analyze
2. **Click Power-Up Button**: Look for the "Summarize This" button
3. **Wait for Analysis**: The AI will analyze the card (10-30 seconds)
4. **View Results**: See the four-part summary:
   - **About**: What the card is about
   - **History**: What has happened
   - **Status**: Current state
   - **Next Steps**: What needs to be done

### Understanding the Summary

**About Section:**
- Comprehensive overview of the card's purpose
- Key objectives and goals
- Context and background

**History Section:**
- Timeline of activities
- Progress made so far
- Changes and updates

**Status Section:**
- Current state of the card
- Progress percentage
- Blockers or issues

**Next Steps:**
- Actionable items
- Prioritized tasks
- Recommendations

---

## Advanced Features

### Multi-AI Analysis

Compare insights from multiple AI providers simultaneously:

1. Enable "Multi-AI Comparison" mode
2. Select which providers to use
3. Get side-by-side analysis from each
4. See consensus and unique insights

### Confidence Scoring

Each analysis includes a confidence score (0-100%):
- **90-100%**: High confidence, comprehensive data
- **70-89%**: Good confidence, sufficient data
- **50-69%**: Moderate confidence, limited data
- **Below 50%**: Low confidence, minimal data

### Review and Corrections

The Review / correction panel stores feedback privately for the same card. When marking an analysis wrong, select the specific section that was wrong or incomplete, such as blockers, waiting-on items, unclear points, next actions, Robert decisions, VA/team-ready actions, evidence/validation, or unresolved questions. The next analysis receives those compact section-specific corrections as guidance, but they are still treated as user feedback rather than verified Trello facts.

---

## AI Providers

### Supported Providers

**OpenAI (GPT-4.1)**
- **Best for**: General analysis, creative insights
- **Cost**: ~$0.01-0.05 per analysis
- **Speed**: Fast (5-10 seconds)
- **Get API Key**: https://platform.openai.com/api-keys

**Anthropic (Claude 3.5)**
- **Best for**: Detailed analysis, technical content
- **Cost**: ~$0.02-0.06 per analysis
- **Speed**: Fast (5-10 seconds)
- **Get API Key**: https://console.anthropic.com/settings/keys

**Google AI (Gemini 2.0)**
- **Best for**: Comprehensive analysis, multimodal
- **Cost**: ~$0.01-0.04 per analysis
- **Speed**: Very fast (3-8 seconds)
- **Get API Key**: https://makersuite.google.com/app/apikey

**Cohere (Command R+)**
- **Best for**: Business analysis, structured output
- **Cost**: ~$0.01-0.03 per analysis
- **Speed**: Fast (5-10 seconds)
- **Get API Key**: https://dashboard.cohere.com/api-keys

**Perplexity (Sonar Pro)**
- **Best for**: Research-heavy cards, fact-checking
- **Cost**: ~$0.02-0.05 per analysis
- **Speed**: Medium (10-15 seconds)
- **Get API Key**: https://www.perplexity.ai/settings/api

### Adding API Keys

1. Click the Settings icon (⚙️)
2. Find the provider section
3. Paste your API key
4. Click "Save" or "Validate"
5. Green checkmark = API key is valid

In the Trello Power-Up runtime, provider API keys are saved in Trello member-private storage for the current member. In local preview or standalone Windows mode, the settings page saves only non-key settings to `localStorage`; API key fields are cleared and AI-only mode requires either Trello member-private storage or a valid backend proxy endpoint. If older local preview data contains keys, the popup/settings page strips them on load.

### Optional Backend Proxy

Settings can route AI calls through a backend proxy endpoint. When enabled, the browser sends the bounded AI prompt to your proxy and does not send OpenAI, Google, or Anthropic API keys from the Power-Up iframe. The proxy endpoint must add provider credentials server-side and return the same structured JSON summary fields used by direct provider mode.

- Use HTTPS endpoints for Trello Power-Up mode.
- Local development may use `http://localhost` or `http://127.0.0.1`.
- Query strings, fragments, and embedded credentials are not saved as part of the proxy endpoint.
- If proxy mode fails in Auto mode, the popup falls back to the local summarizer rather than silently switching back to browser-held provider keys.

The repository includes an optional Cloudflare Worker reference implementation in `proxy/`. It validates request size, schema, prompt length, provider choice, and allowed origins before calling a provider with server-side secrets.

---

## Analysis Strategies

### Cost-Effective (Recommended)

**Best for**: Regular use, budget-conscious teams
- Uses: GPT-4.1-mini, Claude 3.5 Haiku, Gemini 2.0 Flash
- Cost: ~$0.005-0.015 per analysis
- Speed: Fast
- Quality: Good for most use cases

### Best Quality

**Best for**: Critical decisions, important projects
- Uses: GPT-4.1, Claude 3.5 Sonnet, Gemini 2.0 Pro
- Cost: ~$0.03-0.10 per analysis
- Speed: Medium
- Quality: Highest accuracy and depth

### Speed-Optimized

**Best for**: Quick overviews, time-sensitive analysis
- Uses: Fastest models from each provider
- Cost: ~$0.003-0.010 per analysis
- Speed: Very fast (3-5 seconds)
- Quality: Good for quick insights

### Comprehensive

**Best for**: Complex projects, thorough analysis
- Uses: Multiple models in parallel
- Cost: ~$0.10-0.30 per analysis
- Speed: Slower (20-40 seconds)
- Quality: Multiple perspectives, consensus insights

### Privacy-Focused

**Best for**: Sensitive information, internal projects
- Uses: Local or privacy-focused models only
- Cost: Free (if using local models)
- Speed: Varies
- Quality: Depends on model availability

---

## Attachment Processing

### Supported File Types

The active Power-Up always reads attachment metadata such as name, type, size, and category when Trello exposes it.

Optional content extraction is available for small HTTPS text-like attachments only:

- Text files: `.txt`, `.md`
- Spreadsheet text: `.csv`, `.tsv`

Other files remain metadata-only in the active popup:

- PDF, Word, Excel, PowerPoint, and similar binary documents.
- Images and recordings.
- External web links.

### How It Works

1. **Metadata detection**: Attachment names, MIME types, extensions, and categories are included as evidence.
2. **Optional text extraction**: Enable **Extract small text/CSV attachment contents** in settings to fetch only small HTTPS text-like files.
3. **Bounded previews**: Extracted text is capped before it appears in evidence, JSON exports, or AI prompt context.
4. **Honest fallback**: Unsupported or disabled extraction is shown as metadata-only, not as verified attachment content.

### Library Status

The active popup does not perform browser-side PDF, Word, Excel, image OCR, audio, or video extraction. Those files stay metadata-only until a safer extraction path is added.

### Attachment Privacy

Text/CSV extraction is off by default. When enabled, only HTTPS attachment URLs are fetched, private/local URLs are refused, large files are skipped, and excerpts are capped before AI handoff. If the card metadata already contains sensitive client, financial, legal, or personal signals, text/CSV extraction is skipped until you approve the sensitive run. Sensitive-card approval rules still apply before sending extracted excerpts to a configured AI provider.

---

## Analysis History

### Viewing History

1. Click "History" button
2. See all past analyses
3. Filter by date, board, or strategy
4. Click any analysis to view details

### Statistics Dashboard

Track your usage:
- **Total Analyses**: Number of cards analyzed
- **Total Cost**: Cumulative API costs
- **Average Cost**: Cost per analysis
- **Total Tokens**: API tokens used
- **Most Used Strategy**: Your preferred approach
- **Most Analyzed Board**: Your busiest board

### Exporting History

**JSON Export:**
- Complete data with all metadata
- Suitable for backup and data analysis
- Includes all analysis details

**CSV Export:**
- Spreadsheet-compatible format
- Easy to open in Excel/Google Sheets
- Includes key metrics

---

## Budget Management

### Setting Up Budget Limits

1. Open Power-Up settings.
2. Set monthly limits for OpenAI, Google AI, and/or Anthropic.
3. Leave a provider limit blank or `0` to disable alerts for that provider.
4. Choose the warning threshold: 50%, 75%, 80%, 90%, or 100%.
5. Save settings.

### Budget Alerts

Budget alerts are advisory. They do not block analysis.

**No alert**: No provider limit is configured, the run is local-only, or the monthly estimate is below the warning threshold.

**Warning**: The current run brings the provider's estimated monthly usage above the configured threshold.

**Exceeded**: The current run brings the provider's estimated monthly usage above the configured monthly limit.

### Budget Dashboard

The popup records compact member-private cost records for completed AI runs and shows a budget alert when a configured provider threshold is reached. Cost records include provider, model, token count, estimated cost, card id/title, run id, and timestamp. They do not include API keys or full card content.

### Tips for Managing Costs

1. Use "Cost-Effective" strategy for routine analysis
2. Reserve "Best Quality" for important cards
3. Set realistic monthly budgets
4. Review history to identify patterns
5. Use batch planning before any future multi-card AI run

---

## Runtime Timing

After each analysis, the popup shows a Runtime timing panel with the latest total duration, recent average, slowest stored run, and stage breakdown.

The timing panel helps diagnose whether time is spent reading Trello context, building the local summary, waiting for an AI provider, building the ledger, or rendering history/review panels. Timing records are compact and member-private. They store run id, card id, provider/source, durations, and timestamp only; they do not store card content, prompts, API keys, or attachment text.

---

## Batch and List Planning

### What is List Planning?

List planning creates a compact planning brief from the current card's surrounding Trello list context. It helps spot nearby work, repeated labels, due-date signals, and the current card's position in the list without running AI across every card.

The active popup uses bounded list metadata only:

- Card names.
- Labels.
- Due state.
- Current card position.
- Nearby card names.

It does not include neighboring card descriptions, comments, attachments, or AI output.

### Using the List Planning Brief

1. Open a Trello card.
2. Click **Summarize This**.
3. Make sure list context is enabled in settings.
4. Run the analysis.
5. Use **Copy list brief** for a Markdown planning note.
6. Use **Copy list JSON** for structured handoff to another tool.

Detailed list exports require the same sensitive-export approval flow used by the other evidence-backed exports. Copying a list brief never posts to Trello and never changes card data.

### Using the Batch Analysis Plan

The batch analysis plan creates a review queue from the same bounded list metadata. It is designed as a safe first step before future full-card batch processing.

1. Open a Trello card.
2. Click **Summarize This**.
3. Make sure list context is enabled in settings.
4. Run the analysis.
5. Use **Copy batch plan** for a Markdown queue review.
6. Use **Copy batch JSON** for a structured queue seed.

The batch plan does not run AI, does not fetch neighboring card descriptions or comments, and does not write to Trello. It sets AI handoff to off by default, recommends concurrency `1`, and includes an approval checklist for any later full-card batch run.

### What Remains Future Work

Full batch execution for selected cards, an entire list, or an entire board is still future work. That future version should build on the reviewed queue, add visible rate-limit controls, and require explicit AI handoff consent before processing many full card bodies.

---

## Custom Prompts

### What are Custom Prompts?

Tailor AI analysis by saving reusable Robert workflow guidance templates. Guidance is added to AI prompts only when AI mode is used, and it cannot override evidence requirements, privacy safeguards, or Trello write-approval rules.

### Creating Custom Prompts

1. Open Power-Up settings.
2. Enter a template name.
3. Add active Robert workflow guidance, such as "Prefer Yes/No decisions for Robert and keep VA-ready work separate."
4. Click "Save template".
5. Click "Save settings" if you want the selected template to be the active default.

### Using Custom Prompts

1. Open Power-Up settings.
2. Choose a saved guidance template from the dropdown.
3. Review or edit the active guidance text.
4. Save settings.
5. Run analysis from a Trello card.

### Output Language

1. Open Power-Up settings.
2. Choose **English** or **Dutch** in Output language.
3. Save settings.
4. Run AI analysis from a Trello card.

The selected language is sent as an AI prompt instruction for user-facing summary text. JSON field names remain stable so exports can still be consumed by Sneup, HAI, or other tools.

### Managing Prompts

- **Save template**: Creates a new member-private template or updates the selected one.
- **Delete template**: Removes the selected saved template.
- **Active guidance**: The text currently used for AI prompt guidance.
- **Template cap**: The app keeps up to 10 saved templates, each with guidance capped to 600 characters.

### Privacy Notes

Prompt templates are stored in member-private Power-Up settings. Ledger exports include only template id/name plus a hash and character count for the active guidance. They do not include the full guidance text.

---

## Export Options

### Available Formats

**Markdown (.md)**
- Clean, readable format
- Preserves formatting
- Easy to edit
- Best for documentation

**PDF (.pdf)**
- Professional appearance
- Print-ready
- Non-editable
- Best for reports

**JSON (.json)**
- Complete data export
- Machine-readable
- Includes all metadata
- Best for data analysis

**Plain Text (.txt)**
- Simple, universal format
- No formatting
- Maximum compatibility
- Best for quick sharing

**Clipboard**
- Copy directly to clipboard
- Paste anywhere
- No file download
- Best for quick use

### Active Popup Handoff Formats

- **Copy selected mode brief**: uses the saved output mode, such as meeting brief, risk review, status update, next-action checklist, or client-friendly summary.
- **Copy Robert decisions**: creates a focused Robert decision brief with Yes/No framing, blockers, waiting states, unclear points, unresolved questions, confidence, evidence claims, and source coverage.
- **Copy VA handoff**: creates a VA/team handoff brief that separates delegated work, waiting states, unclear points, and unresolved questions from Robert-only decisions.
- **Copy status update**: creates a compact status message for email, chat, or Trello.
- **Copy JSON / Download JSON**: exports the compact card intelligence ledger for Sneup, HAI, or another structured workflow.

Sensitive-card exports still require visible approval before copy or download.

### Exporting Analysis Results

1. Complete an analysis
2. Click "Export" button
3. Choose format
4. Click format button to download

### Customizing Exports

**Include/Exclude:**
- Card metadata
- Analysis insights
- Cost information
- Confidence scores
- Timestamps

---

## Troubleshooting

### Common Issues

**Issue: "Invalid API Key"**
- **Solution**: Check that you copied the entire key
- Verify key is active in provider dashboard
- Ensure no extra spaces before/after key

**Issue: "Rate Limit Exceeded"**
- **Solution**: Wait 1 minute and try again
- Use batch planning with delays before any future full-card batch run
- Upgrade API plan if frequent

**Issue: "Analysis Failed"**
- **Solution**: Check card has sufficient content
- Verify Trello connection
- Try different AI provider
- Check browser console for errors

**Issue: "Attachment Not Processed"**
- **Solution**: Verify file type is supported
- Check if required library is loaded
- Ensure file is accessible (not private)
- Try re-uploading attachment

**Issue: "Slow Performance"**
- **Solution**: Use "Speed-Optimized" strategy
- Check the Runtime timing panel to see whether the delay is Trello context, local processing, AI provider wait time, or UI/history rendering
- Reduce number of attachments
- Clear browser cache
- Check internet connection

**Issue: "Budget Exceeded"**
- **Solution**: Increase budget limit
- Wait for next period
- Review and optimize usage
- Use cost-effective strategy

### Getting Help

**In-App Help:**
- Click "?" icon for contextual help
- Check onboarding tutorial
- Review feature tooltips

**Documentation:**
- Read this user guide
- Check deployment guide
- Review API documentation

**Support:**
- Report issues on GitHub
- Contact support team
- Join community forum

---

## Best Practices

### For Teams

1. **Standardize Strategy**: Agree on default strategy
2. **Budget Planning**: Set team budgets
3. **Custom Prompts**: Create team-specific templates
4. **Regular Reviews**: Check history weekly
5. **Training**: Onboard new members

### For Individuals

1. **Start Simple**: Use default settings first
2. **Experiment**: Try different strategies
3. **Track Costs**: Monitor budget regularly
4. **Customize**: Create personal prompts
5. **Export**: Save important analyses

### For Large Projects

1. **Batch Planning**: Build a reviewed queue before analyzing multiple cards
2. **Comprehensive Strategy**: Use for critical cards
3. **History Tracking**: Review trends
4. **Export Reports**: Generate summaries
5. **Budget Management**: Set appropriate limits

---

## Keyboard Shortcuts

- `Ctrl/Cmd + Enter`: Start analysis
- `Ctrl/Cmd + E`: Export results
- `Ctrl/Cmd + H`: View history
- `Ctrl/Cmd + S`: Open settings
- `Esc`: Close dialogs

---

## Privacy and Security

### Data Handling

- **API Keys**: Stored in Trello member-private Power-Up storage when running inside Trello; local preview strips API keys instead of persisting them in `localStorage`; proxy mode avoids sending provider keys from the browser
- **Card Data**: Sent to AI providers or a configured backend proxy only when AI mode is used and sensitive handoff approval allows it
- **History**: Stored in member-private Power-Up storage, with local preview using `localStorage` for non-secret preview data
- **Exports**: Generated client-side

### Security Best Practices

1. Never share API keys
2. Configure API keys from the Trello Power-Up settings page, or use a backend proxy for provider keys
3. Use HTTPS connections only
4. Review provider privacy policies
5. Clear history periodically
6. Use private boards for sensitive data

---

## Updates and Changelog

Check for updates regularly:
- New AI providers
- Enhanced features
- Bug fixes
- Performance improvements

---

## Feedback and Contributions

We welcome your feedback!

- **Feature Requests**: Submit on GitHub
- **Bug Reports**: Use issue tracker
- **Contributions**: Pull requests welcome
- **Documentation**: Help improve guides

---

**Version**: 3.0
**Last Updated**: January 2026
**License**: MIT

Thank you for using Summarize This! 🎉
