# Summarize This - Trello Power-Up

> Current-scope note: this document covers the shipped static Power-Up flow. Experimental or disconnected backend/admin files elsewhere in the repo are not part of this product surface.

An evidence-backed Trello Power-Up that adds a "Summarize This" button to every card and provides a structured operational summary with review and export controls.

## 🎯 How It Works

1. **Click the Button**: Every Trello card now has a "Summarize This" button
2. **AI Analyzes**: The Power-Up gathers card data (description, checklists, comments, activity, attachment metadata, and optional bounded text/CSV excerpts) and sends a bounded prompt to your chosen AI provider or proxy
3. **Get Insights**: Within 10-30 seconds, you receive a comprehensive 4-part summary:
   - **What This Card Is About**: Overview and objectives
   - **What Has Happened**: Progress and history
   - **Current Status**: Where things stand now
   - **Next Steps**: What needs to be done
   - **Key Insights**: Important observations and recommendations

Binary attachments such as PDFs, Office files, and images remain metadata-only in the shipped flow unless future extraction support is explicitly documented.

## 📦 Files Structure

```
summarize-this-v2/
├── connector.js              # Main Power-Up initialization
├── popup.html                # Analysis popup interface
├── settings-powerup.html     # AI access configuration
├── manifest.json             # Power-Up configuration
└── icon.png                  # Power-Up icon (optional)
```

## 🚀 Installation & Setup

### Step 1: Host the Files

You need to host these files on an HTTPS server. Choose one of these options:

**Option A: Netlify (Easiest)**
1. Go to [netlify.com](https://netlify.com)
2. Sign up for free account
3. Drag and drop the `summarize-this-v2` folder
4. Get your HTTPS URL (e.g., `https://your-site.netlify.app`)

**Option B: Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Sign up for free account
3. Import from GitHub or upload files
4. Get your HTTPS URL

**Option C: GitHub Pages**
1. Create a GitHub repository
2. Upload all files
3. Enable GitHub Pages in settings
4. Get your URL (e.g., `https://username.github.io/repo-name`)

### Step 2: Create the Power-Up

1. Go to [https://trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Click "Create New Power-Up"
3. Fill in the details:
   - **Name**: Summarize This
   - **Workspace**: Choose your workspace
   - **Iframe Connector URL**: `https://your-site.com/connector.html`
   - **Author Name**: Your name
   - **Support Email**: Your email

4. Under "Capabilities", enable:
   - ✅ card-buttons
   - ✅ card-detail-badges
   - ✅ show-settings
   - ✅ authorization-status
   - ✅ show-authorization

5. Click "Save"

### Step 3: Add to Your Board

1. Open any Trello board
2. Click "Power-Ups" in the menu
3. Find "Custom" section
4. Click "Add" next to your Power-Up
5. The Power-Up is now active!

### Step 4: Configure AI Access

1. Click the Power-Up settings icon
2. Choose "Summarize This Settings"
3. Choose one AI access mode:
   - **Backend proxy**: enter an HTTPS proxy endpoint so provider keys stay server-side
   - **Direct provider key**: add at least one AI provider API key in Trello member-private storage
   - **Local mode**: use the built-in summarizer without provider calls
4. For direct provider mode, supported keys are:
   - **OpenAI**: Get key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **Anthropic**: Get key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
   - **Google AI**: Get key at [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
5. Choose your preferred analysis strategy
6. Click "Save Settings"

## 🎨 Usage

1. **Open any card** in your Trello board
2. **Click "Summarize This"** button on the card
3. **Wait 10-30 seconds** for AI analysis
4. **Review the summary** in the popup
5. **Copy to clipboard** if needed

## 🔧 Configuration

### Analysis Strategies

**Cost-Effective (Recommended)**
- Uses: GPT-4o-mini, Claude 3.5 Haiku, Gemini 2.0 Flash
- Cost: ~$0.005-0.015 per analysis
- Best for: Regular use, budget-conscious teams

**Best Quality**
- Uses: GPT-4, Claude 3.5 Sonnet, Gemini 2.0 Pro
- Cost: ~$0.03-0.10 per analysis
- Best for: Critical decisions, important projects

**Speed-Optimized**
- Uses: Fastest models
- Cost: ~$0.003-0.010 per analysis
- Best for: Quick overviews, time-sensitive analysis

### Supported AI Providers

| Provider | Models | Cost Range | Speed |
|----------|--------|------------|-------|
| OpenAI | GPT-4, GPT-4o-mini | $0.0001-0.06/1K tokens | Fast |
| Anthropic | Claude 3.5 Sonnet, Haiku | $0.0008-0.015/1K tokens | Fast |
| Google AI | Gemini 2.0 Flash, Pro | $0.0001-0.004/1K tokens | Very Fast |

## 🔒 Privacy & Security

- **API Keys**: Stored in Trello member-private storage in Power-Up mode, or kept server-side when proxy mode is used
- **No Silent Provider Fallback**: If proxy mode fails, the popup falls back to the local summarizer instead of silently switching to browser-held provider keys
- **Attachment Limits**: Binary attachments are represented honestly as metadata-only when text was not extracted
- **Your Data**: Card data is only sent to configured providers or your configured proxy after the runtime rules allow it

## 💰 Cost Estimates

### Per Analysis
- Typical card: $0.005-0.015
- Complex card with many comments/checklists: $0.02-0.05
- Very large card with attachments: $0.05-0.10

### Monthly Estimates
- **Light use** (10 cards/day): $3-15/month
- **Medium use** (50 cards/day): $15-75/month
- **Heavy use** (200 cards/day): $60-300/month

## 🐛 Troubleshooting

### "Invalid API Key" Error
- Check that you copied the entire key
- Verify key is active in provider dashboard
- Ensure no extra spaces before/after key

### "Analysis Failed" Error
- Check card has sufficient content
- Verify Trello connection
- Try different AI provider
- Check browser console for detailed errors

### Button Not Appearing
- Verify Power-Up is enabled on the board
- Check that the `connector.html` URL is correct
- Ensure files are hosted on HTTPS
- Clear browser cache and reload

### Popup Won't Open
- Check browser console for errors
- Verify `popup.html` is accessible
- Try disabling browser extensions

## 📊 What Gets Analyzed

The Power-Up analyzes:
- ✅ Card title and description
- ✅ Labels and members
- ✅ Due dates and completion status
- ✅ Checklists and progress
- ✅ Recent comments and activity as exposed by the runtime
- ✅ Attachment metadata
- ✅ Optional bounded text/CSV attachment excerpts when enabled and allowed
- ✅ Board and list context

## Verification Notes

- The active runtime is the static Power-Up flow in `connector.js`, `popup.html`, `settings-powerup.html`, `summarizer-core.js`, `attachment-processor.js`, `ai-providers.js`, `trello-integration.js`, and `card-intelligence-ledger.js`.
- Trello comment posting is approval-gated.
- Trello card description writeback is not implemented.
- The audit and verification documents under `docs/` are the source of truth for completion status.

## 🔄 Updates

To update the Power-Up:
1. Upload new files to your hosting
2. Clear browser cache
3. Reload Trello
4. Changes take effect immediately

## 📝 Customization

### Change the Button Icon
Edit `connector.js`:
```javascript
icon: 'https://your-custom-icon-url.png'
```

### Change Button Text
Edit `connector.js`:
```javascript
text: 'Your Custom Text'
```

### Adjust Popup Size
Edit `connector.js`:
```javascript
height: 600  // Change from 500
```

### Customize Analysis Prompt
Edit `popup.html`, find `formatCardDataForAI()` function and modify the prompt template.

## 🎓 Best Practices

1. **Start with Cost-Effective**: Use the recommended strategy for most cards
2. **Reserve Best Quality**: For critical decisions and important projects
3. **Configure Multiple Providers**: Fallback options if one fails
4. **Review Regularly**: Check analysis history and costs
5. **Copy Important Summaries**: Save key insights to card descriptions

## 🆘 Support

- **Issues**: Report on GitHub
- **Questions**: Check documentation
- **Feature Requests**: Submit via GitHub issues

## 📄 License

MIT License - feel free to modify and distribute

---

**Version**: 3.0  
**Last Updated**: January 2026  
**Status**: Production Ready

Enjoy AI-powered card insights! 🎉
