# Found on the way — the To-do one-pass, 16 Aug

One line each, unfixed. Not swept for siblings, not turned into work. Candidates, not a backlog.

- `formatLegacyMaterial` FABRICATES a count when none is stated — `First ${numStr || "50"} pages`,
  `|| "3"` chapters, `|| "3,000"` words (`src/lib/materials.ts`). So a material with no quantity
  renders "First 50 pages" as though the agency had asked for 50. Worse than the `— 0 pages` fixed
  in Item 5 and deliberately not fixed with it: this is legacy display shared by every screen the
  module's own header lists, so it is a sweep of its own.
- The rail shows **two cards for Priya Nair** (rows 10 and 11 on dev), both `Close · Log the close`,
  both with an empty timeline. Either two queries to one agent — legitimate — or a duplicate card.
  Not investigated.
- Five of twelve cards on dev have **no activity rows at all** (`Nothing logged yet.`): every Chase
  and both Closes. They are queries that were demonstrably sent, so either the seed writes no
  per-query subcollection for those shapes or `useDockActivity` is not reaching it. Noted last night
  as well; still true.
- `.tdb-revlink` in the tool row renders only when `reviewSeen || reviewDismissed`, and the briefing
  card was the only thing that set `reviewSeen`. With the card unmounted (Item 2) a fresh account
  sets neither, so the weekly review has no entry point on the page at all.
- ⚠️ **STILL OPEN FROM LAST NIGHT, and Item 9 would have closed it**: every control inside a
  FocusFlow journey is unreachable — `useOverlay`'s `sealBackground()` puts `inert` on `#root` on
  the stated premise that overlays portal to `document.body`, and FocusFlow does not portal. Full
  write-up as item 8 of `reports/found-overnight.md`. Moving the journey INTO the pane removes the
  overlay entirely, which is why it is worth doing rather than patching.
- **"date needed" is a real need with no home.** The import writes `(imported — date needed)` into a
  provisional rung's `note`, and Item 5 stops it rendering — but the underlying fact is true and
  worth surfacing: those rungs carry an ordering key rather than a date, and the writer is the only
  one who can supply the real one. It is not a timeline sub-line; it wants an affordance (a prompt
  on the rung, or a gap in the Fix bucket). Suppressed, not answered.
- **A completion lock slices too wide.** `todoBoardFamily.test.ts`'s "no board path writes
  `done: true` directly" slices `ToDoPage.tsx` from `function performBoardPlan` to
  `function renderBoard` — everything between those two markers, not `performBoardPlan`'s own body.
  Any function added in that range inherits the assertion. It caught a real fault this time (an
  inline completion that should have called `quickDone`), so it fired for the right reason by luck
  rather than by aim. Narrowing it to the function body is a one-line change; not done here.
- **`.tdw-cbic` is now a misnomer.** It survives because it still renders — the list tools row's icon
  buttons (filter, sort, add) — but "cb" named the command bar, which no longer exists. Renaming
  touches locks in three files, so it is recorded rather than done.
- ~~`.tdb-nc-save` carries a burgundy BUTTON fill~~ — FIXED (ink fill, parchment text).
- ~~`.sa-dp-day.sel` carries a burgundy fill too~~ — FIXED (ink fill for the selection, `#f2ede7`
  for hover). The observation stands and is worth keeping: this was the SAME fault in
  `BrandDatePicker` that `RecordingCalendar` had, which is one more argument for asking the
  replace-BrandDatePicker question that component's header already defers.
- **`.cal-*` is shared by two unrelated surfaces.** `RecordingCalendar`'s popover and the To-do
  CALENDAR PAGE (`todoCalendar.css`) both use `.cal-grid` / `.cal-dow` / `.cal-d`. The page's grid is
  mounted-but-hidden on /todo, so an unscoped `.cal-d` selector resolves to a cell nobody can click —
  it cost a measurement run. No visual bug today because the popover's own rules are more specific,
  but two components sharing a prefix is one stylesheet edit away from being one.
- `FocusFlow.tsx:77` `MATERIAL_VOCAB` offers **Full Manuscript** as an agent material. The standing law excludes Full manuscript and Author bio from Agent Materials and `agentMaterials.ts` STRIPS them on every Materials commit — so the housekeeping sheet offers a chip whose value the next Materials save deletes. The in-pane `fix` journey offers the three the law allows. (Not fixed — FocusFlow is out of scope this pass.)
- **`TodoDock.tsx:178` — after any pane commit the page and the dock hold DIFFERENT cards.** The page keeps the committed card via `heldCard.current` (its hold rule, deliberate and correct); the dock recomputes `const card = queue.find((c) => c.key === activeKey) ?? queue[0]`, and the committed card has left `dockable`, so the dock silently falls to the FIRST remaining task. The header, materials and verbs then come from that other card while `dockRows` — keyed on `paneCard.relatedRecordId` — is still listening to the committed query. Live today for all five committed journeys, not just `fix`. This is the structural reason Item 4 ("the recorded state, keyed on the query") is bigger than it reads: the fix is not an extra view, it is re-rooting the dock's identity so a held card survives leaving the queue. Source-level finding — unverified on the page, because verifying it means committing a real send against Nick's data.
