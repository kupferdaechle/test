# Reference: Code Review Scorer

## Axis Rubric

Each axis is scored to its weight, then summed to a total out of 100.

### Security — 30 points

Run the security scan and deduct by the worst severity present.

| Findings present | Points |
|---|---|
| None | 30 |
| MEDIUM only | 20 |
| One HIGH | 12 |
| Multiple HIGH | 6 |
| Any CRITICAL | 0 — and triggers the security veto |

A score below 15 (half the weight) blocks auto-accept regardless of the total.

### Requirements Coverage — 30 points

Trace every acceptance criterion owned by this service to a test that exercises it and passes.

| Criteria covered by passing tests | Points |
|---|---|
| All criteria, all passing | 30 |
| All criteria covered, one test failing | 15 |
| A criterion has no test | 10 |
| Multiple criteria untested | 0 |

A criterion the change cannot satisfy is not a low score — it is a contract breach if the
interface promised it. Check the frozen specification before deducting.

### Code Quality — 20 points

| Condition | Points |
|---|---|
| Clear naming, no duplication, functions within complexity budget | 20 |
| Minor duplication or one oversized function | 14 |
| Repeated logic or several oversized functions | 8 |
| Pervasive duplication or unreadable structure | 0 |

### Maintainability — 20 points

Measured, not judged. Three checks, roughly seven points each.

| Check | Full credit when |
|---|---|
| Cognitive complexity | Every function is at or below the agreed ceiling |
| Coupling | The service calls no more peers than the architecture's limit of 3 |
| Business-logic coverage | The core logic, not getters, is covered by tests |

---

## Tier Thresholds

The customer set thresholds per tier — stricter tiers keep more changes away from auto-merge.

| Tier | Auto-accept ≥ | Human review | Auto-reject < |
|---|---|---|---|
| Foundation | 80 | 50–79 | 50 |
| Professional | 85 | 60–84 | 60 |
| Enterprise | 90 | 70–89 | 70 |

Read the tier from the Lastenheft. A change inherits the tier of the project, not of the
service. Hard overrides apply on top of these bands and can only lower a verdict, never raise it.

---

## Retry Loop

Auto-reject is not a dead end; it is a cycle with a limit.

1. Return the verdict to the coding agent with each failing axis and a concrete fix.
2. The agent revises and resubmits.
3. Re-score from scratch — never carry a prior score forward.
4. After two rejected cycles on the same change, stop and route to a human. Repeated automated
   failure signals a problem the rubric cannot resolve alone.

---

## Output Contract

```json
{
  "review": {
    "service": "",
    "tier": "",
    "axes": { "security": 0, "requirements": 0, "code_quality": 0, "maintainability": 0 },
    "total": 0,
    "overrides": [],
    "decision": "auto_accept | human_review | auto_reject",
    "remediation": [
      { "axis": "", "criterion": "", "finding": "", "fix": "" }
    ],
    "cycle": 1,
    "model_used": ""
  }
}
```

The `overrides` array names any veto, contract breach, or security-floor block that fired. An
empty array with a passing total is the only path to auto-accept.
