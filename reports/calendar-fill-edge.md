# Calendar — the fill edge, and the row's subject

Ref `design-refs/timeline-v36.html`. Baseline at `9a639542`: tsc 0 · production build clean ·
vitest 429 files, 7334 passed, 3 skipped, 0 failed. Level with `main` and `origin/main`, tree
clean, and no other session holding uncommitted `src/`.

Measured against the deployed dev site, whose served bundle hash was checked equal to a local
build of `9a639542` before anything was read — so "dev" here is this commit, not a guess about it.

---

## Phase 0 — recon

### 1. The fill overshoots today — **FOUNDED, and the mechanism is broader than suspected**

The suspected cause is real: `fillFor` computes its ratio from `trueFrom → goal` (true dates,
range-invariant), while the fill element is painted as `width: N%` **of the piece**, whose span is
`from → to` (clipped, and cut at breaks). Those two spans coincide only when the piece happens to
be the whole stretch.

Measured at 1440, `.tl-todayline` as the subject, deviation = painted fill's right edge minus
today's x:

| range | partial fills | right of today | worst deviation |
|---|---|---|---|
| 1 month  | 9 | **9 of 9** | **+243px** |
| 3 months | 8 | 6 of 8 | +166px |
| 6 months | 8 | 6 of 8 | +92px |

Two things the premise did not predict, and both matter for the fix:

**Clipping is only one of two causes.** A bar cut into pieces by a break has `to ≠ goal` even when
nothing is clipped, so the ratio is multiplied by the wrong span there too. Tom Ellery is the
clearest reading: **+172px at one month, +26px at three, +4px at six** — the error tracks how far
the piece's span sits from the true span, and shrinks as the window widens to contain it.

**Some fills land LEFT of today.** Hester Blaine reads −8px at three months and **−38px** at six.
So the honest statement is not "the fill overshoots" but that *the fill's right edge bears no
fixed relation to today at all* — it is right of it on most rows, left on some, and moves with the
range. That rules out any fix of the form "subtract the clipping".

**Why the range-invariance lock is blind — and it is blinder than the premise says.** The premise
is right that a drawing wrong by the same rule at every range satisfies "same ratio at every range"
perfectly. But the lock never reaches a painted pixel at all. Its comment says *"READ THE PAINTED
WIDTH RATIO, not the data attribute"*; the code reads `parseFloat(fl.style.width)` — the **inline
style string** — and compares it to `b.dataset.fill`. Both are the same `fillFor` call, written
into two attributes by one JSX expression. That half is a tautology: it can only fail if someone
wires two different numbers into the same element. Its docstring explains the choice honestly
(comparing rects is defeated by `box-sizing: border-box` and a 1px border, which is true), but the
conclusion drawn from it was a check that cannot fail for any real defect. Flagged for §6.

### 2. The row's subject — **FOUNDED**. Every consumer, from source

`laneOf: Map<rowKey, Map<manuscriptId, Query>>` is the set the row actually draws — one query per
manuscript, chosen live-first then newest. Everything below instead reaches for
`mine = data.queries.filter(q => q.agentId === agentId)`, the agent's whole set:

| # | consumer | what it reaches for | what it decides |
|---|---|---|---|
| 1 | `status` | `lead` (most advanced of `mine`) | the row head's `StatusDot` |
| 2 | `stage` | reduce over `mine` | the ACTIVE sort key |
| 3 | `copy` | `lead` | the copy every caption is built from |
| 4 | `sentence` | `rowSentence(copyOf(lead))` | the row head's sentence |
| 5 | `facts` | all non-terminal `mine` | **the row's GROUP** (via `rowGroupOf`) |
| 6 | `lastClosed` | all terminal `mine` | the closed-row date, and grouping |
| 7 | `copies` | all `mine` | **the DEED** (via `noteOf`'s earner search) |
| 8 | `turn` → `dot` | `agentTurn(agent, mine)` | the row head's whose-move disc |

`pressingAt` is the one that was fixed, and it was fixed by moving it into the bar pass so it reads
only `q` — the lane's own query. That is the shape the other eight still lack.

### 3. O'Rourke's deed — **the defect is founded; the example is misattributed**

There is no agent named O'Rourke on this account. `Reread the O'Rourke pages before Thursday` is a
task title, which is the same trap as `o'r`. No bar reading `Next reminder 25 Sept` exists either;
the reminder bars are Hester Blaine's `Next reminder 10 Sept` and Imogen Farr's, and both carry a
dash for a deed rather than a deed.

The defect it describes does reproduce, on rows that were not named:

- **Rachel Lin** — deed `SEND THE PARTIAL`, sole bar `Out since 4 Aug · reply expected 29 Sept`.
  The deed says the writer owes pages; the bar says the agent holds the move.
- **Marcus Reed** — deed `SEND THE FULL` over `Out since 25 Jun · reply expected 20 Aug` at three
  months. At six months a second bar `Full req · by 20 Aug` appears, which is the query the deed is
  actually about — so the deed is right and *the row was not drawing the query it was about*.

Marcus Reed is the cleanest evidence that this is the all-vs-drawn seam rather than a wrong deed:
the deed's subject exists, and whether the reader can see it depends on the range.

**A limit of this reading, stated rather than papered over.** My probe collected `.tl-plbl` text,
and the fit pass hides a label with no room — so `bars=[]` in the recon log means "no label wide
enough to print", not "no bar". Several rows carrying a deed with no printed label (David Marsh,
Noah Bright, Tobias Quint) are therefore **not** evidence of anything yet. Phase 2's lock reads
query identity off the elements instead, which is the instrument this question actually needs.

### 4. Ghost chips — **UNFOUNDED. Nothing to fix**

The dashed muted treatment was not dropped. Measured as computed values at all three ranges:

- ghost — `border-style: dashed`, `color: rgb(160, 143, 128)`, `background: rgba(0, 0, 0, 0)`
- live — `border-style: solid`, `color: rgb(58, 28, 20)`, `background: rgb(255, 255, 255)`

`.tl-tchip.ghost` is in the sheet, the `ghost` class reaches the element, and the `↦` mark renders.
Population is thin (1 ghost against 3 live) but the two are unambiguously distinct. **No render
change.** Phase 4's lock is still worth adding as a guard, and it will go in green — which is
reported as a guard, not as a fix.

### 5. The month shelf at 1 month — **FOUNDED**

The shelf renders unconditionally: `months.map(...)` has no range condition, and a divider is drawn
for every boundary at `m.at > 0`.

| range | month labels | dividers |
|---|---|---|
| 1 month  | `Aug`, `Sept` | **1** |
| 3 months | `Aug`, `Sept`, `Oct`, `Nov` | 3 |
| 6 months | `Jul` … `Jan` | 6 |

Two labels and a lone divider over a window that is mostly one month, exactly as described.

### Red gate

None of the five implicates derivation beneath the view layer. `recomputeQuery`,
`assembleBoardColumns`, `recordDays`, `resolveExpectedDate`, the dedupe, ghosts/`rolledFrom`,
`useTaskPaneSession`, `quickDone` and the toast are all untouched by what is described here: the
fill fault is in the paint, and the row-subject fault is in which already-derived query a view
function is handed. Proceeding.

---

## Phase 1 — the fill edge is today

**Worst deviation 243px → 0.0px, over 68 partial fills** (3 ranges × 3 widths).

| range | partial fills | worst before | worst after |
|---|---|---|---|
| 1 month  | 9 | **+243px** | 0.0px |
| 3 months | 8 | +166px | 0.0px |
| 6 months | 8 | +92px | 0.0px |

**The fix is the UNIT, not the arithmetic.** `pct()` was a percentage, so it meant "of the lane"
only for a *direct* child of the lane — the ticks, the chips and the bars. The fill is a
grandchild, so the identical expression written inside a bar silently measured the bar. `.tl-c-tl`
is now a size container and `pct()` is `cqw`, so the rail's ticks, the bars and the fills resolve
one expression against one width. `fillEndAt(sg)` says where the edge belongs in window
coordinates; `fillFor` survives as the reported number and no longer draws anything.

Lane widths measured before and after at 1280/1440/1920: unchanged, so the containment did not
disturb the flex row.

**Two locks were vacuous. Both replaced, neither patched.**

- *Range invariance* claimed in its own comment to read the painted ratio. It read
  `fl.style.width` and compared it to `data-fill` — one `fillFor` call written into two attributes
  by one JSX expression, so it could only fail if somebody wired two different numbers into one
  element. Retargeted onto what the number still governs: the **near step**, which is a painted
  colour and can therefore disagree. Both branches asserted with populations; proved red at
  `NEAR_AT`.
- *The past wash* asserted "the wash is not on the data" by comparing
  `getComputedStyle(fl).backgroundColor` on two elements — the **declared** colour, identical
  whatever paints on top. It now decodes a screenshot in a canvas: the ground either side of today
  must satisfy the wash composite exactly, and bars lying wholly under the wash must paint what
  their own rule declares. Proved red by raising the wash above the bars.

**Its history is the better warning.** That lock's first draft looked for a fill crossing today,
found none, and reasoned *"a fill ends at today by definition, because that is what a fill IS"* —
then discarded the reasoning because the board disagreed. The reasoning was right and the drawing
was wrong.

## Phase 2 — the row's subject *(and Phase 3, which needed no separate fix)*

`laneOf` is hoisted above `rowFor`, `drawnFor(agentId)` is the row's subject, and **`mine` is no
longer defined inside the row derivation at all**. All ten reads switched. That is what makes a
fourth variant unwriteable rather than unlikely: the identifier is absent, and the only route to
the whole set is `allQueriesFor`, which nothing reads today, deliberately.

Measuring it needed the row to say what it is about, because none of the three variants is visible
from appearance: `SEND THE PARTIAL` beside *"reply expected 29 Sept"* is only wrong if you know
they concern different queries, and each sentence is true alone. `TimelineRow.subjects` carries the
query id behind the deed, the caption and the sort key; bars carry `data-qid`.

**144 drawing rows, 351 claims** (deed 63, caption 144, sort 144). Proved red by pointing
`drawnFor` back at the whole set, which named the recon's own defect:

> Rachel Lin: the deed is about `seed-query-7`, which this row does not draw (it draws
> `seed-pkgq-7`) — it reads "SEND THE PARTIAL"

A second, narrower assertion covers what identity nearly implies: `DEED` and `familyOf` are
separate mappings, so a wrong entry could still put SEND against a bar the board draws as the
agent's move. **48 deeds checked against their own live bar**; proved red by pointing the
writer's-move family at the agent's.

## Phase 4 — the shelf, and the ghosts

**Shelf** gated at three calendar months, counted from the window (`months.length`) rather than the
range, so there is no second derivation. Measured 0 labels / 0 dividers at one month, 4 / 3 at
three, 7 / 6 at six, across three widths, with the day labels asserted present at every range so
"absent" cannot be satisfied by a rail that renders nothing. Proved red by removing the gate.

**Ghosts: unfounded, nothing changed.** Ghost paints `dashed`, `rgb(160, 143, 128)`, transparent;
live paints `solid`, `rgb(58, 28, 20)`, white. The lock this phase asks for already exists and
already asserts precisely it, with a population guard. A second one would be two locks answering
one question.

## Phase 5 — verification

25/25: calLook (23), the new `/todo` lock, `completionUndo`.

| claim | result |
|---|---|
| fill edge on today, every partial fill | 68 fills, worst **0.0px** |
| no fill right of today | 0 |
| passed-end bars whole, left of today | asserted per bar |
| ratios re-measured, unchanged | 41/41/41, 36/36/36, 59/59/59, 93/93/93 … |
| row-subject consistency | 144 rows, 351 claims |
| ghost vs live distinct | dashed/muted vs solid/ink |
| shelf absent at 1m, present at 3m and 6m | 0 / 4 / 7 labels |
| marker clearance ≥1px, **all ranges** | worst 2.9px, 0 offenders, 19–49 pairs |
| rail/lane alignment ≤1px | green |
| wash on ground, absent from data | 27 bars, 3 families, 11 ground rows |
| today rule coincident with today's x | `lineX 903 = washEndsAt 903` |
| `/todo` unchanged | masthead "To-do list", no calendar rows, clean console |
| completion → one toast with Undo | `{"toasts":1,"undo":true}` |

### Not this pass's, reported not touched

- **`tlAccept.measure.ts`** measures `.tl`, `.tl-seg`, a density tier and five ranges — the
  grid-era timeline the Porcelain rebuild retired. `.tl-dense` and `.tl-cell` have **zero**
  occurrences in `src/`.
- **`todoShot.measure.ts`** clicks `.tdg-row`, which `/todo` no longer renders (it renders
  `tdw-*` / `tdb-*`).
- **`completionUndo`** leaves an `Undo probe <timestamp>` task on the harness account every run —
  four tonight. The undo restores the query, not the task.

### The fixture expired mid-run, and the guards caught it

Three cases went red at midnight with *"no bar reached the near step"*, *"that branch was never
exercised"* and *"nothing was measured"* — population guards doing their job rather than passing
over an empty set. Two real causes: `iso()` computed **UTC** while the board derives today
**locally**, so under BST between 23:00 and midnight every fixture was seeded a day older than it
claimed; and 13/14 is dead centre of the 85–100% band on the day it is written and outside it the
next morning. Now local, and 50/56 — in band for six days either side.
