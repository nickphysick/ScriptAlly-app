# Query actions v1.2: the cleanup (28 Sep)

Your rulings: keep the sweep's agent-details and hand-off screens; delete the note screen; delete `RecordingCalendar` and the unused CSS in one cleanup commit, proved by tsc, the production build and before/after screenshots of every route; leave the review's stored settings in user data.

- **Commit:** `__COMMIT__`. **Deployed to dev:** `__BUNDLE__`.
- **Gates:**
  - tsc: 0 errors
  - production `vite build`: exit 0, no CSS diagnostics
  - Vitest: 497 files, 8,151 passed (3 skipped), 0 failed

## What was deleted

- **The note-crossing screen** in `HousekeepingSweep` (`noteSheet`), and what only it used: the `noteText` state, the footer's `extraFoot` slot, and the sweep's `quickDone` prop (removed at `ToDoPage`'s mount too).
  - **Checked unreachable before deleting.** A note card reaches the sweep only through the task pane's `host.openFlow`. That fires for a card whose journey does not commit in the pane, or for a flow whose write is a hand-off. A note (`userTaskId`) always resolves to the `note` journey, and `paneCommits("note")` is true, so the pane finishes it itself. The only hand-off flows are offer and fix.
- **`RecordingCalendar`:**
  - `src/components/todo/RecordingCalendar.tsx`, `src/lib/recordingCalendar.ts` and `src/components/todo/recordingCalendar.test.ts`;
  - its describe block in `journeyTakeover.test.ts`.
- **CSS: 53 classes and 109 rules from `todo.css`** (1,558 → 1,417 lines; 117 selectors). Two grouped rules lost only their dead half. Every surviving rule is verbatim from the old file.

  Classes removed: `.cal`, `.cal-d`, `.cal-dow`, `.cal-f`, `.cal-grid`, `.cal-h`, `.tdb-ffalso`, `.tdb-ffassume`, `.tdb-ffasub`, `.tdb-ffatick`, `.tdb-ffbig`, `.tdb-ffbigacts`, `.tdb-ffchoice`, `.tdb-ffchoices`, `.tdb-ffck`, `.tdb-ffcovered`, `.tdb-ffcs`, `.tdb-ffct`, `.tdb-ffdic`, `.tdb-ffdoor`, `.tdb-ffdoors`, `.tdb-ffdtx`, `.tdb-ffelse`, `.tdb-fff`, `.tdb-fffree`, `.tdb-ffgrp`, `.tdb-ffhint`, `.tdb-ffhubtl`, `.tdb-ffkbd`, `.tdb-ffnote`, `.tdb-ffoffernote`, `.tdb-ffopt`, `.tdb-ffremcard`, `.tdb-ffremic`, `.tdb-ffremnames`, `.tdb-ffremrow`, `.tdb-ffreplyby`, `.tdb-ffrow`, `.tdb-ffseg`, `.tdb-ffsel`, `.tdb-ffselrow`, `.tdb-ffseltx`, `.tdb-ffselwarn`, `.tdb-ffstar`, `.tdb-ffsweepr`, `.tdb-ffwhen`, `.tdb-jnbignote`, `.tdb-jnbx`, `.tdb-jnlede`, `.tdb-jnopts`, `.tdb-jnrow`, `.tdb-jnseg`, `.tdb-jnsub`.

## How each class was proved unused

1. **No emitter.** A script checked each class against every non-test source file, as a whole word. It treated any interpolated prefix (`tdb-ff${…}`, `"x-" +`) as a possible emitter, so such classes were kept.
   - **Two false positives were investigated and overridden.** `cal-${c.key}` in `todoCalendar.ts` is a React key, not a class. The bare word `cal` appears only as a URL value and an icon label.
2. **Not rendered.** A rendered-page probe found none of the 53 classes on `/queries`, `/todo`, `/todo/calendar` or `/dashboard`.
3. **tsc and the production build are clean.**
4. **Before/after screenshots of every route at 1440** (29 routes, full page: the 7 marketing pages and every workspace route, including the settings sections). The "before" set is the unmodified tip. To separate the change from the page's own movement, "before" was captured twice.

| Route | Noise: before vs before again (px) | Change: before vs after (px) |
|---|---|---|
| `about` | 0 | 0 |
| `account-data` | 0 | 0 |
| `account-notifications` | 0 | 0 |
| `account-plan` | 0 | 0 |
| `account-preferences` | 0 | 0 |
| `account-profile` | 0 | 0 |
| `account-security` | 0 | 0 |
| `account-tasks` | 0 | 0 |
| `account` | 0 | 0 |
| `agents-discover` | 0 | 8 |
| `agents` | 0 | 0 |
| `contact` | 0 | 0 |
| `dashboard` | 100 | 100 |
| `founders` | 0 | 0 |
| `help` | 8 | 0 |
| `home` | 0 | 0 |
| `import` | 8 | 8 |
| `manuscripts-comps` | 0 | 0 |
| `manuscripts-packages` | 0 | 8 |
| `manuscripts` | 0 | 8 |
| `plans` | 0 | 0 |
| `pricing` | 0 | 0 |
| `privacy` | 0 | 0 |
| `queries-analytics` | 0 | 0 |
| `queries` | 8 | 533 |
| `terms` | 0 | 0 |
| `todo-calendar` | 8 | 14 |
| `todo-noteboard` | 8 | 0 |
| `todo` | 17 | 17 |

**Every route is within its own noise except `/queries`, and `/queries` was investigated to the end.**
- Its 533 pixels are one line: the top edge of the Birds-eye rail's legend footer.
- An isolation run captured old CSS, new CSS, old CSS, new CSS, back to back.
  - **Two captures of the same old CSS differ by 541.** That edge moves between captures by itself, and the first "before" set simply didn't catch it.
  - **Old against new, captured seconds apart, differ by 8.**

The cleanup changes nothing visible. The screenshots are in `shots/before/` and `shots/after/`.

## What turned out to be used, so stayed

**`.cal-nav` stays.** It shares the calendar's naming, but it is shared chrome that the Noteboard and the To-do list emit.

Every other `tdb-ff*` / `tdb-jn*` class with an emitter kept all of its rules (76 classes, rule counts unchanged). Nothing in the deletion list turned out to be used.

## ⚠️ One gap in the proof

The sweep screen itself could not be screenshotted. Its live door is the task pane's "Update the record" on a single agent-data card, and the harness account has no such card on the board. The CSS removed from the sweep's family is therefore proved by the emitter check, the render probe and the build, **not by a picture of the sweep.**

## ⚠️ Found, for you to rule on: "Start the sweep" has had no caller since 19 Aug

`performCardVerb` in `ToDoPage.tsx` is the only thing that opens the sweep's **group** sheet, the batch "Start the sweep". It has had **no caller since `bcd7af63c` (19 Aug)**. Since then the task pane has done that job itself, with its own `BulkFillTable` on the bulk card. So:
- the sweep's live screens are the two you kept: one agent's details, and the `agent_recheck` hand-off;
- **the group sheet, and the "Start the sweep" wording the v1.1 report called unchanged, have been unreachable for over a month.**

Nothing was touched there. Deleting the group sheet and `performCardVerb` would be its own small cleanup, if you want it.

## The review's stored settings, left in user data (for a later data tidy)

- `todoPrefs.weeklyBriefing`. The next preference save drops it.
- `"sunday_review"` in `mutedTaskRules`.
- `weekly_review` task-flag documents (`flagKeyForTask("weekly_review", …)`) in `taskFlags`.
- localStorage, per device: `sa.todoReviewSeen` and `sa.todoReviewDismissed`.

## Also in this commit

`tests/e2e/routeShots.measure.ts` is the route capture and compare tool. It captures every route (or `SHOTS_ONLY=…` for a few), compares any two sets, and should always be run against a second "before" capture to measure noise first.
