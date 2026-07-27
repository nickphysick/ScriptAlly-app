# The To-do Workbench — drawer shell · centred column · cards + ledger · search, filters, selection

Pack: `todo-workbench`. Refs `design-refs/todo-workbench-shell-v1.html` (= provided
`todo-workbench-v2.html`; **Option B normative**, Option A fenced) + `design-refs/todo-ledger-v1.html`
(= provided `todo-ledger-v8.html`, whole-ledger normative). Both carried the "Batch fix" +
"Begin focused session" renames in-file. Live `.t-f12` tokens over mockup hexes throughout.
Gates per phase (tsc · build · full Vitest). Recon reported → Nick's go with four grants:
(1) the AppShell /todo help-FAB hide (the pack's ONLY out-of-page line), (2) the `resolvedAt`
done-child degrade (dated where stamped, undated otherwise — no invented dates), (3)
`sa.todoView`/`sa.todoDrawer` localStorage UI-prefs (no user-doc fields, no rules), (4) the
`.tdb-band` double-definition fix in passing. Sequencing inverted: the sheet packs run AFTER this.

## STEP 0 — recon (summary; the full report went to chat at the STOP)

1. **Predecessors:** corner pack fully landed (`4b5a123`/`5255e63`/`6dff9a4`) → Phase 1 REMOVES
   P1+P2 (FAB, adaptive pillState, corner tests); Phase 2 INHERITS P3's white tag law untouched.
   Sheet packs not run — no conflict (they own FocusFlow; this pack owns the board).
2. **Corner machinery:** pop-up state is all page-level → transplant = relocation, not rewrite.
   The ? was AppShell's /todo-only two-item menu → moves to the drawer foot (grant 1).
3. **Reels:** laneFit.ts + test, Lane's fit/pager/ResizeObserver machinery, `laneFadeState`
   (todoBoard) + its describe, `.tdb-scroller` snap + `--tdb-cardw` + pagers CSS. All Phase 2.
4. **Ledger fields:** all readable at the render site (queries/agents/manuscripts/taskFlags/
   activities already pulled). No red gate. Soft spot = done-child dates → grant 2's degrade.
5. **Batch children:** full cohort = gap members + (agents − members); ADD → deep-link = open the
   group flow with members reordered target-first (no FocusFlow edit).
6. **State homes:** grant 3. Filters/search/expansion/selection session-only.
7. **Tour:** stops 1–3 survive; 4 → `.tdb-today2`, 5 → `.tdb-dwalk` (copy adjusted, authorised).
8. Tree clean at `6dff9a4`.

## PHASE 1 — the shell

- **The drawer** (`.tdb-drawer`, Option B): floating rounded paper panel, sticky top:18 below the
  app nav (F12 CrumbStrip untouched), internal scroll, **folds to a 64px icon rail** (width
  transition 0.22s, off under reduced motion; icon column mirrors ＋/▶/today/⚙/?). Fold persisted
  `localStorage["sa.todoDrawer"]` (grant 3). Contents: **＋ New note** (same `addTask`),
  **Walk me through** (relocated from the masthead — same `openFlowCards(board.do)`, same
  `walkAria`/`walkSublabel`), the Today's-list panel, and the **foot**: ⚙ Task settings (same
  sheet) + the **? menu** (Help centre / Replay the tour — the `sa:todo-replay-tour` dispatch
  verbatim; the board's listener unchanged).
- **The corner retirement:** FAB + adaptive pill states (corner P1+P2) REMOVED — markup, the
  `pillState`/`pillAria` derivations in todoWalk, `.tdb-fab*`/`.tdb-setbtn`/`.tdb-pop` CSS, the
  click-away/Esc machinery (`todayOpen` gone; the panel is always present in the drawer), and
  `todoCorner.test.ts` + `todoPopupStack.test.ts` + the todoWalk pillState describe + the
  todoChrome click-away describe. The white tag law (corner P3) untouched.
- **The panel transplant:** `renderTodayPop` → `renderTodayPanel` under `.tdb-today2` — the same
  inner anatomy and classes at drawer scale (header + count + the done-badge band toggle ·
  rollover Keep/Clear · committed rows with StatusDot/take-off/click→journey · the done band ·
  Add more / Help me pick · Work the list), reskinned to the ref's sage `.today2` header. The
  pop-up's ✕ retired (nothing to close).
- **The centred column:** `.tdb-ws` (row, cap 1720, centred) → drawer + `.tdb-main` →
  `.tdb-col` (cap **1150**, centred) — max-width discipline at every viewport. ≤900px the row
  wraps (drawer full-width, static) — the real mobile pass stays 6B (red-gated).
- **The masthead** (one row): 20px title + `date · weekOfQuerying(queries)` eyebrow (the
  dashboard's derivation consumed, never re-derived) · **42px post-its** (tape strip shrunk with
  them; same aria/jump behaviour) · the scrap at 50×37 inline · search (⌘K focuses — visibility-
  guarded because StagePage keeps the board mounted behind other routes; Esc clears; live
  filtering is Phase 4) · the Cards/Ledger toggle (`sa.todoView`; the Ledger face is honestly
  `disabled` until Phase 3 lands it).
- **Type-scale:** masthead 20px, lane heads 16px.
- **Grant 4 in passing:** the page-strip `.tdb-band` rule deleted — the name now belongs to the
  card header band alone (one rule left, locked).
- **AppShell (grant 1, the only out-of-page touch):** the help FAB renders on every route EXCEPT
  /todo; the now-unreachable two-item corner menu (`helpMenuOpen`) deleted — both its items live
  in the drawer foot with identical behaviours.
- **Tour:** stops 4/5 retargeted (`.tdb-today2`, `.tdb-dwalk`), stop-4 copy re-worded (ring
  sentence retired with the FAB); locks updated. Stops 1–3 selectors unchanged and still real.
- Tests: NEW `todoWorkbench.test.ts` (drawer fold/persist, corner absence, transplant anatomy,
  masthead composition, caps, ⌘K guard, band single-definition, AppShell guard);
  `todoFinishing.test.ts` scrap-cluster anchor re-pointed (masthead indentation).

## PHASE 2 — the card view

- **Reels retired, no dead code:** `laneFit.ts` + `laneFit.test.ts` DELETED; the Lane component is
  a pure section (header row over `.tdb-grid` — no refs, no ResizeObserver, no pagers);
  `laneFadeState` deleted from todoBoard + its describe from todoBoard.test.ts; `.tdb-scroller`
  snap machinery + `.tdb-pager*` + `--tdb-cardw` all gone from the stylesheet.
- **The grid:** `repeat(auto-fill, minmax(230px, 1fr))`, 12px gaps — wraps at every width
  (≈4-up at the 1150 cap, 2-up ~700, 1-up under ~490); the page scrolls, nothing scrolls sideways.
- **Tightened anatomy per the ref** (structure law unchanged — rim → frame → band + body):
  band 34→**26px**, titles 17→**14px**, body pad → `10px 12px 11px`, min-height 242→**200**.
  Overlays/clip-chain/lane tints untouched.
- **Renames:** "Focused session" → **"Begin focused session"** (label, title, aria);
  "Fix together →" → **"Batch fix →"** (the grouped card CTA — the only in-code sites; FocusFlow
  had no such strings, so the journey is untouched as demanded).
- **The white tag law inherits untouched** (recon: corner P3 already landed) — `todoTagLaw.test.ts`
  byte-identical.
- **themes.md:** THE WORKBENCH section regenerated (drawer/column/masthead grammar + the amended
  card scale + the tag-law inheritance + renames).
- Tests: workbench P2 describe (grid + reel-absence + anatomy + renames); todoCardBands re-locked
  (26px band, min-height 200, grid-drives-width); todoBoard laneFadeState describe removed.

## PHASE 3 — the ledger

- **The pure layer `src/lib/todoLedger.ts`** — consumes the board's derivations, never re-derives:
  `ledgerTitle` (terse row voice — "Review offer" / "Send full" / "Consider closing" / "Send a
  nudge"; user tasks keep the writer's words), `ledgerDetail` (REPLY BY · REQUESTED · R&R FROM ·
  QUIET n DAYS · WAKES — each read from the SAME source the card copy reads, with a sortable ms
  key), `sortLedgerDo` (offers pinned per the board law, then due-soonest ↓) / `sortLedgerHk`
  (longest-quiet ↓), `batchChildren` (the FULL cohort: recorded-first, then gap members in group
  order, then item-muted gap agents — the gap is a record fact; muting silenced the task),
  `batchDetail` ({complete} OF {total}), `truncateRows` (cap 8 — the mock names no cap; 8 chosen,
  children never count).
- **The renderer:** per-section white table cards — tinted heads (pink/coffee **+ a note-tint
  third head, a flagged extension** so notes aren't lost in this view) each carrying ▶ Begin
  focused session (same handlers as the card sections — parity, since journeys must open exactly
  as now from both views) · the shared 9-col grid (`34/30/132/232/minmax(180,1fr)/152/64/150/84`)
  with the header row and **DETAIL ↓** marked · the today-circle column = the same `toggleToday` ·
  **STATUS renders StatusDot verbatim at 13px** (the ref's sdot circles were stand-ins) · hover
  verbs ✓/⏸ via the existing quickDone/quickPause (**offers get neither — the board's
  offers-need-the-moment law wins over the ref sketch**) · batch parents (typed tag, chevron,
  stacked avatars + "N AGENTS", mini-bar + N OF M) expanding to the full cohort (done children
  struck **"✓ RECORDED {date}" only where `resolvedAt` was stamped — undated otherwise, grant 2**;
  "ADD →" deep-links into Batch fix AT that agent by reordering the group's members target-first —
  no FocusFlow change; item-muted children show NOT RECORDED without ADD — they asked us to stop
  asking) · childmore "OPEN BATCH FIX — WORK THROUGH ALL {n} →" · SHOW ALL {n} per section ·
  collapse restores the scroll captured at expand; expansion session-only, default collapsed.
- **The view toggle went live** (the P1 `disabled` came off) — persisted `sa.todoView`.
- **Engine-honesty reconciles (deviations, flagged):** (1) the ref's live-snoozed "WAKES 21 JUL"
  row — a snoozed task is hidden in the live engine (Task Settings owns it); WAKES renders only
  for quiet OFFERS (the one visible-while-snoozed case), and an expired snooze shows SNOOZED ×n +
  quiet-days. (2) The Sunday-review entry card stays card-furniture (its own mode + dismiss) —
  not a ledger row. (3) Batch-parent task copy is "Add {label}" (terse) vs the mock's slightly
  longer variants.
- Tests: `todoLedger.test.ts` (12 — titles, per-type details incl. the quiet-offer WAKES + the
  dated/undated done child, both sort orders, cohort composition, truncation) + the P3 source-lock
  describe (StatusDot per row kind, live persisted toggle, default-collapsed expansion + scroll
  restore, the deep-link reorder, SHOW ALL wiring, white-law-legal ledger tags).

## PHASE 4 — search + filters

- **The pure layer `src/lib/todoFilters.ts`:** the ref's checkbox list verbatim (Urgent → Offers ·
  Over to you; Housekeeping → Missing materials · Missing wish lists · Stale queries · Snoozed;
  plus "On today's list only"), composing AND-wise with the masthead search (title, agent, agency,
  manuscript — groups match on label or member name/agency). Counts derived live
  (`filterCounts`), never stored. Session-only state.
- **Decisions (flagged):** defaults are ALL-VISIBLE — the mock sketches Snoozed unchecked, but an
  unchecked default would silently hide previously-snoozed live cards on first paint; hiding is
  the writer's act. "Snoozed" is an AXIS over the type boxes, not a bucket. Reply-window groups
  have no checkbox (the ref's list omits them, as Task Settings v2 dropped that row) — they always
  render. todayOnly shows committed cards only; batch groups aren't committable and drop out.
  Focused sessions sweep the VISIBLE set (what you see is what you sweep). Section head counts
  show the visible tally while filtering; the post-its keep the desk truth. The review entry card
  hides while anything is filtered/searched (furniture would dilute matches).
- **Both views, one set:** cards lanes and ledger sections consume the same vDo/vGroups/vStale/vNt.
- **Filtered-empty:** a filtered-out lane/section HIDES; a fully-filtered board shows the quiet
  one-liner — "Nothing matches — clear filters" (one action resets filters + search). The
  celebratory desk states are unreachable from filtering (their branch reads the raw board).
- **⌘K** focuses the masthead search (the P1 visibility guard); **Esc** clears + blurs.
- Tests: `todoFilters.test.ts` (defaults, activity, the composition matrix incl. the snoozed axis
  + todayOnly-drops-groups + the no-checkbox reply-windows pass, search per field + group match,
  counts) + the P4 source-lock describe (shared visible sets, drawer wiring, quiet-line branch
  order + lane skips, review-card furniture rule, Esc). `todoFinishing.test.ts` leak-lock
  re-pointed at the visible-set sweeps (the exclusion invariant unchanged).

## PHASE 5 — selection, keyboard, polish

- **Selection** (`src/lib/todoSelection.ts`, pure): lives over the ledger's VISIBLE top-level row
  order (card keys + `group-{rule}`) — batch parents are ONE key; children are never in the order,
  so never selectable by construction. Plain click toggles + re-anchors; **shift-click ADDS the
  inclusive span** (additive over the replace convention — forgiving); stale keys prune on the
  next interaction. Hover-revealed checkboxes (visible when checked/selected too).
- **The ink bulk bar** (bottom-centre while a selection lives): {n} selected · ＋ Today's list
  (the same `setCommitted`, honouring the 5-cap with the same full-list flash) · ⏸ Snooze ·
  Dismiss (the same flag writes the singles make — `dismissTask` 7-day / `MUTED_UNTIL`) · ✕ clear.
  Optimistic, one toast, **one Undo all** unwinding every write.
- **Keyboard** (additive, never required — every action keeps its pointer path): ↑/↓ or j/k walk
  the visible rows with a **2px ink focus ring** + nearest-scroll; Enter opens the row's journey;
  T toggles today (cards); S snoozes (the existing quickPause / group fork); Esc clears
  selection + focus + kebab; ⌘K stays the search. Guarded: ledger view only, inert while typing
  in any editable, while a journey sheet is up, and while the board is display:none behind
  another route.
- **The kebab ⋯** (hover, card rows): Dismiss (single-item MUTED_UNTIL + undo flash) · Open query
  (`onNavigate("queries", <queryId>)` — the existing `?q=` deep-selection contract) · Task
  settings (the same sheet). **Offers get no kebab and no hover verbs** — the offers-need-the-
  moment law wins over the ref sketch (deviation, flagged).
- Tests: `todoSelection.test.ts` (toggle/re-anchor, both-direction spans, parent-as-one, children
  no-op by construction, stale pruning, anchorless shift degrade, the clamped focus walker) + the
  P5 source-lock describe (checkbox wiring incl. no-checkbox children, bulk-via-primitives + the
  cap + Undo all, the guarded keyboard map, the a11y focus ring, kebab verbs + the offer
  exception).

## Close — SHAs · counts · the in-browser checklist

| Phase | SHA | Suite |
|---|---|---|
| P1 shell | `e0dd976` | 1189 |
| P2 cards | `ba38f35` | 1182 |
| P3 ledger | `a682b50` | 1202 |
| P4 filters | `2bc34d5` | 1217 |
| P5 selection | (this commit) | 1229 |

Gates green per commit (tsc · production build · full Vitest, pipefail). Files: ToDoPage.tsx ·
todo.css · AppShell.tsx (grant 1) · todoBoard.ts · todoWalk.ts · todoTour.ts · NEW todoLedger /
todoFilters / todoSelection (+ tests) · deleted laneFit(+test), todoCorner.test, todoPopupStack.test.

**In-browser checklist (Nick, on dev):**
1. The drawer folding both ways (labels → 64px icon rail and back; state survives reload).
2. The board at 1440 AND 2560 — the content column centred at both (surplus pools as symmetric oat).
3. Cards WRAPPING, not scrolling — no pagers anywhere; band 26 / title 14 density reads right.
4. The ledger: DETAIL ↓ order sane (offer top, then soonest; longest-quiet first in Housekeeping);
   a batch row expanded (recorded child struck + dated where the flow fixed it), ADD → landing IN
   Batch fix at that agent; SHOW ALL; collapse restoring scroll.
5. Rows selected (shift range; a batch parent as one), then bulk ＋ Today's list / Snooze /
   Dismiss — undo-all each time.
6. Search + a filter composed (e.g. "marsh" + Stale only); the quiet "Nothing matches" line; the
   celebratory empties only when the desk is truly clear.
7. A journey opened from BOTH views (card click + ledger row click) and from Walk me through in
   the drawer.
8. The tour run end to end (stops 4/5 now point at the drawer).
9. j/k + Enter + T + S on the ledger; Esc clearing selection.
10. ⚙ and ? living in the drawer foot; the AppShell ? absent on /todo only.

**Deviations (consolidated):** the fold-to-64px rail, ⚙/? foot and Notes filter group come from
the pack prose (Option B's sketch omits them) · note-tinted third ledger section (notes would
otherwise vanish in that view) · WAKES renders only for quiet offers (engine honesty; snoozed
tasks are hidden by design) · the review entry card stays card-furniture and hides under active
filters · Snoozed filter defaults CHECKED (all-visible defaults) · sessions sweep the visible
set · offers get no hover verbs/kebab in the ledger · batch-parent task copy is the terse
"Add {label}" · muted gap children render NOT RECORDED without ADD (they asked us to stop asking).

**Deploy checkpoint (Nick's call):** this pack + the sheet packs (still to run — they own
FocusFlow) = the whole redesigned page. Dev deploy on request as usual; prod remains gated.
