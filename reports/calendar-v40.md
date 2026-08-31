# Calendar v40 — one card per relationship

## Baseline at `7afeddff`, through the gate

```
  tsc   : mastheadMatrix.measure.ts(329,46) TS2339          [exit 2, 1 lines read]
  vitest: Tests  7350 passed | 3 skipped (7353)             [exit 0, 72 lines read]
  build : ✓ built in 5.98s                                  [exit 0, 188 lines read]
```

The one tsc error is the masthead session's, proved by reading. Level with `main` and
`origin/main`; 89 untracked files, none under `src/` or `tests/`; no other session holding
uncommitted `src/`. The v40 ref is `~/Downloads/timeline-v40-ref.html`, and `timeline-v39.html` is
the only timeline ref in the repo.

---

## Phase 0 — recon

### 1. Where segments are cut, and what dies with the model

`cutPieces(span, breaks)` — `journeyBars.ts:632` — walks the sorted breaks, reserving `GAP` either
side of each and dropping anything under `MIN_SEG`. It is called once, at `:954`, from `laneBars`,
against `marks`. **That call is the whole of the segment model**: everything downstream consumes
its output.

| consumer | what it holds |
|---|---|
| `journeyBars.ts` | `cutPieces`, `Segment`, `Bars.segments`, and the per-piece fields that only exist because a run is cut: `openLeft`, `openRight`, `capLeft`, `capRight`, `abutL`, `abutR`, `live`, `hollow`, `trueFrom`, `trueTo` |
| `todoTimeline.ts` | `segments: Segment[]` on the week, the `segments` accumulator at `:854`, and `timelineSegments` at `:1169` |
| `TodoCalendarPage.tsx` | `barsByRow` (groups pieces per row), the `.segs` reads, `selSeg`, the piece count in the census, and the `Piece` component itself |
| `journeyBars.test.ts` | its `Segment` fixtures |

**⚠️ Three files match `Segment` and are a different thing entirely** — `Queries.tsx`,
`ImportCsv.tsx` and `manuscriptPitch.ts` all mean `SegmentedToggle`. Out of territory; a sweep on
the identifier would take them.

**`barFit.ts` is already orphaned** — its only importer is its own test. It survived v39's marquee
rewrite as a module nothing calls.

### 2. The action column — every part of it

`--tl-ac-w: 172px` · `.tl-c-ac` (the row cell at `:1329` and the rail header at `:1706`) ·
`.tl-abtn` + `.tl-abtn:hover` + `.tl-rrow:hover .tl-abtn` + `.tl-ablbl` · and `actionFor()` at
`TodoCalendarPage.tsx:1032`, which is also read by `RIGHT NOW`'s predicate at `:1158`.

### 3. The row head's dot — **the component, and a second thing that is not a redraw of it**

`StatusDot` is imported (`:70`) and rendered at **`overrideSize={13}`**, `decorative`, in a **288px**
column with **12px** padding and a **10px** gap.

**⚠️ There is also `.tl-sd`, a 10px CSS disc — and it is NOT a redraw of the status dot.** It is
drawn only where `r.status` is null, which is the pinned task rows: they hold no query, so they
have no status, and the disc states whose-move instead. The file says so at the render. Reporting
it as a separate marker rather than as the defect the brief anticipated — but flagging that Phase 5
must decide what a statusless row shows at 18px, because the two now differ in size as well as in
meaning.

Against the pins: 13 → **18px**, gap 10 → **14px**, column 288 → **292px**, padding 12 → **16px**.

### 4. Today's position — a quarter, not a half

`pastDaysOf(range) = round(days × past)` with `past` fixed per range in `TIMELINE_RANGES`:

| range | days | past | today sits at |
|---|---|---|---|
| 1 month | 30 | 8/30 | **26.7%** |
| 3 months | 90 | 22/90 | **24.4%** |
| 6 months | 180 | 45/180 | **25.0%** |

Phase 2 makes all three 50%, which is one fraction rather than three.

### 5. What survives of the fit machinery

`fitLines`/`fitLabel` are already unreachable from the app — the v39 pass replaced the decision with
a direct overflow measurement (`scrollWidth` vs `clientWidth` → `.fits` and `data-over`), and
`cycleFor` drives the marquee. So Phase 4's ladder replaces the *measurement*, not a decision
function, and `barFit.ts` can go with it.

### 6. The v39 fixes are still standing

Surface-token readers in the calendar sheet: **0** — the board still paints nothing. The wash is
still `--tl-past-w` set to `pct(todayAt)`, so it still stops at today. Both re-asserted by
`calGround.measure.ts` on every run.

### Red gate

Nothing here implicates derivation beneath the view layer. `cutPieces` is a drawing decision about
one already-derived run; the action column is a rendering of `assembleBoardColumns`' output; the
window's start is a view constant.
