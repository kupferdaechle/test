---
name: planning-assistant
description: Use when starting a new software project to guide an IT consultant through
  a consultative customer interview that captures project vision, works a functional and
  non-functional capture checklist, qualifies the tier (Foundation, Professional, or
  Enterprise) via six criteria including criticality and dependency depth, escalates
  compliance and architectural blockers to a human, and produces a signed-off Lastenheft
  whose functional requirements carry acceptance criteria as the contract for every later
  phase, plus observability requirements and a per-phase model recommendation. Do not use
  for ongoing feature requests, bug reports, or projects with an existing requirements document.
when_to_use: |
  Use at the start of a new project when an IT consultant must capture the vision,
  run a consultative interview across functional and non-functional requirements,
  qualify the tier, and produce a Lastenheft that passes a Human Gate. Invoke when
  requirements are undefined and a tier decision is needed. Do not use for change
  requests, bug triage, or when a requirements document exists.
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
Consult, do not interrogate. Open with one broad invitation — "walk me through
what this software does and who relies on it" — then listen. A good answer
yields goals, users, and use cases on its own. Ask follow-ups only to fill
the gaps you actually hear, never from a fixed script.

Drive toward completeness against the functional capture checklist in
[reference.md](reference.md#capture-checklist), not toward a question list.
Reflect each captured item back in one line and confirm it before moving on.

### Step 4: Interview — Non-Functional Requirements
Surface the quality attributes the customer rarely volunteers: performance,
availability, security, compliance, and observability. Probe these only where
the functional answers imply a constraint, so the conversation stays natural.

Observability is mandatory for every tier — capture tracing, metrics, and
logging expectations explicitly. Distinguish two cases: a deferral ("we'll
handle it later") is a gap — escalate, since retrofitting after go-live costs
3× more. But a client-only system genuinely has no distributed tracing or
service metrics; record those as "N/A — client-side" and keep only the logging
expectation. N/A by architecture is not a deferral and does not escalate.

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

Every functional requirement must carry an ID and at least one acceptance
criterion phrased so a downstream agent can verify it against code. This
structured contract is the interface every later phase consumes — leave the
bounded_context field null for architecture-decomposition to populate.

### Step 7: Human Gate
Present the full document. Ask the consultant and the customer to confirm
each section explicitly. Do not mark the gate passed until both sign off.
Record any last-minute changes as a versioned amendment, not a silent edit.

## Pipeline Contract

All phases share one state file, `pipeline.json`, at the root of the project
under development. This skill owns the first section: create the file if it
does not exist and write your output under the `lastenheft` key, leaving room
for later phases to append theirs. Every downstream skill reads this file to
load prior work, so the structure here is the foundation the whole pipeline
depends on.

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
