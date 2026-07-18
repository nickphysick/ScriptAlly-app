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
