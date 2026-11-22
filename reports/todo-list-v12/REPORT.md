# To-do list v12 — report (29 Oct)

Ref: `design-refs/todo-list-v12/todo-list-v12.html` and its 13 screens. These are the v5.2 ref with the v6–v12 overlays; the later overlays win.

## 1. False premises (named first)

1. **v7 had already run, and the base carries it.** The prompt says it *replaces* `cc-prompt-todo-list-v7.md`, which "must not be run". But v7 was run earlier the same day, merged into the dev chain (`…-calx-pk392b-td7`), and every dev branch since is built on it. The base the prompt names ("the newest dev branch, carrying the Calendar retirement") is therefore a v7 page, not v5.2.
   - `cc-prompt-todo-list-v7.md` and the pack zip were **not in the repo root**. Both were in `~/Downloads`, and I left them there. The pack's hashes all check.
   - Because v12's ref contains v7's overlay, I **built on v7 rather than undoing it**.
2. **P1 and P5 describe v5.2, not the base.**
   - P1: the base's `TrayHeader` already renders the shared `PageHeaderCard` (v7), and `TrayCalendar` holds v7's Today card, not the header calendar card.
   - P5: there is no tab strip; v7 S3 removed it, and Set aside is reached from the header's button and left by the row's "Back to your tray".
   - On the base, v7 had already delivered these v12 items:
     - **W2:** no tab strip; Set aside from the header.
     - **W3:** plain bands.
     - **W4:** dates as words; no desk dial.
     - **W5:** drag retired; "Pick a date" with `MonthCal` in the date menu.
     - **W6:** a calmer desk card.
     - **W7:** Done today on one line.
     - **Phase 1 §1:** the shared header card.
   - P2, P3, P4 and P6 are as stated.
3. **Phase 3 §3's source.** "The next dated items `lib/trayCalendar` already knows about" does not hold. On the caught-up page the board is empty, so `trayCalendar` knows only snoozes and unsurfaced own tasks. The existing caught-up source was `comingUp` in `lib/todoTray`. I extended it with a `kind`, the query and the agent, plus the planned-nudge case, which `taskDue` already treats as the day the nudge task lands.

## 2. Base, pack, counts

- **Base:** `origin/dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393` at **`c3d2fc5c`**. It carries the Calendar retirement (`d6726195`) and v7 (`db8e4d41`).
- **Pack:** `todo-list-v12-pack.zip`. All 28 lines of `SHA256SUMS` are OK, and both named hashes match (`cf71284c…` for the html, `71885f5a…` for the tile). Committed first as `cca76c30`.

| Gate | Baseline (`c3d2fc5c`) | Final (`todo-list-v12`) |
| --- | --- | --- |
| tsc | 0 errors | 0 errors |
| production build | no `error` or `[WARNING]` lines | no `error` or `[WARNING]` lines |
| Vitest files | 3 failed, 687 passed | 3 failed, 688 passed |
| Vitest tests | 1 failed, 10715 passed, 3 skipped | 1 failed, 10719 passed, 3 skipped |

The three failing files are the same in both runs and are all under `functions/`: `eval/run`, `email`, and `smartImportCore`'s SDK-ceiling test. Nothing in `src` is red.

## 3. Component by component

### `TrayHeader.tsx`

- One header in all three states. The populated and all caught up body is "Your tasks for {manuscript}, most urgent first: pages to send, agents to chase and details to fill in."
- Nothing yet has its own body and buttons: "+ Log your first query" opens the Log door, and "Import from a spreadsheet" goes to `/import`.
- `TrayHeadline` (the "Your tray" line) is deleted.

### `TrayNow.tsx` (new)

- `NowCard`: one card grammar shared by Needs you now, Coming up and the Nothing yet example.
- `NeedsYouNow`: the heading, the summary with its overdue part in rust, an always-on Calendar button that opens `TrayCalDrawer`, and ← → arrows shown only while the cards overflow.
- `CaughtAck`, `ComingUpCards` and `NothingYetWell`.
- ⚠️ The carousel resets to its first card whenever its set of cards changes. The cards arrive in stages while the board loads, and the snap container re-snapped to the first card it had shown, wherever the final order put it. It measured `scrollLeft` 4064 on load, with the offers out of view.

### `lib/todoUrgent.ts` (new)

- `isUrgent`, `urgentOrder`, `urgentFigures` and `urgentSummary(Text)`, all pure, with unit tests.
- The urgent set is cut from the tray's own items. The tray draws everything `isUrgent` refuses.

### `TodoTray.tsx`

- **The desk:** it can hold a Needs you now task, and its position line then reads "From Needs you now". The commit sequence's order is now the desk's whole sequence (carousel, then tray), so a finished carousel task reads as "left the board", not "has no row".
- **The open toolbar (W1):**
  - At rest: Find (300 wide), Filters and the sort on the left; the pin on the right.
  - Mid-task: "Task in progress", the dashes, "Step k of n" and "Esc step back", in ink.
  - Set aside: the view's sentence at 19px and "Back to your tray".
  - Pinned, as the ref's 06 draws it: Filters as its icon, the sort and the day chip on the left, then Find, PINNED and the pin.
  - No sentence and no row hints. Find's "/" is drawn as a mark, not a `<kbd>`.
- **The quiet states:** Caught up and Nothing yet render no sheet.
- **Empty filter:** the "hidden by it" count is the tray's own (`rest`), not every item.
- **New attributes:** each tray row carries `data-due` for the L2 lock.

### `TrayEmpty.tsx`

- Reduced to the two art constants.
- v5's quiet pages are deleted, rule and element: the navy panel, How it works, the feature strip, the Ways tiles, the armchair card, the dial rows and the slips.

### `TrayCalendar.tsx`

- v7's Today card is deleted. The date helpers the drawer shares stay.

### Stylesheets

- **`todoV12.css` (new):** Needs you now, the toolbar, the doodle tile, the band, Coming up and the well.
  - The 3-or-2 card rule is a **container query on the page column** (1000px). It replaces the ref's 1300px viewport query, because the ref has no sidebar.
  - The tile is `#f2eee8`, 340 × 360, `local`, on the page's scroller, as in contactV25 A1, and is not shown while pinned.
- **Dead CSS swept:** 48 classes with no emitter in `src`, from `todoV5.css`, `todoV52.css` and `todoV7.css`.
- **Kept:** `TrayCalDrawer` unchanged apart from opening it from the new button. `ComposeCard`, `lib/queryActions/*`, `PageHeaderCard` and its CSS are untouched.

## 4. Locks

`tests/e2e/todoV12.measure.ts`, run against a local dev build at 1512 × 900 and 1280 × 800 (L1 also at 1920). Ledgers are in `ledger/`.

**Final run: 15/15 green, 289 readings.**

| Lock | Red first |
| --- | --- |
| L1 header ×3 states | base: 39/51 (`ledger/base-L1.json`) |
| L2 carousel = `urgentOrder(isUrgent)`, no double listing, sums to the badge | base 10/20 |
| L3 card → desk, button → journey, finished card leaves | base 0/3 |
| L4 order, 44px under the header, scrollTop 0 | base 2/6 |
| L5 the white toolbar, no kbd, nothing navy | base: timed out with no toolbar to read |
| L6 no tablist; Set aside and back | base 5/6 (the 19px title) |
| L9 Pick a date moves with Undo; a drag does nothing | base: timed out with no Calendar button |
| L12 doodle tile | base 2/6 |
| L13 all caught up | base 2/18 |
| L14 nothing yet | base 2/16 |
| L7 no band images; "!" only on Your move | already green on the base (v7); **mutation** `TD12_MUTATE=L7`: 14/17 |
| L8 dates as words | already green on the base; mutation L8: 44/46 |
| L10 nothing uppercase in the desk card | already green on the base; mutation L10: 6/8 |
| L11 Done today without slips | already green on the base; mutation L11: 2/4 |
| L15 pinned hides the top | already green on the base; mutation L15: 12/14 |

**Retirements and re-points:** see [`tests/e2e/RETIRED-todo-list-v12.md`](../../tests/e2e/RETIRED-todo-list-v12.md).

- The v7 suite is retired whole, each case mapped to its v12 lock.
- TD52 F1 is retired.
- TD52 C1, E1, F2, F3, H1 and J1 are re-pointed.
- ⚠️ **F3 had gone vacuous.** It skips "text over a picture", and the doodle tile on the scroller made every text one, so it read **0**. It now treats the tile as ground.
- F3 also gained the tray scroller's own clipping. It had read a clipped row's date against the shell's ink beneath the sheet.

**TD52 after re-pointing:** C1, E2, F2, F3, G3, J1, J2, J3 and J4 are green. E1 (27/46), H1 (13/16), L1 (80/86) and H2 (the page closes mid-case) **fail identically on the base build**. I ran TD52 against `c3d2fc5c`, and E1, H1 and L1 show the same pass counts as on v12 and H2 the same error.

## 5. Screenshots

`shots/`, named as the pack's screens (01–13 at 1512 and 1280), to set beside `design-refs/todo-list-v12/screens/`. Where they differ from the ref, and why:

- **The shell** is the app's current shell (the folder tab, the sidebar), which postdates the ref's drawing.
- **The data** is the harness account's. Thirty tasks are urgent there, so the carousel is long, and every nudge on it is overdue, so no "Worth a nudge" row is left in the tray.
- **Coming up (11)** shows "Reply expected" three times. The account's next three dates are all reply dates, all for one agent.
- **05:** the journey's own small-capitals labels are unchanged, as instructed; see §6.

## 6. Small-capitals labels left in the journeys and the compose card (a separate pass)

- **The compose card** (`todoV5.css` `.td5-qh b`, `.td5-qh .td5-r`, `.td5-chp small`):
  - "When is it due?"
  - "When should it come to the top of your tray?"
  - "Paper"
  - "Link it to · optional"
  - "Tags · optional"
  - "Due by …"
- **The journeys** (`queryDrawer.css`, `sendExtras.css`, `sentHow.css`):
  - `.qad-stp em`
  - `.qad-dock .qad-dk` and its `small`
  - the stepper's small labels
  - `.sx-rq`
  - the mode label over the title (for example "OFFER OF REPRESENTATION")
  - "WORTH A LOOK"
  - the "QUERIED · AGENCY" lines in the offer journey
  - In the to-do desk only: the desk band's own "YOUR MOVE" and "STEP k OF n" (`.td52-wband`, the journey shell's).
- **Elsewhere on the page and untouched:**
  - the row tags "Started" and "Back today" (`.td5-tag`)
  - "Saving…" (`.td52-saving`)
  - the date menu's head
  - the restored PINNED label: the ref draws it, and v5.2 H.5 added it, so it is not new.

## 7. Dev, and what is left for Nick

- **Branches:** `todo-list-v12` is `cca76c30` (the pack), `dd362a88` (Phases 1–4) and `b62e77c1` (Phase 5).
  - Phases 1–4 share one commit because they edit the same render in `TodoTray.tsx`. Splitting it would have meant committing intermediate states no gate had run on.
  - W2–W7 needed no commit of their own: they were already on the base from v7.
- **Dev branch:** `dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2-td12`. It sits on **`…-pa2-2`**, not on my base, because another session pushed two newer dev branches (phone app v2) while this ran, and building on mine would have taken their work off dev.
  - The merge was clean, and the gates on it are no worse than the base (3 failing `functions/` files as before; 690 files and 10,731 tests pass).
- **Deployed:** dev hosting only. **dev serves `index-Br61DMeD.js`.** Prod is untouched.

**For Nick:**

1. **The pin tooltip's "F".** It is a `<kbd>` in the shared `PinListButton`, which other pages use. L5 exempts it by name rather than editing the shell; it was already open from v7.
2. **The Coming up band names.** I named them by what lands:
   - a planned nudge → "Worth a nudge"
   - the check-back after a nudge → "Check back"
   - an agent's reply date → "Reply expected"
   - an own task → "Your task"
   - a snooze's return → "Coming back"

   The ref draws the first three without saying which data each is.
3. **"Open the query" in Coming up** shows only where there is a query. Own tasks and snoozes of own tasks have none.
4. **The summary and an overdue offer.** An overdue offer counts in both "overdue" and "an offer to answer", as in the ref's own arithmetic.
5. **Still unmounted** (from the Calendar retirement): `TimelineBoard`, `boardWindow`, `useSegHover` and `TasksPageLayout`.
6. **E1, H1, L1 and H2** are red on the base too.
