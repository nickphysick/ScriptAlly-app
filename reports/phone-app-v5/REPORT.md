# Phone app v5 — the hub, To do, Materials, Profile and the dense Birds-eye (below 768px only)

Branch `phone-app-v5`, cut from the branch dev serves: `dev/…-pa4-qc155-pa41-clp1` @ `6eaa7ff61`, bundle `index-Bq5D30Du.js`, built at `0e1b2a9f5`. v4.1's merge `02b4a22de` is an ancestor. Refs are enrolled at `design-refs/phone-app-v5/`, and all six SHA256s match. Phases A–G are commits `8985b5e3a`…`cf094c707`, and Phase H is the commit carrying this file. Not merged to main.

## False premises and corrections

1. **844 × 390 is the desktop.** The one breakpoint (`useIsMobile`, below 768px) serves it the desktop page. The lock asserts this: no dock, no phone Today, and the media query is false. Phone landscape is measured at 740 × 360 instead (184px names, no dock). Whether landscape iPhones should get the phone app is Nick's call.
2. **"A date beyond the window fades off the right edge" had no left-hand twin.** `beTrack` clamped an earlier date to the left edge and drew a false notch there. On the harness, all eight rows in the block are dated before the 9-week window. Fixed: no notch, and the deeper segment runs in from the edge. PA5-6 also reads the block over the queries whose dates passed in the last eight weeks.
3. **"Late" was already on the phone before v5.** The task journey's chip read "N days late". Fixed on the phone only: it now reads "N days past its date". The desk keeps its `dueChip`.
4. **The harness lacks some states.** It has no zero count, and no book with a resolvable package going out (seed-ms-1's stored `activePackageId` points at a package that no longer exists). PA5-4 reads the one-query state for zero counts. PA5-12 chooses a package through the header's own chooser, reads it, then puts the stored value back.
5. **The full view's rows are a 27px button plus a 1px rule:** 28px edge to edge, as briefed.
6. **"Bars ≥ 4px" is a CSS floor** (`min-width: 4px`), so it cannot fail on its own. The window lock that can fail is "today in the left half".
7. **Functions are not emulated.** The "Sent" pair answers the feedback callable in the browser, so no lock ever sends.
8. **PA5-15's 0px rule is not met on Agents.** Its DOM is identical to the base. 3–10 pixels differ in one strip (y≈551–552), and two captures of the same new build differ by 7px in the same place. That is render noise, not a change. The two captures are in `desktop-agents/`. The full desktop captures (14 MB) are kept off the repo, at `~/ScriptAlly-backups/pa5-desktop-captures/`.

## §0 — the recon's answers

1. **Served branch and baseline.** Dev serves `index-Bq5D30Du.js`. Baseline: tsc 0, functions tsc 0, build clean, Vitest with the 3 known guard reds of 12,013.
2. **What survived:**
   - Replaced:
     - `V4TabBar`/`V4MiniBar` → `V5Dock`/`V5MiniBar`.
     - `TodayV4` → `TodayV5`, the hub.
     - `TodayHeaderV41` → `TodayHeaderV5`. It keeps v4.1's chart, series and motion.
     - `BirdsCardV41` → `BirdsBlockV5`.
     - `BirdsViewV41` → `BirdsViewV5`. It keeps v4.1's engine, replay, pan, zoom, expansion and landscape.
   - Merged: Up next's lead card and `TasksPageV4` → `TodoV5`, on `PhoneTaskScreen`.
   - Moved: `QueriesV4` is now pushed at `/queries/all`, and `AgentsV4`'s body is now Today's Agents tab.
   - Re-laid: `YouV4` → `ProfileV5`, with the founding card moved there. `PackagesPhone` is re-laid, with its shelves → Materials' tabs.
   - Feedback: the phone's `FeedbackSheetV5` uses the desktop's `sendFeedback`.
   - Kept: `QueryPageV4`, `QuickLogV4`, `SearchV4`, `PhoneLetterEditor` and the pushed-page shell.
3. **Routes on phones** (`phoneV5Redirect`):
   - `/queries` → `/dashboard?tab=queries`. With a query string, it goes to `/queries/all?…`.
   - `/agents` → `/dashboard?tab=agents`.
   - `/todo` is To do's root.
   - Bare `/queries/packages`, `/materials/letters`, `/manuscripts/comps`, `/manuscripts/versions` and the `/manuscripts` hashes → `/materials?tab=…`.
   - Deep links that name one thing keep their pages.
   - On the desktop, `/queries/all` → `/queries` and `/materials` → `/dashboard`.
4. **Sources:**
   - Badge, need pill and To do count: one array, `useV3().ordered`.
   - Active figure: `v3Counts.active`. Its change on last week: `activeSeries`.
   - Birds-eye rows: `phoneGroups → beLine` (lib/qc150, the desktop engine).
   - Done today: `core.done` from London's midnight.
   - List health: `listHealth(houseModel(…))`.
   - Packages: `packageMetrics` with `resolveActivePackage`.
   - Letters: the desktop's per-piece facts.
5. **Versions gate:** exactly the desktop's (`versionsUnlocked` plus the review aid), with the desktop's own lock copy.
6. **Housekeeping's handlers** were lifted verbatim into `contact/useHkFixes`, per Nick's ruling of 12 Nov. `AgentList` and the phone's gaps sheet both call it.

## The locks (Chromium `--project=pixel`, emulator harness, 390×844 and 360×740)

Ledgers are in `ledger/`. Each mutation ran as its own test; its counts are in `ledger/mut-<name>.summary.json`.

| Lock | Green | Mutation → red |
|---|---|---|
| PA5-1 dock | Dock reads Today · To do · + · Materials · Profile ("+" is "Log a query"). One badge, on To do: 103, the same as To do's tasks and the need pill. | `badge` → 2 |
| PA5-2 reachable | All 35 pages the base reached are reached within 0–3 taps of a dock tab. | `nodiscover` → 1 |
| PA5-3 tabs | Slim bar and tab strip pinned past the header (strip top 64.2, bar bottom 64) on Today and Materials, through every tab. | `tabsaway` → 4 |
| PA5-4 filter | Counts 23 / 10 / 37 (sum = header 70). Each filter shows only its group, nearest first. Tapping again restores all. Zero counts are disabled. | `nofilter` → 4 |
| PA5-5 window | Six queries sent in one week: bars 6.9–19.9px, today 48px into a 242px track. One query: one row plus the explainer. | `window12` → 2 |
| PA5-6 past date | Notch at the date (±1.5px), deeper segment to today, no rings or beacons. Applies to the block (8 + 21 rows) and the view (42 rows). | `ring` → 2 |
| PA5-7 line | The today line crosses none of 21 text nodes. Each of three opened details covers it. | `lineabove` → 8 |
| PA5-8 density | 25 of 70 rows fully visible with the header scrolled away, 28px each. A touch drag pans the track, not the 116px names. 844×390 is the desktop. 740×360: 184px names, no dock. Groups over five fold. | `v41rows` → 2 |
| PA5-9 engine | All 70 open queries in the view, and the 24 in the block, match desktop `QcBirds150` at 1512, stage by stage. | `recompute` → 2 |
| PA5-10 card | The button and a right swipe open the same journey. Cancel records nothing (activities 408). Mark done: 103 → 102. Undo: back on top, 103, activities 408. | `swipedone` → 2 (undone in-run) |
| PA5-11 gaps | One reply-time gap saved through `useHkFixes`: `responseTimeWeeks` goes from unset to 6, gaps 79 → 78. Undo restores the document with no field differences, and gaps return to 79. | `direct` → 1 (restored) |
| PA5-12 materials | All 4 packages equal `packageMetrics` run in Node. A package chosen through the header's chooser matches `resolveActivePackage`, and the stored value was put back. Versions follows the desktop gate, open and locked. | `phoneresults` → 1 |
| PA5-13 sizes | 12 screens × 2 phones: text ≥ 14px except dock labels; targets ≥ 48px except Birds-eye rows; nothing past the edge at 125%. 96 readings. | `shrinktabs` → 28 |
| PA5-14 words, motion | No "overdue" or "late" on 14 screens. Reduced motion: nothing running on 7 screens. Control: the replay runs without it. | `overdue` → 1 |
| PA5-15 desktop | Dashboard, Queries, Agents, letters, packages and calendar are DOM-identical to the base at 1512. Pixels: 0 on five pages; Agents 3–10px (noise, see premise 8). | `shared` → 6 (23k–129k px) |

Materials' last Chromium run had 7 readings and 0 red, but failed on a mistyped floor of 8. The floor is now 7. It was not re-run in Chromium; WebKit passes it with 7 readings.

## WebKit (`--project=iphone`, once, 390×664)

All 8 groups green, 0 red: today 42, reach 36, view 5, todo 7, gaps 6, materials 7, sizes 48, words 23.

The following ran in Chromium only, because they need Chrome's DevTools protocol or a resize:
- PA5-8's drag and row count
- PA5-9's desktop comparison and landscape
- PA5-10's swipe
- PA5-12's desktop Versions page

## Fixes made in Phase H

- `beTrack`'s notch for a date before the window (premise 2), with a unit case.
- `PhoneTaskScreen`'s chip words (premise 3).
- Probe attributes: `data-to`, `data-pasts`, `data-kind`, `data-ms`.
- A dev-only aid, `window.__SA_PA5_BE`, gated on `MODE` at its call site.

## What moved or retired

- `tests/e2e/phoneAppV4.measure.ts` and `phoneAppV41.measure.ts` are deleted. `tests/e2e/RETIRED-phone-app-v4.md` maps each old lock to its v5 lock.
- Unmeasured on purpose: day one, the quick log's record, and the expansion's button. All are unchanged from v4.1.
- Unbuilt:
  - the ref's ring on Offer;
  - the old Agents-tab extras (header sentence, Then shelf, waiting faces, Everyone row, Add row), all still reachable from the full list;
  - the comps count on synopses;
  - "How it works" on the Versions lock;
  - "Save as a new letter" opening the new letter.

## Open questions for Nick

1. Should landscape iPhones (≥ 768 wide) get the phone app? Today they get the desktop.
2. The ref rings Offer on the mini track as well as requests. Only requests ring now.
3. A withdrawn-only agent counts as "closed" yet can be the best fit (`bestFit` ignores withdrawn queries). Is that acceptable?
4. Bare `/manuscripts` ("Your book") stays under Profile, and only its section hashes go to Materials. Is that right?
5. The Agents tab dropped its header sentence, Then shelf, waiting faces, Everyone and Add rows. Is that acceptable?
6. Housekeeping and batch tasks have no date chips on To do's card. Is that right?
7. Should the Versions lock card get the desktop's "How it works"?
8. "Save as a new letter" stays on the page, because `saveMaterial` returns a boolean, not the new id. Should it open the new letter?
9. Synopses show no comps count. Is that wanted?
10. 18-row density holds with the dock tucked (25 measured). About 16 rows fit with it showing. Is that acceptable?
11. The desktop Birds-eye still says "overdue since…" (`beLine` labels). Should it change too?
12. seed-ms-1's `activePackageId` points at a package that no longer exists. Is that a harness data question, or should the app handle it?
13. The ref's 11px text is raised to 14px throughout. Is that confirmed?
14. Settings' and Help's feedback doors still open the desktop `FeedbackDock` on the phone. Should they open the sheet?

## Gates

tsc 0 · functions tsc 0 · build:dev clean · Vitest: 3 known guard failures of 12,117 (`emuGuard` ×1, `firestoreTarget` ×2), the same three as the baseline.
