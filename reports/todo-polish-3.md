# Workbench Polish III (definitive) — review banner · reels return · soft tags · the pinned pair · the tucked Today tab

Pack: `todo-polish-3` definitive (the earlier unrun version discarded unactioned). Refs:
`todo-sidebar-pair-v1.html` (the whole left sidebar) · `todo-banner-tab-v1.html` (§1 banner + §3
tab only; §2 fenced) · `todo-board-refine-v1.html` (reel, 66×80 post-its, thin bar, Today states;
its banner/filters/dim elements fenced) · `focus-art.png` → `src/assets/todo/focus-art.png`.
Ran against `17a6668`, tree clean; all four Downloads files verified at start. Gates per phase.

## PHASE 1 — the review banner + afterlife (the Sunday card retires)

- **The review is NOT a task** — `assembleBoard` no longer mints the weekly_review card, so the
  Urgent post-it, lane counts, filter counts and the Focus sublabel are review-free BY
  CONSTRUCTION (locked with an assembleBoard-on-a-Sunday test + the tiles identity; every
  special-case `taskType !== "weekly_review"` filter fell out of the page as dead).
- **THE WINDOW MATRIX as shipped** (`reviewSurface`, pure — the card + scrap retire into it):
  | state | result |
  |---|---|
  | Sun–Mon ∧ undismissed ∧ unreviewed | **banner** |
  | Sun–Mon ∧ dismissed | **bar** |
  | Tue–Sat ∧ unreviewed | **bar** (dismissed or not) |
  | sunday_review muted | banner suppressed → **bar** (the offer stands, as the scrap did) |
  | reviewed (completion sentinel) | **neither** |
  | nothing queried / next week | null / a fresh banner |
- **The banner** (5ways §1, copy verbatim — no stat preview): white lifted card (`--hairline`
  realises the ref's #eee7de; the ref's shadow literal), sage ☕ roundel, kicker, 22px Playfair
  "Last week's progress report is ready", the italic dial line, ink "Begin the review →", quiet ✕.
  Sits above WHICHEVER view is active. The ✕ = the card's old write verbatim (weekly_review flag,
  3-day snooze) with Undo — it gates the banner only.
- **The afterlife bar** (refine ref): the thin sage bar beneath the last lane — "☕ Last week in
  review — week {n} · OPEN ▸". Both doorways call the unchanged `openSundayReview`.
- **The masthead scrap retires** (JSX + CSS + the reviewScrap derivation — folded into
  reviewSurface; `reviewEntryCard`/`reviewEntryLine` deleted as unconsumed).
- Tests: the matrix (incl. mute-as-standing-dismissal + supersession), the by-construction
  counts lock, both doorways, the ✕ write + Undo, the verbatim copy; the card/scrap-era locks
  across four suites rewritten.

## PHASE 2 — reels return + the soft tag law

- **THE REEL-FIT SHAPE (halt (c), as reported):** a FRESH ~12-line pure module
  (`src/components/todo/reelFit.ts`) — `reelFit(trackWidth, gap 12, min 240, cap 5)` =
  `floor((w+gap)/(min+gap))` clamped 1..5, width `(w − gap(n−1))/n` — plus `reelPage` (one click
  = n cards + gaps). NOT the retired module resurrected: no exports of its constants, no fade
  machinery; the RETIRED file stays deleted. **The rail participates for free** — the Lane's
  ResizeObserver watches the TRACK, whose width changes whenever the rail mounts/unmounts or the
  sidebar folds, so the fit recomputes on rail state change without any explicit wiring.
- The card view is one row per lane again: exact-fit cards (`--reelw`), scroll-snap, hidden
  scrollbar, ‹ › chevron pagers in the lane head (4px-threshold disabled states), reduced-motion
  honoured. The wrapping grid retired from card view (the ledger's 9-col `lgrid` stands).
- **THE SOFT TAG LAW (third and final):** every tag, both views, including ★ OFFER and urgency —
  white fill, 1px faint-ink border, ink text. OFFER keeps ★ + 700; urgency keeps 700. The ink
  fill, the 1.5px frame AND the ledger's coffee batch tint all retired. themes.md updated.
- **Deviation (flagged):** the lane-head pill rename ("▶ Focus on {label}") landed with this
  phase's Lane rewrite rather than P4 — the same line was in hand; one edit instead of two.
  P4 completes the naming sweep (ledger heads, tour, FocusFlow name-only strings).
- Tests: reelFit at three widths × rail states (width IS the rail's participation) + floor/cap +
  page distance; the tag law rewritten (v3 — soft offer, soft warn, no variants, the tinted-fill
  sweep); the reel-era source locks. Snap behaviour flagged for the in-browser list (jsdom).

## PHASE 3 — the pinned pair (the sidebar, definitive)

- **The pair** (pair ref, exact): two same-width floating cards riding ONE sticky stack at the
  `--g24` offset, 12px apart; the fold collapses the whole pair to the 64px icon rail
  (`sa.todoDrawer` persists). Internal scroll stays as the safety net only.
- **Card 1 — FOCUS MODE** (Walk me through's successor): split layout — Playfair 18 "Focus mode",
  the no-distractions sub, ink "▶ Begin · {n}" (n = `tiles.urgent`, the walk's own derivation);
  `focus-art.png` right at max-height 118 with the illustration-law drop-shadow (absent asset =
  a quieter card — the slot renders nothing); hover lift. Opens the existing guided walk
  unchanged. `walkSublabel`/`walkAria` retired as unconsumed (their strings died with the name).
- **Card 2 — the filter card:** top row = the Cards/Ledger toggle (MOVED from the masthead) + the
  fold « · the status line **"Showing {x} of {y} · RESET"** — x = the visible tally
  (vDo + hkGapCount(vGroups) + vStale + vNt), y = the board totals (tiles) — the SAME derivations
  the board consumes, never parallel counts; RESET clears filters AND search, hidden at x=y ·
  **the pill cloud**: URGENT · n / HOUSEKEEPING · n / SHOW mono headers over real `aria-pressed`
  toggle buttons in family colours with counts inside ("★ OFFERS · 1"), filled=on / outline=off /
  half-opacity at zero · the sage "✓ TODAY'S LIST ONLY" pill · the ⚙/? foot unchanged.
- **Retired:** "YOUR DESK", the New note button (the Notes lane's inline ＋ survives in cards AND
  the ledger — its Notes group head GAINED one), the letterpress checkbox rows, the masthead
  toggle. The ledger's section-head naming ("▶ Focus on {label}") landed here with the head edit.
- Tests: the pair geometry/pin/fold, the Focus card (art law, count source, handler), toggle
  relocation (masthead slice clean), status-line sources + RESET visibility, pill semantics +
  zero state + a11y, the retired-species sweep, the both-views inline ＋.

## PHASE 4 — the tucked Today tab · masthead · the naming pass

- **THE TWO-STATE TODAY ACCOUNT (halt (d) clear):** one state, two faces — commitments exist →
  the full 264px rail (behaviours untouched); empty → the rail unmounts and the **tucked tab**
  takes the viewport's right edge (banner-tab ref §3): ☑ 40px-class rounded-left sage tab,
  fixed at the rail's former top (**236px** — nav + masthead + the g24 offset, reported), hover/
  focus unfurling horizontally into "Today's list · NOTHING YET · ＋", click opening the add flow
  (`helpMePick`); the first commitment restores the rail with the same state (the panel render
  function is untouched — still exactly two mounts: the rail and the narrow chip's popover).
  Narrow (<1500) keeps the masthead chip; the tab is ≥1500 only. Nuance flagged: a day with
  done-work but zero commitments shows the tab (the pack's law verbatim); the done band returns
  with the first commitment.
- **Masthead:** post-its to **66×80 portrait** (24×10 tape, 24px Playfair numeral), container
  padding to **28px** (the one sanctioned departure from `--g24`, noted inline), title **26px**.
  The toggle had already left for the filter card; search stays.
- **THE NAMING SWEEP (results):** the guided walk is **"Focus mode"** everywhere it is named —
  the pair's card, the folded rail's aria, tour stop 5 (retargeted `.tdb-dwalk` → `.tdb-focus`,
  copy re-worded to name Focus mode); the lane pills read **"▶ Focus on Urgent" / "▶ Focus on
  Housekeeping" / "▶ Focus on Notes to self"** (dynamic per lane, both views — the ledger group
  heads follow). "Begin focused session" and "Walk me through" are extinct in the UI;
  `walkSublabel`/`walkAria` died with their strings (P3). FocusFlow needed NO changes — it never
  carried the names (grep-verified); the sweep is locked as a grep-level test over the page, the
  flow and the tour.
- Tests: the two-face gate + the never-a-third-panel-copy parity, the tab's geometry/a11y/
  breakpoint/reduced-motion, the masthead locks re-pointed (66×80/24/28/26), the naming sweep,
  the tour selectors + copy.

## Close — SHAs · counts

| Phase | SHA | Suite |
|---|---|---|
| P1 review banner + afterlife | `a8d0754` | 1269 |
| P2 reels + soft tags | `47a45ea` | 1271 |
| P3 the pinned pair | `aa51146` | 1269 |
| P4 tab · masthead · naming | (this commit) | 1272 |

**In-browser checklist (Nick, on dev):**
1. Sunday: the WHITE banner lifted above the lanes (☕ roundel, the verbatim copy, no stat
   preview); ✕ drops it to the thin sage bar beneath the last lane; the Urgent post-it and every
   count unmoved by either.
2. The reels paging with the rail open AND closed (the fit recomputes — fewer cards with the
   rail); snap feel (jsdom can't).
3. The soft ★ OFFER — white like its neighbours, ★ + bold only; urgency bold-only; the ledger's
   batch tags un-tinted.
4. The pinned pair holding through a long scroll; the Focus card's art + hover lift; ▶ Begin · n.
5. Pills toggling with the status line tracking ("Showing 39 of 44 · RESET"); RESET clearing
   filters + search and vanishing at parity; the zero pill at half-opacity.
6. The empty rail as the edge tab — hover unfurl, click → the add flow, first commitment → the
   full rail returns.
7. 66×80 post-its with the tape; the 26px title; the toggle living in the filter card.
8. "▶ Focus on Urgent" on the pink lane head (cards AND ledger); the tour's stop 5 pointing at
   the Focus card.

**Deviations (consolidated):** the lane/ledger head renames landed with P2/P3's head edits (the
lines were in hand — one edit each instead of two; P4 completed the sweep) · the banner's
#eee7de hairline realised as `--hairline` (live-token law) · the tab's "rail's former top" is a
fixed 236px · a done-only day shows the tab per the law · the II·B drawer locks were superseded
wholesale by the pair's (expected — the pack supersedes that round's sidebar).
