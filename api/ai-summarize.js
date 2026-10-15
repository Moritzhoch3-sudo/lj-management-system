// Hardened Vercel Serverless Function: /api/ai-summarize
// Creates intelligent meeting minutes, executive summaries, agenda items (TOPs), and actionable tasks
// using Google Gemini 1.5 Flash (free tier) or OpenAI GPT-4o-mini.

module.exports = async (req, res) => {
    const origin = req.headers["origin"] || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Public-Key");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Methode nicht erlaubt" });
    }

    try {
        let body = req.body;
        if (typeof body === "string") {
            try { body = JSON.parse(body); } catch (e) { body = {}; }
        }
        body = body || {};

        const transcript = String(body.transcript || "").trim();
        if (!transcript || transcript.length < 15) {
            return res.status(400).json({
                success: false,
                error: "TRANSCRIPT_TOO_SHORT",
                message: "Das Transkript ist zu kurz, um eine sinnvolle Sitzungszusammenfassung zu erstellen."
            });
        }

        const members = Array.isArray(body.members) ? body.members : [];
        const provider = (body.provider || "gemini").toLowerCase();
        
        // Resolve API Key: client-supplied key has priority, then environment variables
        const geminiKey = (body.apiKey && provider === "gemini") ? body.apiKey.trim() : (process.env.GEMINI_API_KEY || (provider === "gemini" ? (body.apiKey || "").trim() : ""));
        const openaiKey = (body.apiKey && provider === "openai") ? body.apiKey.trim() : (process.env.OPENAI_API_KEY || (provider === "openai" ? (body.apiKey || "").trim() : ""));

        const effectiveKey = provider === "openai" ? openaiKey : geminiKey;

        if (!effectiveKey) {
            return res.status(400).json({
                success: false,
                error: "NO_API_KEY",
                message: "Kein KI-API-Schlüssel hinterlegt. Bitte hinterlege einen kostenlosen Google Gemini API-Key oder OpenAI-Key in den Einstellungen der Vorstands-Zentrale."
            });
        }

        // Format Vorstandsmitglieder context
        const membersListStr = members.map(m => {
            const name = m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim() || "Mitglied";
            const role = m.role || m.systemRole || "Vorstand";
            return `- ID: "${m.id}", Name: "${name}", Amt: "${role}"`;
        }).join("\n");

        const systemPrompt = `Du bist der offizielle, hochintelligente Sitzungs-Copilot der "Landjugend Scheuring" (Verein / Vorstandschaft).
Deine Aufgabe ist es, aus dem gesprochenen Transkript einer Vorstandssitzung ein professionelles, vollständiges und strukturiertes Sitzungsprotokoll im Stil von "Microsoft Teams Intelligent Recap" zu generieren.

VORSTANDSMITGLIEDER DER LANDJUGEND SCHEURING:
${membersListStr || "- Kilian Salai (1. Vorstand, Spitzname: Kili, Kiwi)\n- Moritz Kubik (2. Kassier, Spitzname: Mo)\n- Valentin Müllner (2. Vorstand, Spitzname: Vali)\n- Linda Schweiger (1. Schriftführerin, Spitzname: Schwaigerin)\n- Cassandra Wunner (2. Schriftführerin, Spitzname: Cassy)"}

BEKANNTE SPITZNAMEN & ZUORDNUNGEN:
- "Mo" -> Moritz Kubik
- "Kiwi", "Kili" -> Kilian Salai
- "Vali" -> Valentin Müllner
- "Linda", "Schwaigerin" -> Linda Schweiger
- "Cassy" -> Cassandra Wunner
- "Hanni" -> Johannes Erhard
- "Premer" -> Felix Premer
- "Domi" -> Dominique Zahn
- "Michi" -> Michaela Grabmaier
- "Anja" -> Anja Löb
- "Rosa" -> Rosa Krieglmeier

REGELN FÜR DIE PROTOKOLLIERUNG:
1. SPRACHLICHES FILTERN: Entferne Füllwörter, Smalltalk, Begrüßungen, Wiederholungen ("äh", "also", "genau", "ja gut", "haben wir das auch geklärt").
2. ECHTER INHALTLICHER KONTEXT: Fasse niemals rohe Zitate zusammen! Verstehe den Sinn: Worum ging es? Was ist der Plan? Was wurde vereinbart? Welche Fakten und Zahlen wurden genannt?
3. TAGESORDNUNGSPUNKTE (TOPs): Teile den Ablauf in sinnvolle, zusammenhängende TOPs ein (z. B. "TOP 1: Vorstandschaftsausflug 2026", "TOP 2: Kürbisschnitzen").
   - Beschreibe bei jedem TOP in klarem, flüssigem Deutsch die Ideen, den Ablauf, Termine und wer was macht (z. B. wie der Ausflug ablaufen soll: Frühstück, Aktivität, Fahrradtour, Abendessen).
4. KONKRETE AUFGABEN (ACTION ITEMS):
   - Extrahiere ALLE Aufgaben und Arbeitsaufträge.
   - Formuliere präzise Titel im Infinitiv (z. B. "Vorstandschaftsausflug 2026 planen und vorbereiten").
   - Ordne jede Aufgabe zwingend der passenden Person zu (echter Name und assigneeId aus der obigen Liste).
5. ZAHLEN & FAKTEN: Halte konkrete Zahlen fest (z. B. "Kürbisschnitzen: 29 Anmeldungen / 29 Kürbisse").
6. BESCHLÜSSE: Fasse formelle oder informelle Einigungen klar zusammen.

AUSGABEFORMAT:
Du MUSST deine Antwort zwingend als valides JSON nach diesem Schema liefern, ohne Markdown-Ummantelung (keine Markdown-Code-Blöcke oder Backticks):

{
  "title": "Vorstandssitzung – <Prägnanter Untertitel mit Hauptthemen>",
  "executiveSummary": "2-3 flüssige, aussagekräftige Sätze über den wesentlichen Zweck und die Hauptergebnisse der Sitzung.",
  "tops": [
    {
      "topic": "TOP 1: <Thementitel>",
      "category": "fest",
      "summary": "Ausführliche, klare Zusammenfassung des Themas mit vollem Kontext und allen genannten Details."
    }
  ],
  "decisions": [
    "Präziser Beschluss oder Vereinbarung."
  ],
  "tasks": [
    {
      "title": "Präziser Aufgabentitel im Infinitiv",
      "assigneeName": "Vollständiger Name des Mitglieds",
      "assigneeId": "mX",
      "priority": "mittel",
      "dueDate": "",
      "details": "Zusätzliche Details oder Kontext zur Aufgabe"
    }
  ],
  "numbersAndFacts": [
    "Konkrete Zahl / Fakt (z. B. Kürbisschnitzen: 29 Anmeldungen)"
  ],
  "nextSteps": [
    "Nächster Schritt oder nächster Termin"
  ]
}`;

        let aiResultText = "";

        if (provider === "openai") {
            const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${effectiveKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Transkript der Sitzung:\n\n${transcript}` }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.2
                })
            });

            if (!aiResp.ok) {
                const errBody = await aiResp.text();
                return res.status(aiResp.status).json({
                    success: false,
                    error: "OPENAI_API_ERROR",
                    message: `OpenAI API Fehler (${aiResp.status}): ${errBody}`
                });
            }

            const aiData = await aiResp.json();
            aiResultText = aiData.choices?.[0]?.message?.content || "{}";
        } else {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${effectiveKey}`;
            
            const aiResp = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: `${systemPrompt}\n\nTranskript der Vorstandssitzung:\n${transcript}` }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!aiResp.ok) {
                const errBody = await aiResp.text();
                return res.status(aiResp.status).json({
                    success: false,
                    error: "GEMINI_API_ERROR",
                    message: `Google Gemini API Fehler (${aiResp.status}): ${errBody}`
                });
            }

            const aiData = await aiResp.json();
            aiResultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        }

        let cleanJsonStr = aiResultText.trim();
        if (cleanJsonStr.startsWith("```json")) {
            cleanJsonStr = cleanJsonStr.slice(7);
        } else if (cleanJsonStr.startsWith("```")) {
            cleanJsonStr = cleanJsonStr.slice(3);
        }
        if (cleanJsonStr.endsWith("```")) {
            cleanJsonStr = cleanJsonStr.slice(0, -3);
        }
        cleanJsonStr = cleanJsonStr.trim();

        let parsedProtocol = null;
        try {
            parsedProtocol = JSON.parse(cleanJsonStr);
        } catch (jsonErr) {
            return res.status(500).json({
                success: false,
                error: "INVALID_JSON_RESPONSE",
                message: "Die KI hat ein ungültiges Format zurückgegeben.",
                rawOutput: aiResultText
            });
        }

        return res.status(200).json({
            success: true,
            provider,
            protocol: parsedProtocol
        });

    } catch (err) {
        console.error("AI Summarize Error:", err);
        return res.status(500).json({
            success: false,
            error: "SERVER_ERROR",
            message: "Interner Fehler bei der KI-Zusammenfassung: " + err.message
        });
    }
};
