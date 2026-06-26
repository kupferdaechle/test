# Examples

Worked sessions showing three patterns: a synchronous specification, an event specification,
and a post-freeze breaking amendment that reopens the gate.

## Example 1: Synchronous interface from a dependency edge

Input:
```text
Dependency map: ordering -> billing (synchronous).
FR-02: Orders are charged on placement. Acceptance: a successful charge marks the order paid;
a declined charge leaves the order unpaid and returns a reason.
```

Output:
```text
Operation derived from the acceptance criterion, not from the transport:

  operationId: chargeOrder
  request:  ChargeRequest { orderId, amount, currency }
  responses:
    201 charged       -> satisfies "successful charge marks order paid"
    402 declined      -> satisfies "declined charge returns a reason" (body: { reason })

Criteria trace: FR-02 -> billing.chargeOrder. Both branches of the acceptance criterion map to
a declared response. Specification is complete for this edge.
```

## Example 2: Event interface from an emitted fact

Input:
```text
Service map: ordering emits OrderPlaced; notification subscribes.
FR-04: Customers are notified at each step. Acceptance: each status change sends one message.
```

Output:
```text
AsyncAPI channel order.placed, payload defined once and imported by the subscriber:

  OrderPlaced { orderId, customerId, placedAt }

ordering is the producer (action: send). notification subscribes (action: receive) and reuses
the same payload schema — no duplicate definition. The "one message per status change" criterion
is satisfied by one event per status transition. Criteria trace: FR-04 -> order.placed.
```

## Example 3: Post-freeze breaking change — escalation

Input:
```text
Contracts frozen at contracts-v1.0.0, coding underway.
Billing coding agent reports: "ChargeRequest needs a taxRegion field to compute tax, but the
frozen schema has no such field and the field is mandatory."
```

Output:
```text
ESCALATION — breaking amendment to a frozen specification.

Trigger: a mandatory new field on ChargeRequest. Adding a required field breaks every existing
caller, so this is a major change, not additive.

Why it blocks: the ordering agent already builds against contracts-v1.0.0 without taxRegion.
Silently editing the schema would split the two agents onto incompatible interfaces — exactly
what the freeze prevents.

Resolution presented to the tech lead:
1. Make taxRegion optional with a default -> additive, minor bump to v1.1.0, no gate reopen.
2. Keep it mandatory -> major bump to v2.0.0, reopen the human gate, ordering must migrate.

Recommended: option 1. taxRegion defaults to the billing account's region when omitted, which
keeps existing callers valid. Open amendment recorded against the freeze tag.
```
