# Phone Birds-eye world v3 — calmer zoom, snap levels, the hawk's news, quick actions, search, no-date rows

Branch `phone-birds-eye-world-v3`, cut from `phone-birds-eye-world-v2` (201b2ce43). Pushed, **not merged**. Below 768px only; the desktop is untouched.

## Where it stands

- **Dev serves it** as `index-ch0gjPrp.js` (AppRoot `AppRoot-BUMx_MBQ.js`), from `dev/bew3-clr12` @ 50758f184.
  - Dev had been serving another stream's build: `contact-list-rows-v1-2` (`index-8JglYLZj.js`), which already contains Birds-eye v2. So `dev/bew3-clr12` is that branch with this one merged in, and dev now carries both.
  - The only conflict was `design-refs/.refhashes.json`, resolved as the union of both entries.
  - The deploy command refused unless dev still served `index-8JglYLZj.js`. Afterwards the served index matched the build, and the served AppRoot contains both "Let go to refresh" and "Filter by name or agency".
- **Locks:** 25 locks measured at 390 × 784. The green pass reads 62 locks readings and 5 empty-state readings, 0 red. Every lock went red under its own mutation.
- **Gates** (after Phase 4) are no worse than the baseline:

  | Gate | Baseline (before v3) | Final |
  |---|---|---|
  | tsc (8 GB heap) | exit 0 | exit 0 |
  | `npm run build` | exit 0 | exit 0 |
  | `npm run build:dev` | exit 0 | exit 0 |
  | Vitest | 973 files · 13803 passed · 4 skipped | 973 files · 13815 passed · 4 skipped |

## Commits

| Commit | Phase |
|---|---|
| 73ee0c73e | Phase 1: refs and the engine (`lib/birdsWorld.ts`: levels, folded groups, no-date group, the news, tips, search, menu actions, recap stats) |
| 67de768e4 | Phase 2: the frame (`drawWorld.ts`: Strava headings, PUSH/LASTH, no-date rows, no figures, gridlines at Weeks only, edge fades, scrubber, glow) |
| fbd4dc64b | Phase 3: controls, sheets and moments (`worldMotion.ts`, `BirdsSheets.tsx`, `BirdsWorld.tsx`) |
| 639a2ffc7 | Phase 4: locks, screenshots, and four defects the locks found (below) |

## Defects the Phase 4 locks found (fixed in 639a2ffc7)

1. **The dock covered the bottom of every Birds-eye sheet.** This hid the no-date sheet's Save and the timeline sheet's "Open the full query".
   - Cause: the world sits at z 40, under the dock (z 50), and its sheets live inside it.
   - Fix: a sheet, the quick menu or the recap now lifts the world to z 60 (`.bw.lift`). The app's own sheets (z 1000) still open over it.
   - Locked by BW-26: every control in the sheet must be the topmost element where a finger lands.
2. **Folded headings sat 8px apart, not 12px.** The spacing still used v2's heading heights (22/28) rather than v3's (26/30).
3. **A "with you" query with no send-by date was treated as having no reply date.**
   - It sat in "No reply date yet" under All, vanished under the With you pill (which still counted it), and a saved reply date couldn't move it out.
   - Fix: with-you rows are now always drawn, running to today when undated. "No reply date yet" holds waiting queries only. Unit-locked in `birdsWorld.test.ts`, red without the fix.
4. **Replay could start before the axis.** A query older than a year (the axis stops at −365 days) pinned the line to the left edge while the date label moved. Replay now starts no earlier than the axis.

## False premises and deviations

- **Reopen has no phone journey.** The card journey that reopens a closed query is hosted only on the desktop (`queries/centre/CardJourneyHost.tsx`). On the phone, the menu's Reopen opens the query (`openV3Query`), where it can be reopened.
- **There's nothing to refetch.** Queries are a live `onSnapshot`, so pull to refresh makes one `getDocFromServer` of the user's document. That forces a server round trip; the listener already holds the queries. BW-27 counts that call (`data-refreshes` +1 per pull).
- **The days tier isn't reachable at 390 portrait.** The Weeks level is the closer of 42 days across and the 48px-row zoom ×1.02, and 42 days is the ceiling. BW-6 measures the ruler at Weeks.
- **Quiet default is 4 weeks** (`LEGACY_QUIET_DEFAULT`), not the 6 the ref's sample uses. BW-8 measures the 6-week and 3-week settings.
- **The news lock reads "N", not "2".** The harness's changes fall on whole days and jump from 1 (11 days back) to 4 (12 days back), so no "last opened" gives exactly two. BW-25 takes the first day with two or more changes, then checks that the badge shows N, that Show me visits each of the N (glowing, Next, then Done), and that Done clears it.
- **A plain wheel pans; Ctrl+wheel zooms and snaps.** The ref snapped on any wheel, which made a trackpad unusable. Pinch zooms freely, then snaps to the nearest level.
- **Style ratchet:** the phone style census forced a few CSS values. Font 13 became 14 or 12, shadows became the tokens, and #e2ddd3 became the palette's #dedbd5.
- **The offer timeline's button says "I've sent it"**, as the ref's does.
- **The no-date sheet uses the app's week slider** (OVERRIDE), from 1 to 26 weeks. It starts on the agent's stated time ("Their stated time · ") when there is one, else 6 weeks.
  - For an old query the default date can already be past, e.g. queried 20 Jun + 6 weeks = 1 Aug. The ref shows the same ("passed 23 Nov"). Saving such a date moves the query into Needs chasing.

## Which journey each action opens

| Action | Opens |
|---|---|
| They replied | Record a response (`runAct("reply")` → `openV3({type:"reply"})`) |
| Send a nudge | The drawer's nudge journey (`runAct("nudge")` → `openQueryDrawer`) |
| I've sent it | The drawer's sent journey (`runAct("sent")` → `openQueryDrawer`) |
| Open query / Open the full query | `openV3Query(id)` |
| Edit dates | `pa3:edit-query` event → Queries.tsx opens `EditQueryPhone` |
| Reopen | `openV3Query(id)` (see above) |
| Save (no-date sheet) | `updateQuery(id, writerExpectedWrite(iso))`, the app's own write for the writer's reply date |

## Where things come from

- **"Last opened"** is `localStorage["bw3.lastOpened"]`, per device. It’s written when Done ends the news stepper, when the tab is hidden, and when the world unmounts.
- **Folded groups** are `localStorage["bw3.folded"]`, per device.
- **Stated time** is the agent's `responseTimeWeeks`.

## The locks (`tests/e2e/phoneBirdsWorld.measure.ts`)

Run them through the slot:

```bash
npm run e2e:emu -- tests/e2e/phoneBirdsWorld.measure.ts --project pixel
```

- `BW_MUTATE=all` adds one run per mutation.
- `BW_SHOTS=1` writes the shots.
- `BW_ONLY=BW-23,BW-24` runs just those sections, for debugging only (the readings floor then fails by design).
- Ledgers are in `ledger/`, with one `mut-<name>.summary.json` per mutation.

| Lock | What it holds | Mutation that turns it red | Own reds |
|---|---|---|---|
| BW-1 | Fitted is bars only | a name injected into the layer | 1 |
| BW-4 | Stages on their dates at Weeks | stage bars nudged 6px | 1 |
| BW-5 | No name under an "!" (marks on screen required) | names pulled 30px left | 2 |
| BW-6 | Ruler marks clear of each other and the pills | marks 140px wider | 1 |
| BW-7 | No gap at the current stage; earlier stages faded | the current stage nudged −4px | 1 |
| BW-8 | Gone quiet at the setting (6 and 3 weeks) | the quiet fade nudged 30px | 2 |
| BW-9 | The pills add up | a pill's count +1 | 1 |
| BW-10 | Seventy queries fit; 48px rows reachable | the view's right edge pulled in | 1 |
| BW-11 | Empty states | the card hidden | 3 |
| BW-12 | Replay runs, a touch stops it, it ends on the recap | `requestAnimationFrame` stubbed | 1 |
| BW-13 | Never "overdue"/"late"; no world errors in the console | "Overdue" written into a heading | 1 |
| BW-14 | Hawk over headings, line over hawk | the hawk dropped to z 3 | 1 |
| BW-15 | The line off screen: an outlined pill that brings it back | the pill filled navy | 2 |
| BW-17 | Reduced motion: no drift, no glide, no replay | the drift forced on | 1 |
| BW-18 | Landscape: header folded, no dock | the dock forced on | 1 |
| **BW-19** | A pill leaves the view fitted (z = 1) | Months tapped after the pill | 3 |
| **BW-20** | All groups folded: no overlap, each gap ≥ 12px | every other heading pulled 30px up | 1 |
| **BW-21** | Zoomed: no edge chips or figure pills; gridlines at Weeks, not Months; fades | a figure pill injected | 1 |
| **BW-22** | Months = 120 days across; Weeks = the rule; All = fitted | the zoom pushed past the level | 1 |
| **BW-23** | A hold on a zoomed bar opens the menu with its state's actions; elsewhere it scrubs ("7 Dec · 20 out") | bars ignore the finger | 1 |
| **BW-24** | Search flies to Weeks with the row on screen and glowing | the glow hidden | 1 |
| **BW-25** | The badge shows N; Show me visits each; Done clears it and records the visit | the badge hidden | 1 |
| **BW-26** | No-date group under All and Waiting only; the sheet has the app's slider; nothing covers its controls; Save writes and moves the row out | Save's handler stripped | 2 |
| **BW-27** | Pull only on the fitted view: "Let go to refresh" → "Checking for news…" → one refetch → "You're up to date." | the pull indicator hidden | 1 |

Notes on the red-first pass:

- **"Elsewhere" reds come from running 24 times in a row against one emulator.** In `BW_MUTATE=all`, the green pass and each mutation run date one no-date query, and the harness has six. From the seventh run on, BW-26 reads "population: none" and two readings drop (58 instead of 62). A single run always has them. The other "elsewhere" reds are mutations that legitimately show in a second lock (for example, a hidden pill also fails BW-15's tap).
- **The empty-state mutation was re-run on its own** after the emulator returned 500 UNKNOWN on a write an hour into the long pass. It reads 3 own reds, 0 elsewhere. Emulator writes now retry up to three times.

## Shots

`shots/index.html` puts the build beside the ref for 01–20. The shot list follows the ref's own file names, so 09 is the news stepper and 10 is the one-liner.

- **18:** the no-date sheet shows the app's week slider in place of the ref's 4/6/8/12-week buttons (OVERRIDE).
- **Throughout:** the harness's data differs from the ref's sample:
  - 70 open queries, not about 10;
  - older queries, so bars start off screen to the left at Weeks;
  - two "Agent not recorded" rows;
  - three separate queries to Elinor Hale. The news one-liner names her twice ("Elinor Hale reached the reply date · Elinor Hale…") because two of her queries reached their dates.
- **06, 11, 18, 20:** the dock is hidden behind the lifted world (fix 1 above), as in the ref.
- **20:** the recap reads "952 days on the hunt", counted from the harness's oldest query.

## Points for Nick

1. **Reopen on the phone** goes to the query, not a reopen journey. Should the phone get one?
2. **News that names the same agent twice** reads oddly. Should it add the manuscript, or group by agent?
3. **The no-date default can be a past date for an old query.** Should the slider start no earlier than today plus a week?
4. **Undated "with you" queries** now draw to today in With you (fix 3). Say if they should instead get a "+ Add send-by date" chip of their own.
5. **Dev carries this branch merged over Contact list rows v1.2** (`dev/bew3-clr12`). Neither is merged to main.
