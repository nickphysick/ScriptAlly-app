# The Corner Cluster + Tag Re-ink

Pack: `todo-corner`. Ref `design-refs/todo-corner-final-v1.html` (copied from Downloads ✓; sections
B/C fenced as exploration). Gates per phase (tsc · build · full Vitest).

## STEP 0 — recon (tree clean at `f493f38`). No halt fired.

1. **Corner today:** `.tdb-fab` = sage-gradient pill (right:70 bottom:20) with a CONIC-gradient ring
   (`.tdb-fabring` + inner `<i>`); `.tdb-setbtn` = 40px paper-ish circle stacked ABOVE help
   (right:20 bottom:66); AppShell help "?" = **already a 38px parchment circle** (bottom:20 right:20,
   hairline border, soft shadow, burgundy glyph). Styles retired: the sage FAB gradient, the conic
   ring, the stacked setbtn position.
2. **Sources at the render site:** `committedCards.length` (committed) and `doneN = doneCards.length`
   — and `doneCards` IS the cleared union the done band renders. Both already read where the pill
   renders (the pop-up consumes the same). Halt (a) does NOT fire.
3. **Tour stop 4** targets `.tdb-fab` — the class is KEPT, selector survives (halt (b) clear). Copy
   "watch the ring fill" still true (the ring lives in state 1) — no change needed.

**Companion-scope resolution:** the pack wants help as a matched paper circle, but help is AppShell
(out of scope). It's ALREADY a parchment 38px circle, so no AppShell change is needed — the cluster
aligns to help's existing bottom:20/right:20 anchor. Deviation: the margin is **20px (help's
immovable anchor), not the ref's 24** — moving to 24 would need an AppShell edit; help's glyph stays
burgundy (recolouring is global). Both flagged; one-line AppShell follow-ups if wanted.

## PHASE 1 — skin + companions

- **Letterpress pill:** `.tdb-fab` → parchment (`--paper`), 1.5px `--ink` border, radius 99, float
  shadow `0 6px 18px`, gap 12, pad 11/22/11/11. The sage gradient is gone (no dead CSS).
- **SVG ring** (chosen over conic — the conic can't do the rounded cap or a clean hairline track):
  two `r=14` circles (track `--line` w3, progress `--ink` w3 rounded, `dasharray 88`,
  `dashoffset = 88 − 88·pct/100`), the SVG rotated −90° so progress starts at the top; the fraction
  centred (`.tdb-fabfrac`, mono 8.5/600 ink).
- **Companions:** `.tdb-setbtn` → 38px paper circle (parchment, hairline, muted glyph → ink on
  hover, soft shadow) at right:70 bottom:20; the pill right-anchored at 120px so it grows leftward.
  Row (right→left): help(20) · settings(70) · pill(120+), 12px gaps, one baseline. Focus-visible
  rings on all three.
- **themes.md:** the "today-family FAB wears letterpress; sage speaks through its states" amendment.
- Tests: NEW `todoCorner.test.ts` — letterpress skin, SVG ring, companion positions/sizes, focus.

## PHASE 2 — the adaptive three-state pill (Section A, "the adaptive ledger")

- **One derivation, single-source:** `pillState(committed, done)` in `todoWalk.ts` (pure) — the pill's
  face is a switch over the SAME two numbers the pop-up + done band read
  (`committedCards.length`, `doneN = doneCards.length` = the cleared union). No parallel count.
  - `committed > 0` → **list**: ring + honest fraction `{done}/{committed}` + "Today's list / {toGo} to
    go". Even `done = 0` stays list at `0/{n}` (never collapses to fresh). The fraction may exceed 1
    (quick-✓s outnumbering list items) — the ring `pct` **caps at 100**, `toGo` **floors at 0**, the
    numerals stay truthful.
  - `committed = 0 ∧ done > 0` → **done**: sage ✓ puck + "{done} done today / Nice going".
  - both 0 → **fresh**: paper + puck + "Today's list / Nothing yet".
- **Priority is strict** (committed always wins over cleared) so a mid-list clear never flips the face.
- **Crossfade:** the inner is `key={st.kind}` so a state change remounts it under `.tdb-fabinner`'s
  `tdbFabFade` (0.2s), disabled under reduced motion. The pill is right-anchored → it grows leftward,
  so the companions never shift.
- **aria:** `pillAria(st)` speaks each state (the ring numerals are decorative).
- Tests: `todoWalk.test.ts` — the full state matrix (committed>0 ∧ cleared=0 → list `0/{n}`; cleared
  union outnumbering list → cap/floor; priority; no `−`/undefined fraction; aria per state).
  `todoCorner.test.ts` — the three faces + the keyed crossfade at the source layer.

## PHASE 3 — the white tag law (tag re-ink)

- **Every status tag → white.** Base `.tdb-tag` now = `--white` fill / `rgba(30,26,22,.25)` hairline
  (= `--ink` `#1e1a16` @ 25%, a **literal** — `.t-f12` bans `color-mix`) / `--ink` text. The lane
  BANDS already carry the stream colour, so a tinted tag doubled the signal; the tag steps back.
- **Urgency `.warn`** = white too, but a full **1.5px `--ink` frame + weight 700** — depth is frame +
  weight now, not a deeper hue.
- **★ Offer** = ink, untouched (rarest mark). Grouped kickers/dots untouched.
- **Deletions (dead once the base is white board-wide):** `.tdb-tile.nt .tdb-tag` (note-yellow) and
  the card-bands interim `.tdb-band .tdb-tag:not(.offer):not(.warn)` white override. Pink + note
  tokens no longer fill/outline any tag (they live on elsewhere — bands, discs, buttons, the flow).
- **themes.md:** new "THE WHITE TAG LAW" section; the two-depth pink law + the on-band tag law both
  marked ⚠️ SUPERSEDED inline.
- Tests: `todoTagLaw.test.ts` rewritten (white base + framed warn + ink offer + note override gone +
  a sweep asserting no non-offer tag draws a tinted fill); `todoCardBands.test.ts` flipped to assert
  the in-band override is absent.
