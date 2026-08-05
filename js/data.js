/**
 * Landjugend Scheuring - Exact Board Members & Roles from Screenshot
 */

export const INITIAL_MEMBERS = [
    { id: 'm0', name: 'Allgemein', role: 'Beisitzer', avatar: '👤', color: '#64748b', bgLight: 'rgba(100, 116, 139, 0.15)' },
    { id: 'm1', name: 'Valentin Müllner', role: '1. Vorstand', avatar: '👱‍♂️', color: '#10b981', bgLight: 'rgba(16, 185, 129, 0.15)' },
    { id: 'm2', name: 'Linda Schweiger', role: '2. Vorstand', avatar: '👱‍♀️', color: '#06b6d4', bgLight: 'rgba(6, 182, 212, 0.15)' },
    { id: 'm3', name: 'Anja Löb', role: '1. Kassier', avatar: '👩‍💻', color: '#f59e0b', bgLight: 'rgba(245, 158, 11, 0.15)' },
    { id: 'm4', name: 'Moritz Kubik', role: '2. Kassier', avatar: '👨‍💻', color: '#00873D', bgLight: 'rgba(0, 135, 61, 0.15)' },
    { id: 'm5', name: 'Lena Senior', role: '1. Schriftführer', avatar: '📝', color: '#ec4899', bgLight: 'rgba(236, 72, 153, 0.15)' },
    { id: 'm6', name: 'Rosa Krieglmeier', role: '2. Schriftführer', avatar: '📋', color: '#6366f1', bgLight: 'rgba(99, 102, 241, 0.15)' },
    { id: 'm7', name: 'Cassandra Wunner', role: 'Getränkewart', avatar: '🍺', color: '#ef4444', bgLight: 'rgba(239, 68, 68, 0.15)' },
    { id: 'm8', name: 'Felix Premer', role: 'Beisitzer', avatar: '🎪', color: '#8b5cf6', bgLight: 'rgba(139, 92, 246, 0.15)' },
    { id: 'm9', name: 'Johannes Erhard', role: 'Beisitzer', avatar: '🌱', color: '#14b8a6', bgLight: 'rgba(20, 184, 166, 0.15)' },
    { id: 'm10', name: 'Dominique Zahn', role: 'Beisitzer', avatar: '🔧', color: '#3b82f6', bgLight: 'rgba(59, 130, 246, 0.15)' },
    { id: 'm11', name: 'Michaela Grabmaier', role: 'Beisitzer', avatar: '📸', color: '#a855f7', bgLight: 'rgba(168, 85, 247, 0.15)' },
    { id: 'm12', name: 'Kilian Salai', role: 'Beisitzer', avatar: '🔊', color: '#f97316', bgLight: 'rgba(249, 115, 22, 0.15)' }
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
        title: 'Klo-Wagen für Summerbreak Party abholen',
        description: 'Morgen werden 3 Personen benötigt zum Abholen.',
        assigneeId: 'm1', // Valentin Müllner
        categoryId: 'fest',
        priority: 'hoch',
        status: 'in_bearbeitung',
        dueDate: '2026-08-06',
        subtasks: []
    },
    {
        id: 't2',
        title: 'Kassenabschluss Juli prüfen',
        description: 'Belege sortieren und Kontoauszüge abgleichen.',
        assigneeId: 'm4', // Moritz Kubik
        categoryId: 'finanzen',
        priority: 'hoch',
        status: 'erledigt',
        dueDate: '2026-08-01',
        subtasks: []
    },
    {
        id: 't3',
        title: 'Getränkebestellung für Wochenende aufgeben',
        description: '20 Kisten Spezi, 15 Kisten Bier nachbestellen.',
        assigneeId: 'm7', // Cassandra Wunner
        categoryId: 'getraenke',
        priority: 'dringend',
        status: 'offen',
        dueDate: '2026-08-07',
        subtasks: []
    },
    {
        id: 't4',
        title: 'Sponsorenvertrag Brauerei verlängern',
        description: 'Neues Angebot einholen und Rücksprache halten.',
        assigneeId: 'm1', // Valentin Müllner
        categoryId: 'sponsoren',
        priority: 'mittel',
        status: 'offen',
        dueDate: '2026-08-15',
        subtasks: []
    }
];

export const INITIAL_FINANCES = [
    { id: 'f1', type: 'einnahme', amount: 1450.00, title: 'Einnahmen Summerbreak Party Vorkasse', category: 'fest', date: '2026-08-01' },
    { id: 'f2', type: 'ausgabe', amount: 320.50, title: 'Getränkelieferung August', category: 'getraenke', date: '2026-08-03' }
];

export const INITIAL_CONTRACTS = [
    { id: 'c1', title: 'Mietvertrag Landjugendheim', partner: 'Gemeinde Scheuring', validUntil: '2030-12-31', status: 'aktiv' }
];

export const INITIAL_MINUTES = [
    {
        id: 'min1',
        title: 'Vorstandssitzung August 2026',
        date: '2026-08-04',
        transcript: 'Hallo, herzlich willkommen zur Sitzung... Morgen brauche ich drei Leute zum Klo-Wegen-Abholen.',
        bullets: [
            'Klo-Wagen Abholung: 3 Personen am 06.08. benötigt.',
            'Getränkebestellung wird von Cassandra Wunner durchgeführt.'
        ]
    }
];
