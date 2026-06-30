// Trello Power-Up Integration Module
// Handles fetching card data from Trello API

class TrelloIntegration {
    constructor() {
        this.t = null; // Trello Power-Up context
        this.isInTrello = false;
        this.apiKey = null;
        this.token = null;
    }

    sanitizeErrorMessage(error) {
        const message = error && error.message ? error.message : String(error || 'Trello request failed');
        return message
            .replace(/https?:\/\/[^\s)]+/gi, '[url redacted]')
            .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
            .replace(/sk-[A-Za-z0-9_-]{12,}/g, 'sk-[redacted]')
            .replace(/token\s+[A-Za-z0-9._~+/=-]+/gi, 'token [redacted]')
            .replace(/(api[_-]?key|token)(\s*[:=]\s*)([A-Za-z0-9._~+/=-]+)/gi, '$1$2[redacted]')
            .slice(0, 240);
    }

    logSafeWarning(message, error) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn(`${message}: ${this.sanitizeErrorMessage(error)}`);
        }
    }

    sourceStatusFromRead(result) {
        if (result && result.ok) {
            return { ok: true };
        }

        return {
            ok: false,
            error: result && result.error ? result.error : 'Source read failed.'
        };
    }

    async readTrelloSource(label, fallbackValue, reader) {
        try {
            return {
                ok: true,
                value: await reader()
            };
        } catch (error) {
            this.logSafeWarning(`Could not fetch ${label}`, error);
            return {
                ok: false,
                value: fallbackValue,
                error: this.sanitizeErrorMessage(error)
            };
        }
    }

    toNumber(value, fallback = 0) {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : fallback;
    }

    memberNamesFrom(card, memberRead) {
        const cardMembers = Array.isArray(card.members) ? card.members : [];
        const contextMembers = memberRead && Array.isArray(memberRead.value) ? memberRead.value : [];
        const members = cardMembers.length > 0 ? cardMembers : contextMembers;

        return members
            .map(member => {
                if (typeof member === 'string') {
                    return member;
                }
                return member && (member.fullName || member.username || member.name);
            })
            .filter(Boolean);
    }

    // Initialize Trello Power-Up
    async initialize() {
        // Check if we're running inside Trello
        if (typeof window.TrelloPowerUp !== 'undefined') {
            this.isInTrello = true;
            this.t = window.TrelloPowerUp.iframe();
            return true;
        }
        return false;
    }

    // Get card data from Trello Power-Up context
    async getCardData() {
        if (!this.isInTrello || !this.t) {
            throw new Error('Not running in Trello environment');
        }

        try {
            const cardRead = await this.readTrelloSource('card', null, () => this.t.card('all'));
            if (!cardRead.ok || !cardRead.value) {
                throw new Error(`Could not fetch card: ${cardRead.error || 'Source read failed.'}`);
            }

            const card = cardRead.value;

            const [memberRead, boardRead, listRead, commentsRead] = await Promise.all([
                this.readTrelloSource('members', [], () => this.t.member('all')),
                this.readTrelloSource('board', {}, () => this.t.board('all')),
                this.readTrelloSource('list', {}, () => this.t.list('all')),
                this.getCardCommentsWithStatus(card.id)
            ]);

            // Get attachments
            const attachments = card.attachments || [];
            
            // Get checklists and calculate progress
            const checklists = card.checklists || [];
            const checklistProgress = this.calculateChecklistProgress(checklists);

            // Get comments (actions)
            const comments = commentsRead.value;
            const sourceStatus = {
                card: { ok: true },
                members: this.sourceStatusFromRead(memberRead),
                board: this.sourceStatusFromRead(boardRead),
                list: this.sourceStatusFromRead(listRead),
                comments: this.sourceStatusFromRead(commentsRead),
                attachments: { ok: true },
                checklists: { ok: true },
                customFields: { ok: true }
            };

            // Structure the data
            const cardData = {
                id: card.id,
                name: card.name,
                desc: card.desc,
                due: card.due,
                dueComplete: card.dueComplete,
                labels: card.labels?.map(l => l.name) || [],
                members: this.memberNamesFrom(card, memberRead),
                list: listRead.value?.name || '',
                board: boardRead.value?.name || '',
                url: card.url,
                shortUrl: card.shortUrl,
                badges: card.badges || {},
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
                customFields: card.customFieldItems || [],
                __sourceCounts: {
                    comments: this.toNumber(card.badges?.comments, comments.length),
                    attachments: this.toNumber(card.badges?.attachments, attachments.length),
                    checklists: checklists.length,
                    checklistItems: this.toNumber(card.badges?.checkItems),
                    customFields: Array.isArray(card.customFieldItems) ? card.customFieldItems.length : 0
                },
                __sourceStatus: sourceStatus
            };

            return cardData;
        } catch (error) {
            this.logSafeWarning('Error fetching Trello card data', error);
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
        const result = await this.getCardCommentsWithStatus(cardId);
        return result.value;
    }

    async getCardCommentsWithStatus(cardId) {
        try {
            // Use Trello's REST API to get card actions (comments)
            const restApi = await this.t.getRestApi();
            if (!restApi || typeof restApi.getCardActions !== 'function') {
                throw new Error('Comment action API was not available in this Power-Up runtime.');
            }

            const response = await restApi.getCardActions(cardId, {
                filter: 'commentCard',
                limit: 100
            });

            const actions = Array.isArray(response) ? response : [];
            return {
                ok: true,
                value: actions.map(action => ({
                    id: action.id,
                    text: action.data?.text || '',
                    date: action.date,
                    memberCreator: action.memberCreator?.fullName || 'Unknown'
                }))
            };
        } catch (error) {
            this.logSafeWarning('Could not fetch comments', error);
            return {
                ok: false,
                value: [],
                error: this.sanitizeErrorMessage(error)
            };
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
                this.logSafeWarning('Failed to process attachment metadata', error);
                processedAttachments.push({
                    ...attachment,
                    processed: false,
                    error: this.sanitizeErrorMessage(error)
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
            const response = await this.safeFetchAttachment(attachment.url);
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
            const response = await this.safeFetchAttachment(attachment.url);
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
        const parsed = this.validateAttachmentUrl(attachment.url);
        return {
            ...attachment,
            url: parsed.href,
            processed: true,
            type: 'link',
            content: `Web link: ${attachment.name} - ${parsed.href}`
        };
    }

    async safeFetchAttachment(url, options = {}) {
        const parsed = this.validateAttachmentUrl(url);
        return fetch(parsed.href, {
            ...options,
            credentials: 'omit',
            referrerPolicy: 'no-referrer'
        });
    }

    validateAttachmentUrl(url) {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();
        const isPrivateHost = (
            hostname === 'localhost' ||
            hostname.endsWith('.localhost') ||
            hostname.endsWith('.local') ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname === '[::1]' ||
            hostname === '::1' ||
            hostname.startsWith('10.') ||
            hostname.startsWith('192.168.') ||
            /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
            hostname.startsWith('169.254.')
        );

        if (parsed.protocol !== 'https:' || isPrivateHost) {
            throw new Error('Attachment URL must be HTTPS and publicly reachable');
        }

        return parsed;
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
