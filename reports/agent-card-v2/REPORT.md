# Agent card v2 — report

Branch `agent-card-v2` (worktree `ScriptAlly-acv2`), cut from what dev served. Not merged to main. Prod untouched.

## False premises

1. **"Base: dev serves `dev/tct1-sv1-qc161` @ `003562e45`."** Dev had moved on: it served `index-J5yUU39m.js`, List
   filters v1, from `dev/cf11-qc1611-lf1` @ `9356837a0` (which contains `003562e45`). The branch is cut from that.
2. **"The card's save bump must be qcMotion160's … (500ms, peak 1.022)."** qcMotion160's bump has been v161.1's since
   then: a press to 0.985, then a pop 0.985 → **1.035** → 1 over **520ms** (`BUMP`). The card calls that `bump()` and
   AC2-6 locks it against `BUMP` itself, not against 500/1.022.
3. **"`lib/agentMotion.ts` has its own `BUMP_MS = 340` … retire agentMotion's 340ms bump on this card."** Nothing on the
   card used it. `BUMP_MS` drives the Contact list's row FLIP (`lib/flip.ts`). The card's save "motion" was a CSS outline
   flash (`is-saved`), which is what retired. `BUMP_MS` stays for the list.
4. **"`Notes` in AgentCard24.tsx is one textarea over `agent.notes`."** True of that component, but dated agent notes
   already exist: `users/{uid}/agents/{id}/notes/{noteId}` `{ text, createdAt }`, with rules (`isValidAgentNote`), a
   listener and writers (`useAgentNotes`) and a `notePreview` cache. v2 writes there; **no rules change**.
5. **"All hosts render it, as it is one component."** Not before this pack. A door that only *reads* an agent (search,
   the To-do list, the noteboard, the query card's "← Back to {first}") opened **Agent card v1's quick view**
   (`AgentCardSession` → `AgentQuickView`), not AgentCard262. Only the Contact list's own card and edit doors rendered
   AgentCard262. v2 routes every door to an existing agent through `HostAgentCard` (the dev lab's in-memory cast keeps
   the quick view).
6. **"The query card's Agent tab's 'Open {first}'s full card' opens this card."** It did, but with `tab: "who"`, which
   opened **every section for editing**. It now reads the card.
7. **"No 10.5px spaced capitals anywhere on the card" vs "the agency in the query card's caps line".** The query card's
   caps line *is* 10.5px mono at 0.17em. Kept per the head rule; AC2-3 exempts that one line (ruling below).
8. **The reference's Finish block lists "+ Website", "+ Whether they're open", "+ Email".** The pack says the list is
   Housekeeping's, which has none of those. Housekeeping's list is what's built (ruling below).

## §0 answers

1. **The card.** On `/agents` the live card is `contact/AgentCard262.tsx` in `AgentCardPanel262.tsx`, through
   `AgentPaperCard`'s `panel` variant (v2 replaces that variant's face with the `.qc152` structure; the frame classes
   stay). Doors (`openAgentCard`): Dashboard (data-quality task), Dash58 (Housekeeping actions, with a tab), Queries
   (Edit agent, + email, "Open full card" and every unrecorded value, ← Back), SearchPalette, TodoNoteboardPage,
   TodoWorkspace, useWsCore (fix / send / open), WsBatch54, HostAgentCard (colleagues, edit). Hosts: AgentList (the
   Contact list's own), HostAgentCard via AgentCardHost (every other page; now reads too), PreviewHostCard (the add
   journey's finish screen, `preview`), WsPreview `PreviewAgentCard` (the To-do desk). All change: one component.
2. **The query card's parts** — none could take an agent as they stood without a query, so each was lifted, not copied:
   - `QcAgent158`: the fact box, Copy email and the website button are now `NxBox`, `NxCopyEmail`, `NxSite`; AgentTab158
     draws its own through them. The query-only pieces (Last heard, "sent with your query") stay its own.
   - `QcNotes158`: already presentational (notes, quotes, callbacks). Gained optional `placeholder`, `emptySub` and
     `NoteIn.top`; actions are hidden by passing `null`.
   - `QcFoot1581`: presentational. Gained an icon `{ k: "node" }` for the not-queried dotted ring.
   - `QcBubble152` and the "x days later" lines: `Bubble` is presentational; the lines are `buildThread`'s wait items.
     A read-only thread (`QcThreadRead`) draws both; it needs each query's steps, which come from the query card's own
     derivation (`buildCardView`) over each query's log.
   - `qcMotion160.ts`: `bump(frame)` takes any element; used as is on the card's mat.
   - `lib/stageColours.ts`: used as is.
   - The v158 fixed-height rule: the formula was on `.spanel.qsp`; lifted to `:root --qc-card-h`, which both read.
3. **Going between the cards.** `QcOpenCard`/`QcCard152` take `backTo` and show "← Back to {first}" when opened through
   `openQueryPanelFromAgent`. Before v2: the Contact list's card had no door that used it (its "See the query"
   navigated to `/queries?q=`), and Back called `openAgentCard(id)` with no tab, which opened **v1's quick view** and
   lost the tab. Now: the query box opens it, and Back returns to this card at the tab left (AC2-2). "Open {first}'s
   full card" opened edit mode; fixed (false premise 6).
4. **Agent notes.** `agent.notes` (a string ≤16384, on the agent's update allowlist) and the `notes` subcollection
   (`{ text, createdAt }`; update may change `text` only). Readers of the string: `lib/agentList notePreview` (falls back
   to it), `agentNotes.effectiveNotes` (shows it as the oldest bubble), the old Queries agent panel, import
   (`importedAgent` writes it). Corkboard and search read `UserTask` notes, not this. Nothing loses notes: the string is
   never rewritten. Dated entries need **no rules change**. Pin would: `pinnedNoteId` is not on the agent allowlist.
5. **Two bumps.** `agentMotion.BUMP_MS` (340) is read by `lib/flip.ts` (the list's FLIP) and its test; nothing on the
   card. The card's save bump is now `qcMotion160.bump()`.
6. **Several queries.** Today: the card's status, next step and colour follow one query — the standing query for the
   active manuscript (`agentFacts` with the scoped manuscript; with none, across all). History (`storyBlocks`) listed
   every query to the agent, newest first, each under its manuscript's title. v2 keeps both: the query box and footer
   follow the active manuscript's query; History draws each query's thread, headed by its title when there is more than
   one.

No red gate: hashes matched, AgentCard262 is the Contact list's live card, every part exists, notes need no rules change.

## Commits (branch `agent-card-v2`, on `dev/cf11-qc1611-lf1` @ `9356837a0`)

| Commit | What |
|---|---|
| `04d5ea240` | Design refs: `agent-card-v2.html` and screens 01–12, hashes verified |
| `606a45e0b` | Lifts: `NxBox`, `NxCopyEmail`, `NxSite` out of `QcAgent158`; `QcNotes158`'s optional props; `QcFoot1581`'s `{ k: "node" }` icon; `QcThreadRead`; `--qc-card-h` on `:root` |
| `ddf6a6d1e` | Phases 1–6: shell, query box and footer, Profile, History, Notes, editing and motion |
| `f0c266bc0` | Delete what the new face replaced (`NextBox`, `Disc262`, `Ghost`, the flash, four `contactCard262` helpers, 49 CSS rules) |
| `f866d9116` | AC2-1 … AC2-6, the journey spy (`lib/journeySpy.ts`, emulator and dev builds only), the earlier locks it retires |
| `89aa8f7cc` | Ruling 3: "+ Add email" / "+ Add a website" and the fact box's "Add" (AC2-8) |
| `67fe1d4cd` | Ruling 1: Pin on the agent's notes, `pinnedNoteId` in the rules (AC2-7) |
| `d32814097` | Ruling 4: the old notes string is a note you can edit and delete (AC2-9); `docs/decisions/agent-card.md` |
| `318420f5b` | The door screens (search over the Dashboard, the To-do list) and their fixture |
| `eea8517ee` | CL262 and AA12 re-pointed; qc160's seed gets a 60s timeout (its message says "twelve" CL262 cases: it is 16) |
| `2a42c5247` | cardOffersV1 re-pointed; CO17 and CO19 marked red-before |
| (this commit) | This report |

Phases 1–6 landed as one commit, not one per phase: the six phases share one component's render, and the halfway
states did not build alone. Ruling 2 needed no code (the agency line was already the exemption); it is written into
`docs/decisions/agent-card.md`.

## The locks — red first, then green (`tests/e2e/acv2.measure.ts`, `AC2_MUTATE=<names>`)

Each lock was run red under its named mutation on the rendered page (the emulator build), then green with none.
Ledgers: `ledger/AC2-*.json` (green) and `ledger/mut-<names>-AC2-*.json` (red).

| Lock | What it holds | Mutation that turns it red | Green readings |
|---|---|---|---|
| AC2-1 | One height: the card is `--qc-card-h` and equals the drawn query card, on every stand, tab and fixture; band `#5e7189`; the pill's tint | `height`, `band`, `pill` | 20 |
| AC2-2 | The query box opens the query card with "← Back to {first}"; Back returns at the tab left; the footer is the table (words, button, journey via the spy) | `nextbox` | 146 |
| AC2-3 | No spaced capitals under 12px in body, band or footer (the agency line exempt and nothing else); the Finish count is Housekeeping's | `caps`, `gapcount` | 65 |
| AC2-4 | History is the query card's thread from each query's own log; no old timeline | `oldtimeline` | 9 |
| AC2-5 | A new note is a dated entry; the old string byte for byte after it; the fact boxes | `notestring`, `box` | 6 |
| AC2-6 | Save bumps once at `BUMP` (520ms, 1.035); cancel, discard and undo never; the tint from the snackbar; Undo exact | `bumpall`, `undodrop` | 13 |
| AC2-7 | Pin: one pinned note, first, "Pinned"; pinning another moves it; Unpin clears; stored `pinnedNoteId` | `pin` | 6 |
| AC2-8 | Name-only agent: both add buttons present, each focuses its own field | `bothname` | 9 |
| AC2-9 | Editing the old string changes only that string; Delete then Undo restores it byte for byte | `notestring`, `undodrop` | 7 |

281 green readings. Two caveats, stated plainly:
- `notestring` for AC2-5/AC2-9 swaps the comparison the lock reads from the store (a simulated drift), not the app's
  write path — the app has no switch that would rewrite the string.
- `bothname` sends both add buttons to Name; it does not touch the fact box's "Add", which AC2-8 reads separately.

## Retired and re-pointed earlier locks

| Lock | Now | Why |
|---|---|---|
| CL262 shots, J1, J3, J4 | skipped (`RETIRED_BY_ACV2`) | J1's panel 14px from the sheet → AC2-1's height; J3's next-step box as the one colour → AC2-2's query box and footer; J4's ghost lines are retired by the reference |
| CL262 J2, J5, J6, J10 | re-pointed to a filled fixture (`cl262fx-full`) — all CL262 locks green, 16 cases at 1512 and 1280 | v2 draws no empty section, so a section's own pen exists only when the section has something in it |
| CL262 J9, J11 | re-pointed: an empty section's door is the Finish block's "+ {detail}" | the ghost "+ Add …" lines are retired; Housekeeping's list is the door |
| agentCardV1 (two store-over-a-page cases) | skipped | they asserted the quick view on another page; every door now opens the one card. Its real-route cases already used `[data-clv="row"]`, a selector nothing renders |
| addAgentV1 AA5, AA9 | re-pointed | AA5 reads the fact box ("Via Agency portal"); AA9 reads the v2 face's selectors and `finish-add` |
| addAgentV1 AA12 | re-pointed (regex) | the query card's Agent tab has said "+ Add a website" / "+ Add an email" since v158; the lock still looked for "+ Website", so it was red before this branch |
| cardOffersV1 `editHow` (CO8–CO19) | re-pointed | the read face's How section is `[data-cl262='sec']` (class `acv2-sec`), not `.cl262-sec` |
| cardOffersV1 CO8 | re-pointed | at 900px the open "How {first} works" runs under the save bar (slider at y 724, the body ends at 686): it scrolls the slider into view before dragging it |
| cardOffersV1 CO13–CO16 | re-pointed | read the footer (the next-step box is retired) and the v2 snackbar words |
| cardOffersV1 CO17, CO19 | skipped, **red before this branch** | Record a response v1, Phase 5 retired the light, live dim: every slide-out dims the desk at the action level (`AgentCardPanel262` `modal = !leaving`; CO19 is the Query Centre's own panel) |
| cardOffersV1 CO20 | skipped | "+ Website and + Email in the head" are retired; AC2-8 holds their replacements |

### The query card's locks (lifting allowed only if these pass unchanged)

| Spec | Result | Note |
|---|---|---|
| QC158 | 2–14 green; **QC158-1/15 red at both sizes** | QC158-15 compares against the last shot *before v158*; its "many" fixture's footer is v158.1's two-row footer (135px, not 93.6), so it is red on the base by construction. QC158-1's own height reading is green (714.8 on all eight) |
| QC1581 | all green (1–10) | |
| QC160 | 13/13 green, run alone | in a long run the emulator wore down (QC160-5/6 took 8.4 min; QC160-4/9 failed on timing); alone each case takes ~12s |
| QC161 | 12/13 green; **QC161-11 red, date drift** | it compares against `reports/query-card-v161/baseline-drawer.json`, recorded 19 Nov; the seed's dates move with today, so every date in it is one day out. Not this branch |
| QC1611 | all green | |
| addAgentV1 | AA2–AA12 green | |

**The two hangs (20 Nov).** Both stopped in qc160 inside `execSync("node tests/e2e/seedQc152.mjs")`: the emulator
answered the seed's writes with `UNKNOWN: Application error processing RPC`, the SDK retried with growing backoff, and
`execSync` blocks the worker's event loop, so Playwright's own test timeout could not fire (browser idle, 0% CPU). The
emulator's own log goes to `/dev/null` under `emu-guard`, so why it answered UNKNOWN is not known; both runs were 50–75
tests deep. `seed()` and `dump()` now carry `timeout: 60_000, killSignal: "SIGKILL"`. Run one spec set at a time.

## Doors that changed from the quick view

Before v2 these opened Agent card v1's quick view (`AgentCardSession` → `AgentQuickView`); now each opens this card
through `AgentCardHost` → `HostAgentCard` (read doors unopened, edit doors at their section):

| Door | Where |
|---|---|
| Search (⌘K) — an agent result | `SearchPalette` |
| The To-do noteboard — an agent link | `TodoNoteboardPage` |
| The To-do list — a task's linked agent | `TodoWorkspace` (`openLinked`) |
| The To-do desk — open / other agent without a tab | `useWsCore` (`openCard`, `openOther`) |
| The query card — "← Back to {first}" | `Queries` (`backToAgent`) |
| The query card's Agent tab — "Open {first}'s full card" | `Queries` (now reads, not every section for editing) |

The Contact list's own card and every edit door already rendered AgentCard262 and still do. The dev lab's in-memory cast
keeps the quick view.

## Shots (`shots/`, 1512 × 900 and 1280 × 800, beside `design-refs/agent-card-v2/screens/`)

| Shot | Beside |
|---|---|
| `{1512,1280}-you-profile.png` | 01 your move · Profile |
| `{1512,1280}-none-profile.png` (not queried) | 02 name only, 03 some gaps |
| `{1512,1280}-you-history.png`, `-agent-history.png` | 04 offer · History |
| `{1512,1280}-*-notes.png` | 05 Notes |
| `{1512,1280}-closed-*.png` | 06 passed |
| `1512-saved-tint.png` | 11 saved tint (07 the star save is the same bump) |
| `1512-todo-preview.png` | the To-do desk's preview of the card |
| `1512-todo-door.png` | **the card opened from the To-do list** (the seeded task linked to Nora Notekeeper) |
| `1512-dashboard-search-door.png` | **the card opened from search over the Dashboard** (⌘K "Clara") |

## Rules

- `pinnedNoteId` on the agent update allowlist, plus a string check (1–128) in `isValidAgent` — additive.
- **Dev:** deployed from a clean copy of `origin/agent-card-v2`'s `firestore.rules`
  (`--config firebase.dev.json --project scriptally-dev`). Release `updateTime` moved `2026-11-10T00:04:18Z` →
  `2026-11-19T21:32:04.403588Z`, ruleset `4b17053a-5543-4f49-96f0-d3af7bc274e7`. `rulesProbe.mjs`: every probe answered
  as expected (its denials are the ones it asks for); it does not probe `pinnedNoteId`, which AC2-7 proved on the emulator.
- **Prod: untouched.** The diff to apply is `rules-prod.diff` (two hunks, four lines). Note `release/live-1`'s
  `firestore.rules` already differs from the dev line by 248 lines, so apply the hunks, not the file.

## Dev deploy

- Dev served `index-B-YvaH3c.js`, built from `dev/cr1-qc163-db3` @ `7ff85ca54` (consistency roll-out + v163 + Dashboard
  v3). Dev moved three times during the session; each move was read off the live site before merging.
- Integration branch **`dev/cr1-qc163-db3-acv2` @ `362d5bfbe`** = `7ff85ca54` + `agent-card-v2` (clean merge; the one
  shared file, `qcv152card.css`, merged without conflict). Cut from `7ff85ca54`, not the db3 tip `47fee0f32`, so the
  Dashboard session's undeployed quick-lane commits did not ship with it.
- Gates on it: tsc clean (root and `functions/`); Vitest 12,988 passed, 4 failed — all four red on the served base
  (`firestoreTarget` ×2, the known list; `events.test` ×2: Dashboard v3 at `7ff85ca54` dropped Dash58's
  `getting_started_done` call, which its tip `47fee0f32` restores). Build clean.
- `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev` from that clean, pushed checkout,
  behind a served-hash guard. **Dev now serves `index-CRNhfAUC.js`.** Hosting only.

## For Nick

1. **The old notes string is now editable** (ruling 4): Edit and Delete, like any note; Delete has Undo; no migration.
2. **The snackbar's words changed** with the pack's: "Saved 1 change to Sarah, and moved the query's dates" /
   ", and closed the query as no reply". When nothing moved it is just the count and the name — the old
   "Saved · your query keeps its dates" is gone. Say if you want that phrase back.
3. **At 1512/1440 × 900 the card's body is short while editing** (about 344px between the tabs and the save bar on a
   queried agent): "How {first} works" opens with its heading in view and its slider a scroll away. That is the fixed
   query-card height doing what the pack asked; CO8 now scrolls to the slider.
4. **Retired:** CO20 (the head's "+ Website / + Email") and CL262 J1/J3/J4. agentCardV1's real-route cases already used
   `[data-clv="row"]`, a selector nothing renders. **Red before this branch, not fixed here:** CO17 and CO19 (the light
   dim, retired by Record a response v1), QC158-15 (pre-v158 baseline), QC161-11 (date-stamped baseline), `events.test`
   on the dev line (Dashboard v3).
5. **How it was committed:** Phases 1–6 are one commit, not one per phase; the ruling locks were written after their
   code and proved red by mutation.
6. **Prod rules:** `rules-prod.diff`, when you next deploy rules.
