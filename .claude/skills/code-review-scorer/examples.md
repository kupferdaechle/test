# Examples

Worked reviews showing three outcomes: an auto-accept, a human-review band, and a
security-vetoed change whose high total cannot save it.

## Example 1: Auto-accept on a Professional change

Input:
```text
Tier: Professional (auto-accept >= 85).
Service: billing. Security scan: clean. All three acceptance criteria have passing tests.
Code: clear naming, one function slightly long. Coupling: 1 peer. Complexity: within ceiling.
```

Output:
```text
Axes:
  Security        30/30  (no findings)
  Requirements    30/30  (3/3 criteria, all tests pass)
  Code Quality    14/20  (one oversized function)
  Maintainability 20/20  (coupling 1, complexity ok, business logic covered)
Total: 94.

Overrides: none. Security floor holds (30 >= 15), no HIGH finding.
Decision: AUTO-ACCEPT (94 >= 85). Merge-eligible; human notified, not asked.
Note returned: consider splitting chargeOrder for readability — advisory, not blocking.
```

## Example 2: Human review on a Foundation change

Input:
```text
Tier: Foundation (auto-accept >= 80, human 50-79, auto-reject < 50).
Service: notes. Security scan: one MEDIUM finding. All criteria covered, but one test fails.
Code: minor repeated logic. Maintainability: complexity ok, partial business-logic coverage.
```

Output:
```text
Axes:
  Security        20/30  (one MEDIUM)
  Requirements    15/30  (all criteria covered, one test failing)
  Code Quality    14/20  (minor duplication)
  Maintainability 14/20  (core logic only partly covered)
Total: 63.

Overrides: none. Security floor holds (20 >= 15).
Decision: HUMAN REVIEW (50 <= 63 < 80). Present to the reviewer:
  - The failing test is the deciding issue — a real defect or a flaky test?
  - Recommendation: fix the failing test, then the change likely clears 78.
The human approves, rejects, or requests the fix. No automated merge in this band.
```

## Example 3: Security veto overrides a high total

Input:
```text
Tier: Enterprise (auto-accept >= 90).
Service: ordering. Code is excellent: requirements fully covered, clean, well-tested.
Security scan: one CRITICAL finding — a SQL query built by string concatenation.
```

Output:
```text
Axes:
  Security         0/30  (CRITICAL: SQL injection vector)
  Requirements    30/30
  Code Quality    20/20
  Maintainability 20/20
Total: 70.

Override fired: SECURITY VETO (CRITICAL finding).
Decision: AUTO-REJECT — the veto ignores the total. A 70 here is irrelevant; a CRITICAL
injection vector cannot merge no matter how good the rest is. This is the Goodhart guard:
the score must never launder a real risk.
Returned to coding agent:
  - Security: replace string-concatenated SQL with a parameterized query, then re-scan.
Cycle 1 of 2.
```
