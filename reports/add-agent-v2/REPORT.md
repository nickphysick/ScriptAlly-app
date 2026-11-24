# Add an agent v2 — report

Branch `add-agent-v2` (not merged). Ref `design-refs/add-agent-v2/` (`add-agent-v2.html` sha256 `ee5f10b8…1189`, all 23 checksums verified). Dev: **https://scriptally-dev.web.app serves `index-DGzm90Vh.js`**, from `dev/…-acv22-rar2-acv221-rar21-aa2` @ `57a574fc1`.

## 1. False premises

1. **"N of 9 details, counted the way the card's own profile ring counts them."** The card's ring counts **six** details: `finishShare` over Housekeeping's `agentGaps` (reply time, materials, genres, wishlist, reopen when closed, agency). "Of 9" exists only in the mock. The review shows **"N of 6"**, the card's own count, and the added screen's "N details still to add" uses the same gaps. So the B9 lock reads "6 of 6, no Finish block" and "2 of 6" for a name and agency only, not "9 of 9" and "1 of 9".
2. **The ref's Agent fit "i": "Your rating ranks your Contact list by fit, best first."** The Contact list *can* sort by Agent fit, but only when the writer picks that sort. It is not the default, and it is not remembered across reloads (`rating` is not in `HEADING_SORTS`). The pop-up uses the app's own wording (`FIT_TIP`): "…your Contact list and query suggestions put your best fits first."
3. **"The app's existing type-to-find genre field (the one the To-do desk uses)."** The To-do desk has no genre field. The type-to-find genre field is the agent card's own (`GenreChips`, agentPills), so that is the one used.
4. **The agent card cannot be drawn from an unsaved agent by `PreviewHostCard`.** It reads the agent from the store by id. The To-do desk's `PreviewAgentCard` can, and is used. It gains one optional prop, `withGaps`, which adds the card's own Finish block and its add-journey face (`preview`: no pencil, no ⋯).
5. **"If v2.1 is not on the dev line yet."** It was not when the work started, and it was by the time of the deploy. See section 10, question 3.

## 2. The dev line

- **Cut from** `dev/…-sb1-laq23-acv22-rar2` @ `57ba47c65` (`index-N01SII2_.js`). On it: Log a query v2.3, Record a response v2, Agent card v2.2 and Plumage colours v3, each missing only its report commit. Record a response v2.1 was not on it.
- **At deploy time** dev served `index-aKhG_Q-p.js` from `dev/…-rar2-acv221-rar21` @ `11c168069`, which carries Agent card v2.2.1 and Record a response v2.1. `add-agent-v2` was merged into it as `dev/…-rar21-aa2`; the merge was clean.
- **One fix on the merged line:** `weekSliderLaq` W3 (from Record a response v2.1) names `qcAddAgent.css` as a second place allowed to set `--sm`. The add journey's slider is slate by its brief, and Log a query's stays navy. The scan's pattern is unchanged.

## 3. Phases

| Phase | Commit | State and measurement |
|---|---|---|
| 0 ref pack | `e12cd6f16` | committed, hashes verified |
| A1–A2 Quick actions | `9c6d983ff` | landed (measured): QA1 32/32, QA2 72/72, QA3 12/12, QA4 11/11 |
| A3 locks | `dbf2c745d` | every lock red under its own break (`ledger/QA*-break-*.json`), then green |
| B1–B8 the journey | `1b5a1a713`, fixes `48629f3ca` | landed (measured): AB1 30/30, AB2 14/14, AB3+AB4 12/12, AB5+AB7+AB8 25/25, AB6 8/8 |
| B9 locks | `dbf2c745d` | AB1, AB2, AB3, AB5, AB6, AB7, AB8 red under their breaks; AB4 red under a source mutation (`canGo` without the duplicate test), run and undone in the worktree (`ledger/AB4-mutation-canGo.json`) |

Shots of every state, 01–22, plus the review at 1280 and 1512: `shots/` (`addAgentV2.shots.measure.ts`).

**QA1 found a real fault.** On a page with a guide, the guide pill (the bar's page slot) sat between Quick actions and Help, and pushed the button 220px left. The slot now sits left of Search, still 10px off. Search, Quick actions and Help now hold one place on every page.

## 4. The doors

Every desktop door goes through `openNewAgentCard`, which hands off to the new journey (`openAddAgent`) whenever the desktop host is listening.

| Door | Opens now |
|---|---|
| Quick actions → Add an agent (every page) | the journey, in place (QA2, AB1) |
| Dashboard's "Add an agent" (header, Agents on file's empty state, set-up card, getting-started rows) | the journey, in place (AB1) |
| Contact list "+ Add an agent", slim bar, empty page (both buttons), day-one "Add another agent" | the journey, in place (AB1: header) |
| Search palette: a typed name (`newAgent`, the name carried) and the "Add an agent" action | the journey, in place (AB1: typed name) |
| To-do "Starting" item for agents (route `agents / Add an agent`) | the journey, through App's interception (source; not reached by the harness account) |
| Log a query's "Add a new agent" | the journey over Log a query, which steps back (AB6) |
| The added agent's card, "Add another" (AgentCardHost) | the journey |
| The phone (<768px): AgentsV3, QuickLogV4, LogJourney | unchanged: no listener below 768px |

The old desktop panel (`AgentPanelNew` + `AddAgentJourney`) is now reached only from the phone's LogJourney, so its files stay.

## 5. Fields with no home, left out

- **The sample's "a specific section":** `materialsWanted` has no "from" form. The sample control is the app's own `SampleControl` with `openingOnly`.
- **The four suggested extras under "Something else"** (Author bio, Series outline, Comp titles, Chapter outline): Author bio is stripped on write, and the other three have no token. "Something else" keeps its free-text field, which is the record's one Other material (40 characters).
- **Already stored:** synopsis length ("Synopsis (1 pages)"), "Another way" (`submissionMethodOther`), "Not sure" (door Unknown), Elsewhere's country (the app's `CountryCombobox`, ISO), weeks, no-response-means-no, and fit.

## 6. Copy in the ref the code does not do

- "ranks your Contact list by fit, best first" (section 1, item 2).
- "N of 9" (section 1, item 1).
- **"Takes queries: By email" on a card the writer gave no method.** The save is unchanged: `agentFromDraft` writes Email when no method is chosen, as every add has since v1. The card then shows it. Not changed, because the record must equal the old journey's.

## 7. Old tests

- **Deleted, subject gone:**
  - files `add1.measure.ts`, `add1Shots.measure.ts`, `add1Admin.ts`, `addAgentV1.measure.ts` (they went in `48629f3ca`, whose message does not say so; `dbf2c745d` records it), `sidebarCapture.measure.ts`, `sidebarCapture.test.tsx`;
  - cases contactV183 D1, clp1 CLP7, clp1Shots "the add and Agent fit feedback", laqV2 V2-2, cl251 B3.
- **Rewritten:**
  - inkShell INK8 (the new menu), shellMenus MS1 (6px below, right edges together, 344 wide); the capture menu leaves MS4/MS6;
  - acv22 AC14 (now the new review);
  - `logStagesV2.test` (the host hands off);
  - contactV183 F1's pill check (left of Search). **F1 cannot reach that check**: its harness waits for `.clv-row`, a list layout that no longer exists, and it fails at that point. QA1 now holds the pill's place.
- **Repointed selectors** (split button → `[data-shell=quick-btn]`, `[data-quick=…]`): recordResponse2 (+shots), queryPanelV2 (+shots), helpSystemV1, cl25 shots, cl251 (+shots), msShots, qaV11, inkLib, inkFixups, shellTabsV2, shellTabsV21. These were not rerun.
- **Already broken, not touched:** a whole-suite `--list` fails on `cl255.shots.measure.ts`, which parses its data script's output as JSON.

## 8. Baseline against final

| | Baseline (`e12cd6f16`, clean checkout) | Final (`dbf2c745d`) | Merged dev line (`57a574fc1`) |
|---|---|---|---|
| tsc | 0 errors | 0 errors | 0 errors |
| build | clean | clean | clean (`build:dev`) |
| Vitest | 2 failed (statusMarksV3Sources SM3-8, stageColours) | 0 failed, 13,382 passed | 0 failed after the W3 fix |

The two baseline reds pass now. I did not trace which deleted file had tripped them.

## 9. Dev

https://scriptally-dev.web.app, bundle `index-DGzm90Vh.js`. Before the deploy, dev was checked to still serve `index-aKhG_Q-p.js`; after it, the served hash was checked against the build. Hosting only.

## 10. For a ruling

1. **"Of 6" or "of 9"?** I recommend 6, the card's own count, until the card counts nine.
2. **The guide pill now sits left of Search** (Contact list v18.3 put it by the "?"). I recommend keeping it there, since the brief's "Search, Quick actions and Help keep their positions" can't hold otherwise.
3. **An agent already on the list:** its card opens over the journey, which steps back (`body.aag-behind`). Record a response v2.1 does the same for the *query* card by lending the right-hand panel (`queryPanelStore`). The agent card has its own host, so this uses its own step-back. Should the two share one mechanism? I recommend yes, in a follow-up that gives the agent card the same lend.
4. **From inside Log a query,** the added agent is chosen as a pick from the list is, so Log a query moves on to "When did it go to {First}?". The brief says "on the step the writer left": staying on "Who did you query?" would show no sign the agent is chosen and leave no way forward but picking them again. I recommend keeping it as built.
5. **An agent added from inside Log a query stays on the list if that query is then discarded** (the old inline add removed it). It now has its own "is on your list" screen. I recommend keeping it.
6. **The Contact list's own aftermath of an add** (row ringed, "added" snackbar with Undo) no longer runs: the new journey's added screen replaces it. I recommend either accepting that or adding an Undo to the added screen.
7. **Lost with the inline add:** Log a query's old "Finish {name}'s card" task. The card's own Finish block covers it. I recommend accepting that.
