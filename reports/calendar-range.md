# Calendar — range, weight, and hover-only captions

**Session** `calendar` · base `ed2b7df3` · **Phase 0 — recon, read-only**

**Red gate: clear.** No session mid-edit in `src/`; `todoTimeline.ts` and the pane mount are intact.

> ⚠️ **The surface has changed since the last calendar pack, and the pack is right to aim where it
> does.** 84 commits landed since my previous run, including two full packs (`calendar bars`,
> `calendar markers`). **`/todo/calendar` is now the timeline board** — `TodoCalendarPage.tsx`
> contains no `cal-*` classes at all; the month grid it used to draw now lives in
> `RecordingCalendar.tsx`, mounted by `FocusFlow`. The proposals pack I verified last night
> (drag, expected pills, month jump) was measured against that month grid, so those readings are
> history rather than a description of this page.

## 1 · Tokens, and where a dimension is still a literal

**The geometry is already tokenised**, and one of this pack's four instances is already recorded in
the stylesheet in its own words ("the token IS the header's height, not a description of it").

| token | value | owner |
|---|---|---|
| `--tl-head-w` | 210px (→168 →132 at breakpoints) | the row-head column |
| `--tl-head-h` | 46px | the sticky header, and the pinned row's `top` reads it |
| `--lane-h` | 70px | one lane of a row |
| `--bar-h` | 34px | the journey bar |
| `--disc` | 30px | the StatusDot's app-wide size |
| `--chip-h` | 26px | a chip |
| `--wp-over` | 6px | how far a waypoint stands proud of the bar |

Everything that positions against another element already derives: `.tl-at { top: calc(var(--lane-h)
* (var(--lane) + 0.5)) }`, `.tl-row--pin { top: var(--tl-head-h) }`, `.tl-seg { height:
var(--bar-h); transform: translateY(-50%) }`, markers sized from `--disc` and centred with
`translate(-50%, -50%)`.

**Sixteen positional literals remain and thirteen are innocent** — an element's own intrinsic size
(a 1px separator, an 8px dot, a 26px search box). **Three are the rule's real subject:**

- `.tl-node[data-marker="direction"] { width: calc(var(--disc) - 8px) }` — and the same on `height`,
  and again on the reminder waypoint's `::after`. **The `8px` is a delta that belongs to the
  direction dot, written as an adjustment to something else's size.** Phase 2 gives it its own token,
  because the tiers move both numbers independently.
- `.tl-wp { transform: translate(-1px, -50%) }` — a nudge with no owner.

**And the one the pack names, which is not in CSS at all:**

```
src/lib/journeyBars.ts:45   export const GAP = 0.34;
src/lib/journeyBars.ts:55   export const MIN_SEG = 0.33;
```

**The marker clearance is a third of a DAY.** At one week that is 4.9% of the board; at six months
it is 0.19% — invisible, exactly as the pack predicts. Phase 3 makes it pixels.

## 2 · A slider pattern exists — and it is the right one

**Found, and it will be matched rather than forked.** `src/components/forms/WeekSlider.tsx` and its
sibling `src/components/forms/CheckBackSlider.tsx`: a native `<input type="range">` with a burgundy
fill painted as an inline `linear-gradient`, wrapped in `.sa-fld` › `.sa-wk-head` (`.sa-label` +
`.sa-wk-read` live readout) › `.sa-wk-slider` › `.sa-wk-ends`, an instance-unique id from `useId()`,
and `aria-valuetext` carrying the readout.

**`CheckBackSlider` is exactly the shape this pack needs** — it already runs an INDEX over a
non-linear scale array (`CHECK_BACK_SCALE_DAYS`), `min={0} max={len-1} step={1}`, mapping the index
back to a value on change. Five stops over `[7, 14, 30, 91, 182]` is the same component's third
sibling, not a new pattern.

## 3 · The window is already a day count — geometry is the only change

**Confirmed.** `windowDays(startYmd, days)` and `shiftWindow(startYmd, days, delta)` already take
the length as an argument. Positions are **fractional, not column-indexed**:

```
const TL_DAYS = 7;
const pct = (n: number) => `${(n / TL_DAYS) * 100}%`;
```

Bars are placed with `left: calc(${pct(it.idx)} + 4px)` and markers with `left: pct(n.at)`. So a
182-day window needs **no second derivation** — `TL_DAYS` becomes the selected range and every
fraction follows. What changes is the column COUNT (day → week → month grain) and the density tiers.

## 4 · Rows at 900px, and the chrome

Measured, rendered, at 1440 × 900:

```
  rows visible 7 of 16   ·   row height 140px (2 lanes × 70)
  chrome above the board 284px   ·   sticky header 46px
  bar renders 34px   ·   8 grid columns (head + 7 days)
```

## Two findings the pack did not expect

- **⚠️ There is no weekend tint to remove.** Zero matches for `weekend`/`wknd` in
  `todoCalendar.css` and in the page. It was removed from the MONTH grid by the proposals pack
  (`0e3cea64`, "the weekend tint goes"); the timeline never had one. Phase 2's boundary rules still
  apply — the rhythm they replace simply is not there to take away.
- **⚠️ Captions rest today, and there is exactly one on screen.** `.tl-tip` sits at
  `top: calc(100% + 5px)` under its marker, mono 7.5px, no border or shadow, `opacity: 1`. Phase 4
  turns it into a raised tooltip. Note the count: one caption at rest in the whole board, which is
  worth knowing before the collision machinery is retired — the crowding it guards against is not
  visible in today's data at one week.
