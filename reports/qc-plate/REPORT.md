# The plate header — Query Centre only, and the bar's hairline always on (4 Oct)

Ref `design-refs/page-header/qc-plate-header-v1.html` · art `public/images/qc/qc-plate-courier{,-figure}.png`.
**Not deployed — Nick deploys.**

## False premises (read first)

1. **"The page name still appears only once the title is behind the bar" (§1) and PH6's "the page name is
   hidden at rest on every route" are false on the six living routes**, the Query Centre among them: living
   headers v3 shows the crumb from first paint. Ruled (Nick, 4 Oct): keep living as is. PH6 asserts the
   hairline at rest on all fifteen routes, the name hidden at rest on the nine ordinary ones and shown on the
   six living ones.
2. **The report's "scrolled until the page name shows" has no such position on the Query Centre** — the
   name is there at rest. The scrolled screenshot is simply scrolled.
3. **The pack names Q2, Q3 and `.ph-art` and misses five locks the plate breaks by design**: `pageHeaderV2`
   §2 (the QC's open-header geometry) and §4.4 (its tops equal the other full headers'), `livingHeadersV3`
   LH0 / LH4 / LH7 / LH9, and `quietBar` Q8 — plus Q4, Q6 and Q9, which asserted the at-rest hairline the
   pack reverses. All retargeted through one register (below), none deleted.
4. **PH3's `elementFromPoint` cannot see the figure as specified**: the brief makes it `pointer-events: none`,
   and `elementFromPoint` skips such elements, so it would answer "the plate" whichever layer is on top. PH3
   gives the figure pointer events for the one read, then adds a pixel comparison with the plate's edge
   switched off.
5. **The desk's white is a literal (`#fff`), not a token** (Step 0 ✗3). Ruled: the plate reads
   `--fc-card` (the shared `:root` card white). The desk still paints its literal; same value, two sources.

## Step 0

`reports/qc-plate/STEP0.md`. Baselines at `2ae7d18a`: tsc 0 · `build:dev` clean · Vitest 8,265 passed / 3
skipped / 512 files. Room above the plate: the drawing's top lands 12px inside `.ws-window`'s clip.

## Commits

| | |
|---|---|
| 0/3 | the reference and the two art layers enrolled (hashes verified against the pack), Step 0 |
| 1/3 | PH1–PH6 written first; `red-before.txt` is the run against the unchanged build |
| 2/3 | the bar's hairline on at rest, app-wide; quietBar Q2/Q3/Q4/Q6/Q9 amended; CLAUDE.md |
| 3/3 | the plate (`PageHeader plate` + `artFigure`), `QcCentre` switches it on; the register and the retargets |

## The plate, as built

- `PageHeader` gains `plate` and `artFigure`, opt-in; only `QcCentre` passes them. `QcEmpty`, the Contact
  list and every other page render the open header exactly as before (PH5).
- Plate: the column's full width, 220 tall, 16 radius, 26/38 padding, `var(--fc-card)`, an inset 1px
  `--shell-rule` hairline plus the house shadow; 74px of ground above (the header's `margin-top`), no rule,
  the desk 26 below.
- Type: title 48px Special Elite (the existing `!important` face rule), intro 16px serif, 10 under the title,
  actions 18 under the intro, buttons unchanged.
- **One derivation to know:** the brief's stack (48 + 10 + two intro lines + 18 + 48px buttons) only fits the
  168px inside 220 with 26px padding if each intro line is **22px**, so the intro is 16/22.
- **One addition beyond the brief:** the intro's measure is `min(520px, 100% − 352px)`, so its BOX always ends
  left of the drawing, whatever the copy. Above ~1180 the 520 binds; at 1280 it is 520 with 4px to spare.
- Drawing: one box (282 tall, right 24, bottom on the plate's bottom, ≈364 wide, rising 62). Under =
  the full crop in `.ph-plclip`, which is the plate's own box and radius with `overflow: hidden`, masked
  `transparent 4% → #000 30%`. Over = the brushless figure, unclipped, unmasked, `z-index: 3` as a child of
  the plate — above the plate's hairline and shadow. Both `aria-hidden`, no pointer events. Probes
  `data-probe="art-under"` / `"art-figure"`.

## Locks — each red before, green after

| Lock | Red before (unchanged build) | Mutation (the pack's) → red at | Green now |
|---|---|---|---|
| PH1 plate | no plate, both widths | plate off → PH1 ×7 | ✓ |
| PH2 under | no plate | clip `overflow: visible` → clip is the scroller (1032×694), overflow `auto`, pixel `197,203,220` vs ground `244,240,234` | ✓ |
| PH3 over | no plate | figure `z-index: -1` → `elementFromPoint` = `hero-frame` | ✓ |
| PH4 clear | no plate | intro 700 → intro box 1027 vs art 851 (1280), 1032 vs 1006 (1440) | ✓ |
| PH5 scoped | green (scope lock) | plate on the Contact list → no-plate, ground, and every box red | ✓ |
| PH6 hairline | hairline 0 at rest, 15/15 routes × 2 widths | at-rest hairline restored → red on every route | ✓ |

Unit retargets, also proved red: `qcCentre.test` §3 (plate off → the figure's src missing) and
`shellV2Tokens.test` (`--fc-card` moved off `:root` → "reads --fc-card, which nothing defines").

PH5's reference is captured per run (`PH5_CAPTURE=1` against the build before the change) and refused when
older than twelve hours; the QcEmpty capture refuses to write unless the visible header is inside QcEmpty.

## Retargets — one register

`tests/e2e/plateRoutes.ts` — `PLATE_ROUTES = ["/queries"]`, `PLATE_PAD_X = 38`. Every suite that skips or
retargets a plate route reads it and asserts that what it skipped IS the register's set.

- `pageHeaderV2` §2: the QC is held to being a plate (geometry is PH1–PH4's). §4.4: the three open headers
  against each other (Contact list the anchor) + a plate row; exact count 6 per size.
- `livingHeadersV3` LH4: the plate's left = the tiles' and rows' left, and the text = plate left + 38. LH7:
  no rule either side (the plate replaces it); cross-state boxes skipped (QcEmpty is the open header, PH5
  holds it). LH0: skipped for the plate (its ref is the plate ref). LH9: a plate route keeps its plate.
- `quietBar` Q8: the plate's left = the first card's left, the text 38 inside; the drawings tally drops by
  two per plate route.

## Suites

`plateHeader` 6/6 · `quietBar` 6/6 · `pageHeaderV2` 20/20 · `livingHeadersV3` 7/8 · `qcV96` 11/14 —
see below. Gates at the phase-3 commit: tsc 0 · `build:dev` clean · Vitest **8,268 passed / 3 skipped / 512 files**.

**Not this pass's, shown by switching the plate off:**
- `livingHeadersV3` — the two `/agents` 1280 copy rows already left with Nick (the one-line subline wrap
  and "148 agents on file" 5px overflow).
- `qcV96` QC10 — the rail header's carried baseline says "31 overdue"; today it is 34. Date-bound. QC4 —
  "Send partial 1 day over" truncates at 1280, a date-bound string. QC12's floor fails as a consequence.
  Both still red with the plate off.

## Screenshots (`reports/qc-plate/`)

`qc-rest-1280/1440` · `qc-scrolled-1280/1440` · `qc-edge-3x-1280/1440` (the courier crossing the plate's top
edge at 3×: the edge passes behind him; the brush stops at the edge) · `contact-1280/1440` (unchanged).

## Open

- **62 of rise into 74 of ground, under a clipping window**: 12px of margin at the drawing's top. A taller
  bar, a smaller gap or a taller drawing eats it first.
- **Below ~1180 the intro's measure narrows** to stay clear of the drawing (by construction); the title is
  `nowrap` and is not capped — a much longer headline at a narrow width could reach the art. Not locked
  below 1280.
- At 1280 the list head's "83 OF 83" runs into "Find a query" — the v96 body, which this pack fenced.
- The rollout to other pages is the `plate` prop on each — Nick's call after seeing it live.
