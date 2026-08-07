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


---

# Polish pass — the re-issue with assets (7 Aug)

The pack was re-issued with three genuinely new things: an **assets** section, a full **visual
spec for the palette dropdown** (§2), and a **two-state cover slot** (§5). Six of its eight items
were already satisfied by the earlier passes; this run built the new parts and verified the rest.

## The assets — halted, then landed the same session

They were not in the repo, `~/Downloads` or `~/Desktop` on the first search; **nothing was
substituted** and both items were halted and reported. Nick then named the location — `~/Desktop/
ScriptAlly/Refreshed Designs/Icons`, with **spaces** in the filenames rather than the underscores
the pack used — and both were wired in the same commit.

| Asset | For | Landed as |
|---|---|---|
| `Manuscript Icon.png` | cover-slot placeholder (§5) | `src/assets/shell/manuscript-icon.png` |
| `Search Icon.png` | palette search row (§2) | `src/assets/shell/search-icon.png` |
| ScriptAlly logotype | breadcrumb brand mark (§6) | already mounted (`public/scriptally-title-v2.png`) |

Both verified 100×100 with alpha, as specified. They live in `src/assets/shell/` so Vite hashes and
bundles them (the convention `src/assets/todo/focus-art.png` already set), not `public/`.

⚠️ **A third file sat beside them — `Settings Icon.png` — and was deliberately NOT taken.** The
pack rejects an illustrated Settings outright: nav items stay monoline. A lock now asserts no
`settings-icon` asset appears in the shell, so a future pass cannot quietly adopt it.

**Both states are now live and measured** (browser, against the built CSS): the slot is 30×40, the
illustrated mark inside it is **30×30 `object-fit:contain` and unframed** — background
`rgba(0,0,0,0)`, border `0px`, shadow `none`. The framed branch is reserved for a real cover, which
is what makes a frame mean *this is the book* rather than *this is a box*.

`Manuscript.coverUrl` is a **forward declaration only** — nothing writes it. ⚠️ **TODO(cover-upload):
the manuscript-update allowlist in `firestore.rules` needs that key BEFORE any write is wired**, or
the write is silently denied (the affectedKeys gotcha).

## The style rule, recorded

Written into `workspaceShell.css` at the icon boundary, where it governs:

> **ILLUSTRATED** marks are for **objects and surfaces** (the manuscript, the search).
> **MONOLINE** stroke icons are for **navigation, state and controls** — every rail rib, nav row,
> chevron, collapse arrow. **Settings stays monoline in both rail and panel**, standard nav-row
> size and weight, left-aligned, no border; an illustrated Settings was explored and **rejected**.
> Do not extend the illustrated set to nav items: the moment a control is illustrated it reads as
> a *thing* rather than an *action*, and the two families stop meaning anything.

## What this pass actually changed

**§2 · the palette's presentation.** Its position maths already portalled and clamped correctly
from the earlier pass; the constants moved to the re-issue's figures — `PALETTE_MAX_W` 560 → **580**,
`PALETTE_GAP` 8 → **10**, `PALETTE_MAX_LIST` 340 → **400** (edge clamp already 12). Presentation:

- the search row and the footer take their own `#fdfcfa` ground, distinct from the list's white
- **ONE chip style, three places** — the ESC chip, a result's shortcut and the footer's hint keys
  now share a single selector (`9.5px`, `#f2ede7`, `--shell-edge`, radius 5). They are the same
  object saying the same kind of thing; three near-identical chips is how they drift apart. The
  old standalone `.sp-kb` block is gone, and the lock asserts its absence
- result rows 44px on a 9px radius; titles `w600` ink; group labels mono 9px at `.17em`
- the footer's key reads `ESC`, matching the search row's chip

**§5 · the cover slot** — the two states above. Panel width (214), pill (56/radius 10), the head-zone
alignment and the 30px nav offset were already correct from the final-ref build and were verified,
not rebuilt.

**Already satisfied, verified not rebuilt:** §1 ink `+ New`, §3 collapse row, §4 toggle grammar,
§6 account block, §7 greige tint and its four contrast adjustments.

## Judgement calls

- **The palette's per-kind icon tints stay.** §2 describes "a 30px parchment icon tile with
  burgundy 15px glyph", which is exactly what an *Action* row looks like. The palette's own
  committed ref (`design-refs/scriptally-search-palette.html`) defines five tints — act/agent/
  query/page/manuscript — and the glyph is already 15px. Flattening them to one colour would
  delete the only thing distinguishing a kind at a glance in a mixed result list, so the tints
  were kept and this is recorded rather than resolved silently.
- **The input is 14.5px on desktop and 16px below md.** iOS Safari zooms the page when a focused
  input is under 16px — on the one device that cannot recover from it, that throws the palette off
  screen. The pass's 14.5px is the desktop figure; the phone keeps the size that behaves. Locked
  with the reason.

## Superseded, recorded

Soft-pink `+ New` · the head's `«` ghost button · the old name/plan text rows · `--shell-panelw`
232px · the palette's viewport-anchored top-left panel · the palette's separate `.sp-kb` chip.

## Browser-verify list (refreshed)

Not testable in this repo (node env, no jsdom, no layout engine):

1. **The palette's clipping and z-order over the frosted bar** — open ⌘K and confirm it draws
   above the greige bar and is not clipped by the card; then at a narrow window confirm the left
   clamp holds and the list scrolls internally rather than running off the bottom.
2. **Reposition on scroll and resize** while the palette is open.
3. **214px truncation review** — longest realistic section label + count, the account name, and
   the manuscript title/meta, all without wrapping or a clipped ellipsis.
4. **The seam** — the pill's centre against the breadcrumb's (measured 48.0/48.0 against the built
   CSS in the previous pass; re-eyeball after the cover-slot change).
5. **The cover slot's framed interim** — that it still reads as a book cover at 30×40.
