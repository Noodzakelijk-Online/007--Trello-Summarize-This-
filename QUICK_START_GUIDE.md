# Summarize This v2 - Quick Start Guide

## Getting Started with Real AI Integrations

This guide will help you test the newly implemented real AI API integrations in the Summarize This Trello Power-Up.

---

## Prerequisites

To use the application with real AI analysis, you need at least one API key from the following providers:

### Supported AI Providers

**OpenAI** (Recommended for best quality)
- Sign up at: https://platform.openai.com/
- Get API key from: https://platform.openai.com/api-keys
- Models: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
- Cost: Starting from $0.0005 per 1K tokens

**Anthropic Claude**
- Sign up at: https://console.anthropic.com/
- Get API key from: https://console.anthropic.com/settings/keys
- Models: Claude-3 Opus, Sonnet, Haiku
- Cost: Starting from $0.00025 per 1K tokens

**Google AI**
- Sign up at: https://ai.google.dev/
- Get API key from: https://makersuite.google.com/app/apikey
- Models: Gemini 1.5 Pro, Gemini 1.5 Flash
- Cost: Starting from $0.000125 per 1K tokens

**Cohere**
- Sign up at: https://dashboard.cohere.com/
- Get API key from: https://dashboard.cohere.com/api-keys
- Models: Command-R Plus, Command-R
- Cost: Starting from $0.0005 per 1K tokens

**Perplexity**
- Sign up at: https://www.perplexity.ai/
- Get API key from: https://www.perplexity.ai/settings/api
- Models: Llama 3 70B, Llama 3 8B
- Cost: Starting from $0.0002 per 1K tokens

---

## Installation & Setup

### Option 1: Test Mode (Standalone)

The easiest way to test the application without Trello integration.

**Step 1:** Open the application
- Extract the `SummarizeThis-v2-WITH-REAL-APIs.zip` file
- Open `index.html` in your web browser
- The application will automatically start in Test Mode

**Step 2:** Configure API Keys
- Enter at least one API key in the "AI Provider API Keys" section
- You can enter multiple keys to enable more AI models
- Keys are saved in your browser's local storage

**Step 3:** Select Analysis Strategy
- **Best Quality:** Uses premium models (GPT-4o, Claude-3 Opus, Gemini Pro)
- **Cost-Effective:** Uses efficient models (GPT-4o-mini, Claude-3 Haiku, Gemini Flash)
- **Speed-Optimized:** Uses fastest models for quick results
- **Comprehensive:** Uses all available models for maximum insights
- **Privacy-Focused:** Uses local rule-based analysis only (no API calls)

**Step 4:** Run Analysis
- Click "🚀 Start Multi-AI Analysis" button
- The application will analyze the sample Trello card
- Results will appear in the four-part summary format

### Option 2: Trello Power-Up Mode

For testing with real Trello cards.

**Step 1:** Host the application
- Upload the files to a web server with HTTPS
- Update `manifest.json` with your server URLs

**Step 2:** Add to Trello
- Go to your Trello board
- Click "Power-Ups" in the menu
- Click "Custom" and add your Power-Up URL
- Enable the Power-Up

**Step 3:** Configure in Trello
- Click the "Summarize This" button on any card
- Enter your API keys
- Select your preferred analysis strategy

**Step 4:** Analyze Cards
- Click "🔄 Analyze Current Trello Card"
- The Power-Up will fetch all card data automatically
- Results will display in the modal

---

## Understanding the Results

The AI analysis provides four key sections:

### 1. What this card is about
A comprehensive overview of the card's purpose, scope, and objectives. This section helps you quickly understand what the card is trying to achieve without reading all the details.

### 2. What has happened
A summary of the progress made so far, including completed tasks, team discussions, and any significant developments. This gives you the historical context of the card.

### 3. Current status
An assessment of where things stand right now, including completion percentage, blockers, priorities, and current state. This helps you understand the immediate situation.

### 4. What's needed to complete
Clear next steps and requirements to finish the work, including tasks, dependencies, and deadlines. This provides actionable guidance on moving forward.

### Additional Insights
The analysis also includes key insights extracted from multiple AI models, highlighting important patterns, risks, or opportunities that might not be immediately obvious.

---

## Analysis Strategies Explained

### 🏆 Best Quality (Premium Models)
**When to use:** Important cards, complex projects, strategic decisions

**Models used:** GPT-4o, Claude-3 Opus, Gemini-1.5 Pro

**Characteristics:**
- Highest quality analysis with deep insights
- Multiple premium AI models for comprehensive coverage
- Results synthesized for optimal accuracy
- Higher cost (~$0.05 per analysis)
- Slower processing time (10-20 seconds)

**Best for:** Executive summaries, project planning, risk assessment

### 💰 Cost-Effective (Balanced)
**When to use:** Regular cards, daily workflow, routine updates

**Models used:** GPT-4o-mini, Claude-3 Haiku, Gemini-1.5 Flash

**Characteristics:**
- Good quality at lower cost
- Balanced speed and accuracy
- Multiple efficient models
- Moderate cost (~$0.01 per analysis)
- Fast processing (5-10 seconds)

**Best for:** Daily standup prep, routine card reviews, team updates

### ⚡ Speed-Optimized (Fast)
**When to use:** Quick checks, time-sensitive situations, bulk processing

**Models used:** GPT-4o-mini, Claude-3 Haiku

**Characteristics:**
- Fastest analysis available
- Two optimized models
- Quick turnaround
- Low cost (~$0.005 per analysis)
- Very fast processing (3-5 seconds)

**Best for:** Quick card checks, sprint planning, rapid assessments

### 🔬 Comprehensive (All Models)
**When to use:** Critical decisions, detailed analysis, maximum insights

**Models used:** All available AI models (5+ models)

**Characteristics:**
- Most comprehensive analysis
- Uses every configured AI provider
- Maximum insight diversity
- Highest cost (~$0.10 per analysis)
- Longest processing time (20-30 seconds)

**Best for:** Major decisions, complex problem-solving, thorough reviews

### 🔒 Privacy-Focused (Local Only)
**When to use:** Sensitive data, no internet, testing, no API costs

**Models used:** Rule-based local processing only

**Characteristics:**
- No external API calls
- Complete data privacy
- No cost
- Instant results
- Basic analysis quality

**Best for:** Confidential projects, offline work, testing without API keys

---

## Troubleshooting

### Error: "⚠️ No API keys configured"
**Solution:** Enter at least one API key or switch to Privacy-Focused mode

### Error: "🔑 Invalid API key"
**Cause:** The API key you entered is incorrect or expired

**Solution:**
1. Check your API key for typos
2. Verify the key is active in your provider dashboard
3. Ensure you're using the correct key format (e.g., OpenAI keys start with "sk-")

### Error: "⏱️ Rate limit exceeded"
**Cause:** You've made too many requests in a short time

**Solution:**
1. Wait 1-2 minutes before trying again
2. Consider upgrading your API plan
3. Use Cost-Effective or Speed-Optimized strategies to reduce requests

### Error: "💳 API quota exceeded"
**Cause:** Your API account has run out of credits

**Solution:**
1. Check your account balance in the provider dashboard
2. Add credits to your account
3. Switch to a different provider temporarily

### Error: "🌐 Network error"
**Cause:** Internet connection issue or API service down

**Solution:**
1. Check your internet connection
2. Try refreshing the page
3. Check the provider's status page
4. Try again in a few minutes

### Error: "Trello Power-Up not available"
**Cause:** Running in standalone mode but trying to use Trello features

**Solution:**
1. Switch to Test Mode for standalone testing
2. Or install the Power-Up in Trello properly

---

## Cost Management Tips

### Estimate Costs Before Analysis
- **Best Quality:** ~$0.05 per card
- **Cost-Effective:** ~$0.01 per card
- **Speed-Optimized:** ~$0.005 per card
- **Comprehensive:** ~$0.10 per card
- **Privacy-Focused:** $0.00 per card

### Optimize Your Usage
1. **Use Privacy-Focused for simple cards** - Save API costs on straightforward tasks
2. **Use Cost-Effective as default** - Good balance for most cards
3. **Reserve Best Quality for important cards** - Use premium models strategically
4. **Batch similar cards** - Analyze related cards together for efficiency
5. **Monitor your API usage** - Check provider dashboards regularly

### Free Tier Limits
Most providers offer free credits for new accounts:
- OpenAI: $5 free credits for new accounts
- Anthropic: Free tier available
- Google AI: Generous free quota
- Cohere: Free tier with limitations
- Perplexity: Limited free queries

---

## Best Practices

### For Best Results

**Provide Rich Card Data**
The AI analysis quality depends on the information available in your Trello card. Include:
- Clear, descriptive card titles
- Detailed descriptions
- Relevant labels
- Checklist items with progress
- Comments with context
- Attachments with documentation

**Choose the Right Strategy**
Match your analysis strategy to the card's importance:
- Critical path items → Best Quality
- Regular tasks → Cost-Effective
- Quick checks → Speed-Optimized
- Major decisions → Comprehensive
- Sensitive data → Privacy-Focused

**Review and Iterate**
AI analysis provides insights, but human judgment is essential:
- Review the analysis critically
- Compare with your own understanding
- Use insights to inform decisions, not replace them
- Re-analyze cards as they evolve

### Security Best Practices

**Protect Your API Keys**
- Never share API keys publicly
- Rotate keys regularly
- Use separate keys for testing and production
- Monitor usage for unexpected activity

**Handle Sensitive Data**
- Use Privacy-Focused mode for confidential cards
- Be aware that card data is sent to AI providers
- Review provider privacy policies
- Consider data retention policies

---

## Support & Resources

### Documentation
- Implementation Summary: `IMPLEMENTATION_SUMMARY_V2.md`
- Original Todo List: `todo.md`
- Analysis Findings: `analysis_findings.md`

### Provider Documentation
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Google AI Docs](https://ai.google.dev/docs)
- [Cohere API Docs](https://docs.cohere.com)
- [Perplexity API Docs](https://docs.perplexity.ai)

### Trello Resources
- [Trello Power-Ups Guide](https://developer.atlassian.com/cloud/trello/power-ups/)
- [Trello API Reference](https://developer.atlassian.com/cloud/trello/rest/)

### Getting Help
For issues or questions:
1. Check the troubleshooting section above
2. Review the implementation summary
3. Check provider status pages
4. Submit feedback at https://help.manus.im

---

## What's Next?

### Phase 2 Features (Coming Soon)
- Attachment processing (PDF, Word, Excel, images)
- Real-time API key validation
- Cost tracking and budget limits
- Export functionality (PDF, Markdown)
- Mobile responsiveness improvements
- User onboarding flow
- Analysis history

### Feedback Welcome
This is v2 with real API integrations. Your feedback helps improve the tool:
- What works well?
- What could be better?
- What features would you like to see?
- Any bugs or issues?

---

## Quick Reference

### Minimum Setup
1. Open `index.html` in browser
2. Enter one API key
3. Click "Start Multi-AI Analysis"
4. View results

### Recommended Setup
1. Get API keys from 2-3 providers
2. Start with Cost-Effective strategy
3. Test with sample card first
4. Adjust strategy based on needs
5. Monitor costs in provider dashboards

### Production Setup
1. Host on HTTPS server
2. Configure all API keys
3. Install as Trello Power-Up
4. Set up cost monitoring
5. Train team on strategies
6. Establish usage guidelines

---

**Ready to get started? Open `index.html` and start analyzing!**
