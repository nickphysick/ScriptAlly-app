# Dashboard v59 — report

Branch `dashboard-v59`, cut from the branch dev served at the start
(`dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386` at `fd9016f8`, `index-DalAPG6D.js`), which
contains Dashboard v58 (`src/components/dashboard/v58/`) and feed drawer v2. Six commits, A to F.
Not merged to main. The callable and the rules block are **not deployed**.

## False premises (and things the pack could not have known)

1. **`sendBetaFeedback` is not deployed on dev.** `firebase functions:list --project scriptally-dev`
   lists `extractFromEmail`, `smartImportMap` and `waitlist` only. So the existing feedback panel the
   new doors open **cannot send on dev today** — opening it works, submitting fails. That predates
   this pack.
2. **"The intended landing: a query item opens that query in the query panel, where the task's step
   is offered with its fields."** True for four of five query kinds. For **gone quiet** ("Consider
   closing"), the panel's primary is the panel's own one-next-move rule (`nextDoor` in
   `lib/queryActions/entry.ts`): inside a year of silence that is **Nudge**, with Close as a
   secondary door. So the task says "consider closing" and the panel leads with "Nudge". Nothing can
   be finished without its fields — every door opens the drawer journey — so this was not a stop,
   but the two disagree about which act leads. Query panel v2's ruling ("no board-card override on
   the Query Centre") is why.
3. **"The shadow's sheet clips it (`overflow: clip`)."** The sheet (`.ws-window`) is the shell's and
   is already `overflow: hidden`; the shell was not to be touched. The clip is on this pack's own
   sheet layer (`.d59-sheet`, `inset: 0`, the sheet's radius). So the pack's S1 mutation ("drop
   `overflow: clip` from the sheet") cannot redden F1 — the shell still clips. S1 asserts the layer
   is `clip` directly, which the mutation does redden.
4. **"Remove or neutralise any stacking context between the cards and the shadow."** There was none:
   every ancestor of the four cards up to `.ws-window` is a plain box (§0.5). Each card is its own
   stacking context (`z-index: 1`, and `container-type` on the `.os-card`s), which is the card and is
   fine. The trap was the one this pack would have introduced itself: a wrapper with `z-index` around
   the shadow and the tab isolates them, so `multiply` blends with an empty group and the pair stacks
   together against the cards. The layer therefore has no `z-index`, and the shadow (3) and tab (2)
   share the cards' context.
5. **The real shell is taller than the reference's.** The reference has no beta strip; the real page
   has a 42px strip above the bar on the desktop, and v58's book header is ~28px taller than the
   mock's `.hd`. At 1512×900 the panel still comes out at the reference's height (244 vs 245), but at
   1696×820 it was 166 against the mock's 187, and the panel lost its second sentence **while the
   focus card's timeline was still showing** — the wrong order of giving way. See Part F.
6. **"For first run, use v58's own label."** v58's label was "All {n}" for first run too; for
   *ready* and *coming up* v58 linked "Contact list" and "Calendar". The pack says the link goes to
   the To-do page, so it now always reads "All {n} →" and goes there.
7. **Nothing stored when the drawer was last opened.** `feedEntries`' `seenAt` was always passed
   `null`. "Stored per account" is `localStorage["sa.feedSeenAt.<uid>"]` — per account per device,
   because a user-document field would need a rules allowlist change and this pack adds one rules
   block and nothing else.
8. **There is no `TaskModal`** (as v58 recorded) and no "first-run getting-started plan" manuscript on
   the harness account: all four manuscripts have queries. V1 seeds one (`db59-first-run`) for its
   case and deletes it in a `finally`.
9. **Values that differ from the rendered reference** (the pack's values win, as instructed): the
   hairline is 24px below the focus card and **10px** above the panel (the mock renders 24 and 24);
   the art sits 6px off the bottom (the mock's 10); the mock draws a second shadow inside the panel
   (`hs-card`) — the pack says one image, so there is one. The mock's 1280×680 panel overflows its own
   body by 11px; ours does not.

## §0 Recon

1. **What survives.** `Dash58.tsx` (kept; gains the panel, the sheet layer, the pulse, the paint,
   `tight`), `Dash58List.tsx` (kept as the title row + focus card; the rows, group headings,
   "Then {n}" and the column's scroller are **retired**), `Dash58Feed.tsx` (the drawer untouched;
   `FeedTab` rewritten as the folder tab; the "{n} today" pill retired). The Coming-up extras
   (`d58-extra`) **move** to just under the focus card.
2. **The focus action, kind by kind** (what `item.action` opened in v58 → what "View task →" opens):
   | kind | v58 | v59 landing |
   |---|---|---|
   | agents are waiting (req) | the drawer at the task's journey | the query panel, whose primary is that journey (Mark partial/full/revision sent) |
   | worth a nudge | the drawer, nudge | the query panel, primary Nudge |
   | gone quiet | the drawer, close | the query panel, primary **Nudge** (Close secondary) — see false premise 2 |
   | housekeeping | the agent card's editor at the gap | unchanged |
   | ready to query | the log drawer, agent prefilled | unchanged |
   | coming up | the drawer, record a response | the query panel, primary Record a response |
   | first run | log drawer / Add a manuscript / Add an agent / a route | unchanged |
   Every landing records what was sent, when to chase and notes through the drawer journeys; the
   Dashboard writes nothing.
3. **The feedback panel.** `FeedbackDock` is mounted once by `AppShell`, whose `feedbackOpen` state
   the sidebar's Give feedback and the beta strip toggle. The Dashboard opens it through a small store
   (`lib/feedbackStore`: `openFeedback()`, AppShell subscribes). One panel in the app.
4. **The pulse store.** `sendBetaFeedback` is NOT deployed on dev (premise 1). Callables are
   re-exported one per line from `functions/src/index.ts`. `isSignedIn()` / `isAdmin()` exist in
   `firestore.rules`. Nothing recorded a per-week rating.
5. **The shadow.** Every other page uses `/images/hawk-shadow.png?v=1`, `alt=""`, `aria-hidden`, in
   its own header. The Dashboard's sheet is `.ws-window` (`position: relative; overflow: hidden`).
   Stacking contexts between the sheet and the cards: **none** (probe, every ancestor of each card).
6. **The feed's unseen count.** See premise 7.
7. **The chart and the figures.** The active line is one `path.os-acline` (now `pathLength="1"`);
   the fill is `[data-probe="chart-fill"]`, the end dot `.os-aclast`. The active count is in
   `OneScreenChart`'s title, the closed count in `Dash58Closed`'s band title, the four tiles in
   `Dash58Closed`.
8. **Locks retired or rewritten:** see `tests/e2e/RETIRED-dashboard-v59.md` (DB58 R1, R2's list
   clauses, R3, A1's tab, F2's list-scroll clause, L1's timing).

## What was built

- **A** the right column: title row with "All {n} →" (the title's size follows the row's width),
  the focus card with a 6px rust edge and "View task →", the hairline, the founding writer panel
  (`v59/Dash59Panel.tsx`, `v59/dash59.css`) with its container tiers and drawn tooltips.
- **B** `sendWeeklyPulse` (`functions/src/weeklyPulse.ts` + `weeklyPulseCore.ts`), the `/betaPulse`
  rules block and its tests, and the faces wired to them. A week the server accepted is echoed to
  localStorage so the panel opens Noted while the rules are undeployed and every read is refused.
- **C** the folder tab (sheet layer, desk colour, fillets, unseen badge, bump), the page's foot
  leaving it 22px clear.
- **D** the hawk's shadow in the sheet layer, and the hover lift.
- **E** the first paint (columns rise, line draws, fill fades, dot pops, figures count up) — the real
  figure is always the text (`<data>` + a CSS counter over it).
- **F** the fit and the DB59 locks.

## Part F — fit

The tiers decide what gives way, and two changes were needed for the real shell:

1. **The timeline gives way by measurement** (`tight` in `Dash58`): while the timeline shows and the
   panel is under 179px (where its second sentence would go), the timeline hides; it returns only if
   the panel would keep both sentences with the timeline's height given back. This is the pack's own
   order (timeline first), which a media query could not keep on a shell taller than the reference's.
2. **Below 700px tall** the focus card's inner padding and the title row's margin give back ~20px, so
   the panel keeps its 22px over the tab at the 650px floor.

Heights (panel / focus card, px) and what gave way, measured on `seed-ms-1`:

| size | panel | focus card | timeline | given way in the panel |
|---|---|---|---|---|
| 1920×1080 | 412 | 244 | shown | nothing · **poster tier** |
| 1696×820 | 237 | 172 | hidden | nothing |
| 1536×864 | 211 | 244 | shown | caption |
| 1512×900 | 244 | 244 | shown | caption |
| 1440×900 | 247 | 244 | shown | caption |
| 1366×768 | 215 | 172 | hidden | art, caption |
| 1280×800 | 235 | 172 | hidden | art, dots, caption |
| 1280×720 | 176 | 172 | hidden | art, dots, caption, note's 2nd sentence |
| 1280×680 | 160 | 156 | hidden | art, dots, caption, note's 2nd sentence |
| 1366×650 | 128 | 156 | hidden | art, caption, note's 1st sentence, note's 2nd sentence, note |
| 1280×650 | 131 | 156 | hidden | art, dots, caption, note's 1st sentence, note's 2nd sentence, note |

**Deviation from Part C, deliberate:** the 22px clearance is held in the RIGHT column only. Applied
to both columns it took 30px from the left column and clipped the kept chart's frame at 1440×760
(new) and deeper at 1280×680 / 1366×650 (already clipping on the base). The tab is never over the
left column (P2 now asserts that), and "nothing clips" outranks clearance from a tab the column is not
under. Your call if you want it in both.

**Noted state:** the reference cuts "Say more →" off at 1512 and drops "Change"; here the Noted row
wraps between its parts, and on a panel under 190px the note gives way to it.

Against the reference: at 1696×820 the **timeline** goes (the reference keeps it) so that the panel
keeps both sentences; at 1280×680 the note keeps one sentence as the pack says; at 650px tall the
note goes, as the pack says. Nothing else gives way earlier than the reference.

## Locks

| Lock | Red (how) | Green |
|---|---|---|
| R1 column | base build: no link, no rule, no panel, 36 rows/headings · mutation `R1-rows` (a restored row): order and "no rows" red at every size | 11 sizes |
| R2 edge | base build: no edge · `R2-edge-on-band`: 40px tall against 243.5 | 1512×900, 1280×680 |
| V1 view task | base build: v58's labels ("Offer: next steps →" …) and drawer landings · code `V1-drawer-not-panel` (opens the drawer, v58's route): three query kinds red | 7 kinds (req, nudge, gone quiet, housekeeping, ready, coming up, first run); the query, its log and its feed rows byte-identical after the press |
| P1 copy | base build: no panel · `P1-copy`: note2 red | all copy, four labels, no `[title]` |
| P2 panel fit | base build: no panel at any size · `P2-no-height-tiers`: tiers + escapes red at 680/650 · `F1-panel-260` also reddens P2 | 11 sizes, the five tier states |
| P3 pulse | base build: no faces · code `P3-noted-early` (Noted before the answer): red twice | one call `{mood:3, week}`, Noted + dot, stored answer loads Noted, refusal clears to the stored face, Noted line cut nowhere at 1512 and 1280×680 (that check was red first on the unfixed bundle) |
| P4 doors | `P4-second-panel`: 2 panels | one `.sa-fbpanel` from the panel and from the sidebar |
| P5 rules | `allow read: if isSignedIn()`: "another writer cannot read it" red | 5 rules cases, emulator (196/196) |
| T1 tab | base build: "LAST 30 DAYS", navy, 26px off the edge · code `T1-today-only`: badge null against 120 rows → "9+" | no LAST 30 DAYS, on the sheet's edge, desk colour, badge = unseen, cleared on open and after reload |
| S1 shadow | base build: no shadow · `S1-no-clip`: the sheet layer `visible` and `.ws-window` gains 174px of scroll | one image, none/.145/multiply, clipped, drifts, still under reduced motion |
| S2 in front | base build: no shadow · `S2-column-context`: 0 of 1399 points lighter on hover | 1399 of 1399 shadowed white points lighter on hover; reduced motion: no transform, z 4 over 3 |
| E1 first paint | base build: no paint · code `E1-replay` (re-runs on a drawer toggle): "paint seen again: true" | runs on loading → loaded, ends on the true figures, not after a drawer close/resize/step, nothing animates under reduced motion |
| F1 one screen | `F1-panel-260`: the page scrolls at 1280×720, 1280×680, 1366×650, 1280×650 | 11 sizes |
| L1 no jump | base build: no panel · `L1-no-panel-skeleton`: panel absent while loading | header, both cards, focus, panel, tab at 1512×900 and 1280×800 |

Proofs: `mutation-proofs.jsonl` (14 entries, all red) and `redfirst-base-fd9016f8.txt` (the whole
DB59 file against the unchanged base: 9 of 9 red). Every in-page mutation is `DB59_MUTATE=<name>`;
the four code mutations were built, run and restored from a path-named backup in the worktree.

**DB58, rewritten (`tests/e2e/RETIRED-dashboard-v59.md`):** green except **F2 "activeFrame" at
1280×680 and 1366×650**, which is **red on dev's base build identically** (the kept chart's axis
overflows its frame on a short window) — pre-existing, not this pack. **FD2 A1** (the Contact
list's Housekeeping half drawer: width 560 against 780, no radius) is also red identically on the
base — pre-existing, a surface this pack did not touch.

## Shots

In `shots/`, beside the reference PNGs in `design-refs/dashboard-v59/screens/`:
`page-<size>.png` at all eleven sizes (the references are 1512×900, 1696×820, 1280×800, 1280×680,
1366×650, 1920×1080), `hover-focus-1512x900.png`, `panel-noted-1512x900.png`, `page-1280x650.png`,
`drawer-open-1512x900.png`. The real shell's beta strip (42px) is in every shot; the references have
none.

## For Nick

- **Deploy commands (not run):**
  - `firebase deploy --only functions:sendWeeklyPulse --project scriptally-dev`
  - `firebase deploy --only firestore:rules --config firebase.dev.json --project scriptally-dev`
- **Where to read the pulse:** `betaPulse/{uid}_{week}` (`uid`, `week` as `YYYY-Www`, `mood` 1–4:
  Lost, Meh, Good, Loving it; `createdAt`, `updatedAt`), admin read only.
- **What the real header forced to give way earlier than the reference:** the focus card's timeline
  at 1696×820 (and at any size where keeping it would cost the panel its second sentence).
- **Also yours:** the gone-quiet landing (premise 2); `sendBetaFeedback` is undeployed, so "Tell us
  anything" opens a panel that cannot send on dev yet (premise 1).

## Branch and build

- Branch `dashboard-v59`, pushed. Parts A–F: `56ba184a` · `19ada182` · `a7949907` · `ef164e12` ·
  `c2473ec3` · `fe8f2377` (this report's tail is one more commit on top). Cut from
  `dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386` at `fd9016f8`. Not merged to main.
- Dev: hosting only, from the clean pushed tip `fe8f2377`, re-checked immediately before the deploy
  (dev was still on `index-DalAPG6D.js` = `fd9016f8`). Dev now serves **`index-BdMa9Mvk.js`**.
- Gates at the tip: tsc clean, functions tsc clean, production and dev builds clean (no errors or
  warnings in the log), Vitest 598 files / 8,944 passed / 3 skipped, rules emulator 196/196.
