# Shell nav v3: five places on the rail, each place's pages as folder tabs, no More

13 Nov 2026. Branch `shell-nav-v3`, cut from `dev/clh2-nwv1-clh21` (2d7e66e69), the line dev was serving when the work started (`index-B3ztqgGG.js`). Ref: `design-refs/shell-nav-v3.html` (SHA256 `304647151d7035a4ec32d8859a70ff693b0106fa1c690cb722486a62e55b1266`, checked before any edit).

**Deployed to dev:** `index-Bh4UTjIK.js`, built from `dev/clh2-nwv1-clh21-ql21-nw11-snv3` (09901d3b0). That branch is `shell-nav-v3` merged onto the line dev served at deploy time (`dev/clh2-nwv1-clh21-ql21-nw11`, `index-DTvKjqCk.js`). The served hash matched the build. Prod was not touched.

## 1. False premises and conflicts

1. **The brief's stability lock cannot hold with the ref's values as written.** The lock says: on Query letters, click Comparable titles; "no resting tab that was left of it has moved". Packages is left of Comps and resting in both states. When Letters settles it shrinks: the type goes from 19px to 16px, the padding from 22px to 16px, and its 10px right lane goes. Every tab to its right then moves left. Measured at 1512×982: **Packages moved −33.4px**, Comps −23.5px. No layout keeps every tab still while one tab grows, unless each slot reserves its risen width, which would change the ref's 6px gaps.
   - What holds and is locked (SNV3-E2): the order never changes; the first tab never moves; and a tab left of both the old and the new current tab never moves (Comps → Manuscripts: Letters and Packages move 0px).
   - The −33.4px is recorded, not asserted. **For Nick:** keep the ref's look and accept this, or reserve each tab's risen width so nothing moves.
2. **`docs/decisions/` did not exist on this line.** The dev line predates the 11 Nov CLAUDE.md diet; its CLAUDE.md is 955 KB. I created `docs/decisions/shell-nav-header.md` as main's copy with the Shell nav v3 section added at the top, so a later merge with main meets near-identical text.
3. **The other premises held:**
   - The rail was rail v2: Dashboard, Queries, Agents, Letters, Tasks, then More (`RailMore`).
   - There were seven sections (workspace, queries, agents, book, materials, tasks, founding).
   - The folder tab drew the current page first as `.ws-ftab`, siblings after, with a `.ws-ftg` group label.
   - One detail: Materials' order on this line was letters, comps, packages. The brief's order (letters, packages, comps) is now in place.
4. **The page-guide pill** is `PageChecklist` (`src/components/shell/guide/PageChecklist.tsx`), styled by `src/components/shell/guide/pageChecklist.css`. It is portalled into the bar's page slot, left of "?".
5. **The onboarding frame still uses the old `FolderTab`.** `SetupFrame` (`src/components/onboarding/`, out of bounds) renders it with its own group label ("Your account") and sibling tabs. So `FolderTab` / `planTabs` stay, used only by SetupFrame, and the workspace bar renders the new `TabStrip`. "No group label anywhere" is true of the workspace bar. It is not yet true of the sign-in and set-up frame.

## 2. Gates: baseline and final

| Gate | Baseline (before any edit) | Final |
|---|---|---|
| `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` | exit 0 | exit 0 |
| `npm run build` | `✓ 421 modules transformed.` exit 0 | `✓ 421 modules transformed.` exit 0 |
| `npx vite build --mode development` | `✓ 4021 modules transformed.` exit 0 | (deploy line, `build:dev`) `✓ 4018 modules transformed.` exit 0 |
| `npx vitest run` | `Test Files  2 failed \| 849 passed \| 1 skipped (852)` / `Tests  3 failed \| 12372 passed \| 4 skipped (12379)` | `Test Files  2 failed \| 851 passed \| 1 skipped (854)` / `Tests  3 failed \| 12394 passed \| 4 skipped (12401)` |

- The 3 Vitest failures are the same in both runs and existed before this work: `emuGuard.test.ts` (1) and `firestoreTarget.test.ts` (2).
- The deploy line `…-ql21-nw11-snv3` passed tsc and the touched suites before the deploy: `Tests 1057 passed | 1 skipped (1058)`.

## 3. Commits (all on `shell-nav-v3`, pushed)

- **0a8b28526 — phase 1: five sections, a rail of places, More retired.**
  - Added: design-refs/shell-nav-v3.html.
  - Changed: src/lib/workspaceNav.ts, src/lib/workspaceShell.ts, src/lib/searchPalette.ts, src/components/shell/SidebarRail.tsx, sidebarRail.css, WorkspaceShell.tsx, AppShell.tsx.
  - Deleted: RailMore.tsx, railMore.css.
  - Tests: workspaceNav.test.ts, navProMarks.test.tsx, workspaceTasksNav.test.tsx, shellV2Smoke.test.tsx, barPageName.test.ts, todoWorkspace.test.ts, tests/e2e/sidebarRail.measure.ts, tests/e2e/yourNotesV1.measure.ts.
- **a90c907df — phase 2: tabs in a fixed order, the current one rises in place.**
  - Code: src/components/shell/FolderTab.tsx (`TabStrip`, `planStrip`), WorkspaceShell.tsx, inkShell.css, inkTabAid.ts.
  - New tests: tabStrip.test.tsx, tests/e2e/shellNavV3.measure.ts.
  - Rewritten probes: sidebarRail SR1.1, calendarRetired L5, sidebarNav SB1, manuscriptsV27, shellMenus MS12.
  - Retired: inkShell INK6.
- **9a5896beb — phase 3: Your notes in the account menu, quieter guide pill, decisions doc.**
  - Code: InkAccountMenu.tsx, AccountMenu.tsx, AppShell.tsx, accountMenuInk.css, guide/PageChecklist.tsx, guide/pageChecklist.css.
  - Tests: accountMenuNotes.test.tsx, tests/e2e/shellNavV3.measure.ts.
  - Docs: docs/decisions/shell-nav-header.md.
- **71361e328 — fix: the measurer carries no live hooks; the finished guide pill is an outline.** FolderTab.tsx, guide/pageChecklist.css, accountMenuNotes.test.tsx, docs/decisions/shell-nav-header.md. This fixed two faults the first e2e run found (section 4).
- The report commit follows this one.

Dev-only merge branches (pushed):
- `dev/clh2-nwv1-clh21-ql21-nw11-snv3` (09901d3b0) is the one deployed.
- `dev/clh2-nwv1-clh21-ql21-snv3` (f11131c26) was merged onto the Query letters v2.1 line. Its deploy was stopped by the served-hash guard because dev moved to the non-workspace v1.1 line in between. It was never deployed and can be deleted.

## 4. Locks and their red-before proofs

**Unit locks.** Each lock was proved red by a source mutation, applied by a script that restores the file afterwards. Each mutation made exactly the named lock fail.

| Lock | File | The mutation that turned it red |
|---|---|---|
| SNV3-M1, M2 five sections, in order; pages in order | workspaceNav.test.ts | a "Your book" section put back with Manuscripts and Versions |
| SNV3-M3 no page in two sections; every nav path in one; /your-notes in none | 〃 | Founding writer section put back (and, separately, Manuscripts added to Agents) |
| SNV3-M4 tab labels | 〃 | Comps' `tabLabel` removed |
| SNV3-M5 Pro marks on pages, none on sections | 〃 | Comps' Pro mark removed |
| SNV3-M6 no rail flags | 〃 | `rail: true` back on Dashboard |
| SNV3-M7 + R5 a locked def → the first unlocked page; Free Materials → /manuscripts | workspaceNav.test.ts, navProMarks.test.tsx | `railTargetFor` always returns def |
| SNV3-M8 + R2 the lit row on each of the 13 pages | 〃 | rail v2's rule (lit only on the def page) |
| SNV3-R1 five rows, baked labels, no More | navProMarks.test.tsx | a More button added back |
| SNV3-R3 nothing lit on /your-notes, /account | 〃 | Dashboard lit when off the nav |
| SNV3-R4 no tooltip on the five rows | 〃 | `tip(sec.label)` back on the rows |
| SNV3-T1 tabs = section pages in nav order, on all 12 pages of four sections | tabStrip.test.tsx | the current page moved to the first slot (the old behaviour) |
| SNV3-T2 no group label in the bar, off-nav pages included | 〃 | `<small class="ws-ftg">` back in the tab |
| SNV3-T3 a nav landmark of buttons, not ARIA tabs | 〃 | `role="tablist"` added |
| SNV3-T4 right fillet always, left only when not first | 〃 | left fillet drawn on a first tab |
| SNV3-T5 locked tab carries the PRO tag | 〃 | `locked: false` |
| planStrip: current never an icon / never hidden | 〃 | the current tab allowed to retreat |
| planStrip: resting tabs retreat from the right | 〃 | retreat from the left |
| SNV3-A1 Your notes between Task settings and Help centre | accountMenuNotes.test.tsx | row renamed (moves its position in the list) |
| SNV3-A2 it goes to /your-notes | 〃 | goes to /help |
| SNV3-A3 "{n} new" | 〃 | the mark never drawn |
| SNV3-A4 the nav's notes glyph | 〃 | BookOpen instead |
| SNV3-P2 the pill's outline, no blush; finished pill no fill | 〃 | `#fbeee8` back; separately the sage fill back on `.all` |

**E2E locks.** `tests/e2e/shellNavV3.measure.ts` ran on the emulators, one worker. Every lock also checks itself in the same run: it breaks the page in place and asserts its own check now fails.
- **SNV3-E1**, order on 12 pages. Self-check: the current tab moved first in the DOM.
- **SNV3-E2**, stability (see section 1). Self-check: `.is-cur { order: -1 }`.
- **SNV3-F1**, fit at 1280×800, 1512×982 and 1728×1117 on all five Materials pages, with the sidebar as a rail and pinned. Self-checks: resting tabs widened past their fitted width; the current name clipped.
- **SNV3-F2**, a long section (dev aid `__SA_INK_TABS=6`) goes full → icon → +N. All four modes were seen.
- **SNV3-E4**, no group label on 17 routes. Self-check: a label injected.
- **SNV3-A1e**, the menu's rows, then the click lands on /your-notes and the tab reads "Your notes". Self-check: the row moved.
- **SNV3-P1**, the pill's computed background on /agents and /queries. Self-check: the blush back.

Run 1, at 9a5896beb: 18 passed, 4 failed. All four failures are explained:
- **calendarRetired L5 ×2 (fixed).** It read "To-do list" twice. The strip's hidden measurer drew its risen copy with `.ws-ftab .ws-ftn`, and its boxes have size. The measurer now carries none of the live tab's hooks.
- **SNV3-P1 on /queries (fixed).** It read `rgb(224, 229, 221)`. The harness's Query Centre guide is finished, and I had kept the finished pill's sage fill. It is now the same outline, with the ✓ and ring in `--sage`.
- **sidebarRail SR2.4 (not this pack's).** It still expects the old eight-row settings rail (Profile, Security, Alerts, Settings, Tasks…). Non-workspace v1 changed that before this branch was cut; `workspaceNav.test.ts` already asserts the five sections. I did not touch it, because the settings rail is out of bounds.

Run 2, at 71361e328: L5 ×2, SNV3-E1, E2, F1 ×2, A1e, P1 and S: **11 passed**.

Fit readings (SNV3-F1). Where the page has no guide, the pill is a 232px stand-in placed in the page slot; Manuscripts and Versions use their own pills. Every case read "ok".
- Rail, 1280: four names plus the last tab as an icon on Letters, Packages, Comps and Versions; all named on Manuscripts.
- Rail, 1512 and 1728: all named.
- Pinned, 1280: icons from the right (Letters: current + 4 icons; Manuscripts: 2 names, 2 icons, current).
- Pinned, 1512 and 1728: all named.

Pinned sidebar fit (SR5) at 1512×982: `{"heads":4,"rows":13,"sh":587,"ch":587,"cut":[],"card":true}`. The full feedback card shows and the nav does not scroll. It has 0px to spare.

Also green in run 1: SR1.1, SR2.1, SR2.5, SR6.1, SR6.2, SR6.3, MS12.

**Rewritten or retired**, by phase (Step 0.4's list):
- Phase 1:
  - workspaceNav.test.ts: the rail v1/v2 block and the four copy-pasted section-id bodies.
  - navProMarks.test.tsx: the More case was retired.
  - workspaceTasksNav, todoWorkspace, barPageName and shellV2Smoke were rewritten.
  - sidebarRail.measure.ts: SR2.1, SR2.2, SR2.4, SR2.5, SR6.1, SR6.2 and SR5 rewritten; SR6.3 added; RV2 and RV2.1–RV2.6 (More) retired.
  - yourNotesV1 YN-M4: its More half retired.
- Phase 2:
  - Rewritten: SR1.1, calendarRetired L5, sidebarNav SB1, manuscriptsV27's tab probe, shellMenus MS12 (now "Settings", no "ACCOUNT").
  - Retired: inkShell INK6 (superseded by SNV3-F1/F2).
  - Kept: `folderTab.test.ts`, because `planTabs` still serves SetupFrame.
- Still valid and not re-run: the many probes that read `.ws-ftab` / `[data-shell="tab"]` as the current tab (INK2–INK5, hp2Lib, sh2Lib, pk41, pk42, pageWidth, inkFixups, qcV136/137, contactV17, onbV5Import). The current tab keeps both hooks.

## 5. Screenshots and the comparison with the ref

All shots are at 1512×982 in `shots/`, with the sidebar as a rail:
- `01-dashboard`, `02-query-centre`, `03-responses`, `04-contact-list`, `05-query-letters`, `06-comparable-titles`, `07-manuscripts`, `08-todo-list`, `09-your-notes`, `10-account-menu-open`.
- Each page also has a `-bar` crop.
- The ref's three frames are `ref-frame1..3` (and `-bar`).

Tab strip against the ref's frames:
- **Frame 1, Contact list:** "Contact list" risen and first, with a right fillet only; "Discover" resting after a 16px lane. It matches.
- **Frame 2, Comparable titles:** Letters · Packages · **Comps** · Versions · Manuscript, Comps risen in place with fillets on both sides. It matches, including the short names.
- **Frame 3, Responses:** Query Centre · **Responses** · Analytics, the second tab risen. It matches.
- Ref tab widths: Letters 93, Packages 104, Comps (risen) 99.7, Versions 104.1, Manuscript 125.5 (frame 2). The app draws the same type and padding.

Visible differences, all in parts the ref marks as today's:
- The app has the beta strip above the bar.
- "Log a query" is today's split button; the ref draws a plain pill.
- The ref places its guide pill on every frame. The app shows one only where the page has a guide: the Contact list, the Query Centre and Manuscripts. Responses and Comps have none.
- The Query Centre's guide is finished for the harness account, so it reads "Query Centre: Learned ✓" as an outline. The ref draws only the live pill.
- The bright edge around that pill in `02-query-centre-bar.png` is the focus ring the test left after pressing Escape, not its resting style.

## 6. For Nick: the phone's section name

The phone's page title reads `workspacePageForPath`, so on a phone Manuscripts and Versions now name **"Materials"** as their section (they said "Your book"). The Dashboard's section is now "Dashboard" (it was "Workspace"); it is a one-page section, so the phone shows the page alone. Accepted as baked; the phone shell is untouched.

## 7. What still names "Your book", "Founding writer" or More

None of these is a nav section any more. Remaining mentions:
- `src/components/notes/YourNotesPage.tsx:6`: a comment saying "/your-notes (More › Founding writer)". It is a page body and out of bounds; the comment is stale.
- `src/marketing/routeTiers.ts:38`: a comment "under More › Founding writer". Stale.
- Not about the nav (copy, plan names, the phone's own rows):
  - "Your book" in onboarding (the set-up step), the phone's Profile row (`PROFILE_ROWS`), Responses and the Query Centre filter (the manuscript fallback), and the agent card's group.
  - "Founding writer" as the plan's name (Settings, the dashboard band, FeedbackDock, the phone's founding card).
- The onboarding frame's `FolderTab` still draws a group label (section 1, item 5).

## 8. Other notes

- **⌘K palette:** its items are unchanged. Your notes is now named in `PALETTE_PAGES` itself, since it left the sections. The page entries follow nav order, so Manuscripts and Versions now come after Comparable titles in the list.
- **CSS removed as dead:** `.wsr-pro` (no rail row is Pro now) and `.ws-gpro` (no section heading is Pro now). These were the only edits to the full sidebar's and the rail's sheets.
- **Robustness fix:** the strip re-fits when the bar's right group grows. A guide pill that arrives late moves the search field without resizing it, so observing the field alone would miss it.
