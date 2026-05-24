// Enhanced Attachment Processor with Full Library Integration
// Supports PDF.js, mammoth.js, xlsx.js, and Tesseract.js

class EnhancedAttachmentProcessor {
    constructor() {
        this.supportedTypes = {
            pdf: ['application/pdf', '.pdf'],
            word: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                   'application/msword', '.docx', '.doc'],
            excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                   'application/vnd.ms-excel', '.xlsx', '.xls'],
            csv: ['text/csv', '.csv'],
            text: ['text/plain', '.txt', '.md'],
            image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                   '.jpg', '.jpeg', '.png', '.gif', '.webp'],
            link: ['http://', 'https://']
        };

        // Library availability flags
        this.libraries = {
            pdfjs: typeof pdfjsLib !== 'undefined',
            mammoth: typeof mammoth !== 'undefined',
            xlsx: typeof XLSX !== 'undefined',
            tesseract: typeof Tesseract !== 'undefined'
        };

        // Initialize PDF.js worker if available
        if (this.libraries.pdfjs) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        console.log('Enhanced Attachment Processor initialized:', this.libraries);
    }

    // Main processing method
    async processAttachments(attachments, onProgress = null) {
        if (!attachments || attachments.length === 0) {
            return [];
        }

        const processed = [];
        for (let i = 0; i < attachments.length; i++) {
            const attachment = attachments[i];
            
            if (onProgress) {
                onProgress(i + 1, attachments.length, attachment.name);
            }

            try {
                const result = await this.processAttachment(attachment);
                processed.push(result);
            } catch (error) {
                console.warn(`Failed to process attachment ${attachment.name}:`, error);
                processed.push({
                    ...attachment,
                    processed: false,
                    error: error.message,
                    content: `Failed to process: ${error.message}`,
                    preview: `Error: ${error.message}`
                });
            }
        }

        return processed;
    }

    // Process individual attachment
    async processAttachment(attachment) {
        const type = this.detectType(attachment);
        
        console.log(`Processing ${attachment.name} as ${type}`);

        switch (type) {
            case 'pdf':
                return await this.processPDF(attachment);
            case 'word':
                return await this.processWord(attachment);
            case 'excel':
                return await this.processExcel(attachment);
            case 'csv':
                return await this.processCSV(attachment);
            case 'text':
                return await this.processText(attachment);
            case 'image':
                return await this.processImage(attachment);
            case 'link':
                return await this.processLink(attachment);
            default:
                return {
                    ...attachment,
                    processed: false,
                    type: 'unsupported',
                    content: `Unsupported file type: ${attachment.mimeType || 'unknown'}`,
                    preview: 'Unsupported format'
                };
        }
    }

    // Detect attachment type
    detectType(attachment) {
        const mimeType = attachment.mimeType?.toLowerCase() || '';
        const name = attachment.name?.toLowerCase() || '';
        const url = attachment.url?.toLowerCase() || '';

        // Check if it's a web link
        if (url.startsWith('http://') || url.startsWith('https://')) {
            if (!url.includes('trello-attachments')) {
                return 'link';
            }
        }

        // Check MIME type first
        for (const [type, patterns] of Object.entries(this.supportedTypes)) {
            if (patterns.some(pattern => mimeType.includes(pattern))) {
                return type;
            }
        }

        // Check file extension
        for (const [type, patterns] of Object.entries(this.supportedTypes)) {
            if (patterns.some(pattern => pattern.startsWith('.') && name.endsWith(pattern))) {
                return type;
            }
        }

        return 'unknown';
    }

    // Process PDF with PDF.js
    async processPDF(attachment) {
        if (!this.libraries.pdfjs) {
            return this.processPDFMetadata(attachment);
        }

        try {
            // Fetch PDF data
            const response = await this.safeFetchAttachment(attachment.url);
            const arrayBuffer = await response.arrayBuffer();

            // Load PDF document
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            const pageTexts = [];

            // Extract text from each page
            for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 50); pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                pageTexts.push(pageText);
                fullText += pageText + '\n\n';
            }

            const preview = fullText.substring(0, 500) + (fullText.length > 500 ? '...' : '');

            return {
                ...attachment,
                processed: true,
                type: 'pdf',
                content: fullText,
                preview: preview,
                metadata: {
                    pages: pdf.numPages,
                    pagesProcessed: Math.min(pdf.numPages, 50),
                    textLength: fullText.length,
                    extractedWith: 'PDF.js'
                }
            };

        } catch (error) {
            console.error('PDF.js processing failed:', error);
            return this.processPDFMetadata(attachment);
        }
    }

    // Fallback PDF metadata extraction
    processPDFMetadata(attachment) {
        return {
            ...attachment,
            processed: true,
            type: 'pdf',
            content: `PDF Document: ${attachment.name}`,
            preview: `PDF file (${this.formatBytes(attachment.bytes)}) - Full text extraction requires PDF.js library`,
            metadata: {
                extractedWith: 'metadata-only'
            }
        };
    }

    // Process Word document with mammoth.js
    async processWord(attachment) {
        if (!this.libraries.mammoth) {
            return this.processWordMetadata(attachment);
        }

        try {
            // Fetch document data
            const response = await this.safeFetchAttachment(attachment.url);
            const arrayBuffer = await response.arrayBuffer();

            // Extract text with mammoth.js
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            const text = result.value;
            const preview = text.substring(0, 500) + (text.length > 500 ? '...' : '');

            return {
                ...attachment,
                processed: true,
                type: 'word',
                content: text,
                preview: preview,
                metadata: {
                    textLength: text.length,
                    extractedWith: 'mammoth.js',
                    messages: result.messages
                }
            };

        } catch (error) {
            console.error('mammoth.js processing failed:', error);
            return this.processWordMetadata(attachment);
        }
    }

    // Fallback Word metadata extraction
    processWordMetadata(attachment) {
        return {
            ...attachment,
            processed: true,
            type: 'word',
            content: `Word Document: ${attachment.name}`,
            preview: `Word file (${this.formatBytes(attachment.bytes)}) - Full text extraction requires mammoth.js library`,
            metadata: {
                extractedWith: 'metadata-only'
            }
        };
    }

    // Process Excel with xlsx.js
    async processExcel(attachment) {
        if (!this.libraries.xlsx) {
            return this.processExcelMetadata(attachment);
        }

        try {
            // Fetch workbook data
            const response = await this.safeFetchAttachment(attachment.url);
            const arrayBuffer = await response.arrayBuffer();

            // Parse workbook
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            let fullText = '';
            const sheets = [];

            // Process each sheet
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                
                fullText += `\n=== ${sheetName} ===\n`;
                
                // Convert to text (first 100 rows)
                const rows = data.slice(0, 100);
                for (const row of rows) {
                    fullText += row.join('\t') + '\n';
                }

                sheets.push({
                    name: sheetName,
                    rows: data.length,
                    cols: data[0]?.length || 0
                });
            }

            const preview = fullText.substring(0, 500) + (fullText.length > 500 ? '...' : '');

            return {
                ...attachment,
                processed: true,
                type: 'excel',
                content: fullText,
                preview: preview,
                metadata: {
                    sheets: sheets,
                    totalSheets: workbook.SheetNames.length,
                    extractedWith: 'xlsx.js'
                }
            };

        } catch (error) {
            console.error('xlsx.js processing failed:', error);
            return this.processExcelMetadata(attachment);
        }
    }

    // Fallback Excel metadata extraction
    processExcelMetadata(attachment) {
        return {
            ...attachment,
            processed: true,
            type: 'excel',
            content: `Excel Spreadsheet: ${attachment.name}`,
            preview: `Excel file (${this.formatBytes(attachment.bytes)}) - Full parsing requires xlsx.js library`,
            metadata: {
                extractedWith: 'metadata-only'
            }
        };
    }

    // Process CSV files
    async processCSV(attachment) {
        try {
            const response = await this.safeFetchAttachment(attachment.url);
            const text = await response.text();
            
            // Parse CSV
            const lines = text.split('\n');
            const preview = lines.slice(0, 10).join('\n');

            return {
                ...attachment,
                processed: true,
                type: 'csv',
                content: text,
                preview: preview + (lines.length > 10 ? '\n...' : ''),
                metadata: {
                    rows: lines.length,
                    extractedWith: 'native'
                }
            };

        } catch (error) {
            console.error('CSV processing failed:', error);
            return {
                ...attachment,
                processed: false,
                type: 'csv',
                content: `Failed to fetch CSV: ${error.message}`,
                preview: 'Error loading CSV'
            };
        }
    }

    // Process text files
    async processText(attachment) {
        try {
            const response = await this.safeFetchAttachment(attachment.url);
            const text = await response.text();
            const preview = text.substring(0, 500) + (text.length > 500 ? '...' : '');

            return {
                ...attachment,
                processed: true,
                type: 'text',
                content: text,
                preview: preview,
                metadata: {
                    textLength: text.length,
                    extractedWith: 'native'
                }
            };

        } catch (error) {
            console.error('Text processing failed:', error);
            return {
                ...attachment,
                processed: false,
                type: 'text',
                content: `Failed to fetch text: ${error.message}`,
                preview: 'Error loading text'
            };
        }
    }

    // Process images with Tesseract.js OCR
    async processImage(attachment) {
        if (!this.libraries.tesseract) {
            return this.processImageMetadata(attachment);
        }

        try {
            const parsed = this.validateAttachmentUrl(attachment.url);
            // Run OCR on image
            const result = await Tesseract.recognize(
                parsed.href,
                'eng',
                {
                    logger: m => console.log(m)
                }
            );

            const text = result.data.text;
            const preview = text.substring(0, 500) + (text.length > 500 ? '...' : '');

            return {
                ...attachment,
                processed: true,
                type: 'image',
                content: text || 'No text detected in image',
                preview: preview || 'No text found',
                metadata: {
                    confidence: result.data.confidence,
                    textLength: text.length,
                    extractedWith: 'Tesseract.js'
                }
            };

        } catch (error) {
            console.error('Tesseract.js processing failed:', error);
            return this.processImageMetadata(attachment);
        }
    }

    // Fallback image metadata extraction
    processImageMetadata(attachment) {
        return {
            ...attachment,
            processed: true,
            type: 'image',
            content: `Image: ${attachment.name}`,
            preview: `Image file (${this.formatBytes(attachment.bytes)}) - OCR requires Tesseract.js library`,
            metadata: {
                extractedWith: 'metadata-only'
            }
        };
    }

    // Process web links
    async processLink(attachment) {
        try {
            const parsed = this.validateAttachmentUrl(attachment.url);
            return {
                ...attachment,
                url: parsed.href,
                processed: true,
                type: 'link',
                content: `Web Link: ${parsed.href}`,
                preview: `Link: ${parsed.href}`,
                metadata: {
                    url: parsed.href,
                    extractedWith: 'metadata-only'
                }
            };
        } catch (error) {
            return {
                ...attachment,
                processed: false,
                type: 'link',
                content: `Invalid or unsupported link: ${error.message}`,
                preview: 'Link was not fetched',
                metadata: {
                    extractedWith: 'metadata-only'
                }
            };
        }
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

    // Generate summary of all attachments for AI
    generateAttachmentsSummary(processedAttachments) {
        if (!processedAttachments || processedAttachments.length === 0) {
            return '';
        }

        let summary = '\n\n=== ATTACHMENTS ===\n\n';

        for (const attachment of processedAttachments) {
            summary += `${attachment.name} (${attachment.type}):\n`;
            
            if (attachment.processed && attachment.content) {
                // Include content preview
                const preview = attachment.content.substring(0, 1000);
                summary += preview + (attachment.content.length > 1000 ? '...\n\n' : '\n\n');
            } else {
                summary += `${attachment.preview || 'Not processed'}\n\n`;
            }
        }

        return summary;
    }

    // Format bytes to human-readable
    formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Check library availability
    checkLibraries() {
        return this.libraries;
    }

    // Get library status message
    getLibraryStatus() {
        const status = [];
        if (this.libraries.pdfjs) status.push('✓ PDF.js');
        else status.push('✗ PDF.js (metadata only)');
        
        if (this.libraries.mammoth) status.push('✓ mammoth.js');
        else status.push('✗ mammoth.js (metadata only)');
        
        if (this.libraries.xlsx) status.push('✓ xlsx.js');
        else status.push('✗ xlsx.js (metadata only)');
        
        if (this.libraries.tesseract) status.push('✓ Tesseract.js');
        else status.push('✗ Tesseract.js (metadata only)');
        
        return status.join(', ');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedAttachmentProcessor;
}
