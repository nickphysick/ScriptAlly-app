# Retired or amended by ink shell v1 (6 Oct)

The ink shell replaces the workspace shell's look and arrangement on every signed-in desktop route
(ref `design-refs/shell/ink-shell-v1.html`). The locks below measured the light bar, the light sidebar
and the viewport-anchored overlays it replaces. Each is listed with what it asserted and why it no
longer holds. **None of them is a regression report**: every claim below is superseded by a named
INK lock in `inkShell.measure.ts`, and these files are not edited in this pass — they will go red on
the ink build for the reasons given, and should be deleted or re-pointed by the owner named.

Selector-swept (`grep -rln "ws-pname\|ws-pagebar::after\|ws-fb\b\|data-shell=\"switcher\".*ws-pagebar\|sv2-fade\|\.qad-drawer" tests/e2e/`), not filename-swept.

| Suite · cases | Asserted | Why it no longer holds | Superseded by |
|---|---|---|---|
| `quietBar.measure.ts` Q1–Q7, Q9 (+ `quietBarShots`) | the bar is the page ground; a hairline at rest (4 Oct ruling); the page name fades in once the title passes behind the bar | the bar is ink; there is no light bar for a hairline to sit under; the folder tab names the page from first paint. **The 4 Oct "hairline always on" ruling is retired with a reason** (CLAUDE.md, quiet-bar section). | INK1, INK2, INK6 |
| `quietBar.measure.ts` Q8 | full headers start on the column's left | not a bar claim — **still valid**, keep | — |
| `shellV3.measure.ts` L2, L3, L5, L6, L8, L10 | no edge at rest; anthracite active row; bar order toggle·vr·name·spacer·switcher·search·feedback·help; 40×40 search icon; help 24 from the right; themed active row | the bar order and the controls changed (tab · search · Log a query · Help); the active row is a wash + terracotta edge in every theme | INK7, INK9, INK11, INK1 (themes) |
| `shellV3Mock.measure.ts` (bar, active row) | the app against the v3 mock | v3 mock superseded by the ink ref | INK1–INK11 |
| `pageHeaderV1.measure.ts` §1 (all three) | full-width 64px bar, no breadcrumb, shadow on scroll | the bar is ink with no shadow; already contradicted Q3 before this pass | INK1 |
| `pageHeaderV2.measure.ts` §1 | bar = page ground, toggle at +24, page name hidden at rest, one switcher in the bar | toggle in the sidebar's logo row; switcher in the sidebar | INK5, INK10 |
| `plateHeader.measure.ts` PH6 | the bar's hairline at rest on every route | no hairline (see Q2) | INK1 |
| `livingHeadersV3.measure.ts` LH5 | the breadcrumb `SECTION / Name` in the bar from first paint | the tab carries group + name with no separator | INK6 |
| `dashTopRow.measure.ts` (v34 controls) | toggle 34, search/help/feedback 36 on every route | controls redesigned: 168px field, cream split button, 34px round help | INK7, INK9 |
| `qcV126.measure.ts` QC126-1 · shell; `analyticsV17.measure.ts` AN17-1 | top bar `rgb(243,242,240)` and its `rgba(28,19,15,.1)` rule | the bar is ink | INK1 |
| `pkgMat.measure.ts` S1–S7, `compsMat.measure.ts` S1/S2/S3/S5/S6 | the bar reads `MATERIALS / Page`; bar = page ground | the tab reads `MATERIALS` `Page` (two lines of one tab, no separator) | INK6 |
| `switcherV2.measure.ts` S1–S3 (geometry) | tile 44 tall in the bar, menu 340 wide right-anchored 8 below | the selector is a sidebar tile; its menu is portalled, left-anchored under it | INK10 |
| `switcherV2.measure.ts` S4–S8 (behaviour) | keys, M, switching + toast, motion | **behaviour unchanged — keep**; selectors still match (`.ws-ms-menu`, `[role=menuitemradio]`) | — |
| `sidebarCapture.measure.ts` SB1, SB3, SB6, SB7 | the capture button between the brand and the nav; collapsed tile + flyout | it moved to the bar and has no collapsed form | INK8 |
| `sidebarCapture.measure.ts` SB2 | Log a query opens the drawer | **contract unchanged — keep**, re-point to `.ws-cap--bar` | INK8 |
| `queryActions.measure.ts` §A | drawer 500 wide, right edge 0 | inset 8 from top/right/bottom, radius 12 | INK16 |
| `qcV126.measure.ts` QC126-12, QC126-13, 2.3 | Birds-eye tab 24 from the window; drawer flush right, nothing right of it | tab 20 from the sheet; drawer inset 8 | INK16, INK17 |
| `contactV13.measure.ts` CL13-9 (tab position), CL13-10, CL13-13 | Housekeeping tab 24±1 from `.ws-window`; dock chip 24 from the drawer and the foot | tab 20 from the sheet; dock chip 20 from the drawer, 20 above the sheet's foot | INK17 |
| `agentCardV1.measure.ts` dock/parked chips vs the mock | chip foot and the parked chip's right/bottom equal the mock's (24 / 20 from the viewport) | anchored to the sheet now | INK17 |
| `analyticsV17.measure.ts` AN17-15 | section tab 24±1 from the window | 20 from the sheet | INK17 |
| `matrix.measure.ts` (hem readings) | non-fill pages have a bottom hem with an opaque stop | clean edge: no fade at the sheet's edge on the desktop (the phone keeps it) | INK15 |

## Unit locks amended in the phase commits (not retired)

`workspaceShell.test.tsx` (the tab names the page, no separator; the terracotta pill; SB5's one
stopPropagation; `.ws-upgrow` gone) · `sidebarCapture.test.tsx` SB1 (in the bar) · `betaChrome.test.tsx`
(the feedback route is the sidebar card) · `sidebarCollapse.test.tsx` (the pill; Upgrade in the plan
line) · `workspaceTasksNav.test.tsx` (the pill, once) · `tasksKeys.test.tsx` (the To-do toast centred
on the sheet on the desktop).

## Follow-up item 1 — what was actually done (7 Oct)

A census of all 57 e2e specs on the ink build, then each red re-run against a build of `main` (`46573d0a`):
**46 red cases were caused by this pass, 78 were already red on `main`, 6 could not be compared.** Every
caused case is now green, re-pointed, or skipped with a reason. Retirements call
`test.skip(true, retired(why, by))` from `tests/e2e/inkRetired.ts`, so each skip names its replacement lock.

**Two caused reds were real regressions and were fixed in the product, not the test:**
- `qaV11` mobile 768 — the drawer inset applied at exactly 768px, where the drawer is a full-screen sheet.
  The inset block now starts at 769px.
- `switcherV2` S8 — reduced motion did not reach the switcher's portalled menu. A reduced-motion rule for
  `.ws-ms-menu--port` now covers it.

**A third gap found while re-pointing:** the card the dock chip peeks (`.ac-ov[data-peek] .ac`,
`.qcv-qm--peek .qcv-qm-card`) did not move with the inset drawer and the risen chip, so it sat 16 from the
drawer and 2px above the chip. It now follows the chip: 24 beside the drawer, bottom 88 (CL13-10 unchanged).

### Retired (skipped, with the lock that replaces each)

| Case | Replaced by |
|---|---|
| quietBar Q1–Q5/Q7, Q6, Q9 | INK1, INK2, INK6, INK14 |
| shellV3 L1–L8 per-width matrix (bar parts), L10, L12 | INK1, INK7, INK9, INK11 |
| shellV3Mock (the app against the v3 mock) | INK1–INK11 |
| plateHeader PH6 | INK1 |
| livingHeadersV3 LH5 | INK6 |
| sidebarCapture (the sidebar at 1280/1440) | INK8 |
| switcherV2 S1–S3 | INK10 |
| pageHeaderV1 §1 (two bar cases; "no breadcrumb anywhere" kept, it still holds) | INK1 |
| pageHeaderV2 §1 | INK5, INK10 |
| analyticsV17 AN17-1, AN17-3 | INK1, AN17-2 |
| qcV126 QC126-1, QC126-3 | INK1, HC1–HC7 |
| compsMat S1 | INK6 |

### Re-pointed (same claim, new geometry; each carries a `RE-POINTED (ink shell v1)` comment)

| Case | Change |
|---|---|
| queryActions §A | drawer right edge = viewport − 8 |
| calDrawer65 §D | drawer right ≈ 8 |
| analyticsV17 AN17-2, contactV13 CL13-1 | the band's right pixel read at `main.r − 8 − 3` |
| analyticsV17 AN17-15 (both readings), qcV126 QC126-12, contactV13 CL13-9 | floating tab 20 from the sheet (was 24 from the window) |
| contactV13 CL13-10 | the chip's foot 28; the peeked card follows it (product fix above) |
| agentCardV1 phase 5 | dock foot 28; parked chip `[28, 28, radius, bg]` |
| pageHeaderV1 §2 | right margin measured to the sheet; content = min(1360, main − 8) − 2 gutters |
| pageHeaderV2 §4.5 | the inert press is the bar's spacer (the toggle and switcher left the bar) |
| shellV3 L9 | hover the logo row before pressing the collapsed toggle (INK14) |
| settingsMode window | the window paints the sheet in both modes, the same surface; border 0, no shadow |
| manuscriptsV13 geometry vs mock | column = the mock's less the 8px frame; cards and tiles = their share |
| switcherV2 S8 | the chevron's turn is asserted as "not instant" |
| todoV2 phase 1 | no change — it failed only on a stale bundle and passes on a fresh one |

### Already red on `main` before this pass — not ours, left alone (78 cases in 36 files)

| File | Cases | Which |
|---|---|---|
| `accountAcceptance.measure.ts` | 2 | the bare route and an unknown sub-path both land on Profile; the dirty-name warning fires on leaving, and nothing is discarded |
| `accountSave.measure.ts` | 1 | leaving a section with a dirty field warns and CONTINUES — never block |
| `completionLeaves.measure.ts` | 1 | completion holds through the window, then the row leaves and the sheet |
| `completionPathsPhase5.measure.ts` | 2 | Phase 5 — /todo completes with a toast and Undo, at three widths; Phase 5 — the calendar completes with a toast and Undo, and the month  |
| `completionUndo.measure.ts` | 1 | a completion's Undo reverts the stored record |
| `compsMat.measure.ts` | 6 | S2/S3/S5/S6 · frame · 1280 · expanded; S2/S3/S5/S6 · frame · 1280 · collapsed; S2/S3/S5/S6 · frame · 1440 · expanded; S2/S3/S5/S6 · frame · 1440 · collapsed … |
| `contentGeometry.measure.ts` | 1 | content geometry is unchanged by the masthead's width system |
| `dashTopRow.measure.ts` | 4 | dashboard top row — v33 › the reference width: geometry, reported agai; dashboard top row — v33 › the v34 mockup: the bar's controls, the cont; dashboard top row — v33 › the v34 mockup: at 1280 the control wraps IN; dashboard top row — v33 › the v34 mockup: the bar's shared controls ar |
| `detachPackage.measure.ts` | 1 | F-O — attach, detach from the same menu, and survive a reload |
| `framePort.measure.ts` | 1 | frame port |
| `illoRules.measure.ts` | 15 | ⚠️ RULE 3 · THE ARTWORK REACHES BACK TO THE REVEAL — Submission packag; ⚠️ RULE 3 · THE ARTWORK REACHES BACK TO THE REVEAL — Query Centre — 12; ⚠️ RULE 3 · THE ARTWORK REACHES BACK TO THE REVEAL — Submission packag; ⚠️ RULE 3 · THE ARTWORK REACHES BACK TO THE REVEAL — Query Centre — 14 … |
| `journeyRound.measure.ts` | 1 | journey round |
| `manuscriptsV13.measure.ts` | 1 | assertion floor |
| `matrix.measure.ts` | 2 | MATRIX 1440x900; MATRIX 1280x800 |
| `moveDest.measure.ts` | 1 | D8 — the DESTINATION derives too, and undo returns it exactly |
| `moveEntry.measure.ts` | 1 | Part 1 — Move across two queries, with undo, and both sides recomputed |
| `nbPaper.measure.ts` | 4 | Phase 1 — flat paper › the surfaces themselves stay flat — the lock th; Phase 2 — example papers › keep this → a real note appears, the exampl; Phase 3 — drag to reorder › the third onto the first, then RELOAD — th; Phase 4 — link-aware bodies › one anchor, zero img elements, and the m |
| `nbPaperRecon.measure.ts` | 1 | 0.4 — what paints the fade, on the card and the composer |
| `packBPhase2Commit.measure.ts` | 1 | Pack B Phase 2 — a primary commits, and the dock lands on the pre-writ |
| `packCPhase1.measure.ts` | 1 | Pack C Phase 1 — a completion through the pane still writes, and the t |
| `packCPhase3.measure.ts` | 3 | Pack C Phase 3 — the pane over the calendar, at three widths; Pack C Phase 3 — parity with /todo, the jump, the hand-off, and the to; Pack C Phase 3 — a completion on the calendar toasts, offers Undo, and |
| `pageHeaderV1.measure.ts` | 5 | §1 · the bar is full width, 64px, and carries no breadcrumb; §1 · the bar holds its place while the page scrolls, and gains its sha; §2 · the Query Centre's rail ends where the column ends, and sticks 16; §3.1 · the full header — Query Centre, at 1280 and 1440 … |
| `pkgMat.measure.ts` | 1 | S1–S7 · the shell conformance, once (1440, expanded, filled) |
| `plateHeader.measure.ts` | 3 | PH1–PH4 · the Query Centre's plate at 1280; PH1–PH4 · the Query Centre's plate at 1440; PH5 · the plate is the Query Centre's alone |
| `popupBulk.measure.ts` | 1 | bulk ticks |
| `popupRound.measure.ts` | 1 | popup round |
| `qaShots.measure.ts` | 1 | journey pictures — app vs mock at 1440 |
| `qcCorrectionUndo.measure.ts` | 3 | A2·1 · remove both, then undo restores both stores byte-identically (3; A2·2 · removing a closure reopens the query; A2·3 · a newer write retires a pending undo |
| `qcJourneyPalette.measure.ts` | 1 | §2 — the journey paints exactly what it painted before (7.0m) |
| `qcMove.measure.ts` | 3 | B4·1+2 · move, both sides match the preview; undo restores both; B4·3 · a closed target stays closed, and the entry lands in its place; B4·4 · a note naming the source's agent is flagged before it travels |
| `qcPalette.measure.ts` | 1 | §1 — the page paints exactly what it painted before |
| `qcV126.measure.ts` | 1 | QC126-2 · no stragglers |
| `tightened.measure.ts` | 3 | Phase 1 — one toolbar: the row, the title census, the meter's figures ; Phase 2 — the dense list: 44 both states, the strip, the keys (1.5m); Phase 3 — the sheet is a document: the header, the title, the measures |
| `tlNote.measure.ts` | 1 | Phase 4 — notes appear where there is an action, and nowhere else (7.0 |
| `viewsClaims.measure.ts` | 1 | the three views' own claims |
| `writerDeploy.measure.ts` | 1 | writerExpectedDate write is accepted by the deployed dev rules |
