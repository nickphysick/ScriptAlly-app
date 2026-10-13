# Contact list v16: the list is the page, full screen, and an agent side panel

Branch `contact-list-v16`, in its own worktree, cut from the tip of `query-panel-v2`: **`bbf5d6b1`**.
Seven parts, one commit each (A to G), then one commit for the no-regression pass and this report. Not merged to
`main`.

## 1. False premises, and things for Nick to rule on

**Two things I stopped on and need an answer to.**

1. **An agent note cannot be pinned.** The brief's Notes tab pins a note. An agent note is `{ text, createdAt }`;
   the rules allow an update of `text` only; `Agent.pinnedNoteId` is on the type and is read for the list's preview,
   but nothing writes it and the rules do not allow it. §0.9 says to report and ask, not work round it, so the Notes
   tab ships with add, edit and delete and no Pin. Building Pin needs a new field and a rules change.
2. **"+ Add an agent" still opens the centred new-agent card.** Part G says nothing on `/agents` opens the centred
   agent card. The header's button, the empty state and `sa:contact-add` all add a NEW agent, and there is no agent
   to show in a panel yet, so they keep the card (the brief also says the header's handlers stay as built). Every
   door to an EXISTING agent on the page opens the panel. Say if the add should move into the panel too.

**Premises in the brief that the code does not match.**

3. **"Compact" is not "window at or under 1440".** Since Query Centre v137 the app's full and compact sizes follow
   the sheet's width (`.ws-app.sheet-wide`, sheet wider than 1440), not the window's. With the sidebar open the
   page is compact at both 1512 and 1280. The mock is full at 1512 because its sidebar is 240 where the app's is
   248. The lock table's "196 (compact)" disc agrees with the app. The locks assert the app's rule.
4. **The list is 1208 wide at 1512, not 1216.** Same cause: the app's sidebar is 8px wider than the mock's. The
   lock asserts "24 from the sheet's edges, at most 1600, centred", which is what the brief means.
5. **The base header already had no stamp and no faces.** Header v3 removed them; only a hidden counts sentence
   was left. Part A removed the number and that sentence.
6. **There were two status derivations.** The desk's Queried card took an agent's status from the latest
   `dateSent`; the list's column uses `contactStanding`. The strip uses the column's, so a cell and the rows it
   shows cannot disagree.
7. **The desk's "this month" was the browser's month, not London's.** The strip's weeks and its "this month" are
   London's.
8. **`QcStrip` cannot take cells as props** (it derives them inside), so `ContactStrip` is built beside it and
   wears its `.qcs-*` classes. A shared strip is a lift, listed in §8.
9. **The column headings already sorted** (v14). Part C removed the sort pill and added `aria-sort`.
10. **The list remembers per visit, not per user** (`sessionStorage`, key now `sa.contactList.v4`). Full screen is
    remembered per device (`localStorage["sa.contactFull"]`).
11. **The sidebar's collapsed state had no shared store.** Full screen holds it in its icon state through a new
    `holdSidebarCollapsed`, without writing the reader's own stored choice.
12. **The strip's faces are not doors.** They sit inside the cell's button and are `aria-hidden`, so "faces in the
    strip open the panel" (Part G) has no subject.
13. **An agent has no submission-form address**, so the masthead never draws "Submission form". It draws Website,
    Email and MSWL when the agent has them.
14. **"{first} is late"** is the brief's stand-card wording for a reply past its date. The house rule elsewhere
    forbids "late" and "overdue" for an agent. Built as the brief says; flagged.
15. **The send journey's eyebrow is "SENT WHAT THEY ASKED FOR"**, not the brief's "LOG THE SEND". The journeys'
    copy is on the do-not-touch list, so it stays as built.
16. **"Matches what {first} asks for" in Log a query is not built.** The journey has no such check and its fields
    and logic are on the do-not-touch list.

**Things I changed that the brief did not ask for, found by the older locks.**

17. **The header was 31px shorter while loading than loaded** (header panel v2's P6 caught it). The subline names
    the book, the book arrives after first paint, and the sentence then wraps to two lines. The subline now holds
    two lines always, and the book's name no longer inflates its line (Special Elite's metrics added 6px).
18. **With letter grouping on, a picked letter was not the marked one.** v16 lands a letter under the pinned
    headings, and the marker still read the old landing line. It reads the headings' bottom now; "All" holds its
    own meaning at the list's top.
19. **The page guide's steps 2 and 3 are renamed** "Add agents" and "The full list", and steps 1 to 3 have new
    words (the pack gave none). They are in §9 for Nick to edit.

## 2. Base and gates

Base tip `bbf5d6b1` (`query-panel-v2`). Baseline on it, before any edit: `tsc` 0 errors; `build:prod` and
`build:dev` exit 0; Vitest 8,616 passed, 3 skipped, one file failing to load (`functions/src/email.test.ts`).
The Query panel v2 locks on that tip: all green when run alone. Inside a full run V13 and V6–V8 went red, and
both were green re-run on their own (70/70 and 60/60): the shared harness account was in use by another session.

On the final build: `tsc` 0; both builds exit 0 with no warning beyond the chunk-size note; Vitest 8,650 passed,
3 skipped, the same one file failing to load. No worse than the baseline; 34 more tests.

## 3. §0 findings (carried on from)

- The page is `agents/AgentList.tsx` over `agents/contact/*`; the list is `shell/listTable`.
- The query panel's container is `shell/SidePanel` with the `.qsp` dress; `QueryDrawer` already portals a journey
  into a panel slot when the request carries `panel`. The agent panel reuses both. No journey or editor needed a
  rewrite: `AgentCardEditor` gained a `variant="panel"` (three tabs, the same fields and validation) and
  `openAgentCard(id, { host: "panel" })` portals it into the panel's act slot.
- The right-hand panel has one owner at a time (`claimRightPanel`); "agent" joined "query".
- Nothing in Part F needed a new write except Pin (item 1).

## 4. What was built

| Part | Commit | What |
|---|---|---|
| A | `3daa3cf1` | The navy title panel, "Every agent, in one place", the subline, two buttons, the disc. |
| B | `100b793e`, `fe7039cd` | The "At a glance" strip: four cells that filter, 20 London weeks, faces. (`fe7039cd` repairs a unit test's type: B was committed with `tsc` red.) |
| C | `2bf40eff` | Desk, next-step section, banner and title bar removed; "The full list"; the list breaks out to 24px from the sheet's edges; ungrouped A to Z by surname; headings sort. |
| D | `ebf844b8` | The bar, the filter row and the headings pin; "Summary"; the letter tabs never pin. |
| E | `9bae4e21` | Full screen (button and F), three count chips, Escape, scroll restored, remembered. |
| F | `a1466e7b` | The agent panel (`?agent=`): masthead, Profile, Queries, Notes, footer; actions step the same panel. |
| G | `2bf28215` | Tidy: the page guide re-pointed; the A to Z rail, the old header rules, the banner and four exports removed. |

Other doors to the centred agent card, kept: the Dashboard (`Dashboard.tsx`, `dashboard/v58/Dash58.tsx`), the query
panel's Agent tab ("Edit agent"), the editor's duplicate notice, and the new-agent card (item 2).

Kept in the tree and mounted nowhere: `ContactDesk`, `ContactNextStep`, `YourAgentsBar` and their CSS;
`lib/contactFaces` (still read by `contactDesk.test`).

## 5. Locks: red first, then green

Suite `tests/e2e/contactV16.measure.ts` with `cl16Lib`, at 1512 × 900 and 1280 × 800, one worker. "Base" is the same
lock run against the `bbf5d6b1` build (`CL16_BASE=1`); "mutation" is the lock run with its named break applied in
the page (`CL16_MUTATE=<lock>`). Ledgers are in `ledger/`.

| Lock | Green | Base (red) | Mutation (red), first failing reading |
|---|---|---|---|
| A1 header | 40/40 | 12/38 | a number element returned: "1 number, stamp or faces elements" |
| B1 strip | 64/64 | 0/4, no strip | cell 1 ≠ 2 + 3 + 4: "37 · 7 + 5 + 1" |
| B2 filter | 30/30 | 0/2 | the press scrolled: "140 → 1684" |
| C1 removed | 20/20 | 0/20 | a banner returned |
| C2 width | 16/16 | 0/3 | list 1159.3 where 1208.0 is wanted |
| C3 order and sort | 20/20 | 4/20 | "2 sort controls" in the bar |
| C4 letters | 14/14 | 2/6 | the letter did not travel: "scrollTop 0" |
| D1 pins | 30/30 | 0/2 | the letter tabs made sticky |
| D2 no jitter | 6/6 | 0/2 | "worst drift 24.0" |
| E1 full screen | 36/36 | 0/2 | scroll not restored: "900 → 0 → 0" |
| E2 full screen width | 8/8 | 0/2 | list 1208.0 where 1388.0 is wanted |
| F1 container | 28/28 | 0/2, no panel | a scrim while browsing |
| F2 masthead | 35/35 | no panel (F1) | the open edge is not #a9bf9f |
| F3 profile | 63/63 | no panel (F1) | the index card's margin line is gone |
| F4 tabs | 30/30 | 0/2 | "Open the query" left two panels |
| F5 acting | 73/73 | no panel (F1) | no dim within 250ms |
| F6 primary | 25/25 | no panel (F1) | the primary reads "Edit profile" for a not-queried agent |
| G1 nothing else | 20/20 | no panel (F1) | a centred card opened |

Unit: `contactGlance.test.ts` 11, `agentPanel.test.ts` 22.

**What the shared account could not show.** F2 saw open and closed doors and no "not known" door; the unit suite
holds that colour. F3 saw the stand states send, none, shut, late, waiting and closed; no agent had an open offer,
so "offer" is held by the unit suite. F6 saw six footer positions and no offer.

## 6. Retired and re-pointed locks

`tests/e2e/RETIRED-contact-list-v16.md` has the full table. By name:

- **Retired**: contactV15 CL15-3, 5, 5a, 5b, 6; contactV151 both CL15.1-B; contactV152 K5, K5–K7, K8, K9;
  contactV14 CL14-1, 3, 5, 6, 12; contactV13 CL13-10's agent-card half; contactV11 §11.6, §11.7 write half,
  §11.7's third leg, and the Log query case's second door; headerPanelV2 A1–A6, C1, D1–D8, D5, D6, D7; headerV3's
  H3 and H5 readings for `/agents`.
- **Re-pointed**: `cl13Lib.openContacts`; contactV11's default-band, lab, add, index strip and reply-note cases;
  CL13-12, 13, 14; CL14-7, 8, 9, 11, 15, 16; headerV3's route tables; headerPanelV2's floor; qcV137 E1's baseline
  for `/agents`.

**Two gaps the retirements leave**, both named in that file: no rendered lock now drives a SAVE of an agent's reply
window (the read-only half is re-pointed to the panel and green); and the dock chip's peek has no rendered lock,
since it was only ever proved on a card opened from an `/agents` row.

## 7. L1: no regression

One run of every suite on the final build, one worker, against the shared harness account.

| Suite | Result |
|---|---|
| contactV16 (CL16 A1 to G1) | 18 passed |
| contactV11, V13, V14, V15, V151, V152, V153 | 30 passed, 24 skipped (the retirements in §6 and those skipped before v16), 0 failed |
| qcV137 | all passed |
| queryPanelV1 | all passed |
| queryPanelV2 | all passed |
| feedDrawerV2 | all passed |
| headerPanelV2 | all passed (A, C and D cases retired, §6) |
| headerV3 | H8 red inside the full run; green on its own (below) |

Totals: first half 48 passed, 24 skipped; second half 44 passed, 8 skipped, 1 failed.

**The one red, headerV3 H8.** Inside the full run it read the Comparable titles and Submission packages headers
10px higher settled than first seen (top 134, then 124), at both widths. v16 touches neither page. Run on its own
straight after, on the same build, it passed; run on the base build it passed too. I could not reproduce it and
did not find the cause; it looks like run-order state, not a fault in the page, but that is unproved.

**Two things that went red during the pass and were not the build.** An earlier full run lost five query-panel
cases to Firebase's sign-in quota (`auth/quota-exceeded` from the seed scripts); all five passed in the final run.
An earlier CL16 run lost F5, F6 and G1 at 1280 while another session was using the same account; they passed
together when re-run.

## 8. Lifts noted, not done

- A shared "At a glance" strip for the Query Centre and the Contact list (`QcStrip` and `ContactStrip`).
- A shared pinned-controls hook (`useContactPins` beside the Query Centre's own; they share `PIN_AT` and
  `nextPinned` already).
- The agent panel's stand card and index card are page-local.

## 9. For Nick

**Stand-card clauses dropped for a missing fact.**

- "They're expecting it by {date}" is dropped when the query has no send-by date.
- The reply clause ("They usually reply in about N weeks") is dropped when the agency states no window.
- "fit" names the manuscript only when one is in scope.

**Profile rows blank for most agents on the harness account** (each shows a "+ Add" that opens Edit profile on
that field): the wishlist, for most agents; the reply time, for several; MSWL and website links, for nearly all.

**Copy that is this build's, not a pack's** (the page guide, `contactGuide.ts`):

1. "Your list in numbers": "How many agents you have on file, how many you've queried for this book, and how many
   of those queries are closed. Choose a card to filter the list."
2. "Add agents": "Add an agent you already know of, or find more in Discover."
3. "The full list": "Every agent on your list. Search, filter and group it your way, sort it from its column
   headings, or jump by letter. Click an agent to open them."

## 10. Shots

In `shots/`, each beside the `design-refs/contact-list-v16/screens/` file of the same number.

## 11. Deploy: STOPPED, not deployed

Dev serves `dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2-comps27-qp2b-comps27-1-qp2c-corkboard1` at `b2e1a737`
(bundle `index-rhbmgLAi.js`), checked 13 Oct. I made the integration branch `…-corkboard1-cl16` off it (worktree
`~/ScriptAlly-cl16int`) and merged `contact-list-v16`. The merge conflicts in four files. Two are the allowed ones
(`CLAUDE.md`, `design-refs/.refhashes.json`). Two are not, so the merge is aborted and nothing is deployed:

1. **`src/components/shell/useSidebarCollapsed.ts`.** Comparable titles v25 (on dev, not on `query-panel-v2`)
   already built a sidebar hold, `shell/sidebarForce.ts`, and a shared `shell/useFullScreenList.ts` whose header
   says "Shared, so the Contact list can adopt it". v16's Part E built the same thing a second time
   (`holdSidebarCollapsed` inside `useSidebarCollapsed`, and the full-screen state in `AgentList`). The two differ:
   the shared hook keeps full screen in the URL (`?full=1`, Back leaves it) and leaves on Escape at its own
   `ESC_LEVEL.pageMode`; v16's keeps it in `localStorage["sa.contactFull"]` only.
2. **`tests/e2e/headerV3.measure.ts`.** Both sides edited the NUMBER and TITLE route tables (dev moved
   `/manuscripts/comps` to TITLE and renamed the Noteboard route to `/todo/corkboard`; v16 moved `/agents` to
   TITLE). The resolution is mechanical: take dev's tables and move `/agents`.

**The question for Nick:** on the integration branch, should the Contact list drop its own full-screen code and
adopt `useFullScreenList` and `sidebarForce` (one implementation; full screen gains `?full=1`; CL16 E1 and E2
need re-proving), or should the integration keep v16's as built beside the shared hook? I recommend adopting the
shared hook. Either way the deploy waits for the answer.

`contact-list-v16` is pushed at its tip. The integration branch exists locally, unmerged and clean.
