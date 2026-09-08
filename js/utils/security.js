/**
 * Security & Sanitization Utilities (XSS Protection, Input Validation, Response Trimming)
 */

export class SecurityUtils {
    /**
     * Escape HTML characters to prevent XSS attacks when embedding user input into innerHTML
     */
    static escapeHTML(str) {
        if (typeof str !== 'string') return str || '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Trim and validate input payload fields
     */
    static sanitizeInput(input, maxLen = 500) {
        if (typeof input !== 'string') return '';
        const trimmed = input.trim().slice(0, maxLen);
        return this.escapeHTML(trimmed);
    }
}
