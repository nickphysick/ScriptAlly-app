# To-do on the phone v1 — report

Branch `todo-phone-v1`, cut from `dev/…-td52-qc1522c-pw1-td52b` at **`0e21b57a6`** (the brief's `13b8496f` is an
ancestor; `0e21b57a6` adds two v52 commits on top). That tip's `build:dev` produced **`index-D507mjK0.js`**, the bundle
dev was serving when the pass began, so it was the right base. Worktree `../ScriptAlly-tdp1`.

## 1 · False premises

1. **"Housekeeping rows open the existing phone sweep / Quick fill."** There is no phone sweep or Quick fill.
   `src/components/phone/sweepPhone.css` is Phone app v2 Part 8C's *whole-app sweep* — tap-target and colour fixes — not a
   housekeeping sweep. "Quick fill" is only the desktop tray's label on housekeeping rows; on the desktop those rows open
   on the desk and run `buildFlow`'s own one-question flows (`fixFlow`, and `materialsFlow` for the batch). Following D1
   (one brain), housekeeping rows on the phone open the same task screen and run those same flows. That is the desktop's
   Quick fill.
2. **The mock's questions are not `buildFlow`'s.** The mock's send task asks "What went with it?", "When did it go?" and
   "How did you send it?". `buildFlow`'s send asks what went, which version (only for a full or a revision, and only where
   the book has versions), and when. Nothing asks how it was sent. D1 wins: the phone asks `buildFlow`'s questions. Its date
   question is the desktop's `DatePick` (a six-day strip and a month), not the mock's Today / Yesterday / Earlier list.
3. **The desktop has no "final verb" per flow.** The brief says the pill becomes "the flow's own final verb ('Log it'
   etc.)". `Flow` has no verb field. The desktop's verbs are "Log it" (any flow that commits), the flow's door label
   ("Open it ↗", where the task is finished elsewhere), and "Mark done" (the writer's own task). The phone uses those
   three. It also skips the desktop's "That's everything" summary step, because the mock puts "Log it" on the last
   question.
4. **`todoPhoneV1.measure.ts` is not a phone suite by this config's rule.** `playwright.config.ts` sends only files named
   `phone…` (and three named others) to the iPhone and Pixel projects. This file runs in the `measure` project and sets
   390×844 and 360×780 itself, as `openPhone` does for every phone suite.
5. **Phases B, C and D cannot be three commits that each build.** The list opens the task screen, and the task screen
   holds the card sheet, so the three import each other. They are one commit (§3).

## 2 · Step 0

1. **Where the phone To-do lives:** `TodoRoute` → `TodoPhone` below 768px, reading `useTodoPhoneModel` (board, tray
   items, calendar items, `dayBuckets`) and `useTodoDoors` (`act`, `openRow`, the tick-off ask) from `useTodoPhone.tsx`.
   Home (`DashPhone` → `HomeTodo`) read the same model and doors. Confirmed.
2. **How a task opened on a phone:** `useTodoDoors.act` → `drawerDoorForTask` → `openQueryDrawer`, which on a phone is the
   Query Centre's `PhoneFlowShell`. Housekeeping and data-quality rows opened the agent card; own tasks asked "Tick it off?".
   Confirmed.
3. **What is pure:** everything in `lib/todoWs.ts` — `wsTasks`, `WS_GROUPS`, `wsSections`, `priorityTask`, `startReason`,
   `doingPhrase`, `dueChip`, `mentorLine`, `doneTabRows`. `buildFlow` is a plain function too, but its context
   (`FlowCtx`) was built inside TodoWorkspace from that component's own closures: `quietFacts`, `limitFor`, `snoozeTask`
   (which needs `cardOf`, `captureFlags`, `putBack` and `flagKeysFor`), plus the Snoozed/Done lists, the dismiss writes and
   the batch row's state. **Smallest lift:** move those, verbatim, into `components/todo/ws/useWsCore.ts` (`useWsCore` and
   `useWsBatch`). The red gate did not fire: no desktop behaviour had to change to do it.
4. **The phone query sheet's card:** `QueriesPhone` renders `Queries.tsx`'s `qcCardNode`, the Query Centre's
   `QcQueryCard149` over `buildCardView`. The desktop preview, `PreviewQueryCard` (WsPreview), is the same component over
   the same derivation, and draws the pending step as the card's own dashed draft (`card1522.draft`). The phone's card
   sheet reuses `PreviewQueryCard`, so no second card is built.
5. **Snoozed list and Quick fill:** the desktop's Snoozed tab is `setAsideItems(…).filter(snooze)` with "Bring back"; Done
   is `doneTabRows`. The phone already had the snooze sheet (`SetAsidePop` in a `MobileSheet`) with Undo. There is no
   phone Quick fill (false premise 1).

## 3 · Commits

| Phase | Commit | What |
|---|---|---|
| A | `e963546a3` | `useWsCore` + `useWsBatch`: TodoWorkspace's board, facts, snooze, dismiss, Snoozed/Done, batch and `buildFlow` context, moved unchanged. Enrols the ref. |
| B–D | `e9022c68c` | The list (D2), the task screen (D3) and the card sheet (D4). One commit: they import each other (false premise 5). |
| E | `bbb32ee04` | Home's doors (D5); `useTodoDoors`, `whyLine`, `upNextVerb` and the week strip / tallies / day filter CSS removed; old phone To-do tests re-pointed or retired. |
| F | `9f0317814` | The locks (`todoPhoneV1.measure.ts`), the mutation runner (`tdp1Mutate.sh`), and two faults the locks found (below). |
| G | `a654dffce` | Merged onto dev's served branch as `dev/…-td52b-cp30-tdp1` (see §7). |

## 4 · Gates against baseline

Baseline is `0e21b57a6` (the cut point), read in full, not by `tail`.

| Gate | Baseline | After F | After the merge (G) |
|---|---|---|---|
| `tsc --noEmit` | clean | clean | clean |
| `build:dev` | clean, `index-D507mjK0.js` | clean | clean, `index-DalV8gEp.js` |
| Vitest | 3 failed / 11,471 passed / 3 skipped | 3 failed / 11,475 passed / 3 skipped | 3 failed / 11,474 passed / 3 skipped |
| TD52 + `todoWs` (desktop, emulator) | 18 + 12 passed (v52 report) | **32 / 32 passed** | — |

The same three failures in every Vitest column, none touching To-do: `emuGuard` (an older `tests/e2e/cb21Emu.sh` calls the emulator without the guard) and two `firestoreTarget` sweeps. The baseline run also had the known reporter timeout (`Timeout calling "onTaskUpdate"`), with no failed test behind it. After F there are 4 more passing tests: the new `src/lib/todoPhone.test.ts`. The merged column has one test file fewer, which comes from Comparable titles v30, not from this pass.

**L11, the desktop unchanged:** TD52 (`todoV52.measure.ts`) and v51.1's `todoWs.measure.ts` ran on the lifted desktop: **32 / 32 passed**, the v52 report's own count on this tip. Later commits touch only phone files and the phone band (`PhoneBand`'s `todo` mode, AppShell's phone-only `bandTitle`).

## 5 · Locks, red then green

`tests/e2e/todoPhoneV1.measure.ts`, at 390×844 and 360×780 on the emulator. **Final run: 16 / 16 passed** (`reports/todo-phone-v1/readings/`). Each lock was then broken on purpose with `TDP1_MUTATE=<lock>` (`tests/e2e/tdp1Mutate.sh`; proofs in `mutation-proofs.txt`), and each went red at its own assertion:

| Lock | Claim | The break | Assertion that fired |
|---|---|---|---|
| L1 | No week strip, when-groups or Up next on /todo | a `wk-day` element added | "the week strip, the when-groups and Up next are gone" |
| L2 | The band's numbers switch the list; to do, late and Done are the desktop's (`doneTabRows`) | Done's count set to 999 | "done is doneTabRows' length (the desktop's cleared this week)" |
| L3 | Start here = the desktop's `priorityTask` | Start here's phrase rewritten | `toBe("Answering Tom’s offer from Ellery & Finch")` |
| L4 | Groups in `WS_GROUPS` order | the first group moved last | "the desktop's groups, in WS_GROUPS order" |
| L4b | A collapse survives a reload | the stored collapse cleared before the reload | "the collapse is remembered on this device" |
| L5 | Each task kind asks `buildFlow`'s questions, in order, one at a time | an extra step recorded | "send: the phone asks buildFlow's questions, in order" |
| L6 | No auto-advance (1s after a choice, same step) | a choice clicks Next 50ms later | "send: a choice never moves you on (L6)" |
| L7 | The pill is in view and uncovered on every step | the footer pushed 120px below the screen | "send: the pill is in view and uncovered on every step (L7)" |
| L8 | Log it on a nudge writes the desktop L10's three documents, once each; the next task opens; Undo puts them back | **source break:** the screen commits twice | "the desktop's L10: exactly these three documents, once each" |
| L9 | The card sheet: ≤ 24px between the last bubble and the footer | 80px of padding under the thread | "no empty space between the last bubble and the footer" |
| L9b | The sheet is no taller than its card | the sheet forced to 92% | the same gap assertion (see note) |
| L10 | Home's task opens the task screen, not the drawer | Home's taps swallowed | "the task screen opened" |

Notes on the proofs:
- **L8's first break proved nothing.** A second click 30ms later cannot land, because the pill is disabled while the save is in flight, which is the guard working. A real double write needs a source break, so the runner swaps in a copy of `PhoneTaskScreen` that commits twice and then restores it from a path-named backup.
- **L9b goes red on the gap check, and that is the right check.** Forced taller, the Query Centre card stretches with the sheet, so the empty space appears inside the card, between the thread and its footer. That is exactly the fault D4 describes.
- **L4b's first break was vacuous**: it cleared the stored collapse after the page had already read it. It now clears it before the reload.
- **L7's first red was a click timeout, not its assertion.** The walk now stops when the pill is unreachable, so the check itself fires.

**L5's walk** (`readings/L5-390.json`). The desktop and the phone were opened side by side; each kind's first task was walked on both with the same first-choice answers:

| Kind | Desktop | Phone |
|---|---|---|
| send | mats → ver → date | mats → ver → date |
| offer | ans → withdraw → date | ans → withdraw → date |
| rr (revision) | mats → ver → date | mats → ver → date |
| nudge | sent → date | sent → date |
| quiet | act → sent → date | act → sent → date |
| batch | mats | mats |
| fix | wk | wk |
| own | — (WsOwnTask) | — (WsOwnTask) |

**8 of the 9 kinds were walked.** The ninth, `other` (task types with no desk questions, opening their own door), has no task on the emulator account. Its phone path is the flow's door pill, the same `flow.door` the desktop uses, and no lock exercises it.

**Not exercised, and named:** the emulator account has nothing snoozed and nothing cleared this week, so L2's Done and Snoozed checks compare 0 with 0. The break proves the count is wired to the band, but the populated branch has not been seen.

### Faults the locks found, fixed in F
1. **After Log it, the task screen closed instead of opening the next task.** Firestore applies the write locally before `commit()` resolves, so the task left the board mid-save, and the screen's "task gone, back to the list" guard fired. The guard now stands down while a save, snooze or dismiss is in flight. L8 now asserts that the next task opens.
2. **The task title rendered in Playfair.** `brand.tsx` forces `h1:not(.wsh-title)` with `!important` (0-1-1). A two-class selector fixes it.
3. **The date strip ran off the right at 390**, and **the card's thread sat 25.9px above its footer.** Both fixed in the phone sheet only.

## 6 · Screenshots (390×844, `reports/todo-phone-v1/shots/`)

List `list-390.png` · collapsed group `collapsed-390.png` · Snoozed `snoozed-390.png` · Done `done-390.png` · task step 1 / middle / last `task-send-step1.png`, `task-send-step2.png`, `task-send-step3.png` (and Gone quiet's `task-quiet-step1…3.png`) · logged snackbar `logged-snackbar.png` (the next task already open) · card sheet `card-390.png` · own task `task-own-last.png` · housekeeping `task-fix-last.png` (reply time) and `task-batch-last.png` (what you sent). 360×780 versions of the list, Snoozed, Done, collapsed and card are beside them.

## 7 · Dev

Dev moved during the night. At deploy time it served **`index-CGunICPB.js`**, from `dev/…-td52b-cp30` (`ffcefca78`, Comparable titles v30 on my same base). I confirmed by building it, then merged `todo-phone-v1` onto it as **`dev/…-td52b-cp30-tdp1`** (`a654dffce`). The one conflict was the ref-hash manifest, where both passes enrolled a ref at its end; both entries are kept. Both branches are pushed. I re-checked the served hash right before deploying, then ran `npm run deploy:dev` (hosting, plus `smartImportMap`, unchanged).

**Dev now serves `index-DalV8gEp.js`.** Prod is untouched.

## 8 · Not done, and why

- **The mock's tab bar on the list page.** The mock draws the floating tab bar under screen 1, but `/todo` has been a menu page since Phone round two, and AppShell hides the tab bar on every menu page (`isMenuPage`). D2 doesn't ask for it, so I left it as it was. That is also why the existing `phoneAppV2Shell` PA2-1 times out waiting for the bar on `/todo`: it was already red at the cut point, read, not moved. Showing the bar on `/todo` is one line in AppShell, if wanted.
- **`phoneLastScreens` L4** fails on `/queries/packages` → `/manuscripts#packages`, a Packages redirect this pass does not touch. Its To-do row was re-pointed to the band numbers.
- **PA2-5 (`phoneAppV2Todo`) and phoneRoundTwo R6 are skipped as RETIRED**, with their successors named in the skip. PA2-5 also held the Corkboard's notes order (T6) and a colour sweep on `/todo/corkboard` (T8). Those two are not re-pointed and want a Corkboard-owned lock.
- **The card sheet keeps the Query Centre card's own small uppercase labels** ("MATERIALS REQUESTED", "REED & PARTNERS", the book's tags). D6 says no small uppercase labels, but D4 says reuse the phone query sheet's card and build no second one, and that card draws them on the phone's Queries page too. I followed D4. Changing them belongs to the Query Centre's card on every phone surface.
- **The card is inert in the sheet** (a picture, as on the desktop). Its "Mark full sent" pill and tabs do nothing there, so they are styled unpressable. Tapping through to the live card is not built.
- **The quill and hawk are placeholders**, as the mock draws them.
- **The task screen's snackbar shows the flow's headline only** ("Nudge logged."). The desktop's celebration also showed the follow-up sentence ("…I'll put 'Nudge Joan' on your list"); the phone's snackbar is one line.
- **The desktop's "That's everything" summary step is skipped on the phone**, because the mock puts Log it on the last question. The sentence and its consequences are not shown anywhere on the phone before saving.
