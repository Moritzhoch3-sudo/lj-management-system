import { SecurityUtils } from '../utils/security.js';

export class FileReaderEngine {
    static ALLOWED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx'];
    static MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    static MAX_TEXT_LENGTH = 100000; // 100k chars

    static validateFile(file) {
        if (!file) return { valid: false, error: 'Keine Datei ausgewählt.' };
        if (file.size > this.MAX_FILE_SIZE) return { valid: false, error: 'Datei ist zu groß (Max 5MB).' };
        
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
            return { valid: false, error: 'Dateityp wird nicht unterstützt.' };
        }
        
        return { valid: true };
    }

    static async readFile(file) {
        try {
            const validation = this.validateFile(file);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            let text = '';

            if (ext === '.txt' || ext === '.md') {
                text = await this.readText(file);
            } else if (ext === '.pdf') {
                text = await this.readPdf(file);
            } else if (ext === '.docx') {
                text = await this.readDocx(file);
            } else {
                return { success: false, error: 'Unsupported file type.' };
            }

            if (text.length > this.MAX_TEXT_LENGTH) {
                text = text.substring(0, this.MAX_TEXT_LENGTH);
            }

            return { success: true, text, fileName: SecurityUtils.sanitizeFilename(file.name) };
        } catch (error) {
            return { success: false, error: 'Fehler beim Lesen der Datei: ' + error.message };
        }
    }

    static readText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Konnte Textdatei nicht lesen.'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    static async readPdf(file) {
        const buffer = await file.arrayBuffer();
        
        // 1. Primary: Use PDF.js engine if loaded
        if (window.pdfjsLib) {
            try {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
                let fullText = '';
                
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    if (pageText.trim()) {
                        fullText += pageText + '\n';
                    }
                }
                
                if (fullText.trim().length > 0) {
                    return fullText;
                }
            } catch (pdfErr) {
                console.warn('PDF.js extraction failed, falling back to raw stream parsing:', pdfErr);
            }
        }

        // 2. Fallback: Parse uncompressed text streams from raw byte array
        const view = new Uint8Array(buffer);
        const decoder = new TextDecoder('utf-8');
        const textStr = decoder.decode(view);
        let extractedText = '';
        
        const regexBTET = /BT([\s\S]*?)ET/g;
        let match;
        while ((match = regexBTET.exec(textStr)) !== null) {
            const block = match[1];
            const stringRegex = /\((.*?)\)\s*(?:Tj|'|")|\[(.*?)\]\s*TJ/g;
            let strMatch;
            while ((strMatch = stringRegex.exec(block)) !== null) {
                if (strMatch[1]) {
                    extractedText += strMatch[1] + ' ';
                } else if (strMatch[2]) {
                    const arrMatch = strMatch[2];
                    const parenRegex = /\((.*?)\)/g;
                    let innerMatch;
                    while ((innerMatch = parenRegex.exec(arrMatch)) !== null) {
                        extractedText += innerMatch[1];
                    }
                    extractedText += ' ';
                }
            }
            extractedText += '\n';
        }
        
        extractedText = extractedText.replace(/\\(.)/g, '$1').trim();
        
        if (!extractedText) {
            throw new Error('Die PDF-Datei konnte nicht gelesen werden. Mögliche Ursachen:\n1. Die PDF ist ein eingescanntes Foto/Bild (ohne Text-Ebene).\n2. Die Datei ist verschlüsselt oder passwortgeschützt.\n\nBitte kopiere den Text der PDF in eine .txt / .docx Datei oder wandle die PDF über "Speichern unter" als durchsuchbare PDF um.');
        }
        
        return extractedText;
    }

    static async readDocx(file) {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        
        let offset = 0;
        let targetData = null;
        let isDeflate = false;
        
        // Very basic zip parsing looking for local file headers
        while (offset < data.length - 4) {
            if (data[offset] === 0x50 && data[offset+1] === 0x4B && data[offset+2] === 0x03 && data[offset+3] === 0x04) {
                const compMethod = data[offset+8] | (data[offset+9] << 8);
                const compSize = data[offset+18] | (data[offset+19] << 8) | (data[offset+20] << 16) | (data[offset+21] << 24);
                const nameLen = data[offset+26] | (data[offset+27] << 8);
                const extraLen = data[offset+28] | (data[offset+29] << 8);
                
                const nameStart = offset + 30;
                const nameEnd = nameStart + nameLen;
                const nameDecoder = new TextDecoder('utf-8');
                const name = nameDecoder.decode(data.subarray(nameStart, nameEnd));
                
                if (name === 'word/document.xml') {
                    const dataStart = nameEnd + extraLen;
                    targetData = data.subarray(dataStart, dataStart + compSize);
                    isDeflate = (compMethod === 8);
                    break;
                }
                
                // Jump to the next possible local header start
                offset = nameEnd + extraLen + compSize;
            } else {
                offset++;
            }
        }
        
        if (!targetData) {
            throw new Error('word/document.xml nicht gefunden.');
        }
        
        let xmlStr = '';
        if (isDeflate && typeof DecompressionStream !== 'undefined') {
            try {
                const ds = new DecompressionStream('deflate-raw');
                const writer = ds.writable.getWriter();
                writer.write(targetData);
                writer.close();
                
                const response = new Response(ds.readable);
                const uncompressedBuffer = await response.arrayBuffer();
                xmlStr = new TextDecoder('utf-8').decode(uncompressedBuffer);
            } catch (e) {
                throw new Error('Fehler beim Entpacken der DOCX Daten.');
            }
        } else if (!isDeflate) {
            xmlStr = new TextDecoder('utf-8').decode(targetData);
        } else {
            throw new Error('Browser unterstützt DecompressionStream nicht.');
        }
        
        let extractedText = '';
        const tagRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
        let match;
        while ((match = tagRegex.exec(xmlStr)) !== null) {
            extractedText += match[1] + ' ';
        }
        
        extractedText = extractedText.replace(/&lt;/g, '<')
                                     .replace(/&gt;/g, '>')
                                     .replace(/&amp;/g, '&')
                                     .replace(/&quot;/g, '"');
        return extractedText;
    }
}
