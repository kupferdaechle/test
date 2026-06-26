# Examples

Worked sessions showing three patterns: a client-mode frontend, a backend multi-service
decomposition, and a coupling-breach escalation.

## Example 1: Client mode — browser app, no backend

Input:
```text
Lastenheft tier: Foundation. NFR: "client-side tool, no backend".
FR-01: Import a project file in the browser. Acceptance: a valid file loads into app state.
FR-02: Edit records in the loaded project. Acceptance: an edit is reflected immediately.
FR-03: Export the modified project. Acceptance: export reproduces a valid file.
```

Output:
```text
Mode selected: client — the NFR says "no backend", so units are feature modules, not services,
and there are no wire events.

Capabilities (no event storm): Import file, Edit records, Export file.
Contexts: Importing, Editing, Exporting.

Module Map:
| Module    | Responsibility                       | FRs   |
| importer  | Read and parse the project file      | FR-01 |
| editor    | Mutate records in the shared store   | FR-02 |
| exporter  | Serialize the store back to a file   | FR-03 |

Coupling (encapsulation rule): all three modules read and write one shared store; no module
imports another's internals. The shared store is the sanctioned coupling point — not flagged.
bounded_context written back. Human gate: architect confirms the three-module split.
```

## Example 2: Enterprise — context-per-service decomposition

Input:
```text
Lastenheft tier: Enterprise.
FR-01: Customers place orders. Acceptance: a placed order is persisted with line items.
FR-02: Orders are charged on placement. Acceptance: a successful charge marks the order paid.
FR-03: Paid orders trigger fulfillment. Acceptance: a paid order creates a shipment record.
FR-04: Customers are notified at each step. Acceptance: each status change sends one message.
```

Output:
```text
Event storm (Passes 1-3): Order Placed, Payment Confirmed, Shipment Created, Customer Notified.

Contexts clustered by reason-to-change:
  Ordering  (Order Placed, Order Cancelled)
  Billing   (Payment Confirmed, Refund Issued)
  Shipping  (Shipment Created)
  Notification (Customer Notified)

Tier = Enterprise -> one service per context, four services.

Service Map:
| Service      | Responsibility                | Calls (sync) | Emits (async)     |
| ordering     | Accepts and tracks orders     | billing      | OrderPlaced       |
| billing      | Charges and refunds           | —            | PaymentConfirmed  |
| shipping     | Creates shipments             | —            | ShipmentCreated   |
| notification | Sends status messages         | —            | (subscribes only) |

Notification subscribes to events asynchronously, so it adds no synchronous coupling.
Max synchronous fan-out = 1 (ordering -> billing). Within the limit of 3.
bounded_context written back for FR-01..04. Human gate: architect signs off four boundaries.
```

## Example 3: Coupling breach — escalation

Input:
```text
Draft decomposition: a "checkout" service calls ordering, billing, shipping, AND inventory
synchronously to complete one request.
```

Output:
```text
ESCALATION — coupling rule breached.

Trigger: synchronous fan-out of 4 exceeds the limit of 3.
Fired by: checkout -> {ordering, billing, shipping, inventory}, all synchronous.

Why it blocks: a four-deep synchronous chain means any one slow dependency stalls every
checkout. This is the failure mode the limit exists to prevent.

Resolution options for the architect:
1. Make inventory reservation asynchronous (emit ReservationRequested) -> fan-out drops to 3.
2. Merge billing and shipping if they always change together -> fan-out drops to 3.

Open boundary decision recorded. Architect must choose before coding starts.
```
