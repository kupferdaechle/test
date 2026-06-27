# Writing Guide

The authoring principles inherited from Anthropic's skill-creator. These shape how a
skill reads and loads; the quality rubric measures whether the result scored well.

## Progressive Disclosure

A skill loads in three tiers. The metadata, meaning the name and description, stays in
context at all times and costs roughly 100 words. The SKILL.md body loads only when the
skill triggers, so keep it under about 500 lines. Bundled resources load on demand and
carry no strict limit.

Keep SKILL.md lean and move depth into reference files. Reference each file from the body
with a short note on when to read it. Give any reference file over 300 lines its own
table of contents, so a reader can jump without loading the whole file.

## Principle of Lack of Surprise

A skill's contents must match the intent a user would infer from its description. Do not
hide behavior the description does not imply. A skill must never carry malware, exploit
code, or anything that compromises the host. Creative cases such as roleplay are fine as
long as the description sets that expectation.

## Writing Patterns

Define an output format with an explicit template the skill must follow. Show the
template inline so the model copies its shape. Pair every example with an input label and
an output label, so the expected result is unambiguous.

## Writing Style

Explain the reason behind an instruction rather than issuing a bare rule. A capable model
given the rationale and a good harness goes beyond rote steps and handles cases the rules
never named. Watch for all-caps "ALWAYS" or "NEVER": that habit is a yellow flag that an
instruction should be reframed around its reasoning. Reserve hard limits for genuine
safety constraints.

## How This Pairs With the Quality Rubric

The writing guide and the rubric pull in the same direction. Progressive disclosure
raises the Progressive Disclosure and Structural Coherence dimensions. Explaining the why
keeps prose dense and varied, which lifts Information Density and Lexical Diversity.
Explicit templates and paired examples raise Example Quality. Write for a person first,
then run the deterministic gate to confirm the numbers agree.
