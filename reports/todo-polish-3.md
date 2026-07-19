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
