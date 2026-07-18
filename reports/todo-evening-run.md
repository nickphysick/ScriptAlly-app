# Evening Run — workbench polish → sheet timeline & guard → sheet restyle

One unattended pack, three parts, seven commits (A owns the board; B then C own FocusFlow).
Downloads verified at start: `todo-sheet-headers-v5.html` (16:35) · `todo-sheet-headers-v4.html`
(16:35) · `journey-send.png` ✓. Tree clean at `6bf560b`. Gates per commit (tsc · build · full
Vitest, pipefail). Live `.t-f12` tokens over mockup hexes throughout.

## PART A — workbench polish

### A1 — the masthead band
- The masthead returns to a **full-width paper band** above the drawer+column row: `--paper`
  ground, **1px `--line` base rule** (the pack's `--hair` realised as the live token — `.t-f12`
  has no `--hair`), not sticky, scrolls away with the wrap. Content row unchanged, centred at the
  same **1150px** discipline (viewport-centred; `.tdb-mastcol`). The drawer's sticky top:18 is
  unaffected (the band lives in the same scroll flow above it).
- The shell ref amended **in place** with a header comment (never regenerated), per the pack.
- Tests: A1 describe — band rule + band-before-drawer-row order, 1150 discipline, the column no
  longer hosting the masthead, non-sticky band + standing drawer offset.

### A2 — ledger detail + copy (findings first)
- **Duplicates (Eleanor Whitfield ×2 / Marcus Reed ×2, identical quiet-days): NOT a deriver bug.**
  Engine recon: stale tasks are minted `task-no-res-close-${q.id}` inside `queries.forEach` —
  strictly one task per QUERY (db.tsx ~718), and the ledger renders one row per board card per
  task. Two rows with the same agent + identical quiet-days = two real query records to that
  agent in the dev data (same dateSent). No code fix; a per-query regression lock added anyway.
  **Record ids:** unreadable from this session (the board is auth-gated; no dev-Firestore access
  from the harness) — each row's kebab → **Open query** deep-links `?q=<id>`, so the ids are one
  click away in the app for the Correction UI list.
- **Penhallow (name ≈ agency):** rendered as stored (the ledger prints the stored name + stored
  agency verbatim — no normalisation anywhere in the row path). Record id: as above, via the
  row's Open query.
