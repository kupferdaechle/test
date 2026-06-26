# Reference: Planning Assistant

## Tier Criteria

Ask these six qualifying questions in order. Score each answer, sum the points,
and map the total to a tier recommendation. Q6 carries override weight — a score
of 4 on Q6 forces Enterprise regardless of the total score.

### Qualifying Questions

**Q1 — Team & Maintenance**
Who will maintain this software after delivery?
- Solo developer or no dedicated team → 1
- Small team (2–5), part-time maintenance → 2
- Dedicated team (5–15) → 3
- Full engineering org (15+) with SRE/Ops → 4

**Q2 — Expected User Load**
How many concurrent users at peak?
- Under 100 → 1
- 100–10,000 → 2
- 10,000–1,000,000 → 3
- Over 1,000,000 or unpredictable spikes → 4

**Q3 — Compliance & Data Sensitivity**
Does the system store or process regulated data?
- No personal data, no compliance requirements → 1
- Basic personal data, GDPR standard → 2
- Sensitive categories (health, finance, children) → 3
- Full compliance framework required (SOC2, HIPAA, PCI-DSS, ISO 27001) → 4

**Q4 — Timeline**
What is the expected delivery timeline?
- Under 8 weeks → 1
- 8 weeks – 6 months → 2
- 6 months – 18 months → 3
- Over 18 months or ongoing → 4

**Q5 — Integration Complexity**
How many external systems must this software integrate with?
- Zero or one (e.g. only a payment gateway) → 1
- Two to four → 2
- Five to ten → 3
- More than ten or real-time event-driven integrations → 4

**Q6 — Criticality and Dependency Depth**
How many other projects or systems will depend on what we are building today?
- This is an isolated project, nothing else depends on it → 1
- One or two follow-up projects will build on this → 2
- Several projects will use this as a component → 3
- This is foundational infrastructure — all future projects depend on it → 4

A score of 4 on Q6 forces Enterprise regardless of the total. Record this
override explicitly in the Lastenheft with the justification.

### Tier Mapping

| Total Score | Tier | Architecture |
|---|---|---|
| 6–10 | **Foundation** | Monolith or 2–3 services, no Event Storming required |
| 11–17 | **Professional** | Microservices, DDD-lite, Contract-First |
| 18–24 | **Enterprise** | Full pipeline, formal Event Storming, compliance hardening |

**Override rule:** Q6 = 4 → Enterprise always, regardless of total score.

If the customer overrides the recommendation to a lower tier, record the override
and the justification. Add a risk statement to the Lastenheft.

---

## Capture Checklist

This is the structure the conversation must satisfy — not a script to read aloud.
Steer the dialogue with open questions and follow-ups; tick each item only once
the customer has genuinely answered it. An unticked item at the end of an
interview is an open point, not a skipped one.

### Functional (Step 3)
- [ ] **Goal** — the problem solved, stated in the customer's own words
- [ ] **User groups** — who acts on the system and in what role
- [ ] **Core use cases** — the three to five flows that define success
- [ ] **Inputs and outputs** — what data enters, what the system produces
- [ ] **Integration points** — external systems and the direction of each call
- [ ] **Out of scope** — what this software explicitly does not do

### Non-Functional (Step 4)
- [ ] **Performance** — latency or throughput targets, if any are measurable
- [ ] **Availability** — uptime expectation and tolerance for downtime
- [ ] **Security** — authentication, authorization, and data protection needs
- [ ] **Compliance** — regulations in scope (escalate per the trigger table)
- [ ] **Observability** — tracing, metrics, and logging (mandatory, all tiers)
- [ ] **Maintainability** — who maintains it and the expected change cadence

---

## Escalation Triggers

Escalate immediately and pause the interview when any of the following fire.
Do not attempt to resolve these through the interview — they require a human decision.

| Trigger | Why it blocks |
|---|---|
| Compliance regulation named (GDPR Art. 9, HIPAA, SOC2, PCI-DSS) | Architecture and legal decisions exceed AI judgment |
| Budget conflicts with recommended tier | Customer expectation and delivery cost must align before design begins |
| Two stakeholders give contradictory requirements | Scope is undefined; continuing produces an invalid Lastenheft |
| Requirement implies architectural service-boundary decision | Premature decomposition locks in wrong service cuts |
| Performance/availability target would drive infrastructure choices | Infra decisions need architect sign-off, not requirements capture |
| Data residency or sovereignty constraint named | Legal and infra implications span multiple teams |
| Requirement references an existing undocumented system | Hidden dependencies must be surfaced before integration planning |
| You cannot determine whether a requirement is complete | An incomplete requirement produces invalid downstream artifacts |

---

## Output Template

Every Lastenheft produced by this skill must follow this structure exactly.
Do not omit sections; mark them "N/A — not applicable" if empty.

```markdown
# Lastenheft: [Project Name]

**Version:** 1.0  
**Datum:** [YYYY-MM-DD]  
**Consultant:** [Name]  
**Tier:** [Foundation / Professional / Enterprise]

---

## 1. Projektziele
[2–4 sentences: what problem does this solve and what does success look like]

## 2. Stakeholder
| Rolle | Name | Entscheidungsbefugnis |
|---|---|---|
| Auftraggeber | | Ja |
| Fachbereich | | Nein |

## 3. Funktionale Anforderungen
### 3.1 Kernfunktionen
Each requirement carries an ID, a description, and at least one acceptance
criterion phrased so a downstream agent can verify it against code. The
bounded_context field is left blank here — architecture-decomposition fills it.

- **FR-01** — [Requirement]
  - Acceptance: [observable, checkable condition]
  - Bounded context: _(filled in Phase 1)_
- **FR-02** — [Requirement]
  - Acceptance: [observable, checkable condition]
  - Bounded context: _(filled in Phase 1)_

### 3.2 Integrationen
- **INT-01** — [System] — [direction and protocol of the call]

## 4. Nicht-Funktionale Anforderungen
| Kategorie | Anforderung | Messbar |
|---|---|---|
| Performance | | Ja/Nein |
| Verfügbarkeit | | |
| Security | | |
| Compliance | | |
| Observability | Tracing: [X], Metrics: [X], Logging: [X] | Ja |

## 5. Tier-Entscheidung
- **Empfehlung:** [Tier]
- **Score:** [X/20]
- **Begründung:** [one paragraph]
- **Bestätigt von Kunden:** [ ] Ja  [ ] Nein — Override weil: [reason]

## 6. Offene Punkte & Eskalationen
| # | Trigger | Zitat | Verantwortlicher Mensch | Status |
|---|---|---|---|---|
| 1 | | | | Offen |

## 7. Modell-Empfehlung
| Phase | Modell | Begründung |
|---|---|---|
| Planning (diese Session) | | |
| Phase 1 — Architektur | | |
| Phase 3 — Coding | | |
| Code Review | | |

## 8. Human Gate
- [ ] Consultant: Lastenheft vollständig und korrekt
- [ ] Kunde: Anforderungen bestätigt
- [ ] Offene Punkte: alle dokumentiert oder geklärt

---
```

Append this JSON block after the Markdown, separated by a horizontal rule:

```json
{
  "project": "",
  "tier": "",
  "version": "1.0",
  "date": "",
  "functional_requirements": [
    {
      "id": "FR-01",
      "description": "",
      "acceptance_criteria": [],
      "bounded_context": null
    }
  ],
  "integrations": [
    { "id": "INT-01", "system": "", "direction": "", "protocol": "" }
  ],
  "non_functional_requirements": {
    "performance": "",
    "availability": "",
    "security": "",
    "compliance": "",
    "observability": { "tracing": "", "metrics": "", "logging": "" }
  },
  "open_questions": [],
  "escalations": [],
  "human_gate_passed": false,
  "model_recommendation": {
    "planning": "",
    "architecture": "",
    "coding": "",
    "code_review": ""
  }
}
```
