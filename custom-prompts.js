// Custom Prompt Templates Module
// Allow users to create and manage custom AI prompts

class CustomPromptManager {
    constructor() {
        this.storageKey = 'summarizeThis_customPrompts';
        this.prompts = this.loadPrompts();
        this.defaultPrompts = this.getDefaultPrompts();
    }

    // Load prompts from storage
    loadPrompts() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load custom prompts:', error);
            return [];
        }
    }

    // Save prompts to storage
    savePrompts() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.prompts));
        } catch (error) {
            console.error('Failed to save custom prompts:', error);
        }
    }

    // Get default prompt templates
    getDefaultPrompts() {
        return [
            {
                id: 'default',
                name: 'Default Analysis',
                description: 'Standard four-part analysis',
                system: 'You are an expert project analyst. Analyze Trello cards and provide clear, actionable summaries.',
                template: `Analyze this Trello card and provide a structured summary:

{{CARD_DATA}}

Provide analysis in JSON format with these fields:
{
  "about": "A comprehensive overview of what this card is about",
  "history": "What has happened so far on this card",
  "status": "Current status and progress",
  "nextSteps": "What needs to be done to complete this card",
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"]
}`,
                editable: false
            },
            {
                id: 'technical',
                name: 'Technical Focus',
                description: 'Focus on technical details and implementation',
                system: 'You are a senior software engineer. Analyze technical tasks with focus on implementation details.',
                template: `Analyze this technical task:

{{CARD_DATA}}

Provide technical analysis in JSON format:
{
  "about": "Technical overview and objectives",
  "history": "Development progress and changes",
  "status": "Current technical status and blockers",
  "nextSteps": "Technical tasks and implementation steps",
  "insights": ["Technical considerations", "Potential challenges", "Best practices"]
}`,
                editable: true
            },
            {
                id: 'business',
                name: 'Business Focus',
                description: 'Focus on business value and ROI',
                system: 'You are a business analyst. Focus on business value, ROI, and strategic impact.',
                template: `Analyze this business initiative:

{{CARD_DATA}}

Provide business analysis in JSON format:
{
  "about": "Business objectives and value proposition",
  "history": "Progress towards business goals",
  "status": "Current business status and metrics",
  "nextSteps": "Action items to achieve business objectives",
  "insights": ["Business impact", "ROI considerations", "Strategic recommendations"]
}`,
                editable: true
            },
            {
                id: 'agile',
                name: 'Agile/Sprint Focus',
                description: 'Focus on sprint planning and agile metrics',
                system: 'You are an agile coach. Analyze user stories and tasks from an agile perspective.',
                template: `Analyze this user story/task:

{{CARD_DATA}}

Provide agile analysis in JSON format:
{
  "about": "User story and acceptance criteria",
  "history": "Sprint progress and velocity",
  "status": "Current sprint status and burndown",
  "nextSteps": "Tasks for next sprint and backlog items",
  "insights": ["Story points estimate", "Dependencies", "Risk factors"]
}`,
                editable: true
            },
            {
                id: 'creative',
                name: 'Creative/Marketing Focus',
                description: 'Focus on creative aspects and marketing strategy',
                system: 'You are a creative director and marketing strategist. Focus on creative execution and marketing impact.',
                template: `Analyze this creative/marketing initiative:

{{CARD_DATA}}

Provide creative analysis in JSON format:
{
  "about": "Creative concept and marketing objectives",
  "history": "Creative development and campaign progress",
  "status": "Current creative status and performance metrics",
  "nextSteps": "Creative tasks and marketing actions",
  "insights": ["Creative opportunities", "Audience engagement", "Brand alignment"]
}`,
                editable: true
            }
        ];
    }

    // Get all prompts (default + custom)
    getAllPrompts() {
        return [...this.defaultPrompts, ...this.prompts];
    }

    // Get prompt by ID
    getPrompt(id) {
        return this.getAllPrompts().find(p => p.id === id);
    }

    // Add custom prompt
    addPrompt(prompt) {
        const newPrompt = {
            id: this.generateId(),
            name: prompt.name,
            description: prompt.description,
            system: prompt.system,
            template: prompt.template,
            editable: true,
            created: new Date().toISOString()
        };

        this.prompts.push(newPrompt);
        this.savePrompts();
        return newPrompt;
    }

    // Update custom prompt
    updatePrompt(id, updates) {
        const index = this.prompts.findIndex(p => p.id === id);
        if (index === -1) {
            throw new Error('Prompt not found or not editable');
        }

        this.prompts[index] = {
            ...this.prompts[index],
            ...updates,
            updated: new Date().toISOString()
        };

        this.savePrompts();
        return this.prompts[index];
    }

    // Delete custom prompt
    deletePrompt(id) {
        const prompt = this.prompts.find(p => p.id === id);
        if (!prompt) {
            throw new Error('Prompt not found or not deletable');
        }

        this.prompts = this.prompts.filter(p => p.id !== id);
        this.savePrompts();
    }

    // Duplicate prompt
    duplicatePrompt(id) {
        const original = this.getPrompt(id);
        if (!original) {
            throw new Error('Prompt not found');
        }

        return this.addPrompt({
            name: `${original.name} (Copy)`,
            description: original.description,
            system: original.system,
            template: original.template
        });
    }

    // Format prompt with card data
    formatPrompt(promptId, cardData) {
        const prompt = this.getPrompt(promptId);
        if (!prompt) {
            throw new Error('Prompt not found');
        }

        // Format card data
        let cardDataText = `CARD: ${cardData.name}\n`;
        cardDataText += `BOARD: ${cardData.board.name}\n`;
        cardDataText += `LIST: ${cardData.list.name}\n\n`;

        if (cardData.desc) {
            cardDataText += `DESCRIPTION:\n${cardData.desc}\n\n`;
        }

        if (cardData.labels && cardData.labels.length > 0) {
            cardDataText += `LABELS: ${cardData.labels.map(l => l.name).join(', ')}\n\n`;
        }

        if (cardData.members && cardData.members.length > 0) {
            cardDataText += `MEMBERS: ${cardData.members.map(m => m.fullName).join(', ')}\n\n`;
        }

        if (cardData.due) {
            cardDataText += `DUE DATE: ${new Date(cardData.due).toLocaleString()}\n`;
            cardDataText += `STATUS: ${cardData.dueComplete ? 'Completed' : 'Not completed'}\n\n`;
        }

        if (cardData.checklists && cardData.checklists.length > 0) {
            cardDataText += `CHECKLISTS:\n`;
            cardData.checklists.forEach(checklist => {
                cardDataText += `\n${checklist.name}:\n`;
                checklist.checkItems.forEach(item => {
                    const status = item.state === 'complete' ? '✓' : '○';
                    cardDataText += `  ${status} ${item.name}\n`;
                });
            });
            if (cardData.checklistProgress) {
                cardDataText += `\nProgress: ${cardData.checklistProgress}\n\n`;
            }
        }

        if (cardData.comments && cardData.comments.length > 0) {
            cardDataText += `COMMENTS:\n`;
            cardData.comments.forEach(comment => {
                cardDataText += `\n${comment.memberCreator.fullName} (${new Date(comment.date).toLocaleDateString()}):\n`;
                cardDataText += `${comment.text}\n`;
            });
            cardDataText += `\n`;
        }

        if (cardData.attachments && cardData.attachments.length > 0) {
            cardDataText += `ATTACHMENTS:\n`;
            cardData.attachments.forEach(att => {
                cardDataText += `- ${att.name} (${att.mimeType || 'unknown type'})\n`;
            });
            cardDataText += `\n`;
        }

        // Replace template variables
        const formattedTemplate = prompt.template.replace('{{CARD_DATA}}', cardDataText);

        return {
            system: prompt.system,
            user: formattedTemplate
        };
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Create prompt manager UI
    createPromptManagerUI() {
        const container = document.createElement('div');
        container.className = 'prompt-manager-container';
        container.innerHTML = `
            <div class="prompt-manager-header">
                <h2>📝 Custom Prompt Templates</h2>
                <button class="btn-close-prompt-manager" onclick="this.closest('.prompt-manager-container').remove()">×</button>
            </div>

            <div class="prompt-manager-actions">
                <button class="btn-add-prompt" onclick="window.customPromptManager.showAddPromptDialog()">
                    + Add Custom Prompt
                </button>
            </div>

            <div class="prompt-list">
                <h3>Available Prompts</h3>
                ${this.renderPromptList()}
            </div>
        `;

        return container;
    }

    // Render prompt list
    renderPromptList() {
        const prompts = this.getAllPrompts();
        
        return prompts.map(prompt => `
            <div class="prompt-item ${prompt.editable ? 'custom' : 'default'}">
                <div class="prompt-item-header">
                    <h4>${prompt.name}</h4>
                    <span class="prompt-badge">${prompt.editable ? 'Custom' : 'Default'}</span>
                </div>
                <p class="prompt-description">${prompt.description}</p>
                <div class="prompt-actions">
                    <button onclick="window.customPromptManager.viewPrompt('${prompt.id}')">View</button>
                    <button onclick="window.customPromptManager.duplicatePrompt('${prompt.id}')">Duplicate</button>
                    ${prompt.editable ? `
                        <button onclick="window.customPromptManager.editPrompt('${prompt.id}')">Edit</button>
                        <button onclick="window.customPromptManager.deletePrompt('${prompt.id}')">Delete</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // Show add prompt dialog
    showAddPromptDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'prompt-dialog';
        dialog.innerHTML = `
            <div class="prompt-dialog-content">
                <h3>Add Custom Prompt</h3>
                <form id="addPromptForm">
                    <div class="form-group">
                        <label>Name:</label>
                        <input type="text" id="promptName" required />
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <input type="text" id="promptDescription" required />
                    </div>
                    <div class="form-group">
                        <label>System Message:</label>
                        <textarea id="promptSystem" rows="3" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Template (use {{CARD_DATA}} for card information):</label>
                        <textarea id="promptTemplate" rows="10" required></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit">Add Prompt</button>
                        <button type="button" onclick="this.closest('.prompt-dialog').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(dialog);

        document.getElementById('addPromptForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPrompt({
                name: document.getElementById('promptName').value,
                description: document.getElementById('promptDescription').value,
                system: document.getElementById('promptSystem').value,
                template: document.getElementById('promptTemplate').value
            });
            dialog.remove();
            this.updateUI();
        });
    }

    // View prompt details
    viewPrompt(id) {
        const prompt = this.getPrompt(id);
        if (!prompt) return;

        alert(`${prompt.name}\n\n${prompt.description}\n\nSystem: ${prompt.system}\n\nTemplate:\n${prompt.template}`);
        // TODO: Implement proper modal view
    }

    // Edit prompt
    editPrompt(id) {
        const prompt = this.getPrompt(id);
        if (!prompt || !prompt.editable) return;

        // TODO: Implement edit dialog
        alert('Edit functionality coming soon!');
    }

    // Update UI
    updateUI() {
        const promptList = document.querySelector('.prompt-list');
        if (promptList) {
            promptList.innerHTML = '<h3>Available Prompts</h3>' + this.renderPromptList();
        }
    }

    // Export prompts
    exportPrompts() {
        const data = {
            exportDate: new Date().toISOString(),
            prompts: this.prompts
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom-prompts-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import prompts
    importPrompts(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.prompts && Array.isArray(data.prompts)) {
                data.prompts.forEach(prompt => {
                    this.addPrompt(prompt);
                });
                return data.prompts.length;
            }
            throw new Error('Invalid format');
        } catch (error) {
            console.error('Failed to import prompts:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CustomPromptManager;
}
