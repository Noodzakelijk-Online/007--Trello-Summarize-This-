# Summarize This - Multi-AI Trello Power-Up

Transform your Trello cards into intelligent, actionable summaries using multiple AI models. Get instant insights on what your cards are about, what's been done, current status, and what's needed to complete them.

## 🌟 Features

### Core Functionality
- **Multi-AI Analysis**: Leverage 5 AI providers (OpenAI, Anthropic, Google, Cohere, Perplexity) with 16+ models
- **Four-Part Summary**: Clear breakdown of card purpose, history, status, and next steps
- **Smart Strategies**: Choose from 5 analysis strategies optimized for quality, cost, speed, or privacy
- **Real-Time Processing**: Live progress updates and model-specific status indicators

### Data Processing
- **Comprehensive Card Analysis**: Extracts all card data including title, description, labels, members, due dates, checklists, and comments
- **Attachment Processing**: Automatically processes PDFs, Word docs, Excel files, images, and web links
- **Checklist Progress**: Calculates and displays completion percentages
- **Comment Integration**: Fetches and analyzes recent card comments

### User Experience
- **Interactive Onboarding**: 4-step tutorial for first-time users
- **Contextual Help**: Built-in help system with detailed explanations
- **Mobile Responsive**: Fully optimized for phones and tablets
- **Touch-Friendly**: Optimized touch targets and interactions

### Export & Sharing
- **Multiple Formats**: Export to Markdown, PDF, JSON, or plain text
- **Copy to Clipboard**: Quick copy for pasting into other tools
- **Professional Formatting**: Clean, readable output for all formats

## 🚀 Quick Start

### For Standalone Testing

1. **Download the application**
   - Clone this repository or download the files
   - Open `index.html` in your web browser

2. **Get an API key** (choose one or more)
   - [OpenAI](https://platform.openai.com/api-keys) - Recommended for best quality
   - [Anthropic](https://console.anthropic.com/settings/keys) - Excellent for analysis
   - [Google AI](https://makersuite.google.com/app/apikey) - Cost-effective option
   - [Cohere](https://dashboard.cohere.com/api-keys) - Alternative provider
   - [Perplexity](https://www.perplexity.ai/settings/api) - Fast processing

3. **Configure and analyze**
   - Enter your API key(s)
   - Select an analysis strategy
   - Click "Start Multi-AI Analysis"
   - View your four-part summary

### For Trello Integration

1. **Host the application**
   - Upload files to an HTTPS web server
   - Update `manifest.json` with your server URLs

2. **Add to Trello**
   - Go to your Trello board
   - Click "Power-Ups" → "Custom"
   - Add your Power-Up URL
   - Enable the Power-Up

3. **Analyze cards**
   - Open any Trello card
   - Click "Summarize This"
   - Enter API keys (first time only)
   - Get instant AI-powered insights

## 📋 Analysis Strategies

### 🏆 Best Quality
- **Models**: GPT-4o, Claude-3 Opus, Gemini-1.5 Pro
- **Cost**: ~$0.05 per analysis
- **Speed**: 10-20 seconds
- **Best for**: Important decisions, complex projects, strategic planning

### 💰 Cost-Effective (Recommended)
- **Models**: GPT-4o-mini, Claude-3 Haiku, Gemini-1.5 Flash
- **Cost**: ~$0.01 per analysis
- **Speed**: 5-10 seconds
- **Best for**: Daily workflow, routine updates, regular card reviews

### ⚡ Speed-Optimized
- **Models**: GPT-4o-mini, Claude-3 Haiku
- **Cost**: ~$0.005 per analysis
- **Speed**: 3-5 seconds
- **Best for**: Quick checks, time-sensitive situations, bulk processing

### 🔬 Comprehensive
- **Models**: All available models (5+ models)
- **Cost**: ~$0.10 per analysis
- **Speed**: 20-30 seconds
- **Best for**: Critical decisions, detailed analysis, maximum insights

### 🔒 Privacy-Focused
- **Models**: Local rule-based processing only
- **Cost**: Free
- **Speed**: Instant
- **Best for**: Sensitive data, offline work, testing without API keys

## 📊 Understanding Results

### What this card is about
A comprehensive overview of the card's purpose, scope, and objectives. Helps you quickly understand the card's goal without reading all details.

### What has happened
Summary of progress made, completed tasks, team discussions, and significant developments. Provides historical context.

### Current status
Assessment of where things stand now, including completion percentage, blockers, priorities, and current state. Shows the immediate situation.

### What's needed to complete
Clear next steps and requirements to finish the work, including tasks, dependencies, and deadlines. Provides actionable guidance.

## 🛠️ Technical Details

### Architecture
- **Frontend**: Pure HTML/CSS/JavaScript (no build process required)
- **AI Integration**: Direct API calls to multiple providers
- **Storage**: Browser localStorage for settings (Trello Power-Up storage when available)
- **Responsive**: Mobile-first design with progressive enhancement

### File Structure
```
├── index.html                  # Main application
├── manifest.json               # Trello Power-Up configuration
├── settings.html               # Settings page
├── ai-providers.js             # AI API integrations
├── trello-integration.js       # Trello API wrapper
├── attachment-processor.js     # Attachment handling
├── onboarding.js               # User onboarding system
├── onboarding.css              # Onboarding styles
├── export.js                   # Export functionality
└── export.css                  # Export styles
```

### Supported Attachments
- **PDF**: Metadata extraction (text extraction ready for PDF.js)
- **Word**: Metadata extraction (parsing ready for mammoth.js)
- **Excel/CSV**: Full CSV parsing, Excel metadata
- **Text**: Complete text extraction
- **Images**: Metadata extraction (OCR ready for Tesseract.js)
- **Web Links**: Content fetching with CORS handling

## 🔒 Security & Privacy

### API Keys
- Stored securely in browser localStorage or Trello Power-Up storage
- Never transmitted except to respective AI providers
- Can be cleared at any time

### Data Privacy
- Card data sent to AI providers only when you run analysis
- Use Privacy-Focused mode for complete local processing
- No data stored on external servers
- All processing happens in your browser

### Recommendations
- Use separate API keys for testing and production
- Monitor API usage in provider dashboards
- Use Privacy-Focused mode for sensitive cards
- Review provider privacy policies

## 💰 Cost Management

### Estimate Costs
- **Best Quality**: ~$0.05 per card
- **Cost-Effective**: ~$0.01 per card
- **Speed-Optimized**: ~$0.005 per card
- **Comprehensive**: ~$0.10 per card
- **Privacy-Focused**: Free

### Tips to Save Costs
1. Use Cost-Effective as your default strategy
2. Reserve Best Quality for important cards only
3. Use Privacy-Focused for simple cards
4. Monitor usage in provider dashboards
5. Set up billing alerts in provider accounts

### Free Tiers
Most providers offer free credits for new accounts:
- **OpenAI**: $5 free credits
- **Anthropic**: Free tier available
- **Google AI**: Generous free quota
- **Cohere**: Free tier with limitations
- **Perplexity**: Limited free queries

## 🧪 Development Status

### Phase 1: Core Functionality ✅
- Real AI API integrations for 5 providers
- Comprehensive Trello card data extraction
- Robust error handling
- User feedback and progress indicators

### Phase 2: UX Enhancements ✅
- Attachment processing system
- Mobile responsive design
- Interactive onboarding
- Export functionality

### Phase 3: Advanced Features (Planned)
- Full PDF text extraction (PDF.js integration)
- Word document parsing (mammoth.js integration)
- Excel file parsing (xlsx.js integration)
- Image OCR (Tesseract.js integration)
- Analysis history
- User accounts
- Cost tracking and budget limits

## 📚 Documentation

- **[Quick Start Guide](QUICK_START_GUIDE.md)** - Detailed setup instructions
- **[Phase 1 Summary](IMPLEMENTATION_SUMMARY_V2.md)** - Core functionality details
- **[Phase 2 Summary](PHASE2_IMPLEMENTATION_SUMMARY.md)** - UX enhancements details
- **[Todo List](todo-updated.md)** - Development roadmap

## 🐛 Troubleshooting

### Common Issues

**"Invalid API key"**
- Check for typos in your API key
- Verify the key is active in provider dashboard
- Ensure correct key format (e.g., OpenAI keys start with "sk-")

**"Rate limit exceeded"**
- Wait 1-2 minutes before trying again
- Consider upgrading your API plan
- Use Cost-Effective or Speed-Optimized strategies

**"API quota exceeded"**
- Check account balance in provider dashboard
- Add credits to your account
- Switch to a different provider temporarily

**"Network error"**
- Check your internet connection
- Try refreshing the page
- Check provider status pages
- Try again in a few minutes

## 🤝 Contributing

This is a private project, but feedback and suggestions are welcome:
1. Test the application thoroughly
2. Report bugs or issues
3. Suggest new features
4. Share use cases and workflows

## 📄 License

Copyright © 2026 Noodzakelijk Online. All rights reserved.

## 🙏 Acknowledgments

- Built with love for the Trello community
- Powered by multiple AI providers
- Inspired by the need for better project insights

## 📞 Support

For issues, questions, or feedback:
- Submit feedback at https://help.manus.im
- Check documentation files in this repository
- Review troubleshooting section above

---

**Version**: 2.0 (Phase 2 Complete)  
**Last Updated**: January 31, 2026  
**Status**: Production Ready
