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
}


