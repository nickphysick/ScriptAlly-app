# Phone — sections recovered from the old CLAUDE.md

History recovered from the old CLAUDE.md on 22 Nov 2026; later rulings may supersede it.

## The last screens on phones v1 — account, dead ends, the error page, addresses, email drop, editing a query, materials (30 Oct; ref = design-refs/phone-last-screens-v1/; report reports/phone-last-screens-v1/REPORT.md; branch `phone-last-screens-v1` off `setup-import-phone-v1`, NOT merged)
- **⚠️ THE ERROR PAGE IS THE ONE DESKTOP CHANGE**: full-screen shell ink at every width, the column 420 wide; "Tell us what happened" links to `/contact` because the feedback panel lives in the shell, which is gone when the boundary shows. `#/throw-lab` (dev builds) forces it.
- **Below 768px the desktop-only `/queries/packages`, `/manuscripts/comps`, `/manuscripts/versions` redirect (replace) to `/manuscripts#packages|comps|versions`** from App.tsx's early returns (hook-free `matchMedia`, like Part 8B's account index). `PhoneSectionLanding` scrolls the section in and opens `?pkg=`/`?version=` by pressing the page's own row — `ManuscriptPhone.tsx` is a `Manuscript*` file and is not edited.
- **Every phone full-screen page portals to <body> at z 1050**: above the phone sheets (1000–1010, which hold #root inert) and under the snackbar (1100). In place, under an open sheet, it cannot be tapped (L7 found it).
- **Editing a query on a phone writes only through the drawer's `commitQueryEdits`**, with the drawer's exported option lists; the reply window is the drawer's `writerExpectedDate`, so the wheel's days are stored exactly. Undo is a query snapshot; a note (its own `journalEntries` doc) is undone by deleting it.
- **Smart email drop's phone flow is behind `emailDropPhoneLive()`, OFF** (production never reads it; dev per device: localStorage `sa.lab.emailDropPhone` = "1"). Nick decides.
- **The material editor and package flow open from `/manuscripts?edit=|newpackage=1|copy=`** (`PhoneMaterialsHost`) and call the package model's own writers; the phone rows' own buttons wait on `ManuscriptPhone.tsx`. Materials are plain text, so no formatting bar.
- **Below 768px the set-up frame's navy buttons are white**, not the desktop's cream (the colour law; L10).
- **Locks:** `tests/e2e/phoneLastScreens.measure.ts` PLS1 L1–L11 (`PLS1_MUTATE`, `PLS1_BASE_URL` for L11, `PLS1_SHOTS=1` for the report's pairs). L7–L9 write to the harness account and undo or delete what they wrote.

## Set-up and importing on phones v1 — the band, the pinned foot, one question per screen (30 Oct; refs = design-refs/setup-import-phone-v1/; report reports/setup-import-phone-v1/REPORT.md; branch `setup-import-phone-v1`, NOT merged)
- **Below 768px a set-up screen has no folder tab: a navy band (Step n of N, the step's name, segments) reads the frame's own steps**, and the review overrides it through `useSetupBand` ("Review: repeats / agents / queries"). Back and Continue are pinned in `.sf-foothost` through `PhonePin`; `--sf-foot-h` (default `0px` on `.sf`) sizes the spacer that keeps the last content clear.
- **⚠️ Steps animate `transform` with `fill: both`, which makes them the containing block for `position: fixed`.** Every pinned or fixed phone layer (the foot, the details sheet, the question layer, the importing loader) PORTALS to the frame's foot host or its parent, never renders in place.
- **The phone's touch parts call the SAME handlers:** a row's swipe and tap call its own `onDelete`/`onToggleOpen` (the buttons stay in the DOM, visually hidden); a two-agent repeat is three choices applied by "Next set" through `onRemove`/`onKeepBoth`; the question layer renders the same `card.body`, and "Save and next" presses the question's own `.o9-ans > .sf-btn`. SIP1 S6 and S8 drive the fixtures to the end both ways and compare what the review hands the import.
- **The reading piles hold at 0 until the result, then count to `reviewTallies`'s totals; slips fall only under `prefers-reduced-motion: no-preference`** (the loader's own `reduced` is its <900px static path, not motion). The importing loader's steps tick on its existing 950ms interval; no timing constant moved.
- **e2e: `reviewDrive.ts` opens the phone layer itself and presses visually hidden answers on the element.** A lab measurement that revisits the same hash must `goto("about:blank")` first, or the page does not reload and the last run's answers carry over.
- **Locks:** `tests/e2e/setupImportPhone.measure.ts` SIP1 S1–S11 (`SIP1_MUTATE`, `SIP1_BASE_URL` for S11). Lift candidates: `PhonePin`, the question layer, `PhoneRowShell`, `PhoneDupePick`.

## Queries on a phone v1 — the Queries tab, Coming up, the query card, the + sheet (⚠️ SUPERSEDED ON THE PHONE by "Phone app v2" below, 30 Oct; 28 Oct; ref = design-refs/queries-mobile-v1/; report reports/queries-mobile-v1/REPORT.md)
- **At 760px and narrower `/queries` is `QueriesPhone`** (`components/queries/phone/`), returned by `Queries` after every hook; above 760 nothing in its render changes (QM1 L1: pixel- and DOM-identical at 1512). Screens are on the URL so the back gesture works: the tab, `?qm=coming`, `?q=<id>`.
- **Every figure is `lib/queriesPhone` over the desktop's own rows** (`buildQcRows`): chips are `whereItStands`' four sets + All; Your move is `statRows("you")` order (the top card is its first); due dates are `expectedMs`; the next-step sentence is the card's own strip (`stripOf`). The header line "{sent} sent · {active} active" never follows the chip.
- **The query screen is the app's own `QcQueryCard149` with `layout="phone"`** (next step above the tabs, no ×, footer = due line + ‹ N / M ›); Edit and Close are in the ⋯ sheet. The landing `HeroCard` is demo art, never a data card.
- **⚠️ THE TAB BAR IS FIVE TABS ON EVERY PHONE PAGE** (Home · Queries · Agents · Analytics · More, Nick's ruling): navy chosen pill, pink Your-move badge (`yourMoveBadge`, built in AppShell on phones only), More opens the "you" sheet. It switches at the shell's 768, the page at 760.
- **⚠️ `Queries` IS MOUNTED ON EVERY ROUTE AND HOSTS TWO THINGS OTHER PAGES USE:** the query panel (`openQueryPanel`) and the response picker. On the phone page it still places the ONE `queryPanelHost` (for other pages' requests and the practice walk) and does NOT claim the picker (it draws no panel for it), so "Record a response" falls through to the drawer. Leaving either out made doors on other pages silently do nothing.
- **COLOUR RULES (QM1 L2):** text on navy is white, on pink `#1c130f`, no solid rust/red fill. The page's layers sit at z-index 89, one under the undo bar, so Undo stays reachable over the celebration.
- **Art is one table, `qm1Art.ts`;** `agentReplied` and `cheer` are art slots awaiting the illustrator. No screen repeats a source (the flying hawk exists as two files).
- **Locks:** `tests/e2e/queriesMobileV1.measure.ts` L1–L11 (L10 WRITES and undoes; L8 moves the clock, never the data), `queriesPhone.test.ts`; dashboard A1/B1 re-pointed.

## Phone app v2 — the whole phone app, below 768px (29–30 Oct; ref = design-refs/phone-app-v2/; reports reports/phone-app-v2/part-1…part-8/REPORT.md and the summary reports/phone-app-v2/REPORT.md; branch `phone-app-v2`, NOT merged)
- **Below 768px (`useIsMobile`, 767.98px) this IS the app on a phone, and at 768px and up nothing changed** (every part re-ran the S9 desktop lock against its base build, pixel- and DOM-identical, proved red). **It SUPERSEDES on the phone:**
  - **Queries on a phone v1** — its five-tab bar (Home · Queries · Agents · Analytics · More), the "you" sheet, the Queries top bar and the Your-move tab badge;
  - **Dashboard on the phone v1** — `PhoneTopBar`, the four stat cards, `PhoneUpNext` and `PhoneFoundingRecent` (deleted);
  - **Mobile Pass 1** (`reports/mobile-pass-1.md`) — `ShellTopBar`'s phone variant on every page that has a band. What survives of it: `MobileSheet` (with an opt-in `pa` mode), `MobileDetailSpec` for pushed detail screens, `lockStageScroll`, and the mobileShell law (inputs at least 16px).
  - Where those sections and this one disagree about a phone, this one wins.
- **WHERE THINGS LIVE:**
  - **Shell:** `BottomTabBar` (Home · Queries · [+] · To-do · Agents; it tucks away on scroll and is hidden on menu pages); `components/phone/PhoneSheets.tsx` (the + sheet, the menu behind your initials, the book switcher); the snackbar (UndoBar and ToastProvider's phone branch).
  - **The band:** `components/phone/PhoneBand.tsx`. The tab variant has the book chip; the page variant has a back arrow. A page puts its key figure in the band through `usePhoneBandSlot(path, node)`, keyed by path so a hidden mounted page cannot fill another's band.
  - **Tokens:** `--pa-*` in `components/phone/phoneTokens.css`, scoped to the phone, on the shell root and every `.pa-layer` portal. The face reads `--sp-type`.
  - **Art:** one table, `components/phone/phoneArt.ts` (`PHONE_ART`, plus `QM1_SLOTS` lifted from qm1Art). A `null` slot draws the dashed placeholder (`PhoneArtSpot`), never another drawing, and no screen shows one source twice.
  - **The flow host:** `queryActions/PhoneFlowShell`. QueryDrawer chooses it by width, and every journey walks its OWN `JourneyView` inside it: the live card in the band, the step asked as a question. **No journey's questions, guards or saves changed.**
  - **The sweep fixes:** `components/phone/sweepPhone.css`, imported last in AppShell.
- **THE PAGES, AND THEY DERIVE NOTHING:** every figure is the desktop's own function over the desktop's own rows.
  - **Home** (`DashPhone`): the band hero (Active and Sent from the dashboard's ledger, 1M · 3M · All, remembered in `sa.phoneHero`), Up next, Where they stand, the founding card and Latest.
  - **Queries** (`QueriesPhone`): five chips over `whereItStands`' sets; the query sheet is `QcQueryCard149` with the `sheet` prop.
  - **To-do and the Corkboard** (`TodoPhone`, `CorkPhone`): the tray's own `assembleBoardColumns` → `dayBuckets`. The To-do badge is the tray's overdue + today (`lib/todoDueTally`).
  - **Agents and Discover** (`AgentsPhone`, `DiscoverPhone`): `agentFacts` over `buildQcRows`. Discover follows `DISCOVER_LIVE`.
  - **The menu pages** (`components/phone/pages/`: Responses, Manuscript, Analytics and `/goals`).
  - **Settings, Plan & billing and Help** (`AccountPhone.tsx`) and Import's doors (`ImportDoorsPhone`).
- **⚠️ NOTHING WRITES IN ONE TAP.** Swipes, ticks, verbs and Mark sent only OPEN a journey. Done asks before `quickDone`. Undo of a snooze writes the flag back verbatim (`restoreTaskFlag`).
- **⚠️ FIRST RUN (Part 8):**
  - **Home with no queries** is the real Home. The band's hero is drawn faded and inert behind "Let’s start tracking your campaign" (`FIRST_RUN_HEADLINE`; **never "Your campaign chart starts here"**, Nick's ruling). "Where they stand" is tagged Example.
  - **"Getting started" is the dashboard's own `gettingStartedRows` / `GETTING_STARTED`**, each step done from whether its record exists. It is NOT `PageGuide`, which is per-page tours. Never invent a step.
  - **Queries with no queries:** "Nothing logged yet." and the first-query card, then three inert example rows from the desktop exhibition's `QC_SAMPLE_ROWS` (`exampleRows`), never the writer's.
- **⚠️ SETTINGS ON A PHONE IS AN INDEX OF THE DESKTOP'S SEVEN SECTIONS** (`ACCOUNT_ROUTES`, `SECTION_BANDS`). Each section is the desktop's own `AccountSettings` inside `.pa-set`, dressed by `settingsPhone.css`, so every writer and receipt is unchanged. On a phone the bare `/account` no longer redirects. Before Part 8, a phone reached only Profile, because the section rail is not drawn below 768px.
- **⚠️ IMPORT ON A PHONE SWAPS ONLY ITS DOORS.** `ImportPage` keeps every handler, so ImportFlow, the review gate and the writers are untouched. All three desktop doors stay, and "Log one by hand" is a fourth.
- **⚠️ CLASS NAMES COLLIDE ACROSS PHONE SHEETS, AND THE FAULT LANDS ON ANOTHER PAGE:**
  - `.pa-ag` (the Queries rows' `nowrap` agency line) reused as a root widened Discover to 2,500px;
  - `.pa-fst` squeezed Home's founding card;
  - an unscoped `.pa-tag` restyled Home's rank tag.
  - Scope every generic rule under its page root (`.pa-pg`, `.pa-agents`, `.pa-td`, `.pa-cork`).
- **⚠️ A SIDE-SCROLLER NEEDS `contain: inline-size`**, or its cards become the shell's min-content: 4,660px wide at 390. A `nowrap` title does the same (589px): one-line titles clamp.
- **⚠️ OVERRIDING A DESKTOP PAGE A PHONE REACHES BY ADDRESS** (Submission packages, Comparable titles, Versions): their rules carry `!important` with an ID, so the phone layer repeats the root class three times and adds `:is(#pa-phone, *)`, which matches any element at an ID's weight. Their own files are untouched.
- **⚠️ A PORTAL UNDER `<body>` NEEDS `pa-layer`** for the tokens. **`pa` SHEETS SIT ON THE ESCAPE STACK** (`ESC_LEVEL.pageDrawer`). The stacking order is: sheets 1000, drawer 1010/1011, celebration 1050, snackbar 1100.
- **LOCKS** (helpers `tests/e2e/pa2Lib.ts`, `PA2_MUTATE=<name>`; each lock was proved red by a named mutation):
  - **PA2-1** `phoneAppV2Shell` S1–S9. S9 is the desktop lock, `PA2_L1=capture|compare`, and is relative to the base's own variation because the Dashboard never captures identically twice.
  - **PA2-2** `phoneAppV2Home`.
  - **PA2-3** `phoneAppV2Queries` Q1–Q7.
  - **PA2-4** `phoneAppV2Flows` F1–F9. It WRITES and undoes; list the account before and after.
  - **PA2-5** `phoneAppV2Todo` T1–T9.
  - **PA2-6** `phoneAppV2Agents` A1–A7. A3 seeds one agent and removes it by id.
  - **PA2-7** `phoneAppV2Pages` P1–P8. P6 runs `--no-deps`.
  - **PA2-8** `phoneAppV2Sweep`: W1–W7 on 24 routes × 390 and 360 × the harness account and the empty fixture account (`ms21-empty@scriptally.test`, `emptyPhone()`), plus R1–R3 for the first run. `PA2_SWEEP_ROUTES` narrows it.
  - The pairs are `phoneAppV2Pairs` (`PA2_PAIRS=part-N`); they only read.

## Public pages on phones v1 (29 Oct; ref design-refs/public-phone-polish-v1/; report reports/public-phone-polish-v1/REPORT.md; branch `public-phone-polish-v1`, NOT merged)
- **Every rule is phone-only: ≤760px on the marketing tier, <768px in the account frame, scoped `.sf--account` (the set-up screens share `.sf-lab`).** PP1 P1 holds 1440 and 1280 identical to the build before, DOM and pixels, on all nine logged-out pages.
- **⚠️ THE PHONE BLOCKS ARE LAST IN THEIR SHEETS AND RESTATE THE OVERRIDDEN RULE'S SPECIFICITY, SO NO `!important`.** One survives: the family on Contact's `.mk-contact .mk-waysh` (brand.tsx forces bare h2). A later edit that moves a block up loses on source order without a sound. It happened once in this pack: a <400px tab rule above the C block resolved `left: 0`.
- **Small capitals → sentence case in Source Sans 3** (pills and kickers 14/600, field labels 14.5/600 ink, small print 12.5, Pricing's tab and plan lines 13). Four labels are hidden, not removed: `.mk-s3n`, `.mk-ckicker`, `.mk-fweyebrow`, `.mk-doceyebrow`. **The hero query card and About's plate tags are exempt.**
- **⚠️ THE CENSUS NEEDS A LIVE COUNT AND A WALK.** The counters, the join bar and Pricing's sticky bar only render with `/api/waitlist` answering and the page scrolled, and eight offenders the brief never listed hid there. P2/P3 mock the count and walk every page.
- **Contact on a phone wears Pricing's own classes** (`.mk-pvm`, `.mk-pvbox`, `.mk-pvart`, `.mk-pvin`, `.mk-pvh1`, `.mk-pvsub`, via `usePhone`). **⚠️ `.mk-sheet:has(.mk-pvm)` is `overflow: visible`, so a page's full-bleed ground no longer gets clipped to the sheet's corners.** Contact's `::before` takes the sheet's width and 18px bottom radius on phones for that reason. The card tokens `--mk-pv-cardline/-cardlift/-perklift` and the join pink `--mk-join` are read by Pricing and the join bar too.
- **About on a phone:** an all-ink opening (10C, which the board does NOT load by default; it loads 10B), three white point cards with 64px dashed spots and no 01–03, and one letter card. CSS only.
- **Tap targets are empty, centred `::after`s of at least 44 × 44, and P5 samples them with `elementFromPoint`, never computed insets.** It also fails on overlap. The "Privacy" ending the founding notes has none: 44px there overlapped the button above.
- **⚠️ P9 CANNOT USE `scrollWidth`.** Public pages clip `overflow-x` on html and body, so the document never scrolls sideways. P9 looks for elements drawn past the viewport instead, and it was proved vacuous before being rewritten.
- **Auth follows the address:** App's `useHash` was already listening, and `Auth` now follows its `initialMode` prop without remounting.
- **Locks:** `tests/e2e/publicPhonePolish.measure.ts` P1–P9 (`PP1_MUTATE=<lock>`, `PP1_BASE_URL` for P1), `tests/e2e/hitBoxes.ts`.

## Dashboard on the phone v1 (⚠️ SUPERSEDED ON THE PHONE by "Phone app v2", 30 Oct; 28 Oct; ref design-refs/dashboard-mobile-v1/; report reports/dashboard-mobile-v1/REPORT.md)
- Phone dashboard v1 (<768px): compact top bar (mark, manuscript, Search, Feedback, pink + menu: Log a query / Record a response / Add an agent); stat cards first (Active queries with scrub chart and the Mentor, then With agents / Closed / Agents); Up next hero tinted by kind with the courier, then rows; founding writer row; Recent. Desktop untouched.
- ⚠️ `Dashboard` renders `DashPhone` in Dash58's place when `useIsMobile()`; every figure is `lib/dashPhone` over the desktop's own functions. A card opens the Query Centre's `?ids=` entry point with exactly its own queries (the QC lists every manuscript, so `?status=` landed on 142 rows behind a card saying 30). The kind colours are ONE map (`PHONE_KIND`), keyed by the task's list group, not the desktop card's `kindOf`.
- ⚠️ `.dm1` carries `contain: inline-size`: an unbreakable title widened the whole shell to 930px at 390. The search sheet is portalled to `<body>` in a `.dm1-layer` host that carries the page's tokens.
- Locks: `tests/e2e/dashMobileV1.measure.ts` DM1-A1/A2/B1/C1/D1/E1/F1, `dashMobileV1Pixel.measure.ts` (desktop pixel-identical), unit `src/lib/dashPhone.test.ts`. Retired: `tests/e2e/RETIRED-dashboard-mobile-v1.md`.
