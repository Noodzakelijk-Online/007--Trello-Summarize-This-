// Attachment Processor Module
// Handles extraction of text content from various file types

class AttachmentProcessor {
    constructor() {
        this.supportedTypes = {
            pdf: ['application/pdf', '.pdf'],
            word: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx', '.doc'],
            excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx', '.xls'],
            text: ['text/plain', 'text/markdown', 'text/csv', 'text/tab-separated-values', '.txt', '.md', '.csv', '.tsv'],
            image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', '.jpg', '.jpeg', '.png', '.gif', '.webp'],
            link: ['http://', 'https://']
        };
    }

    sanitizeErrorMessage(error) {
        const message = error && error.message ? error.message : String(error || 'Attachment processing failed');
        return message
            .replace(/https?:\/\/[^\s)]+/gi, '[url redacted]')
            .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
            .replace(/sk-[A-Za-z0-9_-]{12,}/g, 'sk-[redacted]')
            .replace(/(api[_-]?key|token)(\s*[:=]\s*)([A-Za-z0-9._~+/=-]+)/gi, '$1$2[redacted]')
            .slice(0, 240);
    }

    // Bounded active-popup path: only fetch small HTTPS text-like attachments after the user enables it.
    async processSafeTextAttachments(attachments, options = {}) {
        const source = Array.isArray(attachments) ? attachments : [];
        const limits = {
            maxAttachments: this.clampNumber(options.maxAttachments, 5, 1, 12),
            maxBytes: this.clampNumber(options.maxBytes, 200000, 10000, 500000),
            maxExtractedCharacters: this.clampNumber(options.maxExtractedCharacters, 3000, 500, 10000),
            timeoutMs: this.clampNumber(options.timeoutMs, 10000, 1000, 30000)
        };
        let attempted = 0;
        let extracted = 0;
        let failed = 0;

        const processed = [];
        for (const attachment of source.slice(0, 25)) {
            if (!this.isTextLikeAttachment(attachment)) {
                processed.push(this.metadataOnlyAttachment(attachment, 'not-text-like'));
                continue;
            }

            if (attempted >= limits.maxAttachments) {
                processed.push(this.metadataOnlyAttachment(attachment, 'text-extraction-limit'));
                continue;
            }

            attempted += 1;
            try {
                const result = await this.processSafeTextAttachment(attachment, limits);
                extracted += result.extractedText ? 1 : 0;
                processed.push(result);
            } catch (error) {
                failed += 1;
                processed.push({
                    ...attachment,
                    processed: false,
                    type: this.detectType(attachment),
                    extractionStatus: 'failed',
                    error: error.message,
                    extractedText: '',
                    content: `Text extraction failed: ${error.message}`
                });
            }
        }

        return {
            attachments: processed,
            status: {
                ok: failed === 0,
                attempted: attempted,
                extracted: extracted,
                failed: failed,
                skipped: Math.max(source.length - attempted, 0),
                detail: extracted
                    ? `${extracted} text attachment(s) extracted with bounded HTTPS reads.`
                    : attempted
                        ? 'Text attachment extraction ran, but no text was extracted.'
                        : 'No text-like attachments were eligible for extraction.'
            }
        };
    }

    isTextLikeAttachment(attachment) {
        const mimeType = String((attachment && (attachment.mimeType || attachment.type)) || '').toLowerCase();
        const name = String((attachment && attachment.name) || '').toLowerCase();
        const extension = this.getExtension(name);
        return /^text\//.test(mimeType) ||
            mimeType === 'application/csv' ||
            ['txt', 'md', 'csv', 'tsv'].indexOf(extension) !== -1;
    }

    async processSafeTextAttachment(attachment, limits) {
        if (!attachment || !attachment.url) {
            throw new Error('Attachment has no fetchable URL');
        }

        const knownBytes = Number(attachment.bytes || attachment.size || 0);
        if (knownBytes > limits.maxBytes) {
            throw new Error(`Attachment is larger than the ${this.formatBytes(limits.maxBytes)} text extraction cap`);
        }

        const response = await this.safeFetchAttachment(attachment.url, {
            timeoutMs: limits.timeoutMs,
            headers: { Accept: 'text/plain,text/csv,text/markdown,*/*;q=0.2' }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch text attachment: ${response.statusText || response.status}`);
        }

        const blob = await response.blob();
        if (blob.size > limits.maxBytes) {
            throw new Error(`Attachment response is larger than the ${this.formatBytes(limits.maxBytes)} text extraction cap`);
        }

        const text = await blob.text();
        const normalizedText = String(text || '').replace(/\r\n/g, '\n').replace(/\s+$/g, '');
        const extractedText = normalizedText.slice(0, limits.maxExtractedCharacters);
        const truncated = normalizedText.length > extractedText.length;
        const lines = extractedText.split('\n');

        return {
            ...attachment,
            processed: true,
            type: this.detectType(attachment),
            extractionStatus: 'text-extracted',
            extractedText: extractedText,
            content: `Text attachment: ${attachment.name || 'Attachment'}\n\n${extractedText}${truncated ? '\n\n[Content truncated before analysis]' : ''}`,
            metadata: {
                size: blob.size,
                formattedSize: this.formatBytes(blob.size),
                type: blob.type || attachment.mimeType || 'text/plain',
                originalCharacters: normalizedText.length,
                extractedCharacters: extractedText.length,
                lines: lines.length,
                truncated: truncated
            }
        };
    }

    metadataOnlyAttachment(attachment, reason) {
        return {
            ...attachment,
            processed: false,
            type: this.detectType(attachment),
            extractionStatus: reason || 'metadata-only',
            extractedText: attachment && attachment.extractedText ? attachment.extractedText : '',
            content: attachment && attachment.content ? attachment.content : `Attachment metadata only: ${(attachment && attachment.name) || 'Attachment'}`
        };
    }

    // Main processing method. Defaults to bounded text extraction and metadata-only binary handling.
    async processAttachments(attachments, options = {}) {
        if (!attachments || attachments.length === 0) {
            return [];
        }

        const processed = [];
        for (const attachment of attachments) {
            try {
                const result = await this.processAttachment(attachment, options);
                processed.push(result);
            } catch (error) {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn(`Failed to process attachment: ${this.sanitizeErrorMessage(error)}`);
                }
                const safeError = this.sanitizeErrorMessage(error);
                processed.push({
                    ...attachment,
                    processed: false,
                    error: safeError,
                    content: `Failed to process: ${safeError}`
                });
            }
        }

        return processed;
    }

    // Process individual attachment
    async processAttachment(attachment, options = {}) {
        const type = this.detectType(attachment);

        if (this.isTextLikeAttachment(attachment)) {
            try {
                return await this.processSafeTextAttachment(attachment, this.normalizeExtractionLimits(options));
            } catch (error) {
                const safeError = this.sanitizeErrorMessage(error);
                return {
                    ...attachment,
                    processed: false,
                    type: type,
                    extractionStatus: 'failed',
                    error: safeError,
                    extractedText: '',
                    content: `Text extraction failed: ${safeError}`
                };
            }
        }

        if (options.allowBinaryFetch !== true && ['pdf', 'word', 'excel', 'image'].indexOf(type) !== -1) {
            return this.metadataOnlyAttachment(attachment, 'metadata-only-binary');
        }

        switch (type) {
            case 'pdf':
                return await this.processPDF(attachment);
            case 'word':
                return await this.processWord(attachment);
            case 'excel':
                return await this.processExcel(attachment);
            case 'text':
                return await this.processText(attachment);
            case 'image':
                return await this.processImage(attachment);
            case 'link':
                return await this.processLink(attachment);
            default:
                return this.processUnknown(attachment);
        }
    }

    // Detect attachment type
    detectType(attachment) {
        const mimeType = attachment.mimeType || '';
        const name = (attachment.name || '').toLowerCase();
        const url = (attachment.url || '').toLowerCase();

        // Check for web links
        if (url.startsWith('http://') || url.startsWith('https://')) {
            if (!mimeType || mimeType.includes('text/html')) {
                return 'link';
            }
        }

        // Check PDF
        if (mimeType.includes('pdf') || name.endsWith('.pdf')) {
            return 'pdf';
        }

        // Check Word
        if (mimeType.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) {
            return 'word';
        }

        // Check Excel
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || 
            name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
            return 'excel';
        }

        // Check text
        if (mimeType.includes('text') || name.endsWith('.txt') || name.endsWith('.md')) {
            return 'text';
        }

        // Check image
        if (mimeType.includes('image') || 
            name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
            return 'image';
        }

        return 'unknown';
    }

    getExtension(nameOrUrl) {
        const value = String(nameOrUrl || '').split('?')[0].split('#')[0].toLowerCase();
        const match = value.match(/\.([a-z0-9]+)$/);
        return match ? match[1] : '';
    }

    clampNumber(value, fallback, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(min, Math.min(max, Math.round(number)));
    }

    normalizeExtractionLimits(options = {}) {
        return {
            maxAttachments: this.clampNumber(options.maxAttachments, 5, 1, 12),
            maxBytes: this.clampNumber(options.maxBytes, 200000, 10000, 500000),
            maxExtractedCharacters: this.clampNumber(options.maxExtractedCharacters, 3000, 500, 10000),
            timeoutMs: this.clampNumber(options.timeoutMs, 10000, 1000, 30000)
        };
    }

    // Process PDF files using PDF.js
    async processPDF(attachment) {
        try {
            // For browser environment, we'll use a simplified approach
            // In production, you'd want to use PDF.js library
            
            // Check if we can fetch the PDF
            const response = await this.safeFetchAttachment(attachment.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF: ${response.statusText}`);
            }

            const blob = await response.blob();
            const size = this.formatBytes(blob.size);

            // For now, return metadata
            // TODO: Implement actual PDF text extraction with PDF.js
            return {
                ...attachment,
                processed: true,
                type: 'pdf',
                extractedText: '',
                content: `PDF Document: ${attachment.name} (${size})\n\nNote: PDF text extraction requires PDF.js library. Currently showing metadata only.`,
                metadata: {
                    size: blob.size,
                    formattedSize: size,
                    type: 'application/pdf'
                }
            };
        } catch (error) {
            throw new Error(`PDF processing failed: ${error.message}`);
        }
    }

    // Process Word documents
    async processWord(attachment) {
        try {
            // For browser environment, Word processing is complex
            // Would require mammoth.js or similar library
            
            const response = await this.safeFetchAttachment(attachment.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch Word document: ${response.statusText}`);
            }

            const blob = await response.blob();
            const size = this.formatBytes(blob.size);

            // Return metadata for now
            // TODO: Implement actual Word document parsing with mammoth.js
            return {
                ...attachment,
                processed: true,
                type: 'word',
                extractedText: '',
                content: `Word Document: ${attachment.name} (${size})\n\nNote: Word document text extraction requires mammoth.js library. Currently showing metadata only.`,
                metadata: {
                    size: blob.size,
                    formattedSize: size,
                    type: 'word'
                }
            };
        } catch (error) {
            throw new Error(`Word processing failed: ${error.message}`);
        }
    }

    // Process Excel spreadsheets
    async processExcel(attachment) {
        try {
            const response = await this.safeFetchAttachment(attachment.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch Excel file: ${response.statusText}`);
            }

            const blob = await response.blob();
            const size = this.formatBytes(blob.size);

            // Check if it's CSV (easier to process)
            if (attachment.name.toLowerCase().endsWith('.csv')) {
                const text = await blob.text();
                const rows = text.split('\n').slice(0, 10); // First 10 rows
                const preview = rows.join('\n');
                
                return {
                    ...attachment,
                    processed: true,
                    type: 'excel',
                    extractedText: text,
                    content: `CSV Spreadsheet: ${attachment.name} (${size})\n\nPreview (first 10 rows):\n${preview}\n\n[${text.split('\n').length} total rows]`,
                    metadata: {
                        size: blob.size,
                        formattedSize: size,
                        rows: text.split('\n').length,
                        type: 'csv'
                    }
                };
            }

            // For Excel files, would need xlsx.js library
            // TODO: Implement Excel parsing with xlsx.js
            return {
                ...attachment,
                processed: true,
                type: 'excel',
                extractedText: '',
                content: `Excel Spreadsheet: ${attachment.name} (${size})\n\nNote: Excel file parsing requires xlsx.js library. Currently showing metadata only.`,
                metadata: {
                    size: blob.size,
                    formattedSize: size,
                    type: 'excel'
                }
            };
        } catch (error) {
            throw new Error(`Excel processing failed: ${error.message}`);
        }
    }

    // Process text files
    async processText(attachment) {
        try {
            const response = await this.safeFetchAttachment(attachment.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch text file: ${response.statusText}`);
            }

            const text = await response.text();
            const lines = text.split('\n');
            const preview = lines.slice(0, 20).join('\n'); // First 20 lines

            return {
                ...attachment,
                processed: true,
                type: 'text',
                extractedText: text,
                content: `Text File: ${attachment.name}\n\n${text.length > 1000 ? preview + '\n\n[Content truncated - ' + lines.length + ' total lines]' : text}`,
                metadata: {
                    size: text.length,
                    formattedSize: this.formatBytes(text.length),
                    lines: lines.length,
                    type: 'text'
                }
            };
        } catch (error) {
            throw new Error(`Text processing failed: ${error.message}`);
        }
    }

    // Process images (with optional OCR)
    async processImage(attachment) {
        try {
            const response = await this.safeFetchAttachment(attachment.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const blob = await response.blob();
            const size = this.formatBytes(blob.size);

            // Create object URL for preview
            const objectUrl = URL.createObjectURL(blob);

            // For OCR, would need Tesseract.js
            // TODO: Implement OCR with Tesseract.js
            return {
                ...attachment,
                processed: true,
                type: 'image',
                extractedText: '',
                content: `Image: ${attachment.name} (${size})\n\nNote: OCR text extraction from images requires Tesseract.js library. Currently showing metadata only.`,
                previewUrl: objectUrl,
                metadata: {
                    size: blob.size,
                    formattedSize: size,
                    type: blob.type,
                    dimensions: 'Unknown' // Would need to load image to get dimensions
                }
            };
        } catch (error) {
            throw new Error(`Image processing failed: ${error.message}`);
        }
    }

    // Process web links
    async processLink(attachment) {
        try {
            const url = attachment.url;
            const parsed = this.validateAttachmentUrl(url);
            const domain = parsed.hostname;

            return {
                ...attachment,
                processed: true,
                type: 'link',
                extractedText: '',
                content: `Web Link: ${attachment.name || domain}\nURL: ${parsed.href}\n\nNote: Web links are not fetched automatically for privacy and security.`,
                metadata: {
                    domain: domain,
                    url: parsed.href
                }
            };
        } catch (error) {
            throw new Error(`Link processing failed: ${error.message}`);
        }
    }

    // Process unknown file types
    processUnknown(attachment) {
        return {
            ...attachment,
            processed: false,
            type: 'unknown',
            content: `Unsupported file type: ${attachment.name}\nMIME type: ${attachment.mimeType || 'unknown'}`,
            metadata: {
                size: attachment.bytes,
                formattedSize: this.formatBytes(attachment.bytes || 0)
            }
        };
    }

    // Extract text from HTML
    extractTextFromHTML(html) {
        // Remove script and style tags
        let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
        
        // Remove HTML tags
        text = text.replace(/<[^>]+>/g, ' ');
        
        // Decode HTML entities
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');
        text = text.replace(/&quot;/g, '"');
        
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }

    // Fetch attachment content only after basic URL safety checks.
    async safeFetchAttachment(url, options = {}) {
        const parsed = this.validateAttachmentUrl(url);
        const fetchOptions = { ...options };
        const timeoutMs = fetchOptions.timeoutMs;
        delete fetchOptions.timeoutMs;

        if (timeoutMs && typeof AbortController !== 'undefined') {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            try {
                return await fetch(parsed.href, {
                    ...fetchOptions,
                    credentials: 'omit',
                    referrerPolicy: 'no-referrer',
                    redirect: 'error',
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
            }
        }

        return fetch(parsed.href, {
            ...fetchOptions,
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            redirect: 'error'
        });
    }

    validateAttachmentUrl(url) {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();

        if (parsed.protocol !== 'https:') {
            throw new Error('Only HTTPS attachment URLs can be fetched');
        }

        if (this.isPrivateOrLocalHostname(hostname)) {
            throw new Error('Private or local attachment URLs are not fetched');
        }

        return parsed;
    }

    isPrivateOrLocalHostname(hostname) {
        const value = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
        if (
            value === 'localhost' ||
            value.endsWith('.localhost') ||
            value.endsWith('.local') ||
            value === '::1' ||
            value === '0:0:0:0:0:0:0:1' ||
            value.indexOf('fc') === 0 ||
            value.indexOf('fd') === 0 ||
            value.indexOf('fe80:') === 0
        ) {
            return true;
        }

        const parts = value.split('.').map((part) => Number(part));
        if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
            return false;
        }

        const first = parts[0];
        const second = parts[1];
        return first === 0 ||
            first === 10 ||
            first === 127 ||
            (first === 100 && second >= 64 && second <= 127) ||
            (first === 169 && second === 254) ||
            (first === 172 && second >= 16 && second <= 31) ||
            (first === 192 && second === 168) ||
            first >= 224;
    }

    // Format bytes to human-readable size
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Generate summary of all attachments for AI analysis
    generateAttachmentsSummary(processedAttachments) {
        if (!processedAttachments || processedAttachments.length === 0) {
            return 'No attachments';
        }

        let summary = `\n\n=== ATTACHMENTS (${processedAttachments.length}) ===\n\n`;

        for (const attachment of processedAttachments) {
            summary += `📎 ${attachment.name} (${attachment.type})\n`;
            
            if (attachment.extractedText && attachment.extractedText.length > 0) {
                // Include extracted text (truncated if too long)
                const text = attachment.extractedText.substring(0, 500);
                summary += `Content: ${text}${attachment.extractedText.length > 500 ? '...' : ''}\n\n`;
            } else if (attachment.content) {
                summary += `${attachment.content}\n\n`;
            }
        }

        return summary;
    }

    // Check if attachment processing is supported in current environment
    checkEnvironmentSupport() {
        return {
            fetch: typeof fetch !== 'undefined',
            blob: typeof Blob !== 'undefined',
            url: typeof URL !== 'undefined',
            pdfjs: typeof pdfjsLib !== 'undefined',
            mammoth: typeof mammoth !== 'undefined',
            xlsx: typeof XLSX !== 'undefined',
            tesseract: typeof Tesseract !== 'undefined'
        };
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttachmentProcessor;
}

if (typeof window !== 'undefined') {
    window.AttachmentProcessor = AttachmentProcessor;
}
