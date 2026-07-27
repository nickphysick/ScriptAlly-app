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

### B3 — duplicate-send guard (soft)
- **The read:** `priorSameTypeSend` (pure, todoWalk) — the most recent SAME-TYPE `MATERIALS_SENT`
  on that query, from the log at write time (matched on `resultingStatus` — Partial/Full Sent).
  No new state. R&R resubmissions never guarded; non-send statuses never guard.
- **The confirm:** `duplicateSendPrompt` — "You logged a {full/partial} to {agent} on {date} —
  log another?" surfaced through **`window.confirm` at all three write moments** (the sheet's
  existing confirm grammar — the same dialogue the staged-discard guard uses; the quick paths
  have no bespoke dialogue surface, so this IS their grammar — reported shape: OK proceeds with
  the normal payload, Cancel returns with nothing written and staged work intact).
- **The three sites:** the journey's Mark sent (guard BEFORE `stageAndAdvance` — decline stays on
  the step), the sweep's quick-done, the board's quick-✓ (both BEFORE the one mark-sent write
  path — decline leaves the card untouched).
- **Daniel O'Rourke's 16/17 Jul duplicate:** real test data, untouched — it renders truthfully
  (two ledger rows, two timeline entries) and now demonstrates the guard: a THIRD full would
  confirm against "17 Jul". Awaits the Correction UI.
- Tests: fires on same-type repeat only (most-recent date), never on first sends / cross-type /
  cross-query, never on R&R; prompt copy incl. degrades; source locks pinning guard-before-write
  at all three sites.

## PART C — sheet restyle

### C1 — anatomy + exit
- **Refs committed:** `design-refs/todo-sheet-restyle-v1.html` (v5 — normative; the SLOT SPEC +
  MANIFEST CONTRACT live in its header comment, the contract Nick draws against) +
  `design-refs/todo-sheet-ceremony-v1.html` (v4 — Section D only; E/F fenced as exploration).
- **Asset path:** `src/assets/journeys/send.png` (the existing `src/assets/` convention, a new
  `journeys/` folder). Manifest `src/components/todo/journeyArt.ts` — `send` populated, all other
  keys present-but-null (null = the slot renders nothing at all).
- **The wrapper/overflow split:** `.tdb-ffwrap` (position:relative, the sheet's old sizing) now
  sits between the stage and the sheet; the sheet keeps `overflow:hidden` for band clipping. The
  **corner exit** (`.tdb-ffx` — 44px parchment circle, 1.5px ink, ink ✕ at 2.4/round, top:-16
  right:-16, scrim shadow, hover 1.06, `aria-label="Back to my desk"`) rides the wrapper, rendered
  AFTER the sheet in DOM = the focus trap's LAST tab stop (trapTab walks DOM order). The scrim +
  trap mounts are untouched — halt (f) clear.
- **The pill removed everywhere:** FocusFlow's chrome bar (`.tdb-ffbar`/`.tdb-ffexit`) deleted;
  the guard re-wired VERBATIM (the ✕ calls the same `requestExit` — immediate when clean, confirm
  when staged). Task Settings converted too (its exit = the clean `onClose` — no staged model).
  **Progress dots + count relocated to the sheet FOOT** (left of the staged chip) — the pack names
  no home for them after "no chrome row"; the foot is the reported call.
- **The zoned E band** (`.tdb-fband` + `band()` helper): family gradient + 1px family
  border-bottom, no radius (the sheet clips); kicker pill → 30px Playfair headline (carrying
  `.tdb-ffq` so the dialog's aria-labelledby stamp keeps finding it) → italic sub, left; the art
  slot 165×120 fit-within with the CSS drop-shadow, right. **Proven on the send journey**: both
  steps on pink with the plane; step 1 mirrors the ref exactly (kick "{agent} · logging the
  send", "Off it goes", the send line as sub, the asked-for sentence as the body lede).
- Tests: todoChrome P3 rewritten to the corner era (no bar/pill anywhere, ✕-after-sheet trap
  order, guard verbatim, foot progress, skips kept); todoSheet C1 describe (wrapper split, the
  circle's letterpress spec + mobile inset, Task Settings parity, the proven band, the manifest);
  taskSettingsSheet lock re-pointed.

### C2 — all modes + families
- **Uniform reach confirmed (halt (f) clear):** every step's kicker/title/sub trio was the first
  three elements of its body JSX — all ~22 steps converted to `band(...)` with no outliers; no
  step composes its own kicker outside a band any more (locked).
- **The family mapping, applied:** pink = sends, nudges, every offer screen (**kickers carry the
  ★**); coffee = stale, detail fills, batch sittings; sage = the Sunday review (all six screens),
  the Ready-to-save screen, and **Today's-list walks — sage whole-walk via a new `ritual` prop**
  set only by Work-the-list (the law names Today's walks sage explicitly, which outranks the
  mixed-walk clause for that launch); parchment = Task Settings AND **notes** (notes have no
  family in the law's closed list — the neutral parchment is the reported call). Focused sessions
  wear the lane they sweep by construction (per-item stream family: do→pink, hk→coffee,
  nt→parchment); mixed walks **crossfade cleanly** (the band is keyed by family with a 0.2s fade,
  off under reduced motion) — the clean branch of the CC's-call, taken.
- **Ceremony D enumeration (5 screens):** the offer celebration (★ kicker; the big ★ glyph stays
  as body ornament while the art slot is empty) · the Sunday review's opening screen · its ☕
  closing screen · the "All saved" completion · the "Desk walked"/"Lane swept" completion. The
  Ready-to-save staged-review screen is deliberately E (a work screen, not a ceremony).
- **Progress relocation (reported):** the pack retires the chrome row but names no home for the
  multi-item dots + count — they live in the sheet FOOT, left of the staged chip.
- **Mobile:** ≤760 bands stack text-above-art at reduced scale, the exit insets 12/12; **<480 the
  art hides** (the reported sub-480 call). The ≤760 oat full-screen scrim treatment stands.
- **themes.md:** the SHEET ANATOMY section written (anatomy, families, ceremony list, manifest).
- Tests: todoSheet C2 describe — family per mode incl. the no-inline-kickers uniformity sweep,
  the per-item sweep family + ritual override + keyed crossfade, exactly 5 ceremony-D screens,
  the empty-slot nothing-renders rule, and the mobile band/exit clauses.

## Close — SHAs · counts · the merged in-browser checklist

| Commit | SHA | Suite |
|---|---|---|
| A1 masthead band | `f853e84` | 1232 |
| A2 ledger detail + copy | `19bb96e` | 1237 |
| B1 kicker fix | `7e577df` | 1239 |
| B2 Hub timeline | `e84113b` | 1243 |
| B3 duplicate-send guard | `710fd4c` | 1250 |
| C1 anatomy + exit | `d725fb9` | 1254 |
| C2 modes + families | (this commit) | 1259 |

Gates green per commit (tsc · production build · full Vitest, pipefail). Files: ToDoPage ·
FocusFlow · TaskSettingsSheet · QueryTimeline (extraction) · todo.css · todoWalk · todoLedger ·
journeyArt (new) · send.png (new) · 2 refs (new) + the shell ref amended · themes.md · 8 test
files.

**In-browser checklist (Nick, on dev):**
1. The masthead band spanning a 2560 viewport — paper edge to edge, contents centred at 1150.
2. The offer row's DETAIL reading REPLY BY 31 JUL (hot); no bare "OFFER"/"R&R" echo anywhere —
   a dateless row shows the dim —.
3. The Eleanor/Marcus duplicate rows: two rows each, identical quiet-days — kebab → Open query on
   each to collect the ids for the Correction UI (real records, not a render bug).
4. Daniel's send sheet: the kicker reads OVER TO YOU · REQUESTED {date} (never doubled), and the
   history beneath is the Hub's own timeline — StatusDot rows, newest first, 3–4 entries, "Open
   the full query →" beneath.
5. The guard: quick-✓ (or the journey's Mark sent) on a query that already has a same-type send —
   the confirm names the type, agent and most recent date; Cancel writes nothing (staged work
   intact); OK logs normally. A third full to Daniel demonstrates it against 17 Jul.
6. The send journey: pink band, the plane at right with its soft shadow, corner ✕ straddling the
   sheet corner.
7. The Sunday review: sage; opening + ☕ closing screens centred (ceremony D); the three
   looking-back screens as E rows.
8. A Batch fix sitting on coffee; Task Settings on parchment.
9. The corner ✕ both ways: clean sheet = instant close; staged work = the discard confirm.
10. Work the list from the drawer: sage bands the whole walk; a mixed Focused session crossfades
    family per item.
11. Mobile width: the exit inset at 12, bands stacking, art gone under 480.

**Deviations (consolidated):** progress dots+count relocated to the sheet foot (the pack retired
their row without naming a home) · notes wear parchment (no family in the law's closed list) ·
the D screens keep their ✓/★/☕ glyphs as body ornament while their art keys are empty · the
Ready-to-save screen is E, not D (a work screen) · B2's source adapter (subcollection ↔ top-level
feed) with the pre-migration caveat · duplicate/Penhallow record ids are one click away via Open
query (this session cannot read dev Firestore) · the ceremony ref's chrome-row exit pill (drawn
in §D) is superseded by the corner exit, per the pack's own law.

**The dev pile now contains the complete redesigned To-do page — deploy checkpoint next.**
