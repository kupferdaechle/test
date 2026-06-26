---
name: code-review-scorer
description: Use after a coding agent pushes a service to score the change 0-100 across four
  weighted axes (Security 30, Requirements 30, Code Quality 20, Maintainability 20) and route
  it to auto-accept, human review, or auto-reject by tier-specific thresholds. Verifies code
  against the frozen contract and the Lastenheft acceptance criteria, applies a hard security
  veto, and returns per-axis fix instructions on rejection. Do not use to write code, to
  review prose, or before a contract freeze and acceptance criteria exist.
when_to_use: |
  Use in Phase 4, after a coding agent pushes a service, to produce a 0-100 review score and
  a routing decision. Invoke when a change must be graded against acceptance criteria and a
  frozen contract before merge, or when a rejected change returns for re-scoring. Do not use
  for authoring code, for grading documents, or before contracts and criteria exist.
metadata:
  author: vibe-pipeline
  version: 1.0.0
---

# Code Review Scorer

Grades a pushed change and decides its fate: merge, escalate to a human, or send it back. The
score is deterministic and reproducible, so the same change always yields the same verdict.
Read [reference.md](reference.md) for the per-axis rubric, the tier thresholds, and the routing
table. Read [examples.md](examples.md) for an auto-accept, a human-review, and a vetoed change.

## The Four Axes

A change earns up to 100 points across four weighted axes. Security and requirement fidelity
outweigh style, because wrong or unsafe code that reads well is still wrong.

- **Security (30)** — findings from the security scan, weighted by severity.
- **Requirements Coverage (30)** — each acceptance criterion traced to a passing test.
- **Code Quality (20)** — structure, naming, duplication, and complexity of the code.
- **Maintainability (20)** — cognitive complexity, coupling within the architecture's limit,
  and test coverage on business logic.

Score each axis per the rubric in [reference.md](reference.md#axis-rubric), then sum.

## Hard Overrides

Some defects cannot be outweighed by a high total. Apply these before the total decides:

- **Security veto** — any CRITICAL security finding forces auto-reject, whatever the sum.
- **Contract breach** — code that violates the frozen specification forces auto-reject; the
  change broke the interface every other agent depends on.
- **Security floor** — if the Security axis scores below half its weight, the change cannot
  auto-accept regardless of total; it routes to a human at best.

These overrides are the defense against a change that games the total while hiding a real risk.

## Routing

Apply the tier thresholds from [reference.md](reference.md#tier-thresholds). Each tier sets an
auto-accept floor and an auto-reject floor; the band between them is human review.

- **Auto-accept** — merge-eligible. Notify the human; do not ask. Requires the security floor
  to hold and no HIGH finding open.
- **Human review** — present the per-axis breakdown, the open findings, and a recommendation.
  The human approves, rejects, or requests a fix.
- **Auto-reject** — return to the coding agent with the failing axes named and a concrete fix
  for each. Re-score on resubmission. After two failed cycles, route to a human instead.

## Output

Emit the structured verdict from [reference.md](reference.md#output-contract): the four axis
scores, the total, the overrides triggered, the routing decision, and the per-axis remediation.
Append it to the pipeline record so the integration phase and the human both see one verdict.

## Model Recommendation

Use Sonnet to compute the score on Foundation and Professional changes, where the rubric is
mechanical. Use Opus on Enterprise changes and on any security-vetoed review, where judging the
blast radius of a finding rewards deeper reasoning. Record the model used in the verdict.
