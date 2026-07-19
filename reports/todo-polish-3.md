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
