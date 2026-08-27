# Calendar — v36, part two

## Phase 0 · three doubts, measured

Baseline recorded first and it is **fully green**: tsc 0, vitest 425 files / 7303 passed / 3
skipped / 0 failed, clean tree, no other session holding `src/`. Worktree/bundle assertion green
before any measurement.

⚠️ **The assertion refused the first attempt and was right to.** `pressingFrom` is a local `const`
inside `timelineWeek`, so minification renames it and the needle could never be found — a bad
needle, not a failed build. Needles are now string literals that survive minification.

Measured on a local preview of this checkout's build at 1440, 3 months, FULL BOARD, SOONEST.

---

### Doubt 1 · ordering on live data — **FOUNDED**, but not where suspected

The comparator is **correct** and the keys **are** ascending inside every group. What is wrong is
the keys. Each row's painted `pressingAt` against the named end its own bar states:

| row (in painted order) | key | its own tooltip says | agree? |
|---|---|---|---|
| Ottoline Frayn | 2024-04-14 | 865 days ago · 14 Apr | ✅ |
| Marcus Reed | **2026-07-22** | send by **20 Aug** | ❌ |
| Priya Nair | **2026-07-26** | send by **25 Aug** | ❌ |
| Rachel Lin | **2026-08-07** | reply expected **29 Sept** | ❌ |
| David Marsh | **2026-08-11** | reply expected **28 Sept** | ❌ |
| Iris Kwan | 2026-08-23 | send by 23 Aug | ✅ |

**The seam.** `pressingAt` takes `Math.min` over **all** an agent's live queries. A row draws **one
query per manuscript** (`per` in the bar pass keeps the live one, or the most recent). An agent
with three queries on one book draws one lane and sorts by whichever of the three is most
pressing — including the two the reader cannot see. The rows whose keys agree are exactly the
single-query agents (Ottoline, Iris, Noah, and my seeded Wren and Hester).

⚠️ **This is the third variant of one disease.** The deed bug was lead-vs-earner; this is
all-vs-drawn. Each time, one derivation reads a wider set of queries than the surface beside it.
The fix is to minimise over the set the row actually draws.

⚠️ **And the seeded lock passed throughout** — exactly the failure the brief predicted. It fed the
comparator synthetic rows of one query each, where all-vs-drawn cannot differ. The Phase 1 lock
reads the **painted** order against the **painted** key.

*(The brief's row names — Marsh → Tan → Panetta — are not on this account; Tan and Panetta do not
exist here. The defect reproduces on the rows that do.)*

### Doubt 2 · Ellery — **UNFOUNDED**. Changing nothing.

Tom Ellery renders **two lanes, both filled, both labelled**:

| lane | family | fill | label | ink |
|---|---|---|---|---|
| 1 | `quiet` | hatch painted `repeating-linear-gradient(-55deg, rgb(231,227,220)…)`, 150px of 152 | "Quiet for 31 days" | `rgb(107,103,95)` |
| 2 | `out` | `rgb(230,236,227)`, 178px of 324 | "Out since 27 Jul · reply expected 21 Sept" | `rgb(85,104,79)` |

Both on white tracks with solid family-tinted borders. Nothing is an empty outlined pill.

⚠️ **I can name the likely cause of the screenshot, because I produced the same picture myself last
night**: a shot taken before the board's data arrives renders empty outlined placeholders and
"Nothing in this window" over a board that has twenty relationships. It reads exactly like a
defect. My own shot now waits for rows rather than for a clock.

*(The `quiet` fill reads `backgroundColor: rgba(0,0,0,0)` because a hatch is a background **image**.
A probe reading only `backgroundColor` would report it empty — worth knowing, and not what
happened here: the image is painted and was measured.)*

### Doubt 3 · duplicate task chips — **FOUNDED**, with a different cause than "draws twice"

Seeded a carried task (due 5 days ago, still open) because the board had none. It draws **two**
chips, and both are **correct**: a ghost on the day it fell due (x=878) and the live item on today
(x=913). That pair is the whole point of a ghost — "this fell due here and is still outstanding".

**What is wrong is that they are indistinguishable.** Measured, both:
`border: solid rgb(229,216,201)` · `background: rgb(255,255,255)` · `opacity: 1` · same text. The
only difference is the `grab` class on the live one, which paints nothing.

The grid era distinguished them — `.tl-chip[data-kind="ghost"]` was dashed, transparent and muted.
The Porcelain rebuild dropped that treatment and **the chip render carries no `data-kind` at all**;
the only surviving ghost rule is `.tl-mini[data-kind="ghost"]`, which belongs to the collapsed day
column. So a correct pair of marks reads as one task drawn twice.

*(`o'r` and `example` are not on this account. Per the brief they are real task titles and not a
defect; the reproduction here is a seeded carried task.)*

---

**Red gate: not triggered.** All three lie in the view layer.

⚠️ **Two diagnostic changes were made during Phase 0 and are held for the Phase 1 commit**, so this
phase commits alone as required: `TimelineRow.pressingAt` and the row's `data-pressing` attribute.
They exist because the ordering defect cannot be told from a correct board without comparing the
painted order to the painted key — which is precisely what the seeded lock could not do.
