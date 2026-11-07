# To-do list v52: report

Branch `todo-list-v52` (worktree `../ScriptAlly-td52`), cut from the branch dev was serving at the start:
`dev/…-td51-td511-cb2-sm1-qc1522b-cb21-db22-ql1-rv2` @ `46a51815` (bundle `index-D4-_I14k.js`).
Not merged to `main`. Dev deploy: not yet. It waits until you have read this report (see §7).

## 0 · False premises

1. **Dev was not serving `…-qc1522-td51-td511`.** It served the later `…-db22-ql1-rv2` line (sidebar rail v2 on query
   letters on dashboard v2.2 …), which carries v51.1. Built on that tip.
2. **The pack was a zip in `~/Downloads`**, not in the designs folder. All 37 files verified against `SHA256SUMS.txt`.
3. **"Reuse the Query Centre's header component at a slim size."** `QcHeader151` (`QcPage151.tsx`) has its title
   ("Your queries"), its count line and its two buttons fixed inside it, and all its rules are scoped under `.qc151`.
   The To-do header is built in its dress (navy `#2a3a52`, radius 20, padding 16/22/16/32, the outlined pill) and its
   width rule is the Query Centre's (`min(sheet − 80, cap)`, −56 under a 1400 window), capped at 1320.
4. **"The card on dev's To-do is the wrong one."** It was a Query Centre component — `QcOpenCard`, the older card the
   Query Centre still uses for the Pip practice query. The desktop Query Centre opens `QcQueryCard149` over the v152
   thread, and **its props were assembled inside a ~640-line block of `Queries.tsx`, mixed with the save handlers**,
   so there was no self-contained component to import. With your go-ahead, the reading half moved verbatim into
   `queries/centre/qcCardView.ts` (`buildCardView`), which both surfaces call (Part D). The Query Centre's full unit
   suite is identical before and after.
5. **"Remove every timer-based advance."** There was none in the app: picking an option never advanced (the mock's
   380ms advance was the mock's). L8 now locks that it never does.
6. **"When the calendar is open, only Older is highlighted, not Today as well."** Already so in v51.1
   (`aria-pressed={!open && …}`). L9 locks it.
7. **The Contact list's agent card** was already the one the preview drew (`AgentCard262`), so Part D changed only the
   query card.
8. **"Remove the header priority line's code."** Its phrase builder (`doingPhrase`, `priorityTask`) is reused
   unchanged by Start here; only the header markup and rules went.
9. **The mock's header title is 32/32**; it is 32/1.3 here (mixed-case Special Elite has descenders), so the header
   measures ~97 against the mock's 91.

## 1 · Step 0 answers

- **QC header:** `QcHeader151` in `QcPage151.tsx`; `.qc151 { --qc151-w: min(calc(var(--hsheet-w) − 80px), 1100px);
  margin-left: calc(50% − w/2) }`, −56 under 1400px; banner `.qc1512-ban` padding 30/34/28, radius 22, navy `#2a3a52`,
  title Special Elite 44/1.3.
- **QC open card:** `QcQueryCard149` with `v152` data → `QcCard152`; root `data-qc152="card"` (also
  `data-qc149c="card"`, `data-id`). The To-do preview rendered `QcOpenCard` because v50 was written against it.
- **Contact list card:** `AgentCard262` (`agents/contact/AgentCard262.tsx`; `AgentList.tsx:1122`).
- **Quill:** the app's `public/images/query-centre/quill-ink.webp` — the same 126×160 drawing as the pack's
  `start-here-quill.webp`, re-encoded (different bytes). Used the app's copy.
- **Start here's phrase:** `doingPhrase` (`lib/todoWs.ts`), unchanged; its apostrophe locks are `todoWs.test.ts`
  (Zoë O’Rourke, Mary-Kate Smith-Jones, Agence Zoë).

## 2 · Commits (one per part)

Committed in the order D, A, B, C, E, F: D went first because the lift it needed was approved before the rest was
built, and each later part's diff sits on top of it.

| Part | Commit | What |
|---|---|---|
| D | `82d19a3c` | `buildCardView` lifted out of `Queries.tsx`; the preview renders `QcQueryCard149` over v152 from it |
| A | `83c68dff` | the 1320 column, the slim navy header, the stats line; no page scroll |
| B | `04d969a0` | Start here, the « collapse and the 112 strip, Housekeeping's look, fixed 340 / 390 |
| C | `7c67364e` | one question at a time, answer chips, the footer's one primary, no review drawer |
| E | `23c18545` | dead code (`Flow.review`, `dateHint`, the sticky Next, review-drawer CSS…); checks re-pointed |
| F | `e7893415` | `tests/e2e/todoV52.measure.ts` (TD52), `todoV52Shots.measure.ts`, unit tests for the new helpers |

Gates at every commit (tsc, `build:dev`, production build, full Vitest, read from their own exit codes and counts):
tsc and both builds clean throughout, with no CSS warnings in either build log. Vitest stayed at the baseline's
**2 failed / 11,458 passed** (11,460 at F with the two new tests). The 2 failures are
`src/test/firestoreTarget.test.ts`, red on the base commit before any change; it is a census of script entry points
and touches nothing in this pack. Rules tests: 247 / 247 on the baseline (no rules change in this pack).

## 3 · Locks (TD52, `tests/e2e/todoV52.measure.ts`): red first, then green

Run against the emulator (`npm run dev:emu` in this worktree on its own ports; see §7), `--workers=1`.
`TD52_MUTATE=<lock>` applies each break in the page; L11's break is a source change applied by hand. Readings:
`reports/todo-list-v52/readings/`.

| Lock | Mutation | Red (the assertion that fired) | Green |
|---|---|---|---|
| L1 width | `--tws-w` without the 1320 cap | "L1: at most 1320 wide" at 1512 and 1920 (1280 stays green: its column is under 1320 anyway) | 3 sizes: edges equal to 0px, centred ±0, `scrollHeight === clientHeight` |
| L2 header | the old priority line put back in the header | "nothing in the header says “highest priority” or “Start here”" | title, stats line `n to do · n late · n done this week`, + Add a task |
| L3 Start here | Start here moved into the header | "Start here is the list's first child" | first child; quill; builder phrase; opens its task; "You’re on it"; absent in Snoozed, Done, strip |
| L4 widths | `.tws-wp { width: 30vw }` | "L4: the preview is 390" at all three sizes | tray 340, preview 390 at 1280 / 1512 / 1920 |
| L5 collapse | expand on hover | the 112 check: the pointer already sits over the strip after the « click, so the break re-expanded at once (228 off) | 112; desk +228; hover leaves it; survives reload; 104 items labelled |
| L6 one question | a clone of the open question injected | "L6 send step 0: exactly one open question" | 9 task kinds, every step: one open question, chips = answered, a chip returns with later answers kept |
| L7 footer button | footer `overflow: hidden`, labels and "n of m" forced on | "L7 1280 open send step 0 … inCol: false, hit: false" (the narrowest column) | 3 sizes × tray open / collapsed × 9 kinds × every step |
| L8 no auto-advance | a 380ms advance on any choice | "L8 send step 0: a choice alone does not move on" | every choice: 1s, same step; the primary moves exactly one on |
| L9 date | Today's chip set pressed with the month open | "only one chip is selected: ["Today7","Older"]" | only Older; month 694 → footer 695 (no overlap); no hint |
| L10 no review route | the "Check it on the card first" link put back | "nothing on the desk says “Check it on the card first”" (asserted before any write) | Log it: one press lands, the second cannot; celebration; Undo puts the nudge back |
| L11 live card | the preview rendering `QcOpenCard` again (source) | "the preview's root is the Query Centre card (data-qc152=card)" | same query id, band, pill, name and tabs (Tracking · Agent · Materials · Notes) as the card the Query Centre opens; the agent preview is `AgentCard262` |
| L12 housekeeping | the icon tiles swapped back to initials circles | "Fill in what you sent · 63 queries: an icon tile" | header `rgb(228, 235, 241)`; tiles, badges (not on the batch row), Quick fill, no "No date" |

**L11's second clause, proved separately:** with the "Tracking" tab label renamed in `QcCard152.tsx` for one run, the
To-do preview read `["Tracking-PROBE","Agent","Materials","Notes"]` with nothing else changed; the file was restored
from a path-named copy (no diff).

**L10 and "the save once":** one Log it press produced 3 write requests on Firestore's write channel (the nudge's
existing save; this pack did not change it). What the lock can hold is that the button takes one press and a second
cannot land before the celebration replaces it; it does not count the save function's calls.

**L13 no regression:** the neighbouring suites against the base build, on the same emulator snapshot:
- `todoWs.measure.ts` (v51.1's To-do locks, re-pointed): **12 / 12 passed**.
- Contact list `contactV26` + `contactV262`: **37 / 37 passed**.
- Query Centre `qcV1522`: the **same cases fail on the base commit as on this branch**, with the same messages, so the reds are not this pack's.
- Query Centre `qcV152` at 1280: the same as base. **At 1512 it was run on this branch only, not on base** (see §7).

## 4 · Screens

`reports/todo-list-v52/screens/`, each at 1512 × 982 and 1280 × 800, numbered to match the pack's
`design-refs/todo-list-v52/screens/01–17`: 01 workspace · 02 option picked · 03 date with the month open ·
04 summary, Log it · 05 logged (the run then presses Undo) · 06 gone quiet · 07 gone quiet, nudge · 08 offer ·
09 reply time (10 weeks) · 10 your own task · 11 tray collapsed · 12 snooze · 13 dismiss · 14 housekeeping ·
15 Snoozed tab · 16 Done tab · 17 hovering the preview. Made by `tests/e2e/todoV52Shots.measure.ts`.

## 5 · Components and assets

- Query preview: `QcQueryCard149` (→ `QcCard152`) from `buildCardView` + `stampedCardRows`
  (`queries/centre/qcCardView.ts`), every handler inert; the pending step is the card's own `card1522.draft`.
- Agent preview: `AgentCard262`, as before.
- Quill: `public/images/query-centre/quill-ink.webp`.

## 6 · Copy kept true, and where the app's data won

- All the pack's words are as written, apart from the three below.
- **The search box says "Search tasks"**, as v51.1's did; the mock's field has no visible placeholder at the
  sizes drawn.
- **The stats line names the book only when the writer has one manuscript.** With several, the tray covers all
  of them, and naming one would be false.
- **The strip's labels cover every kind the app raises**, including ones the mock does not draw (`stripWords`
  in `lib/todoWs.ts`, unit-tested). The mock's kinds use its own words.

## 7 · Not done, and why

- **The header measures ~97px against the mock's 91**, because the title keeps line-height 1.3 (see §0.9).
- **`qcV152` at 1512 was not run on the base build**, so its result there is not compared.
- **L5's red fires one step early.** The pointer is already over the strip after the « click, so the
  expand-on-hover break re-opens it immediately. It is still red, but on the 112 check, not on the hover check.
- **Not deployed.** Per the brief, the dev deploy waits for your read. It will be a new `dev/…-td52` branch on
  top of whatever dev is serving at that point, checked by bundle hash.
- **The local port shift is not committed.** This worktree moved its emulator ports so it could run beside other
  sessions. That change stays outside every commit and is undone when the worktree is removed.
