# Query Centre v126 — the whole page, the Birds-eye drawer, and one way to act

Branch `qc-v126` off `b6fa05ae`, worktree `/tmp/sa-qc126`, eight commits (`965ebad9` … the Phase 8
commit). **Nothing deployed** — this pack deploys nothing; Nick deploys by hand.

Measured on `build:dev` served by `vite preview` on 127.0.0.1:4413, signed in as the harness account,
at **1280×800, 1440×900, 1512×900 and 1920×1080**. Final run: **20 of 20 QC126 cases green, 307
readings, 0 failing** (`tests/e2e/qcV126.measure.ts`, ledgers in `reports/qc-v126/ledger/`). Unit gate
at the last commit: tsc 0, `build:dev` with no flagged lines, Vitest 516 files / 8,220 passed / 3
skipped.

---

## 1 · False premises

From §0 (detail in `STEP0.md`):

1. **The page ground was not `#f5f1eb`.** The shell's page was `--ws-page` = `#f7f4ee`, and the Query
   Centre painted its own ground-mode cream (`rgb(244,240,234)`). Both are now `#f3f2f0`.
2. **The top bar already painted the page colour** and already had a rule when scrolled. Phase 1 changed
   the colour and nothing else.
3. **`--ws-ground` cannot move.** `marketingTokens.test.ts` holds `--mk-hero-ground` equal to it, and
   the public pages are out of scope. The shell now paints `--ws-page`. `--ws-ground` is unchanged and
   still read by marketing.
4. **There was no "no date" urgency group.** `attentionGroup` is overdue · upcoming · watch. The drawer's
   model adds "No date" for an agent's-turn query with no promised date. A with-you query stays where
   `attentionGroup` puts it, because it is the writer's move whatever its date.
5. **The centred card already acted through `openQueryDrawer` with `dock`** (Query actions v1). What did
   not: the row tray (it opened the card) and the Birds-eye nudge chip (it opened `NudgeModal`).
   The dock chip was also passed `initials: ""`.
6. **Empty state v8.1 has not landed** ("Let's log your first query" is nowhere in `src/`). Per the
   run order it must run before this pack. This pack touches neither `QcEmpty` nor the empty-state
   CSS, so the two don't collide.

Found while building:

7. **The footer line's "INK IS TIME PAST THE DATE" contradicts the bars the same pack asks for.**
   Overdue bars keep their stage colour, and there is no ink overrun any more. The line is built
   verbatim as specified; the words want Nick's ruling.
8. **The lock list named sheets before they existed** (`qcvBand.css`, `qcvBe.css`, `qcvWorkspace.css`),
   and two selectors that name nothing: `.qcv-open-actions` (the card's doors are `.qcv-open-act`), and
   "the first bar" (its centre lies under the sticky names column). All are corrected in the lock file
   with a note at the line. See §3.
9. **`setBeNudge` already funnels into the action drawer** (`openQueryDrawer({ mode: "nudge" })`), so
   QC126-20's named mutation, "re-wire the row's Nudge to the old modal", no longer reaches a modal and
   stays green. The honest version of the fault (the tray reverted to opening the card) is red.

## 2 · §0's lists

`STEP0.md` holds them in full: the red gates (none tripped), the baselines, the colour table (§0.2),
the map of what each surface renders (§0.3), the derivations each one reads (§0.4), the deep links and
keys (§0.5), and the drawer's modes (§0.6).

## 3 · Commits, and each lock's red and green readings

| # | Commit | What |
|---|---|---|
| 0 | `965ebad9` | enrol the reference + art; QC126-1…20 written and run red on the unchanged build |
| 1 | `81410909` | the shell goes greige, app-wide (`#f3f2f0` page, `#e6e4e0` sidebar, labels .45) |
| 2 | `c2fe9dfd` | the header band (`PageHeader band`, the courier disc) |
| 3 | `48387d22` | the carousel; the desk chooses for it; the fan retires |
| 4 | `d4a9293f` | the open banner, the blush workspace, the sticky bar; the rail retires |
| 5 | `b7b37f73` | the app footer |
| 6 | `b92bc2b7` | the Birds-eye tab and half-screen drawer |
| 7 | `d41e168b` | one card to read, one drawer to act |
| 8 | (this) | measure, screenshots, this report |

**Red** — every lock against the unchanged build, before any product edit (`REDFIRST.md`).
**Mutation** — the pack's named break, applied by `scratchpad/mut126.py` (path-derived backups, a
rebuild, the named case only, then restore, verified identical).
**Green** — the final run's reading at 1512 (all four widths pass).

| Lock | Red (unchanged build) | Named mutation → reading | Green |
|---|---|---|---|
| 1 shell | page `rgb(244,240,234)`, sidebar `rgb(231,227,220)` | top bar on the sidebar colour → red | page `rgb(243,242,240)` |
| 2 no stragglers | 6 lines (`--fc-page`, `--dash-page`, …) | the old fade restored → red | 802 files swept, 0 offenders |
| 3 band | `null` × 4 | pass `plate` again → `null` × 4 | band 1167.25 wide; disc right ≥1100 col, beneath below |
| 4 rhythm | `—` | one gap to 44 → `44` at all four widths | 40 / 40 / 40 |
| 5 carousel | 0 cards | sort ascending → order and "first moved last" red | 8 cards, descending |
| 6 desk ≠ list | `cards 0 desk 13` | the desk filters the list → `12 vs 83` rows | 13 cards = desk 13; rows and bands identical |
| 7 one card | `[]` | a forked card → `[false ×8]` | `[true ×8]` |
| 8 workspace | `null` | banner painted blush → `rgb(244,224,212)` | banner transparent; hawk 14 into the workspace |
| 9 sticky | not found | the stuck toggle removed → `on:false` | bar at the scroller's top, 4 controls |
| 10 full width | rail mounted | rail mounted again → "no rail" red ⚠️ width half green (see below) | row right 1441.6 = workspace inner 1441.6 |
| 11 footer | not found | content at the window's width → `248 vs 296` | content box = desk's (296.4 / 1167.3) |
| 12 tab | no tab | anchored to the viewport at 16 → `16 / 16` | `24 / 24` |
| 13 drawer | `NaN` | no dim → dim `null` | 780 vs 780 (717 at 1280), dim `rgba(28,19,15,.28)` |
| 14 grows down | `NaN` | contents centred → title 35.5 → 17.5 | 111 → 147 (line 24); title top ±0 |
| 15 pill labels | `undefined` | label words dropped → `Urgency` | Filters → Filters (2), Grouped: Stage, Sort: Agent |
| 16 time control | `null` | control out of the corner → `null` | pill 204×34 in the 52px row, left of the dates |
| 17 bars | `over 0 run 0` | ink overrun restored → 1 ink element per bar | 34 overdue, 12 running; beacons within 1px of today |
| 18 Escape ladder | preconditions false | Escape closes the drawer under a popover → 18a red | popover → action drawer → card → drawer |
| 19 sort + group | unnamed rail groups | sort across groups → no reversal | pipeline order; within-group reversal; survives zoom |
| 20 one door | `mode:null` × 4 | (named: green — false premise 9); tray → card → `mode:null` | sent+dock; tray; carousel; Birds-eye — 0 other dialogs |

⚠️ **QC126-10's width half is not proved by its named mutation.** Mounting a rail in the second track
leaves the page spanning both, so the row still reaches the workspace's inner edge. The "no rail in
the DOM" half reddens at every width.

⚠️ **One stray in a QC126-17 mutation run:** a running bar's solid end read 5px off today at 1440,
under a different mutation. It did not recur in the final run, which reads within 2px at every width.
I'm recording it as a possible mid-scroll reading, not a fault.

**Corrections to the locks** (each a subject-not-found, made with a note at the line):

- the probe names `bvd-*` (the rail owned `be-*`);
- unbounded clicks capped at 4s;
- QC126-7's list of today's card files completed;
- the page guide excluded from "other dialogs";
- QC126-3/8 measure the disc/hawk only where the layout shows them: the band below a 1100 column,
  the banner below a 1100 viewport, which is the reference's own media query;
- QC126-20/18b click `.qcv-open-act`;
- 18b opens the card from the names cell rather than a long bar's off-screen centre;
- QC126-2's allow-list carries the sheets as built.

## 4 · What retired, by name

| Retired | Phase | Note |
|---|---|---|
| `QcFan.tsx`, `qcFan.css`, `lib/qcFan.ts`, `lib/qcFan.test.ts` | 3 | the carousel replaces the fan; `fanCardModel` stays (the carousel reads it) |
| `handOf`, `tileHand`, `FanHand` (qcSummary) + the hand-order case | 3 | |
| the desk filtering the list, and moving the rail's focus | 3 | the desk chooses for the carousel only |
| `QcRail.tsx`, `qcRail.test.tsx` | 4 | `readWindow` moved to `qcWindow.ts`; `QcBirdsEye` and `qcvRail.css` STAY (the empty state's exhibition draws them) |
| the one-line list head on the live page | 4 | `QcSentence`'s `head` variant stays for the exhibition |
| `QcExpanded.tsx`, `QcCalControls.tsx`, `qcvExpanded.css`, `qcExpanded.test.tsx`, `expandedBox` + cases | 6 | the drawer replaces the expanded card; `QcTimeline` keeps its engine |
| the ink overrun on overdue bars | 6 | |
| tray → card; Birds-eye chip → `NudgeModal` | 6–7 | both now open the one drawer |

**Not removed, listed as the pack asks:**

- The desk-verb, quick-popover and record-journey fallbacks behind `!DRAWER_LIVE` in `Queries.tsx`
  are unreachable, because every journey is live. They should go in a sweep.
- The card's Snooze stays a popover. It is not a change to the query's record.

**Measurement suites this pack retires** (`tests/e2e/RETIRED-query-centre-v126.md`). They were run
against the v126 build first, with no stale-bundle refusals: 49 red, 14 green, and every red names a
deleted subject.

- **Deleted:** `qcFan.measure.ts`, `qcV65.measure.ts`, `qcV95.measure.ts` (v96 carries its standing
  cases), and the rail-header fixture.
- **Cut from `qcV96.measure.ts`:** QC2, QC3, QC5, QC9, QC10 and QC11.
- **Kept:** QC1, QC4, QC6, QC8, QC12 and QC13. The floor now expects those.
- **QC5 is SUBJECT LIVE, uncovered.** The folds still fire on the row's own width, but with the rail
  gone the row at 1460 keeps Queried, so the viewport-keyed claim reads red on a correct page. It
  wants re-keying to the 751 / 663 container widths.
- **Uncovered:** the entrance and reduced-motion claims from `qcV65`, which no v126 lock re-states.

## 5 · What the reference asks for that the app doesn't derive

- **The tab's mini bars and its "N waiting" count.** The tab states overdue and upcoming, from the
  urgency derivation. The reference's three bars are sample decoration, with no figure behind them.
- **The carousel's footer sentence** reads the app's `standLine` (e.g. "WAITING ON ELINOR"), not the
  reference's "Response expected by …" sample copy (baked decision 14).
- **The desk's numbers and facts** are the app's (`courtTiles`); the reference's "seventeen past the
  date you expected" is sample copy.
- **The Stage filter gains "Revise & resubmit" only while one is live.** The pack names four stages,
  and an R&R would otherwise be unfilterable.

## 6 · Screenshots (1512 × 900 @2×)

`01-top` · `02-list` · `03-footer` · `04-birdseye` · `05-birdseye-filtered` · `06-birdseye-group` ·
`07-birdseye-sort` · `08-card` · `09-action-drawer` — all `@2x.png`, in this folder, each beside the
pack's `ref-0N-…@2x.png` of the same state. Made by `tests/e2e/qc126Shots.measure.ts`, which is a
picture, not a lock.

## 7 · Waiting on Nick

- **The courier disc art.** Its ground shadow sits partly outside the circle (visible in `01-top` at
  the disc's foot). Does it need re-exporting with the shadow inside?
- **The uncut Birds-eye hawk head.** The drawer header's head is masked at both sides
  (`linear-gradient(90deg, transparent 0, #000 22%, #000 78%, transparent 100%)`), with a comment at
  the value. The mask comes off when the uncut file arrives.
- **The footer line's "ink is time past the date"** (false premise 7).
- **A real overflow, not caused by this pack: `qcV96` QC4 is red.** "Send partial 2 days over"
  truncates in the 160px Coming-up column at all four widths. v126 changed neither the verb
  (`lib/qcComingUp.ts` only gained `trayRequest`) nor the row's grid. The "N days over" figure appears
  once a send-by date passes, and a fixture date drifted past it. The lock stays red because the
  overflow is on the page. The fix is the column or the wording, and that is your call.
- **Follow-ups outside this pack:** `livingHeadersV3.measure.ts` and `pageHeaderV2.measure.ts` still
  read the Query Centre's retired rail (`.qcv-rail` / `[data-qcv="rail"]`), and the dead `!DRAWER_LIVE`
  fallbacks need a sweep.
