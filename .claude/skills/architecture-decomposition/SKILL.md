---
name: architecture-decomposition
description: Use after a signed-off Lastenheft to turn requirements into a maintainable
  architecture in the mode that fits the system — backend services, client modules, or an
  in-process monolith. Clusters capabilities into bounded contexts, maps each to a unit,
  assigns every functional requirement, enforces the mode's coupling rule (synchronous fan-out
  for backend, encapsulation for client), and produces a high-level overview plus a dependency
  map. Escalates ambiguous boundaries to a human architect. Do not use before requirements
  exist, for single-function scripts, or to write implementation code.
when_to_use: |
  Use in Phase 1, after a Lastenheft is signed off, to decompose requirements into bounded
  contexts and units in the right architecture mode — backend, client, or monolith. Invoke
  when functional requirements must be mapped to boundaries and a maintainable overview is
  needed. Do not use before a Lastenheft exists, for trivial scripts, or for writing code.
metadata:
  author: vibe-pipeline
  version: 1.0.0
---

# Architecture Decomposition

Turns a signed-off Lastenheft into a maintainable architecture, in the mode that fits the
system. The guiding goal is comprehension: anyone reading the output must understand what each
unit does and why it exists. Read [reference.md](reference.md) for the mode definitions, the
decomposition method, the per-mode coupling rules, and the output contract. Read
[examples.md](examples.md) for a worked frontend monolith and a worked backend decomposition.

## Applicability

This phase always applies — every system, backend or client, needs a structure its readers
can follow. It is never skipped. Its exit criterion: every functional requirement is assigned
to exactly one unit, the mode's coupling rule holds, and the human gate is signed.

## Workflow

### Step 1: Ingest and Choose the Mode
Read the Lastenheft and its JSON block. Confirm the tier, the functional requirements with
their acceptance criteria, and the non-functional constraints. If a requirement lacks an
acceptance criterion, stop and send it back to planning. Then select the architecture mode
from [reference.md](reference.md#architecture-modes): backend services, client modules, or
in-process monolith. The mode governs every later step — naming, events, and coupling.

### Step 2: Event Storm (backend mode) or Map Capabilities (client mode)
In backend mode, derive the domain events the system reacts to, in past tense ("Order Placed").
In client or monolith mode, there are no wire events — instead list the user-facing
capabilities ("Import file", "Create address"). Work from the functional requirements, not a
fixed list. Keep it light for Foundation, formal for Enterprise per
[reference.md](reference.md#event-storming).

### Step 3: Identify Bounded Contexts
Cluster the capabilities that change together and share a single language into a bounded
context. A context owns its data and exposes behavior, never tables. Name each context for the
business capability it represents, not for a technical layer.

### Step 4: Map Contexts to Units
Assign one unit per bounded context — a deployable service in backend mode, a feature module
in client or monolith mode. Tier sets granularity: Foundation allows a handful of modules;
Professional and Enterprise give each backend domain its own runtime. Never split one context
across two units — that boundary is the costliest one to unwind later.

### Step 5: Assign Requirements and Check Coupling
Write each requirement's ID into its owning context, filling the bounded_context field that
planning left null. Then apply the mode's coupling rule from
[reference.md](reference.md#coupling-rules): backend units stay within three synchronous calls;
client and monolith modules obey encapsulation — no module reaches into another's internals,
communicating only through the shared store or public module APIs. A shared store is allowed.
Escalate a circular dependency in any mode.

### Step 5b: Define the Target Data Model
Before producing any overview, define the typed object each consuming unit — UI, downstream
service, or test — must receive from this system. This is the integration contract: the shape
that end-to-end tests will assert against, and the anchor that makes "done" verifiable.

Write it as a concrete JSON schema or TypeScript interface. Every field must be named and typed.
Every module that contributes to the object must be named. A module whose output does not appear
in this model is either unused or its requirement is not yet captured — resolve the gap before
continuing. Record it in `pipeline.json` under `architecture.target_data_model`.

**Multi-source resolution**: When a field in the target model requires reading more than one
input file or source to resolve a single value (e.g. resolving an ID through a lookup file
before writing the final field), name both readers explicitly and assign the composition step
to one owning module. An unowned composition step becomes an invisible coupling that only
surfaces during integration — it must be made visible here.

Example: `{ projectId: string, devices: [{id, physicalAddress, name, kos: [{id, name, dpt}]}],
groupAddresses: [{id, address, name, dpt}], links: [{comObjectRefId, deviceId, groupAddressIds}] }`

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
the `architecture` key, including the `target_data_model` from Step 5b. Write each
service's bounded_context back into the matching requirement so the assignment stays linked.
Preserve every other section untouched.

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

## Next Step Recommendation

After the human gate passes, output this block verbatim (fill in the brackets):

```
NEXT STEP
Skill:  contract-manager
Model:  [Sonnet for specification authoring on all tiers | Opus only for Enterprise
         with complex event topology]
Reason: [one sentence — e.g. "Contracts are mechanical to write once boundaries are
         clear; Sonnet is fast and precise enough."]
```

If the architecture mode is modular monolith (client or Foundation in-process), add:

```
NOTE: contract-manager will record N/A for this mode. Proceed directly to
coding after the human gate; skip to code-review-scorer per module.
```
