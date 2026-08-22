# Calendar — the foot gap, and a collapsible panel

**Session:** `calendar` · 22 Aug 2026, overnight, unattended.
Prior: `calendar-finishing.md` and the seven reports before it.

> # ✅ DEPLOYED — **https://scriptally-dev.web.app** → Tasks → Calendar
>
> All four conditions passed: `tsc` **0**, Vitest **6320 passed / 0 failed**, build exit 0 with the
> dev target guard, and **no uncommitted source from any session** at build time — the noteboard
> session committed its finish (P1+P2) minutes before the deploy, so their two commits ride along,
> named under flag 6. The Phase 3 acceptance was then **re-run against the deployed site** and
> passed at all three widths.

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

---

## Phase 2 — the collapsible day panel

Committed as `2244fd6d` + the parked-pointer guard in `ed50eebf`. The shape:

- **One chevron, one mount** — absolutely positioned against the layout, moved by the collapse
  class. Open it straddles the panel's left edge and points **›** ("push it away"); collapsed it
  straddles the widened month's right edge and points **‹**. A mount per state would remount the
  control on toggle and drop keyboard focus; one element keeps focus across the toggle with no
  machinery. `aria-expanded`, verb-first names, the page's button grammar, the segment's focus ring.
- **The panel width became a token** (`--cal-panel-w`) because two rules now read it — the grid
  template and the chevron's open position. One owner; a lock asserts exactly one literal.
- **Hidden, never unrendered** — `display: none` keeps `CalDayPanel` mounted, so an expanded record
  row and the panel's scroll survive a collapse, and the narrow world keeps its panel.
- **Below 1080 the state is ignored BY CONSTRUCTION**: the collapse rules live inside
  `@media (min-width: 1080px)`, so the class has no rules in the narrow layout and the chevron hides
  in the narrow block. No width check in the component.
- **Reopen-on-read rides the three selection helpers** — `selectDay`, `focusCard`, `focusRecord` —
  so a pip, a ghost, a record pill and whitespace all reopen a collapsed panel by one rule, and a
  future fourth caller inherits it.
- **Screenshot:** `reports/calendar-foot/collapsed-1440.png` — full-width month, chevron on the
  right edge, today ringed, legend breathing.

## Phase 3 — measured, then re-measured on the deployed site

```
@1000  narrow: chevron hidden · panel visible · cushion 13 · foldShort none
@1440  grid 682 → 1070 (= the layout's own width) · cushion 4 → 4 · fold clean both states
@1920  grid 1162 → 1550 (= the layout's own width) · cushion 4 → 4 · fold clean both states
       click day 14 while collapsed → panel reopened, day 14 selected
       click-away: ground collapses · kind menu + command bar + nav do not
       sub-1080 overlap fix intact: grid ends 913, panel starts 956 — 43px clear
```

Full width is asserted as **equality with the layout's own box**, never "wider than before"; the
overflow checks assert their population first; the nav is probed with a bare `pointerdown`, since a
real click would navigate away mid-test.

> **⚠️ AND THE SCREENSHOT CAUGHT WHAT NO ASSERTION DID — second pack running.** After clicking the
> chevron, the month reflows under a STATIONARY pointer; the cell that slides beneath fires
> `mouseenter` with no movement at all, and 450ms later **a peek bloomed uninvited over the freshly
> widened month**. A peek is "450ms of uninterrupted hover", and hover is something the reader
> *does* — layout arriving under a resting cursor is not it. The guard is a parked-pointer flag set
> by the toggle and dropped on the first genuine `mousemove`; verified both ways (parked → no peek
> at 900ms; a real move → peek as before), and the assertion is folded into the committed
> acceptance.

**Standing gap, restated plainly:** pointer interaction inside `FocusFlow` remains unverifiable in
this harness, so **no completion write was made here and Undo stays unproven end-to-end.**

---

## FLAGS FOR NICK

**1. Deployed —** yes; see the top. The acceptance was re-run against the deployed site after.

**2. What the foot gap actually was.** Not a number — a difference in KIND, which is why three prior
readings all said "parity": the chassis window is 20px from the viewport on every page *by
construction*, and the pages differ one level in. **`/todo` (`.tdw-split`) and `/queries`
(`.f12-body`) each carry a 32px bottom inset in their own page sheets; the Calendar carried none**,
so its furniture ran to 1px of the window's frame — the day panel's card full-bleed, and the legend
row sitting in what is clean paper on every other page. The v5 ref agrees with the siblings: it
draws no legend and gives the layout a 28px ground band. Screenshots before/after side by side in
`reports/calendar-foot/`.

**What was fixed (cushion-neutral):** the legend's 25px of flow redistributed (`margin: 7px 0`) so
it floats 8px clear of the frame; the day panel's card edge stopped on the grid's own bottom line
(26px of ground) — free, because the panel's body is its own scroller. **What was NOT fixed, and is
yours:** the remaining 7px (calendar cards at 854 vs siblings at 847; 26px of ground vs 33). A full
32px band off a `minmax(0,1fr)` grid is **5.3px off every row**, and the cushion at 900 is +4.0 —
`data-fold-short` would appear at 1440×900. Phase 0B forbids spending it, so the last 7px is a
daylight trade: either accept 26 vs 33, or buy it back from cell geometry with your eyes open.

**3. How "outside the calendar" was scoped.** The listener hangs on the **page's own root**, never
`document`. So the nav, the masthead and every portalled surface (peek, overlay, menus, toasts — all
portalled to `document.body`) *cannot* collapse the panel, because the event never reaches the
listener — the "a click that opens a menu is not a click away" rule falls out of the scoping rather
than an exception list. Within the page, the exclusions are the pack's four by `closest()`: grid,
panel, command bar (`.tpl-tools`, which contains the kind menu), chevron. **What the listener cannot
see:** clicks on the shell's own furniture collapse nothing — the pack's stated trade, and it reads
correctly anyway: leaving the page is not clicking away inside it.

**4. The fold on collapse — clean, with the cushion intact.** The ResizeObserver fires on the
grid's width change and the post-render `readMetrics` runs regardless, both pre-existing. Measured:
`data-fold-short` absent in both states at both widths, no populated cell overflows in either
state, and the cushion is **4 → 4** at 1440 and 1920 (13 at 1000, where the control is hidden) —
the collapse changes width, never row height.

**5. Nothing fought the chassis.** The collapse is entirely inside `.cal-layout` — a class on the
page's own grid, hidden-not-unrendered panel, one positioned button. `workspaceShell.css` and
`workspacePageGrid.css` untouched; the foot fix likewise never compensates for a chassis value (the
32px siblings carry is *page* CSS, and the calendar's answer is its own band, not a copied
constant).

**6. Cross-session.** The noteboard session was **live throughout** — `nbRecon.measure.ts` written
mid-run, `TodoNoteboardPage.tsx` carrying up to 7 in-flight `tsc` errors — so every measurement ran
in a detached worktree on port 4272, removed at the end. They committed their finish just before my
deploy: **ride-alongs `26c31f0b` (noteboard P1) and `a02b503f` (noteboard P2)**, plus this pack's
four calendar commits and the previous pack's report. One tool-fault of mine recorded in the Phase 1
commit: a `str.replace` whose needle omitted `ui-monospace` no-opped silently and the "after"
measurement caught the unchanged page — the edit now asserts its needle matched.
