# Chrome tokens & refinements — run report

**Branch:** `claude-il` · **Date:** 30 Jul 2026 · Refs: `design-refs/scriptally-chrome-refinements.html`
(the chosen effects) and `design-refs/scriptally-chrome-editor.html` (where the tokens came from).
Effects 2 (inner top highlight) and 3 (gradient wash) rejected — not built.

## Commits + gates

Every commit passed `tsc --noEmit`, `vite build` and the full Vitest suite.

| Phase | SHA | Suite |
|---|---|---|
| 1 — tokens | `820d382` | 1782 |
| 2 — shadow and dividers | `e0dba2d` | 1783 |
| 3 — rail motion | `58cad77` | **1790** |

**Phase boundary, stated:** the layered shadow landed in Phase 1 with its token. Splitting a
token's *definition* from its *value* across two commits would be worse than the boundary; Phase
2 carries the dividers and the shadow's consumption lock.

## Where `#9e9e9e` came from — nowhere else

**It is neither a shared token nor a default, and it reached nothing.** `#9e9e9e` appears
**nowhere in `src/`** and **nowhere in the editor mockup**, whose own default for that slot is
`--cap-bc: #dfd4c6` — already warm. The mockup's export template is
`${S.capBw}px solid ${S.capBc}`, so the grey came from the picker's position in that one export
session. Nothing else in the app is affected, and there is nothing to hunt down.

The capsule edge is `#d8ccbc` as baked, and a lock asserts `#9e9e9e` never appears as a value in
either file (comments stripped, since the correction note names it deliberately).

## Token mapping — one name per role, not a parallel set

The exported names (`--shell-rail-bg`, `--shell-cap-bg`, …) largely duplicate roles the existing
`--shell-*` set already owns. Introducing both would recreate exactly the drift the
sidebar-refinements pack closed, so the **values** landed on the **existing** tokens:

| Exported | Landed as | Change |
|---|---|---|
| `--shell-ground` | `--shell-ground` | unchanged `#e7e0d5` |
| `--shell-gap` | `--shell-cap-gap` | **14 → 10px** |
| `--shell-radius` | `--shell-cap-radius` | **20 → 18px** |
| `--shell-rail-bg` | `--shell-rail` | already `#f1ebe3` |
| `--shell-rail-icon` | **new** `--shell-rail-icon` | was a literal in `shellV2.css` |
| `--shell-rail-on-bg/-fg` | `--shell-ground` / `--burg` | already those values |
| `--shell-bar-bg` | **new** `--shell-bar-bg` | top bar **`#fdfbf8` → `#f1ebe3`** |
| `--shell-bar-border` | `--shell-line-soft` | already `#ece3da` |
| `--shell-bar-fg/-strong/-field` | `--shell-muted` / `--shell-ink` / `--shell-inset` | already those values |
| `--shell-cap-bg` | `--shell-canvas` | already `#fdfbf8` |
| `--shell-cap-border` | **new** `--shell-cap-border` | capsules had **no** border before |

So three genuinely new tokens, two geometry changes, one surface change, and the rest already
correct. `--shell-rail-border: none` needed nothing — the rail never had one.

## The indicator is route-driven

Its position is `SHELL_RAIL.findIndex(r => r.key === activeKey)`, and `activeKey` is
`shellSectionKeyForPath(pathname)` — **the same derivation the ribs light from**. So back and
forward move it exactly as a click does; no click handler writes its position, and the red gate
never tripped because the rail's active state was already route-derived before this pack.

**Silence on mount** is a `.ready` class added one `requestAnimationFrame` after the first paint.
The bare `.sv2-railpill` carries no transition at all, so the first paint places it; only then
does movement become animatable. Locked both ways.

## The `TypeGlyph` stroke override — the component was never in the path

**The rail does not use `TypeGlyph`.** It draws lucide icons via `RAIL_ICONS`, and lucide renders
a plain `<svg stroke-width>` that a parent rule overrides freely:

```css
.sv2-rib svg    { stroke-width: 1.8; transition: stroke-width .16s; }
.sv2-rib.on svg { stroke-width: 2.4; }
```

No component modified, no prop added, and the locked component is not involved. A lock asserts
`ShellV2.tsx` contains no reference to `TypeGlyph` at all.

## Fading dividers — and the honest scope finding

**The rail has no dividers.** It is a column of ribs with a flex spacer; nothing is drawn between
them. The nearest hairline that is genuinely *rail* chrome is its **flyout's footer rule**, which
sits on the rail's own surface — that is where the fade went. A border cannot fade, so it is a
1px gradient block drawn by `::before`, off the new `--shell-divider` token.

**Candidates reported, not changed:**

| Hairline | Where | Note |
|---|---|---|
| Panel partition above the user block | `.sv2-usr` `border-top` | the pack's named candidate; the most obvious next |
| Top bar base | `.sv2-topbar` `border-bottom` | now that the bar has a permanent fill, a fade here may read better or may muddy the bar/plane seam — worth judging with the new fill in front of you |
| `PageHeader`'s closing rule | `.svh-rule` | page chrome rather than shell chrome; a different family, and it spans the full content column |

## Needs a browser check

jsdom cannot verify shadows, transforms or transitions:

1. **No slide on first paint** — hard-reload on each route; the pill must appear in place.
2. **Back/forward tracking** — navigate, then use the browser buttons; the pill should follow.
3. **The layered shadow against the ground**, now with a `1px #d8ccbc` edge and a 10px gutter —
   four stops plus a border is a lot of edge definition; check it reads as depth, not outline.
4. **Press not fighting the indicator** — hold a rib while the pill is mid-travel.
5. **Reduced motion** — the pill jumps, the press does nothing.
6. **The bar's new fill** — `#f1ebe3` against the `#fdfbf8` plane below it is a visible step where
   there was none; check the seam, and whether the crumb and search still sit comfortably on it.
7. **The tighter geometry** — 10px gutters and 18px radius are both smaller; the capsules will sit
   closer together and read slightly crisper.
