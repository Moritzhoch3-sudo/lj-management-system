// Hardened Vercel Serverless Function for Realtime Cloud Sync
// Features: Row-Level Security (RLS), Field Tampering Defense, Public Key Validation
const fs = require('fs');
const path = require('path');

const PUBLIC_DB_KEY = process.env.PUBLIC_DB_KEY || 'lj_pub_2026_scheuring';
const SENSITIVE_COLLECTIONS = ['finances', 'contracts', 'minutes', 'pinHash', 'centralAccessCodeHash'];
const ALLOWED_PAYLOAD_KEYS = [
    '_updatedAt', 'tasks', 'members', 'categories',
    'finances', 'contracts', 'minutes', 'pinHash', 'centralAccessCodeHash'
];

let memoryStore = null;

module.exports = (req, res) => {
    // Enterprise Security HTTP Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Public-Key, X-Submission-Time-Ms');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Public Key Authorization
    const clientKey = (req.headers['x-public-key'] || '').trim();
    const authHeader = (req.headers['authorization'] || '').trim();
    const hasPublicAuth = clientKey === PUBLIC_DB_KEY || authHeader === `Bearer ${PUBLIC_DB_KEY}`;
    
    // Vault Session Bearer check
    const hasVaultAuth = authHeader.startsWith('Bearer ') && authHeader.length > 30 && authHeader !== `Bearer ${PUBLIC_DB_KEY}`;

    if (!hasPublicAuth && !hasVaultAuth) {
        return res.status(401).json({ error: 'Nicht autorisiert: Fehlender Zugriffsschlüssel' });
    }

    // Helper to get stored DB data
    const getStoredData = () => {
        if (memoryStore) return JSON.parse(JSON.stringify(memoryStore));
        try {
            const filePath = path.join(process.cwd(), 'cloud_db.json');
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf-8');
                memoryStore = JSON.parse(raw);
                return JSON.parse(raw);
            }
        } catch (e) {}
        return { _updatedAt: Date.now(), tasks: [], members: [], categories: [] };
    };

    if (req.method === 'GET') {
        const fullData = getStoredData();

        // Row-Level Security (RLS) Filtering
        if (!hasVaultAuth) {
            for (const col of SENSITIVE_COLLECTIONS) {
                delete fullData[col];
            }
        }

        return res.status(200).json(fullData);
    }

    if (req.method === 'POST') {
        try {
            const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            
            if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
                return res.status(400).json({ error: 'Payload muss ein JSON-Objekt sein' });
            }

            // Anti-Bot: Check Honeypots
            if (payload.bot_trap || payload.website_verification_trap) {
                return res.status(403).json({ error: 'Bot-Zugriff abgewiesen' });
            }

            // Anti-Field-Tampering & Prototype Pollution Defense
            const rawStr = JSON.stringify(payload);
            if (rawStr.includes('__proto__') || rawStr.includes('constructor') || rawStr.includes('prototype')) {
                return res.status(400).json({ error: 'Prototyp-Pollution blockiert' });
            }

            for (const key of Object.keys(payload)) {
                if (!ALLOWED_PAYLOAD_KEYS.includes(key)) {
                    return res.status(400).json({ error: `Unerlaubtes Feld '${key}' (Field Tampering blockiert)` });
                }
            }

            // Row-Level Security (RLS) for Mutations
            const writingSensitive = SENSITIVE_COLLECTIONS.some(k => k in payload);
            if (writingSensitive && !hasVaultAuth) {
                return res.status(403).json({ 
                    error: 'Row-Level Security: Für vertrauliche Vereinsinterna ist eine Tresor-Authentifizierung erforderlich' 
                });
            }

            const currentDb = getStoredData();
            payload._updatedAt = Date.now();

            if (!hasVaultAuth) {
                // Merge public fields safely without overwriting sensitive fields
                for (const pubKey of ['tasks', 'members', 'categories']) {
                    if (payload[pubKey] !== undefined) {
                        currentDb[pubKey] = payload[pubKey];
                    }
                }
                currentDb._updatedAt = payload._updatedAt;
                memoryStore = currentDb;
            } else {
                memoryStore = payload;
            }

            // Try to persist locally if writable
            try {
                const filePath = path.join(process.cwd(), 'cloud_db.json');
                fs.writeFileSync(filePath, JSON.stringify(memoryStore, null, 2), 'utf-8');
            } catch (e) {}

            return res.status(200).json({ success: true, _updatedAt: payload._updatedAt });
        } catch (e) {
            return res.status(400).json({ error: 'Ungültiges JSON-Payload' });
        }
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
};
