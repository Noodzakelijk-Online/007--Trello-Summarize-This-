// Trello Power-Up Integration Module
// Handles fetching card data from Trello API

class TrelloIntegration {
    constructor() {
        this.t = null; // Trello Power-Up context
        this.isInTrello = false;
        this.apiKey = null;
        this.token = null;
    }

    // Initialize Trello Power-Up
    async initialize() {
        // Check if we're running inside Trello
        if (typeof window.TrelloPowerUp !== 'undefined') {
            this.isInTrello = true;
            this.t = window.TrelloPowerUp.iframe();
            console.log('Trello Power-Up initialized');
            return true;
        }
        console.log('Not running in Trello environment');
        return false;
    }

    // Get card data from Trello Power-Up context
    async getCardData() {
        if (!this.isInTrello || !this.t) {
            throw new Error('Not running in Trello environment');
        }

        try {
            // Get card information using Trello Power-Up API
            const card = await this.t.card('all');
            
            // Fetch additional details
            const members = await this.t.member('all');
            const board = await this.t.board('all');
            const list = await this.t.list('all');

            // Get attachments
            const attachments = card.attachments || [];
            
            // Get checklists and calculate progress
            const checklists = card.checklists || [];
            const checklistProgress = this.calculateChecklistProgress(checklists);

            // Get comments (actions)
            const comments = await this.getCardComments(card.id);

            // Structure the data
            const cardData = {
                id: card.id,
                name: card.name,
                desc: card.desc,
                due: card.due,
                dueComplete: card.dueComplete,
                labels: card.labels?.map(l => l.name) || [],
                members: card.members?.map(m => m.fullName) || [],
                list: list.name,
                board: board.name,
                url: card.url,
                shortUrl: card.shortUrl,
                attachments: attachments.map(a => ({
                    id: a.id,
                    name: a.name,
                    url: a.url,
                    mimeType: a.mimeType,
                    bytes: a.bytes
                })),
                checklists: checklists,
                checklistProgress: checklistProgress,
                comments: comments,
                customFields: card.customFieldItems || []
            };

            return cardData;
        } catch (error) {
            console.error('Error fetching Trello card data:', error);
            throw error;
        }
    }

    // Calculate checklist completion progress
    calculateChecklistProgress(checklists) {
        if (!checklists || checklists.length === 0) {
            return 'No checklists';
        }

        let totalItems = 0;
        let completedItems = 0;

        for (const checklist of checklists) {
            const items = checklist.checkItems || [];
            totalItems += items.length;
            completedItems += items.filter(item => item.state === 'complete').length;
        }

        if (totalItems === 0) {
            return 'No checklist items';
        }

        const percentage = Math.round((completedItems / totalItems) * 100);
        return `${completedItems} of ${totalItems} items completed (${percentage}%)`;
    }

    // Get card comments using Trello API
    async getCardComments(cardId) {
        try {
            // Use Trello's REST API to get card actions (comments)
            const response = await this.t.getRestApi().getCardActions(cardId, {
                filter: 'commentCard',
                limit: 100
            });

            return response.map(action => ({
                id: action.id,
                text: action.data.text,
                date: action.date,
                memberCreator: action.memberCreator?.fullName || 'Unknown'
            }));
        } catch (error) {
            console.warn('Could not fetch comments:', error);
            return [];
        }
    }

    // Process attachments (extract text from PDFs, Word docs, etc.)
    async processAttachments(attachments) {
        const processedAttachments = [];

        for (const attachment of attachments) {
            try {
                const processed = await this.processAttachment(attachment);
                processedAttachments.push(processed);
            } catch (error) {
                console.warn(`Failed to process attachment ${attachment.name}:`, error);
                processedAttachments.push({
                    ...attachment,
                    processed: false,
                    error: error.message
                });
            }
        }

        return processedAttachments;
    }

    // Process individual attachment
    async processAttachment(attachment) {
        const mimeType = attachment.mimeType || '';
        const name = attachment.name || '';

        // Determine attachment type
        if (mimeType.includes('pdf') || name.endsWith('.pdf')) {
            return await this.processPDF(attachment);
        } else if (mimeType.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) {
            return await this.processWord(attachment);
        } else if (mimeType.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
            return await this.processExcel(attachment);
        } else if (mimeType.includes('image')) {
            return await this.processImage(attachment);
        } else if (mimeType.includes('text') || name.endsWith('.txt') || name.endsWith('.md')) {
            return await this.processText(attachment);
        } else if (attachment.url && (attachment.url.startsWith('http://') || attachment.url.startsWith('https://'))) {
            return await this.processWebLink(attachment);
        } else {
            return {
                ...attachment,
                processed: false,
                content: 'Unsupported file type'
            };
        }
    }

    // Process PDF attachment
    async processPDF(attachment) {
        try {
            // Fetch PDF content
            const response = await fetch(attachment.url);
            const blob = await response.blob();
            
            // For now, return metadata (actual PDF parsing would require pdf.js or similar)
            return {
                ...attachment,
                processed: true,
                type: 'pdf',
                content: `PDF document: ${attachment.name} (${this.formatBytes(attachment.bytes)})`
            };
        } catch (error) {
            throw new Error(`PDF processing failed: ${error.message}`);
        }
    }

    // Process Word document
    async processWord(attachment) {
        return {
            ...attachment,
            processed: true,
            type: 'word',
            content: `Word document: ${attachment.name} (${this.formatBytes(attachment.bytes)})`
        };
    }

    // Process Excel spreadsheet
    async processExcel(attachment) {
        return {
            ...attachment,
            processed: true,
            type: 'excel',
            content: `Excel spreadsheet: ${attachment.name} (${this.formatBytes(attachment.bytes)})`
        };
    }

    // Process image attachment (could use OCR in future)
    async processImage(attachment) {
        return {
            ...attachment,
            processed: true,
            type: 'image',
            content: `Image: ${attachment.name} (${this.formatBytes(attachment.bytes)})`
        };
    }

    // Process text file
    async processText(attachment) {
        try {
            const response = await fetch(attachment.url);
            const text = await response.text();
            return {
                ...attachment,
                processed: true,
                type: 'text',
                content: text
            };
        } catch (error) {
            throw new Error(`Text file processing failed: ${error.message}`);
        }
    }

    // Process web link
    async processWebLink(attachment) {
        return {
            ...attachment,
            processed: true,
            type: 'link',
            content: `Web link: ${attachment.name} - ${attachment.url}`
        };
    }

    // Format bytes to human-readable size
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Get sample card data for testing
    getSampleCardData() {
        return {
            id: 'sample-card-123',
            name: 'Implement user authentication system',
            desc: 'Create secure login/logout functionality with JWT tokens, password hashing, and session management. Include forgot password feature and email verification.',
            due: '2024-01-15',
            dueComplete: false,
            labels: ['Backend', 'Security', 'High Priority'],
            members: ['John Doe', 'Jane Smith'],
            list: 'In Progress',
            board: 'Development Sprint',
            url: 'https://trello.com/c/sample123',
            shortUrl: 'https://trello.com/c/sample',
            attachments: [
                {
                    id: 'att1',
                    name: 'requirements.pdf',
                    url: 'https://example.com/requirements.pdf',
                    mimeType: 'application/pdf',
                    bytes: 245760
                },
                {
                    id: 'att2',
                    name: 'mockup.png',
                    url: 'https://example.com/mockup.png',
                    mimeType: 'image/png',
                    bytes: 102400
                }
            ],
            checklists: [
                {
                    name: 'Development Tasks',
                    checkItems: [
                        { name: 'Database schema', state: 'complete' },
                        { name: 'API endpoints', state: 'incomplete' },
                        { name: 'Frontend integration', state: 'incomplete' },
                        { name: 'Testing', state: 'incomplete' }
                    ]
                }
            ],
            checklistProgress: '1 of 4 items completed (25%)',
            comments: [
                {
                    id: 'comment1',
                    text: 'We should use bcrypt for password hashing',
                    date: '2024-01-10T10:30:00.000Z',
                    memberCreator: 'John Doe'
                },
                {
                    id: 'comment2',
                    text: 'JWT tokens should expire after 24 hours',
                    date: '2024-01-11T14:20:00.000Z',
                    memberCreator: 'Jane Smith'
                },
                {
                    id: 'comment3',
                    text: 'Added requirements document with security specifications',
                    date: '2024-01-12T09:15:00.000Z',
                    memberCreator: 'John Doe'
                }
            ],
            customFields: []
        };
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrelloIntegration;
}
