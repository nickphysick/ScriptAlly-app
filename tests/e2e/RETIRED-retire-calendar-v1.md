# Retired with the Calendar page (29 Oct)

The To-do Calendar page (`/todo/calendar`, `TodoCalendarPage.tsx`) is gone, along with its route, its sidebar row, its folder-tab sibling, its palette entry and its three shortcuts. `/todo/calendar` now redirects to `/todo`, keeping the query string and hash. The To-do list keeps its own calendar: the day card and the slide-out month/week drawer (`lib/trayCalendar`).

The new locks are `src/lib/calendarRetired.test.ts` (L1–L4) and `tests/e2e/calendarRetired.measure.ts` (L5).

The sweep went by **route**, not by filename: every e2e file that opens `/todo/calendar` was found with `grep -rln "todo/calendar" tests/e2e` (106 files). Each was then sorted by the other routes it opens.

## Deleted e2e files (77)

These 72 open only `/todo/calendar`. The page was their only subject:

boardDomCapture, calAccept55, calAct63, calBar63, calBehav63, calCaps58, calCard, calCard54, calCard65, calCentre, calClosed56, calContrast, calCopy55, calDeferred, calDens64, calDrawer65, calFade55, calFaults56, calFid63, calFidelity60, calFlags60, calFrame56, calFrame63, calGhost, calGhost56, calGround54, calHover65, calInset55, calNarrow, calOne61, calOpen54, calOrder56, calOrder58, calRowHead, calRowWords55, calScheme62, calSeam65, calSemantics58, calShot39, calShot54, calSurface58, calSurface60, calTask54, calTask63, calText, calTint54, calTool63, calTrailStages60, calV40, calViews54, calWindow58, diffList, elemDiff, shot, tlAccept, tlAccept7, tlBarCopy, tlBreath, tlCaptions, tlColour, tlCopy, tlGroups, tlHeadDot, tlNotch, tlNote, tlPast, tlPhase2, tlPhase3, tlRecon, tlRowHead, tlSettled, tlTodayMark (all `.measure.ts`).

These five also open other routes, but every case in them is about the Calendar page:

- `calMast64.measure.ts`: the Calendar's masthead against the To-do list's, and its New task CTA.
- `calProbe60.measure.ts`: the Calendar board's alignment, navigation and probe.
- `packCPhase3.measure.ts`: "the pane over the calendar"; all three cases open `/todo/calendar`.
- `calFixes.measure.ts`: the board on two hosts. The To-do host is the deleted page. The Query Centre host stopped mounting the board in v11, and `RETIRED-todo-v2.md` already listed this file as retired (`.qvs`) without deleting it.
- `allSessions.measure.ts`: a one-off five-session dev check. `RETIRED-todo-v2.md` and `RETIRED-packages-v2.md` already listed it as retired. Its third section measured the Calendar's cells.

## Cases dropped from multi-route e2e files

| File | What changed | Why |
| --- | --- | --- |
| barBinding, chromeGround, compactHeader, contentGeometry, engagement, gapAudit, groundProbe, headerFix, illoRules, mastheadMatrix, matrix, stripAudit, surfaceCensus, toolbarIsContent, washEdges | the `Calendar` row of the route table | the route no longer exists |
| chassis21 | `/todo/calendar` from `PAGES`; the case "the Calendar's foot control is reachable" | its subject is gone |
| completionPathsPhase5 | the case "the calendar completes with a toast and Undo" | its subject is gone |
| materialsEverywhere | the case "the Calendar drawer: the chip under the agency…" | its subject is gone |
| hr1 | HR1-8's `calendar` cases | the route no longer exists |
| headerV3 | `/todo/calendar` from `TITLE` | the route no longer exists |
| headerV3Shots, hp2Lib, inkShell, pageHeaderV1, pageHeaderV2Lib, phRollout, routeShots, sh2Lib | `/todo/calendar` from their route lists | the route no longer exists |
| quietBar | Q6 still names the route in its context string | Q6 has been `test.skip` since ink shell v1, so nothing runs; left as is |

## Unit suites

Deleted with their subjects: `src/lib/calendarToolbar.test.ts` and `src/lib/calendarFacets.test.ts`. Both modules were imported only by the deleted page.

| Suite | Case | What happened |
| --- | --- | --- |
| `todoPageSmoke` | "the Calendar page renders without throwing" · "…and carries its board, its one column header and its groups" · "…and a dated task REACHES its day" | **retired**: they rendered the deleted page |
| `tasksViewport` | describe "the Calendar's tool-row filter" (4 cases) | **retired**: that page was its only subject |
| `tasksViewport` | NO PAGE PASSES A SIDEBAR · the Corkboard scrolls as a page · no gear in any tool row · the width caps | the **Calendar half dropped**; the other pages' halves are kept |
| `tasksViewport` | A ROW'S HEIGHT COMES FROM ITS LANES (its page half) | **re-pointed** to `TimelineBoard.tsx` |
| `tasksViewport` | ALL FOUR PAGES WEAR THE SAME COLUMN (its Calendar loop) | **re-pointed**: now asserts that no page mounts `TasksPageLayout` (the Calendar was its last caller) |
| `tasksViewport`, `tasksLayout` | the To-do `StagePage` slot count | 3 → 2 |
| `tasksLayout` | "the Calendar stands on the family layout" | **re-pointed**: no page stands on it now |
| `tasksLayout` | no page wraps the layout · no page passes a sidebar | the Calendar entry dropped |
| `calendarFixes` | §4 "neither page carries its own copy of the delegated pair" · "the board's host hands it real handlers" | **retired** (their one subject was the page), replaced by "no page mounts the board now" |
| `calendarStyleReach`, `calendarTokens`, `calendarColourLaw`, `tasksAuditLegend`, `barTokens`, `artSlots` | the reads of the page | **re-pointed** to the shared board's files (`TimelineBoard.tsx`, `boardParts.tsx`; for the legend, also the To-do list's `TrayCalendar`/`TrayCalDrawer`) |
| `calendarColourLaw` | the territory count | 15 → 14 (the page and its two libraries out; the board's two files in) |
| `calendarTokens` | "the earn-it predicate is orphaned nowhere" | `calFade55.measure.ts` dropped from its list (the file is deleted) |
| `boardSidebar`, `tasksTags`, `paneCommit` | the page's half | dropped (`paneCommit` names the Corkboard as the page that does not mount the sweep) |
| `headerSheet`, `shellV2Nav`, `shellV2Smoke`, `workspaceTasksNav`, `barPageName`, `dashList`, `todoWorkspace`, `pageHeaderDefault`, `pageStructure` | `/todo/calendar`, the Calendar row, the `"calendar"` mark, the census entry | moved to the surviving pages (a Tasks sub-page is now the Corkboard; "coming up" now reads "To-do list") |
