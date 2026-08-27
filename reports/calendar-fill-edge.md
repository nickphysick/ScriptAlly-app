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
