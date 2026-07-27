# One sidebar — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026 · Follows `reports/todo-rebuild.md`.
Ref: `design-refs/scriptally-sidebar-final.html` (copied in).

## Commit + gates

| Phases | SHA | Suite |
|---|---|---|
| 1–3 — merge, collapse contents, New popover | `5ee7fd7` | 1645/1645 |

tsc clean, `vite build` clean, full Vitest green. **Not deployed** — dev runs `de88f10`.

**One commit, not three — a deviation, stated plainly.** The merge *is* the collapse contents:
the two-capsule sidebar had no row grammar to keep, so Phases 1 and 2 could not land as
separate green steps without building the sidebar twice and throwing the first away. The
popover (P3) is a child of the New row, which only exists after the merge. Each phase's work is
described separately in the commit body, and the locks are grouped per phase.

## Phase 0 — the structure found, and the coupling

**Two components, two elements.** `ShellRail` was a `<nav class="sv2-rail sv2-cap">` (always
visible, 70px, ribs + Setup + avatar + the flyouts). `ShellSide` was an `<aside class="sv2-side
sv2-cap">` whose width went to 0 with a negative margin on collapse, wrapping
`ShellSidebarBody` (accordion, manuscript, pills, action strip, upgrade, user).

**The red gate did trip, and here is the coupling.** Collapse itself was safe — it was already a
container-class CSS transition, not a JS measure. The real coupling was *behavioural*:

> **A section had TWO controls — a rail rib and an accordion header — with different click
> policies.** The rib ran `railClickPlan` (browse / navigate / collapse). The header ran
> `onToggleSection` (open / shut the section). In one capsule there is one element, so those two
> policies collide on the same click.

Resolved without redesigning either, per Baked 6: **`railClickPlan` becomes the single home.**
Its expanded-state rules already *are* the accordion's semantics plus the icon-toggle rule —
a different section's row switches the open section, the open section's row collapses the
capsule, a single-destination row navigates. So the merged row keeps every published behaviour
and `onToggleSection` simply has nothing left to do. Auto-collapse, the browse channel, the
truthful highlight and abandon-a-browse are untouched.

**The flyouts generalised — reused, not forked.** `ShellFlyout` is unchanged; only its owner
moved (ShellRail → ShellSide) and its anchor offset went 70px → 62px. Rows receive their hover
hooks through a `ribProps` render-prop, so the capsule owns the hover state while the body owns
the rows.

## Glyph positions are identical across states — confirmed

Structurally, not by pixel: every row renders `<span class="sv2-g">` (48px, `flex: none`) as its
first child in **both** states, and the smoke lock asserts the collapsed and expanded renders
contain the *same number* of glyph cells. Collapse is two CSS rules and nothing else —
`.sv2-collapsed .sv2-l { display: none }` (the label region) and `.sv2-collapsed .drop { display:
none }` (the rows that do not survive). No JS branches on `collapsed` to choose different markup,
and there is no `.sv2-collapsed … .sv2-g` rule at all, so the glyph cell cannot move. The
*visual* stability during the 280ms transition is a browser check.

## ⌘N — NOT registered; deferred, as instructed

There is no shortcut system to hang it on: the only chords in the shell are ⌘K (top-bar search)
and ⌘\ (collapse), each a bespoke `window.addEventListener` in its own component. **⌘N, ⌘L and
⌘R are rendered as hints only** — the popover's rows work by click. Inventing a registry was out
of scope. If you want them live, the honest shape is a small shared `useShortcut(chord, fn)` that
⌘K and ⌘\ also adopt, so there is one place to see what is bound.

## Also reported, not fixed

**With the brand dropped on collapse, the app shows no brand mark at all in its most common
state** — collapsed is the default after every navigation, and only the dashboard's crumb slot
carries the mark (and only *while* collapsed, from the tone/crumb pack). So on every other page,
in the state you are in most of the time, ScriptAlly is unbranded. The cheapest fix would be
extending that dashboard crumb rule to all pages, but that rule is explicitly out of scope here,
so nothing was done.

**A naming split to settle:** the row reads **"Settings"** (the pack's wording), but the nav
config still calls this family **"Setup"** — which is what the breadcrumb and the flyout kicker
show. Two words for one thing. Unifying is a one-line change in `shellV2Nav.ts` plus its locks;
I did not choose for you.

## What was superseded

The task pills (Urgent / House) and the four-tile action strip are gone: Baked 4 excludes the
task-count line, and the strip's four captures *are* the popover's four rows. The Pro row keeps
its slate pill. The panel's centred brand artwork became the brand row's label region (the plane
glyph is its glyph cell), and the tuck control went with the two-capsule frame — ⌘\, the flyout
footer and the open section's row all still collapse.

## Needs a browser check

jsdom cannot verify widths, flex chains or transitions:

1. **The width + colour transition** — 62 ⇄ 280 and `#f1ebe3` ⇄ `#f6f1ea` over 280ms, and
   whether the content capsule's reflow keeps pace or lags.
2. **Glyph stability during it** — the structural guarantee is locked; watch for sub-pixel drift
   or a label flashing before `display: none` takes effect.
3. **Flyout anchoring in the merged element** — hover a collapsed row: the capsule now shares an
   edge with the flyout rather than sitting beside a second container.
4. **Popover placement near the viewport floor** — it opens upward from the New row, which sits
   low; at a short viewport it may collide with the rows above or clip against the capsule's
   `overflow: hidden`.
5. **Short viewport with a section expanded** — brand + three sections + open children + the
   whole bottom cluster is a lot of rows; the capsule does not scroll.
6. **The manuscript popover** at the bottom — it now opens from a row near the capsule's foot.
