# To-do list v5.2 — the calendar in the header, one drawing per group, the pin, mid-task signals and the finishing touches

Branch `todo-list-v5-2`, commits `99382fb0` → `1adc2aee` in the pack's order B, A, C, D, E, F, G, H, J, I, then **G.3 `8fba8313`** once Nick lifted the fence on `CloseJourney` (17 Oct). **Not merged to main. Nothing to prod; prod rules untouched (no rules change in this pack).**

## False premises

1. **`lib/todoCalendar` is taken.** It is the Calendar page's module. Part B's derivation is `lib/trayCalendar` (same contract: `calendarKind`, `calendarDay`, `calendarItems`, `dayBuckets`).
2. **The drawing table's tops describe a 50px band.** At the table's widths every drawing's foot lands 3px above a **50px** floor (talon 42 wide → 58.4 tall, top −11 → foot 47.4). The app's bands are **44** (compact — both measured sizes, since the sheet is only "wide" past 1440px of sheet) and **56** (sheet-wide). Built: the foot is anchored `bottom: 3px`, the slot centred at x 31, widths the table's on 56px bands and scaled **44/50** on 44px bands (talon 37, hourglass 43.1, pile 44, index hawk 46.6, quill 38.7). D1 asserts width, centre and foot, not the table's tops.
3. **"An unsurfaced own task opens its card on the desk the way v5.1's Coming up does"** — v5.1's Coming up rows are not pressable (`TrayEmpty.tsx`: plain `div`s). Call: the drawer opens an unsurfaced own task on v5.1's compose card in edit mode (the own task's own Edit route).
4. **The close journey's noreply save could not run without its UI** (§0.6), so G.3 stopped at first. **Nick then allowed the edit to `CloseJourney`**: the save is now a function (`lib/queryActions/closeSave`), the journey calls it, and G.3 is built (`8fba8313`). H.6's order has all five layers.
5. **TD5 C2 has no desk-head art assertion to retire** — its "art breaks out" check reads the tray bands, which still do.
6. **"Compact bands (44 tall) scale by the same ratio as v5.1"** — v5.1 used one set of pixel values at both band heights (ratio 1); see 2.
7. **The reference's day panel ellipsises** ("Consider closing" in the 158px column); the pack forbids it. The compact panel's side padding and row columns are tighter than the reference's, and its row labels 12.5px (the reference's own compact `.cal-led` size), so the longest label fits with no ellipsis (A2).
8. **The pack's 55% ink for the band's agent name and the reference's greys** (past days 42%, other months 30% opacity, tab strip 55%, key hints 42%, the dial's month 75% rust) are all under 4.5:1. Raised to the page's 62/70% (F3 sweeps every visible text).

## Base

- Base tip **`fb25648a`** (Contact list v18.3.2), built `index-LkecNKe9.js`, equal to what dev served when the pack started.
- Baseline gates: tsc 0 · production build 0 (0 CSS warnings) · Vitest **602 files / 9,018 passed, 3 skipped**. Each part's commit: tsc 0, build 0 with 0 warnings, Vitest all passed (605–606 files at the end, **9,040 passed**), `build:dev` 0.

## §0 findings

1. **Header heights (populated, real fonts, base build):** 264px header, 179px header row, 159.56px card — at **both** 1512 × 900 and 1280 × 800 (`header-baseline.json`). The calendar card takes the row's height (`contain: size; container-type: size`), never sets it: A1 reads 264 / 179 / 179.
2. **The day each kind is on** (read, never derived):
   - send (not an offer): `Query.expectedSendDate` (written by `queryActions/sendBy.ts`). **No send-by date → undated** — `taskDue` would give the ask or reminder day, which is not when the material is due.
   - nudge: `taskDue`'s answer (`nudgeDate` — the planned nudge or the booked check-in — else the reply window).
   - consider closing: `taskDue`'s answer (the booked check-in once chased, else the window).
   - own task: `UserTask.dueDate`.
   - offer: `offerResponseDeadline` exists but **the offer is off the calendar** (the pack).
   - The Calendar page's derivation (`lib/todoCalendar`) is that page's lanes; Part B reads `taskDue` (via `dueFor`), the To-do page's one due date per card.
3. **Unsurfaced own tasks:** `UserTask`s with a `dueDate`, not done, not on the board — on the month (an own-task ring), never in `n` or the mix bar.
4. **The pin:** `usePinList(page)` took a third page key with **one change**: `PinPage` gains `"todo"`, `PIN_KEYS.todo = "sa.pinList.todo"`, `PIN_SHORTCUT.todo = SHORTCUTS.todoPin` (a new registry entry, F, "To-do list" scope). Nothing else in the hook changed. It holds the sidebar through `holdSidebarCollapsed` (restored pins `instant`), never writes `sa.sidebarCollapsed`, and stands F down in fields, with the query drawer open, or with any escape layer beyond its own. Two page-side fixes E1 found: a restored pin showed the header for the loading frames; unpinning after a reload went to the very top (the hook only knows a position seen at pin time) — a restored pin now lands on the sheet.
5. **"Just the desk":** `focusMode` state, the `[data-td5="focus"]` button and the `.td5-sheet[data-focus]` / `.td5-focusbtn` CSS in `todoV5.css`; named by v5.1's shots (05, 06) only. All removed; E2 asserts the absence on the page and in source.
6. **The noreply close save** is `view.commit` inside `CloseJourney` (`queryActions/journeys/CloseJourney.tsx`): a closure over the component's state, writing through `recordQueryResponse` then `db.updateQuery`. Its defaults are complete for `noreply` past the window (no blocking guard), **but there was no pure save function the journey called**, so it could not run for a query without the journey's UI. **G.3 stopped, then went ahead on Nick's word:** the record is `closeRecord(answers)` (pure, `lib/queryActions/closeRecord`), the save is `saveClose(db, q, agent, answers, today)` (`lib/queryActions/closeSave` — `recordQueryResponse`, then the nudge/close-plan removals and the withdraw/recheck marks, the same writes in the same order), and `CloseJourney.commit` calls it and nothing else. The bulk close calls it with `noreplyAnswers(today)` once per query, each behind its own `takeSnapshot`.
7. **Save in flight:** the desk host knew nothing. The query drawer guards its own saves (`savingRef` in `QueryDrawer`, `busy` in `DrawerShell`), the compose card holds a `busy` state (beatable by two presses in one tick), and the own-task tick none of its own. Built (H.4): one count of desk saves in flight, released in `finally` when each save settles — never a timer; a journey's save is read from its slot (`.qad-save.busy`).
8. **Art:** talon `/images/query-centre/your-move-talon.webp` 92 × 128 · hourglass `waiting-hourglass.webp` 108 × 111 · pile `/images/packages/materials-tray-pile.png` 400 × 403 · index hawk `/images/contact/contact-index-hawk.webp` 640 × 569 · quill `/images/dash/quill.png` 379 × 480.
9. **The escape stack on `/todo`** (higher first): dial menu **47** (new) · bulk 46 (new) · calendar drawer **45** (new) · the query drawer's popups 40 · the desk journey's drawer 30 · the Set aside popover and the compose card's calendar/link 7 (pageModal) · the filter popovers, the compose card, and (pinned, with text) Find 5 (page) · the pin 4 (pageMode). H2 measures dial menu → bulk selection → drawer → Find's text → pin, one press each.
10. **Journeys and their band titles** (`lib/deskDoing`, unit-locked; n = steps + the review, read from the shell's stepper on the page):

| Journey (door) | n (steps + review), measured | Band title |
|---|---|---|
| sent (partial / full requested, offer_send_full) | **5** (The request · What you're sending · Sending it · Reading window · Check and log) | "Sending your partial" / "Sending your full" |
| sent (revise_resubmit) | read at runtime | "Sending the revision" |
| nudge (nudge_overdue; the "plan" door) | read at runtime | "Recording a nudge" |
| close (no_response_close, noreply) | **3** | "Closing the query" |
| close → "They said no" → response (pass) | **5** (recounted on the switch, J1) | "Logging their reply" |
| close (withdraw door) | read at runtime | "Withdrawing the query" |
| offer (offer_received) | read at runtime | "Answering the offer" |
| edit (send-by door; withdraw_tell / signed_tell) | read at runtime | "Setting a send-by date" / "Telling them you've withdrawn" / "Telling them you've signed" |

The unit lock (`deskDoing.test.ts`) maps every door `drawerDoorForTask` reaches; n is never stored — the band and the navy row read it from the journey's own stepper each time it changes.

## Calls I made

- `lib/trayCalendar` (false premise 1); `lib/deskDoing` for the band's one map.
- Moving a system task's date snoozes it, through `doSnooze` — v5.1's writer, its ceiling clamp and its exact Undo — with the pack's toasts. A capped day is disabled in the menu and refused on a drop **before** the writer, which also clamps (two guards; G2 records which one is observable).
- "Movable" = an own task with a `dueDate`, or a task whose dial has a date — **the offer's answer-by included**, so its menu offers Tomorrow only (its ceiling is 1). Housekeeping and sweeps: no menu, no drag.
- Today/past drops say "Pick a day after today."; a ceiling refusal uses v5.1's popover words ("Can't go past {date}, your send-by date.", "Can't be snoozed. …", "An offer can wait a day at most.").
- The explainer's fact: **`todoPrefs.tray.explainedSetAside`** on the user (one leaf through `updateUserPaths`; `todoPrefs` is an unconstrained map, no rules change).
- The band's agent name at ink 62%, not 55% (F.4's floor).
- The calendar card's past and other-month days at ink 62% (see false premise 8).
- J's step count is read from `DrawerShell`'s stepper DOM (`[data-qad-step][aria-current="step"]`), and "has answers" from its "Finish later" foot (`[data-qad-later]`, shown exactly when `view.dirty`) — the journey host's own state, with no second count and no edit to `queryActions/**`.
- A journey's title types once per start or resume (`deskReq` arriving), never on Next or a switch.
- The dial menu is reached by pointer only (the dial sits inside the row's button); the row stays the keyboard's target.
- Escape in a pinned page's Find: the stack hears Escape first (window, capture), so a page-level layer clears Find's text before the pin's layer can unpin.
- L1's break ("drop the compact chip") cannot make the navy row wrap — Find's field shrinks to absorb the long chip — so L1 asserts the chip's compact form below 1360 directly.

## Retired and rewritten locks

See `tests/e2e/RETIRED-todo-list-v5-2.md`: TD5 A1, A2, B1 retired; TD5 D2, I4, I5 retargeted (the slip; the In-your-tray tab); shots 05 and 06 retired; qcV138 D1's note re-pointed; TD5 C2 kept. **TD5 E2 is red on the base build too** (the desk's sent write carries `lastSentLabel`, the panel's does not).

## Readings

TD52, every lock on my build at `6ccee20e` and again at `1adc2aee` (after the title fit), on the base build `fb25648a`, and on the integration build (below). **Base: 21 failed, 2 passed** (G3 asserts an absence; L1's overflow checks hold on a page without the new parts). "threw" = the lock crashed on the base because what it reads does not exist there.

| Lock | mine `1adc2aee` | integration `5aaa96a2` | base `fb25648a` | red under its named break |
|---|---|---|---|---|
| A1 header height | 9/9 | 9/9 | 5/9 | 7/9 (contain removed) |
| A2 no clip | 40/40 | 40/40 | threw | 35/40 (day column 140) |
| A3 today panel | 26/26 | 26/26 | threw | 18/24 (housekeeping counted as overdue) |
| A4 days | 30/30 | 30/30 | 0/8 | 26/30 (tray total on a future day) |
| A5 dots | 101/101 | 101/101 | 1/7 | 117/119 (one dot per task) |
| C1 drawer | 28/28 | 28/28 | threw | 26/28 (journey started from the drawer) |
| D1 drawings | 50/50 | 50/50 | 26/50 | 42/46 (desk-head art); 48/50 (bands under the strip) |
| E1 pin | 46/46 | 46/46 | threw | 44/46 (pin writes sa.sidebarCollapsed) |
| E2 retired | 8/8 | 8/8 | 4/8 | 4/8 (old button mounted) |
| F1 header | 14/14 | 14/14 | 4/8 | 4/10 (title reads the tray count); 12/14 (fit undone) |
| F2 rows | 18/18 | 18/18 | 8/18 | 14/18 (tag by weeks only) |
| F3 contrast | 8/8 | 8/8 | 4/8 | 4/8 (ink 45% restored) |
| G1 link | 10/10 | 10/10 | 0/2 | 8/10 (light by kind, not date) |
| G2 move | 23/23 | 23/23 | threw | 22/23 (the drop's refusal removed — see G2's note) |
| G3 bulk close (`8fba8313`) | 11/11 | — | 0/1 (no select UI) | 7/11 (write the status directly: three documents differ, no slips) |
| H1 feel | 16/16 | 16/16 | threw | 14/16 (guard released on an 1100ms timer) |
| H2 Esc (five layers at `8fba8313`) | 6/6 | — | red | 2/5 (one Esc closes two); 2/6 (bulk layer off) |
| J1 signals | 18/18 | 18/18 | 7/18 | 17/18 (n fixed in the page) |
| J2 band | 12/12 | 12/12 | threw | 10/12 (title may ellipsise) |
| J3 tray | 10/10 | 10/10 | 5/10 | 7/10 (click-eating overlay) |
| J4 motion | 8/8 | 8/8 | threw | 7/8 (retyped on Next) |
| L1 overflow | 86/86 | 86/86 | 80/86 | 80/86 (compact chip dropped) |

Unit: `trayCalendar.test.ts` (red under "UTC today"), `trayRows.test.ts`, `deskDoing.test.ts`, `trayHeaderV52.test.tsx`.

**L2 (regressions), mine against base, same suites in one run each, then the reds re-run:** v5.1's two suites, QC v138.6, Contact list v18 + v18.3, Corkboard v1, query panel v2, query actions, qaV11, the Calendar page's tlTodayMark + tlRowHead.
- My first L2 run hit **Firebase's password-verification quota** (`auth/quota-exceeded`) part-way; the seeders failed and twelve cases read red with no fixture. Re-run once the quota recovered: **QC v138.6 10/10**, Contact list v18 + v18.3 + query panel v2 **42/44**, and the two still red (CL1832-D1, query panel V6–V8) are **red on the base too**.
- **Only regressions: TD5 A1, A2, B1**, retired by design. TD5 E2, tlRowHead and tlTodayMark are red on both builds.

**After G.3 (`8fba8313`, 18 Oct):** TD52 22/23 on my build — the one red is **G2's offer check, which is a Sunday:** the dial offers "Monday" beside "Tomorrow", and on a Sunday they are the same day. v5.1's TD5 I2 is red the same way, identically on the base build. The close journey's own locks re-ran green on the refactor: `qaJourneys` D4 ×2, D5 × noreply/withdraw/gone, "they said no"; v5.1 E2, E3, I1, I3–I5, J1. Gates: tsc 0, build 0 with 0 warnings, Vitest 607 files, 9,043 passed (`functions/node_modules` linked into the worktree for `email.test.ts`).

## Shots

`reports/todo-list-v5-2/shots/` — each `NN-*-{1512,1280}.png` beside `design-refs/todo-list-v5-2/screens/NN-*`, plus `todo-{pinned,unpinned}-{1920,1024}.png`. **09 is three Gone quiet rows selected**, the bar at the tray's foot (nothing written).

## Integration and dev

- Integration branch: **`dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386-db60-cl183-an24-cl1831-an241-db601-cl1831b-cl1832-cl1833-cx28-qhnet-td52`** (pushed), cut from the branch dev served at the time (its tip built to `index-CshxOLQG.js`, the served hash, verified), merged with `todo-list-v5-2` twice (`37fb4e4e`, then `5aaa96a2` for the title fit). The only conflict was `design-refs/.refhashes.json` (both sides' new refs; union, 556 refs, verified).
- Gates there: tsc 0 · production build 0, 0 warnings · Vitest 608/609 files, 9,050 passed — the one failure is `functions/src/email.test.ts`, which fails identically on the dev tip alone (a fresh worktree has no `functions/node_modules`); `pageStructure`'s Queries case timed out under load once and passes alone. TD52 **23/23**.
- **After G.3 (18 Oct):** `todo-list-v5-2` merged into the same integration branch again (`180cd3cb`, no conflicts); gates there tsc 0 · production build 0, 0 warnings · Vitest 610 files, 9,062 passed; TD52 G3 11/11 and H2 6/6 on that build. **Dev now serves `index-5Q6l_Tb7.js`**, deployed hosting-only from a clean checkout of the pushed tip after re-checking the served hash.
- Before G.3, dev served `index-D_Mx4fR9.js` (hosting only, `firebase.dev.json`, project `scriptally-dev`), deployed from a clean checkout of the pushed tip after re-checking the served hash. Prod untouched; no rules or functions deployed.

## For Nick

- **Moving a system task's date is a snooze** — it leaves the tray into Set aside ("back {date}") and shows faint on its return day. The mock kept it in the tray with a new date. Overturn if wrong.
- **Bulk close is built** (G.3, after your go-ahead). Two calls to check: a Gone quiet row that is the writer's turn (`owes(q)`) gets no checkbox, since a noreply close would be wrong for it; and the one toast's Undo reverses every close, while each Done today slip's Undo reverses its own.
- Should **the offer's answer-by date** go on the calendar? It's off.
- The h1 now repeats the card's today counts. Keep both, or let the card's Today rows go quieter?
- Drag is off while pinned (the month is hidden); the dial menu covers it.
- Contrast: F3 measures every visible text at rest (top and sheet) at both sizes and **none fails**. Not swept: the drawer, the dial menu and mid-journey states.
- **The urgent title shrinks to fit** when it is long ("33 overdue · 2 due today" at 1280 sets at ~36px rather than 44). It never wraps (the header's height is fixed). Is a smaller title right, or should "· {t} due today" move to a second, quieter line?
- "Explained once" is stored at **`todoPrefs.tray.explainedSetAside`** on the user.
- **Undated tasks on the harness account:** **19 of 54** tray tasks: 13 material requests with no send-by date set (7 full, 6 partial — `expectedSendDate` is empty, so they are honestly undated rather than placed on the day they were asked), 2 offers (off the calendar by design), **1 R&R** (its bucket is "decide", which the pack maps to nothing — should a revision with a resubmit-by date go on the calendar?), 3 housekeeping.
- Mid-task now shows progress four ways (the top bar's steps, the band's steps, the fill line and the journey's own stepper). Keep all four, or drop one once it's been used for real?
- **The shared account moved under the run** (the tray went 48 → 52 and a manuscript switch appeared mid-session), and carries **"Zz td51 probe" own tasks** left by v5.1's runs; see "Clean-up".

## Clean-up

- Deleted **6 "Zz td51 probe" own tasks** from the harness account — test records v5.1's runs left behind; **three were left by today's L2 run of v5.1's I3**, whose own clean-up does not always remove its probe (worth a look in that suite).
- Every TD52 write restored in the same run (each `[guard] restored` line in the logs); 74 tracked ledgers from other packs that the L2 runs overwrote are restored from `HEAD`.
- Worktrees: the measurement worktree `../ScriptAlly-todov52` (branch `todo-list-v5-2`) and the integration worktree are removed after this report is committed; preview servers stopped.
