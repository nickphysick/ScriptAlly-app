# To-do list v5 — the tray and the desk · overnight run report (15 Oct)

Reference: `design-refs/todo-list-v5/` (all 19 files SHA-256-verified against the brief before use; the HTML is
enrolled in `design-refs/.refhashes.json`). Worktree `../ScriptAlly-todov5`, branch `todo-list-v5`.

## 1. False premises, named first

1. **A profile gap never reaches the board as its own card.** Part E's "fix → `openAgentCard(agentId,
   dataNeedTarget(...))`" assumes a `data_quality_poor` card per agent. `groupHousekeeping` folds every one of them into
   a **sweep card per need** ("3 reply times"), and the board draws only the sweep. Built instead: a sweep holding
   **exactly one** agent opens that agent's card at the field; a sweep holding several opens today's Housekeeping sweep.
   Found by TD5 E1, which entered no agent-card door at all until it looked for one-agent sweeps.
2. **`taskDeed` cannot be "the deed" for two buckets.** It reads every `decide` as "Reply to the offer" (an R&R is not an
   offer) and every `fix` as "Fill in what you sent" (the materials gap's deed only). `trayDeed` keeps `taskDeed` for
   everything it gets right and says "Send the revision", the sweep's rule ("Add their reply time") or the card's own
   title elsewhere. `taskDeed` itself is untouched (other pages read it).
3. **Query Centre v138's navy row is not sticky** (`position: relative`; no rule makes it stick). The brief asks for ours
   to be sticky "as v138's"; it is, and it squares off once stuck. Copying v138 exactly would not have done that.
4. **The drawer dates an act by its DAY, not its moment.** `dayIso` stores the day sent as **local noon**, so (a) a send
   recorded "today" before midday was *in the future* and `clearedSince` (bounded at now) dropped it — no slip, ring
   unmoved (TD5 D2's first run); and (b) the slip's "{HH:MM}" is unknowable for a drawer act. The window now runs to the
   end of London's today, and a day-dated act's slip says **"Today · {consequence}"**; a clock time appears only for
   records that hold one (a ticked task, a resolved flag).
5. **The v138 navy row's padding gives 78px, not 76.** A 38px button inside 20px padding; the strip and bands stick at
   76, so they sat 2px inside the row (TD5 C1). Padding 19.
6. **"Pinned to your corkboard" is not true of every own task.** Only a task with a colour is on the Corkboard
   (`sortNotes`). The row says it only where it is so; otherwise "With {agent}" or "Your own task".
7. **The Contact list's "ready pill" no longer exists** (v17 replaced it with the card's three groups and no memory key
   opens it). "Query someone new" opens the Contact list as it stands.
8. **There was no phone branch on `/todo`.** The v2 page rendered on phones through a container query. "The phone keeps
   today's page" is now true by construction: `TodoRoute` mounts the v5 page at 768px up and `ToDoPage` below, one at a
   time.
9. **The commit sequence cannot start when the card leaves the board.** The board drops the card the instant the save
   lands (Firestore's local snapshot), while the drawer is still on screen over the desk; played then, the stamp is never
   seen (the first stamp screenshot showed exactly that). The card now leaves into a hold and the stamp comes down once the
   drawer, agent card or sweep has gone.
10. **The mock's own values differ from the brief's in places** (bands 50 tall, rows `36px … auto`, deed 40/1.08, the
   stamp 34px at −11°). The brief's values were used throughout.

## 2. Base

- **Tip used: `954a9413`** — the branch dev serves (`dev/…-qc1384-pkg4-pkg41`), which is also `origin/main` since this
  morning's fast-forward. **Submission packages v4 and v4.1 are on it.** CL17/CL17-amend, QC138, query actions v1, the
  agent card and Corkboard v1 are all on it (checked before the pack began).
- **Baseline gates** at the tip, before any edit: tsc 0 errors; production build clean (the chunk-size note only);
  Vitest **584/585 files, 8,807 passed** — the one red was `functions/src/email.test.ts` failing to import for want of
  `functions/node_modules` in a fresh worktree (linked; then 585/585).

## 3. §0 recon — what was found

**Today's `/todo` (desktop and phone):** `ToDoPage` (3,397 lines) drew the v2 page: header v3's NUMBER panel
(`PageHeader full panel living`), `V2Tiles`, `V2Controls`, `V2Rows`, the desk rail `V2Desk` (composer, "Yours on the
list", notes), `SetAsidePanel` in a `V2Popover`, and the `TaskPane` in a `SlideOver`. Keys: `lib/shortcuts`' To-do scope,
bound in `ToDoPage` (the focused row was never drawn — a stale `.tlc .row` selector).

**Shared or page-local** (everything visual turned out to be page-local; every one is a **lift candidate**):

| Part | Where it lives | Built here as |
|---|---|---|
| Light header, summary card, ring | `agents/contact/ContactLightHeader.tsx` + `contactV17.css` §A/§B, `lib/contactHealth` | `v5/TrayHeader.tsx`, `todoV5.css` §A |
| Find, pills, panels, More filters | `agents/contact/ContactFilterStrip.tsx` + §E (popover hook `shell/ListPills` is shared) | `v5/TrayFilters.tsx` |
| Sheet, navy row, strip, bands, dial | `queries/centre/QcList138.tsx` + `qcvList138.css` | `TodoTray.tsx` + `TrayDesk.tsx` |
| Empty page (navy panel, How it works, Ways) | `ContactEmptyPage`, `QcEmpty138`, `packages/v4/PkgEmpty4` (three copies already) | `v5/TrayEmpty.tsx` |
| HalfDrawer | `shell/HalfDrawer.tsx` (shared) | used as is |
| The composer | `v2/V2Desk.tsx` (inline) | lifted to `v2/V2Composer.tsx`, used by both |
| Snooze writes | inline in `ToDoPage` | lifted to `snoozeWrites.ts`, used by both |

**Door coverage** (`drawerDoorForTask`): partial/full requested and R&R → sent; nudge_overdue → nudge; no_response_close →
close; offer_received → offer; offer_send_full → sent; withdraw_tell / signed_tell → edit; offer_tell → offer on the
offering query. **Not covered, keeping today's route (the Housekeeping sweep, `openFlowCards`' route):**
`materials_unrecorded`, `materials_unrecorded_bulk`, `querying_unstarted`, `dream_agent_unqueried`, `agent_recheck`, and
multi-agent profile sweeps. One-agent profile sweeps → the agent card. Own tasks → `useTaskCommit().quickDone` and its
undo.

**How a page learns a save landed:** `openQueryDrawer({ …, receipt: true, onSaved, onCancel })` — `onSaved` hands back
`{ mode, queryId, message, undo }`, and `undo` is the drawer's snapshot restore, callable from outside. Used for the
toast's and the slip's Undo.

**Completion records that carry dates:** drawer activities (`eventKey` + `date`, day-precision — see premise 4); the
`data_quality_poor` flag's `resolvedAt`; `UserTask.completedAt`. All three are counted; nothing undated is.

**Corkboard notes link to agents and queries:** `UserTask.agentId` / `queryId`, plus `tags`. So the pinned note is built:
the newest not-done dateless (or coloured) task linked to the desk task's agent or query.

**Art:** all eight paths exist (`hawk-shadow.png`, the talon and hourglass as `.webp`, `materials-tray-pile.png`,
`contact-index-hawk.webp`, `dash/quill.png`, `make-querying-simple.png`, `dash/mentor-leaning.png`).

## 4. Calls I made while running unattended

1. **The page landed as one commit for Parts A, C, D, E and G** (`e7e43448`), not five: the page is one component
   (`TodoTray`), and slicing it into five commits that each build on their own would have meant writing four throwaway
   intermediate pages. B (`cb4fb424`), F's shared extraction (`902469e8`) and H (`87cd8dbc`) are separate, and each thing
   the locks found is its own follow-up commit: `2c017088` (the noon-dated act; the 76px row), `6b6dd7c8` (sweeps),
   `fcc085f3` (1024's navy row), `b3e76f25` (D2's stamp read), `00dd3433` (the stamp waits for the drawer), `c017898a`
   ("Clear all" on one line).
2. **"Set aside" on the desk opens the existing snooze panel** (`SnoozePanel` in an `AnchoredPanel`) and writes through
   `snoozeWrites` — the same primitive, clamp and undo the phone page uses. A grouped sweep snoozes its group.
3. **The pinned note's "#tag"** is the note's first tag's label, lower-cased; no tag, no "#".
4. **The desk's sticky top is measured** (`--td5-desk-top`): under the navy row when the desk fits the scroller, by its
   bottom when it doesn't. A desk card plus Done today is taller than a 900px window, and pinned at the top its action
   would have sat below the fold for the length of the tray.
5. **The long package name** shows as a one-line chip with an ellipsis and its full name as the tooltip (it wrapped into a
   four-line pill at 1280).
6. **Small dials (44, 30)** take smaller type; the mock's 17px numeral did not fit a 44px dial.
7. **All caught up's fact line** follows the record: "{k} agents are holding your work and none is past its reply date",
   or "{p} are past the reply date" where that is true, or "No agent is holding your work at the moment."
8. **Coming up** reads the Query Centre's own clock (`expectedFor`) for reply dates, the query's `nudgeDate` after a
   nudge for check-backs, and own tasks' due dates.
9. **The composer's Note toggle** hands off to `/todo/corkboard`; `sa.todoCompose = "note"` does the same.
10. **A dev-only review aid**, `window.__SA_TD5_STATE = "caught" | "nothing"` (`lib/todoReviewAid`, gated at the call site
    by `import.meta.env.MODE`), narrows the page's input so the two quiet states can be seen on the shared account,
    which holds ~45 tasks. Nothing is fabricated; Coming up and Done today stay real.
11. **Below 960px of sheet the navy row's J/K/E hint gives way** so the sentence never runs into it (it did at 1024).
12. **The navy row's sort menu** is the v138 grammar (a menu under the dotted word); it closes on a pick or on leaving it.

## 5. Retired and rewritten locks

See `tests/e2e/RETIRED-todo-list-v5.md`. Retired whole: `todoV2.measure.ts` (13 cases), `livingHeadersV3.measure.ts`
(LH3, LH5, LH8, LH9, LH10, LH11 — `/todo` was its last page), `cleanupTodoV2Probe.mjs`. Re-pointed: `plateRoutes`
(`/todo` joins `OWN_HEADER_ROUTES`), `headerV3` (leaves NUMBER), `mastheadMatrix` (`none`), `hp2Lib` /
`headerPanelV2` (LIGHT_HEADER on the desktop; P8's door), eight grid-class censuses (`tdv2-wpg` → `td5-wpg`), and
`qcV138` D1's recorded note. Unit source locks retargeted with their law stated at the read: `todoActions.test.ts`,
`tasksCarryover.test.tsx`, `tasksViewport.test.tsx` (the snooze writes and the composer moved files).

## 6. The locks

`tests/e2e/todoV5.measure.ts` (helpers `td5Lib.ts`), at 1512 × 900 and 1280 × 800 with the shell; L1 at 1920, 1512,
1280, 1180, 1024. Unit halves: `src/lib/todoCleared.test.ts` (B1), `src/lib/todoTray.test.ts` (C3, E1, G1).

**Red first, against the build before this pack** (`954a9413`, its own worktree and bundle, `base-run.txt`): every case
fails — the page's subject `[data-todo-v5]` does not exist there.

**Red by named break** (`mutations-in-page.txt`, `mutations-in-source.txt`, `B1-mutation.txt`, `C3-unit-mutation.txt`):

| Lock | Break | Red at |
|---|---|---|
| A1 | count members, not cards (source) | "n = sidebar badge — title 79 badge 45" ×2 |
| A2 | a press scrolls the page · (A2w) "Clear all" made a block | "no scroll — 0 → 240" ×2 · "the filtered sentence is one line — height 40 against a 22px line" ×2 |
| B1 | (unit) a snooze counted as cleared · (page) the ring's ink drawn at a half | 4 unit cases · 4 page readings + D2's with-cleared reading |
| C1 | the band's sticky offset dropped | "a band under the strip" ×2 |
| C2 | a row click also opens the drawer | "nothing opened — 1 surfaces" ×2 |
| C3 | "overdue" put into a lede (page) · into the close lede (unit) | every lede in the sweep · 1 unit case |
| D1 | the keys bound with no stand-down | "j in Find moves nothing" ×2 |
| D2 | the next task selected before the card leaves (source; re-proved after the hold) · the hold removed | "a stamp comes down" · "the stamp comes down once the drawer has gone" ×2 (`D2-hold-red.txt`) |
| E1 | the agent-card door routed to the sweep (source) | "fix → the agent card (not the drawer) — card 0" |
| F1 | the composer left in the page (source) | "the drawer opens / it dims / it is in the drawer" |
| G1 | the example counted as tasks | "the example is not a task — 3 rows" ×2 |
| L1 | the shadow's clip removed · (the narrow-sheet rule removed) | the scroller at all five widths · "the sentence clears its controls" at 1024 (`L1-navrow-red.txt`) |

**Green** — see §7 for the one consolidated run at a named commit.

## 7. Consolidated run

**At `c017898a` (branch `todo-list-v5`), local dev bundle, one worker: 13/13 cases, 398 readings, 0 red**
(`consolidated-run.txt`, ledgers in `ledger/`):

| Lock | Readings | | Lock | Readings |
|---|---:|---|---|---:|
| A1 header | 16/16 | | D1 keys | 12/12 |
| A2 card | 26/26 | | D2 commit | 25/25 |
| B1 cleared (page) | 6/6 | | E1 doors | 12/12 |
| C1 sheet | 10/10 | | F1 composer | 6/6 |
| C2 tray | 20/20 | | G1 states | 13/13 |
| C3 desk (every task's lede swept) | 232/232 | | L1 overflow + collisions | 20/20 |

Unit halves at the same commit: `todoCleared.test.ts` 11/11, `todoTray.test.ts` 11/11. Gates at the same commit: tsc 0;
production build clean; Vitest **587/587 files, 8,838 passed**, 3 skipped.

**On the integration branch** (`8af9c320`): TD5 13/13 (`integration-run.txt`, `ledger-integration/`), Responses v2's RS2
18/18 (`integration-rs2.txt`); tsc 0, production build clean, Vitest 588/588 files (8,852 passed). **On the deployed dev
site**, A1 and C2 read green.

**L2 — the neighbours, on this build:** QC v138 17/17, v138.1 7/7, v138.3 4/4, v138.4 6/6; Contact list v17 14/14, v17.1
7/7; Submission packages v4 39/39; Corkboard v1 16/16 (after the three re-pointed `/todo` checks); query actions
`qaJourneys` 15/15; headerV3 green. **Red on this build AND identically red on the base build** (so not this pack's):
QC v138.2 D1 (an animation-timing reading), query panel v2 V6 ("another row on screen" — a fixture precondition),
`qaLocks` D5/D7 (`cor-move-a` missing; no `.qcw-list` row), header panel v2 P1/P4/P7 on `/manuscripts/packages` and
`/manuscripts/comps` (its census never learned Packages v4's light header), and the masthead matrix at `/queries` (the
Query Centre's own header since v133). Logs: `../todov5-logs/l2mine`, `l2base` (not committed).

## 8. Harness incident, repaired

TD5 D2's first run saved a send from the desk twice. The first save's slip offered no Undo (premise 4), and the case's
single guard slot was then overwritten by the second save, so **`seed-pkgq-3` (Packages' fixture, `seedPackages.mjs`) was
left Full Sent with a drawer activity.** Repaired by hand on the same morning: the activity removed from both stores
(`users/…/activities/act-5rcljni3z` and the query's own log), status back to Full Requested, and the six fields stamped by
that save deleted (`writerExpectedDate`, `writerExpectedSetAt`, `fullSentDate`, `nudgeDate`, `lastSentLabel`,
`lastStatusChange`). **Best-effort, not byte-exact** — the pre-save document was not captured; `sentPackageId`,
`sentHow` and `sentPackageEdition` were left because I can't tell whether this save or an earlier one wrote them. The
guard now accumulates (one per save, all restored after the case), and every later D2 run ended with the slip's Undo
restoring the account byte-for-byte.

## 9. Branches, deploy

- **Branch `todo-list-v5`** (pushed): `cb4fb424` … `c017898a`, on `954a9413`.
- **Integration branch** (pushed): `dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2-comps27-qp2b-comps27-1-qp2c-corkboard1-qp2d-cl16-cl17-cl171-qc138-qc1381-qc1382-qc1383-qc1384-pkg4-pkg41-pinfix-resp2-todo5`
  at **`8af9c320`**. **Dev had moved during the run** — at the start it served `954a9413` (`index-BOw0IoMj.js`); by
  deploy time another session had deployed responses v2 and the pinned-row fix (`…-pinfix-resp2`, `679a6554`,
  `index-D4dKsROU.js`). The integration branch is that branch plus `todo-list-v5`; the only conflict was
  `.refhashes.json` (both entries kept). Served hash checked immediately before each deploy.
- **Dev serves `index-HLaL39lM.js`** (hosting only; no rules or functions changed). **Not merged to main. Prod untouched.**

## 10. For Nick

- **Didn't fit at 1280 (and at 1512, which is the compact sheet on this machine):** the tray's 380px column ellipsises the
  longer deeds ("Send your full manu…") and the italic agent line; the desk's package chip ellipsises long package names
  (full name on hover). Nothing overflows (L1). At 1024 the sheet goes to one column with the desk under the tray, and
  the keys hint gives way.
- **Task types still on old routes:** `materials_unrecorded`, `materials_unrecorded_bulk`, `querying_unstarted`,
  `dream_agent_unqueried`, `agent_recheck`, and profile sweeps with more than one agent → today's Housekeeping sweep.
  Everything else opens the drawer, the agent card (one-agent profile sweep) or the own-task tick.
- **The harness account's "Cleared this week" is 0.** It counted nothing because nothing on that account was cleared
  this week by a dated record other than the locks' own saves, each of which was undone (D2 puts its save back
  byte-for-byte, E1 un-ticks its task). During D2's save the ring read 1 of 45, and B1 checks that proportion.
- **Ledes a kind can't fill from facts:** the non-profile Housekeeping kinds (`materials_unrecorded*`, `agent_recheck`,
  `querying_unstarted`, `dream_agent_unqueried`) use the card's own subtitle where it obeys the lede rule, and are often
  blank; an own task with no detail has no lede; an R&R's "asked for a revision on {date}" needs `lastStatusChange`, so
  without it the date is dropped.
- **A fixture inconsistency you'll see on the desk:** some seeded queries have their request date *before* their send
  date (e.g. Marcus Reed: asked 20 June, sent 25 June). The lede and "Asked on" say 20 June; "Where it stands" says 25
  June, because `stageHistory` refuses a stage that begins before the send. Both are right about what they read.
- **One repair to check:** `seed-pkgq-3` (§8), best-effort.
- **Lift candidates** (each now exists in two or more page-local copies): the v17.1 light header + summary card + ring;
  v17's filter pills and panels; v138's sheet, navy row, strip, sticky bands and dial; the empty page's navy panel, How it
  works and Ways to get started (now four copies).
- **Not asked, worth a ruling:** the stamp sits over the desk card's top-right, partly across the 60px dial, as the mock
  places it; and Enter acts (as E does) on the desktop, where on the phone page it opens the pane.
