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

---

# Phases 1–5 — the run

**DEPLOYED to dev, and the acceptance re-run against the deployed site: 10 of 10 green, clean
console at 1280 · 1440 · 1920 · 2400.** https://scriptally-dev.web.app/todo/calendar

Built and pushed from a throwaway worktree at my own HEAD. `src/` happened to be clean at that
moment, but the waitlist session held `functions/src/waitlistModel.ts` mid-edit for most of the
run; the worktree removes the race rather than betting on the timing. It is removed and its copy
of `.env.local` deleted. Nothing is queued for prod; hosting only, no rules.

## The four faults

| | state |
|---|---|
| 1 · chips rendering as concatenated text | **fixed** — the rule is back, proved by a synthetic probe |
| 2 · bars top-aligned in rows twice their height | **fixed** — every part is within **0px** of its lane centre, at four widths |
| 3 · the gap between segments contains nothing | **fixed** — it holds the marker, which is what the clearance was always for |
| 4 · the overrun as two objects, the duration twice | **fixed** — one bar, one count, `.tl-over` retired |

## The seven answers

### 1 · Deployed, and why
Above.

### 2 · Why the chip class stopped applying

**`.tl-chip` and `.tl-band` were declared as ONE GROUPED RULE** — the base box, the bullet, four
kind treatments, the struck state and the hover — and the bars pack retired the band. A grouped
selector is one rule, so killing the band killed the chip with it while the chip was still being
rendered. What shipped was an `inline-flex` with no padding, border or radius, whose bullet and
label run together as bare text.

⚠️ **This is the third face of a hazard CLAUDE.md already records twice** — as a READ fault (a
lock's `indexOf` slicing the wrong block) and as a REMOVAL fault (a regex matching more than it
meant). Neither describes this one: **the regex matched exactly what it was pointed at, and the
block it was pointed at was serving two elements.** Nothing about the diff looks wrong.

**The check is one command and is now a lock** (`calendarStyleReach.test.ts`): classes the page
RENDERS minus classes with a BASE rule. It also catches the media-only case, which is how the chip
actually shipped — `.tl-chip` survived inside the `prefers-reduced-motion` block, so a grep for the
class would have found it and said nothing was wrong.

⚠️ **It went red on this pack's own work within a minute of being written.** My first positioning
rule was `.tl-seg, .tl-over, .tl-node, .tl-wp, .tl-chip { … }` — the identical fault, reintroduced
while fixing it. "Positioned on a lane" is a real shared property, so it is a class the page applies
(`.tl-at`); the focus ring moved for the same reason. A second case forbids the chip sharing a rule
with anything that can be retired independently.

### 3 · Every literal offset found, and none remains

**Found — in the page, which owned the vertical geometry:**

| | |
|---|---|
| `LANE_STEP = 52` | the lane's step |
| `laneTop(lane) = lane * 52` | an inline `top` on **chips, segments, nodes and waypoints** |
| `minHeight: lanes * 52 + 28` | the row's height |

**Found — in the stylesheet:** `.tl-lane { padding: 12px 0 }` · `.tl-seg, .tl-over { height: 36px }`
· `.tl-node { height: 36px; transform: translateX(-18px) }` (−18 being −36/2, written out) ·
`.tl-tip { top: 40px }` · `.tl-wp { height: 32px; margin-top: 2px }`.

**All gone.** Four tokens on `.tl-row` — `--lane-h: 70px`, `--bar-h: 34px`, `--disc: 30px`,
`--chip-h: 26px` (plus `--wp-over`) — and every offset is a `calc()` over them.

⚠️ **The element's own height never enters its own offset.** Everything is centred with
`top: <lane centre>; transform: translateY(-50%)`, so there is no `/ 2` anywhere to go stale when a
height moves. `translateY(-50%)` knows the height; the stylesheet does not have to.

**Asserted, not asserted-about:** the acceptance strips comments from the stylesheet — its prose
quotes every literal it retired — then scans all 20 bar/marker/chip rules for a `top`/`bottom`/
`margin` in bare pixels, and requires the four tokens to be declared. It reports "none", with a
population floor so an empty scan cannot pass.

**Measured before and after:** a 36px bar at `top: 0` in a 132px row with 96px of empty ground
beneath it, and a different offence at every row height → **worst offset 0px across 45 positioned
parts at 1440**, and every row height a whole number of lanes.

### 4 · `StatusDot` scaled — it needed nothing at all

v11 asks whether the component survives ~30px and says a failure would be a finding rather than a
licence to fork. **`DOT_SIZE` is already 30**: that is the app-wide default, and `overrideSize`
exists so the DENSE surfaces can go *smaller* (live callers pass 15, 17 and 26). Every dimension
derives from one `S`, glyph included (`Math.round(S * 0.62)`), and the ring and fill come from
theme tokens.

So the marker is `<StatusDot status={…} decorative />` with no size prop, wrapped in this page's own
element for the parchment halo — because the halo is the board's business, not the component's.
Measured on the deployed page: every status marker is exactly `--disc` wide and contains an SVG,
which is how you know it is the locked component and not a lookalike drawn here.

### 5 · Which of the fourteen render, and which are unit-only

A census over thirteen weeks of the deployed build. **All three markers render**; by event, **8 of
14**:

| marker | v11's events | rendered | unit-only |
|---|---|---|---|
| 1 · StatusDot | 6 | query sent · partial/full **requested** · partial/full/resubmission **sent** · R&R · closed | **offer received** |
| 2 · direction dot | 3 | nudge sent | **holding reply** · **a note you logged** |
| 3 · dashed flag | 5 | window closes (the expectation, still theirs) · offer deadline (the shape; see below) | **reminder due** · **snooze returns** · **expected date passed** (the hatch) |

**Six are locked in `journeyBars.test.ts` — 50 cases — and have never been drawn on a real page.**
Each needs data the account does not hold: no offer, no holding reply, no logged note, no query
with `nudgeDate` set, no sleeping flag, and no your-move stretch whose expectation has passed.

⚠️ **One caveat worth reading rather than counting.** The `deadline` flag renders, but not from an
offer — it fires for any writer's-move query with a resolved date, which is the same shape v11
draws for an agent-stated offer deadline. The MARKER is pixel-verified; the specific event is not.

Counts across the thirteen weeks: **25 status · 6 direction · 10 flags**, each checked for its
shape, its size and its interaction.

### 6 · Rows visible at 900px — five, and the reason is the data

| | |
|---|---|
| row heights | **70** (one lane) · **140** (two) — were 80 and 132 |
| board scrollport | 593, with 547 below the day header |
| **rows visible** | **5** |

**Against the six the brief names, that is not a gain, and the cause is not the geometry.** A
single-lane row is 70 now, so `547 / 70` would fit **seven** of them. Two of the first five rows on
this account are two-manuscript relationships at 140, and one of those sorts first. It is a fact
about the data and the sort order, not about the tokens.

⚠️ **If you want more, `--lane-h` is the one edit.** A lane must hold a 34px bar plus a caption
hanging beneath it (~16px), so 70 carries about 20px of air; **62 would fit eight single-lane rows
and six of the account's mixed ones**. I did not take it: ~70 is the brief's number and it is a
token, so it is a one-line decision rather than a rebuild.

### 7 · What remains unverifiable, and cross-session

* **The chip is proved by a SYNTHETIC PROBE, not by a real one.** This account holds no user task
  with a due date — swept 27 weeks, zero chips, and the repo's own most recent commit says why
  ("a dateless note is not a board citizen, by design"). "Does this stylesheet style an element
  with this class in this DOM position" is a CSS question, so a synthetic element answers it
  exactly, writes nothing and spends no fixture. Measured: 11px padding, 999px radius, solid 1px
  border, the 26px token height, a 6px gap between bullet and label, a checkbox-square bullet, and
  217px between two adjacent chips.
* **"A completion still raises one toast with Undo" is NOT verified on the page**, for the third
  run. It needs a probe pressing a live primary, and the standing rule is that such a probe acts
  only on a card the harness created. The wiring is unchanged again this pack. The recipe:
  create a dated task on `/todo`, open it from the pinned row, press the primary, assert one toast
  carrying Undo, press Undo — and do not navigate before pressing it, because the toast *is* the
  undo.
* **The six unrendered events above**, and the hatch's own rendering with them.
* **The scrollbar**: 0px at every width — Chromium follows the macOS overlay setting.
* **Single engine** (Chromium).
* **Cross-session.** `functions/src/waitlistModel.test.ts` was red against that session's
  uncommitted `waitlistModel.ts` for most of this run; my files were green throughout and nothing
  of theirs was staged. It cleared before Phase 3. One lock outside my territory was retargeted
  with its law stated — `tasksViewport.test.tsx`'s row-height case, which required
  `minHeight: lanes * LANE_STEP` in the page; the law (a row's height comes from its lanes, never
  from a floor) is unchanged, and what moved is where the arithmetic lives.

## The task pane still squeezes — confirmed, not fixed

`.tpn .ws` is unchanged: `grid-template-columns: minmax(0, 1fr) 288px`, **no container query and no
media query**. Any mount narrower than about 600px gives the steps column whatever is left. The
calendar's own Do column carries a page-scoped fold from an earlier pack — asserted still present
by the same case — which is why you do not see it here. It is a pane change, not a calendar one.

## Three things worth carrying forward

**1 · A grouped selector means a removal aimed at one member takes them all.** Not a bad regex, not
a mis-slice: the right edit on a rule that was serving two elements. The lock is a reachability
sweep, and it caught me reintroducing the same fault inside the hour.

**2 · A multi-step edit script that throws leaves the file wherever its last write left it.** My
merge threw before its `write`, so the first two edits were lost — and the cleanup that followed
then removed the copy that HAD the tokens. Both rules ended up with neither. **Measuring the page
caught it; reading the diff would not have**, because the diff showed exactly the removal I asked
for.

**3 · Two locks in a row read prose instead of code, one line apart.** `tasksViewport.test.tsx`'s
`rule()` helper sliced a comment that names `.tl-row` — and one line after writing the fix for that,
I wrote a bare `not.toContain("LANE_STEP")` against a page whose comment explains at length what
`LANE_STEP` was. This codebase documents every retirement by quoting it, which makes it uniquely
hostile to an unstripped scan. **Strip first, every time, including in the assertion you are writing
to fix the last one.**

## Still open — rule after testing

1. **Two markers on one day put their captions on top of each other.** Measured at 1440: two 30px
   dots clear each other by 10px, and their captions need about eighty each, so the later
   overprints the earlier ("FULL SE FULL SENT" on Marcus Reed). **The markers are legible and the
   captions are not.** A `title` makes the overprinted one readable meanwhile. The two options are
   staggering the captions onto a second tier — which needs a taller lane than 70 — or showing one
   and putting the rest on hover. Inventing a policy for that unattended is what this list is for.
2. **`--lane-h` at 70 against 62**, above — one token, one more row per screen.
3. **The word `overdue` in the bundle.** None of it is the calendar's; it is a stored `TaskType`
   (`nudge_overdue`, in Firestore), a `Task.priority` union member, a popover class and a nav
   count. A sweep is a data-layer pack with a migration in it, not a line here.

## Gates, at close

Re-run on the tip after the report landed, on a tree clean of my paths:

| | |
|---|---|
| `tsc --noEmit` | **exit 0**, no diagnostics |
| `vite build` | **exit 0**; read by `grep -inE "error\|\[WARNING\]"`, not by `tail` — the only match is the expected chunk-size note |
| Vitest | **411 files · 7,117 passed · 3 skipped**, none failing |

⚠️ **The mid-run red is gone and it was never mine.** For most of this run
`manuscriptPlate.test.tsx` was red (7 cases) with two `tsc` errors beside it, from the book-profile
session editing under me; it cleared when their later phases landed. My owned suites were green at
every phase gate — the four of them are **172 cases** — and nothing of theirs was ever staged in
one of my commits. Recording it because a red gate that belongs to another session is
indistinguishable, in a run summary, from one you caused.
