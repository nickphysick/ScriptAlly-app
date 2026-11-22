# Sidebar: short labels, Dashboard on its own, Tasks always visible — report (25 Oct)

Branch `submission-packages-v26`, worktree `../ScriptAlly-pk26`, on top of v26.1 (4ef6fca1).

## False premises

- **"TASKS: To-do list · Calendar · Noteboard."** The third page has been **Corkboard** since 12 Oct (Corkboard v1
  renamed the label and path; the id stayed `noteboard`). It keeps its name, and the order is unchanged.
- **The order and the groups were already as ruled**: Dashboard · Queries · Agents · Your book · Tasks, with each
  group's rows in the ruled order. Only the labels, the heading and the spacing changed.
- **"Card covers Calendar" is not a literal overlap.**
  - The nav already scrolled in its own region (`flex: 1; min-height: 0; overflow-y: auto`), and that region
    ended above the card.
  - But its scrollbar is hidden and it had no fade. So at the old 920px fold threshold, rows cut at the region's
    foot read as covered by the card, and the rows below them as gone. At 1512×982 the nav was 47px short with
    the full card up: Calendar half cut, Corkboard out of sight (see `shots/before/`).
  - The fix is the fold derived from the real list, plus the app's edge fade on the region.
- **"The shell's existing edge fade."** The sidebar had none. The shell's other fades (`.sv2-fade`, `.wpg-hem`)
  belong to the page and are hidden on the desktop. The nav uses the app's one shared mechanism, `EdgeFadeScroll`.

## Every place a nav label is defined, and what changed

| Where | What it holds | Changed |
|---|---|---|
| `src/lib/workspaceNav.ts` | **the one nav model.** The sidebar, the folder tab (its name and siblings, through `barPageName` and `tabSiblings`), the bar and the onboarding handoff read it | gained `navLabel: "Queries"` / `"Packages"` beside the full `label`s; the Workspace section gained `noHeading` (its label stays: the folder tab names the group) |
| `src/lib/workspaceShell.ts` | the types, `barPageName` | `ShellChild.navLabel`, `ShellSection.noHeading`, and `sidebarLabel()` (the sidebar's one reader) |
| `src/components/shell/WorkspaceShell.tsx` | the sidebar | prints `sidebarLabel(ch)` as the row's text, accessible name and collapsed tooltip; skips a `noHeading` section's heading. The folder tab still reads `label`. |
| `src/components/onboarding/HandoffNav.tsx` | the onboarding's copy of the sidebar | the same two changes, so the handoff shows what the app is about to show |
| **`src/lib/searchPalette.ts` — RESTATED** | the palette's own page table | "Packages" → **"Submission packages"** (the palette keeps full names; "Query Centre" already was) |
| `src/lib/railNav.ts` — restated | the retired rail's model (`label: "Submission packages"`) | unchanged: the live sidebar does not read it |
| `src/lib/topNav.ts` — restated | the retired top nav's menus | unchanged, same reason |
| `src/lib/dashEmpty.ts`, `pageChecklist.ts`, `helpArticles.ts`, `manuscriptV21.ts`, `todoBuckets.ts` | page names in page content | unchanged: full names, as ruled |

No other component prints the model's row labels. `AppShell` builds the model and passes it to `WorkspaceShell`;
`ShellSidebar` imports the types and is mounted nowhere. So the short labels appear wherever the sidebar's rows draw,
and nowhere else.

## Spacing and the fold

- **Dashboard on its own.**
  - In the ref, Dashboard sits **11px** under the manuscript selector and the QUERIES heading **15px** under
    Dashboard.
  - The ink shell's pin has `gap: 0`, so the room used to come from the WORKSPACE heading's 24px margin. With the
    heading gone, Dashboard sat flush under the selector.
  - Now Dashboard has an 11px margin above it, and the first heading 13px (plus the row's 2px). Measured: 11 and
    15 exactly (SB3).
- **The fold threshold: 920 → 994** (the card folds at `max-height: 994px`).
  - Measured on the new list (13 rows, 4 headings) by the nav's overflow plus the viewport, at 1512, 1440 and
    1280 wide alike. The full card shows every row from **995px** of window height; the folded button from **902**.
  - Below 902 the nav scrolls under its fade.
  - ⚠️ **So 1512×982 now shows the folded button, not the card**: the column is 13px short of holding the card.
    With the old 920, it held the card and cut two rows. If the card is wanted at 982, something has to give
    13px (see open items).
- **The edge fade.** The nav is the scroll element inside `EdgeFadeScroll` (new additive `scrollAs` prop, so it
  stays a `<nav>`). The frame is `.ws-navwrap`; its fade is the sidebar's own ground, `--ink-shell`. Settings mode
  now hides `.ws-navwrap`.

## Gates

| | Baseline (4ef6fca1) | Final |
|---|---|---|
| tsc | clean | clean |
| production build | clean | clean |
| vitest | 660 files, 10,430 passed, 3 skipped | 660 files, 10,430 passed, 3 skipped (new assertions are inside existing cases) |

## Locks

**Added: `tests/e2e/sidebarNav.measure.ts`.** Each lock was red on the build before this change (`SA_E2E_BASE_URL=dev`;
ledgers in `ledger/red-before-change/`) and green on this branch (`ledger/`). Breaks marked ✓ were also red here,
in-page (`ledger/mut-*`).

| Lock | Claim | Red before the change | In-page break |
|---|---|---|---|
| SB1 | the sidebar reads "Queries" and "Packages"; the folder tab on /queries is "Query Centre" (its Packages sibling "Submission packages"), on /queries/packages "Submission packages" (its sibling "Query Centre"); the palette finds both by full name | the sidebar read the full names; the palette had no "Submission packages" | — |
| SB2 (1512, 1280) | the Packages row is Versions' height and its PRO tag's right edge (±1); the label is whole and stops before the tag | label cut ("Submission pack…") | ✓ row 48 tall → 48 vs 33, 231 vs 224 |
| SB3 | Dashboard is the first thing in the nav, with no heading; the four headings in order; 11px and 15px | WORKSPACE heading first; 24 / −12 | — |
| SB4 (1512×1000, 1512×982, 1440×900, 1280×800, 1280×720) | no nav row's visible box meets the card; the nav ends above the card; the full card only where every row fits, and shown where it does (≥995); an overflowing nav shows its fade; the last Tasks row scrolls fully into view | full card at 982 and 1000 with 47/29px cut; no fade at any height | ✓ full card kept below the fold; ✓ fade removed; ✓ fold set too high |

**SB4's "row box" is the row's visible box, clipped by the nav's scroll region.** A row scrolled under the region's
edge is hidden by the region, not the card. Read literally, the pack's claim would fail at 1280×720 for a correct
page. The lock pairs it with "the full card only where every row fits", which is what fails for the real fault.

**Rewritten (lock changes), each stating its law:**
- `workspaceTasksNav.test` — the headings are Queries · Agents · Your book · Tasks, and Dashboard comes before
  them (was Workspace first).
- `workspaceShell.test`, `betaChrome.test`, `workspaceTasksNav.test` — anchored on the nav's class rather than the
  literal `<nav class="ws-nav"`, because `EdgeFadeScroll` renders the attributes in its own order. Each still
  asserts the same thing about the nav.
- `searchPalette.test` — "pack" finds "Submission packages".
- `workspaceNav.test` — gains the `navLabel`/`label` pairs and `noHeading`.
- `pk26.measure.ts` PK26-N — reads the row as "Packages". It passes on this build at 1512 and 1280.
- `qcV138.measure.ts` H1 — clicks "Queries". That click now works. H1 still fails later, at line 648, on this build
  and on the base alike, so that failure is not caused by this change.
- `inkShell.measure.ts` INK13 — title and comment say the fold is below 995 (its readings at 1000/900/800 hold).

**Suites that read the sidebar (`shellV3`, `shellV3Mock`, `sidebarCapture`, `inkShell`)** were run on this build and
the base. **The same 8 fail on both with the same messages** (L13, INK4/6/7/8/13/17/19), with 11 skipped on both.
None is new.

## Screenshots

`shots/before/` (the deployed build) and `shots/after/`: expanded at 1512×982 and 1280×720, collapsed at 1512×982.

## Dev deploy

Dev was serving the v26.1 deploy (`index-CN7x9BIo.js`). This change (19f80e8d) was merged onto the same dev branch:
**`dev/hm31-pv4-qc1492-dh41-cl24-hm32-pk26` 7b327c34**, with no conflicts.
- **Gates on the merge:** tsc clean; build clean; vitest 661 files, 10,433 passed.
- **Deployed** from a clean worktree. **Dev now serves `index-Bq_JbPw1.js`.**
- **Smoke:** SB1–SB4, 10/10 tests, pass against the deployed site.

## Open for Nick

- ~~At 1512×982 the card folds~~ — resolved by the follow-up below.
- **Corkboard, not Noteboard.** If "Noteboard" in the pack was deliberate, that is a rename of the page, which this
  pack does not touch.

## Follow-up (25 Oct): the full card at 1512×982

You asked for 13px so the full card fits at 1512×982 with every row visible. This pass found 21px, all from the
v26 ref's own sidebar spacing:
- **Rows 1px apart, was 2px.** The ref's rows are 32px tall and 1px apart; ours stay 33px tall. With 13 rows,
  that is 13px.
- **Headings 5px above their first row, was 7px.** That is the ref's `h6` to the row below it. With 4 headings,
  that is 8px.

The row height, the labels, the card and the 11px and 15px around Dashboard are unchanged. The settings rail's
rows ("the main nav's, exactly") follow the gap. The first heading's margin went from 13 to 14px, so it still
sits 15px under Dashboard.

**The fold is re-derived again: 994 → 966.** The card now folds below 967px of window height.
- The full card shows every row from **967px**; the folded button needs **882**.
- So **1512×982 shows the full card with 15px to spare** (`shots/card-fits/`).

**Locks.** SB4 now also asserts that the full card shows wherever it fits (from 967px), and 1512×982 is one of
those sizes.
- **Red before the change:** on dev, which folded at 982 (`ledger/card-fits/red-on-dev-SB4-1512x982.json`).
- **Red under a break:** with the fold set too high (`ledger/card-fits/mut-SB4-1512x982.SB4-hi.json`).
- **Green here:** SB1–SB4, all 10 tests.
- **Shell suites:** the same 8 fail on this build as before, with the same messages.

**Gates:** tsc clean; production build clean; vitest 660 files, 10,430 passed.

**Dev deploy:** merged onto `dev/hm31-pv4-qc1492-dh41-cl24-hm32-pk26` as **223f2453**, with no conflicts.
- **Gates on the merge:** tsc clean; build clean; vitest 661 files, 10,433 passed.
- **Deployed** from a clean worktree. **Dev now serves `index-CshX-PZa.js`.**
- **Smoke:** SB4 passes at all five sizes on the deployed site.
