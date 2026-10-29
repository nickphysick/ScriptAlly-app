# Retire the Calendar page (v1), 29 Oct

The To-do Calendar page at `/todo/calendar` is gone. That covers its route, its sidebar row, its folder-tab sibling, its palette entry, its three shortcuts and the dashboard link to it. Old links redirect to `/todo`, keeping the query string and hash.

The To-do list keeps its own calendar: the day card and the slide-out month/week drawer. The Query Centre's Birds-eye view and its Calendar view are untouched.

## 1. False premises

None of P1–P5 was false, so the run did not stop. Three findings sit next to them, and you should know about each:

- **P3 is true as written, but not the whole story.** The Query Centre files do import `lib/todoCalendar`, `calendarPill`, `calendarFade` and `calendarSections`. They reach the last three only through `shared/timeline/TimelineBoard.tsx` and `boardParts.tsx`, though. The Query Centre stopped mounting `<TimelineBoard>` in v11 (19 Sep). **The Calendar page was the board's last host.** With the page gone:
  - nothing mounts `TimelineBoard`;
  - nothing imports `boardWindow.ts`;
  - nothing calls `useSegHover`;
  - only `crossAt` from `boardParts` still has a caller (Queries.tsx).

  Those files are on this run's do-not-touch list, so they stay, unmounted. Whether to delete them is your call.
- **`TasksPageLayout` is now unmounted as well.** The To-do list (v2) and the Corkboard (v1) had already left it, so the Calendar page was its last caller. It, and the parts of `tasksLayout.css` and `todoCalendar.css` that only those two drew, are now orphaned. I didn't sweep them: that's a separate CSS pass. The three stylesheets are still imported, because the Corkboard and the Query Centre read parts of them.
- **What Queries.tsx ~191 meant.** The comment said the board's stylesheet was "already in the bundle because `TodoCalendarPage` has loaded it", but the very next line imports `todoCalendar.css` explicitly. So that dependency had already been defended, and the Query Centre's Birds-eye view renders cold with the Calendar page never mounted (smoke below). The comment is reworded. **A related trap came out of the build instead.** The app ships one stylesheet in first-import order, and the deleted page was the first importer of `tasksLayout.css`, `taskChrome.css` and `todoCalendar.css`. Deleting it moved a 2,084-character block of rules behind another sheet's. That's a cascade change, with the same byte count, visible only to `cmp`. App.tsx now imports the three sheets where the page import used to sit, and the built CSS is **byte-identical** to the base build.

Also noted, but not something this run had to act on:

- The "New task" door (`sa.todoCompose`) stays, because the Corkboard's task door still uses it.
- The separate `TODO_OPEN_COMPOSER` event was imported by the page but never dispatched by it. It has had no announcer since `+ New` left the bar (19 Sep), and that is unchanged here.

## 2. Base and counts

The base is **`dev/pk391-qm1-pk392`** at `fca44895`, which was the newest dev branch when I fetched. It contains the `…-pk391` tip the prompt named, plus queries-mobile-v1 and submission-packages-v39-2.

| Gate | Base | Final |
| --- | --- | --- |
| tsc | 0 errors | 0 errors |
| production build | clean (no `error`/`[WARNING]` lines) | clean; CSS bundle byte-identical to base |
| Vitest | 686 files · 10,704 passed · 3 skipped | 685 files · 10,687 passed · 3 skipped |

The file count is 686, minus the two deleted suites (`calendarToolbar`, `calendarFacets`), plus the new `calendarRetired.test.ts`. The test count falls by the retired cases, net of the seven new ones.

Commits: `2d6b796b` (routes, nav, shortcuts, dashboard link) · `ec37949d` (tests) · this report. The first commit is not green on its own, because the suites still read the deleted page until the second.

## 3. Files

**Deleted:**
- `src/components/todo/TodoCalendarPage.tsx`
- `src/lib/calendarToolbar.ts` and `src/lib/calendarFacets.ts`, with their tests. P4 held: only the page imported them.

**Expected to delete but kept:**
- The page had no page-only stylesheet. All three of its sheets are shared (see §1).
- The `sa.todoCompose` arrival is still used by the Corkboard.

**Changed source:**
- `App.tsx`
- `todoRoutes.ts`
- `headerSheetRoutes.ts`, `shellForRoute.ts`, `routeTiers.ts`, `workspaceNav.ts`
- `dashList.ts` ("coming up" opens the To-do list)
- `OneScreenMark.tsx` (the `"calendar"` key is removed; only the page rendered it)
- `shortcuts.ts` (the scope and the three `cal*` keys are removed)
- `TasksPageLayout.tsx` (`.cal-fpbody` is out of its scroller list)
- Reworded comments only: TodoNoteboardPage, ToDoPage, v5/TodoTray, WorkspacePageGrid, Queries.tsx, queryCardFacts, and the three shared timeline files

## 4. Locks

Every retired, re-pointed and trimmed assertion is listed in [`tests/e2e/RETIRED-retire-calendar-v1.md`](../../tests/e2e/RETIRED-retire-calendar-v1.md). That covers 77 e2e files deleted, 28 trimmed, and 23 unit suites edited.

**New locks, each proved red against the base checkout (`fca44895`) before going green:**

| Lock | Where | On the base | On the branch |
| --- | --- | --- | --- |
| L1 `/todo/calendar` → `/todo`, query and hash kept | `src/lib/calendarRetired.test.ts` | red | green |
| L2 no route, nav, sidebar or palette model offers the page | same | red (×3) | green |
| L3 nothing imports the page, `calendarToolbar` or `calendarFacets` | same | red (it named 30-odd importers); its population check is green by design | green |
| L4 no "Calendar" shortcut scope | same | red | green |
| L5 rendered: Tasks rows are To-do list then Corkboard; the folder tab's one sibling is Corkboard; an old link lands on `/todo?from=bookmark` | `tests/e2e/calendarRetired.measure.ts`, 1280 and 1512, against local dev builds | red, 3 of 3 | green, 3 of 3 |
| calendarFixes "no page mounts the board now" | `shared/timeline/calendarFixes.test.ts` | red (it named `TodoCalendarPage.tsx`) | green |

L5's caveat: on the base, the sidebar-row assertion failed first, so the folder-tab assertion in the same case was never reached there. It has been seen green, but not seen red.

## 5. Smoke and deploy

**Smoke**, on a local `build:dev` of the branch (1440 × 900), with no page errors:
- `/todo` loads, and the "Open the calendar" button opens the drawer, which reads "October 2026" in Month view and "Week of 26 Oct" in Week view.
- `/todo/corkboard` loads.
- `/queries?view=calendar` renders the Birds-eye view cold.
- The shortcuts sheet has no Calendar section.
- `/todo/calendar` lands on `/todo` (L5).
- The dashboard's "coming up" link is held by `dashList.test.ts`.

**Deploy:** see the dev branch and the bundle hash in the chat summary for this run, which carries the deploy confirmation.

## 6. For Nick

1. **`TimelineBoard`, `boardWindow`, `useSegHover` and most of `boardParts` have no caller now.** They're kept because this run couldn't touch them. Delete them, or keep them for a future host?
2. **`TasksPageLayout`, and the parts of `tasksLayout.css`/`todoCalendar.css` that only it and the Calendar page drew, are unmounted.** That's a CSS sweep for its own pass.
3. The `TODO_OPEN_COMPOSER` event still has a listener in `ToDoPage.tsx` and no announcer. Unchanged here; it was noted on 19 Sep.
4. Prod is untouched. No rules or functions changed.
