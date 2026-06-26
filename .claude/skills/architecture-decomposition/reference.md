# Reference: Architecture Decomposition

## Event Storming

A bounded context emerges from events that change together. Run the storm in three passes,
scaled to tier.

### Pass 1 — Domain Events
List what happens in the system, each as a past-tense fact. Derive events from the functional
requirements: a requirement like "users can place orders" yields "Order Placed". Do not invent
events the requirements do not imply.

### Pass 2 — Commands and Actors
For each event, name the command that causes it and the actor who issues the command. This
surfaces user groups and reveals where authority lives.

### Pass 3 — Cluster into Contexts
Group events that share a language and a lifecycle. "Order Placed", "Order Cancelled", and
"Order Shipped" belong to one Ordering context. "Payment Confirmed" and "Refund Issued" belong
to a separate Billing context — they change for different reasons.

Tier scaling:
- **Foundation** — Pass 1 only, informal. Cluster by intuition; a modular monolith is fine.
- **Professional** — Passes 1–3, one service per context.
- **Enterprise** — All passes, formal, with the architect present for Pass 3.

---

## Coupling Rules

Maintainability is measured, not asserted. Enforce these limits and escalate any breach.

| Rule | Limit | Why |
|---|---|---|
| Synchronous fan-out | A service calls at most 3 others synchronously | Chains of synchronous calls turn one slow service into a system-wide outage |
| Dependency cycles | Zero | A cycle means two services must deploy together — they are one service pretending to be two |
| Context ownership | One context per service | A context split across services shares a database and loses its boundary |
| Shared data | None across contexts | Services expose behavior through contracts, never shared tables |

Prefer asynchronous events over synchronous calls when a dependency is not on the request's
critical path. Asynchronous coupling does not count against the fan-out limit.

---

## Output Contract

Produce both artifacts. The overview is for humans; the JSON extends the Lastenheft contract
for the next phase.

### High-Level Project Overview

```markdown
# Architecture Overview: [Project Name]

**Tier:** [Foundation / Professional / Enterprise]
**Services:** [count]

## Service Map
| Service | Single Responsibility | Owns Context | Calls (sync) | Emits (async) |
|---|---|---|---|---|
| ordering | Accepts and tracks customer orders | Ordering | billing | OrderPlaced |
| billing  | Charges and refunds payments | Billing | — | PaymentConfirmed |

## Requirement Assignment
| FR | Service |
|---|---|
| FR-01 | ordering |
```

### JSON (appended to the Lastenheft contract)

```json
{
  "services": [
    {
      "name": "",
      "responsibility": "",
      "bounded_context": "",
      "functional_requirements": [],
      "sync_dependencies": [],
      "async_events": []
    }
  ],
  "architecture_human_gate_passed": false,
  "open_boundary_decisions": []
}
```

Write each service's bounded_context back into the matching functional_requirements entry of
the Lastenheft JSON, so the requirement and its owning service stay linked through the pipeline.
