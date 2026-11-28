# Phone Birds-eye polish v1: a slim header, marks on the bars, thicker bars, the grow-in and My queries

Branch `phone-birds-eye-polish-v1`, cut from `origin/phone-birds-eye-nav-fix-v1` (at 839fe3a61; `phone-query-sheet-v1-1` does not exist). Main had not moved. Pushed, not merged. Below 768px only.

## The nav fix, landed first

- **What it is:** `phone-birds-eye-nav-fix-v1` was cut from `origin/phone-birds-eye-first-look-v1`, because that is what dev served. It is one commit, e87a1cc85, with a report commit, 839fe3a61.
- **The cause:** the Queries page's slot stays mounted when the writer leaves it (`StagePage` only toggles visibility). The page's phone view kept its remembered Birds-eye side mounted, and Birds-eye draws its full-screen layer straight into `document.body`, outside the hidden page. So it sat over Today, To do, Materials and Profile and took their taps.
- **The fix:** the Queries page passes its route state (`<QueriesV4 active={routeActive} />`), and Birds-eye mounts only while Queries is on screen.
- **Lock BW-NAV-1:**
  - red first on the unfixed code (58 of 100);
  - PA5-2 (reach) went from 28 red of 36 to 0;
  - green, 100 of 100.
- **Dev:** `dev/bew33-clr13-qc1722-pqs1-qc1723-bfl1-nav1` (ee23a2732), on top of the first look build (`index-CTspvepm.js`), served **`index-C8iGokPv.js`**.
- **A correction:** while extending the lock for BP-7 here, I found that three of its states never really happened. Pinch, scrub and pull to refresh were driven with the mouse, which a touch-emulated phone's world ignores. The nav fix's report counts them as covered. They are now real touches, and the lock fails any reading whose state didn't happen (see BP-7).

## False premises

1. **"The unrun first look v1 prompt."** It was run and on dev. Its grow-in came with the base and was checked here, not rebuilt. Its three-week preview, not BirdsBlockV5, is what My queries replaces; BirdsBlockV5 was already gone.
2. **"Its full-manuscript icon."** The app has none. `lib/materialIcon.ts` leaves Full manuscript out on purpose. The full-request mark is the ref's own pages mark.
3. **"The Birds-eye dock icon."** The real dock (Today, To do, +, Materials, Profile) has no Birds-eye tab. My queries' foot uses the ref's Birds-eye icon.
4. **"Four 40px icon buttons" in a header without back or List.**
   - **Why both stay:** the ref drops back and List because its stand-in dock has Queries and Birds-eye tabs. In the app, List is the only way from Birds-eye to the Queries list. The view is remembered, so without it "See all queries" would reopen Birds-eye.
   - **The cost:** the icon buttons keep v1's 36px, and the title shortens to "Birds-eye…". While a filter is on, its chip shortens its words ("Needs c… ✕") but never its ✕.
5. **The ref's marks don't pop with the grow-in** (its `grow2` animates only the "!"). The brief has them pop as each row's wipe reaches them, and they do.
6. **The ref's My queries draws a 4px bar for a 0 count.** The brief says a 0 row has no bar, and the build follows the brief.
7. **Two values the phone style rules forbid,** set by the brief, so the rules get named exemptions:
   - My queries' counts in Special Elite at 16px (PS1-2 wants 20 or more);
   - the card as one full-width button (PS1-10 had read it as a loose row).

## Recon

| Item | Where |
|---|---|
| Header | `BirdsWorld`'s `.bw-hd`, which already had a one-row "folded" state when zoomed (`col`) |
| Pill row | `.bw-chips` |
| World's first render | `build(false)`, fitted; the top came from `topFor` (140 fitted, 96 zoomed) |
| In-bar drawing | `drawWorld`'s `inRow`/`ndRow` |
| The "!"'s name rule | one obstacle (`ovX`) |
| Bar thickness | `barBox` in `lib/birdsWorld.ts` |
| Material icons | `MATERIAL_ICON_INNER` (`components/shared/MaterialIcon.tsx`) |
| Thumbs-down | none in the app's own art; `lucide-react` (the app's icon set, 55 files) has `ThumbsDown` |
| Once-a-day memory | `localStorage["bw1.firstLook.day"]`, from first look |

## Gates

| Gate | Baseline (before any edit) | Final |
|---|---|---|
| tsc (8 GB heap) | exit 0 | exit 0 |
| `npm run build` | exit 0 (built in 3.70s) | exit 0 (built in 1.72s) |
| `npm run build:dev` | exit 0 | exit 0 |
| Vitest | Test Files 975 passed, 1 skipped (976) · Tests 13831 passed, 4 skipped (13835) | Test Files 974 passed, 1 skipped (975) · Tests 13828 passed, 4 skipped (13832); 0 failed. One file fewer: `lib/birdsPreview.test.ts` (7 tests) went with the preview. Added: marks (3), the marks' pop (1), My queries (2 replacing 3 preview smokes) |

## Commits

| Commit | Phase |
|---|---|
| 67d06c1ae | Phase 1: refs, slim header, thicker bars |
| 1fedc34c3 | Phase 2: marks on the bars |
| 528169c5e | Phase 3: the grow-in checked against the polish ref; the marks pop in with it |
| 8bbdf3563 | Phase 4: My queries on Today |
| PHASE5 | Phase 5: locks, screenshots |

## What was built

### B. The slim header

- **The row:** one row, 96px, at every level, and the world starts 96 down when fitted too. The pill row is gone.
- **The filter:** the button (three lines, longest on top) opens the ref's 230px menu under the header:
  - four 48px rows with their counts in Special Elite (muted) and a navy tick on the current one;
  - `aria-expanded` follows, and the button is lit while open;
  - haptic 8ms on opening and on a pick.
- **The counts** are the old pills' (`bwCounts`).
- **A pick** filters, stays fitted and closes. A tap on the veil closes without changing anything.
- **While filtered:** the chip in the title's place, with ✕ to clear, and the pink dot (#e8b9a6, navy ring) on the filter button.

### C. Marks on the bars

- **What gets a mark:** each partial request (the app's sample-pages icon), full request (the ref's pages mark, since the app has none) and pass (Lucide's thumbs-down).
- **How it's drawn:** a white disc centred on the bar at the event's date, navy for materials and grey for a pass. Its ring and soft shadow are an outline and a drop-shadow, because the phone census allows only the shadow tokens.
- **Sizes:** named rows max(16, min(20, bar + 2)); fitted max(11, min(14, bar + 3)), with a heavier stroke.
- **Stacking:** above the bar, below the "!". None during the replay.
- **Names:** they give way to every obstacle on the bar (the "!" and each mark). A name stops before the first; with no room, it sits just after it and stops before the next.

### D. Thicker bars

- **Fitted:** 0.66 of the row, 4–16px (was 0.45, 3–12), every row kind, no-date included.
- **Zoomed in:** unchanged.

### A. The grow-in (from first look)

- **Checked:** against the polish ref's 01–06, and the first look's grow-in locks re-run on this branch (green).
- **One change:** the marks now pop with their rows.

### E. My queries

- **What it replaces:** the three-week preview on Today. `BirdsPreview` and `lib/birdsPreview` are retired, along with first look's `?fly=` address parameter, whose only door was that preview. Nothing else mounted the preview. BirdsBlockV5 was already gone (first look), and nothing else had mounted it either.
- **The counts** are Birds-eye's own groups, from the same rows.
- **Inline, off the census scale:** the 12px frame radius, the sand band and the bars' colours.

### Existing faults fixed on the way

- **The "!" under 12px:** at a 16px disc its glyph was 11.52px. It is now never under 12px (BP-8).
- **BW-14 looked for the hawk image only:** it took its test point from the hawk shadow's wrapper but required the image there. With the 96 top the point landed on the wrapper. It now accepts the wrapper, which paints the hawk layer at z 8.

## Locks (`tests/e2e/phoneBirdsPolish.measure.ts`), measured at 390 × 784

The green pass reads 37 readings, 0 red.

| Lock | What it holds | Deliberate breakage | Own reds |
|---|---|---|---|
| BP-1 | The header is one 96px row at All, Months and Weeks; the world's top is 124 at all three; no pill row | the header 140 high | 3 |
| BP-2 | The menu's counts equal the old pills' (from the world's rows); it is 230 wide with four 48px rows, All ticked; a pick filters, stays fitted and closes; outside closes it unchanged; the dot and the chip show while filtered; ✕ clears | no dot | 1 |
| BP-3 | At All, Months and Weeks: every mark centred on its bar at its event's date (42, 4 and 4 checked), every partial, full and pass on screen marked, colours right, above the bar and below the "!"; no name's box on a mark's box (22 and 16 names) | marks 12px off their date | 5 |
| BP-4 | Fitted bars are 0.66 of their row, 4–16px (183 open bars, 6 no-date) | bars 3px | 2 (2 more in BP-3: their centres move) |
| BP-5 | The first open plays, then only fades; within a row each piece waits for the one to its left; every mark pops with its row; a touch at 300ms finishes within one frame; reduced motion only fades | each grow 120ms longer | 1 |
| BP-6 | My queries' four rows in Birds-eye's order count exactly its groups; bars in proportion (150 max), none at 0; striped pink, navy, navy, grey; a tap opens Birds-eye | all bars red | 1 |
| BP-7 | BW-NAV-1 extended (`phoneBirdsNav.measure.ts`), see below | the nav fix undone | 73 of 121 |
| BP-8 | No text under 12px in Birds-eye (with its menu open, and at Weeks among names and marks) or in My queries; never "overdue" or "late"; no page error | My queries' foot at 10px | 1 |

### BP-7

**From Birds-eye**, after each of these:

- opening, the grow-in, and a touch mid-animation;
- pinch, pan and scrub;
- the query sheet, the long-press menu, search, the key, the level chip and the filter menu, each opened and closed;
- a filter picked;
- opening from Today's My queries;
- pull to refresh.

…every dock tab, +, back and List reaches its destination. **Then the same** from Today, the Queries list and Agents after Birds-eye was opened: 121 readings.

- **Each state must really happen.** The lock fails if a sheet didn't open, a pinch didn't zoom (it reaches z 5.657), a scrub has no day, or a pull didn't refresh.
- **Real touches:** pinch, pan, scrub and pull use CDP touch events, retried until they register.
- **Results:** green, 121 of 121; with the nav fix undone, 73 red.

### Other specs this touches

| Spec | Result |
|---|---|
| Birds-eye world | 96 readings, 1 red: BW-6, pre-existing and date-dependent, red on the base too; BW-14 fixed as above |
| First look (trimmed) | green, 14 readings; its "tiny" breakage now Birds-eye's ruler at 10px, red first (1) |
| PA5 | today 26, reach 36, sizes 96, words 22, all 0 red; view 2 red, pre-existing (88 phone rows, 70 desktop: the 18 closed), red on the base too |
| Phone style | all four green after the two named exemptions |
| Query sheet PQS-1 and PQS-2 | 9 readings, 0 red |

**Retired:** first look's BFL-6 and BFL-7 (the preview's order and its row's fly), and the pills in Birds-eye world's spec. That spec's `pill()` now picks from the menu, and picking the filter that is on shows All, as a second tap on a pill did.

## Shots (`shots/index.html`, 12 pairs)

Differences other than data (the harness has 88 rows, the ref 20):

- **The header row** carries back and List; the title reads "Birds-eye…", and the hawk badge's count waits for the grow-in (01–06).
- **The grow-in:**
  - rows start closer together (first look's fit for a long list);
  - the marks pop as their rows reach them, where the ref shows them at once;
  - the counts tick, where the ref shows the final numbers.
- **07 and 08:** the menu matches the ref. With a filter on, the chip is shortened ("Needs c… ✕").
- **09 and 10:** panned to rows that have marks.
- **11 and 12:**
  - the card sits in the real Today page;
  - the counts are Special Elite;
  - the bars follow the harness's counts (Needs action 61 sets the scale);
  - a 0 row has no bar.

## For Nick's ruling

1. **Should each My queries row open Birds-eye already filtered to that group?** As built, the whole card opens Birds-eye on All.
2. **Back and List in the slim header.** Kept, so the title shortens and buttons stay 36px. Alternatives: drop back (the dock leaves Birds-eye), or move List elsewhere.
3. **The full-request mark:** the app has no full-manuscript icon, so it uses the ref's pages mark. Make an app icon?
