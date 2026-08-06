# Landjugend Scheuring – Arbeitsregeln für Code-Änderungen

## Pflicht-Workflow für JEDE Änderung

### 1. 📋 Planen
- Änderung detailliert planen und als Plan vorlegen
- Betroffene Dateien und Komponenten identifizieren
- Dem User zur Freigabe vorlegen

### 2. 🔒 Sicherheits-Vorabprüfung
- Prüfen ob die geplante Änderung neue Sicherheitslücken einführen könnte
- XSS-Risiken? Credential-Leaks? Auth-Bypasses? Input-Validierung?
- Erst nach positivem Ergebnis fortfahren

### 3. ⚙️ Ausführen
- Änderungen umsetzen
- Funktionalität und Integrität sicherstellen
- Mitgliedsnamen und Daten nicht verändern (es sei denn explizit gewünscht)

### 4. 🛡️ Sicherheits-Audit nach Änderung
- Geänderte Dateien auf neue Schwachstellen prüfen
- Bestätigen dass keine Regressionen entstanden sind
- Ergebnis dem User mitteilen

### 5. ✅ Rückmeldung
- Zusammenfassung der Änderung
- Explizite Sicherheitsbewertung: **SICHER** oder **WARNUNG + Details**

## Backup-Triggerwort
- **"Backup laden"** → Sofort auf Git-Tag `backup-trigger-point` zurücksetzen
