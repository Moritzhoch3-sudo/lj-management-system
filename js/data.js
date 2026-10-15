/**
 * Landjugend Scheuring - Exact Board Members & Roles from Screenshot
 */

export const INITIAL_MEMBERS = [
    { id: 'm1', name: 'Valentin Müllner', role: '1. Vorstand', systemRole: 'admin', username: 'valentin', avatar: '👱‍♂️', color: '#10b981', bgLight: 'rgba(16, 185, 129, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm2', name: 'Linda Schweiger', role: '2. Vorstand', systemRole: 'admin', username: 'linda', avatar: '👱‍♀️', color: '#0284c7', bgLight: 'rgba(2, 132, 199, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm3', name: 'Anja Löb', role: '1. Kassier', systemRole: 'admin', username: 'anja', avatar: '👩‍💻', color: '#f59e0b', bgLight: 'rgba(245, 158, 11, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm4', name: 'Moritz Kubik', role: '2. Kassier', systemRole: 'superuser', username: 'moritz', avatar: '👨‍💻', color: '#16a34a', bgLight: 'rgba(22, 163, 74, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm5', name: 'Lena Senior', role: '1. Schriftführer', systemRole: 'member', username: 'lena', avatar: '📝', color: '#ec4899', bgLight: 'rgba(236, 72, 153, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm6', name: 'Rosa Krieglmeier', role: '2. Schriftführer', systemRole: 'member', username: 'rosa', avatar: '📋', color: '#4f46e5', bgLight: 'rgba(79, 70, 229, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm7', name: 'Cassandra Wunner', role: 'Getränkewart', systemRole: 'member', username: 'cassandra', avatar: '🍺', color: '#dc2626', bgLight: 'rgba(220, 38, 38, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm8', name: 'Felix Premer', role: 'Beisitzer', systemRole: 'member', username: 'felix', avatar: '🎪', color: '#7c3aed', bgLight: 'rgba(124, 58, 237, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm9', name: 'Johannes Erhard', role: 'Beisitzer', systemRole: 'member', username: 'johannes', avatar: '🌱', color: '#0d9488', bgLight: 'rgba(13, 148, 136, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm10', name: 'Dominique Zahn', role: 'Beisitzer', systemRole: 'member', username: 'dominique', avatar: '🔧', color: '#2563eb', bgLight: 'rgba(37, 99, 235, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm11', name: 'Michaela Grabmaier', role: 'Beisitzer', systemRole: 'member', username: 'michaela', avatar: '📸', color: '#d97706', bgLight: 'rgba(217, 119, 6, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' },
    { id: 'm12', name: 'Kilian Salai', role: 'Beisitzer', systemRole: 'member', username: 'kilian', avatar: '🔊', color: '#ea580c', bgLight: 'rgba(234, 88, 12, 0.15)', passwordHash: '613b66d02886f515f7d7969e989420d2f3575163dc4455a7d93aca74db7ae56c' }
];

export const SYSTEM_ROLE_OPTIONS = [
    { id: 'superuser', label: '👑 Superuser (Haupt-Admin & System-Chef)' },
    { id: 'admin', label: '🛡️ Vorstand / Admin (Sieht alle Aufgaben)' },
    { id: 'member', label: '👤 Vorstandsmitglied (Nur eigene Aufgaben)' }
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

export const INITIAL_DELETED_TASK_IDS = [
    "t_1785925790989",
    "t_1785925644618",
    "t_1785945025755",
    "t_1785945260310",
    "t_1785925622338",
    "t_1785926494773",
    "t_1785925995492",
    "t_1785925412655",
    "t_1785925816373",
    "t_1785925856998",
    "t_1785925455332",
    "t_1785945193233",
    "t_1785926454448",
    "t_1785925898901",
    "t_1785925835335",
    "t_1785926466896",
    "t_1785925774924",
    "t_1785944975201",
    "t_1785926146473",
    "t_1785926409352",
    "t_1785926482962",
    "t_1785925743133",
    "t_1785945057688",
    "t_1785925682327",
    "t_1785925437515",
    "t_1785925873308",
    "t_1785945370195",
    "t_1785926438785",
    "t_1785926020057",
    "t_1785925984825",
    "t_1785925735142",
    "t_1785945336784",
    "t_1785926424991"
];

export const INITIAL_TASKS = [
    {
        "id": "t_1785945087135",
        "title": "Boxen für Schrauben kaufen",
        "description": "",
        "assigneeId": "m3",
        "categoryId": "fest",
        "priority": "mittel",
        "status": "in_bearbeitung",
        "dueDate": "2026-08-14",
        "subtasks": []
    },
    {
        "id": "t_1785926395872",
        "title": "Wiesn Bus organisieren",
        "description": "",
        "assigneeId": "m2",
        "categoryId": "fest",
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
        "categoryId": "fest",
        "priority": "mittel",
        "status": "offen",
        "dueDate": "2026-08-12",
        "subtasks": []
    },
    {
        "id": "t_1785926093868",
        "title": "B52 Maschine, Eis, Cocktailbecher organisieren",
        "description": "Eis 13.8.: 3x Würfeleis\nEis 14.8.: 9x Crushed Ice, 5x Würfeleis\nEis 15.8.: 10 Crushed Ice, 7x Würfeleis",
        "assigneeId": "m12",
        "categoryId": "fest",
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
        "categoryId": "fest",
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
        "categoryId": "fest",
        "priority": "mittel",
        "status": "offen",
        "dueDate": "2026-08-08",
        "subtasks": []
    },
    {
        "id": "t_1785925972515",
        "title": "LED Kasten und Leiste über Schrank fertig machen",
        "description": "",
        "assigneeId": "m7",
        "categoryId": "heim",
        "priority": "mittel",
        "status": "in_bearbeitung",
        "dueDate": "2026-08-13",
        "subtasks": []
    },
    {
        "id": "t_1785925929359",
        "title": "Semmelkörbe Dorfladen zurück bringen",
        "description": "",
        "assigneeId": "m7",
        "categoryId": "heim",
        "priority": "mittel",
        "status": "offen",
        "dueDate": "2026-08-13",
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
