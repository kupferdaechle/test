---
name: skill-studio
description: Author, improve, and evaluate Claude Code skills through a strictly iterative, choice-driven workflow that wraps the official skill-creator and finishes with a deterministic quality gate. Use when creating a new skill from scratch, rewriting a weak skill, running skill evals, or optimizing a skill's triggering. Do not use for non-skill prompt engineering or general document editing.
when_to_use: |
  Use when the user wants to build, improve, or evaluate a Claude Code skill and prefers a
  guided, one-question-at-a-time process. Invoke for skill authoring, skill evals, or
  triggering optimization. Do not use for non-skill writing, general prompt engineering, or
  editing ordinary documents.
metadata:
  author: skill-studio
  version: 1.0.0
---

# Skill Studio

Build the best possible Claude Code skill by combining three layers: a strictly iterative,
choice-driven interview (this overlay), the official skill-creator for the heavy authoring,
evaluation, and triggering machinery, and a deterministic quality gate at the end. This
file governs how the conversation runs and when to hand off — it does not duplicate the
skill-creator's guidance.

## Layer 1 — Interaction style (apply throughout)

Run the whole session iteratively. Never dump a wall of questions or a finished skill.

- Ask ONE decision at a time. Use AskUserQuestion with 2–4 concrete options plus the
  free-text answer; mark the best option "(recommended)" and put it first.
- Offer an "accept all recommendations" escape hatch early, for users in a hurry.
- Reflect each answer in one line, then ask the next decision.
- Draft in sections — frontmatter, body, examples; after each, ask keep / adjust / add.

## Layer 2 — Delegate the substance to skill-creator

For everything except interaction style, use the installed `skill-creator` skill as the
engine; do not reinvent it.

- Authoring patterns, skill anatomy, and progressive disclosure → follow skill-creator's
  guidance and references.
- Test cases and evaluation → use its eval loop and the evals.json schema; review results
  with its eval-viewer (`eval-viewer/generate_review.py`).
- Triggering → use skill-creator's description-improver workflow.

Invoke `skill-creator` for these steps; this overlay only keeps the process iterative and
choice-driven while you do.

## Layer 3 — Quality gate before finishing

Once the skill-creator eval loop passes, run the deterministic skillspector-quality gate
that covers token economy, redundancy, and structural quality:

```bash
skillspector-quality scan <skill-dir> --min-score 90
```

Use `--min-score 90` for foundational skills that others depend on, and `85` for domain
skills. Feed any failed check back into another iteration.

## Stop conditions

Stop interviewing once intent is captured; stop iterating once the gate passes and the
user is satisfied. Keep this overlay thin — a bloated meta-skill would fail its own gate.

## Example: new skill

Input: "Make me a skill that turns meeting notes into action items."

Output: a one-question-at-a-time interview (purpose, triggers, exclusions, output format,
assets), then a draft authored via `skill-creator`, evaluated with its eval-viewer, checked
by `skillspector-quality scan`, and delivered once both gates pass.

## Example: improve an existing skill

Input: "My pdf skill keeps under-triggering and feels bloated."

Output: confirm the goal, use skill-creator's description-improver for triggering, run
`skillspector-quality scan` to surface redundancy and structural gaps, then iterate the
weak areas one choice at a time until both gates pass.
