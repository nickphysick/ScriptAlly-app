# Contact list v25.1 — At a glance as one ledger, the flows' headers, tidier rows with heading sorts, five tidy-ups

26 Oct 2026 · branch `contact-list-v25-1` · base `dev/db71-plad-db71f-cl25` **bbc34de1** (Contact list v25 with the CL25
locks; dev served it at the start) · integration `dev/db71-plad-db71f-cl25-lm2-cl251` **6f4be136**, deployed to dev as
**`index-D6xIkInb.js`** · **NOT merged to main.** Refs: `design-refs/contact-list-v25-1/` (17 files; every SHA-256 matched before
enrolling).

## 1. False premises

1. **"Record a response (`QcWhoReplied149`, then `QcQueryCard149`'s respond mode)" on the Contact list.** Those two flows
   are hosted only by the Query Centre. On the Contact list (and every page but the Query Centre), "Record a response"
   opens the **query drawer's own picker** (`QueryPicker` in `DrawerShell`), which has its own ink head. The new header
   is on the flows the pack names, so it shows wherever **they** open — the Query Centre's header buttons and a query
   card's "Record a response". The drawer picker keeps its ink head (its v25 moment is removed). Bringing the Contact
   list's "Record a response" onto `QcWhoReplied149` in place, as C4 did for the log, is a follow-up (*For Nick*).
2. **B's offer line, "Add the date you need to decide by".** Respond mode's date is the day the reply **arrived**; the
   decide-by date is set automatically, two weeks on (`respondDefaults` → `offerDeadline`). Softened to what the app
   does: *"Add the date it came in and we’ll set a decision date two weeks on and keep it in front of you."* The other
   three promises hold: partial and full save the writer's-turn status with a send-by date, so the send card appears
   on the To-do list; pass closes the query.
3. **B "Add an agent (the agent panel's editor, new-agent state)".** The band the writer sees there is not the editor's:
   the panel (`AgentPanelNew`) draws an ink head ("NEW AGENT / Add an agent" and a line), and the editor's own band is
   already hidden by the panel's CSS. The header replaces the **panel's** ink head; `AgentCardEditor` is byte-for-byte
   unchanged (tabs, fields and order as built).
4. **C3 "both pages show Filters at 1512".** True after C3 — v24 already folded the bar at 1440 of window; v25's
   sheet-measured fold overrode it, and removing that is the whole change.
5. **E1 "Open and not known show nothing anywhere in the row"** reads as "no door text" (the Submissions column's
   "Open / Closed / Not known"). The not-queried open agents keep "+ Log a query", as the mock's screen 11 shows.
6. **The harness account has no seeded need**: it already holds 29 rated agents and closed-to-queries agents with no
   query, so E1/E3/E4 run on the account as it is.

## 2. Per part

| Part | Commit | What changed |
|---|---|---|
| refs | ef4d1e8f | 17 refs enrolled. |
| A | 1b3ff729 | `ContactGlance251`: one white ledger card (radius 14, ring, soft shadow), four equal cells split by 1px rules with no gap; swatch + label (Special Elite 17), List health's "{n} gaps →"; the count (44 / 36 at ≤1440 of window) and the ring (HealthRing 44, gaps in light rust `#e6c9bd`) or the faces in each agent's state colours, overlapping by 3 on a white halo, cut to the measured room (≤3 at ≤1440) with "+N". Pressed `#f2f4f8` + a 3px navy bar; hover `#faf8f5`. `glanceCards` unchanged; v25's `ContactGlance25` and its tint CSS deleted. |
| B | 7ceb0741 | `shared/FlowHead` (+ `FLOW_WORDS`, `RECORD_LINE`): QcLogFlow149 (both steps; the Day chip beside ×), QcWhoReplied149, QcQueryCard149's respond mode (the line follows the pick; its "Recording a response" label goes), AgentPanelNew. `DrawerMoment` deleted; the query drawer's LogJourney, QueryPicker, DrawerShell and journey.ts back to their pre-v25 bytes; the log's pick step keeps its label and search height under the taller header. |
| C | 9d7f0209 | C1 "At a glance" 24/24 with 30 above; C2 no list health in the count line; C3 the window fold; C4 `lib/contactLogStore` + `ContactLogFlow` (QcLogFlow149 in the agent card's panel on /agents, saved through the Query Centre host's own functions); C5 "Group". |
| E | 929cefe6 | No Submissions column; "Closed to queries" pill; one-line genres (matches first, ticked, ≤2, "+n"); Your rating (five stars / "Not rated"); every heading a sort (`fit`, `urgency`, `rating` join `surname` and `reply` in `sortFacts`, with `SortCtx`); the pill and menu are the five headings in words; `qh.cl.view` keeps only those. |
| D | ba8ce122 | CL251 locks; L1 re-points; the guide's Housekeeping target moved to the ledger (CL24-F1 caught it); CLAUDE.md. |

**Hosts of the new header:** `Queries.tsx` → QcLogFlow149 and QcWhoReplied149 (the Query Centre header) and
QcQueryCard149's respond mode (every query card, from Who replied or the card's own "Record a response");
`AgentList.tsx` → QcLogFlow149 via `ContactLogFlow` (the Contact list's top bar, in place); App's `AgentCardHost` →
`AgentPanelNew` (every "+ Add an agent", on any page).

**Query Centre files changed, and why each is inside the pack's licence:** `QcFlows149.tsx`, `QcQueryCard149.tsx`,
`qcv149card.css` (Part B, the shared drawers); `Queries.tsx` (one prop removed: v25 F's `logged`). Nothing for C3 or C5
needed a Query Centre change: the Contact list's bar and group pill are its own.

## 3. Decisions made

- **Separate ledger component**, not a GlanceCards variant: the Query Centre's path is untouched. Faces take their
  agent's state colours from the page's stand map rather than changing `glanceCards`.
- **The panel's head, not the editor's band, became "Adding new agent"** (§1.3), so the editor stays exactly as built.
- **C4 mirrors the Query Centre host's save rather than sharing it** (the pack confines Query Centre edits to B, C3,
  C5); both call the same library functions. Lifting both into one hook is a follow-up.
- **C4 routes every `handleNavigate("…", "Log a query")` on /agents in place** (with any agent or book it names), not
  only the top bar's; the row's and the card's own Log doors already open the drawer directly and are unchanged.
- **Urgency's tiers**: a your-move step with no date sits after the dated ones, before "with the agent"; with the agent
  by stage Full sent, Partial sent, Queried (any other agent-court stage after Queried), then a closed query, then not
  queried.
- **Remembered sort**: an older key (status, added, agency, activity) reads as A to Z rather than a sort the pill
  cannot name.
- **qcv150.css's `.cl25-hd` widenings from v25 are left in place**, now matching nothing on this page (removing them
  is a Query Centre edit the pack did not license).

## 4. Mock / app disagreements

- The mock's drawer bodies are stand-ins: its record steps sit on the Contact list; the app's are on the Query Centre
  (§1.1). Its log body differs in detail from QcLogFlow149 — the app's is kept.
- The mock's add-agent screen is a header placeholder; the app's editor (three tabs, every field) is unchanged below the
  header, as the pack asks.
- At 1512 the mock fits five faces in Querying; the app fits six (its cell is wider): shown + N still equals the count.
- The pack's values are used where the mock differs (44/36 counts, 28/24 discs, 18/22 padding).

## 5. Strings changed

"Logging new query" · "Another one out the door – good work. Let’s get the dates and materials added, then sit back and
we’ll remind you if and when you need to nudge." · "Adding new agent" · "Fill out your agent profile with all the detail
you can. A healthy list means better tracking, analysis, suggestions and reminders." · "Recording response" · the four
answer lines (partial, full and pass as written; **offer softened**: "An offer of representation. Huge news. Add the
date it came in and we’ll set a decision date two weeks on and keep it in front of you.") · "Group" · "Closed to
queries" · "Not rated" · "Your rating" · pill words "Name A–Z / Z–A", "Best / Weakest genre fit", "Quickest / Slowest
reply", "Most / Least urgent", "Highest / Lowest rated" · count-line words "best genre fit first", "quickest reply
first", "most urgent first", "highest rated first" and reverses · the menu's fields "Name", "Genre fit", "Reply time",
"Urgency", "Your rating". Removed: "New query", "Recording a response" (as band and label), "NEW AGENT / Add an agent /
Name and agency are enough…", "None" on the pill, "· {pct}% list health", "Submissions", "Added".

## 6. Locks

**Green on v25.1 and again on the integration build:** A1 20/20 · A2 12/12 · B1 12/12 · B2 14/14 · B3 4/4 · C1 4/4 ·
C2 4/4 · C3 4/4 · C4 3/3 · C5 4/4 · E1 10/10 · E2 8/8 · E3 3/3 · E4 50/50 · E5 3/3. Unit: `contactSort251.test.ts`
(5 cases).

**Red first on the base build (v25, `CL251_BASE=1`), every lock:** A1 10/14 · A2 4/12 · B1 2/7 · B2 3/14 · B3 2/4 ·
C1 0/4 · C2 2/4 · C3 3/4 · C4 1/3 · C5 2/4 · E1 3/10 · E2 6/8 · E3 1/3 · E4 15/50 · E5 2/3.

**And under each lock's own break:**

| Lock | Break | Reading |
|---|---|---|
| A1 | a 14px gap | "no gap — 14.0 / 14.0 / 14.0" |
| A2 | no bar on press | "pressed bar — shadow none" |
| B1 | the courier art left in the header | "1 img(s) in the header" |
| B2 | a line before a pick | "line "A line"" |
| B3 | the line dropped | "line undefined" |
| C1 | 19px | "19px/20px · 24px/24px" |
| C2 | list health restored | "… · 69% list health" |
| C3 | the sheet rule (labels hidden at 1512) | "Filters label null" |
| C4 | navigate to /queries (build) | "path /queries"; "the log flow in the panel missing" |
| C5 | "None" | "pill None" |
| E1 | the Submissions column restored | "… · your rating · submissions" |
| E2 | wrap allowed | "1 rows wrap" |
| E3 | Added shown | "last added" |
| E4 | unknowns reversed with the rest (build) | "reply reversed … ,,,,,,16,12,…" |
| E5 | a separate heading state | "heading null" |

Ledgers: `reports/contact-list-v25-1/ledger/` (`base-*`, `mut-*`). Every ledger now writes before a test fails
(`doneAll`): E3's first break run was masked by E1 failing first on the same heading, and was re-run.

**L1 on v25.1:** CL25 5 passed · CL24 7 passed · QC150 25 · QC1501 15 · QC1492 4 · QC149 17 (8 skipped, as before) ·
QC149-L0 3 passed (0 style differences, 0% pixels, against a reference re-captured from the base build this session) ·
HR1-1…7 pass. **HR1-8 is red on the base build too** (`phone /agents`: `a: [null], b: [null]`), as in v24 and v25.

**On the integration build (before deploying):** CL251 6 passed · CL25 5 · CL24 7 · QC150 25 · QC1501 15 · QC1492 and
QC149 each had one red in the first pass that went green when re-run with nothing changed. QC1492 L3 at 1920 read "the
panel is open — null"; a second full run died at sign-in (the password throttle, 300s waiting for the email field);
alone, L3 read 18/18. QC149 L9-1280 read "the panel stays open on the card — closed"; the re-run gave 17 passed (8
skipped). Neither suite reads anything this pack changed at those points; both passed on v25.1. Recorded as timing on
a shared account, not as fixes.

**Re-points and retirements** (a comment at each): CL25-B1/B2 retired (CL251-A1/A2); CL25-F1 retired (CL251-B1–B3);
CL25-D1's glance probe → the ledger; CL24-A2 (List health) and "no gaps" → the ledger's cells; CL24-A3's Querying press →
the ledger, and its "open" reading dropped (the door left the row); CL24-B2's columns → Replies in shown at both widths,
Your rating dropping at ≤1440; unit tests `cardsSort`, `contactList` (nine sorts; reversed reply keeps ties A to Z) and
`contactListMemory` (only the five heading sorts are remembered). No Query Centre suite needed a re-point.

## 7. Screens (from dev, `index-D6xIkInb.js`)

`screens/` beside each ref screen, at the same size and state: `01-glance-1280/1512`, `02-glance-querying-1280/1512`,
`03-log-pick-1512` and `04-log-details-1512` (the Contact list, in place), `05-record-who-1512` to
`08-record-pass-1512` (the Query Centre, §1.1), `09-add-agent-header-only-1512`, `10-rows-1280/1512`,
`11-rows-not-queried-closed-1512`, `12-sort-rating-1512`, `13-sort-replies-1280`. The refs are @2x; these are 1x.

## 8. Dev, worktrees

Dev moved during the pack: it served v25 (`dev/db71-plad-db71f-cl25`) at the start and
`dev/db71-plad-db71f-cl25-lm2` (25d887e7, `index-BbeaZ_TR.js`, landing on phones v2 merged on top of v25 — confirmed by
building it) at deploy time. Integration `dev/db71-plad-db71f-cl25-lm2-cl251` = that + `contact-list-v25-1` (one
conflict: the refs manifest, base taken and the ref re-enrolled). Gates there match the baseline (tsc 0, both builds 0,
Vitest only the three `functions/` reds present before any edit). Worktrees `ScriptAlly-cl251`, `ScriptAlly-cl251base`
and `ScriptAlly-cl251int` removed at the end.

## 9. For Nick

1. **"Record a response" on the Contact list** still opens the query drawer's picker with its ink head, not the new
   "Recording response" header (§1.1). Want it in place on the Contact list, as Log a query now is?
2. **The offer line is softened** (§1.2). If the decide-by date should be the writer's to set in respond mode, that is
   a behaviour change to make first; the line can then go back to the pack's words.
3. **C4's save is a mirror of the Query Centre host's.** Worth lifting both into one hook before they drift.
4. HR1-8's `phone /agents` population is empty on base and here; it needs its own look.
5. Prod is untouched; nothing merged to main.
