# Add an agent v2 (design v15): report

Branch `add-agent-v2-15` @ `bc9297997` (pushed, not merged). It is also pushed as the dev line `dev/…-rar211-laqunk-aa215`. Ref: `design-refs/add-agent-v2/add-agent-v2.html`, sha256 `b88878cc…9e46`, verified before reading. Dev: **https://scriptally-dev.web.app now serves `index-DObz1PwS.js`**.

## 1. False premises

1. **"Do not run both" / "a new branch `add-agent-v2`".** The earlier Add an agent v2 prompt had already run that morning.
   - Its work is on branch `add-agent-v2` @ `6069fa2e9`: Quick actions, the six-step journey in Log a query's shell, every door repointed, locks QA1–QA4 and AB1–AB8.
   - That work was already merged into the dev line, and dev was serving it underneath Record a response v2.1.1 and Log a query Unknown.
   - v15 is a change set on top of that ref: 108 diff lines between the v14 and v15 html. So this run builds the v15 changes on top of that work instead of rebuilding it.
   - It is on a new branch, `add-agent-v2-15`, because `add-agent-v2` already exists on origin and I did not overwrite it.
2. **"The app's own date slider (the one Log a query uses for dates)."** Log a query has no date slider.
   - Its dates are Today / Yesterday / an inline calendar. Its only slider is `WeekSlider`, used for weeks.
   - The reopening question therefore uses `WeekSlider`: 1–52 weeks, labelled "Reopens", with "Not sure" as its unknown pill, ends "Next week" / "In a year", and a readout of the date and the weeks ("2 Feb 2027 · in 10 weeks"). This is also the slider the ref draws.
   - It saves `reopensOn` as a local `YYYY-MM-DD`, the form the card's own `DateField` saves.
3. **"Closed with a reopening date: no 'Reopening date' gap; Closed with Not sure: the big number is one lower."** This cannot hold without changing Housekeeping's gaps, which the brief says not to touch.
   - The card's rule is `isDoorClosed(a) && !ctx.hasReopenTask` (`agentGaps`, contactHousekeeping.ts:107). It clears the gap with a reopen reminder task, not with a date.
   - Measured (AB12): with a date the preview still shows the gap, and dated and Not sure both read 1 of 6.
   - The same is true of every existing card: a closed agent with a `reopensOn` still shows "+ Reopening date" in the Contact list.
   - The lock gates what can hold (the big number equals the ring in both cases, a date is saved, Not sure saves none) and records the brief's two readings as findings. See question 1.
4. **"It saves the same shape the app's sample picker saves… if that shape cannot hold a value this control allows, stop."**
   - The picker's `Sample` can hold a starting point. The agent record's `materialsWanted` token cannot: it has no "from" form.
   - So the typed control is built with its starting-point part behind a prop (`parts`), which is off in this journey. "Sarah asks for a different part" is not drawn, and "Any" never replaces "The first".
   - Any whole number does fit: storage (`MAT_QTY`) holds 1–9,999 pages, 1–999 chapters and 1–999,999 words. The 500-word floor is the picker's own create-mode rule (`CREATE_QTY`, via `problemsOf`). The journey no longer applies that floor, and "300 words" saves as the record's own token.
5. **"The To-do desk's genre field."** As the earlier run found, the To-do desk has none. The type-to-find genre field is the agent card's `GenreChips`.
6. **The `preview` prop on `AgentCard262` (Step 0 item 5).** It is enough to hide the pencils and the ⋯ menu.
   - It is not enough to draw the card from an unsaved agent: the host reads the agent from the store.
   - The earlier run uses the To-do desk's `PreviewAgentCard`, which can, plus one optional prop `withGaps`. That is unchanged here.

## 2. The dev line

- **Cut from** `dev/…-acv221-rar21-aa2-rar211-laqunk` @ `f3659638d`, which was serving `index-CoYsbCK9.js`. These are all on that line:
  - Log a query v2.3 (`laq23`)
  - Record a response v2 and v2.1 / v2.1.1 (`rar2`, `rar21`, `rar211`)
  - Agent card v2.2 and v2.2.1 (`acv22`, `acv221`)
  - Plumage colours v3 (`pc3`)
  - Log a query Unknown (`laqunk`)
  - the earlier Add an agent v2 (`aa2`)
- The red gates did not fire. The ref was found and its hash matched. Both journeys are on the line. No rules change was needed: `socials` and `reopensOn` are already in the agent create and update rules. No other session's uncommitted work was in my files.

## 3. Phases

| Phase | Commit | State and measurement |
|---|---|---|
| 0 ref pack | `987683361` | v15 html + its sum, with the earlier screens/01–21 byte-identical beside it |
| A1–A3 Quick actions | earlier run `9c6d983ff` / `dbf2c745d` | unchanged by v15; **re-measured on this line**: QA1 32/32, QA2 72/72, QA3 12/12, QA4 11/11 |
| B1, B2, B6, B7, B8 | earlier run `1b5a1a713`, `48629f3ca` | unchanged by v15; AB1 30/30, AB2 14/14, AB3+AB4 12/12, AB6 8/8 rerun green |
| B3 step 2: "i" notes, wishlist link | `55ebe0814` | landed (measured): AB10 23/23, AB11 3/3 |
| B3 step 3: typed sample | `55ebe0814` | landed (measured): AB9 13/13 |
| B4 step 4: reopening date | `55ebe0814` | landed (measured): AB12 19/19 (two readings are findings, not gates; see §1.3) |
| B5 count | `55ebe0814` | landed (measured): AB13 7/7, AB5+AB7+AB8 26/26 (AB7 now includes the link) |
| B9 locks | `bc9297997` | AB9–AB13 each red under `AAG_BREAK=ab9…ab13` (`ledger/*-break-*.json`), then green |

AB10 found a real fault in my first cut. The link's bubble was anchored to its "i", which sits far right of a long label, so the bubble ran past the panel's right edge. The bubble is now anchored to the label row.

## 4. The doors (unchanged from the earlier run)

| Door | Opens now |
|---|---|
| Quick actions → Add an agent (every page) | the journey, in place |
| Dashboard's "Add an agent" (header, Agents on file empty state, set-up card, getting-started rows) | the journey, in place |
| Contact list "+ Add an agent", slim bar, empty page, day-one "Add another agent" | the journey, in place |
| Search palette: a typed name, and the "Add an agent" action | the journey, the name carried |
| To-do "Starting" item for agents | the journey (source; not reached by the harness account) |
| Log a query's "Add a new agent" | the journey over Log a query, which steps back |
| The added agent's card, "Add another" | the journey |
| Phone (<768px) | unchanged: the old panel stays for the phone's LogJourney only |

## 5. Fields, the card's six, the picker

- **No home, left out:**
  - the sample's starting point (no "from" in `materialsWanted`);
  - the four suggested extras under "Something else": Author bio is stripped on write, and the other three have no token. The free-text field stays as the record's one Other material.
- **Already stored:**
  - synopsis length;
  - "Another way" (`submissionMethodOther`);
  - "Not sure" for open (Unknown door);
  - Elsewhere's country (ISO, via `CountryCombobox`);
  - any whole number for the sample;
  - the wishlist link (`socials`, MSWL; does not count towards the ring);
  - `reopensOn`.
- **The card's six** (`GAP_ORDER`, `agentGaps`), and `finishShare = (6 − n) / 6`:

  | Gap | Shows when |
  |---|---|
  | reply | no `responseTimeWeeks` (and not settled) |
  | materials | `agentDataQualityNeeds` includes materials |
  | genres | no genres |
  | wishlist | no `mswlNotes` |
  | reopen | door Closed and no reopen reminder task |
  | agency | `agencyNotKnown` |

  `finishItems` maps those keys to the "+ …" buttons.
- **Every place `SampleControl` (the existing picker) is drawn, all untouched:**
  - `LogJourney.tsx:426` and `:444`
  - `ResponseJourney.tsx:126`
  - `SentJourney.tsx:140`
  - `EditJourney.tsx:240`
  - `QcAsks167.tsx:47` (the query card)
  - `QcRespondStages.tsx:322` (Record a response)
  - `QcLogStages.tsx:701` (Log a query)

  The add journey no longer draws it. `SampleTyped` (`src/components/queryActions/SampleTyped.tsx`) stands beside it.

## 6. Ref copy the code does not do

- "Your rating ranks your Contact list by fit, best first". The Contact list can sort by fit, but not by default. The pop-up keeps the app's `FIT_TIP`.
- A Reopening date gap that clears with a date (§1.3).
- "Sarah asks for a different part" and the "Starting at page" line (§1.4).

## 7. Old tests

- None removed this run.
- `addAgentV2.measure.ts`:
  - AB7 now expects the link in `socials`, and `fillAll` types one;
  - `addAgentStages.test` gains AA2-U14 to U16;
  - `sampleTyped.test` is new.
- The earlier run's deletions and rewrites (add1*, addAgentV1, sidebarCapture*, contactV183 D1, cl251 B3, and others) stand as reported on branch `add-agent-v2`.

## 8. Baseline against final

| | Baseline (`f3659638d`) | Final (`bc9297997`) |
|---|---|---|
| tsc | 0 errors (needs `NODE_OPTIONS=--max-old-space-size=8192`; the default heap runs out of memory) | 0 errors |
| build | clean | clean |
| Vitest | 0 failed, 13,415 passed | 0 failed, 13,427 passed |

## 9. Dev

https://scriptally-dev.web.app, bundle `index-DObz1PwS.js`, built from a clean checkout of the pushed tip `bc9297997`. Before the deploy the command checked that dev still served `index-CoYsbCK9.js`; after it, the served hash matched the build. Hosting only.

## 10. For a ruling

1. **Should a reopening date clear the card's "Reopening date" gap?** Today only a reopen reminder task clears it, so a closed agent with a date still asks for one. I recommend changing `agentGaps` to `isDoorClosed(a) && !(a.reopensOn ?? "").trim() && !ctx.hasReopenTask`. It is a one-line change in Housekeeping, which was out of bounds here. AB12's two findings would then become gates.
2. **Move the other sample places to `SampleTyped`?** Log a query, Record a response and the query card's `Sample` can keep a starting point, so there `parts` could be on. I recommend Log a query first, as one brief that measures each place.
3. **Words under 500.** The card's own editor still refuses them (`CREATE_QTY` via `problemsOf`), while this journey now saves them. I recommend lowering the card's floor to 1 to match, since storage already holds it.
4. **Retire branch `add-agent-v2`?** Its commits are all on this line, and only its report commit was never merged. I recommend leaving it until this line merges to `main`.
