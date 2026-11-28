# To-do arrival v1 — report

Branch `todo-arrival-v1`, cut from `dev/bew33-clr13-qc1722-pqs1-qc1723-bfl1` @ `bf98bf66c` (what dev served at Step 0: `index-CTspvepm.js`). Ref: `design-refs/todo-arrival-v1/` (sha256 verified; `todo-arrival-v1.html` = `4d9c5e4a…0ccd6a`). Desktop only.

## False premises (named before anything else)

- **None of 0.2a–g is false.** Two need a qualification:
  - **0.2g, "the arrival keys … Dashboard Next up, notifications":** on this line only one route lands on the To-do page with a task chosen: the search palette's "task" result (`SearchPalette.tsx:186`, the one-shot `sa.todoOpenTask` key). The Dashboard's Next up opens journeys directly, not the To-do page; no notification route writes the key; nothing writes `sa.todoCompose` any more (the readers remain); "+ Task" while on `/todo` is the `TODO_OPEN_COMPOSER` event. The desk's own ‹ › and J/K are the in-page moves.
  - **Phase 1, "coming back … later in the same visit":** the To-do page **stays mounted** across in-app navigation (`App.tsx` `StagePage name="todo"`, `AppShell.tsx` `StagePage`: "the slot's children stay mounted"), so its React state already carries the open task. The module store (`lib/todoArrival.ts`) is built as asked and backs a remount. Sign-out already reloads the page (`db.tsx` `logout` → `window.location.assign("/")`), which clears the store. A book switch is heard through the switcher's `STAGE_REPLAY_EVENT` and closes the open task.

## Step 0 — recon

- Disk: 29 GB free (above the 20 GB stop).
- Worktrees: six besides the primary at the start (`dep-nav1` scratch, `ScriptAlly-live`, `-nav1`, `-qc1724`, `-rsp6`, `-tdf`) — over CLAUDE.md's five. `-rsp6` and `-tdf` were clean and unclaimed; `-nav1` and `-qc1724` were held by live sessions. I added mine (`ScriptAlly-tav1`) and removed it at the end; I did not clean the others (not mine).
- 0.1 Pack present (`~/Downloads/todo-arrival-v1-pack.zip`), `shasum -a 256 -c SHA256SUMS` OK for all six files; enrolled in `design-refs/.refhashes.json`.
- 0.2a `TodoWorkspace.tsx:193` `const sel = order.find(...) ?? all.find(...) ?? order[0] ?? null` — confirmed.
- 0.2b `useWsCore.makeFlow` returns `{ questions: [], commit: null, door: { label, open } }` when `cardJourneyHosted(cjKind)` for a send/R&R (`Mark sent` / `Mark resubmitted`) and an offer to answer (`Answer the offer`) — confirmed; the questions column showed the hawk and nothing else, the button in the footer.
- 0.2c `CJ_SPECS` (`cardJourneySpecs.ts`) — send `agent, went, sent, reply, log`; offer `agent, answer, when, (others,) log`; close `agent, why, (when,) log`; reopen `agent, why, nudge, log`. Only send and offer are hosted from the To-do desk.
- 0.2d `todoWs58.css` v58.1 · 4 `@container tws581tray (max-width: 360px)` — confirmed.
- 0.2e load v1's `tasksReady` (`TodoWorkspace` `tasksIn`), `WsLoading.tsx` (`TrayOutline`, `DeskOutline`), `TODO_LOAD` (150 / 150 / 220 / 3000 / 5000 ms) — on this line.
- 0.2f Tray groups (`lib/todoWs.ts WS_GROUPS`): `wait` Agents are waiting · `nudge` Nudges · `quiet` Gone quiet · `house` Housekeeping · `yours` Your tasks. The header ring's "need you" is `wait + nudge + quiet` (`breakdownOf`). Housekeeping is folded by default (`shut = {"house"}`).
- 0.3 What the line held for the To-do page: v58 (glyph discs, stage-coloured hawk, figure words), v58.1 (navy desk bar on every task, no chip edge, the 360px tucked figure, Housekeeping's rule), v58.2 (figures say what they count from), load v1 (`tasksReady`, outlines, review switch `?load=`), Card journeys v1 (door-only desk for send/R&R/offer).

## Baseline (before any edit)

| Gate | Baseline | Final |
|---|---|---|
| tsc (`NODE_OPTIONS=--max-old-space-size=8192`; the default heap OOMs on this tree) | 0 errors | 0 errors |
| `vite build --mode development` | exit 0, no error/warning lines | exit 0, no error/warning lines |
| Vitest | 979 files, 13,865 passed, 4 skipped, 0 failed | 983 files, 13,900 passed, 4 skipped, 0 failed (+35: the new locks) |

## What each phase built

- **Phase 1 — `349e66307` — arrival opens no task.** `lib/todoArrival.ts` (new): `deskMode` (outline / empty / caught-up / run / task), `selectedTask` (no fallback), the visit's in-memory task scoped to the account and the active book. `TodoWorkspace`: the `order[0]` fallback is gone; the selection starts from the visit's memory and writes it back; the book switcher's `STAGE_REPLAY_EVENT` closes the open task; J (next) from "Where to start" opens the first task in the tray's order, K the last. The arrival key (`sa.todoOpenTask`) still opens its task once the tasks are in. "Where to start" shows only while a non-housekeeping task exists; zero tasks keep "Nothing to do yet", housekeeping-only keeps "You're all caught up." Nothing draws before `tasksReady`.
- **Phase 2 — `d801cf38a` — "Where to start", on the page.** `WsRunThrough.tsx` + `todoArrival.css`: on the desk column's own ground (no `.tws-wsx` card, no `.tws-wh` bar), its heading row at the desk bar's top (measured: 192.1px = desk column top 178.1 + its 14px padding, at all three sizes). Heading in `--sp-h-section` (24px typewriter; the ref's 26px has no token) with the date in italic serif. The hawk is the desk's own `.tws-mnote` in the first task's stage colour. Start is `.tws-go` "Start with {agent first name} →" (or "Start →"), opening `order[0]`. One white pile per category group in the tray's order, housekeeping last and greyed back; past four groups the fourth is "Everything else". The waiting line: one disc per needs-you task at its tray row's day count. Lights up with the desk: a pile lights its group's rows (the rest at 45%); a disc and its tray row light each other; nothing lights once a task is open. The desk opened from here fades in 220ms with no slide (held by the task's key, so the attribute never changes on a mounted desk).
- **Phase 3 — `064eddbfd` — the load outline in the run-through's shape.** `RunOutline` in `WsLoading.tsx`, on the run-through's own classes; drawn while loading when no task is asked for (nothing chosen, no arrival key waiting), the desk's outline otherwise. Same still bars, `TODO_LOAD` timings and fade. The hawk's row holds two lines in both states (`min-height: 64px`).
- **Phase 4 — `ed4cbcf0a` — steps ahead.** Where `makeFlow` gives a door-only flow (desktop, journey hosted): the lead "{Door} takes you through this, one step at a time:", the To-do's own rail listing `CJ_SPECS[kind].stages()` (nothing answered; the agent ticked; "What went" carries "{First} asked for …" only when asks are stored — the request's own log step, else the query's request fields — built with `matLabel`), then the door's own `.tws-go`, same label and handler, under the rail. The footer keeps Snooze and Dismiss and drops its copy for these tasks only. The phone's inline flow is untouched. (That commit's message wrongly says the helpers landed there; they landed in Phase 1 — corrected in Phase 5's message, no amend.)
- **Phase 5 — `03fd84db9` — the figure, tucked, at every width.** The 360px query is gone: "{n} days" on the first line, the rest of the approved wording under it, right-aligned, italic, `--sp-sec-size`. `tuckFigure` splits `trayFigure`'s words, unchanged. The strip, the phone and the desk chip untouched.
- **Phase 6 — `0d28b7c54` — measured, fixed, recorded.** See Measurements.

## Locks and red-before proofs

Every logic lock was proved red by mutating the code it guards in this worktree, running the spec, and restoring the file (`cp` from a scratch backup; `git diff --stat` checked after):

| Mutation | Spec | Red |
|---|---|---|
| M1 the old `?? order[0] ?? null` selection put back | `todoArrival.test.tsx` | 4 failed (arrival with tasks; return after finished; another account's memory; the source lock). The return-in-visit and zero cases stay green, as they must — they hold either way |
| M2 the visit's memory not read on mount | `todoArrival.test.tsx` | 1 failed — return in the same visit |
| M3 housekeeping counted as needing the writer | `todoArrival.test.tsx` | 1 failed — only housekeeping → caught up |
| M4 zero tasks treated as "run" | `todoArrival.test.tsx` | 2 failed — Nothing to do yet |
| M5 the arrival key's `go(t.key)` removed | `todoArrival.test.tsx` | 1 failed — the arrival key still opens its task |
| M6 the footer keeps its copy of the door | `todoArrivalSteps.test.tsx` | 1 failed — one button for the one action |

⚠️ The arrival key is locked at source level only: the page's effects do not run in the repo's renderer (`renderToStaticMarkup`, node), so "arrival key → that task open" is a source lock plus the live path in the e2e run (Start, rows, discs), not a rendered arrival.

New specs: `todoArrival.test.tsx` (Phase 1), `todoArrivalRun.test.tsx` (Phase 2 smoke populated + pure parts, Phase 3 source locks), `todoArrivalSteps.test.tsx` (Phase 4, with the card journey hosted and not), `todoArrivalFigure.test.ts` (Phase 5). Re-pointed to open their task as the writer now does: `todoWorkspaceSmoke`, `todoWs58`, `todoWs581`, `todoLoadPage` (each marked "RE-POINTED (To-do arrival v1)").

## Measurements (rendered page, emulator, `tests/e2e/todoArrival.measure.ts`)

Emulator harness account (106 tasks: 16 agents waiting, 10 nudges, 20 gone quiet, the rest housekeeping and own tasks), workspace pinned. One run: **21 passed** — the six cases of `todoArrival.measure.ts` with `todoLoadV1` (5), `todoV581` (3), `todoV582` (3), `cardJourneysDoors` (2) and the auth setup. Readings: `readings.json`; screenshots: `shots/`.

| | 1280×800 | 1512×900 | 1920×1080 |
|---|---|---|---|
| Rows open on arrival / desk cards / navy bars | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| Run-through scrollHeight = clientHeight (fits) | 574 = 574 | 674 = 674 | 854 = 854 |
| Waiting line bottom ≤ run-through bottom | 710.6 ≤ 766.1 | 667.8 ≤ 866.1 | 626.1 ≤ 1046.1 |
| Heading row top = desk column top + its 14px padding | 192.1 = 178.1 + 14 | same | same |
| Piles (count, discs, more) | wait 16 · nudge 10 · quiet 20 · Everything else 60 — 5 discs each, "and n more" | same | same |
| Line: discs / labels | 50 / 6 | 50 / 6 | 50 / 7 |
| A pile hovered (Agents are waiting) | 16 rows lit at opacity 1, the rest 0.45, pile outlined | same | same |
| Start → | "Send Marcus your full": steps ahead, 1 door, footer "Snooze · Dismiss" | same | same |
| A nudge opened | footer "Snooze · Dismiss · 1 of 3 · Next →", no steps ahead | same | same |
| Tray titles on two lines (54 rows) | 9 | 5 | 5 |
| …of which did not wrap at 1920 before | none | none | none |
| Figure column left ≥ title column right, every row | yes | yes | yes |
| Agency lines cut | 0 | 0 | 0 |

- **The 1920 "before"**: an in-page control restoring v58.1's one-line figure (`flex-direction: row`) at 1920 — 10 of 54 titles wrapped. Tucked, 5 wrap at 1920 and 1512 and 9 at 1280, every one of them among the 10.
- **The load outline (load=slow, 1512):** the desk drew `data-twl-out="run"`; heading row top 415.13 and heading top 431.72 loading and loaded; pile tops 563.13 loading and loaded; layout shift after the outline: none (no entries at all in this run).
- **The hawk on the harness:** "Morning, harness. 16 agents are waiting on you, so they come first. Marcus asked 161 days ago." — the "for pages" wording is dropped because the group holds an offer (Tom's); see Copy.

Screenshots (`shots/`): `arrival-{1280,1512,1920}`, `pile-hover-*`, `start-opened-*` (Start → a send task's steps ahead), `send-steps-*`, `nudge-*`, `tray-*`, `load-outline-1512`, `load-loaded-1512`.

**The first run, and what it changed (Phase 6 commit):** at 1280 the "or choose" words beside Start squeezed the bubble to four lines; four piles wrapped their sub-lines to six lines and clipped "and 11 more"; seventeen 30-day tick labels collided (oldest 468 days); at 1920 two name labels touched on the literal 64px rule; and the outline's heading sat 0.09px off. All five fixed and re-measured above.

## Copy written here for Nick's ruling

All in `lib/todoArrival.ts` (one place to change each). Nick's own templates are used as given; what follows is mine.

**The hawk's line** (`hawkLine`; "{Greeting}" is Morning before 12:00, Afternoon to 18:00, Evening after; counts are words to twelve, figures past it)
- Agents waiting, **when one of them is not a request for pages** (an offer to answer sits in that group): "{Greeting}, {first name}. {N} agent{s} {is/are} waiting on you, so they come first." plus "{Agent} asked {n} days ago." only when the first task is a send or R&R. Nick's "…for pages…" line would be false there, so the words "for pages" are dropped. **The seeded harness shows this variant** (Tom's offer is in its group).
- Agents waiting, all for pages (Nick's): unchanged, except one agent reads "One agent is waiting on you for pages, so that comes first." and 0 / 1 days read "asked today" / "asked yesterday".
- Gone quiet: "{Greeting}, {first name}. {N} {query has / queries have} gone quiet. Each one needs a decision from you: a nudge, or closing it."
- Your tasks: "{Greeting}, {first name}. {N} of your own tasks {is/are} on the list, so start there."
- No first name stored: "{Greeting}." and the rest.

**Pile titles and sub-lines** (`runPiles`, `pileSub`)
- Housekeeping keeps the tray's own title, "Housekeeping" (the ref drew "To tidy"); its sub-line is Nick's.
- Agents waiting with a non-pages task in it: "They’re waiting on you. Answer each one, then log it." (Nick's "They asked for pages…" otherwise.)
- Gone quiet: "No word for a while. Nudge each one, or close it."
- Your tasks: "The tasks you added yourself. Tick each one off when it’s done."
- Everything else (the fourth pile, past four groups): "{First group} and {second group}, together." — e.g. "Your tasks and housekeeping, together." The seeded harness has five groups, so it shows this pile.

**Steps ahead, other stages** (`aheadSteps`; only send and offer are hosted from the desk today)
- offer: answer "Your answer to {First}", when "When it happened", others "Telling the other agents".
- close: why "Why", when "When it happened". reopen: why "Why", nudge "Whether to plan a nudge".
- The "What went" sub-line names the asks as "{First} asked for 10 pages and a synopsis" / "first 3 chapters" / "the full manuscript" / "a query letter"; a named synopsis or letter keeps its name.

## Left undone, named

- **The waiting line's rules I had to choose.** (1) A row whose figure counts forward ("10 days left": a Send by not yet reached, an own task not yet due) is not on the line — the line is how long each has been on the list, and that number is not one. (2) Ticks are drawn every 30 days, but their words only every k-th tick so labels keep 60px (the harness's oldest task is 468 days: 17 ticks, which collided at 1280). (3) A name label needs 64px from the next labelled disc **and** room for both labels' words (estimated widths) — at 1920 "Alasdair 55d" touched "Tom 85d" on the literal 64px rule. (4) Discs at close day counts overlap; nothing spreads them.
- **Non-category groupings.** The piles and the hawk read the category groups (Nick's sub-lines are per category); Start opens the first task in the tray's order. Under the "When" or "Agent" grouping, Start can name a different task from the one the hawk's line names.
- **Older To-do measurements.** Fourteen v52–v58.2 measures waited for the first task's desk on arrival. Each now presses Start (`startFirstTodoTask` in `tests/e2e/measure.ts`, which opens exactly the task arrival used to open). Only v58.1 and v58.2 were run here (plus load v1 and the card-journey doors); the other twelve were re-pointed and checked to collect, not run.
- **The search palette's arrival** (the one route that lands with a task chosen) is locked at source and was not driven in the e2e run.
- **One-screen at 1280×800:** the run-through fits with the waiting line (scrollHeight = clientHeight at all three sizes), so nothing was dropped. The page's own scroller still scrolls the navy header away, as before; the measurements read the run-through with the workspace pinned.
- **Design refs:** the ref's heading is 26px; the app's nearest token is `--sp-h-section` (24px). The pile fills/edges are the ref's colours (no tokens exist for them).

## Dev deploy

**Deployed to dev (follow-up, 28 Nov).** The first pass stopped: dev's bundle had changed to `index-GcEjJLQc.js` and no record named its branch. Nick named the likely source; it was proven before deploying:
- **Proof:** a clean detached checkout of `dev/bew33-clr13-qc1722-pqs1-qc1723-bfl1-nav1-qc1724` @ `e2e52ed41`, `npm run build:dev` → **`index-GcEjJLQc.js`**, identical to what dev served.
- **Branch:** `dev/bew33-clr13-qc1722-pqs1-qc1723-bfl1-nav1-qc1724-ta1` @ `5cb32ef62` = `e2e52ed41` + `todo-arrival-v1` @ `89f663175` (a `--no-ff` merge; no conflicts).
- **Gates on the merged tree:** tsc 0 errors (with `functions/node_modules` linked; without it the checkout reports 7 unresolved `functions/` imports), `vite build --mode development` clean, the To-do specs (`src/components/todo/`, `src/lib/todoWs`, `cjSend`) 70 files, 899 passed, 0 failed.
- **Build:** `npm run build:dev` from a clean detached checkout of the pushed tip `5cb32ef62` → `index-Dyb-9aiS.js`.
- **Guard:** the deploy ran only because dev still served `index-GcEjJLQc.js` at that moment; it did.
- **Dev now serves `index-Dyb-9aiS.js`** (https://scriptally-dev.web.app), checked after the deploy.

Nothing went to main or prod.

## Worktree

`/Users/nickphysick/ScriptAlly-tav1` (branch `todo-arrival-v1`) — removed at the end, after the push; its claim released. Its `node_modules` and `.env.local` were symlinks to the primary checkout's (never copied, never committed).
