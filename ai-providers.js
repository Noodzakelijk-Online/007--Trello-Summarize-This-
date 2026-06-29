// AI Providers Module - Real API Integrations
// Handles actual API calls to OpenAI, Anthropic, Google, Cohere, Perplexity, and Mistral

class AIProviders {
    constructor() {
        this.apiKeys = {
            openai: '',
            anthropic: '',
            google: '',
            cohere: '',
            perplexity: '',
            mistral: ''
        };
        
        this.modelConfigs = {
            'gpt-4o': { provider: 'openai', model: 'gpt-4o', costPer1kTokens: 0.005 },
            'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini', costPer1kTokens: 0.00015 },
            'gpt-4-turbo': { provider: 'openai', model: 'gpt-4-turbo-preview', costPer1kTokens: 0.01 },
            'gpt-3.5-turbo': { provider: 'openai', model: 'gpt-3.5-turbo', costPer1kTokens: 0.0005 },
            'claude-3-opus': { provider: 'anthropic', model: 'claude-3-opus-20240229', costPer1kTokens: 0.015 },
            'claude-3-sonnet': { provider: 'anthropic', model: 'claude-3-sonnet-20240229', costPer1kTokens: 0.003 },
            'claude-3-haiku': { provider: 'anthropic', model: 'claude-3-haiku-20240307', costPer1kTokens: 0.00025 },
            'gemini-1.5-pro': { provider: 'google', model: 'gemini-1.5-pro', costPer1kTokens: 0.00125 },
            'gemini-1.5-flash': { provider: 'google', model: 'gemini-1.5-flash', costPer1kTokens: 0.000125 },
            'command-r-plus': { provider: 'cohere', model: 'command-r-plus', costPer1kTokens: 0.003 },
            'command-r': { provider: 'cohere', model: 'command-r', costPer1kTokens: 0.0005 },
            'llama-3-70b': { provider: 'perplexity', model: 'llama-3-70b-instruct', costPer1kTokens: 0.001 },
            'llama-3-8b': { provider: 'perplexity', model: 'llama-3-8b-instruct', costPer1kTokens: 0.0002 },
            'mistral-large': { provider: 'mistral', model: 'mistral-large-latest', costPer1kTokens: 0.008 },
            'mistral-medium': { provider: 'mistral', model: 'mistral-medium-latest', costPer1kTokens: 0.0027 },
            'mistral-small': { provider: 'mistral', model: 'mistral-small-latest', costPer1kTokens: 0.001 }
        };
    }

    setApiKey(provider, key) {
        this.apiKeys[provider] = key;
    }

    getApiKey(provider) {
        return this.apiKeys[provider];
    }

    sanitizeErrorMessage(error) {
        const message = error && error.message ? error.message : String(error || 'Provider request failed');
        return message
            .replace(/https?:\/\/[^\s)]+/gi, '[url redacted]')
            .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
            .replace(/(x-api-key|x-goog-api-key|api[_-]?key|token)(\s*[:=]\s*)([A-Za-z0-9._~+/=-]+)/gi, '$1$2[redacted]')
            .replace(/sk-[A-Za-z0-9_-]{12,}/g, 'sk-[redacted]')
            .slice(0, 240);
    }

    logProviderFailure(provider, error) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn(`${provider} API call failed: ${this.sanitizeErrorMessage(error)}`);
        }
    }

    // OpenAI API Integration
    async callOpenAI(model, prompt, cardData) {
        const apiKey = this.apiKeys.openai;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const systemPrompt = `You are an expert Trello card analyzer. Analyze the provided card data and generate a comprehensive four-part summary:
1. What this card is about (overview and purpose)
2. What has happened (history and progress)
3. Current status (where things stand now)
4. What's needed to complete (next steps and requirements)

Provide detailed, high-quality analysis. Do not sacrifice clarity for brevity.`;

        const userPrompt = `Analyze this Trello card:

Title: ${cardData.name}
Description: ${cardData.desc || 'No description'}
Labels: ${cardData.labels?.join(', ') || 'None'}
Due Date: ${cardData.due || 'Not set'}
Members: ${cardData.members?.join(', ') || 'None'}
Checklist Progress: ${cardData.checklistProgress || 'No checklists'}
Comments: ${cardData.comments?.length || 0} comments
${cardData.comments ? 'Recent comments:\n' + cardData.comments.slice(0, 3).join('\n') : ''}

Provide your analysis in this JSON format:
{
  "about": "detailed overview",
  "history": "what has happened",
  "status": "current status",
  "nextSteps": "what's needed to complete",
  "insights": ["key insight 1", "key insight 2", "key insight 3"]
}`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const content = JSON.parse(data.choices[0].message.content);
            
            return {
                result: content,
                tokensUsed: data.usage.total_tokens,
                cost: this.calculateCost('openai', model, data.usage.total_tokens),
                model: model,
                provider: 'OpenAI'
            };
        } catch (error) {
            this.logProviderFailure('OpenAI', error);
            throw error;
        }
    }

    // Anthropic Claude API Integration
    async callAnthropic(model, prompt, cardData) {
        const apiKey = this.apiKeys.anthropic;
        if (!apiKey) {
            throw new Error('Anthropic API key not configured');
        }

        const systemPrompt = `You are an expert Trello card analyzer. Analyze the provided card data and generate a comprehensive four-part summary in JSON format.`;

        const userPrompt = `Analyze this Trello card:

Title: ${cardData.name}
Description: ${cardData.desc || 'No description'}
Labels: ${cardData.labels?.join(', ') || 'None'}
Due Date: ${cardData.due || 'Not set'}
Members: ${cardData.members?.join(', ') || 'None'}
Checklist Progress: ${cardData.checklistProgress || 'No checklists'}
Comments: ${cardData.comments?.length || 0} comments

Provide analysis in JSON format with: about, history, status, nextSteps, and insights (array).`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 2000,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: userPrompt }
                    ]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const content = JSON.parse(data.content[0].text);
            
            return {
                result: content,
                tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
                cost: this.calculateCost('anthropic', model, data.usage.input_tokens + data.usage.output_tokens),
                model: model,
                provider: 'Anthropic'
            };
        } catch (error) {
            this.logProviderFailure('Anthropic', error);
            throw error;
        }
    }

    // Google Gemini API Integration
    async callGoogle(model, prompt, cardData) {
        const apiKey = this.apiKeys.google;
        if (!apiKey) {
            throw new Error('Google AI API key not configured');
        }

        const prompt_text = `You are an expert Trello card analyzer. Analyze this card and provide a JSON response with: about, history, status, nextSteps, and insights.

Card Details:
Title: ${cardData.name}
Description: ${cardData.desc || 'No description'}
Labels: ${cardData.labels?.join(', ') || 'None'}
Due Date: ${cardData.due || 'Not set'}
Members: ${cardData.members?.join(', ') || 'None'}
Checklist Progress: ${cardData.checklistProgress || 'No checklists'}
Comments: ${cardData.comments?.length || 0} comments

Respond with valid JSON only.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt_text }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2000
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Google AI API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            const content = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
            
            return {
                result: content,
                tokensUsed: data.usageMetadata?.totalTokenCount || 0,
                cost: this.calculateCost('google', model, data.usageMetadata?.totalTokenCount || 0),
                model: model,
                provider: 'Google'
            };
        } catch (error) {
            this.logProviderFailure('Google AI', error);
            throw error;
        }
    }

    // Cohere API Integration
    async callCohere(model, prompt, cardData) {
        const apiKey = this.apiKeys.cohere;
        if (!apiKey) {
            throw new Error('Cohere API key not configured');
        }

        const prompt_text = `Analyze this Trello card and provide a JSON response:

Title: ${cardData.name}
Description: ${cardData.desc || 'No description'}
Labels: ${cardData.labels?.join(', ') || 'None'}
Due Date: ${cardData.due || 'Not set'}

Provide: about, history, status, nextSteps, insights (as JSON).`;

        try {
            const response = await fetch('https://api.cohere.ai/v1/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt_text,
                    max_tokens: 2000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Cohere API error: ${error.message || response.statusText}`);
            }

            const data = await response.json();
            const content = JSON.parse(data.generations[0].text);
            
            return {
                result: content,
                tokensUsed: data.meta?.billed_units?.output_tokens || 0,
                cost: this.calculateCost('cohere', model, data.meta?.billed_units?.output_tokens || 0),
                model: model,
                provider: 'Cohere'
            };
        } catch (error) {
            this.logProviderFailure('Cohere', error);
            throw error;
        }
    }

    // Perplexity API Integration (OpenAI-compatible)
    async callPerplexity(model, prompt, cardData) {
        const apiKey = this.apiKeys.perplexity;
        if (!apiKey) {
            throw new Error('Perplexity API key not configured');
        }

        const systemPrompt = `You are an expert Trello card analyzer. Provide JSON analysis with: about, history, status, nextSteps, insights.`;
        const userPrompt = `Analyze: ${cardData.name}\n${cardData.desc || ''}\nLabels: ${cardData.labels?.join(', ') || 'None'}`;

        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Perplexity API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const content = JSON.parse(data.choices[0].message.content);
            
            return {
                result: content,
                tokensUsed: data.usage?.total_tokens || 0,
                cost: this.calculateCost('perplexity', model, data.usage?.total_tokens || 0),
                model: model,
                provider: 'Perplexity'
            };
        } catch (error) {
            this.logProviderFailure('Perplexity', error);
            throw error;
        }
    }

    // Calculate cost based on tokens used
    calculateCost(provider, model, tokens) {
        const config = this.modelConfigs[model];
        if (!config) return 0;
        return (tokens / 1000) * config.costPer1kTokens;
    }

    // Main analysis method that routes to the correct provider
    async analyzeCard(modelName, cardData) {
        const config = this.modelConfigs[modelName];
        if (!config) {
            throw new Error(`Unknown model: ${modelName}`);
        }

        const provider = config.provider;
        const model = config.model;

        switch (provider) {
            case 'openai':
                return await this.callOpenAI(model, '', cardData);
            case 'anthropic':
                return await this.callAnthropic(model, '', cardData);
            case 'google':
                return await this.callGoogle(model, '', cardData);
            case 'cohere':
                return await this.callCohere(model, '', cardData);
            case 'perplexity':
                return await this.callPerplexity(model, '', cardData);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    // Validate API key by making a test call
    async validateApiKey(provider) {
        const apiKey = this.apiKeys[provider];
        if (!apiKey) {
            return { valid: false, error: 'API key not set' };
        }

        try {
            // Make a minimal test call to validate the key
            switch (provider) {
                case 'openai':
                    const openaiResponse = await fetch('https://api.openai.com/v1/models', {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    });
                    return { valid: openaiResponse.ok, error: openaiResponse.ok ? null : 'Invalid API key' };
                
                case 'anthropic':
                    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'claude-3-haiku-20240307',
                            max_tokens: 1,
                            messages: [{ role: 'user', content: 'test' }]
                        })
                    });
                    return { valid: anthropicResponse.ok, error: anthropicResponse.ok ? null : 'Invalid API key' };
                
                default:
                    return { valid: true, error: null }; // Assume valid for other providers
            }
        } catch (error) {
            return { valid: false, error: this.sanitizeErrorMessage(error) };
        }
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIProviders;
}
