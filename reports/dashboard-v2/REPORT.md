# Dashboard v2 — report

Ref: `design-refs/dashboard-v2/` (13 files, every SHA256 matched the brief). Branch `dashboard-v2`, cut from the branch dev
served (`dev/…-wlc1-ht1-qc151` at `af1e3bfb`, `index-BxUVq9ZZ.js`). Not merged to main.

## False premises

1. **"The week's breakdown has four buckets."** The app's week replay (`weekMix`) knows eight live stages. Four rows can
   only sum to the total if the other stages are folded in, and the fold already existed: v116's `weekCallout`
   (Partial requested + Partial sent → **Partial out**; Full requested, Full sent, R&R, Resubmitted, Offer → **Full out**;
   anything unplaceable → **Stage not dated**). Part C reuses it. **No bucket was dropped**, but "Partial out" includes a
   partial that was asked for and not yet sent, and "Full out" includes R&R and offers.
2. **The brief's F1 mutation (`position: absolute`) is a no-op here.** The hawk is portalled to `<body>`, and this app's
   document never scrolls (each page scrolls inside `.ws-wbody`), so absolute-in-body draws exactly where fixed does. It
   stayed green. The fault worth guarding is the hawk mounted inside the page; that is F1's mutation now, and it goes red.
3. **The mock's column widths assume a 68px rail.** The app's expanded sidebar is 248px. With the brief's 400px feed
   column, the middle column is ~390px at 1512 where the mock's is ~550. Everything fits, but two things needed their own
   rules: the road's note counts hide under 470px of road (not only at ≤1320px), and the tile labels wrap.
4. **"5 of 11 · See all".** The card shows the top task and two more, so the band reads "{shown} of {n}", shown at most
   3. The mock's "5 of 11" doesn't match its own three rows.
5. **The road's thresholds.** The mock's 3 / 8 / 15 / 25 / 40 are sample data. The road reads the server's `TIERS`:
   Fledgling 1, Archivist 3, Scout 8, Mentor 15, QueryHawk 25.
6. **"Your notes" record.** It exists (`betaFeedback`, with `status`, `title` and `statusAt` set by hand; v77's rules let a
   writer read their own), but no client had ever read it. Part D adds the reader.
7. **"B1: each of the five cards".** Before the first query there is no Next up, Agents or Closed card, so B1 is measured
   on the querying page.

## Base

`af1e3bfb` (`dev/…-ht1-qc151`) carries dashboard feed v1, first visit v1 and v2, and the help system v1. Feed v1's
component (`F1Feed`) and its switch are reused, not rebuilt.

## Step 0

| Question | Answer |
|---|---|
| Next up | `Dash71Task`'s plan (`dashList`) and sentence (`taskCardModel`); v2 draws its own card over them (`v2/Dash2Next.tsx`) |
| Agents on file | `AgentsHoop` (`v60/Dash60Left.tsx`), unchanged, dressed by class |
| Closed queries | `ClosedHoop` (same file), unchanged; hover piles and filtered links kept |
| Chart and weekly series | `OneScreenChart` (retired from this page); the series is the ledger's (`dailyLedger` → weekly roll-up) |
| Weekly breakdown | `weekMix` (`lib/dashWeekMix`) folded by `weekCallout` (`lib/dashHover`). See false premise 1 |
| Founding card | `Dash105Founding` + `useFoundingStats` + `foundingCard` copy + v105 art; v2 draws its own card over the same data |
| FeedbackDock | `shell/FeedbackDock.tsx`, opened by `openFeedback()` with `setFeedbackDraft({ kind })` |
| Feed | `f1/F1Feed.tsx` |
| Rank thresholds | `TIERS` in `lib/foundingStats.ts` (held equal to `functions/src/foundingContributions.ts`) |
| "Your notes" | `betaFeedback` docs where `uid == me`; outcome from `status` (read · planned · built · fixed; absent = sent) |
| Art | `public/images/dash/mentor-leaning.png` and `mentor-leaning-looking.png` exist; loaded directly by path |

The three tiles: **waiting on you** = `tileCourt(status) === "you"` (the Query Centre's; offers included); **have replied**
= the Responses page's groups (`respItems` → asked for more + passed) over sent queries; **weeks querying** = the old
greeting's ISO-week count, as a number. **"+{n} this week"** = queries sent since Monday (hidden at 0).

## Commits (on `dashboard-v2`)

| Part | Commit | |
|---|---|---|
| B | `41ded446` | the framed card and Next up |
| C | `4a8ee91b` | Active queries |
| D | `1ec368a8` | the founding writer card |
| F | `9e4e3750` | the hawk in the corner |
| A | `5f65b89d` | the navy band, the grid, the wiring; refs enrolled; unit suites re-pointed |
| E | `a19bad39` | the feed as tall as the grid row |
| G | `bd54b1ff` | words, and CLAUDE.md |
| A fix | `fa503e70` | the page rules aimed at the real element (see below) |
| H | this commit | locks and this report |

**Order:** leaf components first (B, C, D, F), then A (which mounts them), so every commit builds and every gate ran on
exactly the tree committed. **A's message has a false claim**, corrected in E's: F1Book does not feed the phone; its only
importer is its own test.

**A fix (found by screenshot, then measured):** Part A's sheet styled `.d2-page`, a class nothing renders (the element is
v58's `.d58-page`). The band sat flush with the sheet's top, under the shell's 12px sticky lip, its corners clipped. A1 now
measures the band 28px under the sheet's top; on the old padding it reads 6.0px and goes red.

## What was removed

From the desktop dashboard (nothing deleted; each component keeps its own suite):

| Removed | Code |
|---|---|
| Manuscript card and its goal sheet (`F1Book`) | kept; imported only by its test |
| Top tip (`F1Tip`), Scout card (`F1Scout`) | kept; imported only by `f1Right.test` |
| Footer (`F1Footer`) | kept; imported only by its test |
| Active/Closed switch card (`F1Queries`) | kept; imported only by its test |
| The v71 task card (`Dash71Task`) | kept; still the phone's (`DashPhone`) |
| v105 founding card (`Dash105Founding`) | kept, **no importer left**. Delete or keep: your call |
| The old chart (`OneScreenChart`) | kept; tests and the import cards use it; v2 reads only `activeTitle` from it |
| v59 hawk-shadow layer | no longer rendered (the `DASH_SHADOW` constant stays exported) |
| Floating feed tab or drawer | none existed on this base |

The status label (`bookLabel`) is no longer drawn anywhere on the dashboard. The function and its words stay (FV2-A).

## Strings changed

| File | Before | After |
|---|---|---|
| `src/lib/dashFirstVisit.ts` `FINISH.note` | Your weekly goal and streak go here instead. | Next up shows what to do from here. |

The tour, page guides and Help Centre articles name nothing this pack moved.

## Locks (DB2): every one green at both sizes, every one red under its mutation

`tests/e2e/dashV2.measure.ts`, on the emulator (`npm run e2e:emu`), at 1512 × 982 and 1280 × 800. 112 readings across 12
ledgers (`reports/dashboard-v2/ledger/`). Mutations: `DB2_MUTATE=<lock>`, proofs in `mutation-proofs.jsonl`.

| Lock | Green at 1512 / 1280 | Red under its mutation |
|---|---|---|
| A1 band | spans the grid (1192 = 1192; 960 = 960); lines "The Smoke Test", "by harness"; 28.0px under the sheet | by-line above → lines reversed; 6px padding → 6.0px |
| A2 grid | right 400.0 / 340.0; left Next up, Agents, Closed; middle Active, Founding | swap → right 378.7 |
| A3 removed | none of Top tip, Scout, goal sheet, footer, feed tab, shadow layer | Top tip injected → found |
| B1 frame | 5 cards; rim 7, inner 1px rgb(227,213,201); bands as the table | rim 0 → red on all five |
| C1 chart | fill 658.0–1040.0 = inner 658.0–1040.0; 569.4–868.4 vs 569.4–868.0; no pins, no hawk | inset → 671.3 vs 659.3 |
| C2 weeks | 12 / 9 circles, each equal to the ledger read from the same docs; the last navy | shifted a week → mismatch |
| C3 hover | hover and focus: "12 Oct / 40 / no change"; rows sum; dashed line 927.4 vs 927.7; leaving hides both | previous week's date → red, hover and focus |
| D1 founding | stats aid (Archivist, 6 notes) → "Archivist", "6 of 8 notes", No. 23, "now" on Archivist; Like opens the dock with "Something I liked" | hard-coded Egg → red |
| E1 feed | bottoms 1501.1 = 1501.1 (1736.1 = 1736.1); switch populations non-zero; Agents only "in", You only "out"; with 4× entries the box stays 1221.9 and the list scrolls | sticky full height → 1233.2 vs 1473.1 |
| F1 hawk | right 4px in, bottom = viewport, 225 tall, before and after 600px of scroll; looking image opacity 1 at 350ms; absent at 390 | mounted in the page → bottom 474.75 after scroll |

**Two mutations stayed green on their first run and were corrected, not waved through:** C3's mutation indexed the hidden
weeks (my fault; fixed, then red), and F1's is false premise 2. **E1's "scrolls inside itself"** first passed nothing: at
1512 the account's whole history fits the column. It is now a stress check (entries ×4: the box must not grow).

Unit half: `src/components/dashboard/v2/dash2.test.tsx` (12 cases): the band's lines, the weeks against the ledger, every
week's rows summing to its total (the fixture enters all three stage groups), the change wording, the five labels, the
notes mapping, Next up's reason.

## L1: earlier suites

**Unit (Vitest), re-pointed in Part A** (each line marked `RE-POINTED (Dashboard v2)`): `f1Book` (band before grid),
`f1Queries` (v2 column order; the agents hoop's own probe, where the old slot attribute made an absence check vacuous),
`fv1/dashFirstVisit.test` (four cases), `fv2PartA` (four), `fv2PartE` (one), `fv2PartH` (one), `dashboardPageSmoke`
(five assertions). Suite: 11,094 passed, the base's own 2 `firestoreTarget` reds and nothing else.

**e2e:**
- `dashFirstVisit.measure.ts` (first visit v1): **re-pointed, now green** (A1, A2, A3, A8 to v2's probes; C1 to Next up's
  count; C2 retired, no pager). `tests/e2e/RETIRED-dashboard-v2.md`.
- `dashFirstVisitV2.measure.ts` (first visit v2): 8 of 9 red on my branch, and **the same 8 plus E1 are red on an
  untouched build of the base**, run the same day on the same emulator. They time out waiting for fixture states (a
  resume draft, the reminder ask, the finish line). E1 is green on mine. **No worse than baseline.** Once they run, three
  of them read things v2 removed (A1's manuscript-card placement, A2's label, H1's goal sheet coming back) and will need
  re-pointing.
- `helpSystemV1.measure.ts`: 12 of 16 red on both, identically. They wait on `data-cl19` selectors and a sidebar label
  from older Contact list and shell versions.
- **Dashboard mobile v1** was not run: `DashPhone` is untouched, and the hawk's absence at 390 is held by F1.

## Shots

`reports/dashboard-v2/shots/`, beside each reference:

| Reference | Ours |
|---|---|
| `screens/01-dashboard-{1512,1280}@2x.png` | `01-dashboard-{1512,1280}.png` |
| `screens/02-dashboard-full-*` | `02-dashboard-full-*` (a 1900px-tall viewport: the document itself never scrolls) |
| `screens/03-week-hover-*` | `03-week-hover-*` |
| `screens/04-hawk-hover-*` | `04-hawk-hover-*` |
| `screens/05-feed-agents-*` | `05-feed-agents-*` |
| `screens/06-scrolled-*` | `06-scrolled-*` |

## Open for Nick

- `Dash105Founding` has no importer left. Delete it, or keep it for the phone?
- The v105 card's first-tier celebration (`foundingSeenTier`) is not carried into the v2 card; nothing celebrates a new
  rank on the desktop now.
- Before the first query the band has no buttons (first visit v1's rule, kept). The brief draws them always.
- "Have replied" counts asked-for-more and passed over every sent query. Say if you meant answered over closed (the
  Responses page's reply rate).

## Integration and dev

See the integration section appended at deploy.
