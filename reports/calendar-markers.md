# Calendar — markers, and the geometry that broke

Three markers whose shape states whether a fact exists; geometry derived from tokens rather than
from literals tuned to a row height that has since changed.

---

## Phase 0 — recon (read-only)

`main` at `96172d84`, worktree level with it, `src/` clean. Two commits landed since my last
(`ddf531a6`, `96172d84`), neither touching a calendar file. No other worktree holds anything
matching `calendar|todoTimeline|journeyBars|calLook`. The pane mount and `todoTimeline.ts` are
structurally intact. **Red gate clear.**

### 1 · Why the chip class stopped applying

**`.tl-chip` is applied to the element and has no rule.** The only mention of it left in
`todoCalendar.css` is inside the `prefers-reduced-motion` block; every base declaration is gone.
An unstyled `inline-flex` with no padding, border or radius renders exactly what was reported —
the label and its parts run together as bare text.

**The cause, precisely: `.tl-chip` and `.tl-band` were declared as ONE GROUPED RULE, and the
removal was aimed at the band.**

```
-.tl-chip, .tl-band {            ← the base box: padding, radius, border, flex
-.tl-chip .d, .tl-band .d { … }  ← the bullet
-.tl-chip[data-kind="turn"] { … }  … and the four kind treatments, the struck state, the hover
```

`b2b427f8` (bars Phase 4) retired the band, and a grouped selector is **one rule** — so killing
the band killed the chip with it, while the chip was still being rendered.

⚠️ **THIS IS THE THIRD FACE OF A HAZARD THIS REPO ALREADY RECORDS TWICE.** CLAUDE.md has the
grouped-selector trap as a *read* fault (a lock's `indexOf` slicing the wrong block) and as a
*removal* fault (a regex matching more than it meant). This is neither: the regex matched exactly
what it was pointed at, and the block it was pointed at was serving two elements. **A grouped
selector means a removal aimed at one member takes them all.**

**And the check that would have caught it is one command, which I did not run on that edit.** I
ran the both-directions removal check on the wholesale stylesheet rewrite, and for the later slice
replacement I only swept the CSS for duplicate base rules — a question about the sheet, not about
whether the page still had rules for what it draws. The sweep that answers it:

```
classes the page RENDERS  −  classes with a BASE rule in the sheet   ⇒   must be empty
```

Run now, it returns exactly two: **`tl-chip`** and **`tl-fwd`** (the carried-task arrow, removed in
the same block). The inverse half found three rules with nothing rendering them — `tl-quiet` and
`tl-none-s`, retired with the empty-row rule in bars Phase 5, and a false positive on
`tl-row--pin`, which is rendered inside a ternary my extraction did not split. **The sweep is worth
reading rather than believing**, exactly as the marketing dead-class scan is.

### 2 · Every literal vertical offset — all of them, and they are all in scope

**In `TodoCalendarPage.tsx` (the page owns the vertical geometry today, not the stylesheet):**

| | |
|---|---|
| `const LANE_STEP = 52` | the lane's vertical step |
| `laneTop(lane) = lane * LANE_STEP` | applied as an inline `top` to **chips, segments, nodes and waypoints** |
| `minHeight: lanes * LANE_STEP + 28` | the row's height |

**In `todoCalendar.css`:**

| rule | literal |
|---|---|
| `.tl-lane` | `padding: 12px 0` |
| `.tl-seg, .tl-over` | `height: 36px` |
| `.tl-node` | `height: 36px` · `transform: translateX(-18px)` — the −18 is −36/2, written out |
| `.tl-tip` | `top: 40px` — "below a 36px marker", stated as a number |
| `.tl-wp` | `height: 32px` · `margin-top: 2px` — both tuned to the 36px bar |

**Measured, and this is fault 2 exactly:** on a **132px** row the bar sits at `top: 0` with **96px
of empty row beneath it**. `centred: false`. Row heights are 80 and 132; the bar is 36. `laneTop(0)`
is the lane's padding-box top, so lane 0 means *the top*, not *the middle*.

⚠️ **THE SHAPE IS THE ONE `--tl-head-h` HAD:** one element's position written as a number that a
different element owns. The row's height is `lanes × 52 + 28`; the bar's offset is `lane × 52`.
Both read 52 and neither is the other's.

### 3 · `StatusDot` scales — and its app-wide size is already 30px

**No override is needed and no fork is warranted.** `DOT_SIZE = 30` is the app-wide default, and
v11's worry — that the component is specced at 12–13px — is not this repo's state: `overrideSize`
exists precisely so the DENSE surfaces can go *smaller* (live callers pass 15, 17 and 26).

Everything derives from one `S`: `width: S`, `height: S`, `glyphSize = Math.round(S * 0.62)`, and
the ring and fill come from theme tokens. So `<StatusDot status={…} />` with no size prop renders
the 30px v11 asks for, unmodified.

### 4 · The three-way distinction is already derivable — no new read

| what the marker says | how it is known | source |
|---|---|---|
| the status **changed** | a `BarNode` whose `statusOf(activityId)` is non-null | `statusIndex(activities)` off `Activity.resultingStatus` |
| an activity exists, the status **held** | a `BarNode` whose `statusOf(activityId)` is **null** | the same map — a nudge writes no `resultingStatus` by construction |
| a **date only** arrived | a `Waypoint` — there is no activity behind it at all | `resolveExpectedDate` · `Query.nudgeDate` · `TaskFlag.snoozedUntil` |

All three are already passed into `laneBars` and already used by the side walk. What changes is
that the node carries which of the first two it is, rather than the view inferring it again.

### 5 · Geometry today, at 900px

| | |
|---|---|
| row heights | **80** (one lane) · **132** (two) |
| bar height | 36 |
| bar's position in its row | **top 0, 96px of gap below** — not centred |
| board scrollport | 593 at rest, 646 scrolled |
| chrome above the board | 284 |
| **rows visible without scrolling** | **5** |

The brief's "six that fit before" is the pre-bars figure; the bars pack made rows taller and it is
five now. At the ~70px this pack targets, `547 / 70` is about **seven**.

### Two things the refs settle

* **v11 derives its own geometry from tokens** — `--bar-h`, `--disc`, and offsets written as
  `calc((var(--disc) - 22px) / 2)`. The ref is already doing what Phase 2 asks for.
* **v8's shape is the one to take:** a zero-height `.mid` at `top: calc(var(--row-h) / -2)` inside
  the lane, with everything positioned from that centre. ⚠️ Its own `.chipx { top: -13px }` is a
  literal (`−26/2`) and is **not** copied — the chip's height becomes a token like the rest.
