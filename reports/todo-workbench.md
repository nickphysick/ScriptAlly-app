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
