# Reference: Contract Manager

## Specification Formats

Two interface styles, two formats. Pick by how the caller and callee interact.

| Interaction | Format | When |
|---|---|---|
| Synchronous request/response | OpenAPI 3.1 | The caller waits for a result on the request's critical path |
| Asynchronous event | AsyncAPI 3.0 | The producer emits a fact and does not wait for consumers |

### OpenAPI — synchronous

Each operation declares its request body, success response, and every error the caller must
handle. An error the caller cannot anticipate is a defect in the specification.

```yaml
openapi: 3.1.0
info: { title: billing, version: 1.0.0 }
paths:
  /charges:
    post:
      operationId: chargeOrder        # business action, not "postCharge"
      requestBody:
        content: { application/json: { schema: { $ref: "#/components/schemas/ChargeRequest" } } }
      responses:
        "201": { description: charged }
        "402": { description: payment declined }
```

### AsyncAPI — events

```yaml
asyncapi: 3.0.0
info: { title: ordering, version: 1.0.0 }
channels:
  orderPlaced:
    address: order.placed
    messages:
      OrderPlaced: { payload: { $ref: "#/components/schemas/OrderPlaced" } }
operations:
  publishOrderPlaced: { action: send, channel: { $ref: "#/channels/orderPlaced" } }
```

---

## Shared Data Models

A type that crosses a boundary has exactly one definition. Duplicate definitions drift, and
drift is the silent cause of integration failure.

- Define each shared type once, in a models package both sides import.
- A field's meaning is identical in every specification that references it.
- Version models with the interfaces; a model change is an interface change.
- Prefer adding optional fields over changing existing ones — additive changes never break.

---

## Freeze Protocol

The freeze is what makes parallel coding safe. Without it, two agents implement against a
moving target.

1. **Completeness check** — every acceptance criterion, by its ID, traces to an operation or event.
2. **Commit** — all specifications in one commit, no implementation code.
3. **Tag** — annotate with a version, e.g. `contracts-v1.0.0`.
4. **Record** — write the tag into the output so every agent pins it.

After the tag, treat the specifications as read-only for the coding phase. Changes follow the
amendment rule in SKILL.md.

### Versioning

| Change | Version bump | Gate |
|---|---|---|
| New optional field, new operation | Minor (1.0 → 1.1) | Notify consumers |
| Removed or renamed field, changed type | Major (1.0 → 2.0) | Reopen human gate |

---

## Output Layout

```
contracts/
├── billing.openapi.yaml
├── ordering.asyncapi.yaml
├── models/
│   └── shared.yaml
└── FREEZE.md          # tag, approver, completeness trace
```

### JSON (appended to the pipeline contract)

```json
{
  "contracts": {
    "freeze_tag": "",
    "specifications": [
      { "service": "", "format": "openapi|asyncapi", "path": "", "version": "" }
    ],
    "criteria_trace": [
      { "criterion": "AC-01.1", "requirement": "FR-01", "satisfied_by": "" }
    ],
    "contract_human_gate_passed": false,
    "open_amendments": []
  }
}
```
