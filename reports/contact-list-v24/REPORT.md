# Contact list v24 — report

25 Oct 2026. Branch `contact-list-v24` (pushed), integration `dev/hm31-pv4-qc1492-dh41-cl24` (pushed). **On dev, not merged to main.** Prod untouched; no rules or functions changed.

## False premises

1. **`CARDS_THREE_FROM` does not exist on the base.** The pack says to take three-across from the Query Centre's constant; it was deleted with the Query Centre's Cards view in v149. Its value was 1,100px of sheet (v142.1, commit ef0490e4). I recovered it as a Contact list constant (`lib/contactV24.ts`): three at 1512, two at 1280.
2. **"Closed = every query closed, or closed to queries."** The pack also says the sets come from `AgentFacts.stand`, and `stand` puts an unqueried agent who is closed to queries under **Not queried** (so does the mock: its "Closed to queries" rows sit under Not queried). I followed `stand`. Closed is an agent whose queries have all closed.
3. **The Query Centre's v149 bar is 52px tall, not the mock's 68.** I measured the real one on this build (52 tall, padding 0 14 0 20, chips 34 at radius 9) and built to that, as the pack's "the app wins" rule says.
4. **"The existing full-screen hook is unchanged" and the mock's folded sidebar disagree.** The hook folds the sidebar by default (the Query Centre's full screen does); the Contact list had opted out in v19 §A. I dropped the opt-out, so full screen folds the sidebar here too. The hook itself is unchanged.
5. **The base moved twice during the run.** I started on `dev/hm31-pv4-qc1492` at bccce8d7 (`index-DPSsooOm.js`). By the deploy, dev served `dev/hm31-pv4-qc1492-dh4` (desktop hero v4 on top of a re-ruled QC v149.2 inset). I deployed an integration branch on that; **about a minute later another session deployed `dev/hm31-pv4-qc1492-dh41` (hero v4.1) over it, without v24**. I cut a second integration branch from dh41, re-gated and redeployed. Both integration branches are pushed; dh41-cl24 is the one on dev.
6. **The Query Centre's header inset was re-ruled after this branch was cut** (24 while the sheet is under 1100px, else 32; previously "window ≤ 1440"). The Contact list's copy follows the new rule (commit 04de5451), so CL24-A1 holds on the integration branch.
7. **The harness account cannot show two of the additions.** No two agents share an agency, so **Also at {agency}** and **Hold off for now** never render there (E2 is held by its unit lock only; shots 05 and 10 could not be taken). No Your-move agent is nudge-due, so the rendered A3 cannot see a break that moves one (a unit case holds it).
8. **QC138.6 (nine cases) and HR1-8 are red on the base build too.** They are not v24's. QC138.6's Contact list half still names v18/v19 selectors that NB1 removed.

## Base

`dev/hm31-pv4-qc1492` at **bccce8d7**, serving `index-DPSsooOm.js`. It carried navy-bar-address-book-v1 (Contact list v23), Versions v2.2 and Query Centre v149.1 and v149.2. Reference: 26 files enrolled at `design-refs/contact-list-v24/`, every SHA256 matching.

## What changed, by part

| Part | Commit | Where |
|---|---|---|
| refs | 98610e2c | `design-refs/contact-list-v24/`, manifest |
| A · header | 1f7d2073 | `contact/ContactHeader24.tsx`, `contact/contactV24.css`, `lib/contactV24.ts`, `shared/PageAlertBanner.tsx` (new `lead` prop), `queries/centre/qcv149.css` (selectors widened to `:is(.qcv-group, .clv-group)`) |
| B · List and Cards | f52adb4a | `contact/ContactSheet24.tsx`, `lib/contactListMemory.ts` (`byStatus`) |
| C · agent card | f6f796d7 | `contact/AgentCard24.tsx`, `contact/AgentCardPanel24.tsx` |
| D · full screen | 9ed7bf15 | `contact/ContactAddressBook24.tsx`, `AgentCardWide24`, `contact/ContactFilters24.tsx`; `book/ContactBook.tsx` and its sheet deleted |
| E · additions | 0fc61a28 | `genreFit`, `colleaguesOf`, `src/lib/contactV24.test.ts` |
| F · guide, words | a6d8113c | `AgentList.tsx` (spotlights), `lib/pageChecklist.ts`, `content/help/articles.ts` |
| G · locks | 22ab074b | `tests/e2e/cl24.measure.ts`, `cl24Lib.ts`, `cl24.shots.measure.ts`, NB1 and HR1 re-points, CLAUDE.md |
| follow-ups | 04de5451, 98d29a9f | the inset ruling; the wide card names the book (below) |

**Recovered from git:**
- `CARDS_THREE_FROM = 1100` from ef0490e4 (value only).
- The Cards view's `AgentPaperCard` grid and its card wrapper pattern from `80ce4f3d^:src/components/agents/contact/ContactCards.tsx` (rebuilt in `ContactSheet24`).
- The History tab reads `lib/agentHistory` (still on the base); its rendering follows `80ce4f3d^:src/components/agents/panel/AgentHistory.tsx`, simplified.
- `ContactRows`, `ContactListHead` and `ContactGroupHeading` were not reused: the v24 table is a different grid. The peek, jump row and folder tabs were not brought back.

## Decisions made

- **The agent card wears the query card's own classes** (`qc149c`, `mk-lc-*`), so it shares qcv149card.css and heroCard.css instead of copying values. The Query Centre's card is untouched.
- **The card's action is the Query Centre's own next move (`nextDoor`)**, so both cards open the same journey for a query.
- **Remove** uses the existing cascade (`deleteAgent`) behind the quick view's own type-the-name gate (`canDestroy`), drawn inline in the card's footer. The quick view's confirm itself lives in the centred card, which this page no longer opens.
- **‹ ›** step through the list in the order it is drawn (grouped runs), not the sorted pool.
- **The book band** is a Contact list variant beside `QcBand140` (which is bound to the Query Centre's figures); it tightens when its sets would collide (measured), not only at ≤1440.
- **Full screen draws over the page sheet** (the shell's published edges, the bar's measured bottom), so the sidebar and the bar stay.
- **The header's "+ Add an agent"** keeps `data-cl17="add"` beside `data-cl24="add"`; full screen's rows keep NB1's `data-nb1` hooks (rows, ticks, selection, export), so NB1's surviving locks re-point cheaply.
- **The memory record** keeps `group` as written but no longer reads it (every pre-v24 record carries `group: "none"`); a new `byStatus` (absent = grouped) carries the grouping.
- **Facts on the card are across books** (Heard back, Last in touch, You and {first}), while the set is the active book's. After seeing this on dev (an agent queried only for another book read "No queries to Theo yet" beside "Heard back 1 of 1"), the wide card now says "Not queried for {book} yet." and lists the other books' queries (98d29a9f).
- **"Last in touch"'s "how"** is the latest query's send method ("by email"); with none, agentView's own "{span} ago".
- **Unknown reply time** shows agentView's "—" / "not known", not the mock's "+ Add".
- **E3 (rating) and E4 (pale selected row)** were drawn from Parts C and B/D; Part E's commit wires E1/E2 and adds the locks.

## Where the mock and the app disagreed (followed the app)

| Mock | App, as built and followed |
|---|---|
| Navy bar 68 tall, chips 34 on a 68 bar | The Query Centre's 52px bar |
| Group bands 52 tall | The Query Centre's 40px band heading |
| Submission form URL row with OPEN | No such field on an agent; the row says how they take queries (NB1's) |
| Card band colours (#f6e3da, #e9edf3 …) | The Query Centre's `CARD_TONE` (#f5e6df, #e2e6e0, #e4e1db); Not queried #f5f1ea / #6b5f52 |
| "Not for them", recent activity, compact rows, pinning Your move | Not built (baked decision 5) |
| Wide footer "Open in Query Centre · Remove" | Part C's links by set, with 30px ‹ › |
| Inset 32 at a 1440 window | Re-ruled on dev during the run: 24 under a 1100px sheet, else 32 |

## Strings changed (Part F)

- Checklist "Go full screen": "Turn the list into the whole page while you work." → "Turn the list into an address book while you work." (the Query Centre's checklist keeps its own line).
- Spotlight texts: pin → "Press Full screen, or F. The list becomes an address book; Exit full screen brings the page back."; open → "Click any agent. Their card opens on the right."
- Help Centre: find-an-agent (lede and body), go-full-screen (lede and body), open-an-agent (lede and body), edit-an-agent ("Edit profile at the foot of the panel" → "Edit agent at the foot of their card"), list-health ("Fill in the gaps in the List health banner … (or the ring in full screen's band)").
- No "Pin" / "Unpin" anywhere on the Contact list (F1 sweeps the rendered page's text and labels).

## Locks

All CL24 readings on the integration build that dev serves: **113 / 113 green** (A1 26, A2 10, A2-none 2, A3 16, B1 7, B2 10, B3 6, C1 12, C2 8, D1 8, D2 10, D3 4, F1 14). Unit: E1, E2 and A3's unit half, 16 cases green.

**Red first** (logs: `mutation-runs.txt`, `mutation-runs-code.txt`, `mutation-proofs-unit.md`, `ledger-base/`):

| Lock | Base build (bccce8d7) | Named mutation | Reading under mutation |
|---|---|---|---|
| A1 | red 0/14 | inset the header 40 | 18/26: card and banner left/right 40 out at both sizes |
| A2 | red (no header) | count agents twice (code) | k 102 > n 78 at both sizes |
| A2 (no gaps) | red 1/2 | — | — |
| A3 | red (timeout, no rows) | nudge-due counted as Querying (code) | **green on the page** (no nudge-due agent on the account); **red as a unit case** |
| B1 | red (timeout) | reset Find on switch (code) | find "" , rows 51→52 at both sizes |
| B2 | red (timeout) | all six columns at 1280 | "Replies in and Added hidden" red at 1280 |
| B3 | red (timeout) | auto-fill at 280 (and at 260) | 3 across at 1280 |
| C1 | red 0/2 | add a scrim | scrim opacity 1 at both sizes |
| C2 | red (no your-move card) | Record a response on Closed (code) | links "Record a response, Edit agent, Open query" at both sizes |
| D1 | red 0/8 | clip the art to the band (80px) | art bottom 191.8 < band bottom 197.8 |
| D2 | red (no book) | restore the navy column | selected row rgb(42, 58, 82) at both sizes |
| D3 | red (no book) | animate under reduced motion | 1 animation under reduced motion |
| E1 | — | case-sensitive match | `matches whatever the case` red |
| E2 | — | warn when this agent is live | `warns only when …` red |
| F1 | **green** (its claim held before v24) | hide the Full screen button | "pin: the spotlight finds its target" red |

**L1** (`l1-v24.txt`, `l1-base.txt`): NB1 L1–L3, L9, L10, L12 green; QC149 (all cases), QC149-L0, QC149.1, QC149.2 green; HR1 green with the Contact list retired from it. QC138.6 (A1–A5, B1–B3, C1) and HR1-8 red on v24 and equally red on the base build.

**Re-pointed or retired, a comment each:**
- NB1 L5 (one view), L6 (dock), L7 (count), L8 (avatars), L11 (full screen box) — **retired**: their subjects are gone.
- NB1 L9 (sections) — re-pointed to full screen's book (`book-section`, `alpha`).
- NB1 L10 (card) — rewritten for Notes on the panel card's Notes tab (persist across a reload; the original put back).
- NB1 L12 (kept functions) — re-pointed to full screen's book (ticks, selection, Export, the band's segments, the wide card's "+ Add email").
- `nb1Lib.openCl` also waits for v24 rows.
- HR1 — the Contact list's open hero is retired (as QC149 retired the Query Centre's): HR1-1 has no subject and the contacts/discover pair goes; HR1-3's floor 56 → 48.
- `pinList.test.ts` — re-pointed to the sheet's Full screen and the book's Exit full screen.
- `inkShell.test.ts` — the page-local header is `ContactHeader24`.
- `contactListMemory.test.ts` — `byStatus`.
- `pageChecklist.test.ts` — the new line.

## Shots

From dev (`index-nmR8INfB.js`), in `screens/`, named as the reference's without `@2x`:

| Reference | Ours |
|---|---|
| 01-top | 01-top-1512 / -1280 |
| 02-list-scrolled | 02-list-scrolled-* |
| 03-list-your-move | 03-list-your-move-* |
| 04-agent-card-your-move | 04-agent-card-your-move-* |
| 05-agent-card-same-agency | **not taken** — no shared agency on the account |
| 06-cards | 06-cards-* |
| 07-cards-agent-card | 07-cards-agent-card-* |
| 08-full-screen | 08-full-screen-* |
| 09-full-screen-not-queried | 09-full-screen-not-queried-* |
| 10-full-screen-same-agency | **not taken** — as 05 |
| 11-full-screen-querying | 11-full-screen-querying-* |
| 12-full-screen-closed | 12-full-screen-closed-* |

## Gates

Every commit: tsc clean, `build:dev` and the production build clean (no CSS warnings), Vitest at baseline (3 files / 1 test red, all in `functions/`, no `functions/node_modules` in the worktree). Part F's full run also showed three source-sweep tests timing out under load (load average 31); all 25 pass alone.

## Integration and deploy

- `dev/hm31-pv4-qc1492-dh4-cl24` (0dfb8042) — deployed as `index-BefXMuEN.js`, replaced a minute later by another session's dh41 deploy.
- **`dev/hm31-pv4-qc1492-dh41-cl24` (f858f907) — dev serves `index-nmR8INfB.js`**, confirmed by the served hash. Built from a clean checkout of the pushed tip.
- The tip will carry this report (report only, no redeploy).

## Worktrees

`../ScriptAlly-cl24` and `../ScriptAlly-cl24base` removed after the report commit; both preview servers stopped.

## For Nick in the morning

Things that looked wrong or unproven on dev that the locks don't cover:

1. **Also at {agency} and Hold off for now have never rendered** on any account I can see (no shared agency on the harness). Worth one look with two agents at the same agency.
2. **The not-queried call box still says "You haven't queried {first} yet."** when the agent is queried for another book (the pack's words). The wide card's empty state now names the book; the call box doesn't.
3. **Remove** (the delete) was not exercised on dev: it is destructive, and no lock clicks it.
4. **Many rows read "+ Add" under Replies in** on the harness account (no reply times stored), so the "About n weeks" cell and the reply rule were only seen in the unit model.
5. **In full screen, the selected row's disc shows the navy tick overlay while the pointer is on it** (the hover state of NB1's tick), so the initials disappear under the cursor after a click.
6. **On one List shot (03 at 1512) the Full screen label looks highlighted**, likely a text selection left by the shot script's clicks. Worth a glance.
7. **An Offer row (Tom Ellery) shows no Added date** (no `dateAdded` stored) and no deadline in "Decide on offer".
8. **QC138.6 and HR1-8 are red on the base too**; QC138.6's Contact list half needs re-pointing to v24 (it still names v18/v19 selectors).
