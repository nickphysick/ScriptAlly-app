# Phase 2 — frame measurements (no change made)

Playwright against the local dev server, signed in, probes scoped to the visible page.
`devicePixelRatio` = **1** at all three viewports; every number below is **CSS pixels** from
`getBoundingClientRect` (rounded).

## 1. The three widths

| viewport | list card | task pane (`.tdk-w`) | pane inner grid |
|---|---|---|---|
| 1440×900 | 518 (`.tdg`; its column is 520) | **350** | 286 |
| 1680×1050 | 518 | 590 | 526 |
| 1920×1080 | 518 | 830 | 766 |

## 2. The ancestor chain (1440), each with its constraining declaration

| width | element | what constrains it |
|---|---|---|
| 1440 | body / shell root | viewport |
| 1216 | `ws-main` | `padding: 22px` each side (shell) |
| 1172 | `ws-window` | shell capsule |
| 1170 | **`wpg-scroll`** | **`padding: 80px/80px`** — the page gutters, −160 |
| 980 | `tpl-cols` → `tpl-body` → `tdb-centre` | flex column (≈30px lost to the tasks page's own chrome) |
| 980 | **`.tdw-split`** | **`grid-template-columns: 520px minmax(0,1fr)` + `padding: 22px/22px`** |
| 398 | `tdw-work` → `.tdk` | the resolved `1fr` track (936 − 520 − 18 gap) |
| 398→350 | `.tdk` → `.tdk-w` | `.tdk` `padding: 0 24px` |
| 350→336→286 | rim → inner | card pad 6+6, borders, scroll pad 24/24 |

## 3. Where the column split is declared

**`src/components/todo/todoSplit.css:47`** — `grid-template-columns: var(--tdw-rail-w) minmax(0, 1fr);`
with `--tdw-rail-w: 520px` (line 44). One file, one line.

## 4. Is the list fixed, flexible, or growing?

**Fixed at 520px** at every viewport (518 measured = 520 − borders). The *pane* is the flexible
track — the design's relationship inverted: the directory holds its width and the work surface
takes the leftovers.

## 5. devicePixelRatio, and the wide-pane screenshot

DPR = **1** in the harness; all numbers are CSS px; the committed PNGs are 1440×900 files where the
pane measures ~350 image px. **A screenshot showing the pane far wider than 350 is a 2× capture**:
a Retina macOS grab of this page is 2880px wide and shows the pane at ~700 device px. It is not a
container growing — the pane is `minmax(0,1fr)` and its rendered width is 350 at 1440, 830 at 1920,
exactly tracking the viewport, which growing-against-a-cap would not.

## 6. The arithmetic this run has to live inside (found, not assumed)

Fixed costs at 1440: sidebar+shell 270 · page gutters 160 (`wpg-scroll`, shell-wide law — left) ·
tasks chrome ≈30 · split padding 44 · gap 18 · pane chrome 64 (dock 48 + card 14 + rim 2).

- **`pane ≥ 900` at 1440 is impossible**: 270+160+30+44+372+18+900 = 1794 > 1440. Even with every
  gutter zeroed, 372+18+900+64 = 1354 + sidebar 224 = 1578 > 1440.
- **Side-by-side with form ≥ 420 + timeline 300 at 1440 is impossible**: needs pane grid ≥ 736 →
  pane ≥ 800 → 1440 budget exceeded by ≈150 with zero page gutters.
- After the Phase 3 rebalance (list 372): pane = **498** at 1440 (grid 436), **738** at 1680
  (grid 674), **978** at 1920 (grid 914).
- With the codebase's own form floor — 330, the dock's historic `minmax(330px, 400px)` doing-column
  — side-by-side needs grid ≥ 646 → container ≥ ~700: **stacked at 1440, side-by-side from ≈1660**.

## 7. The 390 finding (from the RED baseline, not this table)

The split never stacks: at 390 the `1fr` track collapses and the journey measured **form 0px wide,
timeline 34px** — the grid-collapse fault, live on mobile today. The brief's "stacks beneath, as
now" assumed a breakpoint that does not exist.
