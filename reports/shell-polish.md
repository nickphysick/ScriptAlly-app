# Shell polish pass — the re-run

**6 August 2026.** The pack was re-issued after it had already been executed. This run is therefore
a **verification pass with one real repair**, not a rebuild: seven of its eight items were already
satisfied, two of them by decisions that deliberately supersede the pack's own numbers.

Nothing was rebuilt to match a spec it had already outgrown. Where the pack and the current design
disagree, the disagreement is recorded below rather than resolved silently in either direction.

## What was already done, and where

| § | Item | State |
|---|---|---|
| 1 | `+ New` goes ink | **Done** (`41b08ea`) — `.ws-nbtn` fills `--shell-ink`, border ink, text `--shell-rail-hi` |
| 2 | Palette becomes an anchored dropdown | **Done** (`41b08ea`) — portalled, `palettePosition()` clamps at **both** edges and guards a negative list cap, 10 unit tests |
| 3 | Collapse control becomes a nav-foot row | **Done** (`41b08ea`), position corrected in `79838e2` |
| 4 | Toggle grammar (active rail icon collapses) | **Done** (`41b08ea`) — `railClick()` |
| 5 | Panel narrows; pill centres | **Partly superseded, and the alignment was genuinely broken — see below** |
| 6 | Account block | **Done** (`41b08ea`) — two lines, Upgrade pill stops propagation |
| 7 | Header tint: Greige | **Superseded by Nick** — see below |
| 8 | Verify and report | This file |

## The one real repair — §5's alignment

**The pill and the breadcrumb did not sit on the same line, and the pack was right about why.** The
panel starts at the viewport's top edge; the bar does not — it lives inside the card, which begins
`--shell-frame` (14px) plus its 1px border below the top. A head zone of plain `var(--head)` centres
the pill at **33** while the crumb centres at **48**.

**The final ref is wrong here, and says so out loud.** Its comment reads *"head zone matches the
bar's 66px so the pill centres against the breadcrumb"* — but the ref carries the same
`.main{padding:var(--frame)}` inset, so it misaligns by the same 15px. This is CLAUDE.md's
mockup-wins carve-out: a reasoned value in prose beats an unreasoned one in an artefact.

The pack specifies both a `height` calc and a `padding-top`. **That instruction was correct and I
overrode it** — see the correction immediately below, which is the more important half of this
report.

## ⚠️ THE CORRECTION — the first fix was wrong, and every measurement behind it was real

**It shipped to dev, Nick saw it unchanged, and the numbers that justified it were taken from a
page the app never serves.**

The harness inlined `index.css` plus the shell stylesheets. That omits **Tailwind's preflight**, so
every box in it was `content-box` — while every box in the app is `border-box`. The same CSS
therefore measures differently in the two places, and the pack's original instruction (add the
frame to `height` **and** `padding-top`) was right all along for the app's box model.

| | harness (content-box) | app (border-box, built CSS) |
|---|---|---|
| before | pill 33.0 · bar 48.0 | pill 33.0 · bar 48.0 |
| height + padding *(the pack's shape)* | 56.0 — "overshoot" | **48.0 — correct** |
| padding only *(what I shipped)* | 48.0 — "aligned" | **41.0 — 7px out** |

**Shipped now:** `box-sizing: border-box` declared **on the rule**, height `calc(--head + frame +
1px)`, padding-top `calc(frame + 1px)`. Verified against `dist/assets/index-*.css`: pill 48.0, bar
48.0. The box model is declared rather than inherited precisely because the whole calculation turns
on it.

**The lock previously asserted the opposite and was green**, which is the part that matters: a
tripwire written from a bad harness is a tripwire pointed at the wrong thing. It now fails on both
wrong shapes — padding-only, and box-sizing left to the ambient reset — each verified by
reintroducing it.

**Rule, now in CLAUDE.md: a render harness loads the BUILT css, never a hand-picked list.**

⚠️ **AND THE MEASUREMENT ITSELF HAD A TRAP.** `getBoundingClientRect` returned **zeros for every
element** in the browser pane — `document.documentElement.clientHeight` is `0` there, so `100vh`
collapses and rects are meaningless. `offsetTop`/`offsetHeight` are layout-relative and work fine.
Two further conditions: the harness must pin explicit pixel dimensions rather than `100vh`, and a
screenshot must be taken first to force layout, or the first JS call still reads zeros.

**Locked** in `workspaceShell.test.tsx` against both wrong shapes — padding-only, and `box-sizing`
left to the ambient reset — each verified by reintroducing it and watching the lock fail.

## Superseded, deliberately

- **§5's 214px panel, 56px pill and 30×40 cover slot.** The final ref Nick attached sets the panel
  to **186px** and draws the pill at **38px** — a book glyph, a title and a chevron. The cover slot
  cannot exist in a 38px pill, so this is not a detail that can be part-taken: **the pack's §5
  geometry belongs to a design the final ref replaced.** The pill was corrected 40 → 38 for ref
  fidelity. `TODO(cover-upload)` is **not** planted, because planting it would imply a slot that the
  current design has nowhere to put. **Live decision for Nick:** covers are a real product intent,
  and taking them means widening the panel again.
- **§5's "navigation begins 30px below the head zone".** Kept at the ref's 20px. The offset moves
  the whole head zone down, so the gap under the pill is unchanged either way (33px); taking 30
  while rejecting the 56px pill and 214px width would be cherry-picking one number out of a
  geometry that was replaced whole.
- **§7's Greige tint and white-up help hover.** **Nick's instruction after that pass — "keep the
  breadcrumb header just slightly off-white" — supersedes it.** The bar is
  `rgba(251,249,245,.92)` / `#fbf9f5`, and the help hover stays parchment because lifting toward
  white is invisible on an off-white bar. **This pass did not revert it**; re-applying Greige now
  would undo an explicit instruction with a canned spec.

## Two guards repaired in passing

- **The dangling-token guard read prose as CSS.** A comment quoting the ref's own
  `.main{padding:var(--frame)}` was reported as a dangling token. Comments are now stripped before
  the `var()` scan — *definitions* are still collected from raw text on purpose, so a token defined
  only inside a comment still doesn't count. Verified it still fires on a real dangling token.
  This is the same trap already documented one file over, where an absence guard caught its own
  warning: **a rule about the stylesheet must be asserted against the stylesheet's rules.**
- **`pageStructure.test.ts` was timing out on `Queries.tsx`** — ~7.6s idle, ~9.3s with a dev server
  running, against the 5s default. Confirmed pre-existing by running it in an isolated worktree at
  HEAD, so not caused by this pass; it had passed earlier the same day on the same commit. Given
  30s, with the reason recorded: **a guard that flips with machine load is a guard people learn to
  ignore**, and this one exists to catch a crash that ships silently.

## Browser-verify list (refreshed)

Measured this pass at 1440×900 on the render harness:

- ✅ pill / crumb centres coincide at 48.0 — **measured against the built CSS**
- ⚠️ at a **900px-tall** window the panel's nav scrolls: 550px of content in 454px, so Discover and
  the whole Materials group sit below the fold. The ref behaves the same way (`.nav{overflow:auto}`)
  and nothing is unreachable, so this is reported rather than "fixed" — but it is worth a decision
  on a small laptop.
- ✅ nothing overflows at 186px — all 19 rows (labels, nav items, count, collapse row, account
  block, pill) have `scrollWidth === clientWidth`, longest label "Submission packages"

Still needing eyes on the real signed-in app:

- the palette dropdown's clipping and z-order **over the frosted bar** (the maths is unit-tested;
  the stacking is not)
- the alignment at other viewport heights, and with the panel collapsed
- the four elements §7 asks to legibility-check against the tint (logotype, crumb segments, current
  page, ink `+ New`) — unchanged and untested this pass, since the tint they sit on is Nick's
  off-white rather than the pack's Greige

**Not deployed**, per the pack.
