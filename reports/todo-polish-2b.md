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

## PHASE 3 — the companion rail

- **The two-mount account (halt (c) clear):** the Today panel stayed ONE render function
  (`renderTodayPanel` — page state, page handlers, exactly as transplanted in the workbench pack)
  with TWO call sites XOR'd on a `narrow` matchMedia flag (1499.98px): the **companion rail**
  (264px aside after the main column, sticky at the `--g24` offset) at ≥1500, the **masthead
  chip's popover** below. Exactly one mounts at a time, so the state literally cannot fork —
  tick/record/remove, the rollover bar, the done band and Add more all ride unchanged.
- **The chip:** sage pill "Today's list · {n} TO GO" — n is `committedCards.length`, the SAME
  committed union the panel renders (never a parallel count). Opens the identical panel as a
  popover anchored beneath (dialog role, aria-expanded, Esc + click-away close, reduced-motion
  honoured); widening past 1500 closes it and the rail takes over.
- **Panel polish per the ref:** the header chip now reads "{n} COMMITTED · {m} DONE" (both
  unions; "NOTHING YET" when both zero); the footer's pick reads "＋ Add more". The done-badge
  band toggle stays untouched (its chrome-fixes lock stands).
- **Tour:** stop 4 → `.tdb-today2, .tdb-todaychip` (querySelector's list hits whichever home
  exists; a closed popover filters out) with the copy re-worded "Today lives beside your work."
- **Future companions (report note, no build):** the rail is the natural home for the assistant's
  "note from your desk" card — it stacks (14px gaps) below the Today panel when that lands.
- Tests: mount parity (two calls, XOR guards), the rail geometry, chip/header count sources,
  popover a11y, the CSS belt + widen-closes; the scrap-cluster anchor re-pointed (the chip now
  sits between the cluster and the spacer).

## PHASE 4 — one tag grammar + card polish

- **One tag grammar:** the grouped cards' plain kickers become the standard typed white tag pills
  (`MATERIALS` / `WISH LISTS` / `REPLY WINDOWS` — `g.meta.label`, the ledger's own tag) and the
  kicker style (`.tdb-kick`/`.tdb-kd`) retires from cards and the stylesheet entirely; `G3_COPY`
  dropped its now-dead `kick` field.
- **One section grammar:** the cards view adopts the ledger's tinted head bands — the Lane header
  is now `.tdb-lghead standalone` (full border + radius 10 + the `--g12` gap; pink/coffee/note
  families) carrying title + count + ▶ Begin focused session (+ the notes ＋). The dot+rule
  `.tdb-reelh` grammar and its `.tdb-lt`/`.tdb-rule`/`.tdb-fs`/`.tdb-fsd` styles are deleted;
  `.tdb-lgt` goes 16px in BOTH views (the ledger's head rises 15→16 with it — one rule).
- **The grid:** `minmax(240px, 1fr)`; **min-height 200 → 168** (content + sane minimum — the
  hollow middles close; the clip chain and the pills-never-spill invariant stand).
- **Stale titles:** already always carry the duration (a stale task can only exist with a
  `dateSent`, so the ambient day count is always derivable) — now LOCKED by an assembleBoard test
  ("Marcus Reed silent for 100 days").
- **The batch "Never"** restyles to the ghost-link grammar (mono underline, muted → ink); the
  `muteRuleFromCard` handler is untouched.
- Tests: II·B P4 describe (tag pill + kicker-absence page-wide, the shared head grammar in both
  views, ghost Never), the cardBands/workbench locks re-pointed (168/240, the tags-band order,
  the lgt grammar), the stale-duration board lock.

## Close — SHAs · counts

| Phase | SHA | Suite |
|---|---|---|
| P1 masthead + 24-grid | `e34b680` | 1261 |
| P2 controls-only drawer | `898f65d` | 1266 |
| P3 companion rail | `c187ed9` | 1271 |
| P4 one tag grammar | (this commit) | 1275 |

**The grid tokens as shipped:** `--g24`/`--g12` on `.tdb-wrap` — masthead vertical padding ·
ws top-margin/gap/edges · drawer + rail sticky offsets · lane↔lane (cards + ledger) ·
lane-head↔cards (`.tdb-lghead.standalone` margin) · card gutters. No magic numbers at the seams.

**The two-mount account:** one `renderTodayPanel`, two call sites XOR'd on the 1499.98px
matchMedia flag — the rail ≥1500, the masthead-chip popover below; exactly one mounts, the state
cannot fork (halt (c) never fired).

**In-browser checklist (Nick, on dev):**
1. 62px post-its with the tape fold; the 25px title; the 58×44 scrap.
2. The drawer one-species and UNSCROLLED at a 900px-tall window (Walk · one bordered filter group
   · demoted ＋ New note · foot).
3. The rail sticky on 2560 with the live list in it (tick/record/remove behaving as before).
4. Resize through 1500 and watch the chip take over — "Today's list · N TO GO", the popover
   opening beneath it, Esc/click-away closing, the rail returning on widen.
5. White typed pills on the batch cards (MATERIALS / WISH LISTS); no kicker dots anywhere.
6. Equal 24s everywhere (masthead↔columns, drawer↔main, main↔rail, lane↔lane, page edges);
   12s inside (head↔cards, card gutters).
7. Card grid at 240 minimums — the hollow middles closed at 168.
8. Stale titles carrying their day counts; the ghost "Never" on batch cards.

**Deviations:** the post-it numerals go Playfair per the normative ref (the Caveat decorative
grammar retires on the masthead) · the ledger's section-head title rises 15→16px with the shared
grammar · the panel's done-badge band toggle stays alongside the new combined count chip (its
chrome-fixes lock and behaviour stand) · Option A's desk-pad and Option C's Today-drawer are
fenced, unbuilt.
