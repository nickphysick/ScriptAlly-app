# Manuscript switcher v2 and the keyboard shortcuts sheet — run report (29 Sep)

**On `main`:**
- P1 `9e6cd935`: the switcher, M, the switch feedback, and the one shortcuts registry.
- P2 `f5391fa5`: the shortcuts sheet.

**Not deployed.** Nick deploys.

**Ref:** `design-refs/shell/manuscript-switcher-v2.html`, SHA256 `2920685e32d0bd201e6f924d5e7d513c3e55ec06bcaf77637c8e6d12e5586315`, enrolled (98 refs guarded). Built on the quiet bar (`reports/quiet-bar/REPORT.md`).

## False premises, first

1. **"More manuscripts: coming soon" is not the add gate.** It's a tag on the Manuscripts page, shown only while the account has at most one book. The real gate is `db.addManuscript`. "Add a manuscript" opens the form for everyone, and on save a free account that already has one book gets the form's own error: *"Free tier is limited to 1 manuscript…"*. The footer item routes to that same flow, so the behaviour is unchanged.
2. **S2's image branch can't be reached on a rendered page.** `coverUrl` is deliberately outside the manuscript-update rules allowlist (a rules comment says it "stays out"), so no record on dev can carry one. The image branch is proved at render level (`barSwitcher.test.tsx`). It becomes reachable in the app when the rules admit `coverUrl`; `firestore.rules` was not touched.
3. **"Every existing binding reads its key from the registry" reaches into Query Centre internals, and two of the bindings there don't reach the page:**
   - `/` focuses `browseSearchRef`, which is attached to nothing, so the handler always returns.
   - ⌘↵ saves create mode, whose form isn't shown to be reachable on today's page.

   Neither is listed on the sheet, which lists only shortcuts that exist. Both handlers were left in place: they're Query Centre internals, so they're flagged here rather than deleted.
4. **"Reduced motion: 0s" is 0.01ms in this app.** The shell's single `.ws-app *` reduced-motion rule sets it (see the quiet-bar report). S8 is held to that value, and was proved red by deleting that rule.
5. **The ref's tile and facts lines say more than the brief allows, and the brief was followed:**
   - The ref's tile reads "REVISING · NO QUERIES YET" for a book with no queries. The tile follows the brief and S1: status, plus "N with you" only when the book has live queries.
   - The ref's shelved row reads "SHELVED MAR 2025", which needs a shelving date. The facts line uses only the brief's forms, from existing derivations: "Querying since {date} · N queries", "N queries", or "No queries yet".
6. **The Help control has no menu.** Its single action is the Help centre page. Per the brief, "Keyboard shortcuts" sits where that action lands: the Help centre header's secondary action.
7. **The ref's footer reads "Add a manuscript" with a plus icon; the brief's text reads "+ Add a manuscript".** The mock won: it's an icon and "Add a manuscript".

## Step 0

**Tree:** level with `main`, on top of the quiet bar.

**Baselines:** tsc 0 · `build:dev` clean · Vitest 8,243 passed | 3 skipped.

### Functions reused, none invented

| What | Where |
|---|---|
| Status label | The `ManuscriptStatus` value itself: Drafting · Revising · Ready to Query · Querying · Shelved · On Submission. The edit form's select renders these strings. (The Manuscripts page separately derives "Querying since / Shelved / Not yet querying" from queries, not from the status.) |
| Shelved | `isShelvedPresentation` (`lib/manuscriptPage`) |
| With you | `isWithYou` (`lib/qcSummary`), over the book's queries that are not `isClosedStatus` (`lib/qcStages`) |
| Earliest send | `queryingSince` (`lib/manuscriptSummary`, the live Manuscripts page's), formatted by `dayMonth` (`lib/dates`) |
| Toast | `useToast` / `showToast` (`components/toast/ToastProvider`); `useOptionalToast` added alongside it, for bare unit harnesses |
| Stage entrance | `StagePage`'s `stage-page-on` (keyframe `pageIn`, 180ms, with a 250ms guarantee). It now also answers `sa:stage-replay`. |

### Tests that pinned the switcher

- `barPageName.test`: `switcherMeta` stays; `switcherRowMeta` and `coverTint` are retired.
- `workspaceShell.test`: the tile title and meta sizes.
- `pageHeaderV2` §4.5 (the menu's rows and tick): still green.
- `pageHeaderV2Lib` / `shellV3Lib` / `quietBarLib`: they find the switcher by `[data-shell="switcher"]`, which is unchanged.

### The binding census, in full

116 source files carry a key handler, and all were read.

**No binding of `M` or `?` exists anywhere, so the Step 0 ✗ does not fire.** One handler catches any printable key: the type-ahead on the retired three-column query list (`Queries.tsx:4964`). That list is never rendered, because `GRID_IS_THE_PAGE` is `true`.

**Bindings that fire inside inputs:**
- **Every global Escape handler**, which is expected for Escape.
- **⌘K,** twice:
  - `usePalette.tsx:64`, deliberately unguarded;
  - `ToDoPage.tsx:569` via `focusesSearch`, which focuses the To-do search. **Both fire on `/todo`.** That is pre-existing; it was recorded, not changed.
- **⌘\\** (sidebar).
- **⌘↵** (Query Centre create mode, and the To-do composer).

Everything below was compiled by two read-only agents, one per half of the file list. Line numbers are at `e0023311`.

#### Global (document or window) bindings

| Key(s) | Action | file:line | Fires in inputs |
|---|---|---|---|
| ⌘K / Ctrl+K | toggles the search palette | shell/usePalette.tsx:64 | yes (deliberate) |
| ⌘\\ / Ctrl+\\ | toggles the sidebar | shell/useSidebarCollapsed.ts:60 | yes (chord) |
| `[` | toggles the sidebar | shell/useSidebarCollapsed.ts:61 | no |
| ⌘Z / Ctrl+Z | undoes the last action (while an undo toast is live) | queryActions/UndoBar.tsx:67 | no |
| `/` | focuses the Query Centre browse search — **dead: the ref is attached to nothing** | Queries.tsx:3604 | no (SELECT not guarded) |
| ⌘↵ / Ctrl+↵ | saves Query Centre create mode — **reachability unverified** | Queries.tsx:2342 | yes (deliberate) |
| `n` | opens the add-comp form | manuscripts/ComparableTitlesPage.tsx:109 | no |
| `/`, ⌘K | focus the To-do search (`focusesSearch`) | todo/ToDoPage.tsx:569 | `/` no; ⌘K yes |
| `j`/↓, `k`/↑, ↵, `s`, `d`, Esc | To-do list navigation and actions (`listKey`) | todo/ToDoPage.tsx:1344 | no |
| Esc | clears the search, else resets the filters | todo/ToDoPage.tsx:1307 | no |
| Esc | closes the filter and sort menus | todo/ToDoPage.tsx:1209 | yes |
| ←, →, `t` | the Calendar's week back and forward, and today | todo/TodoCalendarPage.tsx:429 | no |
| `1`–`9` | chooses the fork option (only while at a fork) | todo/TaskPane.tsx:417 | no |
| Esc, ←, → | query panel: close and step (only while open) | queries/QueryPanel.tsx:179 | no (SELECT not guarded) |
| Esc | closes settings mode | shell/WorkspaceShell.tsx:241 | no |
| Esc, Tab, ↓, ↑, Home, End | QcMenu popover | queries/centre/QcMenu.tsx:52 | yes |
| Tour: Esc, ←, →, ↵ | tour steps | Tour.tsx:77; dashboard/OneScreenTour.tsx:98 | yes |

**Escape-to-close handlers (global).** Each closes its own surface while open, and all fire in inputs.
- **Pages and forms:** AccountSettings.tsx:363 · AddManuscriptFocusForm.tsx:95 · Dashboard.tsx:697 · Form11Drawer.tsx:270 (suppressed during inline edit) · MaterialsField.tsx:68 · TasksPopover.tsx:57 · forms/FormShell.tsx:100 · emailImport/PasteEmailFlow.tsx:32 · dev/BackgroundLab.tsx:202
- **Agents and Contact list:** agents/AgentCountryPicker.tsx:45 · contact/ContactAddCard.tsx:81 · contact/ContactControls.tsx:111 · contact/ContactHeader.tsx:62 · contact/ContactProfile.tsx:123
- **Analytics and dashboard:** analytics/ShareCard.tsx:40 · dashboard/DashPopup.tsx:185 · dashboard/DeskTooltip.tsx:71 · dashboard/QueryCard.tsx:129
- **Pickers:** forms/BrandDatePicker.tsx:144 · forms/BrandDropdown.tsx:44 · forms/GenrePicker.tsx:127
- **Notes:** notes/NoteEditor.tsx:56 · notes/NotesDesk.tsx:103 · notes/NotesSeeAllOverlay.tsx:33
- **Packages:** packages/MaterialModal.tsx:142 · packages/PkgMaterialDrawer.tsx:50 · packages/PkgMaterials.tsx:58
- **Queries and the Query Centre:** queries/CorrectionDesk.tsx:89 · queries/centre/QcExpanded.tsx:138 · queries/centre/QcQueryModal.tsx:46 · queryActions/DrawerShell.tsx:80 · reading-pane/PackagePicker.tsx:54
- **Shell:** shared/SlideOver.tsx:65 · shell/AccountMenu.tsx:96 · shell/BarSwitcher.tsx · shell/F12Shell.tsx:161, 252, 314 · shell/MobileSheet.tsx:40 · shell/PageHeader.tsx:254 · shell/TopNavShell.tsx:147 · shell/useOverlay.ts:126 · toast/ToastProvider.tsx:131
- **To-do and Calendar:** todo/AnchoredPanel.tsx:54 · todo/AssistantPromo.tsx:73 · todo/ConfirmAsk.tsx:41 · todo/HousekeepingSweep.tsx:184 · todo/PortalMenu.tsx:67 · todo/SnoozeDial.tsx:278 · todo/TaskDismissDialog.tsx:40 · todo/TodoCalendarPage.tsx:775, 806 · todo/TodoTour.tsx:68 · todo/useTodoToast.ts:120
- **Marketing:** marketing/MarketingShell.tsx:130

#### Local bindings

These fire only while the element or its descendants have focus. They are keys on inputs, menus, rows and controls: Enter/Space to activate, arrows to move, Escape to cancel, and ⌘↵ to save a composer.

- **Forms and pickers:**
  - AddAgentFocusForm.tsx:398 · AddManuscriptFocusForm.tsx:181 · EditAgentDrawer.tsx:511 · EditQueryDrawer.tsx:440, 484, 625, 639 · Form11Drawer.tsx:117–131 · MaterialsEditor.tsx:130
  - agents/FilterDropdown.tsx:79 · agents/contact/ContactAgentForm.tsx:260 · agents/contact/ContactRows.tsx:98, 114 · containers/InlineText.tsx:77
  - forms/BrandDatePicker.tsx:156, 203 · forms/BrandDropdown.tsx:67 · forms/CountryCombobox.tsx:139 · forms/GenreCombobox.tsx:89 · forms/GenrePicker.tsx:216
- **Dashboard:** dashboard/DashboardStatsRow.tsx:453 · dashboard/DiaryCarousel.tsx:253 · dashboard/GoalTargetSheet.tsx:70 · dashboard/OneScreenChart.tsx:437 · dashboard/OneScreenMinimap.tsx:78 · dashboard/OverToYou.tsx:817 · dev/BackgroundLab.tsx:134
- **Manuscripts, materials and notes:** manuscripts/CompCard.tsx:88 · manuscripts/CompForm.tsx:106–185 · manuscripts/ManuscriptPlate.tsx:246–464 · materials/SampleSpecPicker.tsx:244, 288 · notes/NoteQuickAdd.tsx:83 · notes/NotesDesk.tsx:199 · onboarding/SmartImportReview.tsx:354
- **Packages:** packages/PkgCard.tsx:93 · packages/PkgComposer.tsx:86 · packages/PkgMaterialDrawer.tsx:131 · packages/PkgMaterials.tsx:70, 101, 184
- **Queries and the Query Centre:**
  - queries/AgentQuickAdd.tsx:79 · queries/CorrectionDesk.tsx:197 · queries/MarkSentDesk.tsx:117 · queries/QueryCard.tsx:160 · queries/QueryLogSheet.tsx:229 · queries/RespondDesk.tsx:152 · queries/StepStack.tsx:93
  - queries/centre/QcCentre.tsx:177 · QcFan.tsx:137, 199, 221 · QcList.tsx:70 · QcTimeline.tsx:516, 687
  - queryActions/journeys/LogJourney.tsx:355, 596 · QueryPicker.tsx:52
- **Reading pane:** reading-pane/CorrectionSheet.tsx:153, 255, 360, 458 · NotesThread.tsx:187, 246 · QueryTimeline.tsx:738
- **Settings and shell:** settings/AddPassword.tsx:115 · settings/SettingsRail.tsx:68 · shared/timeline/TimelineBoard.tsx:693 · shared/timeline/boardParts.tsx:325 · shell/WorkspaceShell.tsx:600 · shell/SearchPalette.tsx:140 · shell/useOverlay.ts:135 (Tab trap)
- **To-do:**
  - todo/PortalMenu.tsx:88, 129 · todo/SnoozeDial.tsx:191 · todo/TagPicker.tsx:77 · todo/TagsSheet.tsx:95 · todo/TaskList.tsx:227 · todo/TaskPaneBody.tsx:613, 679, 694
  - todo/ToDoPage.tsx:2488 · todo/TodoCalendarPage.tsx:1677 · todo/TodoNoteboardPage.tsx:415, 439, 479, 699
- **The retired three-column list** (never rendered): Queries.tsx:4955–7910.

## The registry (`lib/shortcuts.ts`)

**It lists only bindings verified to reach the page.** Each entry names the file that binds it, and a unit lock checks that file reads the entry.

| Scope | Shortcuts |
|---|---|
| Everywhere | ⌘K search · ⌘\\ or `[` sidebar · M switch manuscript · ? keyboard shortcuts · ⌘Z undo, while its note is showing |
| To-do list | `/` find a task · J or ↓ · K or ↑ · ↵ open · S snooze · D dismiss · Esc close |
| Calendar | ← and → a week · T today |
| A task's choices | 1–9 |
| Comparable titles | N add a comp |

**Every one of those bindings now reads its key from the registry.** The files are usePalette, useSidebarCollapsed, UndoBar, BarSwitcher, ShortcutsSheet, taskShortcuts, TodoCalendarPage, TaskPane and ComparableTitlesPage. Inside a page, the only edits are to the key comparisons.

## Locks

All are rendered at 1280 and 1440 with fonts loaded, except where marked as unit tests.

| Lock | Red before (where, count) | Mutation that turned it red |
|---|---|---|
| S1 tile | main: ×2 per case (size, standing) | put the genre line back: ×4 |
| S2 cover | main: ×2 (tile in `--o-ms`, no icon) | ignore `coverUrl`: unit, 2 of 3 |
| S3 menu | main: 340/8 anchor, facts line, shelved group | drop the shelved grouping: ×4 |
| S4 keys | main: Enter/Space/↓ focus, Home/End, Tab | remove the focus return: ×6 |
| S5 M | main: M opens nothing | bind M without the guard: ×6 |
| S6 switch | main: no toast, no entrance | toast on every pick: ×1 |
| S7 sheet | the Phase 1 build: no sheet (the run timed out on the Help item) | a registry entry with no binding: unit, 2 of 8 |
| S8 motion | main: crashed (no menu until open) | delete the shell's reduced-motion rule: ×2 |

- **Evidence ledgers:** `reports/switcher-v2/red-on-main/`.
- **S3 needs a shelved book** the harness account doesn't have. `tests/e2e/seedSwitcherShelved.mjs` shelves "Nothing In It Yet" for the run and restores it in the same test.
- **Regression against the new build:** switcherV2, quietBar, pageHeaderV2, shellV3, compsMat, pkgMat — **80/80**.

**Gates:** tsc 0 · Vitest 8,254 passed | 3 skipped (8,257) · production build clean.

## Pictures

`reports/switcher-v2/shots/`:
- `tile-*` (at rest);
- `menu-*` (open, with the shelved group seeded);
- `sheet-*` (open).

Each is at 1280 and 1440.

## Deferred, with a proposed owner

- **The Query Centre's dead `/` handler and unverified ⌘↵ create path** (Queries.tsx:3604 and :2342). Owner: the Query Centre session. Either wire `browseSearchRef` or delete the handler; then confirm create mode's reachability and register ⌘↵.
- **⌘K fires twice on `/todo`** (palette and To-do search). Owner: the To-do session, to decide which one owns it there.
- **`coverUrl` in the manuscript-update rules.** Owner: Nick (rules), when cover upload lands. S2's rendered image branch lights up then.
