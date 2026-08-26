# Calendar — range, weight, and hover-only captions

> **DEPLOYED TO DEV.** All five phases landed on `main` (`c9d80860` → `316721e5` + the tidy below),
> every gate green, and `https://scriptally-dev.web.app` verified as carrying them — five ranges
> read back off the deployed bundle, not off the success line.

**Session** `calendar` · base `ed2b7df3` · **complete** · hosting only, nothing touched functions or
rules.

| phase | commit | what landed |
|---|---|---|
| 1 | `c9d80860` | the range ref (v18) committed |
| 2 | `8cfa3a43` | weight, ground, boundaries, a spine that reads its own token |
| 3 | `ae001a0d` | five ranges from one slider; `TL_DAYS` retired |
| 4 | `6f935dc4` | captions on hover only; the `title` workaround retired |
| 5 | `316721e5` | the table asserted as a table, four widths × five ranges |

**Suite at close:** 412 files, 7,138 passed, 3 skipped. tsc clean. Production build clean (read by
grep, not by tail).

---

## What a reader sees

| range | grain | divisions | weekday initials | bar text | row head | status / direction marker |
|---|---|---|---|---|---|---|
| 1 week | day | 7 | yes | yes | — | 34 / 24 |
| 2 weeks | day | 14 | yes | yes | — | 34 / 24 |
| 1 month | day | 31 | **no** | yes | — | 34 / 24 |
| 3 months | **week** | 13 | no | **no** | **the sentence** | **22 / 15** |
| 6 months | **month** | 7 | no | **no** | **the sentence** | **22 / 15** |

Identical at 1280, 1440, 1920 and 2400. The spine lands within 2px of the position its own token
states at all twenty stops; no caption is painted anywhere with nothing hovered; the page never
scrolls sideways; console clean throughout.

**Measured by** `tests/e2e/tlAccept.measure.ts` (20 stops, 40 readings),
`tests/e2e/tlCaptions.measure.ts` (rest / hover / keyboard / waypoint) and
`tests/e2e/calLook.measure.ts` (10/10).

---

## Flags

**1 · The marker clearance is NOT migrated, and the token is deliberately absent.** It is still
`journeyBars.GAP = 0.34` — a third of a DAY, which is 4.9% of the board at one week and 0.19% at six
months. Moving it to pixels is a change to the bar DERIVATION, which cuts its pieces in days and
knows nothing about ink; the ref's shape is `--clear` at 20 / 14 / 11 applied as padding at a bar's
end where a marker abuts it. **I declared the three values, found nothing read them, and took them
out again** — a rule that looks parameterised and is not is a trap this repo has been caught by
twice. The stylesheet states it as outstanding at the point where the token would go.

**2 · Hover-only leaves touch with no route to the caption.** Flagged, not solved, as the pack
directed. A touch device has no hover state, so on a tablet every marker is now a shape with no
words: `aria-label` still carries them for assistive technology and the marker is still clickable
(it opens the record), but there is no gesture that shows the caption alone. The three candidates —
tap-to-reveal-then-tap-to-open, a persistent caption below ~768px, or long-press — are all product
decisions rather than fixes, and each has a cost the range slider does not.

**3 · The board opens at TODAY and runs FORWARD, so a long range is almost entirely forecast.** The
ref anchors the same way (`addD(TODAY, i)` from `i = 0`), so this is the design and I have not
changed it — but the range slider makes its consequence much more visible. At six months the board
is 182 days of expectation with no history at all: measured on the harness account, the resting
board holds 16 rows, 18 bar segments, 1 waypoint and **zero markers**, because markers are records
and records are in the past. **The pager reaches them in one press.** Whether a longer range should
also look further back is a design question the pack did not own.

**4 · It cost the acceptance sweep a whole row of its own table before I noticed.** `disc` came back
`null` at all twenty stops and a guarded `if (disc !== null)` skipped the marker-size row in
silence. Not a failure — an assertion that never ran and said nothing about it. Recorded here
because it is the exact vacuous shape `CLAUDE.md` already warns about, arriving through a guard
written to be careful.

**5 · `calLook` was RED before Phase 4, and I shipped Phase 2 without running it.** Its lane-centre
check did `parseFloat(getPropertyValue("--lane-h"))`, which was a number while the lane was the
literal `70px` and became `NaN` the moment the lane started deriving from what it holds. It failed
loudly rather than passing vacuously, which is the only good half of it. Two lessons, both mine:
**a custom property holding a `calc()` reads back as its text**, and **an owned lock is run in the
phase that changes what it reads**, not two phases later.

**6 · `TplZone` was labelled `"The week"` at every range.** True while a window could only be seven
days; stating something the code had stopped doing from the moment it could not. It reads
`range.label` now. Same family as a comment outliving what it described, arriving through a prop.

**7 · There is no weekend tint to remove, and there never was one here.** Zero matches for
`weekend`/`wknd` in the stylesheet or the page. It was removed from the MONTH grid by an earlier
pack (`0e3cea64`); the timeline never had one. Phase 2's boundary rules still apply — the rhythm
they replace simply was not there to take away.

**Known, out of scope, confirmed:** `.tpn .ws` still squeezes to two columns below ~600px.
`calLook.measure.ts:406` asserts it as a standing, deliberate non-fix and passes.

---

## The standing rule, recorded

`CLAUDE.md:353` — **no element's position or size may be expressed as a literal that another element
owns.** All four instances the pack named are closed:

| was | now | owner |
|---|---|---|
| `--lane-h: 70px` beside a 34px bar | `calc(var(--bar-h) + var(--row-pad) * 2)` | the row, from what it holds |
| `.tl-row--pin { --lane-h: 40px }` | `calc(var(--chip-h) + var(--chip-pad) * 2)` | the pinned row, same formula |
| `width: calc(var(--disc) - 8px)` ×3 | `--ddot`, declared once | the direction dot |
| `transform: translate(-1px, …)` | `calc(var(--wp-line) / -2)` | the waypoint's own line |

Every one of them still computes to the number it computed to before. What changed is that none of
them can be right by coincidence — and the third mattered immediately, because the density tiers
move `--disc` and `--ddot` apart and a shared derivation would have been wrong at the first tier.

---

## Phase 0 — recon (read-only), as taken

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
