# Add agent v1 — report (9 Nov)

Branch `add-agent-v1`, cut from the branch dev served at the start
(`dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54-cl27b` @ 1bb3e371f).
Dev merge: `dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54-cl27b-yn1-laq1-qc1534-aa1` (deployed), built on
`…-laq1-aa1`.
Nothing is merged to `main`, and nothing went to prod.

## 1. False premises and surprises

1. **Dev moved twice during the pack.** At the start, dev served `index-DIr9O0zd.js` from `…-cl27b`. By the deploy step it
   served `index-CrpShZgq.js` from `…-cl27b-yn1-laq1` @ 5e0160694, which includes Log a query v1, so I merged onto that
   as `…-laq1-aa1`. While its suites ran, the Query Centre v153.4 session deployed `index-DwTVgjZO.js` from
   `…-laq1-qc1534` @ a80b07d3d (that line plus v153.4) and told me so. I checked the served hash myself, merged
   `…-laq1-aa1` onto it as `…-laq1-qc1534-aa1` (a clean merge; no file in common), and ran the gates and every suite
   again on that branch before deploying it.
2. **"Who are you querying?" is no longer `QcLogFlow149` on the line dev serves.** Log a query v1 retired that form for its
   staged journey (`QcLogStages`). On `add-agent-v1` the fit order lives in `QcLogFlow149`. In the merge I kept Log a query v1's side of the
   three conflicting files. The fit order and the "Other" method mapping moved into `lib/queryActions/logStages.ts`:
   `whoGroups` sorts "Ready to query" and "Closed right now" by `fitOrder`, and `stageAgents` reads `queryViaOf`. AA13 was
   re-pointed at the staged picker.
3. **A dev build from a clean `npm ci` is never the served bundle.** The primary checkout's `node_modules` has drifted from
   package-lock: react 19.3.1 against 19.2.6, flag-icons 7.6.0 against 7.5.0, vite 6.4.6 against 6.4.5. Dev is built with that
   `node_modules`, so a hash match needs the same symlink.
4. **`AgentCard262` never read the editor request.** On the Contact list, the "edit at this field" doors from Housekeeping and
   from tasks opened the card without opening any section. `AgentEditMode` was only fed to `AgentCard24`, which is mounted
   nowhere. Phase 5 makes those doors open the card at the right section.
5. **"Other" was not a submission method.** It existed only as a legacy string, read as "nothing chosen". It is now
   `SubmissionMethod.OTHER`, with the words in `submissionMethodOther`.
6. **A query's `sendMethod` is an enum in the rules** (Email, Online Form, Query Manager, Post). An agent's "Other" method must
   never seed a query write, so `lib/queryVia.ts` (`queryViaOf`) maps it to null. That covers every log flow and the nudge
   journey; the nudge journey was the last unguarded cast and was found during the merge.
7. **The harness account is Free and holds 53 agents**, so `addAgent` refuses every add (the Free cap is 5). The AA locks set
   the plan to Pro on their own emulator run (`aa1Emu.mjs pro`). Nothing outside the emulator is written.
8. **The Contact list already sorted by rating** ("Your rating", key `rating`). Phase 6 renamed it to "Agent fit" and added it
   to the sort chip, rather than adding a second sort.
9. **The saved flash was sage `#4e7d60`, and the WeekSlider's focus ring and Unknown hover were sage too.** All are navy or
   neutral now.
10. **`tsc --noEmit` runs out of memory at node's default 2 GB heap** (17 minutes, exit 134). It needs
    `NODE_OPTIONS=--max-old-space-size=8192`.
11. **CL262 J6–J9 asked for the retired editor's controls** (the week stepper's ± buttons, the old wishlist input, the old
    door, unit and genre probes) and timed out on the merged branch. Each was re-pointed at the shared control with its
    claim kept (§5). v26.2's "the genres have no free-text field" is restated, since the finder takes typing: words typed
    and left unpicked are never a genre.
12. **Re-pointing J8 found a real jump at 1280.** A section heading 0.03px above the frame's top counted as "hidden", so
    opening that section scrolled it 70px down the card. A heading within a pixel of the top now counts as in view
    (`AgentCard262.tsx`, one line).
13. **Another session (ScriptAlly-laq) held the standard emulator ports.** Every measurement ran in a scratch copy with the
    ports shifted by 7 (8092/9102/9202/4412/4512, vite 3007).

## 2. Dev

- Served before: `index-CrpShZgq.js`. It was reproduced exactly by `npm run build:dev` of
  `origin/dev/…-cl27b-yn1-laq1` @ 5e0160694, using the primary's `node_modules`.
- Then served: `index-DwTVgjZO.js` (`…-laq1-qc1534` @ a80b07d3d, Query Centre v153.4), checked inline in the deploy
  command, which refuses on any other hash.
- Deployed branch: `dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54-cl27b-yn1-laq1-qc1534-aa1` @ e284e8515,
  pushed. It carries `…-laq1-aa1` (pushed too) and Query Centre v153.4.
- Served after: **`index-BQXN6Mzy.js`** (10 Nov), the same file `npm run build:dev` produced from a clean checkout of
  that commit. The app chunk carrying the fit words (`AppRoot-DYwZIDdL.js`) answers 200.
- Dev Firestore rules: deployed from the same tree, which carries both clauses. The release moved to ruleset
  `3645b74c…` at 2026-11-10T00:04:18Z, read under `--debug`. A minute later a probe as the harness account, on its own
  seed agent, with every write undone, found: `agencyUnknown: true` accepted, `false` denied;
  `submissionMethodOther` of 13 characters accepted, 41 denied; neither field left behind.

## 3. Phase 0 inventory (summary)

- The routes that edit an agent: the Contact list band pencil and section pencils (`AgentCard262`); Housekeeping and task
  "edit at field" doors (`openAgentCard(id, {tab, focus})`); the Query Centre agent tab's doors (`AgentCardHost`, which drew
  `AgentEditMode`); and the add doors (`openNewAgentCard`, drawn by `AgentPanelNew`).
- `WeekSlider` renders in three places, listed in §7.
- `SubmissionMethod` readers: every method label and phrase helper, `howTiles`, the log flows and `stepSaves`. All of them
  now handle Other.
- Both design-ref SHA256s matched the pack (c4f8a18b…, 2e0a16db…).

## 4. Phases

| Phase | Commit | What |
|---|---|---|
| 1 | f3f4c10a8 | The shared controls: `agentPills.tsx` (fit stars and words, door, method with an Other typing pill, materials with the floor line, country pills with flags, social, genres, wishlist, response time, policy, the "i" tip portalled through `useFixedMenu`). WeekSlider navy. `SubmissionMethod.OTHER`. |
| 2 | be8dfa2db | The data: `agencyUnknown`, `submissionMethodOther` (types, save, draft, rules); the agency problem and the Housekeeping gap; "Agent fit" wording everywhere; `queryViaOf`. 51 files. |
| 3 | eb6d22b95 | "Adding new agent": `AddAgentJourney` (who / want / query / reach, locked rows, agency ask, duplicate notice, finish screen with a preview of the real card), `HostAgentCard`. |
| 4 | 13070e0a2 | Editing on the card: `AgentCard262Edit` on the shared controls; the save bar counts changes by name and says how many nudges move; the discard guard. |
| 5 | 6afc9555b | The long form retired: every "Edit agent" route opens the card at its section; `AgentEditMode.tsx` deleted (447 lines). |
| 6 | 58e569322 | Ordering by Agent fit: `lib/agentFit.ts`; "Who are you querying?", the next-step spotlight and the Contact list sort. |
| 7 | 25c1acf5d | The AA locks (`tests/e2e/addAgentV1.measure.ts`, `aa1Emu.mjs`), and a fix AA9 found: the add panel stayed open behind the new card on /agents. |
| — | 612b1519d | The nudge journey reads the agent's method through `queryViaOf`. |
| — | 24e994806 | AA13 reads Log a query v1's staged picker. |
| — | a42d3aa33 | CL262 J6–J9 follow the shared controls; a heading flush with the card's top is in view. |

Ref mismatches I kept, all deliberate:
- The ref's head strip is drawn by the journey itself, so `AgentPanelNew` no longer draws a `FlowHead` for the add case.
- The WeekSlider "Unknown" pill keeps the shared mono style.

## 5. Locks

Every lock is red under its named mutation (`AA_MUTATE=<lock>`, proofs in `mutation-proofs.txt`) and green on the merged
branch (ledgers in `ledger/`). AA2 went red by timing out under its mutation rather than through a ledger line. AA13 is also
red against Log a query v1's own alphabetical order ("Wren Tallis before William Tan").

CL262 J6–J9, re-pointed: green at 1512 and 1280, and each red under `CL262_MUTATE`. J6: "door Closed reveals Reopens".
J7: "an Also note shows (0)". J8: "Submit by holds How — 138 → 538" and the Materials reading. J9: "40 characters typed in one
go — 1".

Measured values on the green run:

- **AA1** — 31 text leaves read; 0 aria-invalid; no red text; the start line reads "Add their name and agency to start."; Want, Query and Reach are locked.
- **AA2** — the blush agency note shows ("Do you know Imogen's agency?…"), and its background is rgb(245, 230, 223), not red; the foot reads "Add Imogen's agency, or mark it unknown."; Agency unknown lets Next through; an agency alone goes straight through and is never asked about.
- **AA3** — duplicate notice: "Already on your list: Imogen Vale · Vale & Winter Literary", with "Open their card instead"; Add waits.
- **AA4** — 200 typed stays 200; the floor line reads "At least 500 words for the opening sample."; a rust ring (rgb(162, 69, 42) inset 2px); Add waits; switching to chapters snaps to 3.
- **AA5** — Online Form → "Submission form"; Query Manager → "QueryManager"; Other → "Link, if there is one"; the card tile reads "Takes queries via Agency portal"; Other and its words are stored.
- **AA6** — the social field: "✓ Instagram" from the host; the ask; five platform pills.
- **AA7** — GB, IE and US carry flags; Elsewhere wears the globe and opens `CountryCombobox`.
- **AA8** — the "i" tip, at 1440: left 12, right 292, bottom 888 in a 900-tall window, clipped by nothing; at 1280: right 292, bottom 788 in 800. Hovering 2 reads "Worth a try", 4 reads "Great fit", and `starRating: 4` is stored. *(Mutated: left 1360, right 1640 at 1440, off the window.)*
- **AA9** — finish title "Saffron's on your list."; the real card's face (next step, tabs, sections, foot, band) all present; card box [284, 775] inside the body [230, 821] at 900 tall; the add panel closes when the real card opens. *(Mutated: [285, 1136], past the body.)*
- **AA10** — the band pencil opens every section, Contact details first; the band says EDITING; the nudge line sits inside its section; the save bar reads "2 · city, response time · moves 1 nudge".
- **AA11** — discard guard in rust rgb(162, 69, 42): "Discard 1 change to Nadia? Nothing has been saved yet."; Keep editing returns; Discard closes.
- **AA12** — the Contact list band pencil and the Query Centre agent-tab door both open the card in edit mode, with no long form (0).
- **AA13** — 27 of 41 rated; all 41 in fit order; unrated last (last rated at index 26, first unrated at index 27).
- **AA14** — no green and no burgundy in the add panel (111 elements) or the card in edit mode (193 elements); the WeekSlider fill and every thumb rule are navy rgb(42, 58, 82); its readout is rgb(168, 154, 138).

## 6. Gates

On the merged branch:
- tsc: clean outside `functions/` (the baseline has 2 errors there).
- Both builds exit 0, with no CSS warnings.
- Vitest: 7 files / 4 tests red: the `functions/` suites, aiRefusal, emuGuard and firestoreTarget ×2. All are baseline failures and none involves these changes; the new spec and `aa1Emu.mjs` add nothing to the guard lists.

On `…-laq1-qc1534-aa1`, the deployed branch: the same results. Both builds are clean, Vitest is 7 files / 4 tests red (the
same set), and tsc has 2 errors, both in `functions/`.

Suites on `…-laq1-qc1534-aa1`, on a fresh emulator, one worker:

| Suite | Result |
|---|---|
| Add agent v1 (AA1–AA14) | 15 passed |
| Contact list v26.2 (cl262) | 26 passed |
| Contact list v27 (cl27) | 6 passed |
| Log a query v1 (laqV1) | 6 passed |
| Query Centre v153.4 (qc1534) | 11 passed |
| Query Centre v153.3 (qc1533) | 10 passed, 2 skipped, **2 failed**: T1 paperclip tab at 1440 and 1920, its three hover readings |
| Query Centre v149 (qc149) | 1 passed, 6 skipped, **1 failed**: L1, the rows never appear at 1280 |

Both reds are baseline. On the base, `…-laq1` @ 5e0160694 (a measurement copy built the same way), qc149 L1 failed the
same way, and qc1533 T1's hover readings failed with identical values ("hover lifts the tab 1px — 0.00", "icon stroke
1.8 — 1.5px · 0px", the unchanged shadow). This pack changes no Query Centre file. An earlier run during a busy hour
(load average about 10, another session's suites running) also failed cl27 R2 and qc1533 S1 on sign-in and click
timeouts. Both passed on the base, and both pass on the deployed branch.

## 7. Every place WeekSlider renders, now navy

- `src/components/queries/ResponsePane.tsx:144` (Record a response).
- `src/components/reading-pane/QueryTimeline.tsx:748` ("Your expected response time").
- `src/components/agents/card/agentPills.tsx:367` (`ResponseTime`), which renders in the add journey's Query section and in the card's edit mode.

## 8. For Nick — prod rules

`firestore.rules` gains two clauses in `isValidAgent`, plus two keys in the agent-update allowlist:

```
&& (!data.keys().hasAll(['agencyUnknown']) || data.agencyUnknown == true)
&& (!data.keys().hasAll(['submissionMethodOther']) || (data.submissionMethodOther is string && data.submissionMethodOther.size() <= 40));
…'reopensOn', 'mswlCheckedAt', 'notePreview', 'agencyUnknown', 'submissionMethodOther'
```

Until prod has these, any agent write carrying either field is denied, silently. Dev has them (§2).

## 9. Deferred

- The contact lab (`#/contact-lab`) is no longer a sandbox for edits. Edits now go through `HostAgentCard`, which writes to Firestore rather than to the lab's cast.
- Log a query's "add a new agent" path skips the finish screen. It returns straight to the log, as before.
- The next-step spotlight now leads with Agent fit, ahead of the genre tiers. Every ready agent already takes the book, so the tiers are a tie-break. Worth a look on dev.
