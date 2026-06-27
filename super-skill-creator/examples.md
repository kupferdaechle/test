# Examples

Worked pairs showing how the super-skill-creator workflow raises a skill across both
gates: the deterministic quality score and the behavioral test.

## Example: fixing metadata and density

A skill scores 22. Metadata is 2/8, density is low from repeated filler, and the
description does not match the body.

Input:
```markdown
---
name: EmailHelper
description: email tool
---

You are a helpful assistant. Read this email and tell me what type it is, like
billing or support, and how urgent it is, and summarize it for me please.
```

Output:
```markdown
---
name: support-email-classifier
description: Classify inbound support emails by category and urgency into structured JSON. Use when routing support emails to the correct queue. Do not use for internal or marketing email.
when_to_use: |
  Use when routing inbound support email to the right team queue. Invoke for helpdesk
  triage that needs machine-readable routing. Do not use for internal or marketing mail.
metadata:
  author: super-skill-creator
  version: 1.0.0
---

# Support Email Classifier

Classifies inbound support email into routing data for helpdesk triage pipelines.
Return only valid JSON: category, urgency, and a one-line subject summary.
```

The name became kebab-case, the description gained an exclusion, when_to_use cleared 80
characters, and the filler collapsed into one dense statement. Metadata rose to 8/8 and
density improved.

## Example: a negative trigger test

The behavioral gate needs a prompt that should NOT fire the skill, to catch false
triggers against a sibling skill.

Input:
```text
Skill under test: support-email-classifier
Negative prompt: "Draft a marketing newsletter about our new pricing."
```

Output:
```text
Expected: the skill does NOT fire (marketing is excluded in when_to_use).
Observed: did not fire. Pass.
If it had fired, tighten the exclusion clause and re-run the deterministic gate.
```

## Example: full creation walkthrough

A user asks for a skill that summarizes git log output into a categorized changelog.

Input:
```text
"I want a skill that reads git log output and summarizes the last sprint into
features, fixes, and chores as JSON."
```

Output:
```text
Step 1 Intent: task = categorize commits to JSON; triggers on pasted git log; not for
       PR descriptions or release notes; output = {features, fixes, chores, count}.
Step 2 Draft: author the new skill's body with the schema, plus examples.md pairs.
Step 3 Deterministic gate: scripts/score_skill.sh -> quality 86. Topic Coverage is
       low; mirror "git log" and "changelog" into the first paragraph. Re-run -> 92.
Step 4 Behavioral gate: paste a four-commit log; output groups them correctly. A
       prose request ("write release notes") does not fire. Pass.
Step 5 Improve: generalize the category rules so an ambiguous commit picks the
       lower-severity bucket, rather than hard-coding the test commits.
Step 6 Triggering: description gains "Do not use for release notes"; no sibling clash.
Step 7 Package: layout confirmed, checklist clean, present at quality 92, scan clean.
```
