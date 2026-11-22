# To-do list v7, 29 Oct

`/todo` (desktop) restyled to `design-refs/todo-list-v7/todo-list-v7.html`:

- The house header card.
- A Today strip.
- A "Your tray" section.
- The seven simplifications.

The phone page, "Nothing yet", the Corkboard and every other page are untouched.

## 1. False premises (named first)

1. **"The drawer is still where drag-a-row-onto-a-day lands" (Phase 1 §2) was false.** The drop targets were the cells of the in-page month, which this run removes. `TrayCalDrawer` has no drop handlers and opens behind a scrim. **I stopped and asked.** Your ruling (29 Oct):
   - Drag is retired, and the date menu is the only way to move a date.
   - The menu keeps its presets, and "Pick on the calendar" becomes **"Pick a date"**, opening the compose card's `MonthCal` inside the same popover.
   - The setAsideRules guards stay.
   - `TrayCalDrawer` stays read-only and untouched apart from the open button.
   - The TD52 drag lock is retired, and a lock proves "Pick a date" moves a task, with Undo (TD7 LP).
2. **The run order's `…-calx` branch did not exist when this prompt first ran.** The Calendar retirement ran first, at your instruction (`reports/retire-calendar-v1/REPORT.md`), and its dev branch is this run's base.
3. **L4 as written ("no `kbd` inside the tray's navy row") would fail the ref itself:** the ref's find field carries a "/" key box. The lock asserts that no key hint except a control's own is left in the row or the tray. The two exceptions are the find field's "/" and the pin's hover tooltip "F" (`PinListButton`'s label, which `pinRow.measure.ts` treats as part of the control). The removed J / K / E and N are asserted gone.
4. **The pack arrived in `~/Downloads`, not the repo root.** It was copied in and every hash checked.

## 2. Base, pack, counts

- **Base:** `dev/pk391-qm1-pk392-calx` at `d6726195` (the Calendar retirement on top of `dev/pk391-qm1-pk392` `fca44895`).
- **Pack:** all 19 files OK against `SHA256SUMS`. `todo-list-v7.html` = `bdaff352…824e`. It is committed first (`b1cc820b`).

| Gate | Baseline | Final |
| --- | --- | --- |
| tsc | 0 errors | 0 errors |
| production build | no `error` / `[WARNING]` | no `error` / `[WARNING]` |
| Vitest | 685 files · 10,687 passed · 3 skipped | 685 files · 10,692 passed · 3 skipped (+5 new unit cases) |
| `todoV52.measure.ts` | 19 passed · 4 failed (A2, A4, E1, H1, red before this run) · 1 skipped | 13 passed · 2 failed (E1, H1: both fail identically on the base build, re-run there against dev) · the retired cases removed |

**Commits** (on `todo-list-v7`, oldest first; the final report commit follows):

- `b1cc820b` To-do list v7: the design pack (todo-list-v7.html, screens, SHA256SUMS)
- `387c61d7` To-do list v7 Phase 1: the header card, Today, and Your tray
- `d7bf3b0c` To-do list v7 S1: Today shows counts only
- `96af1012` To-do list v7 S2: one navy bar
- `39f07122` To-do list v7 S3: no tab strip over the tray
- `2e8acb5e` To-do list v7 S4: plain group headings
- `7cfc453f` To-do list v7 S5: dates as words, and one door to move a date
- `fc512c83` To-do list v7 S6: a calmer desk card
- `1137ebf1` To-do list v7 S7: Done today on one line
- `8d014d61` To-do list v7: delete the v5 header's rules
- `2304ce93` To-do list v7 Phase 3: the locks, the retirements, and two fixes they found

## 3. Component by component

- **`TrayHeader.tsx`:** rewritten.
  - `TrayHeader` is now the shared `PageHeaderCard`, mounted as Responses and the Contact list mount it. "To-do list" sits on the blush highlighter, followed by the body lines word for word, "+ Add a task", "Set aside · n" and `MENTOR_ART`. The h1 keeps `data-page-title`.
  - New: `TrayHeadline` ("{o} overdue · {t} due today", the overdue part rust; "All caught up") and `TraySection` (the typewriter section heading).
  - Deleted: `ClearedRing`, `TODO_EYEBROW`, `TODO_SHADOW`, `titleWords`, the title fit, and every `.td5-hd` / `.td5-card` rule (61, in `8d014d61`).
- **`TrayCalendar.tsx`:** v5.2's calendar card (the day panel beside the month, the mix bar, the hover peek) is deleted. `TrayToday` is the Today card, built from the same day-panel rows and `lib/trayCalendar` figures (the same `cal-row` filters). The date helpers the drawer reads stay.
- **`TodoTray.tsx`:**
  - Today shows on the populated page only.
  - The "Your tray" heading.
  - The navy row holds Find (translucent), "Filters" (a strip of the same pills under the row) and the pin.
  - The Set aside view's sentence and "Back to your tray" button.
  - The tab strip is gone.
  - Plain bands, with the rust "!" on Your move.
  - Dates as words.
  - Drag is retired.
  - `scrollRowIntoView` scrolls the tray's own scroller, never the page.
- **`TrayDesk.tsx`:**
  - `DueWords` replaces `DueDial` in tray rows. It keeps `data-td5="dial"`, so the date text opens the date menu.
  - The desk's big dial, the band's tag and the "E act" hint go.
  - `DoneToday` takes `fold` (the heading line and one Undo).
  - `DueDial` stays, for the caught-up and "Nothing yet" pages.
- **`TrayDialMenu.tsx`:** "Pick a date" with `MonthCal` inside, from tomorrow to the ceiling. Under a passed send-by, no month is shown. `refusal()` is still the last word.
- **`lib/trayRows.ts`:** `lateWords` (lateTag's thresholds, in words).
- **CSS:** `todoV7.css` (new; desktop only). In `todoV5.css` / `todoV52.css`: the v5 header, the calendar card, the strip, the tab, the band drawings and the bump keyframes are deleted.
- **Kept on purpose:**
  - The mid-task signals, the pin, bulk close, the one-screen sheet, and `TrayCalDrawer` (untouched).
  - `ComposeCard` keeps its own small-capitals tag (out of scope).
  - The caught-up page keeps its slips and dials.
  - The tray groups' `art` field in `lib/todoTray` is now unread; it stays, for you to decide.

### Deliberate deviations from the ref

- **The Set aside view hides Find and Filters.** They narrow the tray, not that list, and beside the sentence and its button they ran the row off its edge at 1280. The ref's own row overflows there (screen 05).
- **Greys are v5.2 §F.4's** (`--td5-ink62` / `--td5-ink70`), not the ref's 55–58%. Those measured 3.9–4.47:1 under TD52 F3.
- **The column is the latest header rule's:** `min(sheet − 48, 1200)` (Query Centre v150.1 / Contact list v25). L1 holds the card to the Contact list's box.

## 4. Locks

`tests/e2e/todoV7.measure.ts`: TD7 L1–L10 and LP. On this build: **12 of 12 pass** (`reports/todo-list-v7/ledger/`). Against the base build (`d6726195`, served locally): **all 11 locks red** (L1–L10 and LP; the twelfth result was the sign-in step), ledgers in `reports/todo-list-v7/redfirst/`. LP's guard put its probe task back on the base run too.

| Lock | What it holds |
| --- | --- |
| L1 | PageHeaderCard with "To-do list" (`data-page-title`), both buttons wired, `MENTOR_ART`; its left, width and top equal the Contact list card's (±1) at 1280, 1512 and 1920 |
| L2 | Three count buttons, no month grid or mix bar on the page; Overdue filters and sets `aria-pressed`, and a second press clears it; "Open the calendar" opens the drawer |
| L3 | The header card above Today above "Your tray" above the sheet; scrollTop 0 on load at 1280 and 1512 |
| L4 | Find and Filters in the navy row; no key hint in the row or the tray; no find or filter row outside the sheet; Filters toggles the strip (pink while open) |
| L5 | No `role="tablist"`; the header's Set aside opens the view; the row reads "Set aside: n tasks waiting to come back"; Back returns |
| L6 | No `img` in any band; the paper tint; the "!" on Your move only (the Set aside view's bands included) |
| L7 | No ring in any row's date; overdue dates read `d Mon`, with an age ending "overdue"; undated rows read "No date" |
| L8 | No tag or image in the desk band, no dashes, "n of N" kept, nothing uppercase in the card |
| L9 | "Done today · …" on one line, no slips |
| L10 | Pinned at 1280 and 1512: the header and Today hidden, Find and Filters in the row, `scrollWidth ≤ clientWidth` |
| LP | "Pick a date" moves an own task (probe written and removed); today and the past refused; Undo byte for byte; no row draggable |

The re-pointed TD52 cases also caught two of this run's own faults, both fixed in `2304ce93`: the ref's greys failed contrast (F3), and the date in words did not dim during a journey (J3).

Retirements and re-points: [`tests/e2e/RETIRED-todo-list-v7.md`](../../tests/e2e/RETIRED-todo-list-v7.md).

## 5. Screenshots

All nine states at 1280 and 1512 are in `reports/todo-list-v7/shots/`, named as the pack's `screens/`, so each pair sits side by side. Every state matches the ref's layout. The differences, each explained:

- **The figures** are the harness account's (54 tasks), not the mock's 15.
- **Type:** the app renders Special Elite where the ref's screenshots fall back to a plain monospace.
- **05 Set aside:** Find and Filters are hidden there (§3), where the ref's row runs off its edge.
- **The greys** are v5.2's darker ones, for contrast.
- **08 and 09** use the harness's forced states over real data.

## 6. Dev

- **Dev branch: `dev/pk391-qm1-pk392-calx-pk392b-td7`** (merge `e8d6b4b9`, plus this report). It is built on `dev/pk391-qm1-pk392-calx-pk392b`, **not** on `…-calx` as the brief named. Another session pushed and deployed that branch (Submission packages v39.2 rework) on top of my Calendar retirement while this run worked. A `…-calx-td7` deploy would have taken their work off dev. The two touch no file in common, and the merge was clean.
- **Gates on the merged tree:** tsc 0 errors; Vitest 685 files · 10,692 passed · 3 skipped; `build:dev` with no `error` / `[WARNING]`.
- **Deployed** (hosting only, `--config firebase.dev.json --project dev`) from a clean tree. **Dev serves `index-DuL29EB3.js`**, the build of that branch.
- `todo-list-v7` and the dev branch are pushed. Prod is untouched.

## 7. For Nick

1. The tray groups' `art` field (`lib/todoTray.TRAY_GROUPS`) is no longer drawn anywhere. Delete it, or keep it for a future surface?
2. The pin's tooltip still shows its "F" key. It is the only key hint left on the page apart from the find field's "/".
3. Prod is untouched. No rules or functions changed.
