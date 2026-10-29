# Dashboard empty states: capture and audit (desktop, ≥768px)

Read-only. No code changed, nothing deployed. The only files this pass wrote are under
`reports/dashboard-empty-audit/`.

## 0. Base, method, accounts

- **What dev serves:** `index-DRG_02T1.js`. That is a build of **`dev/pk391-qm1` at `07cec344`**
  ("Merge remote-tracking branch 'origin/queries-mobile-v1' into dev/pk391-qm1"). Rebuilding that
  head with `npm run build:dev` gives the same hash. It contains Dashboard v118.1 (`636efadd` is an ancestor).
  This branch, `dashboard-empty-audit`, starts at that head and adds this folder only.
- **Every shot is of the deployed dev site** (`https://scriptally-dev.web.app/dashboard`), signed in
  as a fresh test account, in Chromium driven by Playwright. Each shot was taken after the page's
  `data-loading="0"`, `document.fonts.ready` and a 2.6s wait, which covers the 1.4s first-paint
  choreography (`PAINT_MS`).
- **Above the fold and full page are the same picture.** At 1280×800, 1512×900 and 1920×1080, in every state, nothing
  on the dashboard scrolls: no ancestor of `.d58` overflows. So each `*-fold.png` is also the full page.
- **Mid-load shots** hold the loading state with the dev-only `__SA_DASH_HOLD_MS` and shoot 3.5s in.
- **Every state was reached through the app's own flows:** the sign-up form, onboarding, the
  "+ Add an agent" panel, the Log a query drawer, the Record a response drawer and the Query Centre's
  Close journey. Nothing was written to Firestore by hand. Two flows could not reach what was asked
  (see §1 S5).
- **Onboarding** was answered the same way on every account: "Just getting started", title "The
  Lantern Keepers", "Ready to query", Fantasy, Adult, 92,000 words.

### Test accounts (all on dev, all kept, all labelled)

Every account's display name starts **"Audit "** and every email starts **`emptyaudit-`** at
`example.com`. None was deleted: deleting is a permanent act, and they may be useful for the
follow-up pack. Delete them when you're done. No password appears anywhere in this report or in the readings.

| Account (display name) | Used for |
|---|---|
| Audit S1 | S1 → S2 → S3 (the same account, grown) |
| Audit S1FRESH | the true first dashboard load, before the page has any shape memory |
| Audit S4 | S4 |
| Audit S5 | **S5x**: a query left stuck by a refused write (see S5) |
| Audit S5B | S5 |
| Audit S6 | S6a, then S6b |

### The non-founding founding card

There is no separate "non-founding" card. `Dash105Founding` renders for every signed-in account,
and a writer with no waitlist place simply gets no number. **None of these test accounts is a
founding member**, so every shot shows a non-founding writer's card, still headed "FOUNDING WRITER".

---

## 1. The states

Shot names are `reports/dashboard-empty-audit/shots/<state>-<width>-<what>.png`. `fold` is the page;
`feed`, `wherestart`, `hover-*`, `task-N` and `click-*` are interactions at 1512. Raw slot readings, including
text and child components, are in `readings/<state>.json`; interaction readings are in `readings/<state>-interact.json`.

### S1 — brand new: one manuscript, 0 agents, 0 queries
Shots: `s1-1512-fold`, `s1-1280-fold`, `s1-1920-fold`, `s1-1512-midload`, `s1-1512-firstload`
(+`-after`), `s1-1512-wherestart`, `s1-1512-wherestart-answer`, `s1-1512-feed`.

**Slots**
- `.d58[data-mode="pre"]`
- **Header:** `Dash58Header` with `WhereStart` in the action slot (the only header button).
- **Left:** `QueriesDoor` (`data-d60=queries-door`) and `AgentsDoor` (`data-d60=agents-door`).
- **Right:** `Dash71Right` in `data-mode="pre"`: `Dash60Lift` ("Ready for lift off?", four tiles), the `d59-rule` hairline, then `Dash105Founding` (tier 0, idle).
- **Feed tab:** "Activity feed" with a badge of 1.
- **Hawk shadow:** shown (`d59-hawkshadow`, behind both columns).
- **Not shown:** `Dash71Task`. It is passed a plan of getting-started deeds, but `Dash71Right` ignores `task` whenever `lift` is set.

**Copy (verbatim)**
- **Header:**
  - "— READY TO QUERY —"
  - "The Lantern Keepers"
  - "by Audit S1"
  - "Where do I start?"
- **Queries door:**
  - "No queries yet"
  - "No queries out yet."
  - "Log a query you've sent and it'll show up here, with any date."
  - Button: "Log a query"
- **Agents door:**
  - "Agents on file"
  - "0 ON FILE"
  - "No agents yet."
  - "Add the agents you'd like to query. You can add them long before you send anything."
  - Buttons: "+ Add an agent", "Import a list"
- **Lift:**
  - "Ready for lift off?"
  - "Start on the left, or with any of these:"
  - "0 OF 4 · OPTIONAL"
- **Lift tiles** (title, line, link, status footer; the footer only shows at 1920):
  - "Import your journey" · "Bring in the spreadsheet you've been tracking queries in." · "Smart import →" · "ONE FREE IMPORT"
  - "Add your materials" · "Your letter, synopsis and opening sample, kept as versions." · "Add a material →" · "0 OF 3 ON FILE"
  - "Build your comps" · "Most agents want two comparable titles in a query." · "Add a comp →" · "0 COMPS"
  - "Record a version" · "Save the draft you're sending, so you know which one each agent got." · "Add a version →" · "NONE YET"
- **Founding card:**
  - "Audit S1"
  - "FOUNDING WRITER" (alternates with "NO CONTRIBUTIONS YET")
  - At 1920: "Your feedback shapes QueryHawk", "Tell us what works, what doesn't and what you'd add. We read every word.", "What I like", "What I don't", "An idea", "EGG"
  - Footer: "Top contributors enter a weekly prize draw, and climbing the ranks earns a special thank-you at launch."
- **"Where do I start?" popover:**
  - "Where do I start?"
  - "Pick whichever sounds most like you."
  - "I've already sent some queries" / "Log them one by one, or import your spreadsheet." (labels: NO QUERIES YET, IMPORT YOUR JOURNEY)
  - "I'm building my agent list first" / "Add the agents you want to query." (AGENTS ON FILE)
  - "I'm still getting my materials ready" / "Your letter, synopsis, comps and draft." (MATERIALS, COMPS, VERSION)
  - After an answer, a "START HERE" tag appears on the lit card.
- **Activity feed:**
  - "Activity feed" / "Everything that's happened on The Lantern Keepers"
  - "0 replies from agents · 1 thing you did · 0 still need you"
  - "Today · Wednesday 28 October · 1 UPDATE"
  - "You added The Lantern Keepers to your manuscripts"
  - "That's the last 30 days."

**Problems**
1. **Loading, `s1-1512-firstload`:** a writer's very first dashboard load draws the querying
   skeleton: chart, two hoops, task card, and "Log a query / Record a response / Add an agent" in
   the header. Then it swaps to the two doors and "Where do I start?". `DEFAULT_SHAPE.pre` is `false`
   (`lib/dashShape.ts`), so the "the swap never flashes" promise only holds from the second visit.
   This is the one flash every new writer is guaranteed to see.
2. **Founding card, `s1-1512-fold` and `s1-1280-fold`:** in the pre layout the card is squeezed to its
   striped band plus three bare icon buttons (👍 👎 💡). There is no headline, no line saying what the
   buttons do, and no egg. Only at 1920 (`s1-1920-fold`) does the full card render. On the two
   commonest laptop widths the writer sees three unexplained icons.
3. **Lift tiles, 1512 vs 1920:** the status footers ("ONE FREE IMPORT", "0 OF 3 ON FILE", "0 COMPS",
   "NONE YET") show only at 1920. At **1280 the tiles also lose their one-line descriptions**, leaving
   a title and a link (`s1-1280-fold`).
4. **Header and Queries door:** "Log a query" appears twice at once: the shell bar's
   **Log a query** and the Queries door's **Log a query**. The lit "START HERE" path makes it three
   prompts for the same act.
5. **Queries door:** the band "No queries yet" sits directly over the heading "No queries out yet."
   It says the same thing twice in two typefaces. At 1512 and 1920 the card is mostly empty space
   around a small hawk (`s1-1920-fold`: roughly 400px of blank card).
6. **Agents door:** the band reads "0 ON FILE" while the body says "No agents yet." That is a zero
   as a figure next to the same fact in words.
7. **Lift header, older look:** "0 OF 4 · OPTIONAL" is a small uppercase mono eyebrow, and so are
   the "Where do I start?" labels and the founding card's "FOUNDING WRITER". The pack's style rule
   says these go.
8. **Lift tiles, older look:** these are the v60 construction (white tile, hairline frame, tinted
   icon disc, underlined text link), with no navy/slate band like the v116 cards beside them. The
   two doors have bands; the tiles do not. The right column reads as a different design from the left.
9. **Founding card label:** "FOUNDING WRITER" on an account that is not a founding writer.
10. **Activity feed tab:** a badge of **1** on a brand-new account. The one unseen item is the
    writer's own "You added The Lantern Keepers to your manuscripts". The first thing marked unread
    is something the writer just did.
11. **Activity feed header, `s1-1512-feed`:** an empty dashed circle sits top-left of the drawer
    header, where art or an avatar seems meant to go. The figures read "0 replies from agents",
    "0 still need you" (the 0 in rust) as numerals rather than words.
12. **Hidden tasks:** after onboarding, the To-do list badge reads 2 by S2 (housekeeping), but before
    the first query the dashboard has no task card, so nothing on the page shows them. The computed
    getting-started deeds (`startingPlan`) are also never drawn on desktop.
13. **Header eyebrow:** "— READY TO QUERY —" is the manuscript's stored status and never changes
    (see S3).
14. **Mid-load, `s1-1512-midload`:** "Where do I start?" renders as a live button over a skeleton
    header while the title, byline and cards are still placeholders. A minor point; it is disabled.

### S2 — the S1 account plus 3 agents
Shots: `s2-1512-fold`, `s2-1280-fold`, `s2-1512-wherestart`, `s2-1512-wherestart-answer`, `s2-1512-feed`.

**Slots:** as S1, except the left column's second card is **`AgentsSnap`**
(`data-d60=agents-snap`) instead of `AgentsDoor`.

**Copy**
- **Queries door:** "No queries out yet." / "Log a query to one of your 3 agents and it'll show up here." / "Log a query"
- **Agents snap:**
  - "Agents on file" / "+3 THIS WEEK"
  - "0" / "of 3 queried" / "0%"
  - "0 querying · 0 closed · 3 not yet queried"
  - "3 ready to query →"
- **Lift:** "Ready for lift off?" / "**You could also:**" (S1 said "Start on the left, or with any of these:") / "0 OF 4 · OPTIONAL"

**Problems**
1. **Agents snap:** four zeros in one card: "0 of 3 queried", "0%", "0 querying", "0 closed".
   The progress bar is empty. Before the first query this is a card of nothing.
2. **Agents snap, older look:** "+3 THIS WEEK" and "0%" are small uppercase mono.
3. **Everything else from S1:** problems 2–13 all still apply. The founding card is still band plus icons at 1512 and 1280,
   the tiles lose their footers and copy, "Log a query" is still doubled, and the feed badge reads 3.
4. **Hidden tasks:** the To-do list badge reads **2** (housekeeping: reply times and materials for
   the three agents), and nothing on the dashboard says so.

### S3 — first query: 1 sent today, nothing closed, no replies, nothing due
Shots: `s3-1512-fold`, `s3-1280-fold`, `s3-1512-feed`, `s3-1512-hover-closed-0…3`, `s3-1512-hover-agents-0…2`.

**Slots**
- `.d58[data-mode="q"]`
- **Header:** `Dash58Header` with Log a query / Record a response / Add an agent.
- **Left:** `OneScreenChart` (`d58-active`), then `d60-hoops`: `ClosedHoop` and `AgentsHoop`.
- **Right:** `Dash71Right` in `data-mode="q"`: `Dash71Task` in `d71-taskslot`, then `Dash105Founding` in `d71-fwslot`.
- **Feed tab** and **hawk shadow:** as before.

**Copy**
- **Chart:** "1 active query" / "SINCE 28 OCT" / "The line begins once there are two days on the record."
- **Closed:** "0 closed" / "See all →" / "0 No reply · 0 Passed on query · 0 Passed on partial · 0 Passed on full"
- **Agents:** "Agents on file" / "+3 this week" / "1 OF 3 QUERIED" / "1 Querying · 0 Closed · 2 Not yet queried" / "2 ready to query →"
- **Task card:**
  - "Housekeeping" (pager ‹ ›)
  - "Add typical reply times for 3 agents" / "HELPS QUERYHAWK TELL YOU WHEN TO NUDGE"
  - "QueryHawk uses reply times to work out when a query is worth a nudge. Without one, a query never shows up as a nudge."
  - "View task →" / "Then: add what 3 agents ask for"
- **Founding:** "Your feedback shapes QueryHawk" / "Tell us what works, what doesn't and what you'd add. We read every word." / "What I like" / "What I don't" / "An idea"
- **Hover piles:** a zero row on Closed opens a stack reading "None yet / No reply" (and so on).
  "Not yet queried" lists "Priya Okafor · WEXFORD & LANE · No genres yet" and "Tobias Arden · SALTMARSH AGENCY · No genres yet".

**Problems**
1. **Chart, `s3-1512-fold`:** a near-blank card. The big plot area is empty apart from one small
   italic line and an empty minimap track at the foot. The Mentor stands beside nothing. On 1280 the
   empty area is smaller but just as blank.
2. **Closed hoop:** "0 closed" over an empty ring with the Archivist inside, and four rows of "0".
   It is an all-zero card on the second day of querying.
3. **Closed hoop hover, `s3-1512-hover-closed-0`:** each zero row opens a hover pile that says
   "None yet". This is a hover pile opening on nothing. Clicking a zero row does nothing (correct), but
   "See all →" opens the Query Centre's closed filter with **0 of N** and "Nothing matches those filters"
   (`s6b-1512-click-seeall-closed`).
4. **Task card:** right after the first query is logged, the top of the card is a **housekeeping
   chore** ("Add typical reply times for 3 agents"). Nothing acknowledges the query just sent or says
   what happens next (reply due 23 Dec, nudge 30 Dec, which the log drawer had just stated).
5. **Task card, older look:** "HELPS QUERYHAWK TELL YOU WHEN TO NUDGE" is a small uppercase mono line.
6. **Task card, 1280:** "Then: add what 3 agents ask for" is cut ("Then: add what 3 agents a…"),
   and the body text runs right down to the card's hairline with no room left.
7. **Header:** the eyebrow still reads "— READY TO QUERY —" with a query out. It is the stored
   manuscript status, set in onboarding, and logging a query doesn't change it. The sidebar
   switcher's line now reads "READY TO QUERY · 0 W…", cut off at both widths (sidebar chrome, not
   the dashboard, but in every shot).
8. **Header:** "Log a query" is in the header **and** in the shell bar. Two identical buttons 200px apart.
9. **Agents hoop, older look:** "OF 3 / QUERIED" inside the ring is small uppercase mono.
10. **Founding card, 1280:** the three buttons wrap "What I don't" onto two lines (`s3-1280-fold`).
11. **Feed:** "QUERY SENT" sits above "You sent your query for The Lantern Keepers to Marion Hale",
    with the kicker in small uppercase mono.

### S4 — early days: 3 queries (1 closed, no reply · 1 partial requested · 1 waiting), 4 agents (1 not queried)
Shots: `s4-1512-fold`, `s4-1280-fold`, `s4-1920-fold`, `s4-1512-midload`, `s4-1512-task-0…3`,
`s4-1512-feed`, `s4-1512-hover-*`.

**Data**
- Helena Marsh, sent 20 Oct, waiting.
- Daniel Okoye, sent 10 Sep, partial requested 27 Oct, due Tue 10 Nov.
- Clara Benning, sent 15 Jun, closed with no reply.
- Rufus Kell, not queried.

(Helena was meant to be dated July; the date picker's month step missed, so she went in as 20 Oct.
The state is still the one asked for.)

**Slots:** as S3.

**Copy**
- **Chart:** "2 active queries" with a minimap, week labels "31 Aug … 26 Oct", and a "closed" pin at the end of the line.
- **Closed:** "1 closed", "1 No reply" and three "0" rows.
- **Agents:** "3 OF 4 QUERIED" / "2 Querying · 1 Closed · 1 Not yet queried" / "1 ready to query →".
- **Task card** (paged): four Housekeeping items:
  - "Add typical reply times for 4 agents" / "HELPS QUERYHAWK TELL YOU WHEN TO NUDGE"
  - "Add what 4 agents ask for" / "SO YOUR SUBMISSION PACKAGE MATCHES"
  - "Add genres for 4 agents" / "SO WE CAN SUGGEST WHO TO QUERY NEXT"
  - "Add wishlists for 4 agents" / "SO YOU CAN CHECK THE FIT BEFORE QUERYING"
- **Closed hover:** "Clara Benning · ASHDOWN & PRYCE · QUERYING · The Lantern Keepers · QUERIED 15 JUN · 19 WKS".
- **Feed:** "You closed your query to Clara Benning for The Lantern Keepers **after 3 minutes without a reply**".

**Problems**
1. **Task card, `s4-1512-task-0…3`:** an agent has asked for pages (Daniel, partial requested,
   due 10 Nov) and **the dashboard never mentions it**. All four pages of the task card are
   housekeeping. The request is the most important thing on this account and it isn't on the page.
   (`dashList` only reads the board's To do and Today lanes; a request due in 12 days sits in a later lane.)
2. **Task card:** the "Then:" line is circular. The fourth page says "Then: add typical reply times
   for 4 agents", which is the first page.
3. **Task card pager:** at 1920 the band shows "1 OF 4"; at 1512 and 1280 it shows only ‹ ›, so
   there is no way to tell how many items there are.
4. **Feed:** "after 3 minutes without a reply" for a query **sent on 15 June** and closed on 28 Oct.
   The duration is measured from when the writer *logged* it, not when it was sent.
5. **Feed:** every past-dated send is listed under "Today" with the time it was logged ("QUERY SENT
   11:48pm") rather than its sent date. A writer back-filling their history gets a feed claiming
   they sent everything tonight.
6. **Closed hover:** the card for a closed query carries a "QUERYING" kicker above the book title.
   That word is the manuscript's standing, but on a closed query's card it reads as this query's state.
7. **Header:** still "— READY TO QUERY —" with two queries out and a partial owed.
8. **Closed hoop:** three of its four rows are "0". The hover piles on them open "None yet" (as S3).
9. **Repeats from S3:** problems 5, 6, 8, 9 and 10 (mono eyebrows, 1280 truncation of "Then:", the
   doubled Log a query, the wrapped founding button).
10. **Chart:** the window starts 31 Aug, so the June query and its close sit off the left edge. That
    is the window's default, not a fault, but on an early account it hides half the history.

### S5 — everything closed: 3 queries, all closed, nothing active
Shots: `s5-1512-fold`, `s5-1280-fold`, `s5-1512-task-0…3`, `s5-1512-feed`, `s5-1512-hover-*`.

**Data:** three queries (2 Jun, 7 Jul, 11 Aug), all closed "No reply" on 29 Oct; 3 agents.

**Could not be reached as asked: a pass.** I meant S5 to include one "Passed on query". Recording a
Pass through Record a response is **refused by dev's Firestore rules** (`Missing or insufficient
permissions` on the query update; the drawer says "Couldn't save"). This is the rules gap already
noted for `recordQueryResponse`. Worse: **the refused pass left a record behind that stops the query
being updated at all.** A plain "No reply" close on the same query is now refused the same way. That
account (Audit S5) is kept as **S5x**: 2 closed plus 1 stuck open. Its shots are `s5x-*`. S5 itself
was rebuilt on Audit S5B with three no-reply closes.

**Slots:** as S3.

**Copy**
- **Chart:** "No active queries", with a "3" closed pin where the line drops to zero.
- **Closed:** "3 closed" / "3 No reply" and three "0" rows.
- **Agents:** "3 OF 3 QUERIED" / "0 Querying · 3 Closed · 0 Not yet queried" / "**0 ready to query →**".
- **Task card:** the same four housekeeping pages as S4.

**Problems**
1. **Chart, `s5-1512-fold`:** titled "No active queries", yet most of the card is a large filled
   area that runs flat and then falls off a cliff at the right edge. All three closes are dated today,
   so the line reads as a crash rather than "three queries came to an end".
2. **Task card:** with nothing active and every agent queried, the card offers only housekeeping.
   Nothing says the obvious next step: add or find more agents.
3. **Agents hoop:** "0 ready to query →" is a link to a count of zero. It opens the Contact list
   (`s6b-1512-click-0-ready`).
4. **Feed tab:** the badge reads "9+" on an account with nothing new from any agent.
5. **Closed hover:** each closed card still reads "QUERYING" (as S4).
6. **Repeats from S3/S4:** problems 5, 6, 8, 9 and 10.
7. **S5x (stuck account, `s5x-1512-task-*`):** Felix Achterberg's query is "Consider closing ·
   Overdue since 1 Sep" in the Query Centre, but the dashboard's task card shows only housekeeping.
   The gone-quiet query never reaches it.

### S6 — no tasks: queries exist, Up next has nothing due (the fallback chain)
Agents were added with a wishlist, a genre, a reply time, a send method and materials, so
housekeeping is empty. The task card's order is fixed in `lib/dashList.ts`: work (requests, nudges,
gone quiet, housekeeping) → **Ready to query** → **Coming up**.

- **S6a, one agent not yet queried** (`s6a-1512-fold`, `s6a-1280-fold`, `s6a-1512-task-0`):
  - Task card: "Ready to query" / "Query Sasha Merriman" / "PELL & GORSE · FANTASY" / "Takes fantasy." / "View task →".
  - No "Then:" line and no pager.
- **S6b, every agent queried** (`s6b-1512-fold`, `s6b-1280-fold`, `s6b-1512-task-0…2`):
  - Task card: "Coming up", with a date tile "WED / 9" / "Reply window ends for Beatrice Lund" / "QUERIED 14 OCT" / "The next date from your queries. Nothing needs doing before then." / "View task →" / "Then: reply window ends for Owen Castell".
  - Agents hoop: "0 ready to query →".
- **The end of the chain** (no live query, no ready agent, no housekeeping) was not reached. Every
  account that closes its queries is left with housekeeping, so that branch could not be shown through
  the app without filling every agent's profile and then closing every query. Not attempted.

**Problems**
1. **Task card date tile, `s6b-1512-fold`:** reads "WED 9" with **no month**. The date is 9 December.
2. **Task card:** each "Coming up" page repeats "The next date from your queries. Nothing needs doing
   before then.", and the "Then:" line loops back to the first page (as S4).
3. **Task card, older look:** "QUERIED 14 OCT" and "PELL & GORSE · FANTASY" are small uppercase mono.
4. **Task card, S6a:** "Takes fantasy." is the whole body; a large empty area sits beneath it.
5. **Task card, 1280:** "Then: reply window ends for Owen Cast…" is cut.
6. **Agents hoop, S6b:** "0 ready to query →".
7. **Closed hoop:** S6 has nothing closed, so it is an all-zero card again (as S3).

---

## 2. The problem lists, by slot (all states)

**Header and WhereStart**
1. **"— READY TO QUERY —" never changes.** It is the manuscript's stored status and logging,
   closing or getting a request leaves it as it was (S3–S6).
2. **Before the first query, "Where do I start?" is the only header button**, and it is the
   v60.1 popover, with small uppercase mono labels inside it.
3. **"Log a query" is in the header and in the shell bar on every querying page**, and in the
   Queries door before the first query. That is two or three at once.

**Left column**
4. **The pre layout's two doors are the v60 cards**: navy band, white body, hawk, buttons. "No
   queries yet" sits over "No queries out yet." Much of the Queries door is empty space.
5. **AgentsDoor shows "0 ON FILE" and AgentsSnap shows four zeros plus "0%"** before any query.
6. **The chart with one query is a blank plot** with one italic line (S3). With every query closed,
   it is a filled area falling off a cliff under "No active queries" (S5).
7. **`OneScreenChartEmpty` is unreachable once loaded.** The pre branch renders the doors instead
   of the chart, so the chart's own empty state only survives in code.
8. **The Closed hoop is an all-zero card** whenever nothing has closed (S3, S6). Its zero rows open
   "None yet" hover piles, and "See all →" opens an empty filtered list.
9. **The closed card's hover pile says "QUERYING"** on a closed query (S4, S5).
10. **"0 ready to query →" is a link to nothing useful** (S5, S6b).

**Right column**
11. **The getting-started deeds (`startingPlan`) are computed and never drawn on desktop.**
    "Ready for lift off?" takes the task card's place.
12. **"Ready for lift off?" tiles are a different construction from every v116 card**: no band,
    hairline tiles, underlined links. They lose their status footers below 1920, and at 1280 they also
    lose their descriptions.
13. **The founding card in the pre layout is band plus three icons at 1512 and 1280.** It only
    explains itself at 1920.
14. **After the first query the task card leads with housekeeping**, not with the query just sent
    (S3).
15. **A requested partial (due in 12 days) never reaches the task card**: four housekeeping pages
    instead (S4). A gone-quiet query never reaches it either (S5x).
16. **"Then:" is circular** on the last page. The pager shows "1 OF 4" only at 1920.
17. **"Coming up" date tiles have no month** ("WED 9" for 9 December).
18. **Small uppercase mono lines remain**: task reasons, "QUERIED 14 OCT", "FOUNDING WRITER",
    "0 OF 4 · OPTIONAL", "OF 3 QUERIED".
19. **At 1280 the "Then:" line is cut, and the body text runs into the card's foot.**

**Founding card**
20. **"FOUNDING WRITER" on a non-founding account.** There is no non-founding variant.
21. **At 1280 "What I don't" wraps** onto two lines in the querying layout.

**Activity feed tab and feed**
22. **A brand-new account opens with an unread badge of 1**: the writer's own manuscript-added line.
23. **Back-filled sends are listed under "Today"** with the time they were logged.
24. **"after 3 minutes without a reply"** for a query sent four months earlier.
25. **The drawer header has an empty dashed circle**, and the counts read "0 replies from agents" and "0 still need you" as numerals.

**Loading**
26. **The very first load draws the querying skeleton, then swaps to the doors** (`DEFAULT_SHAPE.pre = false`).
27. **The hawk shadow** is present in every state and behaves; no problem found.

**1512 vs 1280 vs 1920**
- **1920 only:**
  - the tile status footers
  - the full founding card in the pre layout
  - the "1 OF 4" pager count
- **1280 loses:**
  - the tile descriptions (pre)
  - the end of every "Then:" line
  - the room under the task body
  - "What I don't" wraps
- **All three widths:** the page never scrolls.

---

## 3. Locks that assert on the pre-query layout

These are what a follow-up pack may change, and each will need re-pointing or retiring with it.

**e2e (`tests/e2e/`, fixture `seedDash60.mjs`: manuscript `db60-pre` + the `__SA_DASH_NO_AGENTS` aid)**
- `dashV60.measure.ts`
  - DB60 P1 P2 P3 P6 P7 P10: the swap, the slate, the hoops, nothing closed or second before the first query, and fit. Reads `data-pre` and `"Ready for lift off?"`.
  - P4 P5: the AgentsSnap figures.
  - P8: the tiles' done states.
  - P10: loading draws the state it last saw.
- `dashV601.measure.ts`
  - DB601 S1 S2 S5 S6 E: eyebrow, header ("only 'Where do I start?'"), copy, fit.
  - S3 S4 S7: the answers light their targets, Escape unwinds in order, nothing is written.
- `dashV71.measure.ts`: "DB71 L3 (first use) — the founding card is never under the Activity feed tab". Day one, and agents with no queries.
- `dashV71Shots.measure.ts`: "DB71 shots — day one".
- `importReviewFeed.measure.ts` IRF-C: one loading state across the dashboard, run over `pre` (`db60-pre`) and `querying`.
- Retired notes that describe the pre layout: `RETIRED-dashboard-v60.md`, `RETIRED-dashboard-v60-1.md`.

**Unit**
- `src/components/dashboardPageSmoke.test.tsx` asserts "Ready for lift off?", "No queries out yet." and "Where do I start?" on the first-run render.
- `src/lib/dashFirstUse.test.ts` covers `isPreQuery`, `agentCoverage`, `firstUseTiles` (every branch), `startAnswers`/`spotOf`, and `tilesDone`.
- `src/lib/dashV58.test.ts` covers "first run: the getting-started deeds are the list" (`startingPlan`).
- `src/components/dashboard/oneScreenMark.test.tsx` holds the "Lift" container mark (`v60/Dash60Lift.tsx`) and the "Left" mark (`v60/Dash60Left.tsx`).
- `src/components/dashboard/oneScreenPanel.test.tsx` covers "the band era is over" over `v60/Dash60Left` and `v60/Dash60Lift` (among others).

**CSS that keys on the pre layout** (not locks, but it moves with it)
- `dash71.css:475`: `.d58[data-mode="pre"] .d58-right > .d59-rule`
- `dash105.css:31`: `.d58[data-mode="pre"] .d58-right > .d105-fw` (the flexible `flex: 1 1 0` slot that squeezes the founding card down to its band)
- `dash77.css` and `dash71.css`: every `.d58[data-mode="q"]` rule, which by omission does not apply to pre.

## 4. What still depends on `isPreQuery` (v60)

`src/lib/dashFirstUse.ts`: `isPreQuery = (scopedQueries) => scopedQueries.length === 0`.

- **`Dash58.tsx:177`** `empty = isPreQuery(scopedQueries)`. It drives:
  - `pre` (when loaded): `data-mode`, the left column's doors-or-chart branch, `WhereStart` in the header, `Dash60Lift` as the right column's `lift`, and the "Where do I start?" spotlight state.
  - The task plan: when `empty`, the plan is `startingPlan(gettingStartedRows(...))`, which is never drawn on desktop (see problem 11).
  - `OneScreenChart`'s `empty` prop, so `OneScreenChartEmpty` only in a branch that cannot render once loaded.
  - `writeShape({ pre: empty, ... })`: the loading memory.
- **`DashPhone.tsx:85`** (the phone, out of scope here) reads the same predicate.
- **`lib/dashShape.ts`** `DEFAULT_SHAPE.pre = false`: what a first visit draws before `isPreQuery` has data (problem 26).
- **`useDashHold`/`dashAid`** (dev aids) feed the same branches, including `__SA_DASH_NO_AGENTS` for day one.

## 5. Out of scope, seen in passing
- **Sidebar:**
  - At 1280 the "Give feedback" button sits over the "To-do list" row (S1 and S3 at 1280).
  - The manuscript switcher's line ("READY TO QUERY · 0 W…") is cut at both widths.
- **Dev rules:**
  - Recording a Pass is refused (`recordQueryResponse`), and the refused write leaves the query unable to take any later update (S5x).
  - Reproduced on Audit S5, query to Felix Achterberg.
