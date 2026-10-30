# Phone app v2, Part 8: first run, Settings, Help and Import, and the whole-app sweep

Branch `phone-app-v2`, worktree `/Users/nickphysick/ScriptAlly-pa2`.

The ref is `design-refs/phone-app-v2/`. This part used:
- screens 39–46;
- `homeEmpty` (restv.js, FRH C) and `screenQueries2`'s empty branch (v2.js, FRQ A);
- from overlays.js, `PAGES.import`, `PAGES.help`, `PAGES.settings`, `PAGES.notifications` and `PAGES.plan`.

The ref's hashes were re-verified: the manifest and `phone-app-v2.html` both match, with 69 files OK.

Not merged, and not on prod.

## False premises

1. **"The getting-started steps come from the page guides (`PageGuide`)."** They don't. `PageGuide` is each page's tour.
   - The getting-started steps are the dashboard's own `gettingStartedRows` over `GETTING_STARTED` (`lib/dashEmpty`). There are five: manuscript, agent, query, materials, comps. Each is done when its record exists.
   - Home and Help both read that list, and R3 locks Home to it, key for key, in order.
   - The ref draws four steps, including "Set your weekly goal". That step is not in the app's source, so it is not drawn: never invent a step.
2. **"Import: Smart import, Our template and Log one by hand, as three rows."** The desktop page has three doors:
   - Smart import;
   - the template, which is two actions (download, upload);
   - "Match your own columns".
   - Dropping one is forbidden. All three are kept, and "Log one by hand" is a fourth. So the phone shows the Smart import card, the template group (Download the template · Upload my sheet) and "Other ways in" (Match your own columns · Log one by hand).
3. **"Settings: the desktop's sections … each opens its own page band."** On a phone before this part, only Profile was reachable: the section rail is not drawn below 768px, and the bare `/account` redirected to Profile.
   - `/account` is now the index on a phone (the redirect is skipped there).
   - Each section is the desktop's own `AccountSettings` page, dressed (below).
4. **"Notifications: the ref's four switches."** The ref's Reply windows and Founding news are not settings the app has.
   - The app's Notifications section has Nudge reminders, Weekly summary and Product news, with its "not sending emails yet" notice.
   - The phone shows exactly the app's, unchanged.
5. **"Plan & billing: 'Full access to everything, including Pro features, for the whole beta.'"** That is the ref's sentence and a claim about entitlement.
   - The app's plan facts are `planLine` ("Free plan") and `PLAN_ROWS` for the plan the writer is on, which include "Not on this plan" rows.
   - The phone states those, with the founding chip. No new upsell, and the ref's sentence is not used.
6. **"Queries before the first query: example rows from the Contact list and To-do example pattern."** The Queries page has its own example data: the desktop exhibition's `QC_SAMPLE_ROWS`. The phone builds its three rows from those (`exampleRows`, unit-tested), not from another page's.

## What Step 0 found

- **Part 7 is in place.** The commits are `4a17e4eb`, `0d3ba86a`, `16418e8e`, `c08bc3e1` and `77de94f4`, and PROGRESS.md records them.
- **Home's empty branch:** with no queries, `DashPhone` drew its populated layout with zeros. There was no first run.
- **Queries' empty branch:** `QueriesPhone` drew empty chips. The desktop's `QcEmpty` is a desktop page.
- **Settings:** `AccountSettings` renders one section per route (`ACCOUNT_ROUTES`). On a phone, the rail that reaches the others is not drawn, so six of the seven sections had no door.
- **Help:** `HelpCentre`'s search (`searchHelp`), the articles (`HELP_ARTICLE_LIST` by `HELP_AREAS`), the page guides (`GUIDE_PAGES` / `guideCard`, opened through `requestGuideOpen`) and "Ask us" (`openFeedback`) are all reusable. The page itself is a desktop layout.
- **Import:** `ImportPage` owns three tile doors and hands every press to `ImportFlow`. Only the doors needed a phone form.
- **Plans:** `PlansPage` is the desktop comparison. A phone had no plan page in the band.
- **Two earlier parts had leaked onto Home**, found on the first-run Home:
  - Analytics' `.pa-fst` (Part 7) squeezed the founding card's name to 60px.
  - Agents' unscoped `.pa-tag` (Part 6) restyled the founding rank tag.
  - Both are fixed in 8A (below).

## Gates

| Gate | Before Part 8 (`77de94f4`) | After |
|---|---|---|
| tsc root / functions | 0 / 0 | 0 / 0 |
| build:dev (grepped) | clean | clean |
| Vitest | `Test Files 695 passed (695)` · `Tests 10761 passed \| 3 skipped (10764)` | `Test Files 695 passed (695)` · `Tests 10763 passed \| 3 skipped (10766)` |

## Commits

| Commit | What | Files |
|---|---|---|
| `97367626` | 8A first run (Home, Queries) and the two scoping regressions | `DashPhone.tsx`, `HomeFirstRun.tsx` (new), `phoneHome.css`, `QueriesPhone.tsx`, `queriesPhoneV2.css`, `AnalyticsPhone.tsx`, `pagesPhone.css`, `agentsPhone.css`, `lib/phonePages.ts`, `lib/milestones.test.ts`, `tests/e2e/pa2Lib.ts` |
| `91401e53` | 8B Settings, Help, Import, Plan | `App.tsx`, `ImportPage.tsx`, `AccountPhone.tsx` (new), `ImportDoorsPhone.tsx` (new), `settingsPhone.css` (new), `PageRoutes.tsx`, `AppShell.tsx` (band titles), `pagesPhone.css`, `phonePagesSmoke.test.tsx` |
| `9b7d2b0b` | 8C the sweep fixes | `components/phone/sweepPhone.css` (new), `AppShell.tsx` (import), `ManuscriptPhone.tsx` (the empty page's "Add a manuscript") |
| (this commit) | 8D the sweep lock, the art from the pairs, the pairs, this report, CLAUDE.md | `tests/e2e/phoneAppV2Sweep.measure.ts` (new), `pa2Lib.ts`, `phoneAppV2Pairs.measure.ts`, `phoneArt.ts`, `ImportDoorsPhone.tsx`, `AccountPhone.tsx`, `pagesPhone.css`, `CLAUDE.md`, `reports/phone-app-v2/` |

**What the sweep found and 8C fixed, all in the phone layer:**
- **Tap targets under 44px.**
  - The band's rings are now 44px. The ref draws 40, but the rulebook's 44px law wins.
  - These reach 44px through a transparent border with a matching negative margin, so nothing on screen moves:
    - the book chip;
    - Home's hero chips;
    - Analytics' range pills;
    - the segment buttons;
    - the settings switches;
    - Help's search.
  - The week strip keeps 44px days at 360.
- **Ink on blush:** the count on a card's blush strip.
- **Settings:** the desktop's burgundy initials and uppercase chips.
- **The three desktop-only pages a phone reaches by address** (Submission packages, Comparable titles, Versions). Their files are untouched. The phone layer fixes:
  - their uppercase;
  - their red and burgundy text;
  - text on their navy grounds, now white;
  - their targets, now 44px;
  - their inputs, now 16px;
  - their footer links.
- **The empty Manuscript page** now offers the app's own "Add a manuscript".

**What the pairs found and 8D fixed:**
- Import's Smart import card had no picture. The ref's `tipHawk` is the courier disc (README "Illustrations"). It is a new art-table slot, `PHONE_ART.importSmart`, drawn in a blush disc.
- Help's "Getting started" had no picture. The ref draws the quill, which is `QM1_SLOTS.quill`, in a blush disc.

## Locks: PA2-8 (`tests/e2e/phoneAppV2Sweep.measure.ts`)

The sweep visits 24 workspace routes at 390 × 844 and 360 × 780, on the harness account and on the empty fixture account (`ms21-empty@scriptally.test`).
- Every check reads the rendered page, and the population is asserted first (text and targets were read).
- The final run read **782 readings, none failing**.
- `PA2_SWEEP_ROUTES` narrows a run to some routes; that is how each mutation was proved, on the route it breaks.

| Lock | Claim | Mutation | Red reading |
|---|---|---|---|
| W1 | the band is present | `w1-no-band` (CSS, /plans) | red: `openPhone` waits for the band, which never shows |
| W2 | text on navy is white, ink on blush, no green or red | `w2-red-fill` (CSS, /dashboard) | `red fill on nav.pa-tabbar (rgb(180, 85, 63))` |
| W3 | no image twice | `w3-image-twice` (code, /plans) | `["/images/tier-founding.png"]` |
| W4 | no uppercase labels (computed uppercase, or all-caps under 13px) | `w4-upper-label` (CSS, /plans) | red on the uppercased label |
| W5 | nothing past the screen's edge, and no sideways scroll | `w5-past-edge` (CSS, /plans) | `div.ws-work 0–480 of 390` |
| W6 | every tap target at least 44px | `w6-40px-button` (CSS, /plans) | `button.pa-ring 40×40` |
| W7 | every input at least 16px | `w7-14px-input` (CSS, /help) | `input. 14px` |
| R1 | empty Home: the hero faded (opacity under .2, blurred, inert) behind "Let’s start tracking your campaign"; Example tag; never "Your campaign chart starts here" | `r1-words` (the headline swapped for the ruled-out words) | the headline check AND `never the words "Your campaign chart starts here"` |
| R2 | empty Queries: "Nothing logged yet.", the first-query card, three example rows faded and inert | `r2-live-examples` (the inert dropped) | `{"rows":3,"inert":false,…}` |
| R3 | every getting-started step is `GETTING_STARTED`'s, in its order; none done on an empty account | `r3-step-dropped` (the first step skipped) | `["agent","query","materials","comps"]` |
| S9 (PA2-1) | the desktop untouched: `/import`, `/plans`, `/help`, `/account/profile`, `/dashboard`, `/queries` at 1512 and 1280, pixels within the base's own variation and DOM-identical | `p8-import-phone-on-desk` (ImportPage's phone branch forced on) | `1512 /import: head 553709 px vs base-to-base 0 px`, DOM not identical (and at 1280) |

**Notes on the proofs:**
- **S9's first mutation proved nothing, and that is recorded rather than counted.** `p8-sweep-on-desk` widened `sweepPhone.css`'s media query to every width. It changed none of the six routes, because every rule names a phone class or a desktop-only page not in the set. The proof that counts forces a real phone branch onto the desktop.
- **Green:** S9 `36` readings, 0 failing (`ledger/desktop.json`); the red ledger is `ledger/desktop.mut-import-phone.json`.
- **The sweep's edge rule allows** content clipped by an ancestor, a sideways scroller the design means to scroll, and a drawer parked wholly off-screen. Each exception is judged by the ancestor, never by a list of names.

**Final regression on this build:** one run of every phone suite, PA2-1 to PA2-8, QM1 and DM1.
- Result: `37 passed`, `17 skipped` (the S9 cases, which need `PA2_L1`, and QM1's and DM1's mutation-only cases), no failures, in 18.1 minutes.
- PA2-4 wrote and undid.
- The account matched its list afterwards: nothing added, and the one listed change, `queries/seed-pkgq-1`, is key order only.
- The rewritten ledgers of the earlier parts are in `ledger/regress/`.

## Pairs and shots

- `pairs/` holds 39–46 beside the ref at 390 × 844 and 360 × 780.
- 39 Discover is the live face, through the dev review aid (`__SA_DV_LIVE`), as in Part 6.
- 45 and 46 pair the shots PA2-8 takes on the empty account (`shots/45-home-first-run-*.png`, `shots/46-queries-first-run-*.png`): the harness account has queries.

## Where the app overrode the ref

| Item | Ref | App |
|---|---|---|
| Getting started | four steps, including "Set your weekly goal" | the dashboard's five (`GETTING_STARTED`), "0 of 5" on an empty account |
| empty Queries' band | the book chip | none on an account with no manuscript: the chip has nothing to name |
| example rows | Eleanor Whitfield, Marcus Reed, Priya Anand | `QC_SAMPLE_ROWS`' own (Jonathan Marsh, Aisha Kapoor, Fenella Stroud) |
| Import | Smart import, Use our template, Log one by hand | the desktop's three doors (Smart import · the template's download and upload · Match your own columns) plus Log one by hand; the desktop's words; the spent Smart Import line ("1 Smart Import available") |
| Settings rows | label only | label over the section's own one-line description (`SECTION_BANDS`) |
| Notifications | Nudge reminders, Reply windows, Weekly round-up, Founding news | the app's settings: Nudge reminders, Weekly summary, Product news, and its notice |
| Plan & billing | "Full access to everything … for the whole beta"; four ticks | `planLine` and `PLAN_ROWS` for the plan the writer is on |
| Help | six guides, "3 of 6 steps done" | the dashboard's getting-started count, the page guides and the Help Centre's articles by area, then "Ask us" |
| band rings | 40px | 44px (the rulebook's tap-target law) |

## Dev

DEV_SECTION

## Not done, and why: for Nick

1. **Plan & billing has two homes, `/plans` and `/account/plan`.** On a phone:
   - the menu's row and the band's title open `/plans`, the phone page;
   - the Settings index's row opens the desktop section in `.pa-set`;
   - the phone page links to that section for the account's own plan details.
   Choosing one home is a ruling.
2. **Two Help Centre guide controls are not on the phone.** The phone lists the page guides and opens them, as the desktop does. Left off:
   - each learned guide's "Restart" (`restartGuideLocal`);
   - the "turn guides off" switch (`setGuidesOff`).
   A page tour has no phone form yet, so offering to restart one would open a desktop tour on a phone. Whether they come back as phone controls is a ruling.
3. **The three desktop-only pages are reachable on a phone only by address** (Submission packages, Comparable titles, Versions). The phone layer makes them legible and lawful, but the ref draws none of them for a phone, and a phone layout for each needs their own files. Two of them are Manuscripts-owned.
4. **The "heard back" denominators still differ** (Part 7, item 1): Analytics' figure counts Withdrawn and Signed, while Responses' does not.
5. **The Notifications switches are the app's, not the ref's.** Reply windows and Founding news would be new settings.
6. **The founding chip shows for every writer** (Part 1): the app has no founding flag, so every signed-in writer is a founding writer.

**What has no place in the ref, and where it went:**
- Import's "Match your own columns" is in "Other ways in".
- Settings' "Your data" is its own group, as the ref groups it.
- Help's page guides are above the articles.

Nothing was dropped.

## CLAUDE.md

The pack's sections are consolidated into one, "Phone app v2: the whole phone app, below 768px". It says:
- what it supersedes on the phone (Queries on a phone v1, Dashboard on the phone v1 and Mobile Pass 1);
- where the shell, band, tokens, art table, flow host and sweep fixes live;
- the locks PA2-1 to PA2-8.

The two older sections' headings now point at it.

## Worktree

WORKTREE_LINE
