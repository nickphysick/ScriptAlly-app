# To-do — the v4 refinement pass

Run against HEAD `d87dea7` (the Final Shape). **Ref note:** the plain-named
`todo-refine-v4.html` in Downloads was a stale Polish-III-era export (19 Jul) — halted and
reported; the real ref arrived as `todo-refine-v4 (2).html` (22 Jul 18:36, content verified:
SHOW ALL / FILTER / 4→3 columns / diary-sage Today) and is committed as
`design-refs/todo-v4.html` with the supersession noted in its fence. The two P5 refs were
current on first check. Phase 0 confirmed the Final Shape live with no drift.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — centred hero on the bare ground | `e41d5fb` | 1277 |
| P2 — the rail: Begin · FILTER · SHOW ALL | `6ba6319` | 1278 |
| P3 — conditional Today + the 4-up board | `b1bad69` | 1282 |
| P4 — batch cards level at rest | `8bd45d1` | 1284 |
| P5 — the letterhead banner + the assistant modal | `2832567` | 1294 |
| P6 — empty-state copy + sweep | `3e1c159` | 1296 |
| report | `<this commit>` | 1296 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging.

## What shipped

- **P1** — the hero lost its paper band and border: the 42px title sits centred on the oat with
  the search stacked 18px beneath (the −23px overlap retired). Begin left the header.
- **P2** — the rail leads with the ink **▶ Begin focused session** (same whole-board wiring);
  SHOW → **FILTER**; **SHOW ALL** is the default-selected first pill (ink border, ✓, bold,
  total count) and *is* the reset — the separate burgundy RESET row is gone; the narrowed meta
  lives in the sheet's corner line.
- **P3** — **Today is conditional**: it mounts only with content (≥1 committed OR ≥1 done
  today). Empty → the board runs **four** columns (sheet 1072, assembly 1344); active → Today
  slides in from the right (220ms translateX+fade, exit lagging the unmount; reduced-motion
  instant) while the sheet width transitions and the grid steps to three. Cards stay 250
  throughout. The panel restyled: lifted white card with the diary-sage header (the pack's
  `#d7ddd5→#d5dbd3` + `#3d4a3b`/`#5a6e58` inks verbatim — superseding the old themes.md note
  for this one header; the border rides the live `--hk-spine`).
- **P4** — batch cards **level with units at rest** (one `--tdb-cardh`; the batch cell class
  and `--tdb-cardh-b` gone): band + count headline + roundels only. The description and the
  inline progress bar + mono meta moved INTO the hover expansion (`.tdb-gdetail`, above the
  verbs; ⚡ FIX n → stays primary). The Batch-fix sheet keeps the full story.
- **P5** — the rail's Pro square became the **letterhead banner** (upsell candidate A) below
  the board, spanning the sheet: double-ruled slate frame, discovery kicker, "Hand over the
  housekeeping", live numbers ({housekeeping} of {total} tasks — the **hours clause omitted**,
  no cheap derivation), the demo mini-ledger of real task names with BY-THE-ASSISTANT chips +
  one pending row. "See what it does →" opens the **Meet-the-assistant preview modal**:
  letterhead over the scrim, the preview kicker + honesty sub-line, the scripted theatre over
  real task names (~1.7s row cadence, spinning slate ring, canned timing chips, WHAT IT JUST
  FOUND personalised to the first agent), three mechanism columns, "Part of ScriptAlly Pro" +
  Not now + Upgrade → /plans. **No price anywhere; nothing writes from the preview path**
  (grep-locked); `TODO(pro-assistant)` docked at the data source for the future free-run.
- **P6** — "Nothing jotted yet" removed repo-wide (the empty Notes lane = the quiet ＋ only);
  the tour's first stop retargeted to the rail's `.tdb-fsb2`.

## In-browser checklist (dev)

1. The centred title over the centred search on the bare oat — no band, no border.
2. Begin in the rail (full-width ink, first element); FILTER header; SHOW ALL selected by
   default with the total; picking a family deselects it and narrows; SHOW ALL restores.
3. Clear Today (untick/finish everything): the column slides out and the board re-runs at FOUR
   columns; commit something: Today slides back in with the sage header, the grid stepping to
   three — cards never changing width.
4. A batch card level with its unit neighbours at rest; hover reveals description + progress
   above ⚡ FIX n →.
5. The letterhead spanning the sheet below the board; "See what it does →" opening the modal;
   the theatre animating (rows completing, the slate ring spinning) — the animation needs the
   eyeball, jsdom can't judge it.
6. "Not now", ✕ and Esc all closing; "Upgrade & set it working →" landing on /plans; no price
   visible anywhere.
7. Empty Notes: just the quiet ＋, no sentence.
8. The tour end to end (stop 1 now spotlights the rail's Begin).

## Deviations

- **The stale-ref halt** (above) — resolved by Nick re-dropping the file; the fence documents it.
- **The hours figure omitted** from the banner copy (the pack's own else-branch: never fabricate).
- **The Today header hexes** are the pack's verbatim (`#d7ddd5→#d5dbd3` etc.) — a deliberate,
  scoped supersede of the old "live dashboard band wins" themes note, recorded in the CSS comment.
- **Primary CTA copy** is the pack's "See what it does →" (the upsell ref draws "See it work on
  your desk →" — pack prose wins).
- **The banner sits inside the sheet** (spanning its width per the pack) — the v4 ref's drawn
  frame-wide slate-gradient `.proban` is fenced as superseded by the letterhead.
- **Grid column-count steps** (no smooth column animation exists in CSS) while the sheet width
  transitions 220ms — the slide carries the motion; reported for the eyeball.
- jsdom limits as ever: centring, the slide, equal heights and the theatre are rule-text locks —
  the browser walk confirms the pixels.

## Close

**The redesign is complete; nothing queues before dev deploy and the prod sequencing pass.**
