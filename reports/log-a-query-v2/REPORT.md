# Log a query v2 — the journey Nick settled in mock v22

Overnight, unattended, dev only. Branch `log-a-query-v2`, cut from the branch dev was serving.

## What landed, phase by phase

All seven phases landed (measured). Gates at the end:
- tsc: 0 errors.
- Build: clean.
- Full Vitest: 931 files, 13,272 tests, 0 failures. The baseline was 0 failures, once `functions/` had its dependencies.
- `npm run e2e:emu tests/e2e/laqV2.measure.ts`: 11 passed (setup plus V2-1 to V2-10), 81 checks. Readings are in `readings.json`.

Each phase has unit locks in `src/lib/queryActions/logStagesV2.test.ts`, and the browser run over the mock's own data (`tests/e2e/seedLaq2.mjs`).

- **Phase 1: header and words. Landed (measured).**
  - The header is one painted navy block. The FlowHead and the track are transparent on top of it, so there is no join to show.
  - Measured at 100, 110, 125 and 150% (`deviceScaleFactor` with the viewport scaled to match): a column down the header is navy for its whole height, with 0 off-navy pixels at every zoom.
  - The head and the track compute as `rgba(0,0,0,0)`, with no border or shadow. Crops of the lower edge are `shots/seam-100…150.png`.
  - Headline: two lines at every zoom. The mentor (`/icon-192.png`, empty alt) shows at the ref's 540 panel and gives way below it.
  - The measurement caught the first version wrapping to three lines at 110% and above. Fixed.
  - `headline(state)` in logStages is the one source of the headline strings.
  - D3/D4 copy: "Who did you query?", "Not queried yet", "You've already queried N agents with this book". The rest of the journey's questions were already past tense.
  - All six steps are shot at 100% and at 150% (`shots/100-*`, `shots/150-*`).
- **Phase 2: adding an agent without leaving. Landed (measured).**
  - The last row of the agent list is "Add a new agent", or "Add {Name} as a new agent" when the search matches nobody.
  - It opens an add screen in the same panel; "Add and carry on" lands on the Sent step.
  - The create is the new agent card's own path (`emptyCardDraft` → `problemsOf` → `agentFromDraft` → `addAgent`), with its duplicate merge.
  - It also makes a "Finish {name}'s card" task.
  - Measured: the agent and the task both appear. Closing the journey removes both, read back from the emulator.
  - Undo of that query removes the agent too (unit locks).
- **Phase 3: not sent yet. Landed (measured).**
  - One "Send your query to {agent}" task per agent, however often the link is pressed. No query record.
  - "It has gone after all" removes the task.
  - Catching up switches at 7 days (normal) / 8 days (catching up), unit-tested and seen in the browser.
- **Phase 4: Materials. Landed (measured).**
  - `askFill` covers four cases, unit-tested: exact package match, no match, partial card, nothing on the card.
  - Measured on Harriet: "Your Full submission package matches it." One tap fills the materials and moves on to How.
  - With no packages saved, the step goes straight to the pieces (Nadia).
  - With nothing saved, the step shows generic pieces and the note (Callum, who also gets the nil line and no button).
  - The sample opens the app's SampleControl and states its size: "First 50 pages · Version 2".
- **Phase 5: Nudge. Landed (measured).**
  - `nudgeChips` never offers a past date. Unit-tested on three cases: sent 60 days ago with an 8-week window, sent today, and Unknown (both recent and old).
  - Past the date, the screen has three choices, with "I'll nudge {agent} now" as the default (measured).
- **Phase 6: review. Landed (measured).**
  - The preview is the Queries page's own grid card (`QcCard154 preview`). Its row equals the row the saved query produces, unit-tested on four cases: normal, no date, past the date, generic materials.
  - Measured:
    - The card has no button role and no tab stop.
    - There is no hover action and no hover lift.
    - The paperclip opens on tap; Escape closes it first and the journey stays open.
    - No reply date reads "No date yet".
    - Past the date, the card shows its own words: "Gone quiet / Nudge or close".
    - The two tiles are the same height (68px).
- **Phase 7: logged, start another, leaving. Landed (measured).**
  - The three logged endings (11, 18, 21) were each logged, read back and undone. The header's "That makes 1 active query." is read back live from the Dashboard's own count.
  - `celebrationLine` covers its five cases, unit-tested.
  - Three in a row with "Log and start another", the second undone: Harriet and Callum saved, Nadia not.
    - The headline goes "That's 1 logged." → "That's 2 logged.", back to 1 after the Undo, then 2 again.
    - The logged agent moves to the already-queried group.
  - Escape at each level: nothing entered closes; the open calendar closes first; then the leave check; Escape on the leave check keeps the journey; an open piece folds first.

**Finish checks, each run and recorded (`readings.json`):**
- Header seam: 0 off-navy pixels at 100, 110, 125 and 150%.
- Nothing in the panel under 12px, on the review, the Nudge step and the logged screen: `under12: []`.
- No layout shift on hover across every control on the review: `hoverMoves: []`. Only moves that go back when the pointer leaves count, so an animation still settling isn't mistaken for a hover move.
- Keyboard only, from open to logged and through Undo.
- A focus ring on every control the walk met: `noRing: []`.
- Grep of the journey's files for "live", "overdue", "late": none in writer-facing copy. The only hits are code comments, variable names and `aria-live`.

**What the measurement caught, now fixed:**
- The three-line headline at zoom (the mentor now gives way below the 540 panel).
- No focus ring on the review card's paperclip.
- Three pieces of text under 12px: the track's hover label, the illustration placeholder (8px uppercase mono), and the Logged stamp's date.
- "Queries sent 0 → 0" just after midnight.


## Step 0 answers

- **0.1 Disk:** 26 GB free (`df -h ~`). Green.
- **0.2 What dev serves:** `index-BGvJwFRg.js` = `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1` at `7972443ea`. Worktree `../ScriptAlly-laq2`, branch `log-a-query-v2` from that tip.
  There were already 6 worktrees besides the primary. CLAUDE.md says tell Nick and offer to clean the clean ones first. Nobody was watching, so I left every one of them alone. Listed for you: `ScriptAlly-live`, `-mg1`, `-pc2`, `-pc2-base`, `-rsp6`, `-tdf`.
- **0.3 Ref pack:** it was **not** on any branch. It was in `~/Downloads/log-a-query-v2.zip` (22 Nov 22:35). Every line of `SHA256SUMS.txt` passes. `log-a-query-v2.html` hashes to `d4081aff…dc907`, as the prompt requires. Copied to `design-refs/log-a-query-v2/` and committed first (`08c20bd45`), so the gate holds on the branch.
- **0.4 Ref walk:** `tests/e2e/laqV2ref.mjs` walks the HTML at 1480 through all three switches into `reports/log-a-query-v2/ref/`. I also read the mock's own script end to end (its copy, every route and every footer).
- **0.5 Baseline:**
  - `tsc --noEmit`: **0 errors.** It needs `NODE_OPTIONS=--max-old-space-size=8192`; at the default 2 GB heap it ran out of memory (exit 134).
  - `vite build`: clean.
  - Vitest: all 931 files green once `functions/node_modules` was symlinked into the worktree. The first run had 10 failed files and 1 failed test, every one from the missing `functions/` packages.
- **0.6 Premise checks**
  - **a.** Plumage colours v2 is **not** on my base. The grid card here has no status name on the band. The preview shows whatever the grid card is.
  - **b.** The grid card is `QcCard154.tsx`. It takes a `QcRow`. It can draw a row that has never been saved: the Responses page already does that (`RspEmpty`). The check stage built its slip row in `previewOf` (lib/queryActions/logStages): `logPayload(plan)` → `buildQcRows` → `stampRows`.
  - **c.** query-card-v167 added one prop to `SampleControl`, `openingOnly`, for the agent profile. It is still the one sample control (`src/components/queryActions/controls.tsx`), with the same props otherwise. Unforked here, with no new prop.
  - **d.** The Dashboard's figures:
    - Active count: `liveCount(scopedQueries)` from `lib/dashBreakdown` (Dash58 → Dash2Active `activeTitle`).
    - Sent: `sentAllTime` from `lib/dash2`.
    - Weekly sent: `sentWeeks` over `dash2Weeks`.
  - **e.** `UserTask` is created with `addUserTask({ text, agentId?, manuscriptId?, dueDate? })` and removed with `deleteUserTask(id)`. It lives in `users/{uid}/tasks` and shows on the To-do page; with an `agentId` it opens that agent. Deleting an agent takes its stored tasks with it (`cascadePlan`).
  - **f.** `openNewAgentCard({ host: "panel" })` opened the separate new-agent card in the panel and handed back the id (`onCreated`). The card creates through `addAgent(agentFromDraft(draft))`. That path includes the duplicate merge (`findExistingAgent`) and the `AGENT_ADDED` activity. The smallest record it accepts is a name plus an agency, or a name marked `agencyUnknown` (`problemsOf`).
  - **g.** Confirmed: before v2, `LogStagesPanel` registered Escape at `ESC_LEVEL.drawer` and closed straight away. `leaveRef` only served the dimmed page.
  - **h.** `AskCardView` read `agent.ask`, a `GuidelineAsk` `{ stated, ql, syn, sample: Sample }` parsed from `materialsWanted` (`guidelineAsk`). In v1.2 it showed ✓/≠ marks against what was ticked.
  - **i.** What v2 undoes from v1–v1.3. Listed here so nothing goes silently:
    - v1.2's ✓/≠ marks and the "You're sending…" difference lines on the asks card. The ref has plain items and one button.
    - v1's pieces screen used to start from what the agent asks for. The ref starts with the query letter ticked, and the ask fills in one tap.
    - The v1–v1.3 pieces screen (radio groups, the sample line with Change / Done).
    - The "Preview" tag on the check slip.
    - The FlowHead title "Logging new query" and its line, in this journey.
    - "Ready to query" and "You're already querying".
    - v1.3's Unknown chips counted from the sent date. They now count from today.
    - The × used to close without asking. It now runs the leave check, as the ref does.

## Decisions I took

- **CLAUDE.md vs the prompt on branches.** CLAUDE.md says direct-to-`main`, no feature branches. The prompt says own branch, and main is Nick's only. I kept the branch. It is the reversible choice, and it matches how every recent pack has landed (branch plus dev line). I'm flagging it as the prompt asked.
- **The ref pack was in Downloads, not on the branch.** I copied it in after its hashes passed, and committed that first.
- **"Add a new agent" sits after the "Closed right now" group**, so it is the last row of the list. The ref has no closed agents.
- **An empty agency is saved as "agency unknown".** The new agent card's own rule needs that, or an agency. The ref's add screen says "Agency — if you know it".
- **The added agent's How step says "{agent}'s card says email".** The shared create path (`agentFromDraft`) defaults the submission method to Email, as the app-level form does. So a new agent's card is not quite empty.
- **Closing the journey any way** (Cancel, ×, Discard, Done) removes an agent it added that nothing uses. The agent's own delete cascade takes the Finish task with it.
  - An agent kept on a not-sent task stays.
  - If the panel is torn down without a close (navigating away mid-journey), the added agent stays on the Contact list, with its Finish task.
- **The not-sent screen** keeps the ref's headline and task card. Its line is "Nothing is logged yet. It's on your to-do list for when it goes." The ref's "tick the task and you'll come straight back here" is something the app does not do.
- **The pieces screen opens with the query letter ticked** (the ref's start), not v1's picks from the agent's card. The agent's card now fills in one tap.
- **A ticked piece's control:** a tap on an unticked piece ticks it and opens it. A tap on a ticked, open piece unticks it (as in the ref). A tap on a ticked piece Escape had folded opens it again. That way Escape can close the open part without unticking.
- **An exact package match** means:
  - the letter and synopsis exactly as asked;
  - opening pages exactly when a sample is asked for;
  - no "other" materials.

  A package states no sample size, so the sample is always at the card's size.
- **Unknown chips count from today.** When the query went over a week ago with no reply date, they are a week, two weeks and a month (the ref's), so none is ever past.
- **"Pick a date" stays** among the reminder chips. It is v1.3's; the ref has no picker.
- **"No date yet" is preview-only.** On the Queries page the same card says "No reply date / add a response time", or "Nudge scheduled for …". The prompt asked for "No date yet" in the preview, and the grid card's look is out of bounds. Under it the preview shows the reminder, else "No reminder set", as the ref does.
- **The "Active queries" tile shows only when the Dashboard's own `liveCount` goes up with this query.** For any Queried query it does, including past-the-date ones. So both tiles show where the ref shows one; see the next section.
- **The sent figures are read at the end of today** (the same `sentAllTime` / `sentWeeks`), so a query sent today counts at any hour.
- **Escape has its own layer**, `ESC_LEVEL.journey` (32), on the app's one Escape stack. Routing it through each host would have meant editing the Queries page (out of bounds). One layer above all three hosts does the same job everywhere: LogStagesPanel 30, QueryPanelHost and the Contact list's panel 6.
- **The × runs the leave check too**, as in the ref (`tryLeave`).
- **The logged screen keeps v1's** confetti, odometer and milestone line. The ref does not show them; it does not contradict them either, and the prompt said not to undo things silently.
- **The toast reads "{First name} logged."** (the prompt's form). The ref's is "Logged Harriet. The date and materials carry over."


## Where the build differs from the ref, and why

- **Time copy.** The ref's past-the-date card says "Response overdue / Send nudge now". The build shows the grid card's own words for that state. Measured: "Gone quiet / Nudge or close", because a query that old is Gone quiet by the app's rule. A newer one would show "Past expected / Send nudge now". Nowhere does the journey say "overdue" or "late".
- **The card.** The ref's card markup and CSS are not ported. The preview is `QcCard154` from this base, so:
  - no "Queried" status pill (Plumage colours v2 is not on this base);
  - a bell line, "Nudge on …", in the grid card's own style.
- **Past the date, "Active queries" still shows.** The ref drops it there. The Dashboard counts a past-the-date Queried query as active, so the build shows the honest "0 → 1".
- **Dates carry the year when it differs** ("17 Jan 2027"), by the app's `dayMonY` rule.
- **Reminder dates move off weekends** by the app's `reminderAnchors` rule ("A week later" from Sun 17 Jan is Mon 25 Jan). The ref shows 24 Jan.
- **Inside this panel only, text under 12px is raised to 12**: the track's hover label, the placeholder, the stamp's date. The illustration placeholder also reads in sentence case. The ref has 8px uppercase mono there.
- **The agent list holds the harness account's own agents** in the build shots, so screens 01 and 17 are longer lists than the ref's three.
- **Compare sheet:** `compare/index.html` puts each ref screen 01–22 beside the build's shot of the same name (`shots/`). My own walk of the ref through all three switches is in `ref/` (52 shots).


## For Nick to rule on

- **Skipping the tiles when there are no packages.** Went in as proposed, not ruled: named materials and no packages go straight to the pieces screen.
- **Re-querying an agent already queried with this book.** Left as is (D10). One related thing, for a ruling: "Not queried yet" lists every agent without an *active* query for this book (`whoGroups`). An agent whose query was closed (a pass, say) is listed there too, so the group's name is not true for them. Options: rename the group, or move those agents to their own group.
- **Multiple manuscripts:** out of scope (D10).
- **From 0.6i**, everything v2 undid from v1–v1.3 is listed under 0.6 i. The ones worth a look:
  - the asks card's ✓/≠ marks, gone;
  - Unknown chips now count from today;
  - the × now asks before discarding.
- **Not fixed (outside this journey, on the do-not-touch list):**
  - **The Queries page has the same paperclip focus-ring gap.** qcv154's `.qc1533-clip.qc1533-clip:focus { all: unset }` outranks its own `:focus-visible` ring. It is fixed only inside this panel.
  - **The Dashboard counts a query sent today only once its date's time has passed.** `sentAt` parses the stored date, so just after midnight today's sends are missing from the Dashboard's sent figures. The review tiles read at the end of today instead.
- **Old journey specs now assert copy that v2 replaced.** These were not run and not changed (older-version suites): `tests/e2e/laqV1`, `laqV12`, `laqV13`, `laqFork`, `laqFidelity*`, `laqScreens11`, `laqShots`, `laqSideBySide`, `qc149` and `addAgentV1` (the old "+ Add {name} as a new agent" hand-off). Examples of the copy they expect: "Ready to query", the pieces radio groups, "Hover the paperclip". Retire them, or point them at v2.
- **Worktrees.** There were 6 besides the primary when I started (see 0.2). I left them all; mine is removed.


## Branches, commits, dev, and backing out

- **Branch:** `log-a-query-v2`, pushed. Tip `95f082fbd` plus this report's commit.
- **Dev line:** `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2`, pushed at `95f082fbd`.
  - It is a fast-forward of the line dev was serving: `…-qc167-cwu1` at `7972443ea`, which served `index-BGvJwFRg.js`.
  - Hosting deployed from a clean checkout of that pushed tip with `npm run build:dev && firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`.
  - **Dev now serves `index-CgMT1yeh.js`**, the same hash the build produced: https://scriptally-dev.web.app
  - No rules, no functions, nothing on prod, nothing on main.
- **Commits** (one per phase; Phases 2 and 3 share one, because their edits share three files):
  - `08c20bd45` the ref pack
  - `48acf7f61` Phase 1: header and words
  - `449393fff` Phases 2 and 3: add an agent in place; not sent yet
  - `4740cfe61` Phase 4: Materials
  - `9f957ff36` Phase 5: Nudge
  - `63a442c2d` Phase 6: review card and the two tiles
  - `4734db002` Phase 7: logged, start another, Escape
  - `a4de75401` Phase 7 (cont.): the × runs the leave check; the decisions file
  - `95f082fbd` measured: the e2e spec, its fixes, the ref walk, the compare sheet
- **To back it out on dev:** redeploy the previous line from a clean checkout of `origin/dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1` (`7972443ea`), with the same build and deploy command. It serves `index-BGvJwFRg.js` again. Then delete the `…-cwu1-laq2` branch if you want it gone. Nothing was written to any database by the deploy.
- **Decisions file:** `docs/decisions/query-actions.md`, section "Log a query v2".

