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
- **The deriver completed:** bare type echoes BANNED — offer/send/R&R rows with no readable date
  render a **dim "—"** (sort keys unchanged at the far end); a stored-but-unparsable date degrades
  identically. REPLY BY / REQUESTED / R&R FROM stand as built in P3.
- **Batch copy:** tag stays `MATERIALS` (the meta label, uppercased); the TASK cell now reads the
  ref's wording via one pure source — `batchTaskCopy`: "Add material requirements" / "Add wish
  lists" / "Add reply windows".
- **Avatar stack:** the −7px overlap + 1.5px white keylines were already in the P3 stylesheet —
  now rule-text-locked.
- Tests: dim-dash per type (absent AND unparsable dates), copy snapshots, the 1:1
  no-fan-out/no-dedup regression (two same-agent records → two rows, distinct keys, identical
  quiet-days), the stack lock.

## PART B — sheet timeline & guard

### Recon findings
- **The kicker doubling:** FocusFlow's send sheet composed `Over to you · {card.due}` — and the
  send family's `due` chip IS the string "OVER TO YOU" (the lane tag), so the kicker read
  "OVER TO YOU · OVER TO YOU". The composition's INTENT is stream + a detail chip (it works for
  every other type, whose `due` is meaningful) — so the real second segment is the row's DETAIL.
- **The Hub timeline:** `src/components/reading-pane/QueryTimeline.tsx` — already a shared home.
  Props `{query, agent, events, primaryAction?, onEditEntry?, onDeleteEntry?, …}`; the pure
  `buildTimelineRows(events, query, agent)` builds RowSpec rows (StatusDot status + title + date +
  sub + pills), rendered oldest→newest with hairline connectors. The Hub feeds it the per-query
  `activity` SUBCOLLECTION (`{type: QueryStatus|"Nudge sent", createdAt}` docs via onSnapshot).
- **The sheet's history strip:** `timelineChips(ag)` — `buildAgentTimeline` pill chips (the AGENTS
  page's per-agent derivation), one call site (the send sheet). Not the Hub grammar.
- **Prior same-type sends at write time:** the top-level `activities` feed (already in FocusFlow's
  db slice) — `activityType === MATERIALS_SENT` rows carry `resultingStatus` (Partial/Full Sent,
  stamped at append by the one write path), so the guard reads the log with no new state. Halt (e)
  clear.

### B1 — kicker fix (`sendKicker`, pure in todoWalk)
- The intended composition restored: **"Over to you · {the row's DETAIL}"**, read from
  `ledgerDetail` — the SAME pure source the ledger's DETAIL cell reads, so sheet and ledger can
  never disagree ("Over to you · REQUESTED 12 JUL" / "· R&R FROM 12 JUL"). No readable date → the
  single label (never a dash segment). Same-string-twice impossible by construction AND guarded.
- Tests: per task type + the no-date single-label branch + the never-doubles assertion.

### B2 — the timeline, mirrored from the Hub
- **Extraction shape:** `TimelineRows` lifted out of `QueryTimeline.tsx` (same file — already the
  shared reading-pane home) as a move-without-change: the rows.map block verbatim, the ⋯
  correction trigger now behind an `onMenuOpen` prop that QueryTimeline passes exactly when its
  edit/delete handlers exist — Hub behaviour byte-identical, its pure tests untouched (4/4).
  Halt (d) clear.
- **The sheet:** the history chips are REPLACED by the Hub's rows — `buildTimelineRows(...)
  .slice(-4).reverse()` (most recent 3–4, newest first) rendered through the shared component,
  "Open the full query →" directly beneath (the very next mount). The chips' component + CSS
  deleted.
- **The source adapter (reported):** the Hub feeds the builder per-query SUBCOLLECTION docs
  (`{type, createdAt}`); the sheet holds the top-level feed, adapted by shape — `resultingStatus`
  is stamped at append by the same writes that append the subcollection docs, and `NUDGE_SENT`
  twins the nested "Nudge sent", so the rows come out identical. Pre-migration activities without
  a `resultingStatus` drop out (the synthesised "Query sent" root covers the common gap) — the
  one caveat, flagged.
