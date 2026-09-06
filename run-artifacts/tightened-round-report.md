# To-do — the tightened page

**Where I stopped:** all five phases complete and committed. Phase 5 leaves two suites red and
both are named with their reason — `qcPanel` (standing, another stream's) and `deedRound` (six
journey-flow cases, not mechanical).
Recon at the top, then a phase each, then the mutation table, the false premises, concurrency,
and the shots.

**Contracts.** `todo-belongs.html` was absent from the tree; the Downloads copy matched the
brief's `d1ed244136c7bbf9d9d72f3ad4dead7f` byte-for-byte, was installed and enrolled through
`--update` (30 refs guarded), and committed alone as `0646480e`. `todo-sort-filter.html` was
already present and matching — cited, not recommitted.

| phase | SHA | what landed |
|---|---|---|
| contract | `0646480e` | `todo-belongs.html` enrolled |
| 1 | `dea03177` | one toolbar; the command bar folds into the card |
| 2 | `d4d0b53b` | the dense list; the keyboard the module had already decided |
| (fix) | `9dd5ddad` | the two words the shell ate out of Phase 2's message, and the rule |
| 3 | `fe79cea4` | the sheet is a document |
| 4 | `5c5d551d` | the Quick Look column |
| 5 | `<this>` | three suites retargeted and re-proved; the rest dispositioned below |

---

## Recon (Phase 0)

Full text in `run-artifacts/tightened-recon.md`. The five answers, in brief:

1. **Row height** was set by nothing — `.tlc .row` was content-sized (padding plus the tallest
   cell), and the folded state wrapped its deed to ~58px against ~50 at rest. One rule, one
   `--row-cols` token, two track lists.
2. **The page header belongs to the header stream.** The "To-do list" H1 is `PageHeader`'s,
   inside `WorkspacePageGrid`, via the shared `TasksPageLayout` — the app-wide masthead format
   whose ten-page census asserts nobody opts out. So Phase 1 took the brief's own fallback: the
   toolbar is the LIST CARD's top chrome and the page header is untouched.
3. **Status tint** is `stageFor(status)` (`lib/queryCardFacts.ts`, "THE ONE MAPPING, EXPORTED")
   over `var(--stage-*)`, eight values declared once under `.t-f12` — which `/todo` already wears,
   so the tokens resolve here without the Calendar's documented-copy debt.
4. **Keyboard**: three live bindings (`/`, Escape, ↑↓). And `lib/taskShortcuts.listKey` already
   decided j/k/Enter/s/x/./o/e — with **no caller anywhere in the app**.
5. **Suites over the retired objects**: named in the recon, dispositioned in Phase 5 below.

---

## Phase 1 — one toolbar · `dea03177`

The separate command-bar row above the split is retired; its contents are the list card's own top
chrome, one 32px row above the search. `TodoCommandBar` → `TodoToolbar` — a rename that is also
the retirement of the concept.

**Coordination, not edits.** The masthead keeps the page's one title (recon 2). The duplication —
a masthead plate above a title-less toolbar — is **recorded here for the header stream**: until
that stream offers a compact or toolbar masthead variant, `/todo` carries both, and the ~150px the
brief wanted back is only partly recovered (the tool row had already gone in an earlier pass).

The meter reads the same `railGroups()` array the rows render from, and P1.8 asserts its figures
**against the group heads' own**, both read off the rendered page. The bar's jump-to segments
retired with it: the contract's meter is not interactive and the heads are sticky.

## Phase 2 — the dense list · `d4d0b53b`

44px single-line rows in both states, height **stated** on the one base rule. Collapsible section
heads. Row actions expand **beneath** the row on focus — a sibling, never an overlay. The
manuscript column retires; the name rides the strip's meta.

**The keyboard was already decided and wired nowhere.** The page calls `listKey` now, which
changes what membership means, so the union is trimmed to the wired set and dismiss moves `x` → `d`
(the contract's key, printed in the footer). `x` is unbound again — the tooltip that taught it is
long gone — which hands the mail-client selection convention back.

## Phase 3 — the sheet is a document · `fe79cea4`

The tinted band is retired: a white chrome row (family pill · position · three 26px controls over
a hairline) with the pill as its only tint, and the deed sentence moved into the document as its
title, Playfair 21/400, one ink over every descendant. Content column 620, fork rows 56, ledger
rows 42.

## Phase 4 — the Quick Look column · `5c5d551d`

The floating slip is retired. The rim is the contract's grid: header and foot spanning, document
and reference side by side, one vertical hairline between them, no radius and no inner rim. The
header is the only tinted region and its colour is the Query Centre's ladder, derived per query.
Agent row, facts as a definition list on the 78px label column, the story, and a dotted-underline
link. Collapse gives a 30px spine — **and the document keeps its width**, because the sheet gives
up exactly what the column gave up.

---

## Every assertion, red → green

59 assertions across four phases, all green, in `tests/e2e/tightened.measure.ts`
(`run-artifacts/tightened*.txt`). Measured at 1440 throughout and at 1920 where the law has a
second half.

| # | mutation | reddened |
|---|---|---|
| M1 | `.l-toolbar` gains an 80px top margin | P1.1 |
| M2 | `.cb` height 32 → 38 | P1.4, P1.9 |
| M3 | the meter's track 150 → 300 | P1.7 |
| M4 | a second `<h1>` in the toolbar | P1.2 |
| M5 | the legend's figures off by one | P1.8 |
| M6 | the row's stated height removed | P2.1a, P2.1b |
| M7 | the strip positioned above the row | P2.4, P2.8 |
| M8 | the strip laid **on** the row | P2.4 (2 rows intersected) |
| M9 | the collapse filter removed | P2.10 |
| M10 | the fork's digit key made inert | P2.9 |
| M11 | the typing guard ignored | P2.6 |
| M12 | the first click opens instead of focusing | P2.2 |
| M13 | the snooze writer made a no-op | P2.13 |
| M14 | `hostsStrip = true` | P2.3 (27 strips) |
| M15 | a second tint in the sheet's header | P3.3 |
| M16 | the title's bold spans coloured | P3.6 |
| M17 | the sheet stretched instead of hugging | P3.10b |
| M18 | the 620 measure removed | P3.8b |
| M19 | both row floors dropped to 20 | P3.9a, P3.9b |
| M20 | the fork's padding doubled | P3.7b |
| M21 | `.band` restored on the header | P3.1 |
| M22 | the title returned to the header | taskPanePort's zone order |
| M23 | the column given a radius and a full border | P4.1 |
| M24 | the facts block given a wash | P4.2 |
| M25 | the label column 78 → 120 | P4.6 |
| M26 | the collapse handing space back | P4.11 |
| M27 | the header's tint from a literal | P4.3 |
| M28 | an `<input>` in the agent row | P4.9 |
| M29 | the elapsed hardcoded to 7 | P4.5 |

Two reds were **witnessed live** rather than staged, and are recorded as such: P3.7a at
`[83.9, 83.9, 265.1]` before the container query landed, and P4.5/P4.11 in their first runs.

**One mutation reddened nothing, and that is a finding rather than a gap.** Dropping `.fk`'s
`min-height` 56 → 20 changed no measurement: at the contract's own type the option's content is
57.8, so the floor never binds. The assertion is named for what it measures, the floor stays to
guard the case the fixture has not got (an option with no subtitle), and the report says so
rather than implying coverage.

---

## What the round found

**1 · Enter did nothing while clicking worked, on the same row.** The key effect mounts once — one
listener, deliberately — so it captured the FIRST render's `openDock`, whose `dockable` was empty
while the board loaded, and hit that function's own "nothing to work through" guard, silently,
for ever. Measured rather than reasoned: `selKey` null and `.tpn` absent after Enter, with the
pointer path opening the same row. `openDock` travels by ref now.

**2 · A container query in the build, reaching nothing.** The crossover tag's `nowrap` left ~120px
for a fork option's text at the 268px column and grew one option to 265px. The fix — drop the tag
below the pair under 420 of container — was written 270 lines before `.tpn .fk .x`, and at equal
specificity the later base rule won. A container query confers no specificity, exactly as a media
query does not; the repo already records this for `prefers-reduced-motion`.

**3 · `:has()` takes its argument's specificity.** `.tpn .sheet:has(> .rim > .rail)` is 0-4-0 and
`.tpn .sheet.railClosed` is 0-3-0, so the open width won and the column stayed 240 with its spine
rendering inside it. The tell: the sheet's margin moved (no competitor) and the track did not.

**4 · `min-height: 56px` that nothing obeyed.** At 14.5/11.5 type with 14px padding the option's
content is 67.2. The contract's own metrics bring it to 57.8.

**5 · The fixture hid a whole branch.** `seed.mjs` writes `dateSent` and `status` and nothing
else, so a query reading "Full Requested" carried no `fullRequestedDate` — not a shape the app
produces, since it writes the date on the status change. `waitAnchorMs` returned NaN on every
card, the pane's facts lost their date row, and the header's "since" line never rendered:
P4.5 could only ever report "0 of 7", indistinguishable from the feature being broken.
`tests/e2e/seedRequestDates.mjs` seeds the field the app itself writes, with a `--clean`.

**6 · And with the dates in, the line was ambiguous.** "since 12 June · 15 months", where the June
meant is fifteen months back. The check caught it by computing the elapsed from the date the line
itself states; a format check would have passed it. The year now appears when the date is not in
the current one.

**7 · Two defects only a screenshot showed.** The footer's key hints shipped with no rule and
rendered at the page's inherited size, the largest thing in the row; and at the folded 520px they
wrapped the count and the export onto second lines. Every existing check on that row was about its
TEXT, and the text was right. Both now have assertions.

**8 · A stale report, twice.** Phase 1's `rmSync` sat at module scope and Playwright imports the
file once per worker, so a later worker's import deleted the report an earlier one had written —
its output went missing on run after run while every assertion was green. Separately, a failed
build let an `&&` chain skip Playwright, and I read the previous run's report as current:
byte-identical numbers, which read as "the change did nothing" rather than "the change never ran".

**9 · My own bounded slice.** Removing a CSS block by index arithmetic, I bounded on `"}\n"`,
which matched the end of the rule INSIDE the block rather than the block's own close. It left an
orphan brace and broke the build. The bounded-slice fault, in a python edit rather than a lock.

**10 · Backticks in a shell commit message.** `git commit -m "…"` runs backtick-quoted text as a
command and substitutes its output — nothing. Two identifiers vanished from Phase 2's message,
leaving sentences with holes in them, on the permanent record, with a zero exit code. Corrected in
`9dd5ddad`, and the rule (`-F <file>`, always) is now in CLAUDE.md beside the existing
commit-message one.

---

## False premises in the brief

- **"Title, meter and actions on one 32px row"** assumed the page header was ours. It is the
  header stream's; the brief's own fallback applied, and the duplication is recorded above.
- **"Content column held to 620px"** cannot bind at 1440: the document column is 268 there (the
  split gives the work column 562, the reference takes 240). It binds at 1920 and above. Both
  halves are asserted, at the widths where each is true.
- **"Fork options are 56px"** is a floor rather than a height at the narrow column, where the
  subtitles legitimately wrap. Measured at both widths and stated as two claims.
- **"The document keeps its width either way"** contradicts the ref, which hands the freed space
  back (`grid-template-columns: minmax(0,1fr) 30px`). The brief is right and the ref has the wrap
  bug the drawer round already recorded; the sheet's own margin is where the correction now lives.

---

## Concurrency

One session, `/todo` and the pane and their stylesheets. The calendar stream held
`TodoCalendarPage.tsx` and `todoCalendar.css` uncommitted through most of the round;
`paneCommit.test.ts` and `calendarTokens.test.ts` were **red on baseline** because of it, which is
stated in the Phase 1 and 2 commit messages rather than fixed — their files, their reconcile. Both
had cleared by Phase 3. Nothing outside this session's surface was edited; every commit staged by
explicit path.

---

## Phase 5 — the suites

Presumed vacuous, and **not one of them merely failed**: the first three CRASHED, and one HUNG
for a whole 900-second timeout. Every one opened a row with a single click, so the pane never
mounted, every probe read null, and a locator waiting on a pane control waited out the test. A
crash names a line; a failure names a property; a hang names neither.

**The fix is one helper, `openFocusedRow` in `tests/e2e/measure.ts`** — the click grammar stated
once, with the wait between the two clicks (two clicks in one `page.evaluate` share a render's
closure, so both would focus). Where a suite has its own `OPEN(kind)` template the grammar went
in there instead, as an async IIFE, so every one of that suite's entrances got it at once.

| suite | result |
|---|---|
| `paneMounts` | **2/2** — the canary, run before every phase |
| `contract` | **4/4** |
| `listWide` | **18/18** — six cases deleted with their objects, each naming where its law went |
| `drawerMotion` | **25/25** |
| `sheetSlip` | **21/21, both branches** |
| `steerRound` | **21/21** — the OPEN patch alone |
| `unitNext` | **all green** |
| `finishRound` | **29/29** |
| `workspaceRound` | **31/31** |
| `journeyRound` | **52/53** — only the standing P8.3 |
| `completionLeaves` | **12 green, 0 red** |
| `viewPanels` | **0 red** |
| `qcPanel` | **RED BY DESIGN**, unchanged — awaiting the log-sheet stream's card class |
| `deedRound` | **17/23** — six red, and they are NOT mechanical: the journeys do not progress in
its `clause()` and Phase-4 helpers, so the strip reads its empty state ("This records—") and the
custom-date rows never reveal. Named rather than guessed at. |

**What the retargets found, beyond the click grammar:**

- **`listWide`'s P1.9 law survived its subject.** It read "the action chip is a span, not a second
  tab stop"; the chip is gone, and the claim underneath is that the ROW is the control and holds
  no focusable child — which the strip, a SIBLING, does not violate.
- **`sheetSlip`'s wrap law was measuring the header, which now SPANS BOTH COLUMNS** and therefore
  correctly narrows with the sheet (546 → 336). The document's own track is what must not move.
- **`sheetSlip`'s P3.10 tally caught its own sample being wrong.** "The longest journey" was chosen
  by scoring pills — a proxy — which picked a 575px sheet against a 614 cap, so the capping branch
  went unexercised. It opens candidates and measures them now.
- **`deedRound` P1.3 had been requiring an italic the workspace round retired**, in a suite whose
  own stylesheet says so in as many words. Red on a correct page, for two rounds.
- **`deedRound` P3.1/P3.2 read `.story-h`, a class two names stale** — so they were reading nothing
  and failing about a page that was right. The header is `.qhead` and its fill is the ladder's.
- **`deedRound` had no `ANSWER_FORK`** — the same missing step that produced seventeen reds in the
  drawer round's `workspaceRound`.
- **`workspaceRound` P3.6's anchor moved 44 → 42** with the contract, which is the anchor doing its
  job: its relational half alone could not tell a uniform shrink from a design.
- **`finishRound` P1.4 asserted ONE scroller and there are two now** — the worksheet's and the
  reference's — which is the "the record must not travel with the form" law being KEPT rather than
  broken. A third would still be forbidden.
- **`completionLeaves`' footer parse broke on the two-number form**: `parseInt("Showing 28 of 30")`
  is NaN, so a correct hold reported a NaN count.
- **`journeyRound` P4.2 did not carry P4.1's precondition** — P4.1 reports UNMEASURED when the card
  has no unit to pick, and P4.2 then asserted a field that could not exist.

---

## Screenshots

`reports/tightened/` — at 1440 and 1920: the list at rest, the list with a strip open, the sheet
at its fork, the sheet mid-ledger, and the reference collapsed; plus the reference column alone
for a Full-requested and a Partial-requested query at 1440.
