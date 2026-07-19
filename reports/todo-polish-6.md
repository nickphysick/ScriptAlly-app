# To-do Workbench — Polish VI: "Today" always on · the review above it · play buttons · help returns

Run-through against HEAD `a32e0eb` (Polish IV P2). Both required Downloads files verified before
building: `todo-review-above-today.html` → `design-refs/todo-right-column-v1.html` (fenced;
normative for everything in the pack) and `review-cup.svg` → `src/assets/todo/review-cup.svg`
(original artwork, currentColor).

## The Polish V situation (supersession notice resolved)

**Polish V had NOT run** — and `todo-polish-5-prompt.md` was never supplied, so its Phase 1 (named
"the left-pinned full-bleed grid") was **reconstructed** from the VI pack's token guidance
(`--tdb-today: 264px` constant, no `--tdb-today-closed`, `--tdb-gutter`/`--tdb-appnav` consumed by
P4) plus the normative ref's drawn rows (`.row { padding: 0 24px; gap: 24px }`, no max-width, no
centring) — committed as its own phase for auditability. Its Phase 2 (closed-drawer/peeking-tab)
was **skipped** as superseded; VI Phase 1 additionally removed what IV had built of that idea
(the vertical tab, `emptyRailOpen`, the Esc wiring). Nothing called `sa.todoRail` ever existed.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| V P1 (reconstructed) — left-pinned full-bleed grid | `2c3a316` | 1280 |
| VI P1 — "Today", always on | `9cbf075` | 1284 |
| VI P2 — the review's afterlife above Today | `c6abe1e` | 1288 |
| VI P3 — play buttons + help returns | `ad65817` | 1291 |
| VI P4 — the column scroll contract | `e89ea6e` | 1294 |
| report + themes.md | `<this commit>` | 1294 |

Gates (`npx tsc --noEmit` + `npm run build` + full `npx vitest run`, `set -o pipefail`) green
before each commit; explicit-path staging throughout.

## What shipped

**V P1 (reconstructed).** IV's centred 1494 container retired: every band is a full-bleed flex
row (24 gutter + 24 gap) — the sidebar pins hard left, the main column grows, nothing centres.
Tokens on `.tdb-wrap`: `--tdb-gutter` (rides `--g24`) · `--tdb-appnav: 49px` (CrumbStrip 48 + 1px
rule) · `--tdb-sidebar: 270px` · `--tdb-today: 264px` — a constant; no collapsed state, no
reserved slack, and the reel-recompute-on-rail-toggle wiring is moot (the ResizeObserver on each
track still handles viewport resizes). The masthead gained a right spacer (`--tdb-today`) so the
search aligns to the main column's edge, hidden below 1200.

**VI P1 — "Today", always on.** The right column mounts unconditionally ≥1200px (the narrow break
moved from 1500 → 1200; below it the masthead chip + popover stand, renamed). The vertical tab,
`emptyRailOpen` state and Esc wiring are extinct. The panel is the ref card: plain paper header —
Playfair **"Today"** + right slot (date `SUN 19 JUL` when empty ⇄ `{n} OF 5` once anything is
committed) — committed rows above the **dashed ghost invitation**, the collapsed-by-default
**`✓ {n} DONE TODAY ▸`** row (expands in place, session-only), and footer verbs: empty =
"Help me pick" + ink **"＋ Add"** (scrolls to the board — commitment happens on cards; the ref
draws no behaviour, this is the reported call); filled = "＋ Add more" + ink "Work the list".
All existing behaviours unchanged, same unions. **Ghost rule** (the two ref frames reconciled):
empty = 3; filling = `5 − committed − done` clamped [1..3]; gone at five committed —
`todayGhosts` in todoWalk, matrix-locked. **Rename sweep:** "Today's list" is extinct across the
board, sheets, tour and libs — chip ("Today · N TO GO"), filter pill ("✓ ON TODAY ONLY"), card
CTA ("＋ TODAY" / "✓ ON TODAY"), bulk button, flashes, receipts, arias, comments; grep-locked in
both letter cases.

**VI P2.** The thin sage bar retired (markup, styles, logic) — the main column ends with the
lanes. `reviewSurface`'s second kind renamed `"bar"` → `"card"` (windows byte-identical): a cup
card at the top of the right column, directly above Today — cardx family, one ~60px row, 38px
white roundel holding `review-cup.svg` (ink via currentColor, inlined `?raw`), Playfair "Last
week in review" over mono `WEEK {n} · NOT YET OPENED`, chevron. Whole card opens the review mode
unchanged; absent → Today rises with no gap. The card also rides above the panel inside the
narrow popover (one helper, two mounts — the same parity law as the panel itself; the surface
would otherwise vanish entirely below 1200 on Tue–Sat, which the pack doesn't address — reported
call).

**VI P3.** The "Focus on {lane}" pill retired in both views; a 32px white play circle
(1px `rgba(58,28,20,.16)`, soft shadow, currentColor triangle, hover 1.06) leads each lane title
— `title` + `aria-label` keep the full "Focus on {lane}" wording, behaviour identical. The lane
dot went with it (the ref head; the tinted band carries identity) and the reel pagers ride the
head's right edge. Help left the sidebar: the foot keeps Task settings only, the folded rail
dropped its ?, and the AppShell FAB's /todo hide is reversed — restored verbatim from the
pre-workbench code (`21fea7b`): the FAB shows on /todo opening the two-item menu (Help centre /
Replay the tour, `sa:todo-replay-tour` dispatch untouched), navigates directly elsewhere. No
duplicate help entry survives (grep-locked). **Tour: no retargets needed** — no stop ever
pointed at the sidebar help row or the lane pill (stops: post-its, urgent lane, the card's
＋ TODAY pill, `.tdb-today2`/chip, the Focus card); copy already says "Today lives beside your
work".

**VI P4.** One shared rule for both flanking columns: `position: sticky; top: var(--tdb-gutter);
max-height: calc(100vh − var(--tdb-appnav) − gutter×2); flex column`. Fixed heads/feet, one
scrolling middle each — Today's `.tdb-tmid2` (verbs never scroll away; the review card fixed
above, outside the scroller) and the filter card's new `.tdb-fmid` pill region (Focus card + foot
fixed). Scrollbars thin, hairline-coloured, hover/focus-visible, `scrollbar-gutter: stable`.

## In-browser checklist (dev)

1. Today's dashed ghosts sitting on bare parchment (no fill), date in the header.
2. Commit one item — the box shrinks; at five committed it's gone; header reads "5 OF 5".
3. Done today collapsed by default to "✓ n DONE TODAY ▸"; expands in place, footer stays put.
4. Dismiss the Sunday banner — the cup card appears above Today; complete the review — it
   vanishes and Today rises with no gap. The lanes end the main column (no bar beneath).
5. Play buttons starting each lane (both views), pagers at the head's right edge.
6. The floating ? back bottom-right on /todo, opening Help centre / Replay the tour; ⚙ Task
   settings alone in the sidebar foot; no other help entry anywhere.
7. Both columns pinned at ~900px height; the filter card's pills scroll on a short viewport;
   Today doesn't scroll with five committed + the review card present.
8. Below 1200: the masthead chip + popover (review card riding above the panel inside it).

## Deviations & notes

- **The V prompt file was absent** — its P1 is a reconstruction (grid geometry from the normative
  ref + the VI token guidance); flagged above.
- **"＋ Add" (empty-state primary)** scrolls to the Urgent lane — the ref draws no behaviour and
  commitment happens on cards; one-line rewire if a different doorway is wanted.
- **The ghost formula** `clamp(5 − committed − done, 1, 3)` is the one rule fitting both drawn
  frames (empty = 3; 2 committed + 1 done = 2); ghost-bar widths cycle the ref's 64/78/52.
- **The review card narrow (<1200)** rides inside the Today popover — without it the afterlife
  would be unreachable narrow on Tue–Sat; same helper, same two-mount parity as the panel.
- **Scrollbar "visible on scroll"**: realised as hover/focus-visible (`scrollbar-color` swap) —
  scroll-triggered visibility needs JS listeners; hover + focus-within covers the interaction.
- **jsdom limits**: the 700/900/1200-height sticky checks and the no-scroll-at-900 assertion are
  realised as rule-text + arithmetic locks (the budget comment in the contract block); the
  browser walk confirms the rendered behaviour.
- **The lane-head key-hint tooltip** ("— D done · S snooze · → skip") is gone with the pill; the
  pack fixes the tooltip to the full wording only. The keys themselves still work in the flow.
- themes.md gained the RIGHT COLUMN section (plain-paper Today header — sage now lives only in
  the done row/ticks/pill/ritual; the neutral cup card; the play button; the V token family).
