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

## ⚠️ THE SECOND CORRECTION — I was building against an interim ref

Nick attached `scriptally-workspace-final (4).html`. The file I had been treating as final was
**(2)**, and the two differ on exactly the points I had been recording as "superseded":

| | (2), what I built | (4), the real one |
|---|---|---|
| panel | 186px | **214px** |
| manuscript pill | 38px, glyph + title | **56px, 30×40 cover slot + title over `Genre · N words`** |
| nav offset | 20px | **30px** |
| To-do | its own group of four | **one row under Workspace** |

So §5 of the polish pack was right in every particular, and I had written each of its points off as
belonging to a replaced design. **The lesson is not "read the ref" — I did — it is that a ref
handed over in conversation needs its version confirmed before anything is called superseded.**
Three separate decisions were justified against the wrong document.

The pill is left-aligned now, and the cover slot is why: an earlier build centred the title because
nothing anchored the left edge. `TODO(cover-upload)` is planted on the slot, which renders
`object-fit: cover` art today and falls back to the parchment book glyph.

**To-do folds to one row, and it costs less than I argued.** Today is linked from the board and
Noteboard from Today; those are page-level views of one place, not peers in the IA. All four routes
remain real and individually reachable in ⌘K — asserted, so the two facts cannot drift.
**`/todo/calendar` is the exception: it has no in-page link.** That is a real gap, and it is
recorded here rather than papered over by leaving a nav row standing to cover for it.
- ~~**§7's Greige tint**~~ — **REINSTATED.** The off-white came from an instruction given against
  the interim ref; with `(4)` in hand Nick asked where the greige had gone. The bar is
  `rgba(232,227,221,.93)` / `#e8e3dd` again, and the help hover flips back to white-up. **The rule
  under it never changed and is what to keep: the hover lifts AWAY from its ground.** On off-white,
  white was invisible so it went parchment; on greige, parchment is the one that disappears. Move
  the tint and the hover moves with it, in the same commit.

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

## The typeface — the invisible half of "not faithfully recreated"

⚠️ **EVERY TYPE SIZE IN THE PANEL AND BAR ALREADY MATCHED THE REF, and the sidebar still read as
smaller.** Compared mechanically, ref against ours: `.ni` 13.5px, `.glabel` 9px, `.crow2` 12.5px,
the account name 13.5, plan 11.5, Upgrade 11, pill title 12.5, meta 10.5, crumb 13, `+ New` 12.5,
whisper 9.5, tile 17, search 12 — **fifteen values, all identical.**

The difference was the **typeface**: the shell inherited Source Sans Pro, whose x-height is markedly
shorter than Inter's, so the same number renders visibly smaller. Bumping the size would have made
the numbers disagree with the ref in order to make the picture agree with it.

Inter is now set on `.ws-rail, .ws-panel, .ws-bar, .ws-fly, .sp-card` — **scoped to the chrome, not
on `.ws-app`**, because the app's body font is Source Sans Pro and every page inherits it. That
scoping is the difference between restyling the shell and restyling the product.

## Browser-verify list (refreshed)

Measured this pass at 1440×900 on the render harness:

- ✅ pill / crumb centres coincide at 48.0 — **measured against the built CSS**
- ✅ the nav **no longer scrolls** at 900px — folding To-do to one row removed the overflow that had
  put Discover and Materials below the fold
- ✅ panel 214px · pill 56px · cover slot 30×40 · meta line "Thriller · 50,000 words"
- ✅ the bar's right cluster all present and fitting at 1440: crumb 283 + cluster 481 in a 1146px
  bar, search exactly 210px, help 32, `+ New` 78. **They looked missing in a screenshot** — the
  pane's viewport was narrower than the width the harness forced, so the right end was cropped.
  Measure before believing a screenshot that shows something absent.
- ✅ every icon key the new nav asks for exists in `WORKSPACE_ICONS` (four ribs, seven row keys).
  `todo`, `sun`, `calendar` and `note` are now unused but left in place — a missing icon there is a
  runtime crash, a spare one costs nothing.
- ✅ nothing overflows at 214px — all rows (labels, nav items, count, collapse row, account
  block, pill) have `scrollWidth === clientWidth`, longest label "Submission packages"

Still needing eyes on the real signed-in app:

- the palette dropdown's clipping and z-order **over the frosted bar** (the maths is unit-tested;
  the stacking is not)
- the alignment at other viewport heights, and with the panel collapsed
- the four elements §7 asks to legibility-check against the tint (logotype, crumb segments, current
  page, ink `+ New`) — unchanged and untested this pass, since the tint they sit on is Nick's
  off-white rather than the pack's Greige

**Not deployed**, per the pack.
