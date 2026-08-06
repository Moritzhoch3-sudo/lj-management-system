// Vercel Serverless Function for Realtime Cloud Sync
const fs = require('fs');
const path = require('path');

let memoryStore = null;

module.exports = (req, res) => {
    // Enable CORS for all clients & devices
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        if (memoryStore) {
            return res.status(200).json(memoryStore);
        }
        try {
            const filePath = path.join(process.cwd(), 'cloud_db.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                memoryStore = data;
                return res.status(200).json(data);
            }
        } catch (e) {}

        return res.status(200).json({ _updatedAt: Date.now(), tasks: [], members: [] });
    }

    if (req.method === 'POST') {
        try {
            const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            if (payload && typeof payload === 'object') {
                payload._updatedAt = Date.now();
                memoryStore = payload;
                return res.status(200).json({ success: true, _updatedAt: payload._updatedAt });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON payload' });
        }
        return res.status(400).json({ error: 'Missing payload' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
