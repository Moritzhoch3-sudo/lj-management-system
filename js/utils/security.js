/**
 * Enterprise-Grade Security & Sanitization Utilities
 * XSS Defense, Input Validation, File Upload Restrictions, Payload Tampering Protection & Crypto
 */

export const PUBLIC_DB_KEY = 'lj_pub_2026_scheuring';

export class SecurityUtils {
    /**
     * Escape HTML characters to prevent XSS attacks when embedding user input into innerHTML
     */
    static escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/`/g, '&#x60;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Trim and validate input payload fields, removing control characters
     */
    static sanitizeInput(input, maxLen = 500) {
        if (typeof input !== 'string') return '';
        const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        const trimmed = cleaned.trim().slice(0, maxLen);
        return this.escapeHTML(trimmed);
    }

    /**
     * Sanitize filenames to prevent Path Traversal attacks (e.g. ../../evil.sh)
     */
    static sanitizeFilename(filename) {
        if (!filename || typeof filename !== 'string') return 'unnamed_file';
        // Strip path traversal sequences and illegal characters
        let safe = filename.replace(/[/\\?%*:|"<>]/g, '_');
        safe = safe.replace(/\.\.+/g, '.');
        safe = safe.replace(/^\.+/, '');
        safe = safe.trim();
        return safe.slice(0, 100) || 'unnamed_file';
    }

    /**
     * Restrict and validate file uploads: MIME type, file extension & max byte size
     */
    static validateFileUpload(file, typeCategory = 'document') {
        if (!file) {
            return { valid: false, error: 'Keine Datei ausgewählt.' };
        }

        const limits = {
            document: {
                maxSize: 10 * 1024 * 1024, // 10 MB
                allowedExts: ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
                allowedMimes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
            },
            audio: {
                maxSize: 25 * 1024 * 1024, // 25 MB
                allowedExts: ['mp3', 'wav', 'm4a', 'ogg', 'webm'],
                allowedMimes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm']
            }
        };

        const config = limits[typeCategory] || limits.document;

        // 1. Max Size Check
        if (file.size > config.maxSize) {
            const maxMB = Math.round(config.maxSize / (1024 * 1024));
            return { valid: false, error: `Datei zu groß! Maximal ${maxMB} MB erlaubt (Größe: ${(file.size / (1024 * 1024)).toFixed(1)} MB).` };
        }

        // 2. Extension Check
        const safeName = this.sanitizeFilename(file.name);
        const ext = (safeName.split('.').pop() || '').toLowerCase();
        if (!config.allowedExts.includes(ext)) {
            return { valid: false, error: `Dateityp .${ext} nicht gestattet. Erlaubt: ${config.allowedExts.join(', ')}` };
        }

        // 3. MIME Check
        if (file.type && !config.allowedMimes.includes(file.type.toLowerCase())) {
            // Some systems don't send precise audio mimes, allow if extension is confirmed valid
            if (!file.type.startsWith('audio/') && !file.type.startsWith('image/') && file.type !== 'application/pdf') {
                return { valid: false, error: `Ungültiger MIME-Typ: ${file.type}` };
            }
        }

        return { valid: true, sanitizedName: safeName };
    }

    /**
     * Prevent Prototype Pollution and illegal field tampering in JSON payloads
     */
    static validatePayload(payload, allowedKeys = null) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            return false;
        }

        // Check for prototype pollution attempts
        const jsonStr = JSON.stringify(payload);
        if (jsonStr.includes('__proto__') || jsonStr.includes('constructor') || jsonStr.includes('prototype')) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('⚠️ Prototype pollution attempt blocked!');
            }
            return false;
        }

        if (allowedKeys && Array.isArray(allowedKeys)) {
            for (const key of Object.keys(payload)) {
                if (!allowedKeys.includes(key)) {
                    if (typeof console !== 'undefined' && console.warn) {
                        console.warn(`⚠️ Illegal field tampering detected: key '${key}' not in whitelist!`);
                    }
                    return false;
                }
            }
        }

        return true;
    }
}
