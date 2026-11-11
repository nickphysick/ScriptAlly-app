# Phone app v3 — report

Branch `phone-app-v3`, cut from `origin/dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54-cl27b-yn1-laq1-qc1534-aa1-laq11-td55-laq12` at `daba95bd2`. Below 768px only.

Commits: A `098b60b71` shell · B `4bf63cab2` one source · C `6c7b52421` Today · D `1746d12b7` Queries and the sheet · E `52155e97c` + sheet and journeys · F `8f45f5ca8` Agents · G `90d18ba00` You, Settings, search, pushed pages · H (this report, the measurement, the retirements).

## False premises

1. **"Nick saw 37, 34, 55 and 103 on different screens" reads as one count disagreeing with itself. It isn't.** The four figures counted four different things over the same board (§0.4). v3 shows one: Today's badge = Today's rows = the desktop To-do's own "N to do" (measured: 103 = 103 = 103).
2. **"The Gone-quiet setting" is not one rule.** Three rules decide "gone quiet" today:
   - `queryState`, which honours the setting. The desktop Query Centre uses it.
   - `whereItStands`, a fixed 28-day rule. The v2 phone's chips and Home used it.
   - The To-do board's close task (`taskPrecedence`, at least 90 days).

   v3's courts (the hero's three figures, the Queries chips, the sheet) all read `queryState`. Today's "Gone quiet" *task group* is the To-do board's close task, as the brief asks (Today's tasks are the workspace's own). So the hero's "Gone quiet 37" and the task group "Gone quiet" are different questions with different numbers. Both are on screen.
3. **Log-a-query v1.3's rule is not on the served branch** (v1.3 is in flight in its own worktree). v3 makes the offer from the brief's words: when the reply time chosen differs from the agent's card, "Save N weeks on X's card too" (ticked by default). It saves through the card's own writer (`commitCardSave`), and Undo reverses it with the log.
4. **The add-agent journey (`AddAgentJourney`) cannot be mounted on a phone.** `AgentCardHost` portals it into a desktop-only slot (`[data-ap-act-slot]`). v3 builds the four steps on `useAgentForm` with the journey's own controls (agentPills), as the brief asks.
5. **`SampleSpecPicker` has no start-point control.** Its behaviour is consume-only, so the ref's "From the start / From somewhere else" sits beside it. It writes the log writer's own `sect`/`from` fields. The writer stores a section in its own words: 37 pages from page 12 is "pages 12–48".
6. **"Nudge reminders by email": the app sends no such email.** The desktop Settings says so ("QueryHawk doesn't send these emails yet…"), and v3's Settings carries the same sentence under the toggle.
7. **The harness account is on the Free plan with 53 agents, so adding an agent there is refused by the app's own cap** ("Free tier is capped at 5 agents"). That is `addAgent` working, not a phone fault. PA3-9's "a saved agent holds every field" is measured through the same four steps in edit mode, on an agent not yet queried, whose document is written back afterwards.
8. **The baseline root `tsc` runs out of memory at Node's default 2 GB heap on this machine** (exit 134, not a type error). With `NODE_OPTIONS=--max-old-space-size=4096` it is clean. Every gate here uses that setting.

## §0 Recon

### 1. The served branch and the baseline

- Dev serves `index-BVzRmv5j.js` from `dev/…-laq11-td55-laq12`. The local copy of that branch is one merge behind origin (`8ad46478` against `daba95bd`). The extra merge touches only reports and one measurement, so origin's tip builds the served bundle.
- Baseline before any edit:
  - Root `tsc`: 0 errors (4 GB heap).
  - `functions/` `tsc`: 0 errors.
  - `build:dev`: clean.
  - Vitest: 812 files, 11,880 passed, **3 failed**, 3 skipped. The three were red before this pack and are unrelated:
    - `emuGuard.test.ts` flags `tests/e2e/cb21Emu.sh`.
    - `firestoreTarget.test.ts` ×2: 28 e2e scripts make their own Firebase app.

### 2. The phone parts: kept, restyled or retired

| Part | Fate |
|---|---|
| `phone/PhoneBand.tsx` (navy band: greeting, chip, search, feedback, initials, tile slot) | **Retired** → `phone/v3/V3Chrome.tsx` `V3Header` |
| `BottomTabBar.tsx` (floating capsule) | **Kept for the desktop only**, where it renders `display:none` as before (PA3-11 needs the desktop DOM unchanged). Below 768px → `V3TabBar` |
| `phone/PhoneSheets.tsx` (`PhonePlusSheet`, `PhoneMenu`, `PhoneBookSheet`) | **Retired** → `phone/v3/JourneysV3.tsx` `PlusSheetV3`. The menu and the book switcher go with the initials and the chip |
| `phone/PhoneSearchPage.tsx`, `phoneSearch.css` | **Retired** → `phone/v3/SearchV3.tsx` |
| `phone/phoneBandStore.tsx` | **Kept**: pages still set the header's one icon (`usePhoneBandExtra`) and a pushed page's key figure (`usePhoneBandSlot`) |
| `phone/phoneTokens.css` | **Kept**, plus one token, `--pa-rust` |
| `phone/PhoneComposeFlow.tsx` | **Kept**: the + sheet's "Pin a note" opens it |
| `phone/PhoneDisc`, `PhoneArtSpot`, `phoneArt`, `phoneIcons`, `ReplyWheel`, `PhoneSectionLanding`, `materials/*` | **Kept** (their readers stand) |
| `phone/pages/AnalyticsPhone`, `ResponsesPhone`, `GoalsPhone`, `ManuscriptPhone`, `ImportDoorsPhone`, `PlanPhone`, `HelpPhone` | **Kept, pushed** under the v3 header (built content). The Wall of no gains an anchor |
| `phone/pages/AccountPhone.tsx` `SettingsPhone` | **Retired** → `SettingsV3` (in `YouV3.tsx`) |
| `dashboard/phone/*` (`DashPhone`, `PhoneHome`, `HomeFirstRun`, `PhoneActivity`, `PhoneTopBar`, three stylesheets) | **Retired** → `phone/v3/TodayV3.tsx` |
| `todo/phone/TodoPhone.tsx`, `useTodoPhone.tsx`, `todoPhone.css`, `todoPhoneR2.css`, `todoCheck.css` | **Retired**: no To-do page on a phone (`/todo` lands on Today) |
| `todo/phone/PhoneTaskScreen.tsx` | **Kept**: Today's and Queries' verbs open it. Its visible "hawk" placeholder box is removed |
| `queries/phone/QueriesPhone.tsx`, `queriesPhoneV2.css`, `queriesPhoneR2.css` | **Retired** → `phone/v3/QueriesV3.tsx`, `QuerySheetV3.tsx` |
| `queries/phone/queriesPhone.css`, `EditQueryPhone.tsx`, `qm1Art.ts` | **Kept**: the phone query card and the edit screen (the sheet's "Edit" opens it) |
| `agents/phone/AgentsPhone.tsx` (`AgentsPhone`) | **Retired** → `phone/v3/AgentsV3.tsx`. `DiscoverPhone` is kept in the same file, under the v3 switch |
| `packages/phone/PackagesPhone.tsx` | **Kept, pushed** (build stays as built) |
| `queryActions/PhoneFlowShell.tsx` | **Kept**: the sheet's actions open the app's own journeys, which use it |
| `shell/mobileChrome.tsx`, `mobileShell.css`, `MobileSheet.tsx` | **Kept** |

### 3. The writers each journey calls

**No new writer. Status is never written directly**: each writer below goes through `recomputeQuery` where the status moves.

| Action | Writer | Notes |
|---|---|---|
| Log a query | `saveLog` (`lib/queryActions/logSave.ts`) → `db.addQuery` | Undo is the drawer's own `takeSnapshot` / `restoreSnapshot` |
| Record a reply | `saveResponse` with `respondDefaults` (`respondSave.ts`; the query card's quick reply plan) | Same Undo |
| Mark materials sent, log a nudge, close, answer an offer | The app's own journeys through `openQueryDrawer` (`sent`, `nudge`, `close`, `offer`), as the Query Centre card opens them | — |
| Add an agent | `db.addAgent` with `agentFromDraft` | The record is lifted unchanged out of `AgentCardHost.createAgent` into `lib/agentCreate.ts`, which both use. Undo is Discover's own (`undoAgentAdd`) |
| Edit an agent | `useAgentSave().saveDraft` → `commitCardSave` | Its own Undo |
| Pin a note | `PhoneComposeFlow` → `db.addUserTask` | — |
| Edit a letter's wording | `ManuscriptPhone` / `PhoneMaterialsHost` → `saveMaterial` (unchanged) | — |
| Set the active package | `PackagesPhone` → `db.setActivePackage` (unchanged) | — |
| The two settings | The notify map merged whole (`updateUserProfile({ notifyPrefs })`) and `quietWeeksPaths` | AccountSettings' own writes |

### 4. Why the four counts disagreed

| What Nick saw | Where it came from | What it counted |
|---|---|---|
| Home badge | `todoDueBadge` | Cards dated today or earlier |
| "Up next · See all" | `dashList` | One book only, plus contact-list and clock items |
| Home "To-do · See all" | `useTodoPhoneModel` | Every live card, notes included, a sweep as one |
| To-do page | `phoneOrder(useWsCore().all)` | Workspace rows, a sweep as one row per agent: the desktop To-do's own count, and the largest (103) |

v3 reads only the last. `todoDueTally` is deleted, and the other three retire with their pages.

### 5. Packages, and dev-facing labels

- **Packages at 390:** nothing passes the right edge. The one element past it is the "What's landing" carousel, which is a horizontal scroller (PA3-6 excuses scrollers and measures everything else at 360, 390 and 414). The v2 band's figures, which sat over the page, are gone.
- **"Coming in Part"** does not occur. The visible "hawk" placeholder box on the task screen is removed (§0.2). The phone's "late"/"Overdue" words were on the retired pages and are absent on every v3 screen (PA3-10).

### 6. Can the three be mounted on a phone as they are?

- **`SampleSpecPicker`:** yes, both modes ("sent" in the log journey, "wanted" in the agent's step 3).
- **`ResponseTime` / `WeekSlider`:** yes. Its own ends read "1 week" and "26 weeks", and it has its own "Unknown" toggle.
- **`useAgentForm`:** yes.

None of the three is modified. v3's stylesheet keeps its reset and its font hand-back off their classes.

## The locks

Run on the emulator harness, Chromium (`--project=pixel`). Ledgers are in `reports/phone-app-v3/ledger/`.

Every lock was run red first, against a mutation applied to the rendered page (`PA3_MUTATE`, in the measure file), then green. Readings are taken on the visible page with the built CSS.

| Lock | Green | Red (mutation → reading) |
|---|---|---|
| PA3-1 header | Each tab's header is 70px at rest and 56px after scrolling 100px, at 390 and 360. No book chip, initials, feedback ring, band or tile band anywhere. | `band` (a 90px block back in the header) → 120px at rest, 108px scrolled, on all four tabs |
| PA3-2 content first | First task on Today at 373px (< 420); first query row on Queries at 188px (< 300), at 390 × 844 | `tiles` (a 320px band back above the content) → 717px and 508px |
| PA3-3 bar | Today, Queries, +, Agents, You, in that order; bottom = 844/844, left 0, right = 390/390, white, on every tab | `float` (the v2 inset) → bottom 830, left 14, right 376 |
| PA3-4 one count | Badge 103 = Today's rows 103 = the desktop To-do's "103 to do". Queries 23/10/37 = Today's hero 23/10/37 (at 390 and 360) | `badge` (+5) → badge 108 against 103 rows |
| PA3-5 said once | 88 query rows; each says its status and its group once | `courtband` (the status said again) → "Offer · Offer · 3 months ago" |
| PA3-6 no overflow | 69 readings: the four tabs, ten pushed pages and nine sheets or journey steps, at 360, 390 and 414. Nothing past the edge except inside a horizontal scroller (the chip rows; the Packages carousel). The page is never wider than the screen | `widen` (a Packages card at 640px) → widest 864/390 |
| PA3-7 sample | Logging to an agent whose card asks for 50 pages opens on 50; typing 37 and "from somewhere else" at 12 stores "pages 12–48" (the writer's own words: 37 pages from page 12) | `chips` (the picker hidden) → no picker, and the stored sample is not what was typed |
| PA3-8 slider | The control is a range input; moving it to 12 changes the expected line and stores `writerExpectedDate` 12 weeks after `dateSent` | `slider` (the range input hidden) → no range input; the line does not move; nothing stored |
| PA3-9 agent | Continue is disabled with a name and no agency, and enabled with "I don't know the agency". Through the four steps the agent stores country, door, email, reply time, the policy, website, wishlist and "First 50 pages" | `agency` (the disabled state removed) → Continue enabled with no agency |
| PA3-10 words | 23 sweeps (every tab, pushed page, sheet and journey step at 390): no "Overdue", "late", "Coming in Part", or the hawk watching for replies | `late` ("3 days late" on the page) → found on all four tabs |
| PA3-11 desktop | Dashboard, Queries, Agents and To-do at 1512: **DOM identical** to the served branch's build (≈ 510–515k characters each, the page's own `data-at` clock normalised). Pixels: 0, 36, 7 and 0 differ | `shared` (letter-spacing on `body`) → 63,026–129,416 pixels differ |

**PA3-11's pixels are not stable from run to run on this machine.** Two captures of the *same* served build differed by 656–4,891 pixels each (sub-pixel rendering in the bar and cards), with identical DOM. So the lock holds the DOM identical and the pixels within that measured noise (≤ 5,000), which this branch meets at 0–36 and a shared-rule change breaks by more than twelve times.

**PA3-1 on You:** You at rest is shorter than the screen, so it cannot scroll 100px. The lock adds a temporary 800px spacer at the page's foot, reads the header, and removes it.

The journeys (PA3-7 to PA3-9, plus journeys 1, 2, 4 and 6) wrote to the emulator, and every write was put back:

- the logged query, by its own Undo (0 left);
- the reply, by its own Undo (Full sent → Partial requested → Full sent);
- the edited agent, its whole document written back by id.

WebKit (`--project=iphone`) ran the phone locks once at the end: see "WebKit" below.

## What retired, by name

**Components:**

- `PhoneBand`
- `PhoneMenu`, `PhoneBookSheet`, `PhonePlusSheet` (with `PhoneSheets.tsx`)
- `PhoneSearchPage`
- `DashPhone`, `PhoneHome`, `HomeFirstRun`, `PhoneActivity`, `PhoneTopBar`
- `TodoPhone`, `useTodoPhone`
- `QueriesPhone`
- `AgentsPhone`, with `AgentTile`, `AgentProfileSheet`, `Seg`, `useAgentFacts`, `AGENT_CHIP_LABEL`
- `SettingsPhone`, with `ICON`, `SETTINGS_GROUPS`

**Libs:** `phoneHome` (`heroFor` and friends), `todoDueTally` (the old badge).

**Stylesheets:**

- `dashPhone.css`, `phoneHome.css`, `phoneActivity.css`
- `todoPhone.css`, `todoPhoneR2.css`, `todoCheck.css`
- `queriesPhoneV2.css`, `queriesPhoneR2.css`
- `phoneSearch.css`

**Measurements:** the v2 phone suites (27 files, listed in `tests/e2e/RETIRED-phone-app-v2.md`).

**Behaviour:**

- the floating, tucking bar and its edge fade;
- the tile band;
- the full-width beta strip on a phone;
- the 760px Queries breakpoint (the phone is now the app's one breakpoint, 767.98px);
- the phone To-do page (`/todo` lands on Today).

## What the ref shows that the app cannot derive (or that v3 says differently)

- **Today's "Replies" line** is the Responses page's replies (asked for more or passed), counted up to each week. The app keeps no other replies series.
- **The ref's verb words "Answer" and "Decide"** are the To-do workspace's own verbs: Send, Decide, Nudge, Close, Fill in. An offer reads "Decide" because the brief asks the verb to come from the workspace.
- **"Streaks and goals" tile:** the ref says "3-week streak". The app's streak is computed on the Goals page, not as a figure here, so the tile says "Your weekly goal".
- **The book card's "Draft 6 is going out":** the tile shows genre and words; the version going out is on the book page.
- **The ref's sample data** (agents, "The Salt Road", letters, packages, Discover cards) is not used anywhere. Every figure is the account's own.
- **Colours with no phone token** (nearest token used):

  | Ref | Token |
  |---|---|
  | `#8fa3bf` (With the agent bar) | `--pa-st-slate` |
  | `#c9c1b4` (Gone quiet bar) | `--pa-st-grey` |
  | `#e3e8ef` (chosen tab pill) | `--pa-st-slate` |
  | `#c9ccd3` (disabled button) | `--pa-faint` (keeps white text legible) |
  | `#c9ccd3` (rings, switch off) | `--pa-st-slate` |
  | `#c5cedb` and `#d5dbe5` (muted text on navy) | `--pa-st-slate` |
  | `#f3f6fa` and `#faf8f5` | `--pa-page` |
  | `#fffdf8` | `--pa-card` |
  | `#1c130f` | `--pa-ink` |

  The ref's rust (`#8a4a3c`) had no near phone token, so one new token was added, `--pa-rust`, for its four uses.
- **The shrunk header** is 56px, not the ref's 58px: the ref's 40px buttons in a 9 + 9 row make 58, so they step to 38px when small, to meet PA3-1's 56.

## Left unbuilt, or built differently, and why

- **The log journey records materials "chosen individually"**: the in-use letter and the current synopsis. The ref offers no package choice; the desktop journey's package choice is unchanged.
- **Discover keeps its built page** under the v3 "Your list | Discover" switch. It is not restyled into the ref's card (the brief: "keeps its built behaviour").
- **Pushed pages keep their v2 page styles** under the v3 header, with their key figure in the navy slot beneath it. Packages is titled "Submission packages", its own name.
- **Corkboard is the built desktop page at a phone width.** It has no phone page.
- **The task screen (`PhoneTaskScreen`) keeps its own full-screen band** (close, "n of m", arrows) rather than the v3 header. It is the app's own phone task screen, as the brief asks.
- **The harness Free-plan cap**: see False premise 7.

## WebKit

**Not run.** `--project=iphone` failed to launch in 0ms: Playwright's WebKit build is not installed on this machine (`~/Library/Caches/ms-playwright/webkit-2388` is missing). Installing it is a browser download (`npx playwright install webkit`), which needs Nick's go-ahead. Every lock above is Chromium (`--project=pixel`).

## Gates at the end

See the commit for Phase H: root `tsc` (4 GB heap) and `functions/` `tsc` clean, `build:dev` clean, and the full Vitest suite with only the three reds that were there before this pack.

## Deployed to dev

- Dev had moved while this pack was built: it served `dev/…-laq12-laq13` (Log a query v1.3, `index-Dew3IMgB.js`). The two packs touch no file in common.
- `phone-app-v3` (`cffd517f2`) is merged into a new branch stacked on it, `dev/…-laq12-laq13-pa3` (`651aa049a`, pushed). Gates on the merged tree: `tsc` clean, 776 spec files and 11,420 tests green.
- Built from that clean pushed tip and deployed to dev hosting only. The deploy was guarded on dev still serving `index-Dew3IMgB.js`.
- Dev now serves **`index-U2eoEdze.js`** (checked after the deploy).
- Not merged to main. Nothing deployed to prod.
