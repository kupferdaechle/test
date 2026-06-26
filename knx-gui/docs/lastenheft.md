# Lastenheft: KNX Gruppenadress-Editor

**Tier:** Foundation · **Mode:** client (no backend) · **Model:** sonnet

## Vision
Browser-based React tool: read a .knxproj, show devices + active KOs, manage group
addresses, link KO↔GA by drag & drop, export a .knxproj re-importable into ETS6.

## Functional Requirements (excerpt — full set in pipeline.json)
- FR-09 GA address conversion: 3-level (Main/Middle/Sub) ↔ flat integer.
  - AC-09.1: toInteger(1,0,0) === 2048 (Beleuchtung range start)
  - AC-09.2: fromInteger(2048) === {main:1, middle:0, sub:0}
  - AC-09.3: round-trip any valid triple is stable
  - AC-09.4: format as "main/middle/sub" string

## NFR
observability: N/A — client-side (only structured console errors). No tracing/metrics.
