# Calendar — v36, part two

**DEPLOYED to dev, hosting only, at `24c2b02b`** — verified by bundle hash:
`https://scriptally-dev.web.app` serves `/assets/index-CMpSsqsq.js`, the file that build produced.
No blocking file: no other session held uncommitted `src/` at deploy time.

**All seven phases landed and are measured.** Gates: **tsc 0 · production build 0 · vitest 429
files, 7334 passed, 3 skipped, 0 failed**; acceptance **19/19 at 1280 / 1440 / 1920**, clean
console. Baseline was fully green, so this is equal to it.

Commits: `cfb773b4` recon · `aa3a5e00` ordering + ghost · `430345e6` markers ·
`cd270257` marker faces · `5d269bc9` surface + wash + today line · `24c2b02b` the rail.

---

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


---

## The answers, in order

### 2 · The three doubts

- **1 · Ordering — FOUNDED**, and the comparator was innocent. Every key was correctly ascending;
  the KEYS were computed over the wrong set.
- **2 · Ellery — UNFOUNDED. Nothing changed.** Two lanes, both filled and labelled: the quiet lane
  paints its hatch across 150 of 152px, the out lane fills 178 of 324.
- **3 · Duplicate chips — FOUNDED, different cause.** The two chips are both *correct* — a ghost
  and a live item — but were painted identically.

### 3 · What the comparator was being fed, and where the seam was

`pressingAt` took `Math.min` over **all** an agent's live queries. A row **draws one query per
manuscript** (`per` in the bar pass). So an agent holding three queries on one book showed one lane
and sorted by whichever of the three was most pressing — including the two the reader cannot see.

| row | key before | its own bar said |
|---|---|---|
| Marcus Reed | 22 Jul | send by **20 Aug** |
| Priya Nair | 26 Jul | send by **25 Aug** |
| Rachel Lin | 7 Aug | reply expected **29 Sept** |

After: all seventeen keyed rows carry a key their own bars state. **Third variant of one disease** —
the deed bug was lead-vs-earner; this is all-vs-drawn.

### 4 · Marker clearance, before and after

| range | worst gap before | after | pairs under 1px |
|---|---|---|---|
| 1280 | **−8.00** | **+3.73** | 15 → 0 |
| 1440 | **−8.00** | **+4.34** | 13 → 0 |
| 1920 | **−8.00** | **+6.16** | 10 → 0 |

Two causes. `bang` and `clock` were **drawn but never breaks**, so bars ran straight under them.
And a collapsed piece **still paints its border**: with `box-sizing: border-box` a negative width
clamps *up* to the borders, leaving a 2px sliver that can only overlap. Such a piece is hidden —
`display`, not `visibility` (a hidden element still has a box), and reset before measuring or the
hide latches.

Your ruling corrected me: my "a marker sits on its own bar by design" was the original vacuous skip
wearing a reason, and it excused every failing pair a second time.

### 5 · Rail alignment — measured, not reported unbuilt

**743/638 = 743/638 at all three ranges; worst tick drift 0.01px.** The lock caught its own fault
first: the card's 1px border insets its lanes, so the rail was 2px wider and started a pixel
earlier, with a per-tick drift of only 0.80px because the two errors partly cancel. That is why it
asserts the **columns** coincide as well as the ticks.

### 6 · Part one's fill ratios, re-measured

Unchanged: Rachel Lin 41/41/41 · Wren Ashcombe 93/93/93 · Devendra Rao 73/73/73 · Imogen Farr
75/75/75 · Noah Bright, Tom Ellery, Elinor Hale, Cormac Bligh, Tobias Quint all 100/100/100. **No
regression.**

### 7 · Locks proved vacuous; values not pinned

- **The clearance lock**, twice over — reported in §4.
- **Part one's today-line lock was vacuous in the worst way**: it asserted the flag was centred on
  the line, and **both were 346px from today**. Two wrong things agreeing. Replaced by an assertion
  that the rule and the past wash **end on the same pixel** — two routes to one date, reconciled
  against each other.
- **Every fix was proved red by deletion**, including the new backtick lock.
- **No value was needed that was not pinned.** One rounds rather than drifting: the today stem is
  declared 1.5px and Chromium reports 1px at DPR 1, so the declared width is asserted in source and
  the rendered check asserts it is painted burgundy.

### 8 · Unverifiable remainder; cross-session

**A defect neither of us was looking for.** The today rule sat at **x=557** while today was at
**x=903** — inside the name column, 346px from the date it named. It was `pct(todayAt)`, a fraction
of the *wrap*, while every bar is a fraction of the *lane*, and the lane starts 460px in. It has
been wrong since the board was rebuilt. Found by the Phase 5 wash lock, which classified every fill
as "ahead of today" and made no sense until the line was measured against the lane.

**A recurring mistake now has a lock.** A backtick inside a `page.evaluate` template ends the
string; the file fails to COLLECT, which Playwright reports as *"No tests found"* — an absence, not
an error, while the previous run's report sits on disk looking current. It has cost three sessions,
every time through a comment written in the house style. `measureTemplates.test.ts` fails on the
pattern rather than its consequence.

**Three probes reported on nothing and each failed loudly rather than passing** — the recon's range
control (a hidden page's copy, so three ranges read identically), the wash check looking for a fill
that crosses today (a fill *ends* at today), and the centring check collecting pieces hidden by the
sliver fix.

**Cross-session:** the manuscripts session broke `OverviewPane.tsx` mid-run and the full suite
carried 17 of their reds for a while; proved by reading and since resolved by them. `main` was
otherwise quiet.

**Known, still reproducing, untouched as instructed:** uppercase agent names in dev data, the pane's
`.tpn .ws` squeeze, `nudge_overdue` as a stored task type, and `o'r` — a task actually titled `o'r`.

**Two cosmetic things I did not fix**, both visible in `reports/calendar-v36/part-two-1440.png`: the
`RANGE` control still wraps its readout at 1440, and the today chip overlaps the "25 Aug" day label
where they coincide.
