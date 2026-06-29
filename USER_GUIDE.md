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
10. [Batch Processing](#batch-processing)
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

**Documents:**
- PDF (with PDF.js)
- Word (.docx, .doc) (with mammoth.js)
- Excel (.xlsx, .xls) (with xlsx.js)
- CSV files
- Text files (.txt, .md)

**Images:**
- JPEG, PNG, GIF, WebP
- OCR text extraction (with Tesseract.js)

**Web Links:**
- External URLs
- Web page content extraction

### How It Works

1. **Automatic Detection**: Files are automatically detected
2. **Content Extraction**: Text is extracted from each file
3. **AI Integration**: Extracted content is included in analysis
4. **Preview Available**: See extracted content in results

### Library Status

Check which libraries are loaded:
- ✓ PDF.js: Full PDF text extraction
- ✓ mammoth.js: Word document parsing
- ✓ xlsx.js: Excel file parsing
- ✓ Tesseract.js: Image OCR

If a library is missing, you'll see metadata-only processing.

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
5. Use batch processing for efficiency

---

## Runtime Timing

After each analysis, the popup shows a Runtime timing panel with the latest total duration, recent average, slowest stored run, and stage breakdown.

The timing panel helps diagnose whether time is spent reading Trello context, building the local summary, waiting for an AI provider, building the ledger, or rendering history/review panels. Timing records are compact and member-private. They store run id, card id, provider/source, durations, and timestamp only; they do not store card content, prompts, API keys, or attachment text.

---

## Batch Processing

### What is Batch Processing?

Analyze multiple cards at once instead of one by one.

### Adding Cards to Batch

**Method 1: Manual Entry**
1. Click "Batch Processing"
2. Enter card IDs (comma-separated)
3. Click "Add Cards"

**Method 2: From List**
1. Enter list ID
2. Click "Add List"
3. All cards from that list are added

**Method 3: From Board**
1. Enter board ID
2. Click "Add Board"
3. All cards from that board are added

### Processing Options

**Sequential Processing:**
- Analyzes cards one after another
- Slower but more reliable
- Respects rate limits
- Recommended for large batches

**Parallel Processing:**
- Analyzes multiple cards simultaneously
- Faster completion
- Higher API usage
- Recommended for small batches (< 20 cards)

### Batch Settings

- **Delay Between Requests**: 1-5 seconds (prevents rate limiting)
- **Concurrency**: 1-5 cards at once
- **Stop on Error**: Continue or stop if a card fails

### Monitoring Progress

- Real-time progress bar
- Card-by-card status updates
- Error notifications
- Estimated completion time

### Exporting Batch Results

1. Wait for batch to complete
2. Click "Export Results"
3. Choose format (JSON or CSV)
4. Download comprehensive report

---

## Custom Prompts

### What are Custom Prompts?

Tailor the AI analysis to your specific needs by creating custom prompt templates.

### Default Prompt Templates

**Default Analysis:**
- Standard four-part summary
- General-purpose analysis
- Suitable for all card types

**Technical Focus:**
- Emphasis on implementation details
- Code and architecture insights
- Best for development teams

**Business Focus:**
- ROI and business value analysis
- Strategic recommendations
- Best for product managers

**Agile/Sprint Focus:**
- User story analysis
- Sprint planning insights
- Velocity and burndown tracking

**Creative/Marketing Focus:**
- Creative execution analysis
- Marketing strategy insights
- Audience engagement metrics

### Creating Custom Prompts

1. Click "Custom Prompts"
2. Click "Add Custom Prompt"
3. Fill in details:
   - **Name**: Descriptive title
   - **Description**: What it's used for
   - **System Message**: AI role and context
   - **Template**: Analysis structure (use `{{CARD_DATA}}` placeholder)
4. Click "Add Prompt"

### Using Custom Prompts

1. Select card to analyze
2. Choose "Custom Prompt" strategy
3. Select your template from dropdown
4. Start analysis

### Managing Prompts

- **View**: See full prompt details
- **Edit**: Modify custom prompts
- **Duplicate**: Create variations
- **Delete**: Remove unused prompts
- **Export**: Save prompts as JSON
- **Import**: Load prompts from file

### Prompt Variables

Use these placeholders in templates:
- `{{CARD_DATA}}`: Complete card information
- `{{CARD_NAME}}`: Card title only
- `{{CARD_DESC}}`: Card description only
- `{{BOARD_NAME}}`: Board name
- `{{LIST_NAME}}`: List name

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
- Use batch processing with delays
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

1. **Batch Processing**: Analyze multiple cards
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

- **API Keys**: Stored locally in browser only
- **Card Data**: Sent to AI providers for analysis
- **History**: Stored locally, not on servers
- **Exports**: Generated client-side

### Security Best Practices

1. Never share API keys
2. Use HTTPS connections only
3. Review provider privacy policies
4. Clear history periodically
5. Use private boards for sensitive data

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
