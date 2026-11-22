# To-do load v1 — the To-do page's loading state

Built overnight, 21–22 Nov 2026, on `todo-load-v1`, cut from `todo-list-v58-2` (Part A). Desktop only (768px and up). The phone and the Dashboard are reported, not changed.

Oracle: `design-refs/todo-load-v1/todo-load-v1.html` with `page.jpg`. Both SHA-256 hashes match the brief: `258e3498…566054d` and `0194e545…9f5a2235`.

## 1. B0 — recon, and false premises

**B0.2 — the flash, reproduced and recorded** (`reports/todo-load-v1/before/`: frame sequences, and the log in `readings/before.json`). A MutationObserver logged, from the first script on the page, each moment the visible To-do page drew an empty state while it held no task rows:

| Load | "Nothing to do yet" | "You're all caught up." | 45 rows | 53 rows |
|---|---|---|---|---|
| Warm (cache kept) | 130ms | 368ms | 468ms | 739ms |
| Cold (Firestore cache emptied, listen slowed 900ms) | 2147ms | 4420ms | 4514ms | 4801ms |

The step from 45 to 53 rows is the writer's 8 own tasks, whose listener lands last.

**The cause, in one sentence:** the workspace decided from whatever list it held. With nothing yet it drew "Nothing to do yet". With only housekeeping (folded by default, so no open row and no selection) it drew "You're all caught up.". Nothing waited for the tasks to finish arriving.

In the code, before this work:

| Branch | Where | Drawn when |
|---|---|---|
| "Nothing to do yet" in the tray | `TodoWorkspace.tsx:568` | `!all.length` |
| "Nothing to do yet" on the desk | `TodoWorkspace.tsx:582–590` | `!all.length` |
| "You're all caught up." on the desk | `TodoWorkspace.tsx:592–597` | `!sel`: a list exists, but no row is open |

Housekeeping is folded (`shut` starts as `{"house"}`, `TodoWorkspace.tsx:142`), so a list holding only housekeeping has no open row and no selection.

Corrections to the brief's premises:
- **a.** Correct, and it matters more than it looks. `collectionsReady` gated only the arrival keys ("open this task" and the composer, `TodoWorkspace.tsx:206`). Those keys are one-shot, and `collectionsReady` can be true before the tasks exist, so a key could be read against an empty list and lost. They now wait for the load too.
- **b. Half right.** "Nothing to do yet" renders from an empty list. **"You're all caught up." does not**: it renders from a non-empty list with no selection, a housekeeping-only list with Housekeeping folded. Neither checked `collectionsReady`. There is no "Nothing yet" string on the desktop page; the string is "Nothing to do yet".
- **c.** Correct. `WsHeader56` drew "{n} things to do", the ring and the "What needs doing" line from the same list: "0 things to do" while loading.

**B0.3 — what `collectionsReady` covers** (`lib/db.tsx:641–748`):
- **It covers only manuscripts, agents and queries.** It turns true when each has delivered a first loaded snapshot (from the server, or from the cache with documents), or when the 6s safety net fires.
- **It does not cover the writer's own tasks, the task flags, or the activity feed.** The feed has its own `activitiesReady`; the other two had nothing.
- **It can be true before the task list exists.** The tasks are computed in an effect from those collections (`db.tsx:1060–1446`), which runs after the render in which `collectionsReady` turned true.
- **Listener errors:** the store exposes them for queries, agents and manuscripts (`queriesRead`, `agentsRead`, `manuscriptsRead` → `useLoadFailure`, with a resubscribe). The own-tasks and task-flags listeners only logged their errors.

**B0.4 — the app's loading skeletons:**
- **The shared primitive is a token pair, not a component:** `--sa-sk-base: #ece6de` and `--sa-sk-sheen` (a shimmer gradient), in `src/index.css:70–71`. Each page has its own skeleton components and classes:
  - Queries: `QcCourtsSkeleton`, `QcListSkeleton`, with `useQcLoad` (150ms delay);
  - letters: `DeskSkeleton`;
  - the Dashboard: `d58-skcard`, `d2-sk`.
- **What I used:** `--sa-sk-base` for bars on cream (the ref's `#ece6dc` is 2 off it), and the ref's `#f3eee6` for large blocks, since no token exists for that. The sheen is not used, because the outline is still.

**B0.5 — the phone and the Dashboard** (report only):
- **The phone's To-do (`components/phone/v5/TodoV5.tsx:277`) has the same flash.** It draws "That's everything for today." whenever it has no card, with no load gate at all.
- **The Dashboard's Next up (`dashboard/v2/Dash2Next.tsx:120–123`) very likely has a short form of it.** It waits for `loading = !collectionsReady` (`Dashboard.tsx:1534`), which is true before the tasks are computed and before own tasks land. It can therefore show its caught-up line for a render or two. Not measured.
- **The fix for both:** read the store's new `tasksReady`. Not done here, as ruled.

## 2. What was built

| Phase | Commit | What |
|---|---|---|
| B0 | `45c557d73` | the pack, the load spec, the flash recorded |
| B1 | `d7ccbce32` | the page knows whether it has loaded |
| B2–B4 | `403662667` | the frame, the outline, its timings, the failed state (one commit: one hook and one render path) |
| B5 | `bb3ddf014` | the review switch, dev and emulator builds only |
| B6 | (the commit that carries this report) | after recordings and measurements; three fixes the after run found (below); the ring lock; this report |

- **B1 — one source of truth.** The store gains `tasksReady` (additive and optional on the context).
  - It is set **in the task effect, in the same commit as `setTasks`**. It is true only when `collectionsReady`, `activitiesReady` and the first loaded snapshot of the own tasks and the task flags are all in. The two new flags reset on sign-in and sign-out, and the 6s safety net covers them.
  - `tasksReadFailed` says either listener errored.
  - The page reads `tasksIn = tasksReady ?? collectionsReady` (a context without the field behaves as before).
  - How `collectionsReady` was fixed: it was not changed, since the Dashboard depends on what it means today. The To-do page now reads `tasksReady` instead.
- **B2 — the frame and the outline.** `WsLoading.tsx` and `todoWsLoad.css`, imported last.
  - The outline is built from the real classes, so its rows, discs, paddings and columns are the loaded page's. Only the bars are new.
  - The outline is `aria-hidden`. The workspace carries `aria-busy` and one polite live message, "Loading your tasks".
  - The header gains a `loading` prop. The hawk, the "for" line and both buttons draw at once, and bars stand where the title, the ring's figure and the two lines go. The ring's track is the header's own empty-ring track.
  - The tray's tabs show no count until loaded. The desk's navy bar draws at once.
- **B3 — the timings** live in one place, `TODO_LOAD` in `lib/todoLoad.ts`: outline at 150ms, the outline's 150ms fade, the loaded page's 220ms fade, "Still loading" at 3s, and failed at 5s.
  - `todoLoadClock` is a plain object that wakes only at those moments; `useTodoLoad` wraps it.
  - The fade in runs only when an outline was shown, and comes off by a timer, never `animationend`.
- **B4 — the failed state** is in the tray, as the brief rules. **"Try again" re-subscribes the failed reads where the store can** (`loadFail.retry`: queries, agents, manuscripts). **Otherwise it reloads the route**: for the own-tasks or flags listener, or 5s with no answer at all.
  - Either way the clock starts over. If the tasks arrive late anyway, the page loads.
  - The To-do list's old full-page `LoadFailed` (overnight fixes v1) gives way to this. `LoadFailed` itself stays for the other pages.
- **Fixes found by the after run, in the B6 commit:**
  - "Still loading your tasks." moved out of the flow (it shifted the outline by 0.002).
  - A review hold now starts when the real tasks are in (counted from mount, `fast` still showed an outline).
  - The header's ring is drawn from an all-zero breakdown while loading. The frames showed housekeeping's segments under the outline; the ref shows the track alone. A page lock now covers it, proved red with the fix removed.
- **B5 — `/todo?load=fast|normal|slow|fail`** holds the page loading for 110ms, 900ms, 4.5s, or until it fails. It cannot work on prod for two reasons:
  - the call site is `import.meta.env.MODE !== "production" ? loadHoldFor(…) : null`, a build constant, so a production build compiles the branch out;
  - `loadHoldFor` answers null for production whatever the URL says.

## 3. B6.1 — locks, and red-then-green

Locks: `src/lib/todoLoad.test.ts` (11 cases, the clock on fake timers) and `src/components/todo/ws/todoLoadPage.test.tsx` (5 cases, the page rendered with the store mocked). Each was proved red with its fix removed, then restored and run green:

| Lock | Fix removed | Result |
|---|---|---|
| While loading, the page contains none of "all caught up", "Nothing yet", "Nothing to do yet", "Nothing snoozed"; it is `aria-busy` with "Loading your tasks"; the frame draws at once | the tray's and desk's loading gates | 2 red |
| Loaded with zero tasks, the real empty state shows; a context without `tasksReady` reads `collectionsReady` | the hook never reaching loaded | 2 red |
| Ready at 100ms: never an outline. Not ready at 150ms: the outline. 3s: still loading. 5s: failed. Tasks at 6s: loaded | the outline at 0ms, "still" at 4s, failed at 6s, failure beating a late ready | 7 red |
| Prod guard: a production build answers null | `loadHoldFor`'s production check | 1 red |
| Prod guard: the one call site carries the build gate | the call-site gate | 1 red |
| While loading, a list already in hand draws no ring segment and no tab count | the header given the live breakdown | 1 red |

One weakness was found and fixed during the proofs. "Ready at 100ms shows no outline" first checked only the states the clock announced, so it passed with the outline at 0ms. It now checks every state the clock was in, its first included, and goes red on that mutation alone.

**Correction to the brief's B6.1:** "loaded with zero tasks, 'You're all caught up.' shows" is not what the page does. With zero tasks it draws **"Nothing to do yet"** (the desk's day-one panel). "You're all caught up." is for a list with nothing open. The lock asserts what the page does.

## 4. B6.2 — nothing moves

Measured on the rendered page at 1512×900, with `/todo?load=slow`: while the outline shows, then once loaded.

| | While loading (outline) | Once loaded |
|---|---|---|
| Page header's height | 265.13px | 265.13px |
| Workspace's top | 401.13px | 401.13px |
| Tray's width | 394.39px | 394.39px |
| Desk's navy bar | 58px | 58px |

**Layout shift: 0.** The PerformanceObserver recorded no `layout-shift` entry at all, from the outline through the swap.

The first after run did record shifts: 0.002 when "Still loading your tasks." appeared, and again when it gave way to the failed state, because the line sat in the flow and pushed the outline down. The swap itself was already 0. The line now sits out of the flow, under the tab head, over the first heading's bar, which steps aside.

## 5. B6.3 — the four cases

Frame sequences at 1512×900 in `reports/todo-load-v1/after/` (`fast-*`, `normal-*`, `slow-*`, `fail-*`), with the logs in `readings/after.json`:

| Case | Outline | "Still loading" | Result | Layout shift |
|---|---|---|---|---|
| `fast` (110ms) | never | — | loaded at 1148ms | none |
| `normal` (900ms) | at 1201ms | — | loaded at 2015ms | none |
| `slow` (4.5s) | at 1211ms | at 4075ms | loaded at 5651ms | none |
| `fail` | at 1080ms | at 3939ms | failed at 5937ms | none |

Times are from navigation. A review hold starts its clock **when the real tasks are in**, about 0.9s on the harness. In the first after run the hold counted from mount, so the real load swallowed `fast` and an outline showed. The hold now simulates the stated arrival time on any machine.

The cold and warm loads from B0.2, re-run on this build:

| Load | The outline | 53 rows | Empty state drawn with no rows |
|---|---|---|---|
| Cold (cache emptied, listen slowed 900ms) | at 2307ms | at 4944ms | **none** (before: "Nothing to do yet" at 2147ms, "You're all caught up." at 4420ms) |
| Warm | at 428ms | at 1043ms | **none** (before: at 130ms and 368ms) |

## 6. Baseline against final

| Gate | Baseline (Part A's final, the same source, before any Part B edit) | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vite build --mode development` | clean, 4,086 modules | clean, 4,089 modules (+3: `todoLoad.ts`, `WsLoading.tsx`, `todoWsLoad.css`) |
| Vitest | 4 failed / 13,077 passed / 4 skipped | 4 failed / 13,093 passed / 4 skipped (+16: the new locks) |

The 4 failures are the same as the baseline's: `events.test` ×2 and `firestoreTarget` ×2.

Three source tests that pinned the old header and tab lines were re-pointed, not deleted: `loadFailure.test.tsx`, `wsSlim56.test.tsx` and `todoWorkspaceSmoke.test.tsx`.

## 7. Decisions made without Nick

1. **The outline is still.** No shimmer and no pulse (the ref's "Outline: Still").
2. **The timings are 150ms, 220ms, 3s and 5s**, as the ref plays them, in one constant.
3. **The failed state's wording** is exactly the brief's. It replaces the To-do list's old "We couldn't load your … Try again?" full-page error, so there is one failed state, in the tray.
4. **"Try again"** re-subscribes where the store can, and reloads the route otherwise. Own tasks and flags have no resubscribe of their own, and adding one was beyond this pass.
5. **`collectionsReady` is not changed.** The To-do page reads a new `tasksReady`, since the Dashboard's meaning of `collectionsReady` must not move.
6. **The tray's search, filter and collapse icons draw at once with the tabs.** The ref's frame shows the tabs alone; the icons are the real tray head's and need no data.
7. **The loaded page's fade** runs on the tray list, the desk, the header's title and the ring block, not on the panels, which are the same elements before and after.
8. **B2–B4 were committed as one phase**, because the outline, its clock and the failed state share one hook. B1 and B5 are their own commits.
9. **The desk outline's card is drawn from the ref's proportions** inside the real card column (`.tws-wp`), not from the query card's own markup, which is scaled and depends on a query.
10. **"Still loading your tasks." sits over the first heading's bar**, which steps aside, rather than pushing the outline down. The heading's rule stays, under the line.
11. **A review hold (`?load=`) starts when the real tasks are in**, so each case shows its stated arrival time on any machine.

## 8. Seen and left alone

- **The phone's To-do and the Dashboard's Next up** (section 1, B0.5): the same cause, and the same fix available, `tasksReady`.
- **`WsSlim56`** (the slim bar, shown only once the header has scrolled away) still counts `all.length` while loading. It cannot show during a load from the top of the page.
- **The phone and Dashboard skeletons, and other pages' skeletons**, untouched.
- **7 worktrees besides the primary**, over CLAUDE.md's 5. All belong to other sessions, so none was touched.

## Deploy

One dev deploy for the night, after both parts:
- **Branch:** `dev/cr1-qc163-db3-acv2-cr5-qcc-acv21-nu1-cr11-acv211-nu11-td58-td581-td582-tl1` @ `c6c317087`, which is `todo-load-v1`'s tip. It contains `todo-list-v58-2` and fast-forwards the branch dev was serving.
- **Build:** `npm run build:dev` from a clean, detached checkout of that pushed tip.
- **Guard:** the deploy command refused to run unless dev still served `index-C2XX1fR5.js`; it did.
- **Dev now serves `index-B2Wbs__x.js`** (https://scriptally-dev.web.app).

Nothing went to prod or main.
