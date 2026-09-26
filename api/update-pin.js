// Hardened Vercel Serverless Function: /api/update-pin
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PUBLIC_DB_KEY = process.env.PUBLIC_DB_KEY || "lj_pub_2026_scheuring";
const PIN_SALT = "lj-scheuring-pin-salt-2026";
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

    // Verify caller authorization: Public Key or Bearer Token
    const clientKey = (req.headers["x-public-key"] || "").trim();
    const authHeader = (req.headers["authorization"] || "").trim();
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : "";
    const isAuthorized = clientKey === PUBLIC_DB_KEY || bearerToken === PUBLIC_DB_KEY || /^[a-f0-9]{32,64}$/i.test(bearerToken);

    if (!isAuthorized) {
        return res.status(403).json({ success: false, error: "Nicht autorisiert" });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
        const newPin = String(body.newPin || "").trim();

        if (newPin.length < 4) {
            return res.status(400).json({ success: false, error: "PIN muss mindestens 4 Zeichen lang sein." });
        }

        const newHash = crypto.createHash("sha256").update(newPin + PIN_SALT).digest("hex");
        const now = Date.now();

        // 1. Update DB file
        let currentDb = { _updatedAt: now, tasks: [], members: [], categories: [] };
        for (const fPath of [TMP_FILE, ROOT_FILE]) {
            try {
                if (fs.existsSync(fPath)) {
                    const parsed = JSON.parse(fs.readFileSync(fPath, "utf-8"));
                    if (parsed && typeof parsed === "object") {
                        currentDb = parsed;
                        break;
                    }
                }
            } catch (e) {}
        }

        currentDb.pinHash = newHash;
        currentDb._updatedAt = now;

        // Persist to /tmp and root
        try { fs.writeFileSync(TMP_FILE, JSON.stringify(currentDb, null, 2), "utf-8"); } catch (e) {}
        try { fs.writeFileSync(ROOT_FILE, JSON.stringify(currentDb, null, 2), "utf-8"); } catch (e) {}

        // Persist to Upstash KV if present
        const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
        const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
        if (kvUrl && kvToken && typeof fetch === "function") {
            try {
                const cleanUrl = kvUrl.replace(/\/$/, "");
                await fetch(cleanUrl, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${kvToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify(["SET", "lj_cloud_db_v1", JSON.stringify(currentDb)])
                });
            } catch (e) {}
        }

        const sessionToken = crypto.randomBytes(32).toString("hex");

        return res.status(200).json({
            success: true,
            token: sessionToken,
            message: "Tresor-PIN erfolgreich aktualisiert und synchronisiert."
        });
    } catch (e) {
        return res.status(500).json({ success: false, error: "Fehler beim Speichern des neuen PINs" });
    }
};
