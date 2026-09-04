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

## D · The bar in Query Centre's language — **BUILT.** Every item, with readings.

Measured at 1440×900 on the harness account (23 cards) unless stated. Every reading below comes
from `calBar63.measure.ts` (9 cases) or `calTool63.measure.ts` (6); the ref's own values were taken
by **rendering** `timeline-v63.html`, not by reading it — see the two cascade faults at the foot.

### The item list

| # | item | state | reading |
|---|---|---|---|
| 1 | status band (26px, **14px** dot, status, holder) | **built · verified** | 23 of 23 cards; band 26px on the card's top edge; body always below it |
| 2 | tint per status, from QC's ladder | **built · verified** | 7 rungs seen: `out-1`×14, `out-2`×2, `out-3`×2, `in-1`×2, `in-2`×1, `in-3`×1, `offer`×1 |
| 3 | holder eyebrow, rose when late | **built · verified** | 3 holders (`With you`/`With the agent`/`Offer`); rose `rgb(140,79,74)` on late, muted `rgb(125,108,92)` on calm, both branches populated |
| 4 | name + italic agency, sentence-case fact **+ mono tail** | **built · verified** | every size measured against the ref within 0.5px — see the formatting pass |
| 5 | ringed `!` on urgent | **built · verified** | present on all 13 late cards, absent on all 10 calm |
| 6 | **open ends** — no chevron, no right border | **built · verified** | 12 ongoing cards: `border-right: 0px`, both right radii `0px`, **0 chevrons rendered** |
| 7 | **right-edge dissolve for window-clipped cards** | **built · verified** | 1 clipped card dissolves; **12 ongoing cards do not** — see the fault below |
| 8 | **nudge rule** — band note | **built · verified, with a data limit** | `Nudged 25 Aug` beside the status; a *count* is not derivable — see below |
| 9 | **nudge event marker on the bar** | **built · verified** | 1 marker, at the nudge's own date; 22 cards with no nudge carry none |
| 10 | **density levels** | **built · verified** | Comfortable 116/96 · Regular 106/86 · Compact 76/58 — three distinct bar heights, nothing clipped in any |
| 11 | **rose pulse dot on urgent bars** | **built · partially verified** | 12 dots, all on late open ends; **the lateness gate is unexercised** — see the named gap |
| 12 | **ghost past stages** | **built · verified** | `.tl-jc` opacity `0.32`, full strength on hover |
| 13 | retired: chips, medals, trails, shadows, tails, Caveat flags | **verified gone** | 0 of each in the rendered DOM, across all 23 cards |

### ⚠️ Item 7 was a correctness fault, not a missing feature

`fadesFor` returned one boolean: `right = namedEnd == null || namedEnd > days`. That folds together
**"nobody has named an end"** and **"the end is named and lies past the window"** — two different
statements — and the board drew both as an open end. A partial due on 3 November, viewed in a window
closing 19 October, was being drawn as though it ran on indefinitely.

The ref does not conflate them (`clipR = !running && to > hi`). `Fades` now carries `clipped`
alongside `right`; an ongoing card ends open, a clipped one dissolves. Measured after the split:
**12 ongoing · 1 clipped · 23 cards.**

### ⚠️ Item 8: a date, never a count

The pack asks for `Nudged once/twice…`. A nudge **count** lives in the query's activity
subcollection, and this page deliberately does not load per-query events — the same limit
`resolveExpectedDate` is handed `null` for a reply-stated window. `nudgeCount()` exists in
`queryAmbient.ts` and cannot be called here without loading activity for every row on the board.

So the note is `Nudged {date}` from `lastNudgeSentDate` — which is also exactly what the ref renders
(`hl: 'Nudged 26 Aug'`). A count composed from what this page holds would be a fabricated figure
indistinguishable from a real one. The lock forbids `once|twice|N times` in the note.

**And the note JOINS the status rather than replacing it.** The ref swaps its headline out; here the
tint's rung is *named for the status*, so removing the status would leave the band saying "Nudged"
above a colour nothing on the card explains.

### ⚠️ The named gap: item 11's lateness gate is unexercised

The pulse dot renders on an open end **and only where something is late**. The first two conditions
are verified. The third is not, and the report says so rather than the assertion pretending
otherwise: **12 late-ongoing, 0 calm-ongoing** — every ongoing relationship on the harness account
is overdue, so a mutation dropping the `owed` condition **went green**. That is how the gap was
found.

`calBar63` prints `⚠️ LATENESS GATE UNEXERCISED ON THIS FIXTURE` on every run and asserts the branch
the moment a calm ongoing query exists. Seeding one is a write to the shared harness account and
belongs in a pass that can restore it in the same run.

### Two cascade faults, both from reading the ref instead of rendering it

1. **The body's offset.** `data-seg="band"` says `top: calc(50% + 13px)`; `data-dens="regular"` says
   `top: 36px; max-height: 44px` four hundred lines later and wins. The first build put the words
   under the band.
2. **`.feb`.** `data-bar="qc"` makes it a block eyebrow; `data-seg="band"` makes it an inline mono
   **tail inside line two**. It is not an eyebrow at all.

Rendering the ref settled both in one command: its own card measures body top `36px`,
`transform: none`, 40.6px tall inside an 86px bar with nothing clipped.

### Three deviations from the ref, each with its reason

| ref | built | why |
|---|---|---|
| ~~`.sseg svg` 14px → 20px~~ | **14px, the ref's** | ⚠️ **SUPERSEDED by the formatting pass.** §D argued a glyph's legible size is part of the glyph; rendered, 20px in a 26px band read as an inset medallion. The ref's value stands |
| `.fnm` `line-height: 1.15` | **1.3** | house floor for mixed-case Playfair inside a clipping box; the ref clips nothing |
| Comfortable body `max-height: 56px`, bar 96 | **top 27 / 75, bar 104** | a consequence of the above, re-measured once line two became two spans: the stack is ~73.7px against the 70 a 96px bar leaves |

### The tint ladder is a documented copy — **a debt owed to the Query Centre session**

`--stage-out-1`…`--stage-closed` are declared on **`.t-f12`**, the Query Centre's own theme class,
which the Calendar does not sit under. A `var(--stage-out-1)` on a calendar band paints **nothing**,
silently, through a clean build — the failure `f12.css`'s own comment warns about.

`.tl-board` therefore carries `--tl-stage-*`, an eight-rung copy, on the `--mk-hero-ground`
precedent. `calendarStageTints.test.ts` asserts them **against `f12.css` itself**, never a literal
on both sides, and fails if the ladder leaves `.t-f12`.

**The debt: the ladder belongs at `:root`, with `.t-f12` reading it.** That retires this copy and
its lock. It is not this pass's to do — `f12.css` is another session's live file — and it is
recorded here so it is decided rather than inherited.

### Four locks retargeted, each a real defect the section exposed

| lock | what broke | why it was right to change |
|---|---|---|
| `calendarFade.test.ts` | 11 shape assertions read `{left, right}` | the type gained `clipped`; they now assert the LAW (`clipped` implies `right`, ongoing ≠ clipped), not just the extra key |
| `calendarStyleReach.test.ts` | *"the sweep is not seeing the bar"* — `tl-p` missing | my `clipR` note pushed the card's `className` expression past the sweep's **900-character bound**, which fails by ABSENCE. Exactly what that file's comment warns about; its floor case caught it. Three comment blocks hoisted out of the class list — 932 → 239 chars |
| `calendarTokens.test.ts` | `--row-h is declared 3 times` | it demanded exactly one declaration, right at one height and wrong at three. It now asserts the BASE rule is the ref's value and every other sits inside a `[data-dens]` block |
| `calTool63.measure.ts` | `trig[0]` became `Display` | it indexed every `.tl-tbtrig` in the document; the sidebar's new control is first in DOM order. Scoped to `.tl-vtool`, and it asserts the sidebar keeps exactly one |

### The formatting pass (after §D landed)

**Type, in px, measured against the ref within half a pixel** — every value on every card:

```
status 12.5 · note 12 (italic) · holder 7 · name 15.5 · agency 12 · fact 12 · tail 7.5 · ! 13
sizes seen: {"status":["12.5px"],"note":["12px"],"holder":["7px"],"name":["15.5px"],
             "agency":["12px"],"fact":["12px"],"tail":["7.5px"],"bang":["13px"]}
```

⚠️ **The unit is a second claim, and the value lock alone missed it.** A mutation planting `1rem`
on the name **passed**: `1rem` is 16px, exactly the half-pixel tolerance against 15.5. The lock now
also reads the sheet and requires every bar size to be stated in `px`, so the value cannot start
drifting with a root font-size nothing on this page controls.

**The band's dot is 14px** at the band's own 10px inset — superseding §D's 20px, which read as an
inset medallion in a 26px band. Locked two ways: the dot measures 14, and **nothing wholly inside
the band's leading 40px is wider than 14.5**.

⚠️ **"Nothing outside the card box" needed the honest subject.** A rect-only probe reported **ten**
elements escaping a card that spills nothing: `.tl-cardbody` and `.tl-sband` both clip, so a child's
*rect* runs past while its *ink* stops at the clip. The probe walks to the first clipping ancestor
now, and excludes the two deliberate edge marks (`.tl-pulsedot`, `.tl-tmark`) **by name with the
reason at the code** — the claim is that the medallion has not returned, not that the card has no
edge furniture.

**Line two is two spans, built from the dates rather than split from the label.** `barFactLine`
returns `{fact, tail}` in `journeyBars.ts`; every card has both.

```
Ottoline Frayn  | Due 15 Apr 2024        | 29 months overdue
Marcus Reed     | Due 21 Aug             | 14 days overdue
Elinor Hale     | Expected 27 Jul        | 6 weeks overdue
Ana Duarte      | Reply expected 13 Sept | 9 days waiting
David Marsh     | Due 29 Sept            | 4 weeks left
fact forms: ["Due","Reply expected","Expected"]
```

⚠️ **The discriminator is whose date it is, not whether it has passed** — and getting that wrong put
**"Due" in front of nine agency-expected dates** in one build. `NamedEnd.source` is `sendBy` /
`reminder` (the writer's) or `window` (the agency's). Saying "Due" of an agency's window tells a
writer they are late for something that was never theirs.

⚠️ **`{span} left` is the one shape the pack did not name** — the writer's own date, still ahead. It
is a fact about a commitment they made themselves, which is why it is allowed where a forecast about
an agency's window would not be.

**No deed words.** `Nudge due`, `send by 29 Sept`, `next 8 Sept` and `Next reminder 11 Sept` reached
line two as the label's *prefix*, because the render fell back to it wherever there was no second
clause. A deed belongs to the action column.

⚠️ **The geometry needed retuning twice, and paper arithmetic missed it both times.** The tail is a
third typographic line: the stack **measures 56.07px** (name 20.26 + fact 17.45 + tail 11.32 + two
margins). `36/44` clipped; so did `30/54`, **by 0.07px**. Regular is `28/57`. Comfortable stacks the
name over the agency — ~73.7px against the 70 a 96px bar leaves after its 26px band — so its bar is
**104, not the ref's 96**: the ref fits at `line-height: 1.15`, which this repo forbids on
mixed-case Playfair in a clipping box.

**Fixture names:** all **46** names and agencies on the board are already title case, verified and
now locked (d12, with the population asserted first).

**Locks proved red by five mutations:** a `rem` where the ref says px, the 20px medallion returning,
a deed word on line two, a lower-case fact, and the tail span deleted.

### Locks

`calBar63.measure.ts` (13 measured)## E · Actions — **NOT BUILT.**
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
