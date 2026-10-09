# Dashboard v58 — report

Branch `dashboard-v58`, cut from `origin/main` at `55eff29a`. Not merged. Deployed to dev from the branch.

## 1. False premises (read these first)

1. **`TaskModal` does not exist.** It was deleted in Query actions v1.1 (28 Sep). The one writing surface is the query drawer (`openQueryDrawer`), and it is what the old to-do tick already opened. Every action on the page opens that drawer, the agent card, or a route. Nothing on the page writes a status.
2. **Shell v2 (oat, flap, header sheet) has not landed on main.** It is four commits on branch `shell-v2`. The Dashboard's ground today is `#f3f2f0`, from `--ws-page` → `--ink-sheet` on `.ws-window`. The page paints no ground of its own and still reads that token, so it turns oat the day shell v2 merges. The feed drawer's wash is the pack's literal oat, `rgba(242,238,232,.55)`.
3. **There is no `useStageLock`.** The one-screen lock was removed on 17 Sep and the page flowed. This pack puts a one-screen frame back, sized from the page's own scrollport.
4. **The Birds-eye drawer has no focus trap**, and it does not return focus. Neither does the shared `HalfDrawer`. The feed drawer uses `useOverlay` instead (the hook the agent card and the shortcuts sheet use): focus trap, Escape, focus return, and the page behind made inert.
5. **"Coming up" had no list derivation.** Only the per-query clock exists (`expectedFor`, carried on `buildQcRows` as `expectedMs`). The group is that clock, filtered to today or later and sorted. No new date rule was written.
6. **"Coming up can only be empty when there are no live queries" is not true.** A live query whose agency states no reply window has no expected date. With nothing in groups 1–5 and no dated query, the column shows one plain line and the two buttons. It is never blank.
7. **"The closed card's height is unchanged across 1512×900 → 1280×680" cannot hold, and the reference's does not either** (227px at 1512, 235px at 1280): the ring is `15vh`, and the tiles go two by two below 1440 wide and back to four below 780 tall. F3 measures what the rule means instead: at each size the card is exactly the height its content takes when the column has room to spare, and the chart is what changes.
8. **"Agents are waiting" is wider than partial, full and R&R.** The existing category (`taskCategory` → `req`) also holds offers (`offer_received`, `offer_tell`, `offer_send_full`). They stay in the group; an offer reads "{agent} has made an offer" with the action "Offer: next steps".
9. **"Gone quiet" is wider than "already nudged".** The existing category also holds never-nudged queries the close rule raises (no-response-means-no agencies, and the close ceiling). Their sentence says "The reply window has passed with no reply", not that a nudge was sent.
10. **`?status=closed` on the Query Centre includes Withdrawn and Signed.** The card's count and the Query Centre's Closed court both exclude them, so "See all →" can list more rows than the card counts. The matching filter (`court:closed`) has no URL form. I did not touch the Query Centre. This needs your ruling.
11. **The feed could not tell an agent's event from the writer's, did not know a request had been met, and had a fixed 30-day window.** All three were added to `feedEntries`, additively.
12. **The Housekeeping drawer cannot be opened from another page** (its open state is local to the Contact list). "Fill in" opens the agent card's editor at the gap, stepping through the agents that share it.
13. **The reference's housekeeping rows render in rust mono capitals.** That is a class collision inside the mockup (`.hk` is both the header eyebrow and the housekeeping row). Built to the pack's prose instead: serif 15.5px.
14. **The author byline is italic Source Serif 4, and the app loads no italic of that face.** The browser slants the roman. If you want the true italic, `index.html` needs the `ital` axis added.

## 2. §0 recon

### 2.1 The Dashboard before this pack

`/dashboard` renders `Dashboard` (`src/components/Dashboard.tsx`), which mounted `OneScreenDashboard`.

| Component | Fate |
|---|---|
| `OneScreenDashboard` (page root, cover, tour, peek) | **Retired.** Replaced by `v58/Dash58`. |
| `OneScreenHeader` (greeting and counts line) | **Retired.** Replaced by `v58/Dash58Header`. |
| `OneScreenActions` (quick-action card) | **Retired.** The three actions are the header's buttons. |
| `OneScreenChart`, `OneScreenMinimap`, `OneScreenChartEmpty`, `DashPopup`, `OneScreenPanel` | **Kept as they are.** Only the band's padding and title size are re-set, in `dash58.css`. |
| `OneScreenClosed` (donut and tally key) | **Retired.** Replaced by `v58/Dash58Closed`. The counts are still `closedTile`'s. |
| `OneScreenFeed` (feed card) | **Retired.** The feed is `v58/Dash58Feed`, a drawer. |
| `OneScreenTasks`, `TodoRowCard`, `TodoRowEditor`, `DashTaskCommit`, `DashSnooze` | **Retired.** Replaced by `v58/Dash58List`. |
| `OneScreenSkeleton`, `lib/skeletonTiming` (the loading cover) | **Retired.** Each part is its own loaded box now. |
| `OneScreenTour` | **Retired.** Its six steps pointed at the old cards. See open items. |
| `QueryCardLive` (the peek on a feed row) | **Retired** with the feed card. The shared `QueryCard` is untouched. |

### 2.2 The shell

Ink shell v1 is on main; shell v2 is not (false premise 2). The Dashboard has no header sheet and no flap. The folder tab reads "Dashboard" in the page colour, as before.

### 2.3 The book

- Title: the active manuscript, `localStorage["scriptally_active_manuscript_id"]`, resolved in `Dashboard.tsx`.
- Author: `User.name` (there is no pen-name field).
- **Open item:** with no stored id and more than one book, the Dashboard falls back to `manuscripts[0]` and the sidebar to the most recently created. They can name different books. Not changed here.

### 2.4 The to-do order

| Group | Derivation | Exists on main? |
|---|---|---|
| Agents are waiting | `assembleBoardColumns` → `todoRows` → `taskCategory` = `req`, in the board's order | Yes |
| Worth a nudge | same, `nudge` (`nudge_overdue`, never nudged) | Yes |
| Gone quiet | same, `quiet` (`nudge_overdue` after a nudge, and `no_response_close`) | Yes |
| Housekeeping | `hkModel` (`lib/contactHousekeeping`), grouped by kind of gap | Yes. Its per-agent context was only built inline in `AgentList.tsx`; the same five facts are stated in `lib/dashList.houseItems`. |
| Ready to query | `nextStep().ready` (`lib/contactNextStep`); unknown-genre agents count | Yes |
| Coming up | `buildQcRows` → `expectedMs`, today or later, soonest first | The clock exists; the list did not (false premise 5). |

Wording sources: the board's own titles (`derivedCopy`) for groups 1–3; the pack's and the reference's sentences for 4–6, held in `lib/dashList`.

### 2.5 Closed outcomes

`closedTile` (`lib/dashClosed`): closed is Rejected or No Response with a send date. No Response is "No reply"; Rejected splits by the furthest stage reached (`analytics.buildRows`). The Query Centre's Closed court (`tileCourt`) excludes Withdrawn and Signed in the same way. The card carries both numbers and C1 compares them.

### 2.6 The drawer pattern

`QcBirdsDrawer` is bespoke: own Escape listener, a dark dim (`rgba(28,19,15,.28)`), no focus trap. `HalfDrawer` hard-codes the same dim and a white body. The feed drawer is its own component on `useOverlay` (false premise 4), placed from the main column's measured box.

### 2.7 The feed's data

The per-type resolver is on main (`feedPill`, `describeEvent`, `eventShape`). Authorship now reads `recordSpecFor`, the calendar record's own in/out table. "Met" is a send dated after the request (`stageSentAt`); a send before it does not count.

### 2.8 Locks retired or rewritten

Named in full in `tests/e2e/RETIRED-dashboard-v58.md`.

- **Deleted e2e:** `dashTopRow`, `dashStages`, `dashHeader`, `dashFeed`, `dashTodo`; scripts `dash-skeleton-v33`, `dash-skelshot-v33`.
- **Deleted unit:** `oneScreenSmoke`, `oneScreenSkeleton`, `oneScreenStages`, `oneScreenTasks`, `oneScreenTour`, `dashHeader`, `dashEmptyState`, `dashSeen`.
- **Retargeted unit:** `dashboardPageSmoke`, `oneScreenMark`, `oneScreenPanel`, `todoNotesTasks`, `queryCard`, `motionPolish`, `requery`.
- **No e2e clicked the quick-action card.**

## 3. Gates

| Gate | Baseline | After |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `build:dev` | clean | clean |
| `vite build` (production) | clean | clean; the review aid is absent from the bundle |
| Vitest | 541 of 542 files, 8,480 passed, 3 skipped | 536 of 537 files, 8,319 passed, 3 skipped |

The one failing file in both runs is `functions/src/email.test.ts`: `functions/node_modules` is not linked in this worktree. The test count fell because eight unit files were retired with the page they described; three new files add 23 tests.

## 4. The locks

Measured on the dev build at 1512×900, 1440×760, 1280×800, 1280×680 and 1366×650 (the fit locks at all five; the rest at 1512×900 and 1280×800). Ledgers: `red-first/` and `green/`. Proofs: `mutation-proofs.jsonl`.

| Lock | Red first (unchanged page) | Green | Mutation, and what went red |
|---|---|---|---|
| F1 one screen | 5 of 10 red | 10 of 10 | Header +120px padding: F1 and F2, 9 readings |
| F2 never clipped | 70 of 70 red | 70 of 70 | Closed `flex: 1`: F2 and F3, 5 readings |
| F3 chart gives way | 8 of 8 red | 8 of 8 | Chart fixed at 340px: F1, F2 and F3, 19 readings |
| H1 header | 18 of 18 red | 18 of 18 | Stats line restored: "digits in the header: 19,3" |
| C1 closed | 19 of 23 red | 23 of 23 | Withdrawn counted: "card 12 · the Query Centre's closed court 11" |
| R1 right column | 12 of 12 red | 12 of 12 | White frame: "right: rgb(255, 255, 255)" |
| R2 order | 11 of 41 red | 47 of 47 | Housekeeping before nudges: "shown req>house>nudge>quiet" |
| R3 actions | 5 of 7 red | 7 of 7 | Press changes the list and opens nothing: 4 readings |
| A1 drawer | 26 of 28 red | 28 of 28 | Dark dim: "rgba(28, 19, 15, 0.28)" |
| A2 feed rows | 8 of 12 red | 12 of 12 | All events as cards: "yours is a single line — 0 of 123" |
| L1 no jump | 12 of 12 red | 12 of 12 | Closed skeleton dropped: closed 60px loading against 223px loaded |

Notes on what the account can and cannot show:

- **R2's five fixtures are held exactly by the unit lock** (`src/lib/dashList.test.ts`: A 3/4/2/3, B 0/2/0/5, C, D, E, plus all 64 present/absent combinations). On the rendered page the same five states are reached on the seeded manuscript with the dev-only review aid, which leaves earlier groups out above the plan. It invents no item. All five focus groups were entered.
- **R3's mutation does not write to the account.** It makes the press change the list locally and open no flow, which is what a write would look like from the page.
- **A2: no met request falls inside thirty days on the account** (3 from agents, 123 by you, 1 open, 0 met). The met branch is entered in `src/lib/dashV58.test.ts`.
- **The scrollbar is overlay in this browser (0px).** A classic scrollbar inside the list is not measured.

## 5. Shots

Under `reports/dashboard-v58/shots/`, beside the references in `design-refs/dashboard-v58/`.

| State | 1512×900 | 1280×800 | Reference |
|---|---|---|---|
| The page | `page-1512x900.png` | `page-1280x800.png` | `ref-page-*` |
| Drawer open | `feed-open-1512x900.png` | `feed-open-1280x800.png` | `ref-feed-open-*` |
| Housekeeping | `state-housekeeping-1512x900.png` | `state-housekeeping-1280x800.png` | `ref-state-housekeeping-*` |
| Ready to query | `state-ready-1512x900.png` | `state-ready-1280x800.png` | `ref-state-ready-*` |
| Coming up | `state-coming-up-1512x900.png` | `state-coming-up-1280x800.png` | `ref-state-coming-up-*` |
| None closed | `closed-none-1512x900.png` | `closed-none-1280x800.png` | `ref-closed-none-*` |
| Fit | `page-1280x680.png`, `page-1366x650.png`, `page-1440x760.png` | | |
| Loading | `loading-1512x900.png` | `loading-1280x800.png` | |

## 6. Decisions I took that you may want to reverse

1. **Commits are not one per phase.** Phases 1–4 share one root and one stylesheet, so they are one commit. The order is: references, derivations, the page, the retirement, the locks and report. Every commit compiles.
2. **The dashboard no longer shows "Your tasks"** (the writer's own notes and reminders) or the board's other housekeeping cards (materials not recorded, "tell them you withdrew"). The pack's six groups have no place for them. They are still on the To-do page. "All {n} →" counts the column's items, which is not the To-do page's number.
3. **The dashboard tour is gone.** It auto-ran for new accounts and pointed at the old cards.
4. **The feed's "new since you last looked" mark is gone** with the feed card. The tab's rust pill counts today's entries instead.
5. **First run keeps the getting-started deeds.** A book with no query shows them in the list column (same derivation as before), so the first-run page is not blank. The full empty state is still its own pass.
6. **"Log a query" in the header opens the drawer in place.** The old quick action went to the Query Centre first.
7. **The page fills one screen from 1100px wide**, not only from 1280. Below 1100 it is one flowing column.
8. **Three shapes are remembered per device** (`localStorage["sa.dash58Shape"]`): the focus card's height, whether anything has closed, and whether the tab has its "today" pill. That is how the loading boxes match the loaded ones. A first visit uses the commonest shape and can move once.
9. **The loading focus card is an empty card of the right height.** It has no placeholder lines inside it.

## 7. Not done

- **The old page's rules are still in `oneScreen.css`** with no renderer. The kept chart reads the rest of that file, so the sweep is its own pass.
- **Eleven census measurements still select the old page's probes on `/dashboard`** and were not re-run (named in the retirement file). Presume them red on that route.
- **Illustration slots:** the chart keeps the hawk, the ring keeps the archivist, and the drawer's 50px art disc is an empty dashed slot.
- **Prod is untouched.** No rules or functions changed.
