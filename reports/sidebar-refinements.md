# Sidebar refinements — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026 · Follows `reports/sidebar-revert.md`.
Ref: `design-refs/scriptally-sidebar-refined.html` (copied in).

## Commit + gates

| SHA | Suite |
|---|---|
| `e6b4402` — `shell: larger raised brand mark, aligned rail rows, panel group headings` | **1651/1651** |

tsc clean · `vite build` clean. **Not deployed** — dev runs the revert (`ed152b8`).
Suite 1643 → 1651: eight new locks for the shared rhythm.

## Phase 0 — the revert had landed, and the drift was real

Two capsules confirmed (`ShellRail` exported and mounted), tree clean at `ed152b8`.

**Where the geometry lived: nowhere shared — exactly the drift the pack anticipated.** Every
value was a literal, duplicated across two files' worth of intent:

| | Rail | Panel |
|---|---|---|
| Top padding | `.sv2-rail { padding: 20px 0 }` | `.sv2-side-inner { padding: 24px 18px 18px }` |
| Head block | `.sv2-mark { 24px + margin-bottom: 24px }` | `.sv2-wmrow { margin: 0 0 26px }` |
| Row pitch | `.sv2-rib { 42px + margin-bottom: 8px }` = 50 | `.sv2-asec { padding: 13px 14px }` — no fixed height at all |

So the two were never aligned, and nothing would have told anyone when they drifted further.

**The red gate did NOT trip.** The panel's rows were *content-derived* (padding around a 14px
line) rather than fixed, which is the one thing that could have blocked a shared pitch — but
giving `.sv2-asec` a height and zeroing its vertical padding is a change of values, not of
structure. No component was restructured. Worth knowing for next time: **panel nav rows are now
fixed-height**, so a longer label wraps rather than growing the row.

**Token home:** `:root` in `src/index.css`, beside the existing `--shell-*` set — the pack's
fallback, and the right one; that block is already the shell's single source and is lock-tested
against its JS twins. The three geometry values are **CSS-only** (nothing in JS reads them), so
no twins were added — adding twins nothing consumes would create the very drift surface the
pack is trying to close.

## What now reads the tokens

| Token | Read by |
|---|---|
| `--shell-pad-t` `14px` | `.sv2-rail` padding **and** `.sv2-side-inner` padding |
| `--shell-head-h` `56px` | the new `.sv2-railhead` block **and** `.sv2-wmrow` |
| `--shell-row-h` `44px` | `.sv2-asec` height **and** `.sv2-rib`'s `margin-bottom: calc(var(--shell-row-h) - 40px)` |
| `--shell-kid-h` `37px` | `.sv2-akid` — the panel alone |
| `--shell-quiet` `#b3a598` | `.sv2-slab` (both headings) |

The rail's pitch is **derived**, not restated: a 40px rib plus `calc(row − 40)`. Change
`--shell-row-h` and both capsules move together, which is the whole point. A lock asserts no
literal `56px`/`44px`/`14px` twin survives in either component, and that `#b3a598` appears only
on the token.

The rail gained one element — `<div className="sv2-railhead">` around the existing `Mark` — so
its glyph could sit in a real 56px block instead of faking one with a margin. That is the only
markup change on the rail.

## The rail does not respond to accordion state — confirmed

Locked two ways: no CSS rule pairs `.sv2-rail` with an open/`akids` state, and `ShellRail`'s
source never branches on `openSection` (it receives the value solely to hand to `railClickPlan`).
No spacers, no sympathetic animation. When a section expands the panel rows shift and the rail
stays put, as baked.

## The brand asset — no larger file needed

`/scriptally-title-v2.png` is **2400 × 750**. Rendered at 27px height that is a ~28× downscale,
so there is no pixelation risk at this size or any plausible future one. It is height-constrained
with `width: auto`, aspect preserved, unrestyled — the `ScriptAllyLogo` component is unchanged
apart from the number. The rail's plane glyph is an inline SVG, so it scales freely; it went
24px → 27px to match.

Note the panel mark's box went 30px → **27px** — a slight *reduction* in box height. The pack
asks for ~27px **cap height**, up from ~20px: the previous 30px box contained a wordmark whose
letters occupied roughly two-thirds of it. If it still reads small in the browser, the fix is the
number in one place (`ShellV2.tsx`), not the component.

## Needs a browser check

jsdom cannot measure heights, paddings or alignment — everything below is asserted structurally
only:

1. **Alignment with the accordion closed** — the four rail ribs against Dashboard / Querying /
   Agents / Shelf. This is the whole point of the pack; if it is off, the cause is now a single
   token rather than a hunt.
2. **The two brand marks reading as one line** across the capsule gap at the new 56px block.
3. **Brand mark crispness and weight at 27px** — and whether it reads as *larger* than before,
   given the box shrank while the cap height grew.
4. **Heading legibility at `#b3a598`** — deliberately a step lighter than `--shell-muted`
   (`#9c8878`); confirm they group rather than disappear, especially against the panel's
   `#f8f4ee`.
5. **Fixed-height nav rows** — a long section label now clips rather than wraps. All four current
   labels are short, so this is a check against future ones.
6. **The expanded state**, which is explicitly allowed to misalign: confirm the shift reads as
   intentional rather than broken.
