# To-do list v55 — a one-line list head, plus two dev bugs

Branch `todo-list-v55`, cut from `dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54-cl27b-yn1-laq1-qc1534-aa1-laq11`
at **510c1cec3** — the commit dev was serving (`index-uz3iJgBA.js`, Sentry release stamp `510c1cec3`). It carries v54
(both `a39b8d09f` and the v54 report `c7682dd26` are ancestors). Ref `design-refs/todo-list-v55/todo-tray-head-v2.html`,
sha256 `9c684b6f…92c9` — matched. Desktop only; no phone file differs from the base (L10).

## False premises

1. **"Jonathan Marsh's full request should read 953."** On the emulator's copy of the harness account (exported from
   dev on 2 Nov), Jonathan's full (`cv25-q-09`) moved to Full Requested on **24 Sep 2026**, so it reads **48 days
   waiting** today. 953 is the mock's number. Nick's dev data may differ, and this session didn't read it (emulator only).
   If dev's Jonathan has no request date and no status date — only the date the query went — see "Bug 1" below:
   that figure can't be worked out, and the app now shows none rather than inventing one.
2. **"Reuse the tray's existing search logic; no new matching rules."** True. `passes` (title, agent, agency) already
   matched all three, so D2 is a new field over the old matcher.
3. **Bug 2, "a stray TO-DO LIST label over the tray": not reproduced.** Not on the emulator dev server or a
   production-style emulator build. Not at 1366, 1440 or 1920, at rest or scrolled. Not in dev's served entry chunk
   either. Nothing in the To-do workspace renders "To-do list" visibly except the shell's folder tab ("TASKS ·
   To-do list"). Since v54 pinned the workspace 12px under the scroller's top, that tab sits directly over the tray's
   top-left corner. I didn't remove it: it's the shell's page name, on every page. L8 stands as a guard: no
   "To-do list" text inside the tray or drawn over its box, at three sizes, at rest and scrolled.
   **I need a screenshot to go further.**
4. **"/" opening search was not a To-do problem — the page's keys were dead on arrival.** An open Escape layer stands
   down every page key (/, J, K, S, D, N). On arrival one was always open. It came from the **Submission packages**
   builder (`Pk393Builder`, packages v42): every workspace page stays mounted, and the builder opens its first missing
   step by default, so it held a layer app-wide from the moment the app loaded. The packages page already gated its
   other overlays on `routeActive`; this one is now gated the same way (`onScreen`, three files, one line of behaviour).
   Outside the brief's scope, but D2 can't work without it. The same layer would also have stood down the Contact
   list's and the Query Centre's row keys.
5. **"Category stays the default"; the When chips read "No date".** Both done as specified. Two small mismatches are
   left as they were:
   - The When *group headers* (v54's rows and headers, untouched) still read "Not dated", where the chip and the
     mock's hint say "No date".
   - The mock's Category hint omits "Your tasks", which the app's Category grouping draws.

## Step 0 — the answers

1. **The tray's head as v54 left it** (all in `TodoWorkspace.tsx`, `.tws-th`):
   - **Tabs:** a segmented control `.tws-seg` reading "To do {n} · Snoozed {n} · Done {n}"; it switched `tab`.
   - **The bar:** `.tws-bd` / `[data-tws="bar"]`, three coloured parts (waiting, nudges, quiet); a part scrolled the
     tray to its group.
   - **The counts line:** `[data-tws="bar-words"]`, "{n} need you · {n} late · {n} to tidy".
   - **Search:** `.tws-find`, a box filtering `filters.q`.
   - **Filters:** an icon button `.tws-ib` opening a menu (type and when chips with counts, zero ones disabled), plus
     "Manage your tags" and "Tasks you've switched off".
   - **Group:** a second icon button opening a "Group the tray by" radio menu.
   - **Collapse:** `[data-tws="collapse"]`, giving v52's 112px strip of rows.
   - **Chips:** a row of removable filter chips under the head.
2. **Where the state lived:**
   - `filters` (q, types, whens) and `grouping` were React state in `TodoWorkspace`, never saved.
   - The vocabularies are `WS_TYPES`, `WS_WHENS` and `WS_GROUPINGS` (with hints) in `lib/todoWs.ts`, filtered by
     `passes` and grouped by `wsSections`.
   - The collapse was saved **per device** in `localStorage["sa.todoTraySlim"]` (v52 Part B).
   - Only v54's `todoPrefs.batchView` was saved to the account.
3. **Bug 1 — the cause, two faults compounding:**
   - **The request date is missing.** `waitAnchorMs` (`lib/todoBuckets`) counted a partial or full request only from
     `partialRequestedDate` / `fullRequestedDate`. A query written straight to the request status (seeded, imported or
     set by hand) never gets that derived field. On the emulator copy, 5 of 13 requests have none, Jonathan's among
     them; his only record of *when* is `lastStatusChange`.
   - **The missing date became today.** `trayItem` (`lib/todoTray`) replaced the missing anchor with **now**. So the
     row's "{n} days waiting" and the header legend's longest wait both counted from today and read **0**. That broke
     the rule written above `waitAnchorMs` itself: "no fallback to today".
4. **Bug 2:** not reproduced; see false premise 3.

## What was removed from the head

The segmented tabs and their Snoozed and Done counts, the breakdown bar, its counts line, the search box, the separate
Filters and Group buttons, and the chips row. Kept, under a rule at the menu's foot: **"Manage your tags"**. It is the
only way in to tag management, and it is not a filter. "Tasks you've switched off" stays where it also lived, at the
foot of the Done tab.

## Commits (branch `todo-list-v55`)

| Phase | Commit | What |
|---|---|---|
| A–D | `e1315fe16` | The one-line head, search, the filter and group menu, the dot and the filter line, the 64px strip, the saved prefs. **One commit, not four:** the four share one component (`WsTrayHead55`) and one block of state in `TodoWorkspace`, and splitting them would have meant committing half-wired code. |
| E | `52e74c6d7` | Bug 1 at its cause, with `daysWaiting` the one figure for the row and the legend. |
| B (fix) | `2f95cd57f` | The Submission packages builder's Escape layer held only while that page is on screen (false premise 4). |
| G | see `git log` | `todoV55.measure.ts`, `seedTd55.mjs`, `td55Mutate.sh`, the re-pointed v52 and v53 cases, this report. |
| F | — | Nothing to change: the label isn't reproduced (false premise 3). L8 guards it. |

## Gates against the baseline

**Baseline** (`510c1cec3`, before any edit): tsc 0 errors; `build:dev` and the production build clean (no errors or
warnings); Vitest **4 failed / 11,818 passed**. All four are in files outside To-do:
- emuGuard: `cb21Emu.sh`;
- firestoreTarget ×2: 28 `cl25x` scripts;
- `smartImportCore`'s streaming check.

**After:** tsc 0; both builds clean; Vitest **3 failed / 11,870 passed**. The same files, minus `smartImportCore`,
which passed this time. No new failure.

## Locks (`tests/e2e/todoV55.measure.ts`): red, then green

Green: **16 / 16** on a freshly imported fixture (L1, L5, L8 at 1440 × 900, 1920 × 1080 and 1366 × 768; the rest
once), plus the screenshots case. Each mutation was applied by `tests/e2e/td55Mutate.sh` and turned its lock red
(`mutation-proofs.txt`):

| Lock | Break | Red at |
|---|---|---|
| L1 one line | the icons wrap to a second line | "they share one row" |
| L2 search | "/" never reaches the page · the search filters nothing (source) | "'/' opens the search field" · "to fewer rows" |
| L3 the dot and the line | the dot hidden | "the rust dot is on the icon" |
| L4 regroup, count still | the count changes under Agent | "agent: the To do count is unchanged" |
| L5 the strip | the strip 112 wide | "the strip is 64px" |
| L6 saved | the collapse not written (source) | "both are written to the account's prefs" |
| L7 days waiting | the figure reads 0 · `waitMs` removed (source) · a full request reads its request date only (source) | "its true days waiting" · "no request reads 0 days waiting" · "its true days waiting" |
| L8 no stray label | a "To-do list" span in the tray | "at rest" |
| L10 the phone | a phone file touched (source) | "no phone file differs from the base" |

- **Unit:** `src/lib/daysWaiting55.test.ts` (9 cases: a request with its date, one with only a status date, a partial
  request with no response, neither, the row and the legend agreeing, an own task). It is red (2 failed) with the
  request fallback removed.
- **L9 — v54's locks:** 15 / 15 (`todoV54.measure.ts`). One run lost L9 (the 14-query batch log's snackbar did not
  appear within 10s). It was green on a freshly imported fixture: a slow write on a busy machine, or residue from the
  mutation runs that came just before.
- **v53:** 23 passed, 3 skipped (L9 retired at three sizes). One earlier run lost L4+L5 at 1440 and 1366. It is green
  here, and it is the case my v54 notes already record as intermittent. L10/L11 re-pointed (see
  `tests/e2e/RETIRED-todo-list-v55.md`).
- **v52:** 8 passed, 9 skipped (five retired earlier, four by v55), 2 failed. The two are **L1 at 1512 and 1920**,
  red before v55: the frame is 1360 / 1596 wide against the case's 1320 cap, from the 7 Nov page-width change, and
  v54's report records the same.
  - **A knock-on from saving the collapse:** one v52 case collapsed the tray and the next opened on the strip. v52's
    set-up now clears the two prefs.
- **Re-pointed and retired:** listed with reasons in `tests/e2e/RETIRED-todo-list-v55.md`.
- **A conflict with v53 to flag:** v53 retired the words "No date" from the page, because they read as a missing
  figure. v55's D3 brings them back on the When chip, following the mock. I followed D3; L11 now keeps "No date" out
  of everything but the menu.

### Where the prefs are saved

`users/{uid}.todoPrefs.trayGrouping` ("category" · "urgency" · "when" · "agent" · "none") and
`users/{uid}.todoPrefs.trayCollapsed` (boolean). They sit beside v54's `batchView`, written one leaf each through
`updateUserPaths`. `todoPrefs` is an unconstrained map, so there is **no rules change**. Absent means Category and
open. Filters and search are never saved. v52's per-device `sa.todoTraySlim` is no longer read.

## Bug 1 — what changed

- **The request date.** A request with no request date now counts from its status's last move: the card exists only
  while the status *is* that request, so that move is when the agent asked (R&R has always read it this way). Still no
  date when neither is stored.
- **The missing date.** `TrayItem.waitMs` carries the record's own anchor, or null. `anchorMs` keeps its fallback for
  the sorts only.
- **One function.** `daysWaiting` (`lib/todoWs`) is the one figure. The row (`trayFigure`) and the legend (`needRows`)
  both read it, and so does Gone quiet's day count.

**What the writer sees:**
- Jonathan reads **48 days waiting** where it read **0**.
- Of the 16 waiting requests on the account, **11 show a figure**. The other **5** have no request date and no status
  date. They used to read "0 days waiting" and now show nothing, the workspace's rule for a task the record can't
  date. Their only date is when the *query* went, which is not when the agent asked, so it isn't used.
  **If dev's 953 is one of these, the figure can't be worked out from the record**, and that is the question for Nick.

## Screenshots (`reports/todo-list-v55/shots/`)

`head-at-rest.png` · `search.png` (a search for "marsh") · `menu-open.png` (Nudge and Overdue on) · `filtered.png`
(the dot and "Showing … · Clear") · `collapsed-strip.png` · `jonathan-days.png` · `page-1440.png`.

## Dev

DEV_PLACEHOLDER

## Not done, and why

- **Bug 2:** not reproduced (false premise 3). It needs a screenshot.
- **Dev's 953:** not checked against dev's data (emulator only). The open case is a request whose record has no date
  for the request.
- The When group headers' "Not dated" against the chip's "No date": the headers are v54's and the brief kept them.
