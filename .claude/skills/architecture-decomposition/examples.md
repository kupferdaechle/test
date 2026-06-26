# Examples

Worked sessions showing three patterns: a Foundation modular monolith, an Enterprise
multi-service decomposition, and a coupling-breach escalation.

## Example 1: Foundation — modular monolith

Input:
```text
Lastenheft tier: Foundation.
FR-01: Users register and log in. Acceptance: a registered user can authenticate.
FR-02: Users save personal notes. Acceptance: a saved note is retrievable by its owner.
FR-03: Users export notes as PDF. Acceptance: export produces a valid PDF of the notes.
```

Output:
```text
Event storm (Pass 1): User Registered, User Logged In, Note Saved, Note Exported.

Contexts: Identity (registration, login), Notes (save, export).

Tier = Foundation -> modular monolith, two internal modules, not two services.

Service Map:
| Module   | Responsibility                  | FRs          |
| identity | Authenticates users             | FR-01        |
| notes    | Stores and exports user notes   | FR-02, FR-03 |

bounded_context written back: FR-01 -> identity, FR-02/03 -> notes.
No synchronous cross-module calls. Human gate: architect confirms the two-module split.
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
