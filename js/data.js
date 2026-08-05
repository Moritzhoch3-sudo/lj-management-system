/**
 * Landjugend Scheuring - 12 Board Members & Roles Configuration
 */

export const INITIAL_MEMBERS = [
    { id: 'm1', name: 'Florian Huber', role: '1. Vorstand', avatar: '👨‍💼', color: '#10b981', bgLight: 'rgba(16, 185, 129, 0.15)' },
    { id: 'm2', name: 'Anna Maier', role: '2. Vorstand', avatar: '👩‍💼', color: '#06b6d4', bgLight: 'rgba(6, 182, 212, 0.15)' },
    { id: 'm3', name: 'Sandra Berger', role: '1. Kassiererin', avatar: '👩‍💻', color: '#f59e0b', bgLight: 'rgba(245, 158, 11, 0.15)' },
    { id: 'm4', name: 'Lukas Schmid', role: '2. Kassier', avatar: '👨‍💻', color: '#f97316', bgLight: 'rgba(249, 115, 22, 0.15)' },
    { id: 'm5', name: 'Julia Wagner', role: '1. Schriftführerin', avatar: '📝', color: '#3b82f6', bgLight: 'rgba(59, 130, 246, 0.15)' },
    { id: 'm6', name: 'Tobias Becker', role: '2. Schriftführer', avatar: '📋', color: '#6366f1', bgLight: 'rgba(99, 102, 241, 0.15)' },
    { id: 'm7', name: 'Maximilian Bauer', role: 'Getränkewart', avatar: '🍺', color: '#ef4444', bgLight: 'rgba(239, 68, 68, 0.15)' },
    { id: 'm8', name: 'Felix Gruber', role: 'Beisitzer', avatar: '🎪', color: '#8b5cf6', bgLight: 'rgba(139, 92, 246, 0.15)' },
    { id: 'm9', name: 'Laura Fischer', role: 'Beisitzerin', avatar: '🌱', color: '#ec4899', bgLight: 'rgba(236, 72, 153, 0.15)' },
    { id: 'm10', name: 'Matthias Weber', role: 'Beisitzer', avatar: '🔧', color: '#14b8a6', bgLight: 'rgba(20, 184, 166, 0.15)' },
    { id: 'm11', name: 'Sarah Richter', role: 'Beisitzerin', avatar: '📸', color: '#a855f7', bgLight: 'rgba(168, 85, 247, 0.15)' },
    { id: 'm12', name: 'Dominik Lechner', role: 'Beisitzer', avatar: '🔊', color: '#0284c7', bgLight: 'rgba(2, 132, 199, 0.15)' }
];

export const BOARD_ROLE_OPTIONS = [
    '1. Vorstand',
    '2. Vorstand',
    '1. Kassier',
    '2. Kassier',
    '1. Schriftführer',
    '2. Schriftführer',
    'Getränkewart',
    'Beisitzer'
];

export const CATEGORIES = [
    { id: 'fest', name: 'Landjugendfest & Party', icon: '🎪', color: '#8b5cf6' },
    { id: 'getraenke', name: 'Bar & Getränke', icon: '🍺', color: '#ef4444' },
    { id: 'finanzen', name: 'Finanzen & Kasse', icon: '💰', color: '#f59e0b' },
    { id: 'heim', name: 'Landjugendheim & Inventar', icon: '🏡', color: '#10b981' },
    { id: 'pr', name: 'Social Media & Werbung', icon: '📣', color: '#06b6d4' },
    { id: 'sponsoren', name: 'Sponsoring & Verträge', icon: '🤝', color: '#3b82f6' },
    { id: 'sitzung', name: 'Vorstands-Sitzungen', icon: '👥', color: '#a855f7' }
];

export const INITIAL_TASKS = [
    {
        id: 't1',
        title: 'Festzelt & Spülmobil für Sommernachtsfest reservieren',
        description: 'Verleihfirma kontaktieren, Zeltgröße (30x15m) abstimmen und Mietvertrag prüfen.',
        assigneeId: 'm8', // Felix Gruber (Beisitzer)
        categoryId: 'fest',
        priority: 'hoch',
        status: 'in_bearbeitung',
        dueDate: '2026-08-15',
        subtasks: [
            { id: 'st1', text: 'Zeltverleih Meyer anrufen', completed: true },
            { id: 'st2', text: 'Kaution und Transportkosten klären', completed: false }
        ]
    },
    {
        id: 't2',
        title: 'Getränkekalkulation & Brauerei-Bestellung',
        description: 'Bier, Spezi, Wasser und Bar-Zutaten für ca. 800 Besucher bestellen.',
        assigneeId: 'm7', // Maximilian Bauer (Getränkewart)
        categoryId: 'getraenke',
        priority: 'hoch',
        status: 'offen',
        dueDate: '2026-08-18',
        subtasks: [
            { id: 'st4', text: 'Restbestände im Heim zählen', completed: true },
            { id: 'st5', text: 'Bestellliste an Brauerei schicken', completed: false }
        ]
    },
    {
        id: 't3',
        title: 'Halbjahres-Kassenbericht & Belegprüfung',
        description: 'Vorbereitung aller Quittungen und Kontoauszüge für die Kassenprüfer.',
        assigneeId: 'm3', // Sandra Berger (1. Kassiererin)
        categoryId: 'finanzen',
        priority: 'hoch',
        status: 'erledigt',
        dueDate: '2026-08-01',
        subtasks: [
            { id: 'st7', text: 'Quittungen sortieren', completed: true },
            { id: 'st8', text: 'Kassenbuch abgleichen', completed: true }
        ]
    },
    {
        id: 't4',
        title: 'Werbeplakate & Instagram-Flyer gestalten',
        description: 'Flyer-Layout erstellen, Druckerei beauftragen und Vorstands-Teaser posten.',
        assigneeId: 'm11', // Sarah Richter (Beisitzerin)
        categoryId: 'pr',
        priority: 'mittel',
        status: 'in_bearbeitung',
        dueDate: '2026-08-12',
        subtasks: [
            { id: 'st10', text: 'Design-Entwurf im Vorstand zeigen', completed: true }
        ]
    },
    {
        id: 't5',
        title: 'Rasennäh- & Aufräumaktion am Landjugendheim',
        description: 'Außenbereich säubern, Müll wegbringen und Gartenmöbel streichen.',
        assigneeId: 'm10', // Matthias Weber (Beisitzer)
        categoryId: 'heim',
        priority: 'niedrig',
        status: 'offen',
        dueDate: '2026-08-22',
        subtasks: [
            { id: 'st13', text: 'Benzin für Rasenmäher kaufen', completed: false }
        ]
    },
    {
        id: 't6',
        title: 'GEMA-Meldung & Lärmschutz-Genehmigung einreichen',
        description: 'Antrag bei der Gemeinde einreichen und GEMA Musikliste vorbereiten.',
        assigneeId: 'm1', // Florian Huber (1. Vorstand)
        categoryId: 'sponsoren',
        priority: 'hoch',
        status: 'erledigt',
        dueDate: '2026-07-28',
        subtasks: [
            { id: 'st15', text: 'Gemeinde-Formular ausfüllen', completed: true }
        ]
    },
    {
        id: 't7',
        title: 'Sponsoren-Briefe an lokale Firmen verschicken',
        description: 'Anschreiben für Bandenwerbung und Logo auf den Eintrittskarten versenden.',
        assigneeId: 'm2', // Anna Maier (2. Vorstand)
        categoryId: 'sponsoren',
        priority: 'mittel',
        status: 'erledigt',
        dueDate: '2026-07-25',
        subtasks: [
            { id: 'st17', text: 'Sponsoren-Verteiler aktualisieren', completed: true }
        ]
    },
    {
        id: 't8',
        title: 'Ton- & Lichtanlage für Hauptbühne organisieren',
        description: 'Verstärker, Funkmikrofon und Licht-Traverse prüfen und reservieren.',
        assigneeId: 'm12', // Dominik Lechner (Beisitzer)
        categoryId: 'fest',
        priority: 'hoch',
        status: 'in_bearbeitung',
        dueDate: '2026-08-14',
        subtasks: [
            { id: 'st19', text: 'Angebot von VT-Technik einholen', completed: true }
        ]
    },
    {
        id: 't9',
        title: 'Sitzungsprotokoll der Juli-Sitzung abtippen & verteilen',
        description: 'Beschlüsse ins Archiv eintragen und PDF in den Vorstandschat stellen.',
        assigneeId: 'm5', // Julia Wagner (1. Schriftführerin)
        categoryId: 'sitzung',
        priority: 'niedrig',
        status: 'erledigt',
        dueDate: '2026-07-30',
        subtasks: [
            { id: 'st23', text: 'Notizen korrekturlesen', completed: true }
        ]
    }
];

export const INITIAL_FINANCES = [
    { id: 'f1', date: '2026-07-28', title: 'Getränke-Abrechnung Sonnwendfeuer', amount: 1420.50, type: 'einnahme', category: 'Events', receipt: 'BELEG-2026-042', notes: 'Reingewinn Barverkauf' },
    { id: 'f2', date: '2026-07-25', title: 'GEMA Gebühren Sommernachtsfest', amount: -280.00, type: 'ausgabe', category: 'Gebühren', receipt: 'BELEG-GEMA-881', notes: 'Vorabüberweisung' }
];

export const INITIAL_CONTRACTS = [
    {
        id: 'c1',
        title: 'Brauerei-Exklusivvertrag (Wieninger Brauerei)',
        partner: 'Privatbrauerei Wieninger',
        startDate: '2024-01-01',
        endDate: '2027-12-31',
        costNotice: 'Sonderkonditionen: 15% Rabatt auf Fässer + Ausleihe Kühlwagen gratis',
        status: 'Aktiv',
        category: 'Getränke & Sponsoring',
        summary: 'Liefervertrag für alle Landjugend-Feste.'
    }
];

export const INITIAL_MINUTES = [
    {
        id: 'm_doc1',
        title: 'Monatliche Vorstandssitzung Juli 2026',
        date: '2026-07-24',
        location: 'Landjugendheim Scheuring',
        attendees: ['Florian Huber', 'Anna Maier', 'Sandra Berger', 'Julia Wagner', 'Maximilian Bauer', 'Dominik Lechner'],
        summary: 'Besprechung der Helfereinteilung und Festzelt-Organisation.',
        bullets: [
            'Getränkebestellung wird von Maximilian Bauer koordiniert.',
            'Dominik Lechner übernimmt die Ton- und Lichttechnik.',
            'Kassenbericht von Sandra Berger wurde genehmigt.'
        ],
        speakerMap: [
            { speaker: 'Florian Huber', text: 'Frage an Dominik: Hast du das Angebot für die Tonanlage schon vorliegen?' },
            { speaker: 'Dominik Lechner', text: 'Antwort von Dominik: Ja, das Angebot von VT-Technik liegt vor und passt ins Budget.' }
        ],
        decisions: [
            'Einstimmig beschlossen: Tonanlage wird gebucht.'
        ],
        actionItemsCreated: true
    }
];

export const DEFAULT_PIN = '2026';
