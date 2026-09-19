# Query Centre e2e measurements retired with v11 (19 Sep)

The Query Centre was rebuilt against `design-refs/query-centre-v11.html`. Its one standing
measurement is now **`qcV11.measure.ts`**, which measures the ref and the page by the same ruler in
the same browser and refuses a run under its own assertion floor.

Every file below is **deleted in the same commit as this manifest**, by name, with its reason.
Recover any of them from the parent of that commit.

**Three reasons, and they are different claims:**

- **A · the three-column pane.** The file opens a query by clicking `.f12-row` in the old
  list-and-reading-pane layout. That arm of `Queries.tsx` has been unreachable since
  `GRID_IS_THE_PAGE = true`, so these were finding no row and **measuring nothing before v11
  began** — the vacuous-suite shape CLAUDE.md records for the To-do page. v11 did not break them;
  it is the first pass to count them.
- **B · the v10 page.** The file measures furniture v11 replaced: the five court tiles, the
  Filter / Group / Sort pills, the card grid and its verb band, the Board, the old calendar's rail
  and lanes, the slide-over drawer as the desktop's way to open a query, the illustrated masthead.
- **A+B · both.**

⚠️ **WHERE THE SUBJECT SURVIVES, IT IS SAID SO.** A retired measurement is not a retired claim.
The timeline (`.tl-*`), the correction sheet, the respond / nudge / mark-sent desks, the log-a-query
sheet and the notes composer are all still mounted — inside the docked card's tab bodies
(`[data-qcv="open"] .qcv-legacy`) and, below 900px of column, inside the drawer. Those rows are
marked **SUBJECT LIVE**: their coverage is gone until somebody re-points them. The recipe is one of
two — target `[data-qcv="open"]` at desktop widths, or run at ~1100px where a row still opens the
drawer.

## A · entered through the unreachable three-column pane (47)

| File | What it claimed | Note |
|---|---|---|
| `qcAlignment` | four verticals and two horizontals of the two-pane desk line up | layout gone |
| `qcBarInk` | the waiting bar's ink is the state colour, measured not read | **SUBJECT LIVE** (timeline bar) |
| `qcChapters` | the timeline groups into chapters in one column | **SUBJECT LIVE** (timeline) |
| `qcClip` | the pane's card scrolls rather than clips at short heights | layout gone; v11's cap is `qcV11` "docked card" |
| `qcComposer` | the notes composer grows by measured rows | **SUBJECT LIVE** (Notes tab) |
| `qcControlRow` | the list head's controls fit their container | control row gone |
| `qcCorrection` | the correction UI on the page: edit, remove, move | **SUBJECT LIVE** (correction sheet) |
| `qcCursor` | the list's keyboard cursor and the open row agree | replaced by `qcV11` stepping inside the view |
| `qcDates` | both date cells open the date editor | **SUBJECT LIVE** (Tracking tab) |
| `qcFixPack7` | the pane's rim, parchment headers and one button family | pane chrome gone |
| `qcFlash` | the empty state never flashes before data | replaced by `qcV11` "loading — the frames never move" |
| `qcGhost` | the scheduled-nudge ghost sits at the page's own distances | **SUBJECT LIVE** (timeline ghost) |
| `qcGrammar` | every event type on the card reads in one grammar | **SUBJECT LIVE** (timeline) |
| `qcLead` | the lead mark is centred on its row | **SUBJECT LIVE** (timeline) |
| `qcListHeader` | the list header wears the pane header's treatment | list header gone |
| `qcListKeys` | arrow keys scroll the old list correctly | replaced by `qcV11` stepping |
| `qcMailHeader` | the longest status label fits the mail header | header gone |
| `qcMaterials` | materials writes through the pane, each undone | **SUBJECT LIVE** (materials on the Tracking tab) |
| `qcMats` | no materials pill renders in a pending or ghost state | **SUBJECT LIVE** |
| `qcMethod` | the send method's words and head | **SUBJECT LIVE** (Tracking tab) |
| `qcNameSize` | the longest agency name fits the pane head | head gone; v11's is `qcV11` "docked card" |
| `qcNotes` | the notes column scrolls and the composer stays pinned | **SUBJECT LIVE** (Notes tab) |
| `qcNudge` | the nudge button is enabled when it should be | **SUBJECT LIVE** (⋯ → nudge desk) |
| `qcNudgeWalk` | a nudge walked end to end and removed | **SUBJECT LIVE**; writes — re-point with its undo intact |
| `qcOnload` | what the page shows while loading | replaced by `qcV11` loading cases |
| `qcPanel` | the panel's computed ground and bottom gap | panel gone |
| `qcPolicy` | the agency's policy line across two populations | **SUBJECT LIVE** (Agent tab) |
| `qcPolishGates` | two columns inset symmetrically; panes scroll, page never | layout gone — v11's page scrolls by design |
| `qcPopovers` | the pane's popovers fit a 700px-tall window | **SUBJECT LIVE** (date / window popovers) |
| `qcProvenance` | the provenance migration's own report | migration long finished |
| `qcProvenanceVisual` | which provenance rule the cascade draws | **SUBJECT LIVE** (timeline) |
| `qcRims` | every kept container has four edges | containers gone |
| `qcRing` | the matched rules for the selection ring | ring gone (ActionMark rings retired with v11) |
| `qcRow` | the old list row's mark size | row gone; v11's row is `qcV11` "list" |
| `qcSetWindow` | the set-a-window section | unreachable on the dev account by its own header |
| `qcSheet` | the seam spans both columns; list head controls one size | layout gone |
| `qcSkeleton` | the old skeleton's shape | replaced by `qcV11` loading cases |
| `qcSupersede` | two superseding notices never appear together | **SUBJECT LIVE** (timeline) |
| `qcTasks` | the tasks surface opens from the pane | entry point gone |
| `qcTimeline` | the timeline's measured before/after geometry | **SUBJECT LIVE** (timeline) |
| `qcTone` | `.f12-body` paints no fill | `.f12-body` is not rendered |
| `qcToolbarGrid` | the toolbar and the list share one grid | both gone |
| `qcType` | card glyphs are ink; agency line subordinate | old pane type |
| `qcWaiting` | one waiting shape across three situations | **SUBJECT LIVE** (timeline waiting bar) |
| `qcWhose` | the "whose turn" sentence is attributed correctly | **SUBJECT LIVE** (Tracking tab) — v11's own court wording is unit-locked in `qcSummary.test` |
| `qcWords` | no appraisal wording on the rendered page | **SUBJECT LIVE** app-wide; v11's page is swept in `qcV11` and `qcSummary.test` |
| `qcWriterWindow` | the writer's own expected date draws as provisional | **SUBJECT LIVE** (timeline) |

## B · measured the v10 page (21)

| File | What it claimed | Note |
|---|---|---|
| `qcCalLayout` | the old calendar's layout at four widths | replaced by `qcV11` calendar cases |
| `qcCalRail` | the calendar rail's census and fields | rail gone |
| `qcCalRefdiff` | the page against `qc-calendar-ref-v1.html` | superseded ref |
| `qcCalToday` | the today line and the today dot share an x | replaced by `qcV11` "calendar" (today at 46%) |
| `qcCalendar` | the toolbar holds between views; the calendar draws the filtered set | replaced by `qcV11` |
| `qcCalendarParity` | the same wait drawn the same way on the calendar and the timeline | old lanes gone; **the parity claim is not re-made** by v11 |
| `qcGridPass` | the card band holds its height; verb row clears the fact line | cards gone; **this also closes the open 1280 verb-row overlap** |
| `qcMark` | the illustrated header mark | masthead opted out |
| `queryCentreCard` | the card against the ref it was drawn from | cards gone |
| `queryCentreCreate` | Log new query opens the journey and the ghost previews it | **SUBJECT LIVE** (log sheet); ghost gone |
| `queryCentreFinish` | the card grid caps, centres and sticks | replaced by `qcV11` "grid" |
| `queryCentreRoom` | what the masthead costs the page | no masthead |
| `queryCentreShots` | screenshots of the browsing grid | replaced by `qcV11`'s screenshots |
| `queryCentreSticky` | controls hold while cards scroll under | controls row gone |
| `queryCentreStuckBar` | controls stick beneath the collapsed bar | no collapsed bar on this page |
| `queryDrawerDesk` | the ⋯ fork opens inside the desk, notched at the rung | **SUBJECT LIVE** (desks) |
| `queryDrawerShots` | the drawer's three tabs and the desk | **SUBJECT LIVE** below 900px |
| `queryLogSheet` | the four steps; save writes once and Undo takes it back | **SUBJECT LIVE**; writes — re-point with its undo intact |
| `queryPanel` | the panel's band, stepping and rail | replaced by `qcV11` "docked card" |
| `queryPanelBar` | the panel bar against the v5 ref | superseded ref |
| `queryRespondNudge` | respond kinds, details and the nudge desk | **SUBJECT LIVE** (desks) |

`qcChassis.measure.ts` was classed here by name and is **KEPT**: it measures the *To-do* page on the
Query Centre's chassis. Its one read of the deleted `QueryStatTiles.tsx` is re-pointed.

## A+B · both (7)

| File | What it claimed | Note |
|---|---|---|
| `qcControls` | three controls resolve one height | pills gone |
| `qcFlatten` | the flattened page on the running site | superseded |
| `qcReconcile` | four states at four viewports; the active step holds | **SUBJECT LIVE** (log sheet steps) |
| `qcRhythm` | the page's vertical rhythm | superseded by `qcV11` head / summary offsets |
| `qcRoute` | grid → record → grid, and nothing selects implicitly | **reversed by decision**: v11 selects the first row when docked, never below 900px — `qcV11` "under 900px" |
| `queryCentrePass2` | cap, search, popovers, ladder, leaves | page search and ladder gone |
| `queryViews` | the palette, the tiles and each view; drawer opens from Grid, List and Board | Board and tiles gone |

## Kept, and their state on the v11 page

See the phase 11 commit message and the final report: twelve files whose subject is not the page
furniture (`qcChain`, `qcCorrectionUndo`, `qcHueFamily`, `qcJourneyPalette`, `qcMatch`, `qcMove`,
`qcPackageAttach`, `qcPackageGroup`, `qcPalette`, `qcPops`, `qcVocab`, `queryVersions`) plus
`qcShots`. They were **run, not assumed**, and their reds are reported rather than fixed or
rebaselined in this pass.
