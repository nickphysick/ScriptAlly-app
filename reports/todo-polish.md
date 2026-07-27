# To-do — the polish pack (containers · the press buttons · the reactive rail)

Run against HEAD `7546eae` (the v4 refinement report). Both refs verified current on first
check and committed with P1: `todo-fix5-press.html` (22 Jul) → `design-refs/todo-polish.html`,
`todo-pro-final.html` (22 Jul) → `design-refs/todo-pro-banner.html`. P0's recon folded into the
phase work; no drift from v4 found.

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — hero 64px + the "Search" placeholder | `ce708da` | 1296 |
| P2 — THE STATIONERY PRESS (the button law) | `8d23e5a` | 1299 |
| P3 — the centre stack: three sibling containers | `e9cf569` | 1300 |
| P4 — the reactive rail | `d828a68` | 1305 |
| P5 — sweep · tour retarget · inert disabled | `af5992d` | 1307 |
| report | `<this commit>` | 1307 |

Gates green per commit (`tsc` + build + full Vitest, pipefail); explicit-path staging.

## What shipped

- **P1** — the title steps up to **64px/-0.015em**; the search placeholder is the plain word
  **"Search"** (the instructional sentence retired); hero padding 40, the search row 22 above /
  6 below.
- **P2** — **the press**: `.tdb-cta` = true primaries only — paper fill, 1px ink border, 99px,
  `2px 2px 0` ink shadow; hover slides 1,1 (shadow 1px), active 2,2 (shadow gone); fixed heights
  **40 / 34 (`.sm`)**, `line-height:1`, no vertical padding (the structural fix for the clipped
  Today pair). `.tdb-ctaghost` = flat paper hairline secondaries, no press. Applied: Begin
  focused session, Work the list, ＋ Add (press) · ＋ Add more, Help me pick (ghost). The view
  segment's selected face = the half-pressed chip (`1px 1px 0`). Reduced motion: shadow steps
  only. Card verbs untouched (not in the pack's assignment list).
- **P3** — **the centre stack**: `.tdb-centre` (812, column, gap 16) now owns the width token +
  the 220ms Today transition; inside it three sibling lifted containers — **the review card**
  (`.tdb-rvbox`: white, radius 16, lifted; cup 46; kicker/title/sub unchanged; "Open it ›" as
  the press small ⇄ "View again" as the ghost; 28px ✕ = **session-only hide, zero writes**),
  **the sheet** (unchanged internally, minus the docband + banner), and **the Pro colleague**
  (`todo-pro-banner.html`: 60px nameplate ✎ + ✦ spark, "Hand over the housekeeping",
  live `{hk} of {total}` numbers, the quoted line; slate "Meet the assistant →" opens the
  unchanged preview modal, "What's in Pro" → /plans; same `!isProUser` gate). The letterhead +
  its demo mini-ledger are extinct.
- **P4** — **the reactive rail**: while a search runs every pill re-counts through the SAME
  shared `filterCounts` over the search-narrowed sets (groups narrow whole via
  `groupMatchesSearch`, exactly as the sheet keeps them — a pill's count always matches what
  picking it would show). Changed counts render the old total struck (`.tdb-was`) beside the
  live figure; zero-match pills dim in place (the existing 40%), never hide or reorder. SHOW
  ALL shows the match total (the `shownX` composition: cards + `hkGapCount` gaps); the lens
  re-counts committed matches. The FILTER header grows the removable query chip (pink tag law,
  quoted uppercased term, ✕ clears the search). Composition holds both ways; clearing restores
  the plain counts. The drawer (<1428) shares `renderFilterPanel`, so it reacts identically.
- **P5** — fourteen repo-dead selectors deleted (each verified unused across src with no
  dynamic construction first); the tour's review stop retargeted `.tdb-docband` → `.tdb-rvbox`;
  the press's disabled state folded into **the inert grammar** (the P2 `opacity: 0.5` slip
  contradicted the standing page law — corrected); help FAB + Today popover breakpoints
  verified untouched.

## In-browser checklist (dev)

1. The 64px title over the plain "Search" pill, centred on the bare ground.
2. Any press button stepping under the cursor: hover slides 1px (shadow shrinks), press slides
   2px (shadow gone) — Begin, Work the list, ＋ Add; ＋ Add more / Help me pick sit level as
   quiet ghosts beside them.
3. The three containers bracketing the sheet: review card on top (cup, "Open it ›"), the sheet,
   the colleague below — all 812, 16 apart; the review ✕ hides it until the next visit (it
   returns after reload); after finishing the review the button reads "View again" as a ghost.
4. Typing "marsh": every rail count re-derives (struck old → live new), zero-match pills dim
   but stay put, SHOW ALL shows the match total, and the FILTER header grows the "MARSH" ✕
   chip — clicking it (or clearing the pill) restores the plain counts. Same behaviour in the
   ⚲ FILTER drawer below 1428.
5. "Meet the assistant →" opening the unchanged preview modal; "What's in Pro" landing on
   /plans; no price anywhere.
6. Toggling Today on/off: the stack (all three containers) width-steps with the 220ms slide.
7. The tour end to end — stop 4 now spotlights the review card.
8. A disabled Begin (empty board): paper/hairline/faint, not dimmed live-looking.

## Deviations

- **Press heights 40/34** override the ref's drawn 42/38 (pack beats ref — fenced in
  `design-refs/todo-polish.html`).
- **The review ✕** = session-only hide (component state): no stored dismissal exists and the
  pack introduces none — the fence records the resolution.
- **"View again" renders as the ghost**, not the press: the press law's "true primaries only"
  clause applied to the completed state (the pack names the press for "Open it ›"; the opened
  flip keeps v2's quieting).
- **The lens pill re-counts too** (searchFc.today) — the pack lists the seven pills + SHOW ALL;
  a static lens beside re-counting neighbours would read as a stale figure.
- **P5 went one step past the pack's sweep list**: the press's disabled state moved off
  `opacity: 0.5` onto the inert grammar — the page's own standing law ("NEVER opacity-only")
  outranked my P2 shorthand.
- jsdom limits as ever: the press feel, the stack's slide, the struck-count face and the chip
  are source/rule-text locks — the browser walk confirms the pixels.

## Close

**The redesign is complete; nothing queues before dev deploy and the prod sequencing pass.**
