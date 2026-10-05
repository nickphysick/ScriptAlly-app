# Agent card v1: the report

Oracle `design-refs/agent-card-housekeeping-v7.html` (sha256 `d5246918d1e8ba7cefc845505d8c02384dfefc94d8f69fa2132e46d62e48f61e`). Seven phases, one commit each, each pushed only after its gates and its measurement ran green:

| Phase | Commit | What |
|---|---|---|
| 1 | `c87c866f` | One app-level host and store (`lib/agentCardStore`, `AgentCardHost`); the Contact list routes through it; one Escape stack (`lib/escapeStack`) |
| 2 | `b6fa05ae` | The quick view (548) |
| 3 | `b65f5801` | The editor (780): Contact · Wishlist · Submissions · Notes, one draft, one Save; the add card. ContactProfile, ContactAgentForm, ContactAddCard and AgentCountryPicker deleted |
| 4 | `56cd57e2` | Save, whole-document Undo by snapshot, Also changes, delete with its cascade; decision 13's reopen reminder |
| 5 | `9aecd9a5` | Hand-off to the real drawer, the card docked beside it; parking and reload for all seven journeys; the clash; decision 8 app-wide; the "answered" fixes |
| 6 | `1188fd4c` | EditAgentDrawer and EditAgentHost retire; the Dashboard and the Query Centre open the card |
| 7 | this commit | CLAUDE.md, this report |

**No deploys of any kind. The pack changed neither `firestore.rules` nor `functions/`**, so nothing waits on a prod rules or functions deploy. Dev hosting does not have it either. Deploying it is a separate act.

---

## False premises

These were named before editing, and the go-ahead accepted them. Each is listed with how the build settled it.

1. **The add card has four tabs.** It has three, with no Notes, because a note needs an agent to belong to.
2. **The offer tone comes from the agent.** It comes from the query (`queryTone`), as every other tone does.
3. **`--clv-band-slate` is its own token.** It was folded into `--clv-slate`.
4. **The card can rely on another surface's link validation.** It validates its own links (`cardProblems`).
5. **The dock sits where the mock happens to draw it.** It sits BESIDE the drawer, 12px from the drawer's edge, as the mock's own measurement says (locked against the mock by one ruler).
6. **The card's z-order is free.** The card sits at 63–68, under the drawer at 70. The parked chip is at 69 (see deviations).
7. **"One `document` capture handler for the card."** The app has one capture-phase Escape STACK (`lib/escapeStack`), with layers ordered by level and then by push order, and the drawer and the card are both layers on it. Two capture listeners on one target resolve by registration order, which is the fault the stack exists to end.
8. **"Eight e2e Escape rewrites."** Decision 8 makes Escape on a drawer WITH answers park it. Eight sites were named. A ninth was found (qaV11's mobile sheet walk) and a tenth (qaShots's own `discard` helper). Four of the rewritten sites (packagesJourney LP1, LP2, LP3 and qaSnapshot H12) close a drawer with NO answers, which ✕ closes without asking. The first rewrite waited three minutes for a Discard that never comes.
9. **"Resolve the task flag on save exactly as EditAgentHost did."** EditAgentHost never resolved it. The dashboard task only vanished because it was re-derived. The card now resolves `data_quality_poor`'s flag when a save clears the agent's last gap, and the Undo snapshot holds the flag, so Undo un-resolves it.
10. **Undo restores the agent.** Undo is whole-document: the agent, its queries (the reply-time fan-out rewrites their `responseDeadline`), its task flags and its tasks, read before the save and put back whole. No snapshot, no Undo offered.
11. **The journeys already mark themselves answered.** They did not. Decision 8 reads `dirty`, and at least one answer control in each of the five journeys below did not set it, so a half-done journey could be discarded without being asked:
    - Record a response
    - Answer the offer
    - I've sent it
    - Close the query
    - Log a query

    Fixed and locked (`journeysAnswered.test.ts`) before Phase 5 relied on it.
12. **`Dashboard.tsx:271` is a live door into the old drawer.** It renders nowhere. `TaskPanelCard` sits under `renderTasksSidebarWidget`, which nothing calls, so the task panel cannot be opened on the live dashboard. The door was repointed to the card rather than left importing a deleted file. Its half of lock 10 is a source lock (`agentCardRetire.test.ts`), and the dead cluster is a separate task chip ("Remove the dead dashboard task-panel cluster"). On the live app, data-quality tasks are worked on the To-do page.

---

## Where the build differs from the mock, deliberately

**Quick view (P2)**
- The query letter reads "Covering letter", because the app's display map owns that label (UK copy).
- What was sent rides at the top of the History disclosure. The mock's face has no room for it, so the disclosure shows for any queried agent.
- "Send a nudge" is offered past the expected date at ANY stage on the agent's side, not only "Queried". The row calls every such query "Your move", and the Query Centre offers a nudge on each.
- The manuscript's genre comes first among the chips, as on the row. It is sage with a tick.
- Escape with a note composer open closes the composer and keeps the words.

**Editor (P3)**
- The add card starts with NOTHING pre-answered. The mock ticks three materials and picks UK and Email; stored, those are claims nobody made (the v11 law). Email is still written when no method is chosen, because the rules require the field.
- A duplicate name blocks Save. The mock's script lets one through; its own Inputs table says duplicates are caught.
- "How to submit" offers the enum's four options. The mock draws five.
- A wishlist stored longer than 400 characters is kept and can be cut, never grown (ruling 8 applied to the other capped field).
- **A pasted QueryManager link sets how to submit and is not otherwise kept.** That is the mock's rule; v11 kept such a link as the website. **Flagged for Nick.**
- "Save note" waits for words.

**Save and delete (P4)**
- The mock's dry run says "Removes the reopening reminder from To-do." when a door reopens. **Not built, so not said.** A reminder carries no marker that sets it apart from other dated tasks about the agent, and deleting by agent alone could take a task the writer wrote for another reason.
- The typed-name delete gate ignores case, through the house's `canDestroy`.

**Hand-off and parking (P5)**
- **The parked chip sits ABOVE an open agent card** (z 69 against 63–68). The mock puts it under the card's backdrop, where the clash, which is asked in answer to a button ON the card, could not be answered.
- The drawer shrinks into the chip's place with WAAPI rather than the mock's cloned ghost. The chip fades in over the second half, as drawn.
- Prefill only where a journey already reads a default. "I've sent it" now starts Via at the agent's own method when the query records none. Log a query from the card carries the card's manuscript. No steps were added.

---

## Open items for Nick

1. **The six "+ Agent" doors still open `AddAgentFocusForm`** (ruling 3: kept). Routing them to the card's add face is a later prompt. It is recorded here, not in a code comment.
2. **Social handles.** The card preserves `socials`, `twitter`, `bluesky` and `instagram` untouched on save. It writes `socials` only when the MSWL link changes, keeping every other entry in place. It does not edit them. **On the dev account 0 of 37 agents carry any**, so nothing is at stake there today. Prod is unmeasured: the prod scan is read-only and was not run in this pack.
3. **A pasted QueryManager link** (see P3 above): it sets the method and is not kept as the website.
4. **Housekeeping v2 is queued** behind this pack and the todoPrefs wipe fix (chip "Stop task-settings saves wiping todoPrefs sub-maps"). Its Q1 ruling supersedes ruling (c): an absent reply time IS a gap until set or "Say it's not stated". CLAUDE.md changes when it lands.
5. **The dead dashboard task-panel cluster** (false premise 12), as its own task.

---

## Verification

| | At the last commit |
|---|---|
| tsc | clean |
| Production build | clean, no CSS diagnostics |
| Vitest | 520 files, 8,381 passed, 3 skipped |
| `agentCardV1.measure.ts` | all six phases, 44 tests, 430 assertions, green on the dev build |
| Phase 5 neighbours | contactV11, qaSnapshot, qaShots, qaJourneys, qaLocks, qaV11: 97 passed; packagesJourney 11 of 11 |
| Mutations | every lock proved red before its green was trusted (counts below) |
| Account | audited after every writing run: no residue (Phase 5's audit matched Phase 4's byte for byte) |

Mutations proved red, per phase:

| Phase | Proved red |
|---|---|
| 1 | 4 rendered + 2 unit |
| 2 | 10 rendered + 2 unit |
| 3 | 26 |
| 4 | 20 |
| 5 | 21 (17 rendered + 4 unit) |
| 6 | 6 (2 rendered + 4 unit) |

Two mutations went red by timeout rather than by name. Their probes were tightened so a missing thing fails in words:
- **Phase 5:** the dock chip's status line, now read with `allTextContents`.
- **Phase 6:** the card's arrival, now `expect().toBeVisible` with its own 10s clock.

**Measurement environment:** worktree `/private/tmp/sa-agentcard` with `vite preview` on 127.0.0.1:4399, and the baseline worktree `/private/tmp/sa-acbase` (port 4412). qaShots needs `design-refs/` served on 127.0.0.1:4610 (`python3 -m http.server 4610 --directory design-refs`); that step is environmental.

### Lessons recorded on the way

- **A serial file's "N did not run" is not green.** packagesJourney's LP2 and LP3 were believed to pass after the first full run, and had never executed: the file is serial, and LP1 failed first. Only a rerun showed they carry no answers.
- **A finally that only strips a field leaves a document the case CREATED.** Phase 4's data-quality case left a stanceless task-flag document on the account. It was found by the audit and deleted, and the case now restores the exact prior state (absent ⇒ delete).
- **Decision 13 was dropped silently in P3 and P4, and caught before the P4 commit.** That is the reason for this report's per-decision listing.

### Red before this pack, not touched

Both were proved identical on an unmodified build:
- contactV11 "v12 §10.1 — the hero at 1440/1280" ("hero height 263 against the QC's 220"). The plate-header pass made the Query Centre's header a plate.
- materialsEverywhere "the To-do pane…" (`selectTodoView('list')`). That switch was retired by to-do v2.
