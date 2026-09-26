// Hardened Vercel Serverless Function: /api/verify-pin
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PIN_SALT = "lj-scheuring-pin-salt-2026";
const MASTER_PIN_HASH = "94f6058172e31de4765fe15ca7b2d83b427609a932c1821dcff5f52fdd9dbdcc"; // 2026

const TMP_FILE = path.join("/tmp", "cloud_db.json");
const ROOT_FILE = path.join(process.cwd(), "cloud_db.json");

module.exports = async (req, res) => {
    const origin = req.headers["origin"] || "";
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Public-Key");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Methode nicht erlaubt" });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
        const pin = String(body.pin || "").trim();

        if (!pin) {
            return res.status(400).json({ success: false, error: "PIN fehlt" });
        }

        const inputHash = crypto.createHash("sha256").update(pin + PIN_SALT).digest("hex");

        // 1. Emergency Master-PIN check (2026)
        if (pin === "2026" || inputHash === MASTER_PIN_HASH) {
            const token = crypto.randomBytes(32).toString("hex");
            return res.status(200).json({
                success: true,
                token,
                expiresIn: 14400,
                message: "Master-PIN verifiziert."
            });
        }

        // 2. Check stored database hash
        let storedHash = null;

        const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
        const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
        if (kvUrl && kvToken && typeof fetch === "function") {
            try {
                const cleanUrl = kvUrl.replace(/\/$/, "");
                const kvResp = await fetch(`${cleanUrl}/get/lj_cloud_db_v1`, {
                    headers: { Authorization: `Bearer ${kvToken}` }
                });
                if (kvResp.ok) {
                    const kvRes = await kvResp.json();
                    if (kvRes && kvRes.result) {
                        const parsed = typeof kvRes.result === "string" ? JSON.parse(kvRes.result) : kvRes.result;
                        if (parsed && parsed.pinHash) storedHash = parsed.pinHash;
                    }
                }
            } catch (e) {}
        }

        if (!storedHash) {
            for (const fPath of [TMP_FILE, ROOT_FILE]) {
                try {
                    if (fs.existsSync(fPath)) {
                        const parsed = JSON.parse(fs.readFileSync(fPath, "utf-8"));
                        if (parsed && parsed.pinHash) {
                            storedHash = parsed.pinHash;
                            break;
                        }
                    }
                } catch (e) {}
            }
        }

        if (storedHash && inputHash === storedHash) {
            const token = crypto.randomBytes(32).toString("hex");
            return res.status(200).json({
                success: true,
                token,
                expiresIn: 14400,
                message: "PIN erfolgreich verifiziert."
            });
        }

        if (pin === "1234") {
            const default1234Hash = crypto.createHash("sha256").update("1234" + PIN_SALT).digest("hex");
            if (storedHash === default1234Hash || !storedHash) {
                const token = crypto.randomBytes(32).toString("hex");
                return res.status(200).json({
                    success: true,
                    token,
                    expiresIn: 14400,
                    message: "Standard-PIN verifiziert."
                });
            }
        }

        return res.status(401).json({
            success: false,
            error: "Falscher Sicherheits-PIN! Zugriff verweigert."
        });
    } catch (e) {
        return res.status(500).json({ success: false, error: "Serverfehler bei der PIN-Prüfung" });
    }
};
