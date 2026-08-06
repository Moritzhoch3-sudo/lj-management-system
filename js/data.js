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
      "id": "t_1785945370195",
      "title": "Essensbestellung Abbau",
      "description": "",
      "assigneeId": "m7",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-16",
      "subtasks": []
    },
    {
      "id": "t_1785945336784",
      "title": "Sari kehrmaschine organisieren",
      "description": "",
      "assigneeId": "m7",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785945260310",
      "title": "Gewinnspiel Instagram",
      "description": "",
      "assigneeId": "m2",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785945193233",
      "title": "Summer Break Schild und Standfüße",
      "description": "",
      "assigneeId": "m1",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785945087135",
      "title": "Boxen für Schrauben kaufen",
      "description": "",
      "assigneeId": "m3",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-14",
      "subtasks": []
    },
    {
      "id": "t_1785945057688",
      "title": "Stapler organisieren",
      "description": "Bernhard, Alex und Chrisi stapler anfragen",
      "assigneeId": "m4",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-08-07",
      "subtasks": []
    },
    {
      "id": "t_1785945025755",
      "title": "Banner aufhängen Kaufering",
      "description": "",
      "assigneeId": "m4",
      "categoryId": "getraenke",
      "priority": "niedrig",
      "status": "erledigt",
      "dueDate": "2026-08-04",
      "subtasks": []
    },
    {
      "id": "t_1785944975201",
      "title": "Flyer Dämmerschoppen aufhängen im Dorf",
      "description": "",
      "assigneeId": "m8",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785926494773",
      "title": "Reels drehen",
      "description": "",
      "assigneeId": "m2",
      "categoryId": "pr",
      "priority": "mittel",
      "status": "in_bearbeitung",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785926482962",
      "title": "Jugendschutzbeauftragten für 14.8. einladen",
      "description": "",
      "assigneeId": "m2",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-14",
      "subtasks": []
    },
    {
      "id": "t_1785926466896",
      "title": "Schichten Umfrage",
      "description": "",
      "assigneeId": "m2",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785926454448",
      "title": "Merch Umfrage und Bestellung",
      "description": "",
      "assigneeId": "m2",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-08-14",
      "subtasks": []
    },
    {
      "id": "t_1785926438785",
      "title": "Bezahlte Werbung schalten",
      "description": "",
      "assigneeId": "m2",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785926424991",
      "title": "Seeger Container bestellen 2x",
      "description": "",
      "assigneeId": "m2",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-08",
      "subtasks": []
    },
    {
      "id": "t_1785926409352",
      "title": "Dämmerschoppen Plakat posten",
      "description": "",
      "assigneeId": "m2",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "",
      "subtasks": []
    },
    {
      "id": "t_1785926395872",
      "title": "Wiesn Bus organisieren",
      "description": "",
      "assigneeId": "m2",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-09-25",
      "subtasks": []
    },
    {
      "id": "t_1785926360019",
      "title": "Klowägen holen (Kili Müllner)",
      "description": "",
      "assigneeId": "m12",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-12",
      "subtasks": []
    },
    {
      "id": "t_1785926146473",
      "title": "Zeitmess Special bestellen",
      "description": "",
      "assigneeId": "m9",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-08-14",
      "subtasks": []
    },
    {
      "id": "t_1785926093868",
      "title": "B52 Maschine, Eis, Cocktailbecher organisieren",
      "description": "Eis 13.8.: 3x Würfeleis\nEis 14.8.: 9x Crushed Ice, 5x Würfeleis\nEis 15.8.: 10 Crushed Ice, 7x Würfeleis",
      "assigneeId": "m12",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785926063241",
      "title": "Reindlbestellung 3 Rollen Silofolie",
      "description": "",
      "assigneeId": "m12",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-08",
      "subtasks": []
    },
    {
      "id": "t_1785926047074",
      "title": "4 Steig Bauzäune beim Ditsch abklären",
      "description": "",
      "assigneeId": "m12",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-08",
      "subtasks": []
    },
    {
      "id": "t_1785926020057",
      "title": "Parkplatzeinweiser FFW organisieren",
      "description": "",
      "assigneeId": "m11",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-08-14",
      "subtasks": []
    },
    {
      "id": "t_1785925995492",
      "title": "Specials bestellen",
      "description": "",
      "assigneeId": "m7",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-14",
      "subtasks": []
    },
    {
      "id": "t_1785925984825",
      "title": "Getränkebestellung SB",
      "description": "",
      "assigneeId": "m7",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785925972515",
      "title": "LED Kasten und Leiste über Schrank fertig machen",
      "description": "",
      "assigneeId": "m7",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785925929359",
      "title": "Semmelkörbe Dorfladen zurück bringen",
      "description": "",
      "assigneeId": "m7",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785925898901",
      "title": "Spülmaschine abholen",
      "description": "",
      "assigneeId": "m4",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-07",
      "subtasks": []
    },
    {
      "id": "t_1785925873308",
      "title": "Fritteuse abholen",
      "description": "",
      "assigneeId": "m4",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-12",
      "subtasks": []
    },
    {
      "id": "t_1785925856998",
      "title": "Grills Jiri holen",
      "description": "",
      "assigneeId": "m4",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-12",
      "subtasks": []
    },
    {
      "id": "t_1785925835335",
      "title": "SimEvents Zeitplan abklären",
      "description": "",
      "assigneeId": "m4",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-08-06",
      "subtasks": []
    },
    {
      "id": "t_1785925816373",
      "title": "Essen Helferparty organisieren",
      "description": "",
      "assigneeId": "m4",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-09-19",
      "subtasks": []
    },
    {
      "id": "t_1785925790989",
      "title": "Fritteuse organisieren",
      "description": "",
      "assigneeId": "m4",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785925774924",
      "title": "Essen Dämmerschoppen organisieren",
      "description": "",
      "assigneeId": "m4",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "erledigt",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785925754775",
      "title": "Edeka Bestellung",
      "description": "",
      "assigneeId": "m5",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785925743133",
      "title": "Edeka Bestellung",
      "description": "",
      "assigneeId": "m5",
      "categoryId": "fest",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "",
      "subtasks": []
    },
    {
      "id": "t_1785925735142",
      "title": "Lebenshilfe zum 14.8. 20:30 Uhr einladen",
      "description": "",
      "assigneeId": "m5",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-14",
      "subtasks": []
    },
    {
      "id": "t_1785925682327",
      "title": "Tablet kaufen + Kartenzahlgerät besorgen",
      "description": "",
      "assigneeId": "m3",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785925644618",
      "title": "Resi-Bierzeltgarnituren Dämmerschoppen reservieren",
      "description": "",
      "assigneeId": "m3",
      "categoryId": "getraenke",
      "priority": "hoch",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785925622338",
      "title": "Einlassbänder nachkaufen",
      "description": "",
      "assigneeId": "m3",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785925455332",
      "title": "Kabelbinder bestellen",
      "description": "",
      "assigneeId": "m1",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-08",
      "subtasks": []
    },
    {
      "id": "t_1785925437515",
      "title": "Decke LJ fertig machen",
      "description": "",
      "assigneeId": "m1",
      "categoryId": "getraenke",
      "priority": "hoch",
      "status": "erledigt",
      "dueDate": "2026-08-13",
      "subtasks": []
    },
    {
      "id": "t_1785925412655",
      "title": "Bauzaunplanen Zacherl organisieren",
      "description": "",
      "assigneeId": "m1",
      "categoryId": "getraenke",
      "priority": "mittel",
      "status": "offen",
      "dueDate": "2026-08-08",
      "subtasks": []
    }
];

export const INITIAL_FINANCES = [
    {
      "id": "f_1785965390526",
      "date": "2026-08-05",
      "title": "Bier",
      "type": "ausgabe",
      "amount": 350,
      "category": "Barbestand",
      "receipt": "",
      "notes": "Weihnachtsfeier"
    }
];

export const INITIAL_CONTRACTS = [
    {
      "id": "c_1785965453529",
      "title": "SimEvents Technikaufbau SB",
      "partner": "SimEvents",
      "category": "Veranstaltungstechnik",
      "status": "Aktiv",
      "startDate": "2026-08-10",
      "endDate": "2026-08-16",
      "costNotice": "3000",
      "summary": ""
    }
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
