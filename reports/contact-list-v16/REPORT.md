# Contact list v16: the list is the page, full screen, and an agent side panel

Branch `contact-list-v16`, in its own worktree, cut from the tip of `query-panel-v2`: **`bbf5d6b1`**.
Seven parts, one commit each (A to G), then one commit for the no-regression pass and this report. Not merged to
`main`.

## 1. False premises, and things for Nick to rule on

**Ruled on 13 Oct, and built as ruled.**

1. **An agent note cannot be pinned, and v16 ships without Pin.** An agent note is `{ text, createdAt }`; the rules
   allow an update of `text` only; nothing writes `Agent.pinnedNoteId`. The Notes tab has add, edit and delete.
   Pinning needs a pinned field and a rules change (a prod deploy), as its own pack. CLAUDE.md says so.
2. **"+ Add an agent" stays on the centred new-agent card for this run.** The header's button, the empty state and
   `sa:contact-add` add a NEW agent through the card. Every door to an EXISTING agent on the page opens the panel.
   Moving add into the panel is its own pack. **Open.**
3. **Full screen is the shared hook.** On the integration branch the Contact list calls `shell/useFullScreenList`
   (Comparable titles v25's, with its `sidebarForce` hold); v16's own state, hold, scroll restore and its
   `sa.contactFull` key are deleted. See §11.

**A false premise in the F7 ruling: there is no fan-out to skip.** The ruling asks for F7 to go red under "skip the
fan-out". The query's reply-by date is not stored. `responseDeadline` is retired: nothing writes it when a query is
created, a one-time migration in `db.tsx` deletes it on every load, and the date a reader sees is the last send
plus the agent's reply time, worked out when it is read. `computeAgentDeadlineWrites` only recomputes a date that
is already stored, so on any current data it writes nothing. I ran F7 with the fan-out skipped and it stayed
green, 12 of 12 (`ledger/mut-F7-fanout-F7.json`). F7's real red is the save not carrying the reply time
(`ledger/mut-F7-nosave-F7.json`, 9 of 12). The fan-out and `agentCardSnapshot`'s query half look like dead weight
now; I left them alone.

**"Responses RS1" does not exist in this repository.** No file, branch or commit names it (searched `tests`, `src`,
`reports`, every remote branch and the log). I could not run it. If it lives on a branch that is not pushed, tell
me which.

**Premises in the brief that the code does not match.**

4. **"Compact" is not "window at or under 1440".** Since Query Centre v137 the app's full and compact sizes follow
   the sheet's width (`.ws-app.sheet-wide`, sheet wider than 1440), not the window's. With the sidebar open the
   page is compact at both 1512 and 1280. The mock is full at 1512 because its sidebar is 240 where the app's is
   248. The lock table's "196 (compact)" disc agrees with the app. The locks assert the app's rule.
5. **The list is 1208 wide at 1512, not 1216.** Same cause: the app's sidebar is 8px wider than the mock's. The
   lock asserts "24 from the sheet's edges, at most 1600, centred", which is what the brief means.
6. **The base header already had no stamp and no faces.** Header v3 removed them; only a hidden counts sentence
   was left. Part A removed the number and that sentence.
7. **There were two status derivations.** The desk's Queried card took an agent's status from the latest
   `dateSent`; the list's column uses `contactStanding`. The strip uses the column's, so a cell and the rows it
   shows cannot disagree.
8. **The desk's "this month" was the browser's month, not London's.** The strip's weeks and its "this month" are
   London's.
9. **`QcStrip` cannot take cells as props** (it derives them inside), so `ContactStrip` is built beside it and
   wears its `.qcs-*` classes. A shared strip is a lift, listed in §8.
10. **The column headings already sorted** (v14). Part C removed the sort pill and added `aria-sort`.
11. **The list remembers per visit, not per user** (`sessionStorage`, key now `sa.contactList.v4`). Full screen is
    the shared hook's `?full=1` on the integration branch (§11).
12. **The sidebar's collapsed state had no shared store.** Full screen holds it in its icon state through a new
    `holdSidebarCollapsed`, without writing the reader's own stored choice. (On the integration branch this is Comparable titles' `sidebarForce`, §11.)
13. **The strip's faces are not doors.** They sit inside the cell's button and are `aria-hidden`, so "faces in the
    strip open the panel" (Part G) has no subject.
14. **An agent has no submission-form address**, so the masthead never draws "Submission form". It draws Website,
    Email and MSWL when the agent has them.
15. **"{first} is late"** is the brief's stand-card wording for a reply past its date. The house rule elsewhere
    forbids "late" and "overdue" for an agent. Built as the brief says; flagged.
16. **The send journey's eyebrow is "SENT WHAT THEY ASKED FOR"**, not the brief's "LOG THE SEND". The journeys'
    copy is on the do-not-touch list, so it stays as built.
17. **"Matches what {first} asks for" in Log a query is not built.** The journey has no such check and its fields
    and logic are on the do-not-touch list.

**Things I changed that the brief did not ask for, found by the older locks.**

18. **The header was 31px shorter while loading than loaded** (header panel v2's P6 caught it). The subline names
    the book, the book arrives after first paint, and the sentence then wraps to two lines. The subline now holds
    two lines always, and the book's name no longer inflates its line (Special Elite's metrics added 6px).
19. **With letter grouping on, a picked letter was not the marked one.** v16 lands a letter under the pinned
    headings, and the marker still read the old landing line. It reads the headings' bottom now; "All" holds its
    own meaning at the list's top.
20. **The page guide's steps 2 and 3 are renamed** "Add agents" and "The full list", and steps 1 to 3 have new
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
| F7 reply window | 12/12 | no panel (F1) | the save drops the reply time: 9/12, "6 → 6", the row still "Reply by 10 Nov" where 17 Nov was previewed |

Unit: `contactGlance.test.ts` 11, `agentPanel.test.ts` 22.

**F7** seeds its own test agent ("Zelda Fanout") with one open query, changes the reply time from six weeks to seven
through the panel's Edit profile, and reads: the editor's preview (10 Nov → 17 Nov on the day it ran), the agent's
reply time in Firestore, the row's "Reply by" line, and the stand card's figure (28 days to go → 35). It then presses
the save's own Undo (the list's notice) and reads all three back. Both test documents are deleted in `finally`.

**E1 and E2 were re-proved on the shared hook** (integration branch): E1 36/36 and E2 8/8 green; E1 red under its
mutation ("900 → 0 → 0", the scroll not restored) and E2 red under its ("list 1208.0 · want 1388.0"). E1 reads
`?full=1` where it read the old localStorage key; everything else it asserts is unchanged.

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

## 11. The integration branch and the deploy

**Not deployed.** The header no-jump lock failed in two of the three ruled runs, and the ruling is not to deploy
over a red.

**The branch.** Dev moved between my first report and the ruling: on 13 Oct it served
`dev/…-qp2c-corkboard1-qp2d` (bundle `index-B4cESNDW.js`), which contains `b2e1a737` plus Query panel v2's fourth
pass. Cutting from `b2e1a737` as ruled would have taken that pass off dev, so the integration branch is cut from the
`-qp2d` tip, `11877de6`: **`dev/query-panel-v1-onb9-tip-onb9-comps26-1-qp2-comps27-qp2b-comps27-1-qp2c-corkboard1-qp2d-cl16`**,
worktree `~/ScriptAlly-cl16int`. Its dev build is `index-wq0THQO_.js`.

**The merge.** Four conflicts, resolved as ruled: `useSidebarCollapsed.ts` is dev's (the `sidebarForce` hold);
`headerV3.measure.ts` has both sides' route tables; `CLAUDE.md` and `.refhashes.json` have both sides. In the same
commit the Contact list drops its own full-screen state, sidebar hold and scroll restore and calls
`useFullScreenList`. The state is `?full=1`. The hook also needs a device key (it puts `?full=1` back on arrival);
this page's is `sa.contactsFull`, as Comparable titles' is `sa.compsFull`. v16's `sa.contactFull` is gone.
One side effect: with a row held by the keyboard, Escape now leaves full screen first (the hook's layer takes the
key); before, it let go of the row first.

**Gates on the integration branch.** `tsc` 0; both builds exit 0, no warning beyond the chunk-size note; Vitest
8,759 passed, 3 skipped, the same one file failing to load (`functions/src/email.test.ts`).

**Locks on the integration build.**

| Suite | Result |
|---|---|
| contactV16 (A1 to G1 and F7) | 19 passed |
| compsV25 (its full-screen locks included), V26, V27, V271 | all passed (58 with contactV16, 0 failed) |
| qcV137 | all passed |
| contactV11, V13, V14 | all passed |
| queryPanelV2 | V4–V5 and V13 red inside the run; both green alone straight after (540/540 and 98/98). V4–V5 could not find its seeded row; V13 timed out on a click. Both read a fixture another session shares. |
| Responses RS1 | not run: it is not in this repository (§1) |
| headerV3 H8, three runs | pass, **fail, fail** |

**The header no-jump failures.**

| Run | Route | Width | First seen | Settled | Jump |
|---|---|---|---|---|---|
| 2 | `/manuscripts/packages` | 1280 | top 134, 942 × 260, loading | top 124, 942 × 260 | 10px up |
| 3 | `/manuscripts/packages` | 1512 | top 134, 1159 × 260, loading | top 124, 1159 × 260 | 10px up |

The header keeps its size and moves up 10px. At the first reading the page header carried `data-loading` (the
Packages page's own load state; the only loading element in the sheet), the shell's bar was 64 tall at 41.75 and
the sheet's top was 105.75, with no font still loading. The same lock on the earlier v16-only build failed once
the same way, on Packages and Comparable titles.

What I could not establish is the cause:
- I added readings to a copy of the lock (what is scrolled, the shell above the header, focus, fonts) and ran it
  nine more times on the same build. It passed all nine, so nothing was captured at a failure.
- Visiting the page directly, in the lock's order and with its motion freeze, the header stayed at 134 on all 34
  visits, for ten seconds each.
- On dev's branch without v16 (`11877de6`, built fresh) the lock passed three times out of three.

So on builds with v16 it is 3 failures in 13 runs, and on builds without it 0 in 4. That leans towards v16 but
does not show it: v16 does not touch the Packages page, and the failures came close together in time (two in
consecutive runs, straight after a 30-minute run on the shared account). Nothing on the Packages page scrolls or
takes focus on load. I have not found a mechanism, and I am not treating it as noise.

**To deploy**, from a clean checkout of the integration branch:
`npm run build:dev && firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`,
after re-checking what dev serves.
