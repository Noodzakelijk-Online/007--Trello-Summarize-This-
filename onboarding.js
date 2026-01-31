// Onboarding and Help System
// Provides first-time user guidance and contextual help

class OnboardingSystem {
    constructor() {
        this.hasSeenOnboarding = false;
        this.currentStep = 0;
        this.steps = [
            {
                title: "Welcome to Summarize This!",
                content: "Transform your Trello cards into intelligent summaries using multiple AI models. Let's get you started in 3 easy steps.",
                target: null,
                action: "Next"
            },
            {
                title: "Step 1: Choose Your Strategy",
                content: "Select an analysis strategy based on your needs. <strong>Cost-Effective</strong> is great for daily use, while <strong>Best Quality</strong> is perfect for important cards.",
                target: "#strategySelect",
                action: "Next"
            },
            {
                title: "Step 2: Add API Keys",
                content: "Enter at least one API key to enable AI analysis. Don't have one? Get a free key from <a href='https://platform.openai.com' target='_blank'>OpenAI</a> or use <strong>Privacy-Focused</strong> mode for local analysis.",
                target: ".api-keys",
                action: "Next"
            },
            {
                title: "Step 3: Analyze!",
                content: "Click the analyze button to get your four-part summary: what the card is about, what happened, current status, and next steps.",
                target: "#analyzeBtn",
                action: "Get Started"
            }
        ];
    }

    // Check if user has seen onboarding
    checkOnboarding() {
        const seen = localStorage.getItem('summarizeThisOnboardingSeen');
        this.hasSeenOnboarding = seen === 'true';
        return this.hasSeenOnboarding;
    }

    // Mark onboarding as seen
    markOnboardingSeen() {
        localStorage.setItem('summarizeThisOnboardingSeen', 'true');
        this.hasSeenOnboarding = true;
    }

    // Show onboarding flow
    showOnboarding() {
        if (this.checkOnboarding()) {
            return; // Already seen
        }

        this.currentStep = 0;
        this.createOnboardingOverlay();
        this.showStep(0);
    }

    // Create onboarding overlay
    createOnboardingOverlay() {
        // Remove existing overlay if present
        const existing = document.getElementById('onboardingOverlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'onboardingOverlay';
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-backdrop"></div>
            <div class="onboarding-spotlight"></div>
            <div class="onboarding-card">
                <div class="onboarding-progress">
                    <div class="progress-dots"></div>
                </div>
                <h2 class="onboarding-title"></h2>
                <div class="onboarding-content"></div>
                <div class="onboarding-actions">
                    <button class="onboarding-skip">Skip Tutorial</button>
                    <button class="onboarding-next">Next</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add event listeners
        overlay.querySelector('.onboarding-skip').addEventListener('click', () => this.skipOnboarding());
        overlay.querySelector('.onboarding-next').addEventListener('click', () => this.nextStep());
        overlay.querySelector('.onboarding-backdrop').addEventListener('click', () => this.skipOnboarding());
    }

    // Show specific step
    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.completeOnboarding();
            return;
        }

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];
        const overlay = document.getElementById('onboardingOverlay');

        // Update progress dots
        const dotsContainer = overlay.querySelector('.progress-dots');
        dotsContainer.innerHTML = this.steps.map((_, i) => 
            `<span class="progress-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'completed' : ''}"></span>`
        ).join('');

        // Update content
        overlay.querySelector('.onboarding-title').textContent = step.title;
        overlay.querySelector('.onboarding-content').innerHTML = step.content;
        overlay.querySelector('.onboarding-next').textContent = step.action;

        // Position spotlight
        if (step.target) {
            const targetElement = document.querySelector(step.target);
            if (targetElement) {
                this.positionSpotlight(targetElement);
                this.positionCard(targetElement);
            }
        } else {
            this.centerCard();
        }
    }

    // Position spotlight on target element
    positionSpotlight(element) {
        const rect = element.getBoundingClientRect();
        const spotlight = document.querySelector('.onboarding-spotlight');
        
        spotlight.style.top = `${rect.top - 10}px`;
        spotlight.style.left = `${rect.left - 10}px`;
        spotlight.style.width = `${rect.width + 20}px`;
        spotlight.style.height = `${rect.height + 20}px`;
        spotlight.style.display = 'block';
    }

    // Position card near target
    positionCard(element) {
        const rect = element.getBoundingClientRect();
        const card = document.querySelector('.onboarding-card');
        const cardRect = card.getBoundingClientRect();
        
        // Position below target if there's space, otherwise above
        if (rect.bottom + cardRect.height + 20 < window.innerHeight) {
            card.style.top = `${rect.bottom + 20}px`;
        } else {
            card.style.top = `${rect.top - cardRect.height - 20}px`;
        }
        
        // Center horizontally relative to target
        const left = rect.left + (rect.width / 2) - (cardRect.width / 2);
        card.style.left = `${Math.max(20, Math.min(left, window.innerWidth - cardRect.width - 20))}px`;
    }

    // Center card on screen
    centerCard() {
        const card = document.querySelector('.onboarding-card');
        const spotlight = document.querySelector('.onboarding-spotlight');
        
        spotlight.style.display = 'none';
        card.style.top = '50%';
        card.style.left = '50%';
        card.style.transform = 'translate(-50%, -50%)';
    }

    // Next step
    nextStep() {
        this.showStep(this.currentStep + 1);
    }

    // Skip onboarding
    skipOnboarding() {
        this.completeOnboarding();
    }

    // Complete onboarding
    completeOnboarding() {
        this.markOnboardingSeen();
        const overlay = document.getElementById('onboardingOverlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // Show help for specific feature
    showHelp(topic) {
        const helpContent = this.getHelpContent(topic);
        if (!helpContent) return;

        this.showHelpModal(helpContent);
    }

    // Get help content for topic
    getHelpContent(topic) {
        const helpTopics = {
            'strategies': {
                title: "Analysis Strategies",
                content: `
                    <h3>🏆 Best Quality</h3>
                    <p>Uses premium AI models (GPT-4o, Claude-3 Opus, Gemini Pro) for the highest quality analysis. Best for important cards and strategic decisions. Cost: ~$0.05 per analysis.</p>
                    
                    <h3>💰 Cost-Effective</h3>
                    <p>Balanced approach using efficient models (GPT-4o-mini, Claude-3 Haiku, Gemini Flash). Great for daily use. Cost: ~$0.01 per analysis.</p>
                    
                    <h3>⚡ Speed-Optimized</h3>
                    <p>Fastest analysis using optimized models. Perfect for quick checks and time-sensitive situations. Cost: ~$0.005 per analysis.</p>
                    
                    <h3>🔬 Comprehensive</h3>
                    <p>Uses all available AI models for maximum insights. Best for complex problems requiring diverse perspectives. Cost: ~$0.10 per analysis.</p>
                    
                    <h3>🔒 Privacy-Focused</h3>
                    <p>Local rule-based analysis only. No external API calls, complete data privacy. Free, but basic analysis quality.</p>
                `
            },
            'api-keys': {
                title: "API Keys Setup",
                content: `
                    <h3>Getting API Keys</h3>
                    <p>You need at least one API key to use AI analysis:</p>
                    
                    <ul>
                        <li><strong>OpenAI:</strong> <a href="https://platform.openai.com/api-keys" target="_blank">Get key here</a></li>
                        <li><strong>Anthropic:</strong> <a href="https://console.anthropic.com/settings/keys" target="_blank">Get key here</a></li>
                        <li><strong>Google AI:</strong> <a href="https://makersuite.google.com/app/apikey" target="_blank">Get key here</a></li>
                        <li><strong>Cohere:</strong> <a href="https://dashboard.cohere.com/api-keys" target="_blank">Get key here</a></li>
                        <li><strong>Perplexity:</strong> <a href="https://www.perplexity.ai/settings/api" target="_blank">Get key here</a></li>
                    </ul>
                    
                    <h3>Security</h3>
                    <p>Your API keys are stored securely in your browser and never shared. They're only used to make API calls on your behalf.</p>
                `
            },
            'results': {
                title: "Understanding Results",
                content: `
                    <h3>Four-Part Analysis</h3>
                    
                    <p><strong>📝 What this card is about:</strong> Overview of the card's purpose and objectives.</p>
                    
                    <p><strong>📈 What has happened:</strong> Summary of progress, completed tasks, and historical context.</p>
                    
                    <p><strong>🎯 Current status:</strong> Where things stand now, including completion percentage and blockers.</p>
                    
                    <p><strong>✅ What's needed to complete:</strong> Clear next steps and requirements to finish the work.</p>
                    
                    <h3>Insights</h3>
                    <p>AI-generated insights highlight important patterns, risks, or opportunities that might not be immediately obvious.</p>
                `
            },
            'troubleshooting': {
                title: "Troubleshooting",
                content: `
                    <h3>Common Issues</h3>
                    
                    <p><strong>🔑 Invalid API key:</strong> Check your key for typos and verify it's active in your provider dashboard.</p>
                    
                    <p><strong>⏱️ Rate limit exceeded:</strong> Wait 1-2 minutes before trying again, or consider upgrading your API plan.</p>
                    
                    <p><strong>💳 Quota exceeded:</strong> Add credits to your API account or switch to a different provider.</p>
                    
                    <p><strong>🌐 Network error:</strong> Check your internet connection and try again.</p>
                    
                    <p><strong>No API keys configured:</strong> Enter at least one API key or use Privacy-Focused mode.</p>
                `
            }
        };

        return helpTopics[topic];
    }

    // Show help modal
    showHelpModal(content) {
        const modal = document.createElement('div');
        modal.className = 'help-modal';
        modal.innerHTML = `
            <div class="help-modal-backdrop"></div>
            <div class="help-modal-content">
                <button class="help-modal-close">×</button>
                <h2>${content.title}</h2>
                <div class="help-modal-body">
                    ${content.content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.help-modal-close').addEventListener('click', () => {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 300);
        });

        modal.querySelector('.help-modal-backdrop').addEventListener('click', () => {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 300);
        });
    }

    // Add help button to element
    addHelpButton(elementSelector, topic) {
        const element = document.querySelector(elementSelector);
        if (!element) return;

        const helpBtn = document.createElement('button');
        helpBtn.className = 'help-icon-btn';
        helpBtn.innerHTML = '?';
        helpBtn.title = 'Click for help';
        helpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showHelp(topic);
        });

        element.style.position = 'relative';
        element.appendChild(helpBtn);
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnboardingSystem;
}
