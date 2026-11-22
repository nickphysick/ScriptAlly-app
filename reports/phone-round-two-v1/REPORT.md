# Phone round two v1: report

Branch `phone-round-two-v1`, cut from `581dd451`, the commit dev served when the pack started (see Base). Phones only: below 768px. The desktop is unchanged (R14).

Design refs are in `design-refs/phone-round-two-v1/`. `MANIFEST.sha256` hashes to `7e3806c4…3688551` and all 27 files check OK. The two zips in Downloads were byte-identical.

## False premises, first

1. **"Mark as ready" and "Make a copy makes a Draft copy".** Ready isn't a stored state. The desktop derives it (`packageStage`: a letter and a version make a package Ready).
   - "Mark as ready" is therefore enabled only once both are in. It saves the pieces, and the package reads Ready because the desktop says so.
   - A copy is Ready when it has a letter and a version, and Draft otherwise. R8 asserts the copy is unsent and unlocked, which it always is.
   - The R9 break the pack names ("save as Out") can't be written from the client: `firstSentAt` isn't in `updatePackage`'s allowlist. The break used instead saves without the letter, which leaves a Draft.
2. **"The active package."** It exists: `Manuscript.activePackageId`, resolved by `resolveActivePackage`.
   - On the harness manuscript it points at a package that no longer exists (`pkg-h22iuu9vx`). The desktop treats that as no active package, and so does the phone ("No package is set for new queries").
   - The locks set one through the page's own "Use for new queries", then put the original value back.
3. **"The `.fl` collision."** It isn't in the build: no `.fl` class exists in `src/`. It was an artefact of the design ref. R12 still requires at least two options over 40px tall, and the rows state a 56px minimum.
4. **"Saves as Letter v4."** The phone editor names the new version with the desktop's own `nextVersionName`, which gives "Hook-first v2" for a letter called "Hook-first". The desktop drawer's fix-or-new path names it "{name} (2)" instead. Two namings already existed before this pack; the phone kept the one last screens shipped.
5. **The phone feed's dates.** The phone ordered events by when they were logged, while the desktop orders by when they were sent (`honestDates`). A comment said "until dashboard-mobile-v1 takes this up". The pack says the phone must never disagree with the desktop, so the phone now passes `honestDates: true` too.
6. **"Five events at most, equal to the desktop feed."** The harness account has only 4 events in the last 30 days, so Home shows 4.
7. **"Most named comp."** It is built, from the desktop's own `compUsage`. The harness manuscript has no comps, though, so the card can't appear there. J10 lends a comp and shows the slip reading "Named in Voice-led · 1 query".

## Step 0

- **Base.** Dev served `index-DY34491Q.js`. The newest integration ref, `dev/…-pfx1-df1-g4` at `581dd451`, was committed at 15:06:31 and deployed at 15:07.
  - It builds to `index-E2ISWdzL.js`. The two bundles differ in 24 bytes, all of them hashed names of two lazy chunks (`index.es-*`, `index.esm-*`). The app code is identical.
  - Phone fixes A–G4 are all in its history (G4 as a cherry-pick).
- **Baseline gates.**
  - tsc is clean on the root and on functions.
  - `build:dev` is clean.
  - Vitest: `Test Files 701 passed (701)`, `Tests 10803 passed | 3 skipped (10806)`.
- **Before shots.** `before/`: the base build at 390 and 360 for Home, Queries, To-do, Agents, and the Manuscript page's packages, letters, versions and comps.
- **The materials model.** The phone reads all of it from the desktop's own code:
  - lifecycle: `lib/packagesV40` (`packageStage`, `STAGE_LABEL`, `isLocked`, `canMakeActive`, `canRetire`, `canDelete`, `copyFields`);
  - active package: `Manuscript.activePackageId`, set by `db.setActivePackage`;
  - letters and synopses: `ManuscriptVersion` (componentType Query Letter / Synopsis); `isVersionSent` and `updateVersion` refuse content changes once sent;
  - book versions: `Manuscript.bookVersions` / `inUseBookVersionId`, read with `readVersions` / `inUseId`, written with `setInUse`, `editVersion`, `archiveVersion` and `saveNewVersion` through `writeVersionChange`;
  - comps: `CompTitle`, a letter's `compIds`, `compUsage`, `letterFixed`, and the age rule `compAge` (over five years);
  - what went: `sentPackageId` / `sentHow`, via `sentRecordOf`;
  - gates: `packagesUnlocked` (`PACKAGES_OPEN_TO_ALL = true`) and `versionsUnlocked` (`VERSIONS_FOUNDING_ACCESS = true`);
  - results: `figOf` and `rankByMore` / `packageShowcases` / `bestPiece`. The rule is asked for more ÷ sent; ranking needs `MIN_SENDS_FOR_CLAIM = 4` answered, and a version's rate needs 5 sent.
- **Activity.** The desktop's `feedEntries` → `drawerEvents` / `drawerDays` / `drawerSummary` / `FEED_FILTERS`, reused as they are.
- **Locks re-pointed** (each with its reason in the file):
  - `mobileShell.test.tsx`: the bar's order, the four tab routes, the badge on Home, To-do in the menu.
  - `phoneFixes.measure.ts`:
    - F2 checks `/queries/packages` in place of `/todo`, which has no bar now;
    - F5 reads the band tiles (the pill row is retired) and waits for their counts on WebKit;
    - BADGE reads the badge on Home.

### What a phone can do, before and after

| Action | Before | After |
|---|---|---|
| Read packages, lifecycle, figures, who got them | Read-only, partial | **Reachable** (package page: figures, funnel, contents, its queries) |
| Create a package | Only by typing `?newpackage=1` | **Reachable** (Build a package, and the builder) |
| Copy a package | Only by typing `?copy=` | **Reachable** (Make a copy) |
| Edit an unsent package's contents or name | Missing | **Reachable** (Edit opens the builder) |
| Use a package for new queries | Missing | **Reachable** (Use for new queries) |
| Retire a package | Missing | **Reachable** (Stop using it) |
| Delete, icon and colour, note, extras list | Missing | Missing (not in the pack; extras can be ticked, not created) |
| Read a letter or synopsis | Read-only | **Reachable** (paper card, figures, packages it's in, earlier ones) |
| Edit a letter or synopsis, saving a sent one as a new version | Only by typing `?edit=` | **Reachable** (Edit / New version) |
| New letter or synopsis | Only inside the old flow | **Reachable** (shelf "+ New", builder "Write a new …") |
| Put a letter away, bring one back | Missing | **Reachable** (More) |
| Letter summary, rename | Missing | Missing |
| Versions: read | Read-only (legacy reader) | **Reachable** (the desktop's `readVersions` / `inUseId`) |
| Versions: new, rename and what changed, use, archive | Missing | **Reachable** |
| Versions: bring back, delete | Missing | Missing (on a computer) |
| Comps: read with age and use | Read-only | **Reachable** (index cards, slip with letters and queries) |
| Comps: add | Missing | **Reachable** (the desktop form's fields) |
| Comps: edit, remove, reorder | Missing | Missing |
| Comps a letter names | Missing | **Reachable** (tick list, read-only once sent) |

## Gates

| | tsc (root / functions) | build:dev | Vitest |
|---|---|---|---|
| Baseline (`581dd451`) | clean / clean | clean | `701 passed (701)`, `10803 passed \| 3 skipped (10806)` |
| Final (phase H) | clean / clean | clean (grepped: no error or warning lines) | `701 passed (701)`, `10803 passed \| 3 skipped (10806)` |

Phase H's last run: every PR2 lock on both phones, 25 passed and 3 skipped (the two look passes, and R10 on WebKit, which writes). Three locks needed WebKit-only waits for data that arrives later in Playwright's WebKit: R2 and R5 (activity log), R11 (lent comps). No app change was made for them.

## Commits

- A `aa121136`: the Packages tab, To-do onto Home, the badge on Home.
  - `BottomTabBar.tsx`, `AppShell.tsx`, `PhoneSheets.tsx`, `DashPhone.tsx`, `TodoPhone.tsx`;
  - new: `useTodoPhone.tsx`, `todoCheck.css`; refs added.
- B `d46f4a6f`: Queries band filters and cards, the Agents ring and tiles, no sage on a phone.
- C `e530809c`: Activity on Home and its page (`PhoneActivity.tsx`). `Latest` and the unreachable feed sheet are deleted.
- D `edcda596`: To-do as Up next, then a checklist.
- E `3dc1f7e0`: the Packages page and every page under it (`packages/phone/PackagesPhone.tsx`, `PackagesRoute`); `/queries/packages` no longer redirects on a phone.
- F `0d239228`: the builder replaces last screens' `PhonePackageFlow` (deleted, with 20 dead rules); its doors land on the new builder.
- G `369200b7`: "What did you send?" on a phone.
- H: the locks, the journeys, the pairs and this report.
  - Fixes from measuring:
    - the phone feed's `honestDates`;
    - best synopsis and most named comp in What's landing;
    - showcase ids;
    - checklist titles name the agent, and only "Overdue since …" is rust;
    - the phone flow's sage turned to sand.

## Locks

`tests/e2e/phoneRoundTwo.measure.ts` (R1–R13) and `phoneRoundTwoDesktop.measure.ts` (R14). Both run on `iphone` (WebKit) and `pixel` (Chromium), with touch.

Writes run on Chromium only. Playwright's WebKit can't open Firestore's Write channel here, as phone fixes F8 recorded. Every write is undone in the same run, and the account was checked clean afterwards.

Red-before proofs:
- CSS breaks are applied with `PR2_MUTATE`.
- Behaviour breaks are source edits made by `scripts/pr2-mutate.mjs` in the measurement worktree. It builds, runs only that lock, and restores from a path-derived backup.

| Lock | What it holds | Red under |
|---|---|---|
| R1 | Bar reads Home · Queries · + · Packages · Agents; the Home badge equals the To-do tallies (37 = 37); `/todo`, `/todo/corkboard`, `/todo/calendar` and `/todo/noteboard` all open To-do | dropping the calendar redirect: **red** |
| R2 | Four tiles equal the court counts (16 / 6 / 17 / 13); a tap filters to exactly that court and sets `aria-pressed`; a second tap clears; every child of the sheet starts ≥ 8px below its top (18) | the list moved up 14px: **red** |
| R3 | 52 cards. Each strip is its court's colour; four steps, filled to the stage, pink when with you and navy otherwise; closed cards have no track | filling by navy for "with you": **red** |
| R4 | Arc 24 ÷ 53; "24 of 53 queried"; two columns at 360 and 390; nothing wider than the screen | the ring counting every agent: **red** |
| R5 | Home's events equal the desktop derivation's first five (4 in the window); the page lists all of them; figures replies 2 · did 2 · need 0 equal `drawerSummary` | every reply given an action: **red**. **The action branch isn't exercised: no request is outstanding in the window on this account** |
| R6 | One Up next card; 0 verb buttons on 54 rows; a tick on a close task opened the close flow and completed nothing | the tick no longer opening its door: **red** |
| R7 | The active card equals `resolveActivePackage`; What's landing's best letter and synopsis equal the desktop results' `let:` / `syn:`; lifecycle labels equal `packageStage`; the in-use pieces are ringed | ranking the best letter by sent count: green, because on this account the most-sent letter is also the best. Ranking versions by sent, which bypasses the minimum: **red** |
| R8 | A package out with agents shows the lock note, no Edit, and Make a copy; the copy has `copiedFromId`, no `firstSentAt` and the same pieces (it read Draft) | Edit allowed: **red** |
| R9 | Slots in the order version · letter · synopsis · extras; choosing a letter names it in the email card and ticks Letter; Mark as ready gives Ready | saving without the letter: **red** |
| R10 | A sent letter's edit saves "Hook-first v2"; the old text is byte-identical | saving over it in place: **red** |
| R11 | Ages 2 · 5 · 12 (lent for the run); blush only at 12; ticking writes `compIds` and is put back | blush at five: **red**. **Read-only for a sent letter isn't exercised: no sent letter on this account records its comps** |
| R12 | "What did you send?" lists the active package first (`data-now`), with 4 options of 62–83px; choosing it records `sentPackageId` | the options crushed to 2px: **red** |
| R13 | 3,600+ elements on seven phone pages, plus the log flow's step: no hue in 75°–165° above 12% saturation. Package-colour elements (`[data-pc]`) are exempt (see Nick) | sage restored on Partial / Full sent: **red** |
| R14 | Home, Queries, To-do, Agents, Submission packages, Versions and Comparable titles at 1440 × 900 match the base build. Pixels differ by no more than the base differs from itself (0 on six pages, 1 on Packages). DOM matches one of two base captures, with time-driven dial arcs rounded | a red outline on the desktop bar: **red** |

Also re-run, from phone fixes: PF1 F1–F8 and BADGE on both phones; F2, F5 and BADGE needed the re-points above.

F9 (phone fixes' desktop check) reports one element on Home differing. It's the auto-cycling task card's dot, which differs between two base captures too (6 DOM, 18,367 pixels of noise). It's noise, not this pack; R14 makes the same claim with a noise floor.

## Journeys (`phoneRoundTwoJourneys.measure.ts`, on the Pixel)

| | What happened | Result |
|---|---|---|
| J8 | Built a package (Ready), used it for new queries, logged a query with it (`sentPackageId` recorded), and it went Out with agents and locked (`firstSentAt` set, lock note, no Edit). Made a copy (`copiedFromId`, not out) | passed; all undone |
| J9 | Edited the sent letter "Hook-first" into "Hook-first v2" (old text unchanged) and built a package with v2 | passed; all undone |
| J10 | Lent a comp, ticked it in the unsent letter "Voice-led", built a package with that letter, logged a query with it. The comps page then reads "Named in Voice-led · 1 query" | passed; all undone |

## Pairs

`pairs/<shot>-390.png` and `-360.png`: board on the left, app on the right, for all 20 shots (40 files). The board's names and numbers are illustrative; the app's are the harness account's.

## Dev

- Before: `index-DY34491Q.js`.
- After: in the H section of the final message.

## For Nick

- **Manuscripts ownership.** No Manuscripts file was edited, and none had to be. `ManuscriptPhone.tsx` (treated as a Manuscripts file, as last screens did) still shows its read-only packages and materials. A link from it to the Packages tab is a one-line change in that file: a "See all on Packages" link to `/queries/packages` beside its packages heading.
- **Rules.** Nothing was refused. Every write in the pack uses fields the rules already allow.
- **Sage on the desktop**, unchanged (the phone layer and the phone flow now use sand):
  - `src/index.css`: `--sage-band` / `--sage-band-2` / `--sage-edge`, `--sage` / `--sage-d`, `--sageC` / `--sageD`, `--postit-sage`, `--hk-sage`;
  - `helpCentre.css` `--hc-sage`;
  - `manuscriptHeroCard.css` `--mhc-sage-*`;
  - `manuscriptAlsoRows.css` `--mar-sage-*`;
  - `queryDrawer.css` `--qad-sage` (the drawer's match notes, ticked steps, "matches" tags);
  - `responses.css` `--rs-sage*`;
  - `versionsV2.css` `--sage`, `--cx-sage*`;
  - `contactV11.css` `--clv-sage`;
  - `todoFrame.css` `--sage`.
  - Also the package colour **Pine** (`#2e5641`) in `PACKAGE_COLOURS`, the writer's own choice. On a phone a Pine package's tile and band would be green. R13 exempts package-colour elements. Whether Pine stays in the palette is your call.
- **Active package.** It wasn't inferred; it's `activePackageId`.
  - The harness manuscript's value points at a deleted package, so "none is set" there. Real accounts can be in the same state after deleting their active package.
  - The desktop shows no wording for that state. The phone says "No package is set for new queries. Open a package that's ready or out with agents and choose 'Use for new queries'."
- **Badge.** The 37-against-30 question isn't touched. The Home badge counts exactly what the To-do badge counted.
- **Two lock branches have no data on the harness account**, and are reported, not passed:
  - R5's action row (no outstanding request in the window);
  - R11's read-only list for a sent letter (no sent letter records its comps).
- **Desktop F9 noise.** The dashboard's auto-cycling task card makes any back-to-back desktop comparison differ by one element.

### A tap-through for a real phone

1. The tab bar reads Home · Queries · + · Packages · Agents, and the badge is on Home.
2. Home: Up next, then To-do (four rows) and Activity (chips filter in place). Then See all activity, and back.
3. To-do via "See all": an Up next card, then the checklist. Tap a tick on a "Consider closing" row: the close flow opens. Swipe a row left for Later.
4. Queries: tap "With you": only those cards show, with a white tile. Tap it again to clear. Swipe a card for Next step / Close.
5. Agents: the ring, two-column tiles, and Discover still there.
6. Packages: the active card (or the "none set" card), What's landing (swipe), Your packages, and the four shelves.
7. Open a package that's out with agents: lock note, Make a copy, and back. Then Build a package: pick a letter (the email card updates) and a version, then Mark as ready.
8. Open a letter, then Edit: if it has gone out, the banner says it saves as a new version.
9. The comps shelf: "Add a comp", then a letter's "Comps it names" tick list.
10. +, then I sent a query, then an agent: "What did you send?" lists the active package first.

## Worktree

`../ScriptAlly-pr2` is removed at the end (see the final message).
