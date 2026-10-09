# Retired with Dashboard v58 (9 Oct)

The Dashboard was rebuilt: the header is the book, two cards sit down the left, the list column has
no container, and the activity feed is a drawer. Everything below measured or described the page it
replaced. Recover any of it from `27ca389f` (the commit before the rebuild).

## Measurements deleted (subject gone)

| File | What it held |
|---|---|
| `tests/e2e/dashTopRow.measure.ts` | the three-card top row and the bar against `dashboard-v34.html` |
| `tests/e2e/dashStages.measure.ts` | the centred block, the three- and two-card rows, row two's clamp |
| `tests/e2e/dashHeader.measure.ts` | the greeting and its counts line |
| `tests/e2e/dashFeed.measure.ts` | the feed CARD's alignment and fills |
| `tests/e2e/dashTodo.measure.ts` | the to-do CARD's bands and badge |
| `scripts/dash-skeleton-v33.mjs`, `scripts/dash-skelshot-v33.mjs` | the loading cover, which no longer exists (each part is its own loaded box now: lock L1) |

Replaced by `tests/e2e/dashV58.measure.ts` (F1–F3, H1, C1, R1–R3, A1–A2, L1).

## Unit tests deleted (they rendered or source-read deleted components)

`oneScreenSmoke` · `oneScreenSkeleton` · `oneScreenStages` · `oneScreenTasks` · `oneScreenTour` ·
`dashHeader` · `dashEmptyState` (all under `src/components/dashboard/`) · `src/lib/dashSeen.test.ts`.

## Unit tests retargeted, same law

`dashboardPageSmoke` (landmarks) · `oneScreenMark` and `oneScreenPanel` (the page's file list) ·
`todoNotesTasks` (the page file) · `queryCard` and `motionPolish` (the cases about the peek and the
lazy to-do drawer removed; the rest stands) · `requery` (the quick card's line removed).

## Components and libs deleted

`OneScreenDashboard` · `OneScreenHeader` · `OneScreenActions` · `OneScreenClosed` · `OneScreenFeed` ·
`OneScreenTasks` · `OneScreenSkeleton` · `OneScreenTour` (+ `oneScreenTour.css`) · `QueryCardLive` ·
`StatePill` · `TallyMarks` · `TodoRowCard` · `TodoRowEditor` · `DashTaskCommit` · `DashSnooze` ·
`lib/dashActions` · `lib/dashHeader` · `lib/dashSeen` · `lib/skeletonTiming`.

Found by a reachability sweep from `src/main.tsx`, not by name.

## NOT re-run, and they name the old page's probes

These read `[data-probe="hero"]`, `.os-greet`, `.os-row1` or the cover on `/dashboard` as one route
in a census. They were not run against v58 and should be presumed red on that route until re-pointed:

`illustratedMasthead` · `mastheadMatrix` · `livingHeadersV3` · `pageHeaderV1` · `phRollout` ·
`pageHeaderV2Lib` · `plateHeader` · `plateShots` · `quietBarLib` · `shellV3Lib` · `scripts/dash-rail-v33.mjs`.

## Still in `oneScreen.css`, with no renderer

The retired cards' rules (`.os-qa*`, `.os-feed*`, `.os-td*`, `.os-greet*`, `.os-row1/2`, `.os-cl*`,
`.os-skelpage`, the tour) are still in the sheet. The kept chart card and its popups read the rest of
that file, so the sweep is its own pass.
