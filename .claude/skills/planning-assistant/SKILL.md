---
name: planning-assistant
description: Use when starting a new software project to guide an IT consultant through
  a structured customer interview that captures project vision, qualifies the tier
  (Foundation, Professional, or Enterprise) via six criteria including criticality and
  dependency depth, escalates compliance and architectural blockers to a human, and
  produces a signed-off Lastenheft with functional requirements, observability
  requirements, and model recommendation per phase. Do not use for ongoing feature
  requests, bug reports, or projects that already have a requirements document.
when_to_use: |
  Use at the very start of a new project engagement when an IT consultant needs
  to capture the project vision, interview a customer through functional and
  non-functional requirements, qualify the tier via six criteria (including
  criticality and dependency depth), and produce a Lastenheft that passes a
  Human Gate sign-off. Invoke when requirements are undefined and a tier
  decision must be made. Do not use for change requests on existing software,
  for bug triage, or when a requirements document already exists.
metadata:
  author: vibe-pipeline
  version: 1.0.0
---

# Planning Assistant

Guides an IT consultant through a structured customer interview to produce
a signed-off Lastenheft with tier recommendation and model guidance. Use
this before any architecture or coding phase begins.

Read [reference.md](reference.md) for tier criteria, escalation triggers,
and the full output template. Read [examples.md](examples.md) for a worked
Foundation and a worked Enterprise session.

## Workflow

### Step 1: Orient and Capture Project Vision
Introduce yourself and state the session goal in one sentence. Confirm
who is present — if a decision-maker is absent, flag it immediately;
scope decisions without them require a follow-up gate.

Ask: what problem does this software solve, who are the users, and what
does success look like in 12 months? Capture the vision in 3–5 sentences
before proceeding — it is the evaluation lens for every answer that follows.

### Step 2: Qualify the Tier
Ask the six qualifying questions from [reference.md](reference.md#tier-criteria).
Q6 (criticality) is asked last but carries override weight: a score of 4
on Q6 forces Enterprise regardless of the total. Score the answers, present
the recommended tier with a one-paragraph justification. The customer
confirms or overrides; record both.

### Step 3: Interview — Functional Requirements
Work through the goal, user groups, core use cases, and integration points.
Ask one topic at a time. After each answer, reflect it back in one sentence
and ask whether it is complete. Do not move on until the customer confirms.

### Step 4: Interview — Non-Functional Requirements
Cover performance, availability, security, compliance, and observability.
Observability is mandatory for all tiers — capture tracing, metrics, and
logging expectations explicitly. If the customer says "we'll handle it later",
escalate: observability retrofitted after go-live costs 3× more.

### Step 5: Detect Gaps and Escalate
After each major section, check the gap list in
[reference.md](reference.md#escalation-triggers). Escalate immediately when
a trigger fires — do not continue the interview. Record the open point,
explain why it blocks progress, and name the human who must resolve it.

### Step 6: Produce the Lastenheft
Generate the structured Markdown document with the JSON block appended.
Follow the template in [reference.md](reference.md#output-template) exactly.
Include: project goals, stakeholders, functional and non-functional requirements,
tier decision with justification, open escalation points, and model recommendation.

### Step 7: Human Gate
Present the full document. Ask the consultant and the customer to confirm
each section explicitly. Do not mark the gate passed until both sign off.
Record any last-minute changes as a versioned amendment, not a silent edit.

## Escalation Rules

Stop the interview and bring in a human immediately when:
- Any compliance requirement appears (GDPR Art. 9, HIPAA, SOC2, PCI-DSS, or similar)
- The budget named by the customer conflicts with the recommended tier
- Two stakeholders contradict each other on a functional requirement
- A requirement implies a service-boundary decision with architectural impact
- A performance or availability number would drive infrastructure choices
- You are not confident the requirement is complete enough to act on

When escalating: name the trigger, quote the exact requirement that fired it,
name the human who must resolve it, and mark the open point in the output.

## Model Recommendation

Include in every Lastenheft output:
- **This session**: the model used and why it was appropriate
- **Phase 1 (Architecture)**: recommend Opus for Enterprise tier;
  Sonnet is sufficient for Foundation and Professional
- **Coding phase**: Sonnet for implementation; Opus for security-critical services
