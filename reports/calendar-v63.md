# Calendar v63 — the two-pane frame

## Phase 0 — **PASS.** `design-refs/timeline-v63.html`, title `ScriptAlly — Calendar v63 · design of
record`, sha256 `6414dc934fde5416dbd6e7340738a68ddcb5d731baea79167a008be050697317` (the pack's
`6414dc934fde…`). All 27 body attributes the pack names are present and match. 20 refs guarded.

## Phase 0.5 — worktree at `/tmp/sa-v63`, preview on 4197; deployed from a clean worktree at HEAD.

⚠️ **The shared tree held nine of another session's files at the start of this run** — including
`QueryCard.tsx`, `queryCard.css` and `queryCardFacts.ts`, which are *exactly* the files section D
tells me to read tokens from. The worktree builds from committed HEAD, so it sees their last commit
rather than their WIP, and the locks read tokens **by name** — which is what "by identity, never a
copy" buys: when their edit lands, the calendar moves with it.

---

## A · The frame — **BUILT AND MEASURED.**

| Reading | |
|---|---|
| container | `flex-direction: row` — two panes |
| sidebar | inside the container, **232px** = the token |
| chrome identity | axis `rgb(250,249,247)` **=** date bar `rgb(250,249,247)` |
| one ground | rows `rgb(242,241,238)` **=** container `rgb(242,241,238)`; lanes transparent |
| group bars | 40px, full width (866), chrome tone, hairlines top and bottom |
| Urgent bar | `rgb(248,236,230)` blush, eyebrow `rgb(140,79,74)` rose |
| numbers gutter | present in the DOM, `display: none` |

**The chrome is its own token set**, deliberately separate from v62's scheme: `--tl-cs-*` says what
the *board* is made of, `--tl-ch-*` says what the *furniture* is. Keeping them apart is what lets
the chrome read as one continuous surface while the board's palette changes underneath it — and it
is what makes "sidebar = date bar = group bar" a claim a lock can state at all.

**Group bars carry their purpose** at the right end — *Needs you now · Coming up · Waiting on a
reply · No reply for a long while · Your to-dos · For the record*. A group NAME is a label a reader
has to decode; the bar is full width, so there is room for the sentence beside it.

## B · The sidebar pane — **BUILT AND MEASURED.**

Four hairline-separated blocks: search · window · views · At a glance.

- **The window pill's centre is the live range** — `22 Jul – 19 Oct`, moving on every step. Three
  buttons labelled `‹ TODAY ›` say what they do and never say where you are.
- **Back to today appears only when it has something to undo.** Measured: absent at today, present
  after one step, and gone again after it is used. A permanent one on a board already showing today
  is a control that does nothing, which teaches a reader to ignore it for the moment it matters.
- **The views list is a census** — the counts sum to All (23), and All equals the rows on the board.
- **At a glance is derived from the same sections the views count**, so the pane cannot hold two
  descriptions of one board: "need you now" is asserted equal to the Urgent view's own figure.

⚠️ **The search field filled the pane as one enormous empty box** until it was given `flex: 0 0
auto`. v61 fixed this once for the old sidebar and the rule did not follow the pane inside the
container — the controls were built for a row and are still in a column.

---

## ⚠️ C · The toolbar — **BUILT. And my run-1 finding here was FALSE.**

### The correction, first, because it was published

Run 1 reported that the ref carries no Group / Sort / Status toolbar and that section C was
"net-new work specified in prose". **That was wrong, and it was wrong because I read the first
`class="toolbar"` in the file and stopped.**

- The controls are in a **`.vtool`** element at ref lines 1852–1864, inside `.board` and above
  `.rail` — `#tbG` Group ▾, `#tbS` Sort ▾ with a Reverse checkbox and a Reset link, `#tbF` Status ▾
  with a count badge and a JS-filled checklist, `.tbclear` Clear all, and `.cnt` a row count. Its
  CSS is at 1715–1734 and its behaviour at 2574–2584.
- The `.toolbar { display: none !important }` at line 1280 hides a **different, v62 element** — the
  pager / view pills / `DISPLAY ▾` row the sidebar replaced. Hiding that one says nothing about
  `.vtool`, which is never hidden.

The recommendation that followed from it — "fold Group/Sort/Status into the sidebar" — is
**withdrawn**. It was reasoning from a false premise, and the ref's own layout does the opposite.

**The lesson is the one this repo already records and I applied to CSS but not to markup**: a
first-match read is not a read. `grep -n 'class="toolbar\|class="vtool"'` answers it in one command.

### What was built

`.tl-vtool` in the board pane, above the date bar, on the chrome ground with a hairline under it.
Three controls, each naming its own value, then `Clear all` and a row count.

| control | options | measured |
|---|---|---|
| **Group** | Urgency · Status · Action required · No grouping | 4 group sets, 4 divider counts |
| **Sort** | Urgency · Status · Queried date · Most recent activity, + Reverse order, + Reset sort | **4 distinct orders of 4** |
| **Status** | the ten canonical `QueryStatus` strings, rose count badge, Clear all | `Queried` → 11 of 23 rows |
| **Clear all** | shown only when a view or a status is applied | restores the board entire |
| **count** | `23 rows` — the drawn rows, unit named | follows every filter |

### Readings, 1440×900

```
toolbar        inside .tl-boardpane, above .tl-rail, padding 8px 14px, 1px hairline
ground         == the sidebar pane's (identity asserted, not a hex)
census         All 23 · Needs me 13 · Upcoming 01 · With agents 06 · Tasks 02 · Closed 01
drawn          23 rows → 11 rows under a status filter; census UNMOVED
orders seen    4 of 4 | [["Urgency"],["Status"],["Queried date"],["Most recent activity"]]
```

### Two faults the measurement caught that no unit lock could

1. **The date sorts were reading an empty field.** They derived from `row.items`, which holds only
   what falls inside the drawn window. On this fixture nothing did, so every comparison returned
   `0`, `Array.sort` is stable, and the two **opposite-direction** date keys produced one identical
   sequence. The only symptom was `orders seen: 3 of 4` printed under an assertion asking for more
   than one. They read `queriedAt` / `lastActiveAt` now — the builder's own dates, in milliseconds,
   window-independent. The lock asks for **four** distinct orders and names any keys that coincide.

2. **The section partition was re-sequencing the sorted rows.** The three non-urgency groupings
   flattened `sectioned`, which buckets by section before anything else — so under `No grouping` the
   sort key's order across section boundaries was gone. Every part correct, the composition wrong.

### Deviation from the ref, deliberate

The ref's status list is **nine**: it shortens `Revise & Resubmit` to `R&R` and folds `Rejected` and
`Withdrawn` into one `Closed`. Ours is **ten, in the app's own enum strings**. Folding two statuses
into one option makes them unfilterable apart, and `R&R` names a status the data does not contain —
this app's standing law is that a `QueryStatus` is written and read as its exact string.

### Retired in the same commit

`Menu`, `Popover` and `PopRow` — three dropdown components with **zero render sites** — the sixteen
orphaned selectors that dressed them, two media queries eliding a control row that stopped existing
two packs ago, and `view.sort`, whose only comparison was `=== DEFAULT_SORT`. `groupMode` is the
other dead knob: it still has readers inside the board builder, so it is **flagged at its
declaration**, not claimed as retired.

### Locks, and the gap one of them had

`calendarToolbar.test.ts` (6 unit) and `calTool63.measure.ts` (6 measured, each driving the control
and reading the board). Proved red by six mutations.

⚠️ **The fourth mutation landed somewhere else and nothing noticed.** Aimed at the views' pills, it
hit the **At-a-glance tiles** — the sidebar's other census — and the case was watching only the
pills. Both are counts of the whole board; both are asserted now. A mutation that misses its target
is still evidence, and here it was better evidence than a hit.

### Standing item for the sweep

`todoCalendar.css` carries **25 duplicated base rules** (`.tl-glanes` four times, `.tl-gnums` and
`.tl-rail` three each). Every one predates this section — the count is identical at `HEAD` minus the
one I deleted — and they come from v63 §A/B's chrome layer restating rules the base already sets.
The file states one-rule-per-selector as its own invariant. Phase 7's target, named rather than
suspected.

## D · The bar in Query Centre's language — **NOT BUILT.**
## E · Actions — **NOT BUILT.**
## F · Tasks as bars — **NOT BUILT.**
## G · Behaviours (collapse, drag, sticky) — **NOT BUILT.**

Sections D–G are each the size of an earlier whole pack: the band with QC's tokens and the nudge
rule, three density levels, open ends, the right dissolve, the pulse dot, ghost stages, event
markers, hover-revealed actions at true dates, and tasks re-rendered as spans. They are reported
unbuilt rather than half-landed — this run put the frame and the pane in, measured both, and stopped
where the next section would have been rushed.

**The sweep and edge tags remain open**, as they have since v60d.

---

## Gates

| | Baseline (`b865a41c`) | After |
|---|---|---|
| `tsc` | 0 | **0** |
| `vite build` | exit 0, 0 diagnostics | **exit 0, 0 diagnostics** |
| `vitest` | — | **2 failed in 2 files** — `datePickerHub` and `QueryCard`, 444 files, 7,491 tests |
| Calendar measurement | 13 | **18** — `calOne61` 9 · `calScheme62` 4 · `calFrame63` 5 |

⚠️ **Both reds are the Query Centre session's, established by reading rather than by moving
anything**: `QueryCard.test.tsx` and `QueryCard.tsx` are both dirty in the shared tree and neither is
mine; `datePickerHub` has been theirs since v60. Nothing of theirs was stashed or reverted, and the
commit stages my paths only.

### Mutations proved red

| | Mutation | Failure |
|---|---|---|
| P | Urgent loses its blush; the date bar leaves the chrome | *the date bar is not the sidebar's tone* |
| Q | Back to today is always offered | *Back to today is offered on a board already showing today* |
