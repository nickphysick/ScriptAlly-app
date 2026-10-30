# Dashboard first visit v2 — report

Branch `dashboard-first-visit-v2`, cut from the branch dev served once dashboard feed v1 reached it:
`dev/…-sip1-pls1-pfx1-df1` at `b9684661` (`index-BQ2ftw2C.js`, confirmed by building it). Nine parts, one commit each
(A–I), plus this part (J): the locks, the shots, the report, and the deploy to dev. **Not merged; prod untouched.**

## False premises

1. **The base did not exist when the pack arrived.** The branch dev served (`…-sip1-pls1`, `index-4L_rFD9m.js`) carried
   first visit v1 and the help system but **not dashboard feed v1**, which was still being finished in another session's
   worktree. Stopped and reported, then waited (Nick's call) until feed v1 was merged into `…-pfx1-df1` and deployed.
2. **The help spotlight cannot target an element outside its own page guide — as built.** It lived inside
   `PageChecklist`, and the dashboard has no page guide (feed v1's report says so too). Not a stop: its page-driven card
   was lifted, unchanged, into `shell/guide/SpotCard`; `PageChecklist` renders through it, and so does the tour. One
   spotlight, not a second overlay.
3. **"If `notifyPrefs.nudges` is already true, it's never shown" — it is true for almost everyone.** `NOTIFY_DEFAULT.nudges`
   is `true`, so the Settings reader says "on" for an account that never chose. The ask reads the **stored leaf**; only a
   stored `true` (the writer's own choice) suppresses it. The harness account had it stored, so G1 clears it first and
   restores it after.
4. **"Picking an answer saves it to the same fields sign-up wrote": first visit v1's answer was not one of them.** v1
   stored "Yes / Not yet" in `todoPrefs.dash.start`, a dashboard preference. v2 reads and writes `User.queryingStage` and
   `Manuscript.status`; v1's stored answer is read only for an account that never answered the stage question.
5. **An account that said nothing at sign-up cannot be told "You said…".** `answerFor` returns null then, and the card
   opens on the question ("Where are you with {Title}?") rather than inventing an answer.
6. **"One agent, no query: the answer line is hidden" leaves such a writer no way to change the answer.** Built as
   specified (screen 09). With agents on file, the ready path reads "You have N agents on file" and offers no "Not right?
   Change it". Flagged for Nick; B1 runs with the dashboard's no-agents dev aid for that reason.
7. **`signed_up` cannot carry a path "when the account is created".** The path comes from the stage and readiness
   questions, which are asked after the account exists. It is recorded once set-up finishes (`finishOnboarding`), with the
   path its answers chose.
8. **A resumed review's deck reads "1 of 8", not "24 of 31".** The review's deck counts the rows still asking something
   (plus any answered in the current visit). It reopens on the 24th row, which is the claim F1 holds; the counter is the
   review's own and was left alone (the pack forbids touching the review beyond saving and restoring).
9. **Escape was being taken app-wide by a page that is not on screen.** Every workspace page stays mounted, and some
   register an always-on escape layer at the page level (e.g. `ComposeCard`'s `useEscapeLayer(true, …, ESC_LEVEL.page)`).
   The app's stack eats Escape for its top layer, so the example (at `pageMode`) and the tour (the spotlight's own window
   listener) never heard the key — measured with a temporary in-page probe. The example now takes Escape at `pageModal`
   and the tour at a new `ESC_LEVEL.tour`. **The always-on page layer is not fixed here** (other pages' files); it also
   swallows Escape for the help system's own spotlight on any page where it is live. Reported.
10. **"Tell us when it's ready to query" can never tick on the writing path**, by construction: the moment it is true the
    path is the ready one. So the still-writing path never reaches its finish line; its finish copy is written anyway.
11. **The comparable-titles row ticks at three titles, not one** ("a comparable title saved", but "like v1's"): v1's rule
    (`COMPS_TARGET`) is kept for both paths, so one row means one thing.
12. **The draft is not only Smart Import's.** The template path shares the review, so it keeps a draft too; the card says
    "Smart Import · started …" for both. F1 drives the template path because it reads the file in the browser (no model,
    no entitlement).
13. **No fresh account was created.** D1 resets the harness account's tour flag; I1's "fresh-account walk" runs on the
    emulator through the app's own `buildEvent` (the client can never read `events`, so a walk on dev cannot be read back).

## The base

`dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2-td12-ppp1-pa2-8-sip1-pls1-pfx1-df1` at `b9684661`: dashboard feed v1
(A–H), first visit v1, the help system v1 and phone fixes v1. During this pack dev moved to `…-df1-g4` (`index-DY34491Q.js`:
feed v1's report and a two-line phone CSS fix — none of this pack's files), which is what the integration is cut from.

## Step 0

1. **Base:** as above.
2. **The three sign-up answers**, all readable by the dashboard:
   - readiness: `Manuscript.status` (`DRAFTING` · `REVISING` · `READY_TO_QUERY`), written by onboarding v9's readiness step
     (`v9/AckTitle`);
   - "already querying?": `User.queryingStage` (`starting` · `early` · `deep` · `interest`), written by onboarding's welcome
     step (`Onboarding.tsx`, read through `lib/onboardingStage`);
   - first visit v1's `StartPath`: `todoPrefs.dash.start.{msId}` (`"yes"` · `"notyet"`).
3. **First visit v1's pieces:** set-up card `fv1/SetUpCard`; Getting started `fv1/GettingStarted` over `gettingStartedRows`
   (`lib/dashEmpty`) and `gsOrder`/`gsCopy` (`lib/dashFirstVisit`); first-win stamp `fv1/FirstWinStamp` + `lib/firstWin`;
   the chart's empty states `chartEmpty` (`FIRST_POINT`, `BETWEEN`) in `OneScreenChart`; Closed's "Nothing closed yet." in
   `v60/Dash60Left`; `dashList` ordering. Feed v1 had re-hosted the stamp, the chart and Closed in its querying page and
   **kept v1's whole pre-query page as it was** (its own layout, the navy header, the Mentor bubble, Getting started as a
   task-card page).
4. **The spotlight:** `shell/guide/PageChecklist`, its one-press spotlight and its page-driven `FlowCard`; geometry in
   `lib/pageChecklist` (`holeFor`, `dimPath`, `cardPlace`). See false premise 2.
5. **Smart Import's review state:** React state inside `onboarding/SmartImportReview` (agents, queries, reconciled,
   touched, the step) over `ImportFlow`'s `validated` read — memory only; everything is lost on leaving. Steps:
   duplicates · agents · queries. **Size:** a 300-row draft measures **265,171 characters**, one part; parts are 700,000
   characters (the rules cap one at 900,000), so a long file is split, in order, under `importDrafts/{uid}/parts/{n}`.
6. **`notifyPrefs`:** `{ nudges, weeklyDigest, discover, scout }`, read through `notifyPrefs()` with `NOTIFY_DEFAULT`;
   single leaves are written with `updateUserPaths({ "notifyPrefs.nudges": true })` (Settings saves the whole map from its
   reader, which is why the reader carries every key).
7. **Completion hooks:** `db.addQuery` and `db.addAgent` (`noteFirstWin`), and `ImportFlow`'s commit. Part I's
   `first_agent` / `first_query` sit beside them; `first_comp` is in `db.updateManuscript` (every comps write goes through
   it); `first_letter` in `db.addVersion`.
8. **The "?" menu:** `shell/HelpMenu`, mounted by `WorkspaceShell`. "Show me round again" comes in through a new `onTour`
   prop, read from the tour's module-scope door (`lib/dashTour`), the same shape as `lib/pageGuide`'s.

## Per part

| Part | Commit | What | Locks |
|---|---|---|---|
| A | `49f963c6` | every first-visit state in feed v1's three columns; Getting started as the sheet; the empty feed; five labels | FV2-A unit; A1, A2 |
| B | `0187ac82` | the set-up card states the sign-up answer; Change it writes the same fields | FV2-B unit; B1 |
| C | `77eb6a5a` | the still writing and revising path's rows; "It's ready →" | FV2-C unit; C1 |
| D | `1f15dc20` | the three-stop tour through the lifted `SpotCard`; Show me round again | FV2-D unit; D1 |
| E | `0d8f9b19` | the example dashboard over sample data, inert, writing nothing | FV2-E unit; E1 |
| F | `60f4409a` | the kept import review; rules; the daily clean-up function; the resume card | FV2-F unit, rules, emulator; F1 |
| G | `950effa1` | the nudge-email ask under the first query's row | FV2-G unit; G1 |
| H | `e3c019f0` | the finish line; Close this list | FV2-H unit; H1 |
| I | `003f7bff` | the event log: writer, rules, every hook | FV2-I unit; I1 (emulator) |
| J | (this commit) | the locks, re-points, shots, report, CLAUDE.md, two Escape fixes found by the locks | — |

**Retired with Part A** (no caller left once Getting started left the task card): `fv1/MentorTip`, `v71/Dash71Right`, the
task card's Getting started branches, and fv1.css's one-screen squeeze rules. Kept on purpose, dead but tested:
`dashList`'s `start` group and `gettingStartedItem`/`gettingStartedPlan` (pure, locked by `dashListOrder.test`).

## The locks (FV2, `tests/e2e/dashFirstVisitV2.measure.ts`)

**Red first, against dev without this pack** (`SA_E2E_BASE_URL=dev`, `index-DY34491Q.js` — `…-df1-g4`, see the base):
**9 of 9 red** (`redfirst-base.txt`). Each lock's own ledger then went **green on the branch build** (`green-branch.txt`,
`ledger/`): **9 of 9, 81 readings.**

| Lock | Readings | Named break (FV2_MUTATE) | Red reading under the break |
|---|---|---|---|
| A1 placement | 16/16 (1512 and 1280) | the set-up card moved to the left column | "the middle column's first card: empty-feed"; card 268,520 vs column 855,119 |
| A2 labels | 5/5 | the label uppercased | "GETTING READY", "STILL WRITING", "IN REVISION", "QUERYING" |
| B1 answer | 5/5 | the sign-up stage removed (the old question's state) | "You said you've already sent some queries…" (v1's stored answer read instead) |
| C1 It's ready | 5/5 | the status put back after the press | "status Drafting, stage starting" |
| D1 tour | 10/10 | the flag cleared before the reload (runs on every load) | the reload showed the tour; the ? menu was covered (timed out) |
| E1 example | 6/6 | the example wired to the writer's own user and writer, `inert` and the Scout guard removed (source) | a write to `users/{uid}` `notifyPrefs.scout` while open |
| F1 resume | 14/14 | the draft deleted on leaving | no resume card (timed out waiting for it) |
| G1 ask | 10/10 | the whole notifyPrefs map written | "weeklyDigest kept (undefined)"; `{"nudges":true}` |
| H1 finish | 10/10 | the close not stored | "still the goal sheet after a reload" failed; "the flag is stored" failed |
| I1 events | 5/5 (emulator) | client reads allowed | "a client read is denied, even the writer's own" red |

**What each lock reads** (the full list is in the file): A1 the middle column's first child and its box against the
column's, Getting started's top against the book's bottom, no queries card / buttons / task card before the first query,
the queries card and the sheet after it; A2 five states (three statuses on the pre-query book, the querying book, a
between-rounds book of its own); B1 the sentence, the write re-read from Firestore, the heading, the row order, the
label; C1 the five rows with "ready" current, the press, the write, the ready path, the done rows still ticked; D1 the
hole round the set-up card, focus on Next, Got it on stop 3, the events the page sent, no tour after a reload, the replay
from the ? menu, Escape, no tour and the flag stored for a first load with queries; E1 the bar, the querying page over
sample data, no write to the writer's data (the one `events` write for `example_opened` counted apart), Back to yours,
Escape; F1 to H1 as their commits say.

**Sizes:** A1 at 1512×982 and 1280×800; the other locks hold behaviour, not layout, and run at 1512×982. The shots cover
both sizes for every state.

**Fixes the locks found (in this commit):** the example's Escape and the tour's Escape (false premise 9).

## L1: no regression

Run against the branch build (`l1-branch.txt`): dashboard first visit v1, dashboard feed v1, dashboard mobile v1 (its
desktop cases) and the help system v1.

**Re-pointed, each with a note at the change:**
- `dashFirstVisit` DFV-A A1 → the pre-query page is the three columns (`data-fv2="pre"`, the set-up card, Top tip, the
  Getting started sheet, no task card); A3 → no buttons on the book, its label "Still writing"; A8 → the loading beat's
  shape is the three columns; DFV-C C2 → the last page never wraps round (it may say "Then: finish getting started").
- `dashFeedV1` DF1-B1 → measured with Getting started hidden (`seedFv2.mjs gs-hide`, restored in the run): the slot
  under the book holds Getting started until it is hidden, closed or finished.
- Unit: `dashboardPageSmoke`, DF1-C (`f1Queries.test`), DFV-A (`dashFirstVisit.test`), the two file censuses
  (`oneScreenMark`, `oneScreenPanel`), `firestoreHandle` (the twelfth consumer).

**Retired** (`tests/e2e/RETIRED-dashboard-first-visit-v2.md`): DFV-A A4 (no scroll), A6 (the v1 answer survives a
reload), A7 (the per-visit tip).

**Not this pack's:** 12 help-system cases (HS1-A1, B1, B3, C1–C6, D1–D3) are red on the branch — the same twelve feed v1's
report found red on dev before it. Re-run on dev without this pack (`l1-hs1-base.txt`): B1, B3, C2, C3, D1 and D3 give the
**identical readings** (the articles, Escape on the Contact list, the agent-panel and status-column preconditions). Every
one is on the Contact list or the Query Centre.

After the re-points: first visit v1 3/3, feed v1 12/12, mobile v1 (desktop) 2/2, help system v1 4/16 (the 12 above).

## The rules

Both new collections, in `firestore.rules`, with emulator tests (`tests/rules/importDrafts.rules.test.ts`,
`tests/rules/events.rules.test.ts`), each deny case proved red by a mutated rules file (`rules-red.txt`):

- **`importDrafts/{uid}` + `parts/{n}`:** only the owner reads, writes and deletes; the meta has exactly its fields, its
  `uid` is the writer's, counts never exceed their totals, and `updatedAt == request.time` (so "7 days from the last
  change" is the server's clock); a part is `{ i, data }` at a numbered id, at most 900,000 characters.
- **`events/{id}`:** create only, by the signed-in writer for their own uid, at the server's time; exactly
  `uid, name, at, path, props`; `name` and `path` from fixed lists; `props` only the keys `path, from, to, stop, step,
  agents, queries, answer`, each an enum or a count. No client read, update or delete.

Rules suite: 232 → **243** passed (6 + 5 new). Dev rules deployed twice (releases 15:45:04 and 16:22:22, verified by the
release `updateTime`, then `rulesProbe.mjs`). **Prod rules are Nick's.**

## Gates

| Gate | Baseline (`b9684661`) | Final |
|---|---|---|
| tsc (app) | 0 errors | 0 errors |
| tsc (functions) | 0 errors | 0 errors |
| production build | clean | clean (no CSS diagnostics; `__saEvents` absent: 0 matches) |
| dev build | clean | clean |
| Vitest | 701 files · 10,803 passed · 3 skipped | 710 files · **10,858 passed** · 3 skipped |
| rules | 4 files · 232 passed | 6 files · **243** passed |
| functions (emulator) | — | 3 files · 42 passed (the clean-up spec new) |

## Shots

`shots/`, one beside each `screens/*` file at 1512 and 1280 (`01-first-visit-querying`, `02`–`04-tour-stop-{1,2,3}`,
`05-first-visit-not-yet`, `06-still-writing`, `07-change-answer-open`, `08-import-left-halfway`, `09-one-agent`,
`11-first-query-reminder-ask`, `12-reminder-answered`, `13-first-query-closed-tab`, `14-all-closed`, `15-all-set-up`,
`16-example-dashboard`). `10-first-query-stamp` is first visit v1's stamp, unchanged and locked in `lib/firstWin.test.ts`;
striking it on a page needs a writer's first query, which the shared account cannot have again.

## Integration and dev

{{DEPLOY}}

## Out of scope, reported

- The always-on page-level escape layers (false premise 9).
- The ready path with agents offers no "Change it" (false premise 6).
- `dashList`'s `start` group is now unreachable from the desktop (kept, tested).
- Don't deploy this to prod before emails v1 lands: Part G tells writers "we'll email you".
- `functions` deploy to dev: `importDraftsCleanup` (see the deploy section).
