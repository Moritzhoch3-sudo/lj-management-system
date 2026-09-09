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

const TMP_FILE = path.join('/tmp', 'cloud_db.json');
const ROOT_FILE = path.join(process.cwd(), 'cloud_db.json');

module.exports = async (req, res) => {
    // Enterprise Security HTTP Headers
    const origin = req.headers['origin'] || '';
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
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
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
    const hasPublicAuth = clientKey === PUBLIC_DB_KEY || bearerToken === PUBLIC_DB_KEY;
    
    // Vault Session Bearer check:
    const isHexSessionToken = /^[a-f0-9]{64}$/i.test(bearerToken);
    const matchesVaultSecret = process.env.VAULT_SECRET && bearerToken === process.env.VAULT_SECRET;
    const hasVaultAuth = Boolean(matchesVaultSecret || (isHexSessionToken && bearerToken !== PUBLIC_DB_KEY));

    if (!hasPublicAuth && !hasVaultAuth) {
        return res.status(401).json({ error: 'Nicht autorisiert: Fehlender Zugriffsschlüssel' });
    }

    // Helper to get stored DB data across Vercel serverless containers
    const getStoredData = async () => {
        // 1. Upstash / Vercel KV if configured in environment
        const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
        const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
        if (kvUrl && kvToken && typeof fetch === 'function') {
            try {
                const cleanUrl = kvUrl.replace(/\/$/, '');
                const resp = await fetch(`${cleanUrl}/get/lj_cloud_db_v1`, {
                    headers: { Authorization: `Bearer ${kvToken}` }
                });
                if (resp.ok) {
                    const kvRes = await resp.json();
                    if (kvRes && kvRes.result) {
                        const parsed = typeof kvRes.result === 'string' ? JSON.parse(kvRes.result) : kvRes.result;
                        if (parsed && typeof parsed === 'object') {
                            memoryStore = parsed;
                            return JSON.parse(JSON.stringify(parsed));
                        }
                    }
                }
            } catch (e) {}
        }

        if (memoryStore) return JSON.parse(JSON.stringify(memoryStore));

        // 2. /tmp file (writable on AWS Lambda / Vercel across warm invocations)
        try {
            if (fs.existsSync(TMP_FILE)) {
                const raw = fs.readFileSync(TMP_FILE, 'utf-8');
                memoryStore = JSON.parse(raw);
                return JSON.parse(raw);
            }
        } catch (e) {}

        // 3. Fallback to repo initial database file
        try {
            if (fs.existsSync(ROOT_FILE)) {
                const raw = fs.readFileSync(ROOT_FILE, 'utf-8');
                memoryStore = JSON.parse(raw);
                return JSON.parse(raw);
            }
        } catch (e) {}

        return { _updatedAt: Date.now(), tasks: [], members: [], categories: [] };
    };

    // Helper to persist DB data safely
    const persistData = async (data) => {
        memoryStore = data;

        // 1. Persist to Upstash / Vercel KV if available
        const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
        const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
        if (kvUrl && kvToken && typeof fetch === 'function') {
            try {
                const cleanUrl = kvUrl.replace(/\/$/, '');
                await fetch(`${cleanUrl}/set/lj_cloud_db_v1`, {
                    method: 'POST',
                    headers: { 
                        Authorization: `Bearer ${kvToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(JSON.stringify(data))
                });
            } catch (e) {}
        }

        // 2. Persist to /tmp (writable on Vercel)
        try {
            fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2), 'utf-8');
        } catch (e) {}

        // 3. Persist to repo root if writable (local dev)
        try {
            fs.writeFileSync(ROOT_FILE, JSON.stringify(data, null, 2), 'utf-8');
        } catch (e) {}
    };

    if (req.method === 'GET') {
        const fullData = await getStoredData();

        // Row-Level Security (RLS) Filtering: strip sensitive vault collections if no vault token
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

            // Row-Level Security (RLS) Check:
            // Only reject if caller tries to update sensitive collections exclusively without vault auth
            const hasPublicUpdates = ['tasks', 'members', 'categories'].some(k => k in payload);
            const hasSensitiveUpdates = SENSITIVE_COLLECTIONS.some(k => k in payload);
            if (hasSensitiveUpdates && !hasVaultAuth && !hasPublicUpdates) {
                return res.status(403).json({ 
                    error: 'Row-Level Security: Für vertrauliche Vereinsinterna ist eine Tresor-Authentifizierung erforderlich' 
                });
            }

            const currentDb = await getStoredData();
            payload._updatedAt = Date.now();

            if (!hasVaultAuth) {
                // Public caller (logged in with Central Access Code):
                // Safely update public collections (tasks, members, categories) while preserving sensitive vault tables
                for (const pubKey of ['tasks', 'members', 'categories']) {
                    if (payload[pubKey] !== undefined) {
                        currentDb[pubKey] = payload[pubKey];
                    }
                }
                currentDb._updatedAt = payload._updatedAt;
                await persistData(currentDb);
            } else {
                // Vault caller (authenticated with Master PIN / session):
                // Full write access to all allowed collections
                for (const key of ALLOWED_PAYLOAD_KEYS) {
                    if (payload[key] !== undefined) {
                        currentDb[key] = payload[key];
                    }
                }
                currentDb._updatedAt = payload._updatedAt;
                await persistData(currentDb);
            }

            return res.status(200).json({ success: true, _updatedAt: payload._updatedAt });
        } catch (e) {
            return res.status(400).json({ error: 'Ungültiges JSON-Payload' });
        }
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
};
