---
name: super-skill-creator
description: Create production-grade Claude Agent Skills that are behaviorally tested AND score 90+ on skillspector-quality. Use when a user wants to author a new skill, upgrade an existing one, or harden a SKILL.md bundle against quality and security gates before shipping. Invoke for skill authoring, skill optimization, and SKILL.md hardening. Do not use for general prompt engineering, non-skill documentation, or tasks that never produce a packaged SKILL.md bundle.
when_to_use: |
  Use when the user wants to author, improve, or harden a Claude Agent Skill and
  cares about both real-world behavior and a deterministic quality score. Invoke
  when a skill must pass a skillspector-quality gate or a security scan before it
  ships. Do not use for general markdown writing, one-off prompts, or content that
  never becomes a SKILL.md bundle.
metadata:
  author: super-skill-creator
  version: 1.0.0
---

# Super Skill Creator

Author, improve, and harden Claude Agent Skills so each bundle is both behaviorally
tested and scores well on every skillspector-quality dimension. This skill merges two
disciplines: the behavioral lifecycle of Anthropic's skill-creator (draft, test on real
prompts, evaluate, iterate, package) and the deterministic scoring rubric of the
skill-writer skill (information density, topic coverage, structural coherence, and the
other dimensions). The result is a skill that passes a quality gate and a security scan
before it ships.

Read [reference.md](reference.md) for the nine-dimension
rubric, the per-dimension fix patterns, and the pre-flight checklist. Read
[writing-guide.md](writing-guide.md) for progressive disclosure and
the writing principles. Read [examples.md](examples.md) for worked
before/after pairs and one full creation walkthrough.

## The Two Gates

A skill is "super" when it clears both gates that its parent skills check separately.

- **Behavioral gate**: the skill actually does its job. Run two or three realistic
  prompts through it and confirm the output matches what the intent demands.
- **Deterministic gate**: the skill scores at least 90 on skillspector-quality and
  carries no real security finding. This gate is reproducible and needs no model.

Most authoring tools check one gate. Checking both catches a skill that scores well yet
behaves wrong, and one that behaves right yet wastes tokens or fails to trigger.

## Workflow

Follow these steps in order. Do not skip the gates.

### Step 1: Capture Intent

Pin down five things before drafting: the task the skill performs, the phrases or file
types that should trigger it, the conditions under which it must NOT trigger, the exact
output shape, and whether scripts or reference files belong in the bundle. Exclusion
conditions are high value; capture them explicitly.

### Step 2: Draft the Bundle

Write supporting files first, then the SKILL.md body, so the body can link concrete
anchors. Keep the body lean and push detail into reference files. Apply the density and
metadata rules from [reference.md](reference.md) and the
structure rules from [writing-guide.md](writing-guide.md) as you
write.

### Step 3: Run the Deterministic Gate

Score the draft with the skillspector-quality tool bundled in this repository. Run the
gate script and read its output:

```bash
scripts/score_skill.sh path/to/skill
```

If the quality score is below 90, map each weak dimension to its fix pattern in
[reference.md](reference.md#fix-patterns) and rewrite.
If the security scan flags a real risk, remediate it. Re-run until the gate passes.

### Step 4: Run the Behavioral Gate

Write two or three test prompts that a real user would send. Run each through the drafted
skill and inspect the output. Add one prompt that should NOT trigger the skill, to check
for false triggers. Record what passed and what failed.

### Step 5: Improve

Fix the failures from both gates in one pass. Generalize from the test cases rather than
patching each one; a fix that only satisfies a single prompt overfits. Re-run both gates
after every rewrite, highest-weight dimension first.

### Step 6: Optimize Triggering

Tune the description and when_to_use so the skill fires on its intended prompts and stays
quiet otherwise. The triggerability signals (trigger verb, exclusion clause, conditional,
concrete keywords) are listed in
[reference.md](reference.md#triggerability). Check the
description against any sibling skills whose vocabulary overlaps.

### Step 7: Package and Present

Confirm the final layout, run the pre-flight checklist in
[reference.md](reference.md#pre-flight-checklist), and
present the bundle with its final quality score and security status.

## Bundle Layout

```
skill-name/
├── SKILL.md              required
├── reference.md          rubric and checklist, loaded on demand
├── examples.md           worked input/output pairs
├── writing-guide.md      authoring principles
└── scripts/              optional executable helpers
```

A reference file is required once the body passes 100 lines. A second output schema or a
field dictionary belongs in its own reference file. Every file in the bundle must be
linked from SKILL.md with a relative path.

## Writing Rules in Brief

These rules map to scored dimensions; the rubric file holds the full detail.

- **Metadata**: kebab-case name, a description that states what the skill does and when
  to invoke it with at least one exclusion, a when_to_use over 80 characters, and an
  author and version.
- **Density**: every sentence carries new information. Delete any sentence that repeats a
  neighbour.
- **Readability**: aim for grade 10 to 12. Keep sentences between 15 and 25 words.
- **Structure**: one H1, no skipped heading levels, every file linked.
- **Examples**: at least two, each with a paired input block and output block.
- **Why over rules**: explain the reason behind an instruction. Reserve hard "never"
  statements for genuine safety limits, not style preferences.

## Example: hardening a thin skill

Input:
```text
A skill scores 41 on skillspector-quality. Metadata is 2/8, the body repeats
"process the file" four times, and no examples exist. Make it ship-ready.
```

Output:
```text
1. Rewrite the frontmatter: kebab-case name, description with an exclusion, an
   80+ char when_to_use, author and version. (Metadata 2/8 -> 8/8)
2. Collapse the four repeated sentences into one specific statement. (Density up)
3. Add two ## Example sections with input/output pairs. (Example Quality 0 -> 10)
4. Re-run scripts/score_skill.sh; confirm the score clears 90 and the scan is clean.
```

See [examples.md](examples.md) for the full walkthrough.
