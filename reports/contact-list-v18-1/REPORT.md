# Contact list v18.1: "What to send" in Housekeeping, and the agent panel as the landing card

Built 15–16 Oct from the v18.1 pack. Branch `contact-list-v18-1` (worktree `../ScriptAlly-cl181`). References at `design-refs/contact-list-v18-1/`: all 14 SHA256s matched before anything was built, and they are enrolled (345 refs guarded).

## False premises

1. **"Base: the branch dev serves … at v18's report that was `dev/main-cl18`."** By the time this pack started, dev served **`dev/main-cl18-todo51`** (`index-DJYbAEwI.js`): the To-do list v5.1 integration, deployed earlier in this session. It is `dev/main-cl18` plus v5.1, so it contains v18. That is the base (`6fa20cdc`).
2. **"Ticking Covering letter … 'On the card:' is `summaryFromRows`."** The mock's preview reads "Covering letter · Synopsis · First 5 chapters". `summaryFromRows` reads "Covering letter · Synopsis · 2 pages · Opening sample (10 pages)": that is the agent card's own summary, and the prompt says the summary is that function's. The prompt wins.
3. **"The bar, where v16 draws one."** v16's `panelStand` never draws one: every branch returns `bar: null`. The slip has markup for a bar and draws none today.
4. **"The list names the gaps in Housekeeping's words and order ('reply time, genres, wishlist, what to send')."** Housekeeping's order for one agent is its run's order (most useful first), not a fixed list. The bare fixture agent reads "reply time, what to send, genres" (its wishlist put off with Later; see B4). The line uses the drawer's own items in the drawer's own order, so the line and the run always agree. The quoted order is sample data.
5. **"Queries and Notes tabs keep their v16 footers"**, while the mock draws the new Profile footer (On file since, ⋯, Edit profile) under Queries. The prompt wins: Queries keeps v16's footer (status, ⋯, Edit profile, the primary), and Notes keeps its composer.
6. **"Responses RS1."** No lock named RS1 exists. The Responses suite is `rs2.measure.ts`, which is what L1 ran.
7. **"CL18 F4, wherever it drives the materials question by clicking chips."** F4 drives the reply-time question. It never touched materials, so it needed no edit.
8. **"framed gains the same rule."** It does. Its only caller is the Housekeeping intro's static example agent ("Not yet queried"), so nothing visible changes.
9. **The mock draws the panel from the top of the window, over the shell's bar.** The prompt keeps the panel's position, so it still starts under the bar (v16 §A, measured from the bar's bottom edge).

## Base

- **Tip:** `6fa20cdc` on `dev/main-cl18-todo51`, the branch dev served (`index-DJYbAEwI.js`), which contains v18 (`e752fdde`).
  - v18 is present: the letter tabs at the top, the slate list header and the List health drawer.
- **Dev before:** `dev/main-cl18-todo51` (`index-DJYbAEwI.js`). **Dev after:** this session did not deploy (see the integration section).
- **Baseline gates (before any edit):** tsc 0; production build and `build:dev` clean; Vitest 591/591 files, 8,874 passed, 3 skipped.
  - One file needed `functions/node_modules` linked in the new worktree before it would load.

## §0 Recon

1. **How v18 mounts `MaterialsField`, and why it rendered unstyled.** `HousekeepingDrawer`'s focus field wraps it in `.hk8-field[data-gap="materials"]`. Its dress in `agentCard.css` is scoped to `:is(.ac, .hkv-fx)`, and `.hkv-fx` was the retired v13 Housekeeping's class, so nothing reached it. The tick buttons rendered **0 × 0** (measured on the base build: A1's base reading), which also made them unclickable. Confirmed.
2. **The save path.** `onHkFix` in `AgentList` turns the answer into a draft change (`{ mats }`), then calls `cardPatch` → `encodeMats` → `materialsWantedFromRows`. That is the agent card editor's own path, so the stored array is the same for the same rows (A2 compares them against the encoder).
3. **The panel's stand derivation** (`lib/agentPanel`, v16):
   - `panelStand` has eight states: send, offer, waiting, late, closed, fit, none and shut. Each carries a heading, a figure, a paragraph of runs (titles marked `em`) and a `bar` (always null).
   - `panelFoot`'s primary is Log a query (not queried), Mark partial/full/new version sent (a request), Record your answer (an offer) or Record a response (with the agent); for closed and closed-to-queries it is Edit profile.
   - v18 had removed the stand card from the Profile tab. v18.1 puts v16's derivation back, unchanged.
4. **Agent fields.**
   - `submissionMethod` is required: Email, Online Form, Query Manager or Post, shown in the editor's own words (`viaLabel`: "Email", "QueryManager", "Online form", "Post").
   - `noResponseMeansNo` is true, false or absent.
   - `responseTimeWeeks` is optional, and 0 is the quick-add stub.
   - `dateAdded` is a required ISO string.
   - **There is no submission-form URL field**: the record has `website`, `email` and `socials` (the MSWL link among them). So the head draws "Website" and "Copy email" only.
5. **Housekeeping's per-agent gaps.**
   - `hkModel(...).byAgent` holds one row per agent with a visible gap, its `items` in Housekeeping's order (the ones put off with Later are left out).
   - The drawer already runs over one agent: its By-agent "Fill in →" calls `startFocus(row.items.map(key), "{first}’s profile")`, with a counter reading "n of total".
   - v18.1 reuses that run through one new prop (`runAgent`).

## Calls I made

1. **`matsRows` (cardDraft).** The four rows that `encodeMats` already built inline are now exported, so the focus card's validator checks exactly what would be encoded. This is not a fork: `encodeMats` calls it.
2. **The refusal.** The steppers floor and cap the sample themselves, so the one refusal a writer can reach in this field is an empty Other. "Focusing Other ticks it" makes it reachable at once: the validator's own words, "Explain what 'Other' materials are requested.", show in rust, and Save stays disabled.
3. **Your move includes "late".** A query past its reply date (v16's `late` state: "{first} is late") takes the rust band and the "Your move" slip, as the prompt's "a reply that's due a nudge" says. Its button is the footer table's primary, Record a response.
4. **The chip's words** are the standing for the book in scope:
   - "Not yet queried" or "Closed to queries" with no query;
   - "Passed" for a pass;
   - otherwise the stage name ("Partial requested", "Full sent", "Offer", "Closed with no reply", …).
5. **Stars always show** (unfilled at 35% when unrated, as the mock draws), with the accessible name "Not rated".
6. **The MSWL link is no longer in the panel's head.** The prompt names Website and Copy email only. The link is still on the record and in Edit profile. Flagged for you below.
7. **Notes.** The thread scrolls itself and draws its composer at the foot (v16), so on Notes the head and tabs hold still and the thread fills the rest. On Profile and Queries the head, tabs and body scroll together.
8. **`GAP_DETAIL` moved** from the drawer into `lib/contactHousekeeping`, so the drawer's detail cards and the panel's gap line read one table.
9. **B5's capture** was taken from unmodified HEAD at the start of the run (`CL181_CAPTURE=1`): five agents, four with queries and one never queried, both tabs each.

## Locks — CL181 (`tests/e2e/contactV181.measure.ts`), 1512 × 900 and 1280 × 800 with the shell

**One consolidated run at `c3b80cc8`** (`build:dev`, `vite preview` on 127.0.0.1, one worker): **7 locks, 151 readings, 0 red**. B5 was re-run against a capture re-taken from unmodified HEAD that night (23:02Z), 17/17. Ledgers are in `ledger/`: `<lock>.json` green, `base-<lock>.json` red on base, `mut-<lock>.json` under the named mutation.

| Lock | Green | On the base build (`6fa20cdc`) | Named mutation → what went red |
|---|---|---|---|
| A1 field | 20/20 | 10/20. The ticks are **0 × 0** (unstyled), Opening sample is 70 tall unticked, the steppers 46, the unit segment transparent | drop the wrapper class (in page) → 10/20, the same five readings at both sizes |
| A2 save | 9/9 | 3/9. No refusal, no "On the card:", nothing saved (the ticks cannot be pressed), no Undo | write the summary string instead of the encoded rows (src) → 8/9: stored `["Covering letter · Synopsis · 2 pages · Opening sample (10 pages)"]` against `["Query letter","Synopsis (2 pages)","First 10 pages"]` |
| B1 shell | 56/56 | 0/8: no panel names whose move it is (`data-slip`), so no fixture kind is found | colour the band by status only (in page: a your-move band painted ink) → 54/56, "you: the band is rgb(162, 69, 42) — rgb(45, 58, 80)" at both sizes |
| B2 stand | 27/27 | 0/4 (as B1) | leave the primary in the footer as well (in page) → 24/27, "the Profile footer has no primary button — 1" for you, waiting and notq |
| B3 sections | 14/14 | 2/14 | restore the "+ Add" pills (in page) → 12/14, 5 pills at both sizes |
| B4 gaps | 8/8 | 3/8. No gap line, and no Fill in | count gaps from the agent's fields (src) → 6/8: "4 vs 3", "4 details missing — reply time, what to send, genres, wishlist" |
| B5 unchanged | 17/17 | 17/17 (base is what the capture was taken from, so green is right) | n/a |

- **The fixture for B3 and B4** is one bare agent (`clv181-bare`: a name and an agency), seeded and removed in the same run by `tests/e2e/seedCl181.mjs`.
  - B4 seeds it with its wishlist put off by Housekeeping's "Later" (`--later`), so Housekeeping lists three gaps while the agent's fields have four. That difference is what lets the field-count mutation fail. Without it, both counts were four and the mutation could have passed.
  - `--clean` removes the agent and the Later leaf.
- **A1, A2 and B4 first crashed on base rather than reddening:** an unstyled 0 × 0 tick, an absent button or an absent line made an unbounded click wait out the test's timeout. Every action in those three is now bounded, so base reads out as above. A1 gained a reading that the tick is drawn 22 × 22.
- **Unit locks:**
  - `agentPanel.test.ts`: the slip over v16's eight states (kind, band, chip, the stand object itself, and the footer table's primary or none) and On file since.
  - `contactHousekeeping.test.ts`: `agentGapLine` is the agent's visible items in Housekeeping's order and words; Later removes an item from the line; a complete agent has none.
  - +13 tests in all.
- **Gates by commit:**
  - **A** `31c6c885` and **B** `434dae7c`: tsc 0, production build and `build:dev` clean. Vitest 591/591 files, 8,874 passed (A), then 8,887 (B).
  - **B fix** `c3b80cc8` (the compact switch read as `data-wide`, not `body:has()`): the same, 8,887 passed.

**L1, no worse than base.** Eleven suites, on this branch and on base:

| Suite | This branch | Base |
|---|---|---|
| contactV18 | 14 passed, E1 skipped (retired) | 14 passed |
| contactV17, contactV171, qcV138, qcV1381, qcV1383, qcV1384, rs2, headerV3 | pass | pass |
| contactV16 | F4, G1 red, then green after re-pointing (3/3) | 10 passed, with the re-pointed cases |
| qcV1382 | C1 red; D1 red | C1 red; D1 green |

- **qcV1382 C1** ("your send-by date is today") is red on both builds, as it was on the To-do v5.1 base. It is pre-existing.
- **qcV1382 D1 is a frame-timing flake on both builds, not this pack.** I sampled the cards' animation `currentTime` at the lock's 100ms read four times on each build: 18, 0, 18, 0ms on this branch, and 0, 0, 0, 18ms on base. Whenever it reads 0 the lock is red. D1 read green on base three times running and red on this branch three times running before the sampling showed both alternate. The Query Centre is untouched by this pack.
- **Retired and re-pointed,** each with a note at the case: `tests/e2e/RETIRED-contact-list-v18-1.md`.
  - **CL18 E1** is retired.
  - **CL16 F6**'s status-line readings are retired.
  - **CL16 F5, F6, F4 and G1** are re-pointed: the slip's button, and the tab counts as chips.
  - **CL18 F4** needed nothing (it drives the reply question).

## Screens

Taken with `CL181_SHOTS=1` at `c3b80cc8`, on the harness account, in `reports/contact-list-v18-1/shots/`. Each is named after its reference in `design-refs/contact-list-v18-1/screens/`.

| Reference | Build |
|---|---|
| 01 send, empty @1512 · 04 @1280 | `01-send-empty-1512.png`, `04-send-empty-1280.png` |
| 02 send, ticked @1512 · 05 @1280 | `02-send-ticked-1512.png`, `05-send-ticked-1280.png` |
| 03 send, pages and Other @1512 | `03-send-pages-other-1512.png` (pages and synopsis; Other unticked) |
| 06 panel, your move @1512 · 12 @1280 | `06-panel-your-move-1512.png`, `12-panel-your-move-1280.png` |
| 07 panel, waiting @1512 | `07-panel-waiting-1512.png` |
| 08 panel, not queried @1512 · 13 @1280 | `08-panel-not-queried-1512.png`, `13-panel-not-queried-1280.png` |
| 09 panel, closed @1512 | `09-panel-closed-1512.png` |
| 10 panel, gaps @1512 | `10-panel-gaps-1512.png` |
| 11 panel, Queries @1512 | `11-panel-queries-1512.png` |

Also: `x-send-refusal-1512.png` (the validator's refusal), `x-panel-every-gap-1280.png` (an agent with every gap, at 1280) and `x-panel-notes-1512.png` (the Notes tab).

The deliberate differences from the references:
- the summary's words are `summaryFromRows`'s (false premise 2);
- the Queries tab keeps v16's footer (false premise 5);
- the panel starts under the bar (false premise 9);
- the harness agents' names, dates and counts are not the mock's sample data.

## Integration and dev

- **Not deployed by this session, by agreement.** The Contact list v18 session asked, on your behalf, that only one of us deploy tonight. It merges `contact-list-v18-1` into a new integration branch off `dev/main-cl18-todo51`, runs the gates, and deploys to dev from a clean worktree. The pack said to deploy; I followed the other session's plan so the two of us could not race on dev.
- **Dev before:** `dev/main-cl18-todo51` (`6fa20cdc`), bundle `index-DJYbAEwI.js`. `contact-list-v18-1` is built on that commit, so it contains everything dev serves.
- **Pushed:** `contact-list-v18-1` on origin. No merge to main. Prod, prod rules and functions are untouched (this pack changes no rules).

## For Nick

- **Fields still missing from the model, and what each would need:**
  - **"Not for them"** (an agent who doesn't take this book). There is no field for it.
    - **Type:** an optional boolean or reason on `Agent`.
    - **Rules:** `isValidAgent` plus the agent update allowlist (silently denied until then).
    - **Deploy:** dev rules (Claude) and prod rules (yours).
    - **Use:** a control in Edit profile, and somewhere to read it (the panel, the filter).
  - **A submission-form URL.** There is no field for one; the record has `website`, `email` and `socials`.
    - **Type:** an optional string (`submissionFormUrl`).
    - **Rules:** the same rules allowlist.
    - **Deploy:** the same dev and prod rules deploys.
    - **Use:** a field in Edit profile; the panel's head would then draw "Submission form" in place of "Copy email" (as the prompt allows).
- **Stand copy that reads oddly in the new slip:**
  - **"{first} is late"** (a query past its reply date) now sits under a rust **"Your move"** label. This page's own rule elsewhere avoids "late" as appraisal (the Query Centre says "past the expected date"). Under "Your move" it reads as a verdict on the agent rather than a prompt to the writer. v16's copy was kept as the prompt asked; "No reply yet" or "Past the reply date" would fit the label.
  - **"Not queried yet"** with "You haven't queried {first} with {title} yet." says the same thing twice.
  - **A closed query's** "You can query {first} again with your next book." holds up.
- **The MSWL link is gone from the panel's head** (the prompt names Website and Copy email only). It is still on the record and in Edit profile. Say if you want it back beside Website.
- **The "late" state's button** is Record a response (the footer table's), not a nudge. A "Nudge {first}" button would need a nudge door on the panel, which is out of this pack.
- **qcV1382 D1** is a timing flake on every build (sampled above); it will go red at random until its 100ms read has margin.
