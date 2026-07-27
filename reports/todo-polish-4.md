# To-do Workbench — Polish IV: one grid, one left line · the vertical Today tab · footer rows

Run-through against HEAD `e5ba139` (III P4). Both Downloads files present and read before building;
copied + fenced as `design-refs/todo-grid-v1.html` (grid contract + vtab + footer rows normative;
its masthead fenced as the superseded title-over-sidebar variant; the dashed glines noted as
annotations) and `design-refs/todo-masthead-b-v1.html` (variant B normative; A fenced).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the grid contract | `d6c93cc` | 1276 green |
| P2 — vertical tab · footer rows · trims | `<this commit>` | 1280 green |

Gates (`npx tsc --noEmit` + `npm run build` + full `npx vitest run`, `set -o pipefail`) green
before each commit. Explicit-path staging throughout.

## P1 — the grid contract, as shipped

Tokens on `.tdb-wrap` (with the contract spelled out in the vocabulary comment, absorbing II·B's):

```
--container: 1494px   /* 24 + 270 (sidebar) + 24 + 1128 (content) + 24 */
--sbw: 270px          /* the sidebar column (was 264) */
--railw: 264px        /* the Today rail (unchanged width, now a token) */
--g24 / --g12         /* the II·B rhythm, unchanged */
```

- **One container, both bands.** `.tdb-mastcol` and `.tdb-ws` are now the same rule-for-rule
  container: `max-width: var(--container)`, auto-centred, `padding: 0 var(--g24)`,
  `gap: var(--g24)`. The masthead row holds the sidebar's zone empty with
  `.tdb-mastspacer { width: var(--sbw) }` (variant B), so the title starts at content-left =
  container-left + 270 + 24 — the same axis the lanes sit on. The fixed 294px above the sidebar
  falls out of the container centring as a whole.
- **The caps retired:** `.tdb-col`'s 1150 and `.tdb-ws`'s 1720 are gone. The main column is
  `flex: 1; min-width: 0` anchored 24 off the sidebar — never independently centred. No reserved
  slack for the rail: when it expands it takes `--railw + 24` from the main column, and the reels
  recompute via the existing ResizeObserver on each track (no new wiring needed — the RO rides
  the track, so any width change refits).
- **Masthead innards (variant B):** date above title, title one line at **25px** (was 26),
  post-its inline beside at **56×68** (tape 20×9, numeral 20, kicker 5.5 — both refs draw this
  size, superseding III's 66×80), search **fixed 280** at container-right, mast padding 26 0.

## P2 — the vertical tab, footer rows, trims

- **The vertical Today tab** (`.tdb-ttab`, per the ref's `.vtab`): 42px wide, column run —
  chevron ‹, 22px white ☑ roundel, then "Today's list" in `writing-mode: vertical-rl` Playfair —
  rounded-left sage edge fixed at the viewport's right, at the rail's former top (236px). Click
  anywhere expands the **full empty rail** (`emptyRailOpen`); the horizontal hover-unfurl is
  retired (no `max-width` transition remains). Focusable with a proper label +
  `aria-expanded={false}`; **Esc** from the expanded empty rail returns to the tab (editables
  keep their own Esc). A real commitment closes `emptyRailOpen` so the committed rail owns the
  slot — and clearing the last item later returns the **tab**, never a stuck-open rail.
- **Sidebar footer rows** (`.tdb-footrows` / `.tdb-fr2`, per the ref's `.footrows`/`.fr2`): the
  inline ⚙/? foot became two full-width rows — 28px white hairline icon roundel (`.tdb-fric`) +
  12.5px label, hover wash, 10px radius, hairline above the group. Same two behaviours: Task
  settings opens the sheet; ? Help opens the same menu (Help centre / Replay the tour), still
  anchored inside the foot.
- **The Focus button** dropped its count: `▶ Begin` (the folded rail's ▶ keeps its descriptive
  aria-label — that's the icon rail, not the card).

## In-browser checklist (dev)

1. The title sits exactly above the sidebar's content edge — title, banner and lane heads share
   one left line.
2. One identical 24 at masthead↔content and sidebar↔content on every width from 1280 to 2560
   (past 1494 the whole container centres; the margin above the sidebar stays a fixed 294).
3. Expanding the Today rail narrows the content column only — reels refit, nothing else jumps.
4. The vertical tab reads top-to-bottom at the right edge; click opens the full rail; Esc
   returns to the tab; committing an item then clearing it returns the tab.
5. The two footer rows (⚙ Task settings / ? Help) with roundels and hover wash.

## Deviations & notes

- **Post-its 56×68** (from III's 66×80): the pack's masthead scope enumerates layout only, but
  *both* refs draw 56×68 independently — adopted as intended; one-line revert if not.
- **Computed-style alignment test:** jsdom renders no layout, so the pack's "computed-style
  assertion: title x = content-left = lane x" is realised structurally (both bands share one
  container rule-for-rule; the spacer *is* the sidebar's width token + the shared gap — alignment
  holds by construction, noted in the test). The browser eyeball confirms the actual x.
- **Hover wash `#f4eee5`** kept as the ref hex — no live token sits between paper and oat.
- **Tab top 236px** kept (the rail's former top under the app's real chrome; the ref's 150 is
  relative to its own slim frame).
- The reduced-motion `transition: none` rule for the tab retired with the unfurl transition it
  guarded (the vertical tab has no motion to suppress).
