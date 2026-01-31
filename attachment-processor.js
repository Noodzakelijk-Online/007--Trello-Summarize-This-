// Attachment Processor Module
// Handles extraction of text content from various file types

class AttachmentProcessor {
    constructor() {
        this.supportedTypes = {
            pdf: ['application/pdf', '.pdf'],
            word: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx', '.doc'],
            excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx', '.xls'],
            text: ['text/plain', '.txt', '.md', '.csv'],
            image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', '.jpg', '.jpeg', '.png', '.gif', '.webp'],
            link: ['http://', 'https://']
        };
    }

    // Main processing method
    async processAttachments(attachments) {
        if (!attachments || attachments.length === 0) {
            return [];
        }

        const processed = [];
        for (const attachment of attachments) {
            try {
                const result = await this.processAttachment(attachment);
                processed.push(result);
            } catch (error) {
                console.warn(`Failed to process attachment ${attachment.name}:`, error);
                processed.push({
                    ...attachment,
                    processed: false,
                    error: error.message,
                    content: `Failed to process: ${error.message}`
                });
            }
        }

        return processed;
    }

    // Process individual attachment
    async processAttachment(attachment) {
        const type = this.detectType(attachment);
        
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

    // Process PDF files using PDF.js
    async processPDF(attachment) {
        try {
            // For browser environment, we'll use a simplified approach
            // In production, you'd want to use PDF.js library
            
            // Check if we can fetch the PDF
            const response = await fetch(attachment.url);
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
            
            const response = await fetch(attachment.url);
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
            const response = await fetch(attachment.url);
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
            const response = await fetch(attachment.url);
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
            const response = await fetch(attachment.url);
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
            // For web links, we can fetch and extract text
            // But need to be careful about CORS
            
            const url = attachment.url;
            const domain = new URL(url).hostname;

            // Try to fetch (may fail due to CORS)
            try {
                const response = await fetch(url, { mode: 'cors' });
                if (response.ok) {
                    const html = await response.text();
                    const text = this.extractTextFromHTML(html);
                    const preview = text.substring(0, 500);

                    return {
                        ...attachment,
                        processed: true,
                        type: 'link',
                        extractedText: text,
                        content: `Web Link: ${attachment.name || domain}\nURL: ${url}\n\nContent Preview:\n${preview}${text.length > 500 ? '...' : ''}`,
                        metadata: {
                            domain: domain,
                            url: url,
                            contentLength: text.length
                        }
                    };
                }
            } catch (corsError) {
                // CORS blocked, return link info only
                return {
                    ...attachment,
                    processed: true,
                    type: 'link',
                    extractedText: '',
                    content: `Web Link: ${attachment.name || domain}\nURL: ${url}\n\nNote: Content could not be fetched due to CORS restrictions.`,
                    metadata: {
                        domain: domain,
                        url: url
                    }
                };
            }

            return {
                ...attachment,
                processed: true,
                type: 'link',
                content: `Web Link: ${attachment.name || domain}\nURL: ${url}`,
                metadata: {
                    domain: domain,
                    url: url
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
