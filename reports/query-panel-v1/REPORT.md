# Query panel v1 — a query opens in a side panel, with the list still live

Branch `query-panel-v1`, cut from `origin/main` at `13313c9d` (it contains Query Centre v137). Four part
commits. Not merged to `main`.

**Commit order:** B (`d2f8072f`) landed before A (`ff2b808c`). My first Part A commit failed at staging and I
did not notice until B had gone in. I added A as the next commit rather than rewrite history. B on its own
does not build; A, C and D each build on what is before them.

## False premises, and where the build differs from the brief

1. **There was one action surface, not several.** The brief names a record-response drawer, a mark-sent
   popover and a correction sheet. Every action (record a response, mark sent, nudge, close, answer an offer,
   edit) already runs through ONE shared drawer of multi-step journeys (`QueryDrawer`), each ending in a
   review. The mark-sent popover was deleted long ago. So Part C moves that one drawer's shell into the
   panel, steps and all. The mock's single-page forms are not what is built.
2. **The shared drawer's container cannot be removed (Part D).** The Dashboard, the To-do list, the agent
   card and the list's own row tray still open it as a drawer. Only the Query Centre's card steps into the
   panel. Part D removed what the panel made dead and left the drawer.
3. **There is no "Reopen query".** A closed query's only door is "Record a late reply": the reply that
   arrived is what reopens it. No journey reopens a query without one, and the brief says not to touch
   writes. The panel keeps "Record a late reply" and its step is titled "What did {first name} say?". P8
   asserts that, not the table's "Reopen query".
4. **Only the Query Centre opened a query.** The Dashboard, search, the To-do list, the Calendar and
   Submission packages all navigate to `/queries?q=<id>`. The Contact list never opens a query (its card
   opens the action drawer). The feed drawer has no "open this query" door at all: its rows open a journey.
   So "opening a query from the feed replaces the feed, with Back to activity" has nothing to attach to and
   is not built.
5. **The feed drawer v2 container is not a reusable component.** It is three sheets' own rules (the feed
   drawer, the Birds-eye drawer and `HalfDrawer`). I extracted its treatment into `SidePanel` and used that
   for the query. I did not move the three existing drawers onto it.
6. **Back with answers parks the journey.** The brief says Escape, Cancel and Back return to the query. They
   do. But the app-wide rule (Agent card v1, decision 8) is that a journey with answers is PARKED, not thrown
   away, and I kept it: the query comes back and a "finish it" chip appears bottom right. With no answers it
   simply cancels.
7. **The consequence line is the journey's own "When you save" list.** No action lacked a preview: every
   journey already states what saving changes. The panel shows those lines in the box above the foot, on
   every step once the journey has enough to say. None of the brief's plain sentences were needed.
8. **The row is not held in place after a save.** The brief asks that the row is not re-sorted until the
   panel closes. The list sorts and groups from live data, and holding one row still means freezing the
   grouping too. Not built. After a save the row moves to its new group at once; the panel stays on it.
9. **"Both reference viewports are compact" is not so.** At 1512 the panel is 560; at 1280 it is 520. The
   1512 reference draws 560.
10. **Phones keep their own page.** Under 768px the Query Centre is still the v126 phone page with its own
    drawer. The panel's full-screen form runs from 768 to 899.
11. **The ⋯ menu's "Snooze the nudge" is still a small popover** anchored to the button. It asks one thing
    and has no step to give.
12. **A row's own tray buttons still open the drawer as a drawer**, as the brief says ("keeps its own
    behaviour"). With the panel open on that same row, that is a drawer over the panel.
13. **Opening from another page depends on the Query Centre's own filters.** The card is composed by the
    Query Centre, from its visible rows. A query hidden by a filter left on there will not open over the
    Dashboard.

## Follow-up, 11 Oct: your three decisions, the older suites, P13 and P14

Decisions as ruled: no reopen-without-a-reply; the parking chip stays; the row moves after a save.

**Found by P13, in the existing delete-entry flow (not the panel's, and not changed):** deleting an entry through
the timeline's "It never happened" puts back the status, the stage dates and the query's own log. It does not put
back everything:
- `responseDeadline`, cleared when the request was recorded, stays absent;
- `expectedSendDate` and `sendReminderDate`, set by it, stay on the query;
- the feed's row for the deleted entry ("…requested a full manuscript") was still there six seconds later in
  every run of the final suite (it was gone in one earlier run, so it looks like a race).

The journey's own Undo is a snapshot and restores all of these. P13 holds what returns and prints what does not.
The seeder's `--clean` removes the test query and every leftover, so the account is as it was.

**The timeline is oldest first.** The brief asks for the new entry to be first; it is the last row. P13 asserts
"the latest".

### The three commits

| Commit | What |
| --- | --- |
| `45aaf306` | the older suites open the panel |
| `ee694ec4` | on `/queries` a row's tray button steps that row's panel; lock P14 |
| `803f03b8` | lock P13 (a save, then undone), with P3's moved-row checks |

A fourth commit carries two helper fixes found by the re-run, and this record.

### P13 and P14

| Lock | Green reading | Mutation | Red reading |
| --- | --- | --- | --- |
| P13 save | the panel returns to the query; "Full requested" is the latest entry; the card's pill and the row say Full requested; the row moved group and is the one selected row; then the entry is deleted and the status, stage dates and log are as they started | the panel does not return after the save | "panel true · step false · card shown false" |
| P3 (added, inside P13) | after the move, Down opens the row now below it and Up returns to the moved row | (P13's) | — |
| P14 tray | one dialog, it is the panel, it is that row's, step `sent`, title "What went to …", no scrim, `?q=` is the row | the tray opens the drawer | "1 dialogs · the panel false", 1 scrim |

The tray's button reads "Log the send" on a Full Requested row, not "Mark full sent": that is the tray's own
label and I left it. It opens the same journey.

### The older suites

| Suite | Result | Notes |
| --- | --- | --- |
| `queryPanelV1` | 11 tests passed (P1–P14) | |
| `qcV137` | 13 passed | |
| `feedDrawerV2` | 4 passed | |
| `qcV132` | 10 passed, 6 skipped | W7 and W9 now read the panel |
| `qcV134` | 1 passed, 10 skipped | the one reference to the modal is in a retired test |
| `queryActions` | 3 passed | §F was already red on `main` (it clicked the row's centre); it now opens the query by the agent's name and passes |
| `contactV13` | CL13-10 passes. **CL13-12 fails, and fails the same way on `main`** (its loading frame's tab and band shape) | one check retired: "the query card peeks above its dock chip" asserted the modal's dock |
| `qcV126` | 17 passed, 7 skipped, **6 failed, the same six that fail on `main`** | QC126-2 (old colours in `a17.css` and `msv21.css`), -6, -7, -11 and -20's featured-card check (all about "Recently updated", removed by v137), and -2.10 (no torn starts on the account). QC126-18 and the rest of -20 now read the panel and pass |
| `agentCardV1` | 45 passed | lock 10 was red on `main` (the shared opener clicked the row's centre); the opener now clicks the agent's name |

Retired by name: contactV13's query-card dock-peek readings (ten of them), for the reason above. Nothing else
asserted the modal itself.

Gates after the follow-up: tsc clean, both builds clean, Vitest 8,570 passed, 3 skipped, the same 1 file failing
to load.

## §0 Recon

**Base:** `origin/main` @ `13313c9d`. Baseline: tsc clean, both builds clean, Vitest 563 files passed and 1
failed to load (`functions/src/email.test.ts`), 8,563 passed, 3 skipped.

**§0.2 The open-a-query surface, as found.** `QcQueryModal` (`src/components/queries/centre/QcQueryModal.tsx`):
a centred card over a 42% scrim, portalled to `document.body`, with the page scroll-locked. It held
`QcOpenCard`, which `Queries.tsx` composes once. Under 900px of column a second house, the old `QueryPanel`
drawer, took the same card content. The open query is `?q=<id>` on `/queries`.

| Door | As found | As changed |
| --- | --- | --- |
| Query Centre: a row, a face in the strip, `?q=` | modal | side panel |
| Query Centre: a Birds-eye bar or name | modal over the drawer | side panel |
| Query Centre under 900px of column | the old drawer | side panel, full screen |
| Dashboard: a pin on the chart | navigates to `/queries?q=` | **side panel, over the Dashboard** |
| Search palette, To-do list, Calendar, Submission packages | navigate to `/queries?q=` | unchanged: they arrive at the panel |
| Phone (under 768px) | the phone page's drawer | unchanged |

Call sites changed: `Queries.tsx` (the one mount), `Dash58.tsx` (the chart's `onOpenQuery`), `App.tsx` (a
query opened over another page closes when the route changes).

**§0.3 The action surfaces, as found.** One component, `QueryDrawer` (`src/components/queryActions/`), a
right-hand drawer with a scrim, opened through `openQueryDrawer`. Seven journeys.

| Action | Journey | Writes | Now |
| --- | --- | --- | --- |
| Record a response (and a late reply) | `ResponseJourney` | the journey's own commit, with a snapshot for Undo | steps the panel |
| Mark partial / full sent | `SentJourney` | the same | steps the panel |
| Record your answer (offer) | `OfferJourney` | the same | steps the panel |
| Nudge | `NudgeJourney` | the same | steps the panel |
| Close query | `CloseJourney` | the same | steps the panel |
| Edit an entry | `EditJourney` | the same | steps the panel when opened from the card |
| Correction fork (⋯ on a timeline entry) | `CorrectionDesk`, a card beside the panel | the correction flow's own | steps the panel |
| Delete query | an inline confirm in the card's foot | `deleteQueryWithUndo` | unchanged, in the panel's foot |
| Snooze the nudge | a small popover | the snooze write | unchanged (premise 11) |
| Reopen | does not exist (premise 3) | — | — |

Nothing writes outside its journey, and nothing needed a route of its own, so neither stop condition applied.

**§0.4 The shared shell.** Not a component (premise 5). `SidePanel` (`src/components/shell/`) is the
extraction: fixed, 8px in, 560 (520), radius 12, the feed drawer's shadow, a 180ms slide and fade, no scrim,
and a slot an action's form is portalled into.

## What was built

- **A.** `SidePanel` and `QueryPanelHost`; the modal deleted; the selected row; swap in place; Up, Down, J
  and K; Escape; `?q=`; focus to the heading and back to the row; the Dashboard opening in place; one
  right-hand panel at a time (the query, the feed and the Birds-eye drawer give way to each other); the
  floating tabs hide while a panel is open.
- **B.** No "Querying" block; one caption from other pages; no materials stamp; the close in the head; the
  court band; the head and tabs fixed over a scrolling body and a pinned foot.
- **C.** `panelDoors` and `panelStepWords` (the table); the drawer's shell portalled into the panel's slot
  with the step frame; the correction desk stepped in the same way.
- **D.** The dock rules for the Query Centre's card, its state and one unused import, removed.

Files deleted: `src/components/queries/centre/QcQueryModal.tsx`, `src/components/queries/centre/qcvModal.css`.

## Gates

tsc clean. Production and dev builds clean (the chunk-size note only). Vitest 564 files passed and 1 failed to load
(the same `functions/src/email.test.ts`), 8,570 passed, 3 skipped. Baseline: 563 and the same 1; 8,563 passed, 3
skipped.

Three source-reading unit locks that described the two old houses (the docked card and the under-900 drawer)
were re-pointed: `qcCentre.test.tsx` ("two houses" is now "one house"), `queryPanel.test.ts` and
`respondDesk.test.tsx` (counts of takers). `qcList.test.tsx`'s band case follows the new markup. New unit locks:
`src/lib/queryActions/panelDoors.test.ts`.

## Locks: `tests/e2e/queryPanelV1.measure.ts`

All twelve are green at 1512 × 900 and 1280 × 800 (P12 at 800 × 900), and each went red under its named mutation
(`reports/query-panel-v1/mutation-proofs.json`, logs in `mutation-runs/`). No lock saves anything: every step is
opened and left by Back, Cancel or Escape.

| Lock | Green reading | Mutation | Red reading |
| --- | --- | --- | --- |
| P1 container | right 8, top 8, bottom 8; 560 at 1512, 520 at 1280; radius 12 | `right: 0` | right 0 |
| P2 no scrim | the row under the pointer is the row; nothing dimmed or filtered; the body is not scroll-locked | a 50% scrim | the pointer hits the scrim |
| P3 swap | the heading changes, the box does not, it is the same element, one row selected | the element replaced on a swap | 560 → 500 wide; not the same element |
| P4 selected | `rgb(247, 243, 237)`, a 3px inset edge in the court's colour, 0 `.kf` rows | `.kf` left on a row | 1 `.kf` row |
| P5 keyboard | Down opens the next visible row, Up the previous; with a step open Down does nothing and Escape steps back; Escape then closes | Escape always closes | the panel closed from a step |
| P6 scroll kept | scrollTop 1100 before, open, swapped and closed | the opened row scrolled to the top | 1100 → 1132 → 1207 |
| P7 one surface | every footer button on five kinds of query: one dialog, nothing painted over the page outside the panel, the step replaces the card | the step as a fixed drawer and a dialog | 2 dialogs |
| P8 next move | the five kinds each show their primary and their step's title (closed: "Record a late reply", premise 3) | Record a response as the with-you primary | "Record a response" on Tobias Hark |
| P9 pinned foot | the body scrolled to its end: the foot's box unchanged, the body ends above it | the body stops scrolling | the foot ends at 2360 in an 892 panel |
| P10 no repeat | from `/queries`: no block, no caption; from `/dashboard`: opened in place, "for {title}" at 13.5 italic, title in Special Elite | the block always shown | 1 block |
| P11 URL | `?q=` set on open; Back closes and clears it; loading with `?q=` opens it | the param dropped | q=null |
| P12 narrow | 800 × 900: the panel is 800 × 900 at 0,0, no radius, the close reads Back | the 8px float kept | 520 × 884 at 272,8 |
| L1 no regression | QC137: 13 passed. Feed drawer v2: 4 passed | n/a | n/a |

P8 found all five kinds of query on the harness account at both sizes, including a with-the-agent query over a
year old.

**P3's mutation is not the brief's.** Closing by the × and reopening by the click, in two events, left the lock
green: the router batches the two navigations and the panel never unmounts between them. So the real page cannot
make that fault that way. The mutation replaces the panel element outright, which is what a close-and-reopen
would do.

**P7 counts what is painted, not what is present.** Every workspace page stays mounted, so other pages' overlays
have boxes with high z-index (the Dashboard's tooltip host, the To-do list's slide-over). The lock counts an
element only if it is on screen, not transparent, and the thing under its own centre.

**P9's mutation is not `position: static`.** The foot is pinned by the panel's flex column, not by sticky, so
that declaration changes nothing. The mutation stops the body scrolling instead.

Older e2e suites that still look for the modal (`data-qcv="qm"`) or the Query Centre's dock chip were not re-run
and will need re-pointing: `contactV13`, `qc126Shots`, `queryActions`, `qcV134`, `qcV126`, `qcV132` (its W7 and W9 open a query) and
`agentCardV1`. The shared opener `tests/e2e/openQuery.ts` IS re-pointed to the panel, which covers the suites that
go through it.

## Shots

`reports/query-panel-v1/shots/`:

| Shot | Reference |
| --- | --- |
| `open-agent-1512.png`, `open-agent-1280.png` | `ref-open-1512@2x.png`, `ref-open-1280@2x.png` |
| `open-you-1512.png`, `open-you-1280.png` | `ref-open-you-1512@2x.png` |
| `open-closed-1512.png`, `open-closed-1280.png` | none |
| `step-resp-1512.png` | `ref-step-response-1512@2x.png` |
| `step-sent-1512.png` | `ref-step-sent-1512@2x.png` |
| `step-nudge-1512.png`, `step-close-1512.png`, `step-reopen-1512.png` (the late reply) | none |
| `dashboard-1512.png` | none |
| `narrow-800.png` | none |

## For Nick

- **Reopen.** Say whether you want a real reopen-without-a-reply. It is a new write, so it is a pack of its
  own.
- **The steps are multi-step journeys, not the mock's single forms.** They fit at 520, but the stepper and a
  review take more room than the sketches. Nothing was cramped enough to cut.
- **Parking.** Back with answers leaves a chip. Say if, inside the panel, you would rather it asked "Discard?"
  instead.
- **The row jumps group after a save** (premise 8).
- **The other three right-hand drawers** (feed, Birds-eye, Housekeeping) still carry their own copies of the
  container. Moving them onto `SidePanel` is a follow-up.
- **The row tray over an open panel** (premise 12): its doors could step the panel when the panel is on that
  row. One line each, if you want it.
