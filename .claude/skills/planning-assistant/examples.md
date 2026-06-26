# Examples

Worked sessions showing the two most important behavioral patterns:
a happy-path Foundation session and an Enterprise escalation.

## Example 1: Foundation Tier — Internes Team-Tool

Input:
```text
Consultant startet Interview.
Kunde: "Wir sind 4 Leute, brauchen ein Tool um Kundenkontakte zu tracken.
Excel reicht nicht mehr. Budget €8k, brauchen es in 6 Wochen."
```

Output (Tier-Qualifikation):
```text
Qualifying-Score: Q1=1, Q2=1, Q3=1, Q4=1, Q5=1 → Total 5 → Foundation.

Empfehlung: Foundation — kleines Team, klar umrissener Scope,
kurze Timeline, kein Compliance-Bedarf. Monolith oder 2 Services.

Modell-Empfehlung: Sonnet für alle Phasen ausreichend.
```

Output (Lastenheft-Auszug):
```markdown
## 5. Tier-Entscheidung
- **Empfehlung:** Foundation
- **Score:** 5/20
- **Begründung:** 4-Personen-Team, <100 User, keine regulierten Daten,
  6-Wochen-Timeline, eine Integration (E-Mail). Monolith ist richtig.
- **Bestätigt von Kunden:** [x] Ja

## 7. Modell-Empfehlung
| Phase | Modell | Begründung |
|---|---|---|
| Planning | claude-sonnet-4-6 | Foundation, klar umrissen |
| Architektur | claude-sonnet-4-6 | Kein Event Storming nötig |
| Coding | claude-sonnet-4-6 | Monolith, Standard-Stack |
| Code Review | claude-sonnet-4-6 | Kein Security-Critical Service |

## 8. Human Gate
- [x] Consultant: vollständig
- [x] Kunde: bestätigt
- [x] Offene Punkte: keine
```

## Example 2: Enterprise Eskalation — Compliance-Trigger mid-Interview

Input:
```text
Consultant interviewt Startup im Healthcare-Bereich.
Interview läuft normal für 10 Minuten.
Kunde: "Die App speichert natürlich Patientendaten — Diagnosen,
Medikationen, das Übliche."
```

Output (Skill stoppt sofort):
```text
INTERVIEW PAUSIERT — Eskalations-Trigger ausgelöst.

Trigger: Personenbezogene Gesundheitsdaten (DSGVO Art. 9, Kategorie
besonderer Daten). Potenziell zusätzlich HIPAA falls internationale Nutzung.

Zitat das den Trigger ausgelöst hat:
"speichert Patientendaten — Diagnosen, Medikationen"

Warum das Interview nicht weitergeführt werden kann:
Architektur-, Infrastruktur- und Rechtsentscheidungen bei
Gesundheitsdaten übersteigen den Rahmen einer KI-Entscheidung.
Ein falsches Architektur-Pattern hier kostet €100k+ in Compliance-Nacharbeit.

Notwendige nächste Schritte (Mensch erforderlich):
1. Datenschutzbeauftragter (DSB) muss vor Fortsetzung einbezogen werden
2. Compliance-Tier ist Enterprise-Minimum — kein Override möglich
3. Architekturentscheidung: zertifizierte Cloud (ISO 27001) vs. On-Premise
4. Klärung ob HIPAA relevant ist (internationale Nutzer?)

Offener Punkt #1 im Lastenheft eingetragen.
Modell-Empfehlung für Fortsetzung nach Klärung: Opus (Enterprise + Compliance).

Interview wird fortgesetzt sobald DSB-Freigabe vorliegt.
```

Output (Lastenheft offener Punkt):
```markdown
## 6. Offene Punkte & Eskalationen
| # | Trigger | Zitat | Verantwortlicher | Status |
|---|---|---|---|---|
| 1 | DSGVO Art. 9 + potentiell HIPAA | "speichert Patientendaten — Diagnosen, Medikationen" | DSB + CTO | Offen |
```
