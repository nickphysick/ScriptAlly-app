# Query Centre v126.2: the Birds-eye drawer, refitted

Reference: `design-refs/query-centre-v130.html`, plus three PNGs in `design-refs/qc-v126/` (enrolled in the hash manifest).
Branch `qc-v126`, one commit. Not merged to `main`.

## False premises

1. **"The v126.1 footer wording fix" never existed.**
   - v126 built the footer line verbatim from its brief: *INK IS TIME PAST THE DATE*.
   - The new wording replaces the original, not a fix to it.
2. **The list's manuscript scope is not the top bar's.**
   - The Query Centre's scope is page-local (`qcScope`, which defaults to All).
   - The drawer already received that scoped set (`qcScoped`).
   - Nothing needed connecting.
3. **"Record a response" is not the longest next-move label.**
   - "Decide on the offer" and "Record a late reply" are both 19 characters.
   - Measured on the page:

     | Label | Width |
     |---|---|
     | Decide on the offer | 142px |
     | Record a response | 134px |
     | Log the send | 100px |
     | Nudge now | 86px |
     | Close it | 73px |

   - All of them fit the 164px column.
4. **QC126-2.3 could not hold on v126's timeline.**
   - That timeline was a native horizontal scroller.
   - Every bar and label sat at its full content position, and the scroller only clipped the painting.
   - `getBoundingClientRect` ignores clipping, so labels 9,000px right of the drawer *reported* being there.
   - **The fix:** the track is now **windowed**, as v130 draws it. One offset (`off`) is applied, and every element is computed straight into the visible track. What is off-screen is not drawn, and what is partly visible is drawn already cut.
   - The rows' scroller is vertical only.
5. **v126's drawer action was hard-wired to Nudge.**
   - `onAct={(id) => openQueryDrawer({ mode: "nudge", … })}` was contrary to v126 Phase 7: an offer row offered "Nudge".
   - It now opens the journey named by the row's next move.
6. **The brief and v130 disagree on three header values. v130 wins on two of them, and the third is mine.**
   - **Hawk left:** v130 puts the hawk at **left 24** (left 18 at 1101–1400); the brief names no left.
   - **Header gap:** the brief's "btb gap 6" is v130's gap *between the pills*. v130 also sets the header's **column-gap to 10** in that band. Both are applied.
   - **Hawk top (my deviation from v130):** v130's hawk top of **10** at 1101–1400 fails the brief's own 3px rule.
     - At 86px wide the drawing is 82.3px tall, so its centre lands 3.1px below the title's.
     - I used **top 8**, which gives 1.1px. Measured at 1280: title centre 48, hawk centre 49.1.

## The repeated agents

Changed nothing, per the brief.

- **They are seed duplicates on the same manuscript, not queries on different manuscripts.**
  - Example: Marcus Reed appears as `seed-query-3`, `cor-move-a` and `seed-pkgq-3`.
  - `seed.mjs`, `seedPackages.mjs` and `seedCorrection.mjs` all write to `MS_ID = "seed-ms-1"`.
- **The brief's examples aren't on this account.** Eleanor Whitfield and Daniel O'Rourke don't exist on the harness account; they come from the v130 mockup.

## What changed

**Drawer**
- Width is `min(1120px, 74vw)`. Measured: 947.2 at 1280, 1118.9 at 1512, 1120 at 1920.

**Rows: `220 | track | 164`**
- **Names cell:** disc, name, and agency beneath.
- **Gone from the names cell:** the status line and the due-date / "N D OVER" column.
- **Rows** are 50px tall, with 24px bars, as in v130.

**Action column**
- One pill per row, always visible. It is white, ink, 1.5px anthracite rule, 28 tall, Special Elite 12; on hover it turns anthracite.
- **Where its label and journey come from:** `nextMove` in `lib/qcComingUp.ts`.
  - When the query has a card coming up, it is the list tray's own act (`comingUp` → `trayRequest`).
  - Otherwise it is the card's primary door (`primaryDoor`).
  - So the tray and the drawer cannot offer different acts.
- **Taken out of the track:** the Nudge chip, the YOUR MOVE tags and the next-step ring.

**Date row**
- It is the rows' grid, so the dates stop where the action column begins.
- The time control sits at the corner's left edge, 18px in from the drawer.
- **⚠️ The edge markers are retired in the drawer.** In the narrower date row they sat on the month labels, and v130 draws none. The ‹ › controls and T are the ways along.

**Today**
- Today is at 40% (`TODAY_AT` 0.58 → 0.4) on open, after T, and at every preset.
- **Presets:** px/day unchanged. While today is on screen, a preset zooms about today.

**Sentences**
- **Overdue:** `<Stage> · overdue since <date>`.
- **Running:** keeps its verb, e.g. `Queried · reply by 20 Oct` (the agent wording "agent response expected by" became "reply by", as in v130).
- **Placement:** each sentence is measured and placed whole, by this rule:
  1. inside its bar if it fits;
  2. otherwise just after the bar's end (for an overdue bar, after its days-over label), if that is inside the track;
  3. otherwise omitted.
- The full sentence is always on the bar's title. There is no ellipsis anywhere in the rows.
- **⚠️ "IN 5D" is dropped when a running bar's sentence goes outside its bar.** The two would compete for the same spot.

**Torn bars**
- Their in-bar "Add date" tag is removed, since QC126-2.5 bans tags in a track.
- A torn bar now opens the card on Tracking, so the route to recording the date survives.

**End labels**
- "N DAYS OVER" sits 8px past today.
- "IN 5D" sits 8px past the bar's end, clamped inside the track.

**Group bands and footer**
- Group bands have radius 9.
- The footer reads exactly as the brief specifies.

**Header**
- **1101px and wider:** one row, 96px tall. The title is vertically centred on the hawk. Filters · Grouped · Sort with its direction toggle sit right-aligned, then the ×. Filters move to an anthracite sub-strip that spans the drawer.
- **1101–1400:** the tighter band.
- **Below 1101:** v126's two-row block.
- **⚠️ Unmeasured below ~1190px:** the single row needs about 880px of drawer, and 74vw is 814px at 1101. The locks cover 1280, 1512 and 1920 only.
- **⚠️ SUPERSEDED by v126.2.1 §1 below.** The switch now follows the drawer's own width (one row at 880px and wider), and QC126-2.8 measures 1101, 1150 and 1190 as well.

**Court name and desk foot**
- "With the agency" → "With the agent" (`qcFanModel.ts`, `QueryCardLive.tsx`).
- **Desk foot:** when a section's earliest date has passed, it reads "overdue since Fri 31 Jul". The em dash is now only for a section with no dates at all (`courtFoot`).

## Locks

Each lock was proved red in the measurement worktree; the results are in `reports/qc-v126/mutation-proofs-1262.json`. Each went green on the final build at 1280, 1512 and 1920 (ledgers `qc126-2-*.json`).

| Lock | Red by | Red reading | Green |
|---|---|---|---|
| 2.1 width | `min(780px,56vw)` | 780 vs 1118.9 | 3/3 |
| 2.2 columns | a 110px date column put back in the row | track 110 vs row − 384; date row 570–1098 vs track 570–680 | 18/18 |
| 2.3 nothing escapes | the Nudge chip back in the track at its old content x | chip 9,968px outside its track and past the drawer | 60/60 (open, earlier, later, 6W, 6M) |
| 2.4 today | `TODAY_AT` 0.6 | 0.6007 | 21/21 (0.4007–0.4008) |
| 2.5 one action | YOUR MOVE back in the track | `SPAN: YOUR MOVE` ×5 | 9/9 (69 rows, one pill each) |
| 2.6 sentences | overdue sentence fits only before the due date | bar 280px, needs 199px, sentence not inside | 12/12 |
| 2.7 court name | today's dev (natural red) | 7 × "With the agency", on the page and in the drawer | 3/3 |
| 2.8 header row | pills back on a second row | pills' centre 113 vs title's 48; tops moved 96 → 102.5 when filtered | 21/21 |

**Supplementary reading, not proved red:** 2.7's desk-foot check passed on dev as well, because dev's sections all had a future date at the time.

## Other locks touched

| Lock | Change |
|---|---|
| QC126-13 | Width retargeted to `min(1120px, 74vw)`. Title size is 26 at 1400 and under. |
| QC126-14 | Retired: v126's grows-downward header is superseded by the one-row header, whose claim 2.8 now owns. Its ledger file is removed. |
| `respondDesk.test.tsx` | The chip-handler lock is retargeted from the hard-wired nudge to `openQueryDrawer(m.request)`. "It never selects the query" is unchanged. |
| Unit tests | `qcTimeline` (40%, the new wording), `qcComingUp` (`nextMove`), `qcSummary` (desk foot). |
| `--qcv-tl-lanetop` | Deleted: its only reader (the lane controls) went in v65.2. |

## Gates

**Code gates**
- **tsc:** 0 errors.
- **`build:dev` and the production build:** no CSS warnings.
- **Vitest:** 520 files, 8,281 passed, 3 skipped. Before this change: 8,279.

**QC126 suite:** 28/28 green on the final build, including every older lock that is still standing.

**qcV96:** QC4 is still red. "Send partial 2 days over" overflows the 160px column; this is data-driven and pre-existing, not caused by this change.

## Screenshots

**This build**
- `drawer-1280.png`
- `drawer-1512.png`
- `drawer-filtered-1512.png`

**References** (`design-refs/qc-v126/`)
- `ref-v130-birdseye-1280@2x.png`
- `ref-v130-birdseye-1512@2x.png`
- `ref-v130-birdseye-filtered-1512@2x.png`

---

# v126.2.1 follow-ups

Branch `qc-v126`, one commit. Not merged.

## What changed

### 1. The header switches on the drawer's width, not the window's

- The drawer is a CSS container (`container: bvd / inline-size`).
- **Below 880px of drawer:** v126's two-row block (title and × on the first row, pills beneath).
- **880px and wider:** one row, with the tighter values for a drawer 880–1036px wide (a 1190–1400 window).
- **Two-row block, right padding 16 → 18:** the × now sits 18px from the drawer's edge in both arrangements.
- **Why:** the old window threshold put one row into an 814px drawer at a 1101 window. Measured on the old build, the title ran under the Filters pill once filters were on.

### 2. A sentence after its bar keeps its distance

- When a running bar's sentence sits after the bar, it carries its distance: "Queried · reply by 16 Oct · in 11 days".
- The bar's hover title says the same.
- The separate "IN 5D" label is drawn only when the sentence is inside the bar.

### 3. A missing date still reads as missing

- **The torn edge was not lost in the track rebuild.** It is measured painted on every torn bar: one torn start and 22 torn ends at each width.
- **New hover title:** a second line, "No date set — click to add", on every bar with a missing date.
- **New `data-missing` attribute** on every bar with a missing date, including one whose missing end is scrolled off-screen.
- **⚠️ An end that is off-screen draws no torn edge.** It can't, since that end isn't in view. The title still says the date is missing.

### 4. An overdue send reads "<Stage> N days over"

- **Change:** `comingUp` now gives "Partial 2 days over" or "Full 3 days over" (`SEND_OVER_VERB`).
- **Unchanged:**
  - a send that is not yet overdue still reads "Send partial in 5 days";
  - the tray pill still says "Log the send".

## A fixture gap, and the seeder that closes it

- **QC126-2.9 had nothing to measure on the shared account.**
  - Every dated running bar there is at least 212px wide, so its sentence always fits inside.
  - That holds at the 1101 and 1512 windows, at 6W, 3M and 6M.
- **New `tests/e2e/seedBvdShort.mjs`** seeds one short running bar:
  - an agency with a two-week window, queried three days ago;
  - ids prefixed `bvds-`;
  - `--clean` removes it.
- **The lock seeds it and removes it in the same run**, from a `finally`. Each run's log shows "seeded" and then "removed 4".

## Locks

All 1101–1280 readings are on the final build.

| Lock | Red first | Green reading |
|---|---|---|
| QC126-2.8, extended to 1101 / 1150 / 1190 / 1280 / 1512 / 1920 | old build: at 1101 the title overlapped the Filters pill; at 1101/1150 the header stayed one row; × 16px from the edge | 1101 and 1150 (drawers 814.7 and 851): two rows, pills top 63 below title bottom 49, nothing overlaps, × 18. 1190 (drawer 880.6): one row, pills' and title's centres both 48, hawk centre 49.1, × 18. Hawk top unchanged with filters on in one row; in two rows the hawk's bottom stays on the block's bottom (111/111 → 147/147). |
| QC126-2.9, out-of-bar sentences carry their distance (new) | old build plus seed: "Queried · reply by 16 Oct" with no distance | 5 out-of-bar sentences, each ending "· in 11 days", each matching its bar's title, none with an IN label |
| QC126-2.10, torn edges (new) | old build: no "No date set" title. Pixel half proved by mutation (`content: none` on the pseudo-elements): painted and pixel checks red at all three widths | edge pixel 255,255,255 over body 245,230,223, at 1280 / 1512 / 1920 |
| qcV96 QC4 | old wording: "Send partial 2 days over" truncated at 1280, flat and grouped, at rest and hovered | green at all four widths. The column is still 160px. |
| Unit: `comingUp` overdue send | red on "Send partial" | "Partial 2 days over", "Full 3 days over"; not-yet-overdue unchanged |

## Lock change

- **QC126-2.8, hawk check:** "with filters on, the hawk's top is unchanged" now applies to the one-row header only.
- In v126's two-row block the hawk stands on the block's bottom by design, so it moves with the filter line. That was QC126-14's own claim, and it is now asserted there instead.

## Gates

- **Code gates:** tsc 0 errors; Vitest 520 files, 8,282 passed; dev and production builds free of CSS warnings.
- **QC126 suite:** 30/30.
- **qcV96:** 8/8. QC4 is green for the first time.

## Screenshot

`drawer-1150.png` shows the two-row block in an 851px drawer.
