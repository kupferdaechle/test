# Quality Rubric

The scoring rubric, per-dimension fix patterns, triggerability signals, and the
pre-flight checklist that the super-skill-creator workflow gates against. This file is
the detail behind the brief rules in SKILL.md.

## Scoring Rubric

skillspector-quality scores a bundle across nine dimensions. The weights sum to 100 for a
skill with no behavioral frontmatter fields; a skill that sets fields like `paths` or
`effort` is scored over 110.

| Dimension | Weight | What it measures |
|---|---|---|
| Information Density | 15 | compression ratio plus n-gram duplication of all prose |
| Topic Coverage | 15 | TF-IDF cosine similarity between description and body |
| Code Maintainability | 15 | maintainability index, complexity, docstring coverage (N/A if no scripts) |
| Structural Coherence | 13 | heading-level consistency and file link-graph reachability |
| Readability | 10 | ensemble of five readability formulas, median grade |
| Example Quality | 10 | fraction of `## Example` sections with paired input and output |
| Behavioral Configuration | 10 | validity of frontmatter enum fields (N/A if none present) |
| Lexical Diversity | 9 | measure of textual lexical diversity, length-invariant |
| Metadata & Discovery | 8 | name format, description length, when_to_use, author, version |
| Progressive Disclosure | 5 | supporting files present and linked from SKILL.md |

A dimension that does not apply returns no items and its weight redistributes. Code
Maintainability is N/A without scripts. Behavioral Configuration is N/A without
behavioral fields. Readability and Lexical Diversity are N/A on very short prose.

## Fix Patterns

Each pattern maps a failing dimension to a concrete rewrite.

### Information Density

When repeated phrases inflate the body, collapse duplicate descriptions into one
authoritative statement and replace repeated noun phrases with shorter references. When
the content is thin, add specifics: name the methods, the schema fields, and the concrete
verbs instead of vague summaries.

### Topic Coverage

Extract the five most frequent meaningful terms from the body. At least three must appear
in the description. Mirror the body's key nouns in the description, because the match is
lexical, not semantic.

### Structural Coherence

Audit every heading. After an H2 the next deeper level is H3, never H4. Add the missing
level or promote the deeper heading. Link every bundle file from SKILL.md with a relative
markdown link.

### Readability

Above grade 14, sentences are too long. Split them at conjunctions and prefer plain words
over Latinate ones. Below grade 8, the prose is too sparse; add domain terminology and
expand each step with the method or field names it touches.

### Example Quality

Add at least two `## Example` sections. Each needs an input block and an output block as
code fences. Cover one happy path and one edge case or failure mode.

### Code Maintainability

For Python scripts, add a module docstring and a docstring per function, keep cyclomatic
complexity at or below 10, and keep comment density near 10 percent. For shell scripts,
add a shebang on line 1 and a comment block describing purpose and usage.

### Metadata & Discovery

The name must match `^[a-z0-9]+(-[a-z0-9]+)*$`: kebab-case, no capitals, no underscores.
The description runs 15 to 1024 characters and states both what the skill does and when
to invoke it. Always set author and version.

## Triggerability

The when_to_use field scores on four signals. Aim to satisfy all of them.

1. A trigger verb: "use", "invoke", "trigger", "call", "apply", "run", or "activate".
2. A negation: "do not", "don't", "never", "skip", "avoid", or "not for".
3. A conditional with the field over 30 characters: "when", "if", or "while".
4. Total length over 80 characters.

Include one trigger phrase, one exclusion, one conditional, and keep the field above 80
characters. Check the description against sibling skills: overlapping vocabulary causes
cross-triggering, where the wrong skill fires.

## Pre-flight Checklist

Run this against every draft before presenting it.

**Frontmatter**
- [ ] name matches `^[a-z0-9]+(-[a-z0-9]+)*$`
- [ ] description is 15 to 1024 characters with one exclusion
- [ ] when_to_use has a trigger verb, a negation, a conditional, and exceeds 80 characters
- [ ] metadata.author and metadata.version are set

**Body**
- [ ] exactly one H1 at the top
- [ ] no skipped heading levels
- [ ] at least two `## Example` sections with paired input and output
- [ ] every bundle file is linked from SKILL.md
- [ ] reference files are linked once the body passes 100 lines

**Gates**
- [ ] quality score is at least 90
- [ ] the security scan shows no real finding
- [ ] two or three behavioral test prompts produce correct output
- [ ] one negative prompt does not falsely trigger the skill
