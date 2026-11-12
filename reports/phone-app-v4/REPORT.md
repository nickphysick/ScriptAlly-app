# Phone app v4 — the phone re-laid on one design system (below 768px only)

Branch `phone-app-v4`, cut from the branch dev served (`dev/…-pa3-laq131-qc154` @ `d553a9925`, bundle `index-hyqKHEqz.js`).
Refs enrolled at `design-refs/phone-app-v4/` (both SHA256 match the brief). Not merged to main. Never deployed to prod.

## False premises and corrections

1. **"Need you" / "With agents" / "Quiet" as names.** The boards use them for chips and groups; the brief rules them out.
   The app's own `COURT_LABEL` names are used everywhere (With you, With the agent, Gone quiet, Closed). The header
   *sentence* "N need you." is kept, as drawn and as the brief asks.
2. **The journey track's second node is not "partial".** The app counts the second rung as *asked for more* (a partial
   or straight to full: Analytics' `funnelStages`). Labelling it "partial" would miscount writers whose agents went
   straight to full, so the node reads "asked for more".
3. **"Nudge reminder (on, the day after)."** v3's journey (and so the record PA4-7 holds the quick log to) sets the
   reminder a week after the expected date (`addDays(exp, 7)`). The same record wins; the line shows that date.
   The default is also v3's: on, unless the agent's card says no response means no.
4. **The boards' tab-label grey (#7b7f88) is 4.0:1 on white**, under the 4.5:1 the brief requires. The muted token
   (`--pa-muted`, 5.0:1) stands in.
5. **Copy the boards carry that the code does not back** is left out: "It takes about a minute" (day one), "Most agents
   take four to twelve weeks" (early days), "There's a thank-you waiting at launch" (founding card), "That's one of
   seven done today" (straight after a task: the built line says "Next: {task}.").
6. **What's landing is by package, not by letter.** `packageMetrics` ranks packages; there is no per-letter request
   rate in the app. The shelf says "Requests from queries, by package".
7. **The founding card is for founding writers only**, but the dashboard shows its founding card to every signed-in
   writer (no gate). v4 gates on a waitlist place on file (`foundingNo`); the harness account has none, so the card does
   not render there. Nick to confirm the gate.

## §0 Recon

1. **Served branch:** `dev/qc153-…-laq13-pa3-laq131-qc154` @ `d553a9925` (`index-hyqKHEqz.js`). Phones rendered
   `phone/v3/*` (Today, Queries, the query sheet, Agents, You, search, the journeys).
   **Baseline gates:** root `tsc` 0 errors; `functions` `tsc` 0; `build:dev` clean; Vitest 3 failed / 11,948 passed
   (the three known reds: `emuGuard` ×1, `firestoreTarget` ×2).
2. **Each v3 part:**

| v3 part | v4 |
|---|---|
| `V3Chrome` | header and bar **retired** (V4Chrome: tucking bar, slim bar past 300px, navy pushed header); `V3HeaderIcon` kept |
| `TodayV3` | **retired** → `TodayV4` |
| `QueriesV3` | **retired** → `QueriesV4` + `BirdsV4` |
| `QuerySheetV3` | **retired** → `QueryPageV4` (full screen) |
| `AgentsV3` | list, sheet and switch **retired** → `AgentsV4`; the four-step add form (`AgentFormV3`) and `askTags` **kept** |
| `YouV3` | You **retired** → `YouV4`; `SettingsV3` and `LRow` **kept** (restyled by the system) |
| `JourneysV3` | + sheet and the five-step log **retired** → `QuickLogV4`; the reply journey and the flow shell **kept** |
| `SearchV3` | **retired** → `SearchV4` |
| `V3Parts` | `V3Glyph`, `statusFill` **kept**; `Spark` **retired** |
| `V3Provider`, `useV3`, `v3Store`, `V3Layer`, `lib/phoneV3.ts` | **kept** (the layer restyled; `phoneV3.ts` gained `nextActs`, nothing it returned changed) |

3. **Where each new figure comes from:**

| Figure | Source |
|---|---|
| weekly streak | `weekStreak` (lib/milestones), via `streakLine` over Analytics' `buildRows` sends and the writer's `queryingGoals` |
| journey-track counts | `funnelStages` (lib/analytics) over `buildRows` |
| next reply expected | `nextReply` (lib/phoneV4): the with-the-agent query (`v3Queries`) with the soonest `replyMs` still ahead |
| list health | `listHealth` (lib/contactHealth) over the Contact list's housekeeping model, now exported as `houseModel` from lib/dashList (a pure extraction; `houseItems` reads it) |
| founding rank and road | `useFoundingStats`, `cardTier`, `roadFill`, `nextStep`, `COMPOSE` (feedback kinds) |
| Birds-eye progress | `eyeProgress` (lib/qcBirdsEye), via `closeness`/`birdsGroups`/`closestOpen` |
| agent fit / best fit | `fitOrder` (lib/agentFit) over agents with no non-withdrawn query; words from `fitWord` |
| Discover's match count | the Scout's queue (`useScout`) while `DISCOVER_LIVE`; 0 otherwise (`useDiscoverCount`) |
| What's landing | `rankPackagesByRequests`, `strongestPackage`, `MIN_SENDS_FOR_CLAIM` (packageMetrics) |
| queries sent / asked for more / request rate | `pageCounts(respItems(…))`, `pctOf` (lib/responses) — the Responses page's own |

   **No source:** a per-letter request rate (see false premise 6); "seven done today" (no count of tasks done today
   exists — the pips count tasks done since Today opened).
4. **Phone type was in px** (`phoneV3.css`, 200 `px` values). v4's system is in `rem`. The phone's own text-size
   setting reaches `rem` on Android Chrome (it scales the default font size). **iOS Safari does not map Dynamic Type to
   the root size** unless the root uses `font: -apple-system-body`, which would also move the default from 16px to
   17px; that is not shipped (open question for Nick).

## The locks (tests/e2e/phoneAppV4.measure.ts), measured on the rendered page

Harness account on the emulator, 390 × 844 and 360 × 740, Chromium (`--project=pixel`). Ledgers in `ledger/`; each
mutation's ledger is `*.mut-<name>.json`. Every mutation turned only its own lock red.

| Lock | Green (readings / red) | Mutation → red |
|---|---|---|
| PA4-1 one button | 54 / 0 (every tab top and scrolled, Birds-eye ×3, the query page, the agent sheet, Everyone, the task list, search, the quick log ×5, the reply journey, the add form) | `twobuttons` (clone the filled button) → 12 red |
| PA4-2 sizes | 162 / 0 (text and targets on the same screens; populations asserted) | `small` (links at 40px) → 30 red |
| PA4-3 text size | 36 / 0 (every text grows ×1.25 at a 125% root, keyed one to one; nothing clips; nothing passes the right edge — four tabs and the quick log, both phones) | `pxtitle` (titles in px) → 8 red |
| PA4-4 states | 7 / 0 (everyday on real data; after, quiet and day one through the dev-only aid that empties the inputs; List health present below 100%, absent at 100%) | `taskcard` (a task card with no tasks) → 3 red |
| PA4-5 Birds-eye | 12 / 0 (the switch both ways; 3 groups of 23, 10 and 37 bars each ordered by `eyeProgress`; every bar past its date has the ring; Today's preview has 3 bars and opens the view) | `byname` → 3 red |
| PA4-6 query page | 12 / 0 (full screen with a back arrow from Today, Queries ×2, Birds-eye, Agents, search; the button is the next step) | `sheet` (the page at 92%) → 6 red |
| PA4-7 quick log | 6 / 0 (an agent set for the run to ask for 50 pages in 8 weeks: "first 50 pages" and the date 8 weeks out with no input; the stored query is v3's record; Undo removes it; the agent is put back) | `empty` → 2 red |
| PA4-8 reachable | 17 / 0 (every page v3 reached, each within three taps of a tab, walked) | `noresponses` (drop the Responses row) → 1 red |
| PA4-9 words | 56 / 0 (no "Overdue", "late", hawk-watching sentence; chips and groups never "Need you" / "With agents" / "Quiet") | `overdue` → 30 red |
| PA4-10 motion | 6 / 0 (reduced motion: nothing running on Today after a task, the Birds-eye rings, the query page, the quick log; control without it: animations run) | `motion` (the media query undone) → 4 red |
| PA4-11 desktop | 8 / 0 at 1512 (Dashboard, Queries, Agents, To-do: DOM identical; 0, 0, 7 and 0 pixels differ against the served build, under v3's measured noise floor of 5,000) | `shared` (a body rule) → 4 red (64k–129k pixels) |

First green attempts found, and fixed: the slim bar's search button at 24px (outside the `.pa4` scope); the List |
Birds-eye halves at 40px (now 48px targets with the 40px pill drawn inside); Birds-eye words cut by an ellipsis at 125%
(they wrap now); the reply and add journeys' disabled button turning grey (now navy at 45%); the add form's 11px hint
and 18px inputs.

## What retired

- `TodayV3`, `QueriesV3`, `QuerySheetV3`, `SearchV3` (deleted); from `AgentsV3`: the list page, the agent sheet and
  the "Your list | Discover" switch; from `YouV3`: the You page; from `JourneysV3`: the + sheet and the five-step log.
- `V3Header`, `V3TabBar`, `V3TabBarHost`, `Spark`, the v3 snackbar's hawk, and their CSS (header, bar, hero, Birds-eye
  rows, query sheet, agent sheet, You tiles, sheets and scrim).
- Today's Corkboard section and beta notice (Corkboard is a You row; feedback is in Settings and the founding card).
- The tab bar's numeric badge (the boards draw none, and its 11px figure would break PA4-2); the count stays in the
  Today tab's accessible name.
- `tests/e2e/phoneAppV3.measure.ts` (listed in `tests/e2e/RETIRED-phone-app-v3.md`).

## What a board shows that the app can't derive (left out)

- "There's a thank-you waiting at launch" and the boards' founding-writer fill (the road is the app's `roadFill`).
- "That's one of seven done today" — the pips count tasks done since Today opened, not today's total.
- "Most agents take four to twelve weeks"; "It takes about a minute".
- A per-letter request rate (packages are what the app compares).
- The Birds-eye earlier stages: the app stores send dates (query, partial, full), so the faded bars run from each send to
  the next; a request date between them is not drawn.

## Built through a review aid, and not shown on the harness

- **Straight after a task, a quiet day, day one**: rendered for PA4-4 and the pairs through `window.__SA_PA4_TODAY`
  (dev-only, gated at the call site, so production carries none of it), which empties the same derivations' inputs.
  The real "after" path is `PhoneTaskScreen`'s new optional `onDid`.
- **Before the first query** (Queries), **everyone queried** (Agents) and **early days** (You) need an account with no
  queries or no unqueried agents; they are smoke-tested in Vitest and have no pair.
- **Straight after logging** on the query page and **the logged screen**: both are reached by a real write; PA4-7 walks
  the logged screen and undoes it, and no pair is kept.

## Open questions for Nick

1. The founding card's gate (a waitlist place on file) — the desktop shows its card to everyone.
2. iOS Dynamic Type: honour it with `font: -apple-system-body` on the root (default text becomes 17px), or leave it.
3. "Up next"'s filled button is the workspace's own verb ("Send", "Decide", "Nudge"…), as the brief says; the board drew
   a longer label ("Record your answer").
4. The Discover row hides while `DISCOVER_LIVE` is off (count 0), so on today's builds Discover is reached from search's
   page list.

## WebKit (once, at the end)

`--project=iphone` (Playwright's iPhone 13 profile, WebKit): **screens 154 readings, Today 13, Birds-eye and the query
page 24, reachability 17 — 0 red.** The quick log (PA4-7) writes, so it runs once, in Chromium only.

Three harness facts, found by measurement, shape the WebKit run (none is an app change):
1. **The sign-in button is never "stable" to Playwright in WebKit**; the filled form is submitted with Enter instead.
2. **A resized iPhone page keeps hit-testing at its first size**, so WebKit runs at the profile's own 390 × 664 (Safari's
   visible area), signing in on a throwaway desktop-sized page in the same context.
3. **Playwright's clicks do not land on the bar in WebKit** ("`<html>` intercepts pointer events"; a forced click reaches
   nothing), while the page's own hit test (`elementFromPoint` at the tab's centre) returns the tab. So WebKit taps
   dispatch the click on the element: WebKit's rendering, layout and wiring are measured; Playwright's touch coordinates
   are not. A check on a real iPhone is worth doing before this ships.

## Dev deploy (12 Nov)

Dev had moved during the pack: it served `index-DN1T-SE6.js` from `dev/…-pa3-laq131-qc154-qc1541` (Query Centre
v154.1). A rebuild of that branch differed from the served bundle only by the build-date stamp and the chunk names that
follow from it, so v4 was merged onto it as **`dev/…-qc154-qc1541-pa4` @ `936411db3`** (pushed; the merge was clean).
On the merged tree: `tsc` 0; 109 phone, Query Centre, shell and dashboard spec files green; PA4-5/6 green (24 readings).
Built from a clean checkout of the pushed tip and deployed hosting-only with the served hash checked in the same command:
**dev now serves `index-CzLH0sbg.js`** (matches the build). Branch `phone-app-v4` @ `af05da35c` is pushed and not merged
to main. Prod is untouched.

The dev build carries the dev-only Today aid (`__SA_PA4_TODAY`), as every dev build carries the app's review aids; a
production build folds it away.
