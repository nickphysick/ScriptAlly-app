# Phone Birds-eye polish v1.1: the grow-in on every arrival, the header tidied, My queries reworked

Branch `phone-birds-eye-polish-v1-1`, cut from `origin/phone-birds-eye-polish-v1` (fbb71691f). Main had not moved. Pushed, not merged. Below 768px only.

DEPLOY

## Why the animation didn't play for Nick

1. **The once-a-day rule (the main cause).** First look v1 played the grow-in only on the day's first arrival (`localStorage["bw1.firstLook.day"]`); every later arrival that day only faded. If Nick had already opened Birds-eye that day, even for a test, Queries never showed it again until the next day.
2. **Before the nav fix (on dev until 28 Nov 11:17) it could not replay at all.** Birds-eye stayed mounted after its first visit, so coming back to Queries was not a new open and the decision never ran again. The first visit could even have used up the day while hidden behind another page.
3. **Queries opening straight into Birds-eye is an arrival like any other.** With the nav fix, a Queries page that remembers Birds-eye mounts it on arrival, and it plays (BP-9 measures the app opening straight into it).

## Gates

The baseline was recorded at fbb71691f (the same source as polish v1's final).

| Gate | Baseline | Final |
|---|---|---|
| tsc (8 GB heap) | exit 0 | exit 0 |
| `npm run build` | exit 0 (built in 1.78s) | exit 0 (built in 1.54s) |
| `npm run build:dev` | exit 0 | exit 0 |
| Vitest | Test Files 974 passed, 1 skipped (975) · Tests 13828 passed, 4 skipped (13832) | Test Files 974 passed, 1 skipped (975) · Tests 13830 passed, 4 skipped (13834): +2, BP-12's |

## Commits

| Commit | Part |
|---|---|
| 683147474 | Part 1: the grow-in plays on every arrival (and the refs) |
| 2d16ad6d0 | Part 2: the slim header, tidied |
| d21a743f6 | Part 3: My queries reworked |
| PART4 | Locks, screenshots, report; with two fixes BP-13 and BP-14 found in part 3 (the card's top margin, the bars' room) |

## 1. The grow-in on every arrival

- **When it plays:** every mount of Birds-eye is an arrival, and it plays the grow-in:
  - from another tab;
  - from Today's "Birds-eye view ›";
  - from the List/Birds-eye switch;
  - when the app opens straight into it.
- **When it doesn't replay:** a filter change, a level change, a fold, a sheet or menu closing, pull to refresh or a re-render (it is decided once per mount).
- **"From a search result":** the app-wide search opens queries in the query sheet, not Birds-eye, and Birds-eye's own search flies within the world, which is not an arrival. So there is no search door to cover.
- **The once-a-day memory is retired,** and its key is cleared on sight.
- **Unchanged:** a touch finishes it, reduced motion only fades, and the marks pop with their rows.
- **The measurements:** the specs that read the world at rest now set a DEV-ONLY switch (`sa.e2e.bw-nolook`, MODE-gated at the call site, so production has none) instead of the old key.

## 2. The header

- **The row:** hawk badge · "Birds-eye view" · filter · search · List · ⋯. The icon buttons are back at 40px, and Back is dropped (the dock leaves Birds-eye).
- **The ⋯ menu:** styled as the filter menu (230px white card, 48px rows), it holds "Replay your campaign" and "What the colours mean", each opening what it opened before. The two menus close each other.
- **At 390:** the full title fits (BP-10), and a filter chip shows its whole label, "Needs chasing ✕".

## 3. My queries

- **Space:** 20px clear above the card. The phone sheet's `.ps-card` margin outranked the card's own rule, which is why polish v1's 16px never showed. It is now 22px of margin, because the tab strip's box reaches 2px into the panel.
- **The band:**
  - "N queries sent" in Special Elite 16: every query, the same total as the four rows ("1 query sent" for one);
  - the four-stage track (the ref's `trk4`): StatusDot glyphs at 15px, joined by short ink lines. It fills to the furthest stage any query has ever reached, read from every query's history including closed ones: sent forms up to that stage, the asked forms beyond it at 40%.
- **Counts:** a fixed 32px right-aligned column.
- **Bars:** v1's 150px bar didn't fit at 390. Label 140 + bar 150 + count 32 + the gaps came to more than the card's 320px inside, and the widest row's count ran out to the right (BP-14 caught it). Each bar now takes its share of the room the row has, at most 150px, so proportions hold.
- **Taps:**
  - the card's body is a button that opens the Queries list, unfiltered. `QueriesV4` now honours `?view=list` even while it is mounted with Birds-eye remembered;
  - only "Birds-eye view ›" (its own 48px button) opens Birds-eye, with the grow-in.

## Locks, measured at 390 × 784 (`tests/e2e/phoneBirdsPolish.measure.ts`, folder `reports/phone-birds-eye-polish-v1-1`)

The green pass reads 55 readings, 0 red.

| Lock | What it holds | Deliberate breakage | Own reds |
|---|---|---|---|
| BP-9 | It plays on arrival from Today's link, again on a second arrival the same day (another tab, then the link), from the List/Birds-eye switch, and when the app opens straight into it; not on a filter change or a level change between; the old key is cleared | the once-a-day memory put back | 3 |
| BP-10 | The row ends Filter · Search · List · More, no Back, 40px buttons; "Birds-eye view" fits whole; ⋯ opens a 230px menu of two 48px rows that open the colour key and the replay; the "Needs chasing ✕" chip is whole | the title squeezed to 60px | 1 |
| BP-11 | The band reads "N queries sent", N being the four rows' sum (70) | the band's N off by one | 1 |
| BP-12 | Three seeded writers (Today smoke test): queries only → one ring; a partial → two; an offer → four. An offer on a since-closed query counts. On the harness (offers): full | the track reading only each query's current stage: red in the unit lock | 1 |
| BP-13 | The body opens the Queries list (unfiltered, no Birds-eye); the link opens Birds-eye; the link is 48px tall; 20px clear above the card | the link takes no finger | 2 |
| BP-14 | The counts' text right edges line up within 1px | the counts left-aligned | 1 |

- **First pass of the breakage runs:** 11 of 12 breakages went red on their own lock. The twelfth ("leftalign") didn't, because BP-14 measured the fixed column's box rather than the text; it now measures the text with a Range and is red first (1). That first pass also had one red of its own: the 20px clear space measured 18, fixed as above. The other locks (BP-1 to BP-8) re-ran green in the same pass, and each was red under its own breakage, as in v1.
- **BP-7 (BW-NAV-1, re-run on the final build):** 106 readings, 0 red (6 targets in each of 15 states + 15 from Today, the list and Agents + no page error); every state real (a pinch to z 5.657, a scrub with its day, a refresh, sheets and menus opened). Back's target is gone, so there are six targets a state. While re-running it I found that a level tap during an arrival's fade could miss, so the zoomed states found no bar. `levelTo` now retries until the world reports the level.

### Other specs re-run

| Spec | Result |
|---|---|
| Birds-eye world | 96 readings, 1 red: BW-6, the date-dependent ruler check, red on the base too |
| First look | 12 readings, 0 red |
| PA5 | today 26, sizes 96, words 22, all 0 red; reach 36 of 36 (two earlier runs at a load of 47–69 each failed on a different Profile entry; polish v1 passed reach in between at load 10, and v1.1's third run passed); view 2 red, pre-existing (88 phone rows, 70 desktop) |
| Phone style | green; PS1 named two more of the brief's choices: "N queries sent" in Special Elite 16 (PS1-2) and the link as a link, not a list row (PS1-5) |
| Query sheet PQS-1 and PQS-2 | 9 readings, 0 red |

## Before and after (`shots/`)

| Pair | Before (polish v1) | After |
|---|---|---|
| Header, no filter | `before-07-filter-menu.png` | `after-07-filter-menu.png` |
| Header, filter on | `before-08-filter-on.png` | `after-08-filter-on.png` |
| Today | `before-11-today.png` | `after-11-today.png` |

- **The card beside this pack's refs:** `ref-01-today-my-queries.png` and `ref-02-my-queries-card.png`, against `after-11-today.png` and `after-12-my-queries-card.png`.
- **Differences other than data:** the ref's Today around the card is a stand-in. Its "11" and "6" are not right-aligned, and the build's are, as asked.

Worktree: WT
