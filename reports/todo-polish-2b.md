# Workbench Polish II·B — masthead height · controls-only drawer · the companion rail · one tag grammar

Pack: `todo-polish-2b` (supersedes the unrun `todo-polish-2` — discarded unactioned). Ref
`design-refs/todo-workbench-rail-v1.html` (= provided `todo-today-home.html`; **Option B — the
companion rail — normative** for the whole layout; Options A and C fenced as exploration). Live
`.t-f12` tokens over mockup hexes. Gates per phase (tsc · build · full Vitest). Ran against
`0cf0f4e`, tree clean.

## PHASE 1 — masthead + the 24-grid

- **THE 24-GRID as named tokens** (`--g24`/`--g12` on `.tdb-wrap`, with the vocabulary comment):
  masthead↔columns = the ws row's top margin `--g24` · drawer↔main + main↔rail = ws `gap: --g24` ·
  page edges = ws `padding: 0 --g24` · sticky offsets (drawer, and the rail in P3) `top: --g24` ·
  lane↔lane = `.tdb-reel`/`.tdb-ledger` `--g24` · lane-head↔cards = `.tdb-reelh` `--g12` · card
  gutters = `.tdb-grid` `gap: --g12`. No magic numbers at the seams; the drawer's old bespoke
  18px offsets fell to the token.
- **Masthead per the ref:** 24px vertical padding · **25px title** · 10px eyebrow · **62px
  post-its with the tape fold** (22×9 at −6; **numerals go Playfair 20** — the Caveat grammar
  retires here per the normative ref, a deviation from the old decorative-numeral convention,
  flagged) · scrap **58×44** · search 300px (10/16 padding) · toggle unchanged.
- Tests: the token-consumption sweep + the ref-anatomy locks; the A1/P1 masthead locks re-pointed
  (42→62, 20→25, 18px offsets → the token).

## PHASE 2 — the drawer, controls only

- **"YOUR DESK" header row** (mono label + the fold chevron folded into it, hairline base) over a
  structured mid (14/16 padding, 14 gaps): **Walk me through** stays the flagship · **FILTER** —
  **one bordered white group** (the single `.tdb-fgrp` species): lane headers (dot + label +
  count, hairline-divided) with indented type rows · the demoted **＋ New note** (letterpress
  outline pill) below the group · the ⚙/? foot unchanged.
- **The letterpress checkbox:** a REAL `<input type="checkbox">` (label-wrapped, keyboardable,
  `:focus-visible` ring) rendered by its sibling glyph box — 15px, 1.5px ink border, sage
  gradient + tick when checked. No CSS data-URIs (the Tailwind v4 parser gotcha) — the sibling
  span carries the ✓.
- **Zero-count rows grey** (`--faint` text + border), never hide. "On today's list only" rides
  INSIDE the group as its last row.
- **Today's list content removed from the drawer entirely** — the section label, the panel mount
  and the folded rail's Today icon all gone (the rail takes over in P3). The drawer now fits
  ordinary heights without internal scroll; the max-height + overflow stays as the safety net
  only.
- Tests: II·B P2 describe (head row, single species, real-input checkbox + a11y, zero-grey,
  no-Today-in-drawer, demoted note); the P1/P4 drawer locks re-pointed (dcreate → newnote, the
  ft labels → the frow builder, the folded Today icon's absence).
