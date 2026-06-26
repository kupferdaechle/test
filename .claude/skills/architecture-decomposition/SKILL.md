---
name: architecture-decomposition
description: Use after a signed-off Lastenheft to turn requirements into a maintainable
  microservice architecture through Event Storming and Domain-Driven Design. Derives domain
  events, clusters them into bounded contexts, maps each context to a service, assigns every
  functional requirement to a context, enforces coupling limits, and produces a high-level
  project overview plus a service contract map. Escalates ambiguous service boundaries to a
  human architect. Do not use before requirements exist, for single-function scripts, or to
  write implementation code.
when_to_use: |
  Use in Phase 1, after a Lastenheft is signed off, to decompose requirements into
  bounded contexts and microservices. Invoke when functional requirements must be
  mapped to service boundaries and a maintainable architecture overview is needed.
  Do not use before a Lastenheft exists, for trivial scripts, or for writing code.
metadata:
  author: vibe-pipeline
  version: 1.0.0
---

# Architecture Decomposition

Turns a signed-off Lastenheft into a maintainable microservice architecture. The guiding
goal is comprehension: anyone reading the output must understand what each service does and
why it exists. Read [reference.md](reference.md) for the decomposition method, coupling
rules, and the output contract. Read [examples.md](examples.md) for a worked Foundation
monolith and a worked Enterprise decomposition.

## Workflow

### Step 1: Ingest the Lastenheft
Read the Lastenheft and its JSON block. Confirm the tier, the functional requirements with
their acceptance criteria, and the non-functional constraints. If a requirement lacks an
acceptance criterion, stop and send it back to planning — you cannot place an unverifiable
requirement.

### Step 2: Event Storm
Derive the domain events the system must react to, expressed in past tense ("Order Placed",
"Payment Confirmed"). Work from the functional requirements, not from a fixed list. For
Foundation tier, keep this lightweight; for Enterprise, run it formally per
[reference.md](reference.md#event-storming).

### Step 3: Identify Bounded Contexts
Cluster events that change together and share a single language into a bounded context. A
context owns its data and exposes behavior, never tables. Name each context for the business
capability it represents, not for a technical layer.

### Step 4: Map Contexts to Services
Assign one deployable service per bounded context. Tier sets granularity: Foundation allows a
modular monolith or a handful of modules; Professional and Enterprise give each domain its own
runtime. Never split a single context across two services — that boundary is the costliest one
to unwind later.

### Step 5: Assign Requirements and Check Coupling
Write each requirement's ID into its owning domain, filling the bounded_context field that
planning left null. Then audit dependencies: any component may invoke at most three peers
synchronously. Should one exceed that ceiling, or a circular dependency surface, escalate.

### Step 6: Produce the Overview and Contract Map
Generate the high-level project overview and the dependency map from the template in
[reference.md](reference.md#output-contract). The overview states each service's lone
responsibility in a single sentence. The map records which component calls which — the artifact
contract-manager consumes downstream.

### Step 7: Human Gate
Present the service boundaries to the architect. Boundaries are the one decision that is
ruinous to change after coding starts, so do not mark the gate passed until the architect
signs off each service's responsibility and its dependencies.

## Pipeline Contract

All phases share one state file, `pipeline.json`, at the root of the project under
development. Read the `lastenheft` section that planning wrote — stop and report if it is
missing, since you cannot decompose requirements that do not exist. Write your output under
the `architecture` key, and write each service's bounded_context back into the matching
requirement so the assignment stays linked. Preserve every other section untouched.

## Escalation Rules

Stop and bring in a human architect immediately when:
- A functional requirement spans two contexts and cannot be cleanly assigned to one
- A service would call more than three other services synchronously
- A dependency cycle appears between services
- A single context grows large enough to own most requirements (a god service)
- The tier implies a granularity the requirements contradict
- You cannot tell whether two events belong in the same context

When escalating, name the trigger, quote the requirement or events that fired it, name the
architect who must resolve it, and record the open boundary as an unresolved decision.

## Model Recommendation

Carry the planning model recommendation forward and refine it: use Opus for Enterprise
decomposition where boundary mistakes are systemic, and Sonnet for Foundation and
Professional. Record the model used so the next phase inherits the rationale.
