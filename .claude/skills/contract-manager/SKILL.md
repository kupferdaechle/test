---
name: contract-manager
description: Use after architecture-decomposition to define and freeze each service's API
  contracts before any coding begins — both its public API and its inter-service edges. Writes
  an OpenAPI specification for public operations and synchronous dependencies, an AsyncAPI
  specification for each event, defines shared data models, verifies every acceptance criterion
  maps to an operation, then freezes the specifications under a version tag so parallel coding
  agents build against a stable interface. Escalates any post-freeze breaking change to a human.
  Do not use before service boundaries exist, for internal function signatures, or to write code.
when_to_use: |
  Use in Phase 2, after services and their dependencies are defined, to author and freeze
  the inter-service API specifications. Invoke when contracts must be stable before parallel
  coding starts, or when a frozen interface needs a reviewed amendment. Do not use before
  architecture exists, for private function design, or for writing service logic.
metadata:
  author: vibe-pipeline
  version: 1.0.0
---

# Contract Manager

Defines and freezes the interfaces between services so that parallel coding agents can build
in isolation without producing incompatible APIs. A frozen agreement is the single source of
truth: agents implement against it, and the review phase verifies conformance to it. Read
[reference.md](reference.md) for the specification formats, the freeze protocol, and the
output layout. Read [examples.md](examples.md) for a synchronous interface, an event channel,
and a post-freeze amendment.

## Workflow

### Step 1: Ingest the Architecture
Read the service map and dependency map from architecture-decomposition. Each service has two
contract surfaces, and both need specification:
- its **public API** — the operations external callers and end users invoke, which satisfy the
  service's own functional requirements;
- its **inter-service edges** — the synchronous calls it makes on peers and the events it emits.

Most acceptance criteria live on the public surface, not on the edges, so a contract that
specifies only edges will fail the completeness check. Specify both.

A Foundation-tier modular monolith has no inter-service edges to specify. When the architecture
defines internal modules rather than independent services, skip the specification work: record
the contracts section as "N/A — modular monolith, interfaces stay internal" and pass straight
to the human gate. Module boundaries are enforced in code review, not by a frozen wire contract.

### Step 2: Specify Synchronous Interfaces
Write an OpenAPI document for each service's public operations and for each synchronous
dependency, describing the operations, their request and response schemas, and their error
responses. Name operations for the business action, not for the HTTP verb. Keep each schema
owned by the service that produces it.

### Step 3: Specify Asynchronous Events
For each emitted event, write an AsyncAPI document giving the channel, the payload schema, and
the producer. Subscribers reference that same payload, so define it once and let consumers
import it rather than redeclare it.

### Step 4: Define Shared Data Models
Extract the types that cross a boundary into shared models with a single canonical definition.
A field carries the same meaning everywhere it appears. Version these models alongside the
documents above, so any change becomes visible to every consumer at once.

### Step 5: Verify Completeness
Trace every functional requirement's acceptance criteria to an operation or event that
fulfills it. A criterion with no matching interface is a gap — close it before freezing. An
operation that fulfills no criterion is dead surface — delete it.

### Step 6: Freeze
Commit the specifications and tag the version. After the tag, the interfaces are immutable for
the coding phase. Record the freeze tag in the output so every coding agent pins the exact
same revision.

### Step 7: Human Gate
Present the frozen specifications to the tech lead. Coding cannot begin until the lead signs
off, because every parallel agent inherits these decisions. Record the approval against the
freeze tag.

## Pipeline Contract

All phases share one state file, `pipeline.json`, at the root of the project under development.
Read the `architecture` section for the services and their edges — stop and report if it is
absent, since you cannot specify interfaces without boundaries. Write your output under the
`contracts` key, tracing each acceptance criterion to the operation that fulfills it by its
criterion ID, not by requirement alone. Preserve every other section untouched.

## Amendment Rule

A frozen specification changes only through a reviewed amendment, never a silent edit. When a
coding agent finds the interface cannot satisfy a requirement:
- The agent stops and reports the conflict; it does not work around the specification.
- You assess whether the change is additive (backward compatible) or breaking.
- An additive change bumps a minor version and notifies consumers.
- A breaking change reopens the human gate and re-freezes under a new major version.
  A breaking change is only complete when every named consumer is updated atomically in the
  same commit or PR — shipping the producer alone is never acceptable.

Escalate every breaking change to the tech lead with the requirement that forced it, the
consumers affected, and the migration each must make.

## Model Recommendation

Use Sonnet for specification authoring across all tiers; the work is precise but not
open-ended. Reserve Opus for resolving a breaking amendment on an Enterprise system, where the
blast radius across consumers needs careful reasoning. Record the model used.

## Next Step Recommendation

After the freeze and human gate pass, output this block verbatim (fill in the brackets):

```
NEXT STEP
Skill:  code-review-scorer  (invoke after each module is pushed)
Model:  [Sonnet for Foundation/Professional | Opus for Enterprise or security-vetoed changes]
Reason: [one sentence — e.g. "Scoring is mechanical against the rubric; Sonnet is
         sufficient unless a security finding needs blast-radius reasoning."]
```
