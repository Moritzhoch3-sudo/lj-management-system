export class ProtocolParser {
    static cleanAddress(text) {
        if (!text || typeof text !== 'string') return '';
        let cleaned = text;
        
        // 1. Remove parenthesized address/location blocks like (Ort: Dorfstraße 5) or (Hauptstraße 12, 86937 Scheuring)
        cleaned = cleaned.replace(/\(\s*(?:Ort|Adresse|Anschrift|Treffpunkt)?:?\s*[^)]*(?:straße|str\.|weg|gasse|platz|allee|ring|ufer|\d{5})[^)]*\)/gi, '');
        
        // 2. Remove explicit Ort / Adresse / Anschrift / Treffpunkt labels and following address text
        cleaned = cleaned.replace(/\b(?:Adresse|Anschrift|Ort|Treffpunkt):\s*[^,.\n]+(?:,\s*\d{5}\s+[A-ZÄÖÜa-zäöüß-]+)?/gi, '');
        
        // 3. Remove street names with numbers + preceding prepositions (e.g. in der Hauptstraße 12, Dorfstr. 5a)
        cleaned = cleaned.replace(/\b(?:in der|an der|am|auf der|bei der|in|bei)?\s*[A-ZÄÖÜa-zäöüß.-]+(?:straße|str\.|weg|gasse|platz|allee|ring|ufer|pfad|chaussee|damm)\s+\d+[a-z]?\b/gi, '');
        
        // 4. Remove PLZ + Ort (e.g. 86937 Scheuring or in 86937 Scheuring)
        cleaned = cleaned.replace(/\b(?:in|PLZ)?\s*\d{5}\s+[A-ZÄÖÜa-zäöüß-]+\b/gi, '');
        
        // 5. Clean leftover artifacts: empty parens, stray prepositions before punctuation/end, double punctuation
        cleaned = cleaned.replace(/\b(?:in der|an der|am|auf der|bei der|in|bei)\b\s*[,.:)]/gi, '');
        cleaned = cleaned.replace(/\(\s*\)/g, '');
        cleaned = cleaned.replace(/\(\s*[,.:;]\s*/g, '(');
        cleaned = cleaned.replace(/\s*[,.:;]\s*\)/g, '');
        cleaned = cleaned.replace(/,\s*,/g, ',');
        cleaned = cleaned.replace(/\s+,/g, ',');
        cleaned = cleaned.replace(/,\s*\./g, '.');
        cleaned = cleaned.replace(/\s*[:;,-]+\s*$/g, '');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }

    static formatGrammaticalTitle(sentence, memberName) {
        let s = this.cleanAddress(sentence);
        if (!s) return '';

        // Remove category or topic prefix (e.g. 'Getränkebestellung: ', 'TOP 1: ', 'Punkt 3: ')
        s = s.replace(/^(?:[A-ZÄÖÜa-zäöüß\s]+:)\s*/, '');
        // Remove list numbers / bullets / TOP markers
        s = s.replace(/^(?:\d+[\.\)]|\*|-|•|top\s*\d+:?|punkt\s*\d+:?)\s*/gi, '');
        
        // Remove member name if present
        if (memberName && memberName !== 'Allgemein') {
            const nameParts = [memberName, ...memberName.split(' ')];
            for (const part of nameParts) {
                if (part.length > 2) {
                    const regex = new RegExp('\\b' + part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
                    s = s.replace(regex, '');
                }
            }
        }

        // Remove leading modal verbs / action lead-ins
        s = s.replace(/^\s*(?:soll|muss|wird|hat|müsste|sollt)\s+/gi, '');
        s = s.replace(/^\s*(?:kümmert sich um|übernimmt|erledigt)\s+/gi, '');

        // Conjugated verb -> Infinitive mapping
        const verbMap = [
            [/\bbesorgt\b/gi, 'besorgen'],
            [/\bprüft\b/gi, 'prüfen'],
            [/\bbestellts?\b/gi, 'bestellen'],
            [/\bholts?\b/gi, 'holen'],
            [/\borganisiert\b/gi, 'organisieren'],
            [/\bübernimmts?\b/gi, 'übernehmen'],
            [/\bkontaktiert\b/gi, 'kontaktieren'],
            [/\bbuchts?\b/gi, 'buchen'],
            [/\bvorbereitets?\b/gi, 'vorbereiten'],
            [/\berstellts?\b/gi, 'erstellen'],
            [/\bkaufts?\b/gi, 'kaufen'],
            [/\bklärts?\b/gi, 'klären'],
            [/\berledigts?\b/gi, 'erledigen'],
            [/\bmachts?\b/gi, 'machen'],
            [/\bbringts?\b/gi, 'bringen'],
            [/\bschreibts?\b/gi, 'schreiben'],
            [/\bplants?\b/gi, 'planen'],
            [/\breserviert\b/gi, 'reservieren'],
            [/\binformiert\b/gi, 'informieren']
        ];

        for (const [regex, inf] of verbMap) {
            s = s.replace(regex, inf);
        }

        // Clean leading punctuation/spaces
        s = s.replace(/^[,\.\s:-]+/, '');
        s = s.replace(/[\.\!\?]+$/, '').trim();

        const words = s.split(' ');
        const knownInfinitives = ['besorgen', 'prüfen', 'bestellen', 'holen', 'organisieren', 'übernehmen', 'kontaktieren', 'buchen', 'vorbereiten', 'erstellen', 'kaufen', 'klären', 'erledigen', 'machen', 'bringen', 'schreiben', 'planen', 'reservieren', 'informieren'];
        
        if (words.length > 1) {
            const firstLower = words[0].toLowerCase();
            if (knownInfinitives.includes(firstLower)) {
                s = words.slice(1).join(' ') + ' ' + firstLower;
            }
        }

        // Strip leading articles ('den ', 'die ', 'das ', 'dem ', 'der ') if they start title awkwardly
        s = s.replace(/^(?:den|die|das|dem|der|ein|eine|einen)\s+/gi, '');

        // Clean leftover parens/punctuation
        s = s.replace(/\(\s*\)/g, '');
        s = s.replace(/\s*[:;,-]+\s*$/g, '').trim();

        // Capitalize first letter cleanly
        if (s.length > 0) {
            s = s.charAt(0).toUpperCase() + s.slice(1);
        }
        return s;
    }

    static isMetadataSentence(sentence) {
        if (!sentence) return true;
        const sLower = sentence.toLowerCase().trim();
        
        const metadataPrefixes = [
            'anwesenheit', 'anwesenheitsliste', 'anwesend', 'begrüßung', 'tagesordnung', 
            'top 1:', 'top 2:', 'top 3:', 'top 4:', 'sitzung eröffnet', 'sitzung beendet', 
            'protokollführung', 'protokoll vom', 'uhrzeit', 'abwesenheit', 'abwesend',
            'sitzungsleiter', 'schriftführer:', 'ort der sitzung', 'dauer der sitzung'
        ];
        
        // Skip header lines unless they contain explicit action verbs
        const hasActionVerb = ['besorgen', 'prüfen', 'bestellen', 'holen', 'organisieren', 'übernehmen', 'buchen', 'kaufen', 'erledigen', 'besorgt', 'prüft', 'bestellt', 'holt', 'organisiert', 'übernimmt', 'bucht', 'kauft'].some(v => sLower.includes(v));
        
        if (!hasActionVerb && metadataPrefixes.some(prefix => sLower.includes(prefix))) {
            return true;
        }
        return false;
    }

    static parse(text, members = []) {
        const tasks = [];
        const protocolSummary = { bullets: [], decisions: [], speakerMap: [] };
        
        if (!text || typeof text !== 'string') return { tasks, protocolSummary };
        
        const sentences = text.split(/(?<=[.!?])\s+|\n+/);
        
        const actionKeywords = [
            'soll', 'muss', 'kümmert sich', 'übernimmt', 'organisiert', 
            'bestellt', 'prüft', 'klärt', 'erledigt', 'besorgt', 'kontaktiert', 
            'bucht', 'macht', 'bringt', 'holt', 'ruft an', 'schreibt', 
            'plant', 'reserviert', 'kauft', 'vorbereitet', 'erstellt', 
            'meldet', 'informiert', 'fragt nach'
        ];
        
        const memberRoleMap = {
            'vorstand': 'm1',
            'kassier': 'm3',
            'schriftführer': 'm5',
            'getränkewart': 'm7'
        };

        const categoryKeywords = {
            'getraenke': ['getränke', 'bier', 'spezi', 'bar', 'kisten'],
            'finanzen': ['geld', 'kasse', 'rechnung', 'zahlung', 'budget', 'konto'],
            'fest': ['party', 'fest', 'feier', 'summerbreak', 'deko', 'klo-wagen'],
            'sponsoren': ['sponsor', 'vertrag', 'kooperation', 'brauerei'],
            'heim': ['heim', 'inventar', 'putzen', 'renovierung'],
            'pr': ['social media', 'instagram', 'werbung', 'flyer']
        };

        const detectCategory = (sentence) => {
            const sLower = sentence.toLowerCase();
            for (const [catId, keywords] of Object.entries(categoryKeywords)) {
                if (keywords.some(kw => sLower.includes(kw))) {
                    return catId;
                }
            }
            return 'sitzung';
        };

        const detectPriority = (sentence) => {
            const sLower = sentence.toLowerCase();
            if (['dringend', 'sofort', 'schnellstmöglich', 'asap', 'wichtig', 'eilig'].some(kw => sLower.includes(kw))) {
                return 'dringend';
            }
            if (['bald', 'zeitnah', 'nächste woche'].some(kw => sLower.includes(kw))) {
                return 'hoch';
            }
            return 'mittel';
        };

        const detectDate = (sentence) => {
            const matchDate = sentence.match(/bis\s+(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/i);
            if (matchDate) {
                const day = matchDate[1].padStart(2, '0');
                const month = matchDate[2].padStart(2, '0');
                const year = matchDate[3] ? (matchDate[3].length === 2 ? '20' + matchDate[3] : matchDate[3]) : new Date().getFullYear();
                return `${year}-${month}-${day}`;
            }
            
            const sLower = sentence.toLowerCase();
            const now = new Date();
            if (sLower.includes('bis ende des monats')) {
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                return nextMonth.toISOString().split('T')[0];
            }
            if (sLower.includes('nächste woche')) {
                const nextMonday = new Date(now);
                nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
                return nextMonday.toISOString().split('T')[0];
            }
            if (sLower.includes('diese woche')) {
                const thisFriday = new Date(now);
                thisFriday.setDate(now.getDate() + ((5 + 7 - now.getDay()) % 7));
                return thisFriday.toISOString().split('T')[0];
            }
            
            const daysMap = { 'sonntag': 0, 'montag': 1, 'dienstag': 2, 'mittwoch': 3, 'donnerstag': 4, 'freitag': 5, 'samstag': 6 };
            for (const [dayName, dayIndex] of Object.entries(daysMap)) {
                if (sLower.includes(`bis ${dayName}`)) {
                    const target = new Date(now);
                    let diff = dayIndex - now.getDay();
                    if (diff <= 0) diff += 7;
                    target.setDate(now.getDate() + diff);
                    return target.toISOString().split('T')[0];
                }
            }
            return '';
        };

        for (const sentence of sentences) {
            const rawTrimmed = sentence.trim();
            if (!rawTrimmed) continue;
            
            // Clean physical address details
            const cleanedSentence = this.cleanAddress(rawTrimmed);
            if (!cleanedSentence) continue;

            const sLower = cleanedSentence.toLowerCase();
            
            // Generate Protocol Summary with cleaned address-free text
            if (!this.isMetadataSentence(cleanedSentence)) {
                protocolSummary.bullets.push(cleanedSentence);
            }
            
            if (['beschluss', 'beschlossen', 'einstimmig', 'genehmigt'].some(kw => sLower.includes(kw))) {
                protocolSummary.decisions.push(cleanedSentence);
            }

            let mentionedMember = null;
            let memberName = 'Allgemein';
            let assigneeId = 'm0';

            // Detect member cleanly using member.name or firstName/lastName
            for (const member of members) {
                const fullName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();
                if (!fullName || fullName === 'Allgemein') continue;
                const firstName = member.firstName || fullName.split(' ')[0] || '';
                const lastName = member.lastName || fullName.split(' ').slice(1).join(' ') || '';

                const fLower = firstName.toLowerCase();
                const lLower = lastName.toLowerCase();
                const fnLower = fullName.toLowerCase();

                if (
                    (fLower.length > 2 && sLower.includes(fLower)) ||
                    (lLower.length > 2 && sLower.includes(lLower)) ||
                    (fnLower.length > 2 && sLower.includes(fnLower))
                ) {
                    mentionedMember = member;
                    memberName = member.name || firstName;
                    assigneeId = member.id;
                    break;
                }
            }

            if (!mentionedMember) {
                for (const [role, mId] of Object.entries(memberRoleMap)) {
                    if (sLower.includes(role)) {
                        assigneeId = mId;
                        const matchedM = members.find(m => m.id === mId);
                        memberName = matchedM ? matchedM.name : 'Vorstand/Rolle';
                        break;
                    }
                }
            }
            
            if (assigneeId !== 'm0') {
                protocolSummary.speakerMap.push({ speaker: memberName, text: cleanedSentence });
            }

            // Detect task (skip metadata lines)
            if (this.isMetadataSentence(cleanedSentence)) continue;

            const actionMatched = actionKeywords.some(kw => sLower.includes(kw));
            if (actionMatched) {
                let confidence = 50;
                if (assigneeId !== 'm0') confidence += 30;
                
                // Format clean grammatical task title
                const cleanTitle = this.formatGrammaticalTitle(cleanedSentence, memberName);
                if (!cleanTitle || cleanTitle.length < 3) continue;

                // Clean description (remove leading list numbers & address)
                let cleanDescription = cleanedSentence.replace(/^(?:\d+[\.\)]|\*|-|•|top\s*\d+:?|punkt\s*\d+:?)\s*/gi, '').trim();

                tasks.push({
                    title: cleanTitle,
                    description: cleanDescription,
                    assigneeName: memberName,
                    assigneeId: assigneeId,
                    categoryId: detectCategory(cleanedSentence),
                    priority: detectPriority(cleanedSentence),
                    dueDate: detectDate(cleanedSentence),
                    confidence: confidence,
                    sourceText: cleanDescription
                });
            }
        }
        
        return { tasks, protocolSummary };
    }

    /**
     * Smart Dialogue-to-Decision Summarizer:
     * Synthesizes question-response pairs into crisp, active decision bullet points
     * without conversational back-and-forth dialogue or "Frage nach...".
     */
    static synthesizeDecisionBullets(rawText, members = []) {
        if (!rawText || typeof rawText !== 'string') {
            return {
                decisions: [],
                tasks: [],
                finances: [],
                topics: [],
                allBullets: []
            };
        }

        const ALIASES = {
            'kili': 'Kilian Salai',
            'kilian': 'Kilian Salai',
            'vali': 'Valentin Müllner',
            'valentin': 'Valentin Müllner',
            'linda': 'Linda Schweiger',
            'schwaigerin': 'Linda Schweiger',
            'moritz': 'Moritz Kubik',
            'anja': 'Anja Löb',
            'lena': 'Lena Senior',
            'rosa': 'Rosa Krieglmeier',
            'cassy': 'Cassandra Wunner',
            'cassandra': 'Cassandra Wunner',
            'felix': 'Felix Premer',
            'premer': 'Felix Premer',
            'johannes': 'Johannes Erhard',
            'hanni': 'Johannes Erhard',
            'domi': 'Dominique Zahn',
            'dominique': 'Dominique Zahn',
            'michi': 'Michaela Grabmaier',
            'michaela': 'Michaela Grabmaier'
        };

        // Add member names from storage
        members.forEach(m => {
            if (m && m.name) {
                const parts = m.name.toLowerCase().split(' ');
                if (parts[0] && parts[0].length >= 3) {
                    ALIASES[parts[0]] = m.name;
                }
            }
        });

        const ignorePhrases = [
            'hallo', 'herzlich willkommen', 'willkommen zur', 'begrüße euch', 'danke dass ihr',
            'schön dass alle', 'wir fangen', 'los gehts', 'guten abend', 'servus', 'moin'
        ];

        let lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1 && (rawText.includes('.') || rawText.includes('?'))) {
            lines = rawText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
        }

        const decisions = [];
        const tasks = [];
        const finances = [];
        const topics = [];

        // Parse lines into dialogue turns
        const dialogue = [];
        for (const line of lines) {
            const m = line.match(/^\[(.*?)\]:\s*(.*)$/);
            if (m) {
                dialogue.push({ speaker: m[1].trim(), text: m[2].trim() });
            } else {
                dialogue.push({ speaker: '', text: line });
            }
        }

        let i = 0;
        while (i < dialogue.length) {
            const item = dialogue[i];
            const speaker = item.speaker;
            let cleanText = item.text.replace(/Clowagen/g, 'Klowagen').replace(/clowagen/g, 'Klowagen').replace(/klowagen/g, 'Klowagen');
            const lower = cleanText.toLowerCase();

            // Skip greetings and pleasantries
            if (ignorePhrases.some(p => lower.includes(p)) && cleanText.length < 50) {
                i++;
                continue;
            }

            // Lookahead for question-agreement pair:
            const isQuestion = cleanText.includes('?') || ['könntest du', 'kannst du', 'holst du', 'machst du', 'übernimmst du', 'kann wer'].some(q => lower.includes(q));

            const nextItem = i + 1 < dialogue.length ? dialogue[i + 1] : { speaker: '', text: '' };
            const nextLower = nextItem.text.toLowerCase();
            const hasAgreement = ['ja', 'mach ich', 'stimmt zu', 'stimme zu', 'passt', 'geht klar', 'übernehme', 'hole', 'mache'].some(a => nextLower.includes(a));

            let targetMember = null;
            for (const [nick, full] of Object.entries(ALIASES)) {
                const regex = new RegExp(`\\b${nick}\\b`, 'i');
                if (regex.test(lower)) {
                    targetMember = full;
                    break;
                }
            }

            if (isQuestion && (hasAgreement || lower.includes('stimmt zu') || lower.includes('erledigt'))) {
                let actionDesc = cleanText;
                actionDesc = actionDesc.replace(/^\[.*?\]:?\s*/, '');
                for (const nick of Object.keys(ALIASES)) {
                    actionDesc = actionDesc.replace(new RegExp(`\\b${nick}\\b[,:]?\\s*`, 'gi'), '');
                }
                actionDesc = actionDesc.replace(/\b(?:könntest du|kannst du|würdest du|kann jemand|holst du|machst du|übernimmst du|bitte|noch)\b/gi, '');
                actionDesc = actionDesc.replace(/\?/g, '').trim();

                let taskBullet = '';
                if (actionDesc.toLowerCase().includes('klowagen') && (actionDesc.toLowerCase().includes('holen') || actionDesc.toLowerCase().includes('abholen'))) {
                    taskBullet = `• ${targetMember || 'Zuständiger'} holt den Klowagen ab.`;
                } else {
                    taskBullet = `• ${targetMember || 'Vorstand'} übernimmt: ${actionDesc}.`;
                }
                tasks.push(taskBullet);
                i += hasAgreement ? 2 : 1;
                continue;
            }

            // Check for explicit task assignment in single sentence
            const actionWords = ['kümmert sich', 'kümmere mich', 'übernimmt', 'übernehme', 'organisiert', 'organisiere', 'holt', 'hole', 'besorgt', 'besorge', 'schreibt', 'erstellt', 'bestellt', 'bestelle'];
            if (actionWords.some(kw => lower.includes(kw))) {
                let assignedName = targetMember;
                if (!assignedName && speaker) {
                    for (const [nick, full] of Object.entries(ALIASES)) {
                        if (speaker.toLowerCase().includes(nick)) {
                            assignedName = full;
                            break;
                        }
                    }
                    if (!assignedName) assignedName = speaker;
                }

                // Extract due date if present
                const dueMatch = cleanText.match(/\bbis\s+(\d{1,2}\.\s*[A-ZÄÖÜa-zäöüß]+|\d{1,2}\.\d{1,2}\.?\d{0,4}|freitag|donnerstag|dienstag|montag|mittwoch|samstag|sonntag)/i);
                const dueStr = dueMatch ? ` (Frist: bis ${dueMatch[1]})` : '';

                let cleanAction = cleanText.replace(/^\[.*?\]:\s*/, '');
                cleanAction = cleanAction.replace(/^\s*ich\s+kümmere\s+mich\s+um\s+/i, 'kümmert sich um ');
                cleanAction = cleanAction.replace(/^\s*ich\s+übernehme\s+/i, 'übernimmt ');
                cleanAction = cleanAction.replace(/^\s*ich\s+hole\s+/i, 'holt ');
                cleanAction = cleanAction.replace(/^\s*ich\s+besorge\s+/i, 'besorgt ');
                cleanAction = cleanAction.replace(/^\s*ich\s+organisiere\s+/i, 'organisiert ');
                cleanAction = cleanAction.replace(/^\s*ich\s+erstelle\s+/i, 'erstellt ');
                cleanAction = cleanAction.replace(/^\s*ich\s+bestelle\s+/i, 'bestellt ');

                if (['kümmert sich', 'übernimmt', 'holt', 'besorgt', 'organisiert', 'erstellt', 'bestellt'].some(v => cleanAction.toLowerCase().startsWith(v))) {
                    tasks.push(`• ${assignedName || 'Vorstand'} ${cleanAction}${dueStr}`);
                } else {
                    tasks.push(`• ${assignedName || 'Vorstand'}: ${cleanAction}${dueStr}`);
                }
                i++;
                continue;
            }

            // Check for Beschlüsse / Entscheidungen
            if (['beschluss', 'beschlossen', 'einstimmig', 'genehmigt', 'verbindlich gebucht'].some(kw => lower.includes(kw))) {
                let cleanDec = cleanText.replace(/^\[.*?\]:\s*/, '');
                cleanDec = cleanDec.replace(/^(?:beschluss\s*(?:einstimmig)?:?|einstimmiger\s*beschluss:?)\s*/i, '').trim();
                decisions.push(`• ${cleanDec} (einstimmig beschlossen).`);
                i++;
                continue;
            }

            // Check for Finanzen / Kasse
            if (['kasse', 'kassenstand', 'gewinn', 'reingewinn', 'ausgaben', 'einnahmen', 'euro', '€'].some(kw => lower.includes(kw))) {
                let cleanFin = cleanText.replace(/^\[.*?\]:\s*/, '');
                finances.push(`• ${cleanFin}`);
                i++;
                continue;
            }

            // Check for Termine / Nächste Sitzung
            if (['nächste sitzung', 'nächste vorstandssitzung', 'uhr statt', 'termin'].some(kw => lower.includes(kw))) {
                let cleanTop = cleanText.replace(/^\[.*?\]:\s*/, '');
                topics.push(`• ${cleanTop}`);
                i++;
                continue;
            }

            // General discussed topic
            let cleanGen = cleanText.replace(/^\[.*?\]:\s*/, '').trim();
            if (cleanGen.length >= 6) {
                topics.push(`• ${cleanGen}`);
            }
            i++;
        }

        const allBullets = [
            ...decisions,
            ...tasks,
            ...finances,
            ...topics
        ];

        return {
            decisions,
            tasks,
            finances,
            topics,
            allBullets: allBullets.length > 0 ? allBullets : [`• Sitzungsprotokoll ordnungsgemäß erfasst.`]
        };
    }
}


