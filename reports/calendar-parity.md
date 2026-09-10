# Calendar — historic bars, state colours, ghosting

Measured 10 September 2026 against `7e3cd142`, both pages, 1440×1000, from a clean
worktree serving the dev bundle `index-D3hMdUvL.js` on `127.0.0.1:4713`.

**No code was changed. Phase 1 disproved the brief's mechanism, so Phase 2 has no input,
and the one symptom that is real is a palette decision the brief reserves for Nick.**

---

## False premises, at the top

### 1. There are no `body[data-*]` selectors in this app, and there never were any to lose

The brief's mechanism is that v65's ~60 `data-*` body attributes select the chosen variant of
each treatment, and that Query Centre's body lacks them. Swept over every stylesheet in `src`
with comments stripped:

| sweep | result |
|---|---|
| `body[data-…]` selectors | **0** |
| `.cal-timeline`-scoped selectors | **0** |
| any `body`/`html`-scoped selector | **0** |
| `[data-…]` selectors total | 38 — **every one scoped to the board's own element** (`.tl-board[data-dens]`, `.tl-grp[data-sec]`, `.tl-ccgauge[data-tone]`, `.tl-dseg button[data-on]`) |

Measured on the rendered pages, `document.body` carries **zero attributes on both**. The
variant machinery was flattened when the calendar was built — the chosen arm of each `data-*`
switch was baked into a plain rule. `body[data-past="ghost"] .jc { opacity:.32 }` is in the
tree today as **`.tl-jc { opacity:.32; transition: opacity .15s }`**, unconditional, and its
partner `.tl-jc:hover { opacity: 1; z-index: 12 }` at `todoCalendar.css:2185`.

### 2. Ghosting, state tints and hover all work — on **both** pages, identically

The three reported symptoms are not a Query-Centre-versus-To-do divergence. Measured pairs:

| | To-do | Query Centre |
|---|---|---|
| `.tl-jc` elements | 1 | 1 |
| its computed `opacity` | **0.32** | **0.32** |
| its fill / border | `rgb(255,255,255)` / `1px solid rgb(227,217,203)` | identical |
| its width | 88.9px | 88.3px |
| its label | `Partial Requested · Lasted 13 days` | identical |
| hover: rest → hovered | **0.32 → 1** | **0.32 → 1** |
| bar pieces with `opacity ≠ 1` | 0 of 25 | 0 of 23 |

Band tints, by status, `--st` and the painted `background-color` — the same on both:

| status | rung | `--st` | band |
|---|---|---|---|
| Queried | `out-1` | `#e6eae3` | `rgb(230,234,227)` |
| Partial Sent | `out-2` | `#d7ddd3` | `rgb(215,221,211)` |
| Full Sent | `out-3` | `#c7d0c2` | `rgb(199,208,194)` |
| Partial Requested | `in-1` | `#f8e9e2` | `rgb(248,233,226)` |
| Full Requested | `in-2` | `#f1dbd0` | `rgb(241,219,208)` |
| Revise & Resubmit | `in-3` | `#e8c9bb` | `rgb(232,201,187)` |
| Offer | `offer` | `#d7e0e8` | `rgb(215,224,232)` |

The two pages differ only where their **data** differs: To-do shows 2 `tl-sband--task` bands
(tasks, which Query Centre has none of), Query Centre shows 1 `tl-st-offer` its window happens
to contain. Piece class tallies match combination for combination.

### 3. The mapping is not inverted

The brief asks whether `pk-them` renders a sent query sage and a requested one pink, or the
reverse. **Neither**: `pk-them`, `dk-*` and v65's `--st`-by-class do not exist in this app.
The board maps status → rung through **`stageFor`** (`queryCardFacts`), one function, unit-locked:
sends go to the `out-*` (sage) family and requests to `in-*` (pink) in the right order. Sent is
sage, requested is pink, and nothing is swapped.

**Queried does render sage, and that part of the report is correct** — because the board's ladder
has no sand rung at all. See Phase 3.

---

## Phase 1 — the ancestor sweep

Every rule in `src/**/*.css` that styles a `.tl-*` element **and** names a page-owned ancestor
before it (`.tpl-`, `.t-f12`, `.qcc-`, `.cal-`, `.f12-`, `.tl-cal`, `.qc-wpg`, …):

| selector | file | styles | matches in QC? |
|---|---|---|---|
| `.t-f12 .tl-gracebar .tl-sweep` | `f12.css` | a white sweep gradient | **irrelevant — nothing renders `.tl-gracebar` or `.tl-sweep` anywhere in `src`.** A rule with no subject |
| `.tpl-zone.tl-zone` | `todoCalendar.css` | a compound on one element, To-do's zone | n/a — not an ancestor scope |

**That is the whole list. No board rule fails to match in Query Centre.**

### The one real ancestor-scoped difference: `--panel`

All 102 custom properties the board reads, resolved on `.tl-board` on both pages:

- **101 identical.**
- **12 empty on both** (`--lane`, `--lanes`, `--st`, `--w`, `--l` are set inline per element; `--frame-sh`, `--tl-detail`, `--tl-flag-lift`, `--tl-gbar`, `--cc-fill`, `--gico`, `--gtint` are read behind fallbacks).
- **1 differs — `--panel`: To-do `#fffdfb`, Query Centre `#fff`.**

The chain, and it is the `--tl-nearblack` shape exactly:

```
index.css:1018   .t-f12            { --panel: #fffdfb }   ← both pages sit under this
f12.css:1973     .t-f12.qc-neutral { --panel: var(--n0) } ← 0-2-0, ONLY Query Centre carries it
todoCalendar.css:510               { --tl-panel: var(--panel, #fffdfb) }
```

So the board's section surface is `#fffdfb` on To-do and `#fff` in Query Centre — a two-point
difference, invisible in practice, and the only measured instance of the predicted fault.

**Not fixed, deliberately.** `.qc-neutral` is that page's own decision to neutralise its tint;
overriding it from the board would be me deciding that the board outranks a page-level token
override nobody asked me to touch. One line either way — the board declaring its own
`--tl-panel: #fffdfb`, or `.qc-neutral` exempting the board — and it is Nick's call which.

⚠️ **A stale comment goes with it.** `todoCalendar.css:508` says *"`.t-f12` — which this page's
root carries — declares `--panel: #fffdfb`"*. True and now incomplete: `.t-f12.qc-neutral`
overrides it, which is the whole reason the two pages differ.

### Two duplicate base rules, found in passing

`.tl-cal` and `.tl-jc` each have **two base rules**. Neither pair sets the same property twice,
so nothing is being discarded today — but this is the shape CLAUDE.md records as reading-order
versus cascade-order, and a lock that slices on first match would read the wrong block.

`.tl-cal` is also the one class To-do's board carries that Query Centre's does not
(`tl-cal tl-board` against `tl-board qcc-calboard`). It declares **no custom properties** —
layout, a background and a border colour — and Query Centre supplies its own through
`.qcc-calboard`. It scopes nothing.

---

## Phase 3 — the state palette, as a table

The board's ladder against the five locked flat states (`design-refs/query-state-colours-v2.md`):

| status | board rung | board value | locked state | locked value | agree? |
|---|---|---|---|---|---|
| **Queried** | `out-1` | `#e6eae3` sage | `--state-queried` sand | `#f7efe3` | **no — different family** |
| Partial Sent | `out-2` | `#d7ddd3` | `--state-agent` sage | `#e0e5dd` | family yes, value no |
| Full Sent | `out-3` | `#c7d0c2` | `--state-agent` sage | `#e0e5dd` | family yes, value no |
| Partial Requested | `in-1` | `#f8e9e2` | `--state-you` pink | `#f5e6df` | family yes, value no |
| Full Requested | `in-2` | `#f1dbd0` | `--state-you` pink | `#f5e6df` | family yes, value no |
| Revise & Resubmit | `in-3` | `#e8c9bb` | `--state-you` pink | `#f5e6df` | family yes, value no — **and `#e8c9bb` is the locked pink ACCENT** |
| Offer | `offer` | `#d7e0e8` | `--state-offer` slate | `#d7e0e8` | **exact** |
| Rejected · Withdrawn · No Response | `closed` | `#e4e1db` | `--state-closed` grey | `#e4e1db` | **exact** |

Three facts worth having before deciding:

1. **The board is a ramp; the palette is flat.** The board gives each direction three deepening
   rungs so a reader can see how far a relationship has travelled without reading the words. The
   locked palette gives one fill per state. Collapsing the ramp onto the five tokens would make
   Queried, Partial Sent and Full Sent the same colour — the board would stop showing progression.
2. **The two ends already agree exactly.** Offer and closed are the same hex in both systems, so
   the ladder was built from this palette and diverges only across the middle.
3. **Queried is the only cross-family disagreement**, and it is the one the reader reported.
   Sand exists in the locked palette precisely to say *"sent, nothing back yet"* without using
   the colour that means *"they have your pages"*. On the board that distinction is carried by
   rung depth instead.

The surfaces that would take a token, if any: the `.tl-sband` band, the `--st` custom property
the piece reads, and the ghost band. **Which of those, and whether the ramp survives, is the
decision — not an inference — so nothing has been changed.**

---

## What was not done, and why

- **Phase 2 (one scope carried by the board)** — the sweep found nothing to carry. No rule
  fails to match in Query Centre, and the single token that differs is `--panel`, above.
- **Phase 3 colour changes** — the brief reserves these for Nick, and the table is the deliverable.
- **Phase 4 proofs** — To-do byte-identity, lock counts and side-by-side screenshots all prove a
  change. There is no change.

## Open, for Nick

1. **Queried: sand or sage?** The only cross-family disagreement, and the reported symptom.
2. **Does the board's three-rung ramp survive** a move onto the five flat tokens, or is the
   progression worth keeping and the palette the thing that gains rungs?
3. **`--panel` in Query Centre** — board-declares-its-own, or `.qc-neutral` exempts the board?
4. Two dead rules to sweep whenever the CSS pass runs: `.t-f12 .tl-gracebar .tl-sweep` has no
   renderer at all, and `todoCalendar.css:508`'s comment is stale.
