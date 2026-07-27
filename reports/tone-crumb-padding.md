# Capsule tone · dashboard crumb · edge padding — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026 · Follows `reports/rail-icon-toggle.md`.
Ref: `design-refs/scriptally-capsule-tone.html` (copied in, Phase 1), scheme **D · Stepped trio**.

## Commits + gates

Every commit passed `tsc --noEmit`, `vite build` and the full Vitest suite (`set -o pipefail`).

| Phase | SHA | Suite |
|---|---|---|
| 1 — stepped capsule surfaces | `0941536` | 1632/1632 |
| 2 — dashboard crumb | `ef7b5b0` | 1635/1635 |
| 3 — equal ground gutter | `fb07b85` | 1638/1638 |

**Not deployed** — dev runs `b99bbd9` (the rail-icon-toggle build).
Scheme D's hexes were read out of the mockup and match the pack's table exactly.

## Phase 1 — every token consumer repointed

There was never a literally-shared capsule token: four role-named tokens all held `#fdfbf8`
and were *lock-tested equal*. Retiring the shared surface therefore meant breaking that
equality lock and removing the one true alias.

| Token | Was | Now | Consumers repointed |
|---|---|---|---|
| `--shell-rail` | `#fdfbf8` | **`#f1ebe3`** | `.sv2-rail` |
| `--shell-side` | `#fdfbf8` | **`#f8f4ee`** | `.sv2-side` |
| `--shell-canvas` | `#fdfbf8` | `#fdfbf8` | `.sv2-plane`, `.sv2-fly`, the stage paint in `AppShell.tsx`, **and now `.sv2-topbar`** |
| `--shell-topbar` | `#fdfbf8` | **RETIRED** | its sole consumer `.sv2-topbar` now reads `--shell-canvas` — the bar *is* the content capsule |
| `--shell-inset` | `#f2ede7` | **`#efe8df`** | `NavSearch.tsx` (×1) + `shellV2.css` (×9) — all shell chrome, no leak |
| `--shell-panel` | `#f2ede7` | `#f2ede7` | **deliberately unmoved — see the red gate** |

JS twins in `designTokens.ts` moved in step (`shellTopbar` deleted); `shellV2Tokens.test.ts`
locks both homes and the new law.

### The red gate — `--shell-panel` did not move

The pack's gate: *"the interior fill token is shared with anything outside the shell —
recolouring would leak into content; report instead."* It fires, but only for one of the two
tokens in the old fill family:

- **`--shell-inset` is shell-only** — `NavSearch` (top-bar search) and `shellV2.css`. Moved to
  `#efe8df` as specified.
- **`--shell-panel` is NOT** — its consumers are `.tdb-mainc` (the To-do board container) and
  `--dc-panel-bg` (the dashboard diary carousel). Both are **in-page content sitting on the
  content capsule**, which did not change. Their step is therefore untouched, and the reason to
  move the fill (a `#f8f4ee` panel swallowing it) does not apply to them. Moving it would have
  darkened two page surfaces for no reason, so it stayed, and the two tokens are no longer
  described as one folded family. Lock-tested: `shellPanel !== shellInset`.

### The two contrast risks — measured, and one more found

Relative luminance deltas (the same measure the depth lock uses):

| Pair | Before | After | Change |
|---|---|---|---|
| Rail **active** (ground on rail) | 0.104 | **0.043** | −58% |
| Rail **hover** (fill on rail) | 0.053 | **0.011** | **−79%** |
| Rail vs ground | 0.104 | **0.043** | −58% |
| Panel active (ground on panel) | 0.104 | 0.077 | −26% |
| Panel hover (fill on panel) | 0.053 | 0.045 | −15% |

**1 · Rail active state — weakened, but I did not touch the nav law.** The active step against
the rail is now less than half what it was. My reading: it should still hold, because the
active rib is not carried by tone alone — it also flips the icon to burgundy, and colour is
doing the heavier lifting. Recommendation if it reads weak in the browser: lighten the rail one
notch to `#f4efe8` (a value already in the mockup's palette) — that restores the active step at
the cost of a shallower rail↔panel difference, and it is a one-token change that leaves the nav
law ("active = ground") intact. I'd take that over redefining the law.

**2 · Rail vs ground — the one to judge first.** At 0.043 the rail is close to the ground; the
14px gutter and `0 10px 30px rgba(58,28,20,.09)` shadow have to carry the capsule read. If it
merges, the same `#f4efe8` fix applies and helps both risks at once.

**3 · Not in the pack, found while measuring: the rail's HOVER fill is now nearly invisible**
(0.011 — the biggest proportional loss of the three). Hovering a rib may read as nothing at all.
Recommendation: on the rail only, invert the direction — hover to the **panel** tone `#f8f4ee`
so hover *lifts* off the deep rail while active still *insets* to the ground. That keeps one
law per state (hover = a lighter step, active = ground) and needs no new token.

## Phase 2 — the dashboard crumb

Collapsed → the panel's own artwork (`ScriptAllyLogo`, `/scriptally-title-v2.png`,
`alt="ScriptAlly"`) at 22px for the 58px bar, aspect preserved. Expanded → **"Your dashboard"**
in the existing crumb treatment. Other pages: untouched in both states.

Branched at the **render**, not in `shellV2Nav`: the crumb model's dashboard page label is the
same string the accordion row uses, so renaming it in the model would have renamed the nav item
too. `shellCrumbForPath` is therefore unchanged and nothing else keying off it moved — the only
new wiring is `collapsed` passed from `AppShell` into `ShellTopBar`.

## Phase 3 — the ground gutter: cause and fix

**Diagnosed as checklist item 2**, and the specific offender is the **pull tab**, not the drawer.

Working the list in order:

1. **Content capsule overflowing its track — eliminated.** `.sv2-app` is a flex row whose
   children are the rail (`flex:none`, 70px), the panel (`flex:none`, 288px, `min-width:0`) and
   the plane (`flex:1 1 0`, `min-width:0`). No child can exceed the content box, so nothing can
   paint over the padding.
2. **Viewport-anchored chrome — THE CAUSE.** The dashboard timeline drawer and its pull tab are
   `position: fixed`, inherited from the pre-capsule era when the shell was full-bleed.
   `.sa-tltab` sat at **`right: 0`** — flush to the browser edge, covering the ground gutter
   every other surface respects (its `border-right: none` and `12px 0 0 12px` radius are
   literally drawn to tuck against a screen edge).
3. **Window-level scrollbar — eliminated.** The app root is exactly `100vh` with
   `overflow: hidden`, and everything rendered after it (focus forms, toasts) is fixed. Verified
   in the browser: no horizontal document overflow.
4. **Asymmetric padding further down — eliminated.** The only asymmetric value is the drawer's
   own `stage.style.paddingRight = "309px"` clearance, which clears itself on close, route
   leave and unmount.

**The fix, at the cause, with no compensating padding.** The insets now measure from the
**content capsule** via `--shell-cap-gap`: the tab moves to `right: var(--shell-cap-gap)` at
≥768px, so it tucks against the capsule's right edge and the gutter survives. Fixed positioning
had to stay — an `absolute` child would anchor to the stage, which *is* the scroll container,
and the drawer would scroll away with the page.

The drawer itself was **already landing correctly** (its bare `14px` happened to equal the gap,
so its right edge coincided with the capsule's), so it did not move a pixel — but its insets are
tokenised in the same commit, turning a coincidence into an intention that survives any future
change to the gap. Below 768px the capsule stands down and the tab keeps its flush-to-edge idiom.

Locked in `shellV2Tokens.test.ts`: the tab's capsule inset, the drawer's tokenised insets and
closed-park transform, and — the one that guards the instruction itself — that `.sv2-app` still
carries a single symmetric `padding: var(--shell-cap-gap)` with **no** `padding-right` override.

## Needs a browser check

jsdom cannot measure layout, and the shell is auth-gated, so every spatial and tonal result
below is asserted structurally only:

1. **The two contrast risks above**, plus the third (rail hover) — judge the rail first, since
   `#f4efe8` would answer all three at once.
2. **The gutter across the four conditions the pack names** — narrow and wide viewports, panel
   expanded and collapsed, on the dashboard (long-scrolling, and the only page with the drawer)
   and the Queries Hub (internally scrolling pane). Specifically on the dashboard: with the
   drawer **closed**, the tab should now stop 14px short of the browser edge; with it **open**,
   nothing should have moved.
3. **The dashboard crumb swap** — the mark at 22px against the 58px bar, and whether "Your
   dashboard" wants to be bold-current or muted like a section segment.
4. **The stepped trio as a whole** — whether depth genuinely reads as receding leftward, or
   whether the rail simply looks dirty next to the panel.
5. **The drawer overlapping the top bar** — pre-existing, not touched here: the drawer spans the
   capsule's full height including the 58px bar. Worth a decision now that it is capsule-aware.
