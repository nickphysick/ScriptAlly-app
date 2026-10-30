# Phone fixes v1, then the whole phone app end to end — report

Branch `phone-fixes-v1`, cut from `ba0513b6` (what dev served: `index-4L_rFD9m.js`, confirmed by building it).
Refs: `design-refs/phone-fixes-v1` MANIFEST `a4c572a8…2c24`, 9/9 OK; `design-refs/phone-app-v2` MANIFEST OK.
Dev: **before `index-4L_rFD9m.js` → after `index-BdI7VYoR.js`** (hosting only, from a clean worktree of
`dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2-td12-ppp1-pa2-8-sip1-pls1-pfx1` at `3c858ca9`). Not merged; prod untouched.

⚠️ **A DEV DEPLOY OF MINE OVERWROTE ANOTHER SESSION'S, AND IT IS REPAIRED.** At 14:43 the dashboard-feed session
deployed `…-pfx1-df1` (my F commit plus Dashboard feed v1, `index-BQ2ftw2C.js`). At 15:03 I redeployed my own
branch for G4 without stopping on the changed hash (`index-DTjNfszD.js`), which took the dashboard feed off dev for
about twenty minutes. Repaired by building **on top of theirs**: `…-pfx1-df1-g4` = their `8d9d6272` + my G4
(`581dd451`), after confirming their branch alone rebuilds to exactly `index-BQ2ftw2C.js`, deployed only once dev
was confirmed still on my build. **Dev now serves `index-DY34491Q.js`: Dashboard feed v1 and all of this pack.**
Their branch was not touched. Final dev chain: `4L_rFD9m` → `BdI7VYoR` (mine) → `BQ2ftw2C` (theirs) →
`DTjNfszD` (mine, the mistake) → **`DY34491Q`** (theirs + mine).

## False greens — why the earlier locks missed bugs 1–5, and how each was repaired

phone-app-v2 had a Birds-eye lock (Q6), scroll and tuck-away locks, and a 782-check sweep (PA2-8), all green over five
bugs a phone showed in seconds. One cause runs under all five: **every one of those locks ran in the `measure` project —
Chromium at a desktop window resized to a phone, a mouse, no touch** — and each also measured something next to the bug
rather than the bug.

| Bug | The lock that should have caught it | Why it stayed green | Kind | Repair (red on the base build `ba0513b6`) |
|---|---|---|---|---|
| 1 · the floating fade with a gap | none looked at the bar's neighbourhood; the sweep's W2 colour law reads TEXT, and the fade holds none | the fade is a sticky, text-free gradient 20px above the bar: no text to colour-check, no element anyone named | measured the wrong thing | PA2-1 S2 now asserts `.sv2-fade` is not drawn on a phone; PF1 F2 samples the pixels above the bar. Red on base: the fade is `display: block` there. |
| 2 · pages do not scroll | PA2-1 S2 tuck-away (Home only); every suite that reached content with `scrollIntoView` | S2 ran on **Home, the one page whose slot is `flow`** and so the one page that scrolled, and moved it by **writing `scrollTop`**. Every other suite brought content into view with `scrollIntoView`, which **scrolls an `overflow: hidden` box** — script can scroll a clip that no finger can | script path, wrong page, Chromium only | S2 now drags by touch (CDP `Input.dispatchTouchEvent`) on Home AND Queries; PF1 F1 drags all 24 pages of decision 2 to their last item. Red on base: Queries "scrolls by touch" reads 0. |
| 3 · search does nothing | none: the band's buttons were checked for presence and their accessible names | the button was there, named "Search", 44px, white on navy — every law the suites knew held. Nothing ever pressed it on a phone; on the desktop path it opens the palette, which is the correct desktop behaviour | measured the wrong thing (presence, not effect) | S2 now taps search and requires a full-screen layer; PF1 F4 likewise, and searches. Red on base: the palette opens and is invisible at 390. |
| 4 · Birds-eye is a plain list | PA2-3 Q6 | Q6 counted **rows** (every open query, once; none closed) — all true. The bar's track was a span whose `display: block` lived only under `.pa-pg`, so in the sheet every bar drew **0px tall**; a membership check cannot see a height | measured the wrong thing | Q6 now reads each row's drawn track and requires ≥6px; PF1 F5 compares each fill with `eyeProgress` computed in Node. Red on base: every track 0px. |
| 5 · Log a query opens scrolled | PA2-4 F1 | F1 asserted the first STEP ("Who did you query?") — true — and never where the screen was. It opened the flow with `click()` (mouse) in Chromium, where autofocus's scroll lands differently | measured the wrong thing; mouse path | F1 now asserts the sheet's scroll is 0, the card's top is on screen and nothing is focused; PF1 F6 does the same from + and after Queries was scrolled 740px. Red on base: autofocus scrolled the sheet. |
| — the 782-check sweep (PA2-8) | — | it read each route's FIRST SCREEN: band present, colours, images, uppercase, sideways overflow, tap targets, input sizes. **It never scrolled by touch and never tapped**, so bugs 2–5 were outside it by construction; bug 1 has no text for W2 | measured the wrong thing; desktop/mouse project | not repaired in place (its first-screen laws are right for what they claim); the journeys (Phase G) are the touch-and-tap layer it lacked, and the phone projects now run it on WebKit too. |

**A red-before proves a lock catches its own break, never a fault it does not measure** — which is why each repair above was proved red against the base build, where the real fault is, and not only against a staged mutation.

## The five bugs: causes, with file and line (base build `ba0513b6`)

| # | Bug | Cause |
|---|---|---|
| 1 | A white fade with a gap floats above the tab bar | `.sv2-fade` (`AppShell.tsx:584`, `shellV2.css:739`) is sticky at the foot of the stage, which ends 20px above the floating bar (stage foot 627, bar top 647 at 393 × 727). |
| 2 | Pages don't scroll | `StagePage` (`AppShell.tsx:141–153`) gives `fill`/`clip` slots `flex: 1; min-height: 0; overflow: hidden` inline, and `.ws-work--fit` (`workspaceShell.css:464`) is `flex: 1 1 0; min-height: 0`, so every phone page sat in a clipped box (Queries: a 358px box over a 3,786px page). Home's slot is `flow`, which is why it alone scrolled. Import also had a second scroller (`.wpg-scroll`). |
| 3 | Search does nothing | The band's search calls `openPalette` (`AppShell.tsx:614`), which mounts the desktop palette; nothing of it is visible below 768px. |
| 4 | Birds-eye is a plain list | `.pa-barh` is a span whose `display: block` exists only under `.pa-pg` (`pagesPhone.css:192`); the Birds-eye sheet (`QueriesPhone.tsx:262`) is not under `.pa-pg`, so every bar drew 0px tall. |
| 5 | Log a query opens scrolled down | `autoFocus` on the agent field (`LogJourney.tsx:595`) scrolled the flow to it on open. |
| 6a | The reply wheel was not in Log a query | Log a query used the desktop `DateField`; the wheel lived only inside `EditQueryPhone`. |

## What changed (commits)

| Commit | What | Files |
|---|---|---|
| `8fd56b3b` A | One scroller per page (the stage), touch scrolling on every page of decision 2 | `phone/phoneShell.css`, `playwright.config.ts` (phone projects), PF1 F1 |
| `3b2b2136` B | Frosted bar (white 60%, `blur(20px) saturate(1.5)`, solid fallback); the gapped fade gone; an edge fade anchored to the screen's foot that fades out when the bar tucks or the page is at its end | `BottomTabBar.tsx`, `AppShell.tsx`, `phone/phoneShell.css`, `tests/e2e/measure.ts` (sign-in race), PF1 F2–F3 |
| `453d2267` C | Search on phones, full screen as `ovSearch`, on the palette's own `buildCorpus`/`rankItems`/`scoreItem` | `phone/PhoneSearchPage.tsx`, `phone/phoneSearch.css`, `AppShell.tsx`, PF1 F4 |
| `91fbe69b` D | Birds-eye shows progress: the fill is `eyeProgress(row).fill`, closed queries left out, a tap opens the query sheet | `QueriesPhone.tsx`, `queriesPhoneV2.css`, PF1 F5 |
| `8c0c0828` E | Log a query opens at scroll 0 with no autofocus on phones; "New query" heading in the card (Special Elite 26, "Day 0" 14 muted); the reply step is the Edit page's chips + wheel, now one component | `phone/ReplyWheel.tsx`, `phone/replyWheel.css`, `EditQueryPhone.tsx`, `editQueryPhone.css`, `PhoneFlowShell.tsx`, `phoneFlow.css`, `LogJourney.tsx`, `QueryPicker.tsx`, PF1 F6–F8, PLS1 L7 re-pointed |
| `d8aacc63` E follow-up | The wheel keeps both columns when they settle in one 90ms window (L7 saved 8w3d for 11w3d) | `phone/ReplyWheel.tsx` |
| `4d38d375` G1 | The new-agent panel opens above Log a query on a phone (it opened behind the flow, z 74 under 1011) | `agents/panel/agentPanel.css` |
| `c75d9a12` G2 | The Agents sheet closes when the writer leaves Agents (it followed the writer to every later page and locked its scroll) | `agents/phone/AgentsPhone.tsx` |
| `aa333cde` G3 | The new-agent footer note gets its own row on a phone (it was one word per line) | `agents/card/agentEditMode.css` |
| `3c858ca9` F | Locks, the false greens repaired, the WebKit project on every phone suite, shots | config, PF1, PA2-1/3/4, PP1, `touch.ts`, `phonePages.ts`, `reports/phone-fixes-v1/{before,after,pairs}` |
| `ca8c82ea` G4 | The phone flow's close and back are 44 × 44 (the journeys measured 40 × 40 on every step) | `queryActions/phoneFlow.css` |
| (last) G | The journeys, the fresh-account helper, the sweep, this report | `phoneJourneys.e2e.ts`, `freshAccount.ts`, `pfjSweep.cjs`, `phoneSharedSnapshot.e2e.ts`, `reports/phone-fixes-v1/journeys/` |

## Gates

| | Baseline (`ba0513b6`) | Final |
|---|---|---|
| tsc root | 0 | 0 |
| tsc functions | 0 | 0 |
| `npm run build:dev` grepped for `error\|[WARNING]` | clean | clean |
| Vitest | `Test Files 697 passed (697)` · `Tests 10774 passed \| 3 skipped (10777)` | `Test Files 697 passed (697)` · `Tests 10774 passed \| 3 skipped (10777)` |

## The locks (`tests/e2e/phoneFixes.measure.ts`, PF1) — green on both phone projects, each red before

| Lock | Claims | Red-before (its `PF1_MUTATE` break, Pixel) |
|---|---|---|
| F1 | Every page of decision 2 (24) reaches its last item by touch drag, the item ending above the bar; exactly one vertical scroller, the stage | restore the clipping ancestor: every page `max 0`, nothing scrolls |
| F2 | No gapped fade; the edge fade is anchored to the screen's foot, fades with the bar | put the old `.sv2-fade` back: `oldFade: true` |
| F3 | The bar is frosted: `blur` in its backdrop filter, and the pixels under it change as content passes | remove the blur: `filt: none` |
| F4 | The band's search opens full screen, focused, and finds an agent by name | `pointer-events: none` on the button: `opened: false, hits: 0` |
| F5 | Every Birds-eye card's bar is drawn at `eyeProgress(row).fill` (recomputed in Node from the account's data); 39 cards (16 + 6 + 17) | `.pa-barh` inline again: every track 0 × 0 |
| F6 | Log a query opens at scroll 0, the card in view, nothing focused — from + and after Queries was scrolled 740px | autofocus the first field: `focus: INPUT` |
| F7 | "New query" ≥ 26px, Special Elite, inside the white card, no strip, "Day 0" | restore the strip: `inCard: false, strip: true` |
| F8 | The wheel at 3 weeks 4 days reads "25 days after you sent it", the card's slot carries the same date, and (Chromium) the stored expected date is 25 days after the sent date. Writes one query on the harness account and deletes it, its activity, feed rows, flags and tasks | round to weeks: "(3 weeks after you sent it)" |
| F9 | The desktop at 1440 × 900 is unchanged on Home, Queries, To-do, Agents, Analytics and Settings: every visible element's box and key styles in DOM order, and the screenshot's pixels, against the base build opened twice (its own disagreement is the noise mask; Home's cycling task card is hidden in all three) | apply the phone slot rule without its media query: Queries `dom 7, px 3125` |

F9 final: Home 582 elements · Queries 4,992 · To-do 1,214 · Agents 1,343 · Analytics 1,864 · Settings 311 — **0 DOM changes and 0 pixels on all six**, base noise 0.

⚠️ F8's stored half runs on Chromium only: Playwright's WebKit here cannot open Firestore's Write channel ("Fetch API cannot load …/Firestore/Write/channel", every run), so on the iPhone the write never leaves the page; the on-screen answer is the same derivation and is checked on both.

## The earlier phone suites, re-run on both projects

The phone projects now take every phone suite (`playwright.config.ts` `PHONE_SUITES`, which also picks up the three
with "Phone" mid-name), and start from one cached signed-in session per engine.

- **Re-pointed, with the reason at the line:** PLS1 L7 to the shared wheel's `data-rw` markers; PP1 starts signed out (the phone projects' cached session made it measure the signed-in variants).
- **The false-green repairs**, each red on the base build for the real fault (see the first section): PA2-1 S2 (`/queries` scrolls by touch "0", search "null", old fade "block"), PA2-3 Q6 (every track 0px), PA2-4 F1 (focus INPUT).
- **Red on both builds, not this pack's:** PA2-1 S1 "the badge equals the tray's overdue + today — todo 37 vs 30" (the badge, below); PA2-5 To-do (waits for the old `td7` count, which To-do v12 replaced); PP1 P5 (footer hit boxes overlap at 360).
- PA2-8's empty-account sweep timed out signing the empty account in on the Pixel project (15 min, `fill` ended); not re-run.

## The to-do badge: what 37 and 30 each count (report only — nothing changed)

Both figures are right; they answer different questions, measured on the harness account at the same moment.

- **37 — the phone's tab-bar badge**, and the phone To-do page's "37 from earlier" and "From earlier · 37": every live
  board card whose calendar item is dated today or earlier — `todoDueTally` (`lib/todoDueTally.ts`) =
  `assembleBoardColumns` → `calendarItems` → `dayBuckets`, overdue + today. All groups count, Gone quiet and
  Housekeeping included.
- **30 — the desktop To-do page's "Needs you now" summary** (To-do v12, `lib/todoUrgent.ts` `isUrgent`): only the
  cards that lead — Your move tasks that are an offer or due today or earlier, Worth a nudge tasks strictly overdue,
  your own tasks due today or earlier. **Gone quiet and Housekeeping never lead.** The 7 between them are dated cards
  in groups v12 deliberately keeps out of the carousel.
- The phone surfaces agree with each other (badge 37 = tally 37 = group 37); the disagreement is phone badge against
  desktop headline, and PA2-1 S1 was written when the badge's reference was the old tray headline. Which number the
  badge should carry is Nick's call.
- WebKit read **29** at the same moment the Pixel read 37 — on each engine badge, tally and group agreed. That is the
  WebKit harness's partly failing Firestore channel (some data never arrives), not a counting difference.

## Phase G — the whole phone app as journeys (`tests/e2e/phoneJourneys.e2e.ts`)

Every journey runs on **its own fresh account**, signed up through the app's own sign-up page and removed whole in
`afterEach` (every document under `users/<uid>`, then the Auth user — `tests/e2e/freshAccount.ts`); a killed run's
leftover is removed by `tests/e2e/pfjSweep.cjs`, which needs no password. On every step: console errors, failed
requests, text under 12px, the colour laws, no green, tap targets of 44 × 44, and a screenshot into
`journeys/<journey>/<project>[-dev]/NN-<step>.png`. A journey runs to its end and fails listing every step that broke
a law, so one bad screen does not hide the next ten.

### Results — the flow, and the laws

"Flow" is whether the journey did what a writer does (its own assertions); "laws" is the per-step check. **Every run
fails the laws** on the same few design-level findings (below), so Playwright's count is **6 failed of 6 on each of
the four runs**; the flow column is the one that says whether the app works.

| Journey | Pixel · local | Pixel · dev | iPhone · local | iPhone · dev |
|---|---|---|---|---|
| J1 new writer → first query → 1 active | flow ✓ (1 active) | flow ✓ (1 active) | ✗ the first query's write never reached the server (WebKit, below) | ✗ same (0 active) |
| J2 importer: piles = overview, questions, Home/Queries = overview | flow ✓ ([6,6] = [6,6]; Home 5 active, Queries 6, Agents 6) | flow ✓ (same) | ✗ the import's write did not land (WebKit) | flow ✓ (same as Pixel) |
| J3 nudge, response, send the full, close + Undo, Birds-eye, search | flow ✓ (all six) | flow ✓ (all six) | ✗ stopped after the response's save (WebKit write) | ✗ stopped at a tap after the response's save |
| J4 every page to its end by touch, open + back, tuck, 320–430 | flow ✓ (24 pages, no sheet left, no sideways scroll) | flow ✓ | flow ✓ | flow ✓ |
| J5 materials | **not built** — see below | — | — | — |
| J6 settings, plan, sign out, Forgot?, sign-in ↔ sign-up, error page | flow ✓ (error page: no hook) | flow ✓ (one console error, below) | flow ✓ | flow ✓ |
| J7 keyboard: field + pinned button in view | sign-up ✓ · log ✓ · set-up ✗ (field not focused) | same | sign-up ✓ · log ✗ (button 398 > 365) · set-up ✗ | same as iPhone local |

**The WebKit caveat, stated once.** Playwright's WebKit on this machine intermittently fails Google's fetches
("Fetch API cannot load …googleapis…"): Firebase sometimes holds its splash, and Firestore's Write channel often never
opens, so a save on the iPhone project may never leave the page. It is the harness's network, not the app — the same
build completes every journey on the Pixel, J2 completed on the iPhone against dev, and PF1 retries the splash stall
once and records it. Writes on a real iPhone are on the tap-through list.

### (a) Phone-layer bugs the journeys found — fixed, each with its regression check

| | Found by | Fault | Fix | Check |
|---|---|---|---|---|
| G1 `4d38d375` | J1 | "Someone not on my list" opened the add-agent panel at z 74, **behind** Log a query's full-screen layer (1011): nothing visible happened | the panel over the flow is 1013 on phones | J1 fills the panel and logs with the new agent |
| G2 `c75d9a12` | J4 | the Agents profile sheet (local state on a page that stays mounted) **stayed open after back** and covered — and locked the scroll of — Corkboard, Analytics, Responses and Manuscripts | closes when the path leaves `/agents` | J4: back leaves no sheet open, every page reaches its end |
| G3 `aa333cde` | J1 | the new-agent footer squeezed "A name or an agency is needed" to one word per line | the note takes its own row on phones | J1 reads its line count (≤ 2; measured 1) |
| G4 `ca8c82ea` | every flow step | the flow's ✕ and back were 40 × 40 | 44 × 44 | the tap law on every flow step |
| E follow-up `d8aacc63` | PLS1 L7 re-run | the shared wheel lost the weeks when both columns settled together (saved 8w3d for 11w3d) | each column records itself before reporting | L7 green; F8 green |

### (b) Questions for Nick — not changed

1. **The founders page has no way to sign up** (J1, `journeys/J1/pixel/03-founders.png`). The menu's "Become a founding writer" opens `/founders`, whose only call to action is the waitlist form ("Claim your place"); the brief's journey assumes sign-up follows. J1 continues at `#/signup`.
2. **"Setting up your dashboard" is the import's loader only** (`ImportingLoader.tsx`). A writer starting fresh goes straight to Home; the brief's J1 expects it there too.
3. **Logging a first query is not celebrated.** The phone celebrates a query moving into a request or an offer (`cheerFrom`); the brief's J1 expects a celebration after the first query.
4. **The set-up band's step count changes mid-flow**: "Step 1 of 3", then "Step 2 of 2" once "Just getting started" is chosen (`journeys/J1/pixel/05-setup-1-welcome.png`, `06-setup-2-book.png`).
5. **The tab bar's labels are 11px** (Home, Queries, To-do, Agents — the most frequent small-text finding, on every workspace step). The phone-app-v2 boards draw them at that size; the 12px law says otherwise. Which wins?
6. **Tap targets under 44 that look deliberate**: the beta strip's "tell us when you find one" (124 × 18) and its ✕ (20 × 21) on every screen; set-up's text links ("‹ Back", "Change", "Skip", 45 × 20); the import review's "Add details" / "Don't import"; the landing nav's "Log in" (66 × 36) and burger (32 × 41); sign-up's inputs (41 tall); the set-up genre and age pills (36 tall).
7. **Cream on navy where the law says white**: the shared initials discs in the import (`sa-disc im-disc`), the set-up's chosen genre pills (`o9-pill.is-on`), and the agent panel's "Add to your list" all use `#f4eee5` on navy.
8. **Burgundy on blush where the law says ink**: the landing's marketing chips (`mk-ccpill`), the celebration's "Full requested" stamp, and the import review's blush band (`#5a3027`).
9. **The to-do badge** (above): should the phone badge say 37 (everything dated by today) or 30 (what "Needs you now" leads with)?
10. **No error-page hook exists** for J6 to force a render error, and none was added in this pack (the brief allowed one behind a dev-only flag); the error page is unexercised.
11. **J7, Log a query on the iPhone's shorter screen**: with the viewport shrunk to 365px, the flow's pinned button sits at 344–398, below the line. On the Pixel's 400px it fits by 2px. Whether a real iPhone keyboard hides it is the first item on the tap-through list.

### (c) Outside this pack — not changed, with the change needed

- **Manuscripts (a parallel session's files):** the phone Manuscript page's Edit, New package and Make a copy buttons remain open, as the brief records.
- **Signing out logs a permissions error on dev** (J6, Pixel · dev, `11-signed-out`): *"Firestore get failed at users/<uid>/tasks: Missing or insufficient permissions"*. The `users/<uid>/tasks` listener in `src/lib/db.tsx` is still subscribed when Auth signs out; the change is to unsubscribe the user listeners before `signOut()` (or on the auth-state change, before it reaches the listeners). Shared data layer, not the phone.
- **PA2-5 To-do** waits for the old `td7` count, which To-do v12 replaced; **PA2-8's empty-account sweep** times out signing the empty account in on the Pixel project; **PP1 P5**'s footer hit boxes overlap at 360 — all red on the base build too.

### J5 — not built

The materials journey (write a letter, send it with a query, edit it as the next version, build a package step by step,
open Packages, Comps and Versions directly) was not written. Packages, Comps and Versions are reached by touch in J4
and reach their ends; the editor and the package builder are not exercised end to end on a phone by this pack.

### What only a real phone can show — Nick's tap-through list

1. **Log a query with the keyboard up on an iPhone**: type an agent's name — is "Continue" still visible above the keyboard? (J7 measured it 33px below the line at 365px.)
2. **Set-up's title field with the keyboard up**: does the field scroll into view when tapped? (J7 could not focus it in the harness.)
3. **Saving on an iPhone**: log a query, record a response, import — do they land? (The harness's WebKit could not hold Firestore's write channel.)
4. **The frosted bar over real content**: is the blur visible on iOS Safari, and does the edge fade sit flush with the home indicator?
5. **Rubber-banding**: pull past the top and the end of Queries — does the bar's tuck stay calm, and does the edge fade not flash?
6. **Android's back button** on an open agent sheet (G2 closes it when the page changes; back from the sheet itself now leaves the page — is that the wanted feel, or should back close only the sheet?).
7. **Landscape on a notched iPhone**: the tab bar and the flow's ✕ against the notch.
8. **Search** with the real keyboard: does Cancel stay reachable, and does a result open the query sheet?

### The shared account ended as it started

Fingerprint of every store under the harness account (document count and a hash of the sorted documents) before the
dev journeys and after all journey runs: **all twelve stores identical** (402 activities, 88 queries, 53 agents, 20
tasks, 17 task flags, 18 versions, 11 packages, 6 manuscripts…). The **user document** differed in exactly one leaf,
`todoPrefs.dash.tip` — the dashboard's tip rotation, which every session that opens the dashboard advances (shown by a
fingerprint either side of one PF1 run: `2 → 3`). Those sessions were the lock re-runs (PF1, PA2), never the journeys,
which do not sign into this account. Its earlier value is only known as a hash, so it was not put back.


## Worktree and accounts

- **Test accounts left behind: none.** `node tests/e2e/pfjSweep.cjs` lists every `pfj-` Auth user on
  `scriptally-dev`: `PFJ 0 []` after the last run. One account was left by an early probe that timed out before its
  removal ran; it was removed with its data (`users/<uid>` 404, no subcollections) and is why removal now lives in
  `afterEach` and the sweep exists.
- **Previews stopped** (`:4730` the base build, `:4731` this branch — both confirmed mine by their command lines).
- **The deploy worktree is removed**; **this worktree (`/Users/nickphysick/ScriptAlly-pfx`) is removed after this
  commit is pushed** — the branch and both dev branches are on origin.
- **Journey shots:** the Pixel · local set is committed here (`journeys/<J>/pixel/`); **all four runs' shots (347)
  are in the main checkout, untracked, at `reports/phone-fixes-v1-journeys-all/`** — 73MB was too much for the repo.
- **Not touched:** Manuscripts files, Firestore rules, functions, `src/lib/companyInfo.ts`, prod, `main`.
