# Calendar — the foot gap, and a collapsible panel

**Session:** `calendar` · 22 Aug 2026, overnight, unattended.
Prior: `calendar-finishing.md` and the seven reports before it.

> **DEPLOY — filled in at Phase 3.**

---

## Phase 0 — the foot gap: what it actually is

### The pixels first

Committed as evidence, bottom 200px at 1440 wide, both heights:

| | 900 | 1080 |
|---|---|---|
| `/queries` | `reports/calendar-foot/queries-900.png` | `reports/calendar-foot/queries-1080.png` |
| `/todo` | `reports/calendar-foot/todo-900.png` | `reports/calendar-foot/todo-1080.png` |
| `/todo/calendar` | `reports/calendar-foot/todocalendar-900.png` | `reports/calendar-foot/todocalendar-1080.png` |

The screenshots show it before any number does: **`/queries` and `/todo` end in a card edge with a
clean band of ground below it; the Calendar's furniture runs to the window's edge**, with the legend
row sitting in what is empty paper on every other page.

### The three measurements, named

| measure | `/queries` | `/todo` | `/todo/calendar` |
|---|---|---|---|
| (1) chassis window → viewport | 20px | 20px | 20px |
| (2) innermost scroller → its container | 0px (`f12-quiet-scroll`) | 6px (`note-in`) | **43.75px** (`cal-fpbody`) |
| (3) last bordered panel ends | **847** | **847** | **854** (grid) · **879** (day panel) |
| ground below the last panel | **33px, clean** | **33px, clean** | **26px, holding the legend — which ends 1px from the frame** |

**Measure (1) is why every previous reading said "parity": the window is identical by construction.
The pages differ one level in.** Walking the padding chains found the mechanism:

```
/todo            .tdw-split   padding-bottom: 32px   → panels end 847, 33px of ground
/queries         .f12-body    padding-bottom: 32px   → panels end 847, 33px of ground
/todo/calendar   (nothing)    0px at every level     → furniture ends 879, 1px from the frame
```

**The sibling pages each carry a 32px bottom inset in their own page sheets. The Calendar carries
none.** And the v5 ref agrees with the siblings: it draws **no legend at all** and gives `.layout`
a `margin-bottom: 28px` ground band — which the shipped page dropped.

### So the pack's candidate 3 is confirmed, stated plainly

**The Calendar's foot is a legend row (and a full-bleed day panel) where the other pages end in a
card edge above clean ground. The chassis numbers match while the pages look different.** Two
concrete deltas a reader sees:

- the **day panel's card runs to 1px of the window's bottom edge** (siblings: 33px short);
- the **legend row ends 1px from the frame**, filling the band that is clean paper elsewhere.

### ⚠️ And the full fix is UNAFFORDABLE overnight — the arithmetic, so the trade is yours

Matching the siblings exactly means a ~32px bottom inset on the month column. The month's rows are
`minmax(0, 1fr)`, so 32px off the column is **5.3px off every row** — and the cushion at 900
viewport height is **+4.0px**. The fold would drop below its floor and `data-fold-short` would
appear at 1440×900. **Phase 0B forbids spending the cushion, so the full band is flagged as your
call, not taken.** The affordable subset is Phase 1.

*(A probe hole worth recording: the first "last ink" walk rejected boxes below the VIEWPORT but not
boxes clipped by the WINDOW — `.ws-window` is `overflow: hidden` — so it reported `/queries`' last
ink 12px PAST the window edge: geometrically true, invisible in fact. The honest question is where
the last VISIBLE thing stops.)*

---

## Phase 1 — the fix, inside the cushion

Two declarations, no new vertical spend:

| change | effect | cushion cost |
|---|---|---|
| `.cal-legend` `margin-top: 14px` → **`margin: 7px 0`** | the same **25px of flow, redistributed** — the legend floats in its band, **8px clear** of the frame instead of 1px | **zero** — the grid's height is untouched to the hundredth |
| `.cal-focus` gains **`margin-bottom: 25px`** (≥1080 only) | the day panel's card edge stops **on the grid's own bottom line** (854), with 26px of ground below, instead of running to 1px of the frame | **zero** — the panel's body is its own scroller; shortening it costs scroll length, never cell geometry |

The 25 is the legend's flow band (7 + 11 + 7), so the two columns' furniture closes on **one line**
with the legend riding beneath the month — the sibling pages' grammar (card edge, then ground, one
quiet caption) rather than furniture touching the frame. Below 1080 the margin comes off: the panel
sits under the grid in a scrolling column, so there is no shared foot line to close on.

**Measured after** (`reports/calendar-foot/after-todocalendar-{900,1080}.png` beside the befores):

| | grid ends | panel ends | ground | legend clear of frame | cushion | foldShort |
|---|---|---|---|---|---|---|
| before @900 | 854 | **879** | — | **1px** | 4 | none |
| **after @900** | 854 | **854** | **26px** | **8px** | **4** | none |
| **after @1080** | 1034 | **1034** | **26px** | **8px** | 34 | none |

**The remaining 7px** (calendar cards at 854 vs siblings at 847, 26px of ground vs 33) is the
unaffordable slice — closing it costs ~1.2px per row of the 4px cushion. Flagged in Phase 0; yours.

> **⚠️ A silent no-op caught mid-fix, worth its line:** the first edit to the legend rule used a
> `str.replace` whose needle omitted `ui-monospace` from the font stack — **no match, no error, no
> change**, and the "after" measurement read the legend still 1px from the frame. The measurement
> caught it; the edit now asserts its needle matched. The same shape as a lock reading the wrong
> artefact: the tool reported success about work it never did.
