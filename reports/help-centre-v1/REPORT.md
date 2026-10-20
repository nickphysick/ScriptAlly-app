# Help Centre v1: guides hub, search-first home, real articles

Branch `help-centre-v1` (worktree `../ScriptAlly-hc1`), cut from `6a7a0715`, the integration tip dev was serving
(`index-D5wjLmfX.js`, built from `fabf7811`), which carries help-system-v1 (`b3c7ef6`). Pack checksums verified
(`831ee6bd…f6bc`, `shasum -c` clean). Not merged to `main`. Prod not touched.

| Part | Commit | What |
|---|---|---|
| A | `68f78a71` | The articles as data; the index built from them; the glossary's List health fix |
| B | `af9779e3` | The home; `/help/{slug}` in every route table; `requestGuideStep`; guide cards |
| C | `42e9832f` | The article page; "Did this help?" as kind `Article` |
| Locks | `95b57546` | HC1 (`tests/e2e/helpCentreV1.measure.ts`), mutations, shots, this report |

Gates on each commit, in its own worktree: tsc (root and functions), production build, dev build, full Vitest.
A and B: 618 files, 9,166 tests. C: 619 files, 9,187 tests. All green.

## 1. False premises (read these first)

1. **The pack's List health sentence names the wrong details.** It said List health covers "genres, wishlist, response
   policy, contact route". The code (`lib/listHealth.ts`) scores **reply time (6), materials (5), genres (4), wishlist
   (3), and a reopening date for a closed agent (2)**. Response policy and contact route score nothing. The glossary now
   reads: *"How much of the useful detail on your agents is filled in: reply time, materials, genres, wishlist, and a
   reopening date for an agent closed to queries. Each gap you fill helps QueryHawk tell you when queries are due, and
   which agents take your genre."* (the pack's second sentence, kept). Nothing pinned the old text.
2. **"Add an agent" was to be the mock's article exactly; four of its sentences describe things the app does not do.**
   Corrected, and nothing else changed:
   - *"Only the name is required"* → a name **or** an agency is enough (`AgentCardEditor.tsx` refuses only when both are empty).
   - *"Genres power the 'Ready to query' section"* → "Ready to query" is "not queried and open now"; genres play no
     part. Now: *"Genres tell QueryHawk which agents take your book's genre."*
   - *"QueryHawk uses [response policy] to work out when a query has gone past its expected date"* → the expected date
     comes from the reply time; the policy decides what the to-do list suggests afterwards. The step now says both.
   - The tip's *"Set-up › Smart import"* → there is no Set-up section. The Import page is off the sidebar; the tip says
     ⌘K (Ctrl K) → Import.
   - "Any detail you skipped shows up in List health" → "Any gap List health counts shows up there" (it counts five).
3. **"Upload a version" has nothing to upload.** A version is a named record (name, what changed, word count); there is
   no file input and no Storage on that page. The article is **"Save a new version"** (`/help/save-a-version`).
4. **"How long agents usually take" was already renamed by the pack** ("Reply times, and what QueryHawk does with them");
   QueryHawk has no figures for it and the article states none.
5. **"Learned {date}" has no date to read.** Nothing records when a guide was finished. A card now shows the date only
   when this device saw the last item land (stamped then, `sa.guide.{page}.learned`); otherwise "Learned." Guides
   finished before this build read "Learned." on every device.
6. **"Restart … not done" leaves a finished card finished.** Restart clears `seen`/`hidden` (and the Query Centre's
   `finished`) on the account and this device's skips, and never a done tick, as the pack says; so a card whose six
   items are all *done* still reads Learned. What Restart does do is bring the guide back on the page's next visit
   with its checklist open (a one-shot `sa.guide.{page}.restart`). A card where items were only *skipped* goes back
   to its real count.
   **Restart's account write and the "Learned {date}" stamp are built and unit-typed but not measured on the page:**
   no HC1 lock covers them, and they are the first things to check by hand.
7. **"YOU WERE HERE" via navigation state alone would miss most routes in.** Nine controls lead to /help; none passed
   state. The shell now notes every route (`lib/routeTrail`, held for the tab's session); the Help Centre prefers
   `location.state.from` when a caller gives it and falls back to the trail.
8. **C1's "adding an agent ticks"** cannot be shown on the harness account: it has agents, so "Add an agent" is credited
   on arrival (help-system-v1 C.5). The lock shows the spotlight landing on "+ Add an agent" and the article reading
   "✓ You've done this", then proves *the writer's own action ticks, and Show me does not* on **Find an agent**: Show me
   → spotlight → nothing ticked → type two letters → ticked → the article reads "✓ You've done this" / "Show me again".
9. **C3's "doc kind Article"**: the rendered lock stubs the callable and asserts the request (kind `Article`, pageName
   `help/{slug}`), so no document is written and no email reaches feedback@. The function's acceptance of `Article` is
   a unit lock on `feedbackRecord`.
10. **C4 "prod no"** is a unit lock: a production bundle signs into the prod project, which the harness refuses to open.
11. **Found, not fixed (outside this pack):** the Query Centre guide's "Find a query" line and spotlight say *"tap a
    status at the top"* — that row is no longer drawn (status filters are in Filters › Where it stands); its "Log a
    query" spotlight says it "also sits in the top bar", where it is the sidebar's capture button; the glossary file's
    comment says nothing closes a query by itself, but "Close it" on Log a query does; Settings says signing in again
    cancels a scheduled deletion, but only "Cancel deletion" does; the data export blurb says "as files" for one JSON
    file. Each is a sentence the app shows today.

## 2. What retired

The old `HelpCentre.tsx` (394 lines): the FAQ topics ("Fortnight in Focus", "Query Pipeline", "Agent Discovery",
"Manuscript Packages"), "Querier's Cheat Sheet", the burgundy pill tabs, the generic fonts and the "Keyboard
shortcuts" button. No CSS file belonged to it. `switcherV2` S7's last row clicked that button; it is retired with it
("?" still opens the shortcuts sheet and is asserted in the same case). The help route no longer sits in the 860px
focus column.

## 3. How `requestGuideStep` works

`lib/guideHub` holds one pending request `{ page, key | null, at }`. "Show me in the app" navigates to the page and calls
`requestGuideStep(page, key)`; "Start/Resume on {Page}" calls `requestGuideOpen(page)`. Every workspace page stays
mounted, so the page's `PageChecklist` is already listening: it takes the request only once its route is on screen
**and** its data is ready (`active && ready`), clears it, spends the session's one auto-open, and shows the guide for that
visit even when it is hidden, finished or every guide is switched off. It then waits (up to 5s) for the item's control
to be in the DOM and starts that item's spotlight (or opens the checklist). A page's own walkthrough (the Query Centre's
practice response) runs through `onStart` and needs no control. A request nobody takes in 30 seconds is dropped. It
never writes anything: the tick comes only from the page's own record of the writer's action.

## 4. Locks (HC1), each run red first

`tests/e2e/helpCentreV1.measure.ts`, 1512 × 900 and 1280 × 800. Red against the build before this pack (`6a7a0715`,
`runs/base-red.log`) and against each named break (`runs/mutations.log`, made and undone in `../ScriptAlly-hc1-mut` by
`tests/e2e/hc1Mutate.py`; the tree was clean after).

| Lock | Green | Base (`6a7a0715`) | Named break | Under it |
|---|---|---|---|---|
| H1 retire | 20/20 | red 2/20 | restore the old component | red 2/20 |
| H2 guides | 10/10 | red 0/10 | hard-code nine cards | red 6/10 |
| H3 search | 12/12 | red | titles only | red 10/12 (the body word) |
| H4 slash | 4/4 | red | remove the "/" handler | red 2/4 |
| C1 show me | 20/20 | red | navigate without `requestGuideStep` | red 14/20 |
| C2 unknown | 6/6 | red 2/6 | a blank article | red 0/6 |
| C3 feedback | 12/12 | red | `Article` in the client's kinds | red 8/12; unit red |
| C4 drafts | 6/6 (+ unit) | red | show always | unit red |
| C5 live | 35/35 (+ unit) | red 22/35 | leave `find-an-agent` out | red 32/35; unit 3 red |

Unit halves: `src/content/help/helpContent.test.ts` (C3, C4, C5, search order, read time, the routes) and
`functions/src/betaFeedbackCore.test.ts` (the function accepts `Article`).

**L1** (help-system-v1's list: `helpSystemV1`, `contactV192`, `contactV191`, `qcV139`, `qcV140`, `qcV1401`,
`contactV183`, `shellMenus`, `hr1`, `switcherV2`; logs in `l1/`): 91 passed, 8 failed, 2 skipped, 2 not run. None is
this pack's:
- **qcV140 E1/F1/G1, qcV1401 A1/A2** died on `auth/quota-exceeded` (Firebase's password-verification quota; three other
  sessions were running e2e on the same account at the time). Re-run alone: **19/19 passed** (`l1/qc-rerun.txt`).
- **HR1-8** refuses a reference older than twelve hours; **MS15** needs main's references captured first. Both refuse
  before measuring, as they did for help-system-v1.
- **switcherV2 S5** times out waiting for the Contact list's search box (collapsed to an icon since Contact list v19;
  the case never presses it open). **Identical on the base build** (`l1/s5-base.txt`).
- `switcherV2` S7's row that clicked the retired "Keyboard shortcuts" button is retired with it (§2).

The base comparison run did not take place as one piece: another session removed this pack's base and mutation
worktrees mid-run (`l1/base.txt` is empty). The base was rebuilt at `6a7a0715` (its bundle hash equals dev's,
`index-D5wjLmfX.js`) for S5.

**Shared account.** The harness account's guide state is read and put back by every lock. While these ran, the Query
Centre v141, retire-add-agent and import-loader sessions were measuring on the same account; once, qcV140's restore was
refused by the quota and left the Query Centre guide fully done, and I put back the state recorded before L1. At the end
of this pack the Contact list guide was mid-test in the other session's contactV19 run, so I left it to that run's own
restore.

## 5. Shots

`shots/` beside the mock's 13 and 14, taken on dev (`index-CFRneDax.js`) at 1512 and 1280 (@2x), harness account, by
`tests/e2e/helpCentreV1Shots.measure.ts`: `13-help-centre`, `13-help-centre-browse`, `13-help-centre-search` ("partial"),
`13-help-centre-no-result` ("ask Nick"), `14-article` (Add an agent), `14-article-steps`, `14-article-status-key`, and
`14-show-me-lands` (the Contact list with the spotlight on "+ Add an agent"). Two cards, not the mock's nine: only the
Contact list and the Query Centre register a guide. The Query Centre card reads "Learned" because the shared account had
that guide fully done at that moment (see L1).

## 6. Integration and dev

- **Integration branch:** `dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386-db60-cl183-an24-cl1831-an241-db601-cl1831b-cl1832-cl1833-cx28-qhnet-td52-dv1-qc139-dv1b-cl19-cl191-qc140-cl192-qc1401-hr1-hs1-hc1`,
  cut from the branch dev was serving (`6a7a0715`, `index-D5wjLmfX.js`, confirmed by rebuilding it) and merged with
  `help-centre-v1` at `cac7db59`. No conflicts; its tree is `help-centre-v1`'s.
- **Gates there** (clean checkout): tsc 0, tsc functions 0, both builds 0, Vitest 619 files / 9,187 passed, 3 skipped.
- **HC1 there:** all nine green (`10 passed`).
- **Deployed to dev, from that clean checkout of the pushed tip:**
  - Hosting: `index-CFRneDax.js`.
  - `sendBetaFeedback` (it now accepts kind `Article`), europe-west2. Not probed end to end: the function checks the
    message before the kind, so the only call that reaches the kind check stores a document and emails feedback@.
    The kind is unit-locked.
- Prod: nothing. `main`: not merged.

## 7. Every drafted article, in full, by area

"Add an agent" is the mock's (corrected as in §1.2); every other article is `draft: true` and shows DRAFT on dev builds.

### Queries — Logging and tracking

#### Log a query  
`/help/log-a-query` · 1 min · **draft** · guide item: Query Centre · log

> Every query you send gets one entry: who you sent it to, which book, when, and what went with it.

1. **Open the drawer.** Press `+ Log a query` on the Query Centre, or use the capture button at the top of the sidebar. The drawer opens on the right.
2. **Agent and book.** Choose the agent and the manuscript. If you already have a live query with them, or with someone at the same agency, the drawer says so.
3. **Sending.** Set the date you sent it and how you sent it.
4. **What you sent.** Attach a submission package, or choose the pieces one by one: query letter, synopsis, and how much of the book.
5. **If they don't reply.** Check the date a reply is expected and say whether no reply means no. Then choose `Remind me to nudge`, `Close it` or `Do nothing`. `Close it` closes the query as no reply once that date passes. Press `Log query` to save.

Related: `record-a-response`, `expected-dates`, `build-a-package`, `status-key`

#### Find a query  
`/help/find-a-query` · 1 min · **draft** · guide item: Query Centre · find

> Search and filter the Query Centre's list until it shows the queries you want.

Type into `Find an agent or agency` above the list, or press `/` to jump there. It matches the agent's name and the agency recorded on the query.

Press `Filters` for more. `Your move`, `Overdue`, `Waiting to hear back` and `Offers` sit at the top, then every stage under Where it stands, what you sent, and a few more such as due this week. Filters add up, and the button shows how many are on.

The export button downloads the queries the list is showing.

Related: `open-a-query`, `status-key`, `pin-the-list`, `birds-eye-view`

#### Open a query  
`/help/open-a-query` · 1 min · **draft** · guide item: Query Centre · open

> Click a row and the query opens beside the list: where it stands, its whole story, and your next move.

The panel's top line gives the agent, the agency, the status and how many days it has been since you queried. `Tracking` shows each step so far, `Agent` shows what you know about them, and `Notes` holds your own notes.

The button at the foot is the next move for where the query stands: `Mark partial sent` once you've sent requested pages, `Record your answer` for an offer, `Nudge` once a reply is past its expected date, and otherwise `Record a response`. The `···` menu beside it has the rest, including `Delete query`.

Related: `record-a-response`, `status-key`, `expected-dates`, `find-a-query`

#### Record a response  
`/help/record-a-response` · 1 min · **draft** · guide item: Query Centre · resp

> When an agent replies, record it on the query. The status moves on, and your to-do list follows.

1. **Choose the query.** Open the query and press `Record a response`. Or press it in the Query Centre's header and pick the query from the list.
2. **What they said.** Choose `Partial requested`, `Full requested`, `Revise & resubmit`, `Pass` or `Offer`.
3. **The detail.** Answer what it asks next: what they'd like to see and when you'll send it, what they'd like revised, any feedback, or the terms of an offer.
4. **Save.** Press `Save response`.

No reply isn't a response. When you decide to stop waiting, press `Close query` on the query and choose `No reply`.

**TRY IT FIRST** — The Query Centre's page guide has a practice query. Record a response on it: nothing is saved.

Related: `status-key`, `partials-and-fulls`, `open-a-query`, `log-a-query`

#### Birds-eye view  
`/help/birds-eye-view` · 30 sec · **draft** · guide item: Query Centre · birds

> Every live query on one timeline, so you can see what is due and what has gone quiet.

Press the floating `Birds-eye view` tab on the Query Centre, or press `B`. The tab shows how many queries are overdue and how many are coming up.

Queries are grouped by urgency to begin with: overdue, upcoming, watch and wait, and no date. You can group and sort another way, and narrow the view by name, by when, or by stage. Closed queries aren't shown.

Related: `expected-dates`, `find-a-query`, `status-key`, `open-a-query`

#### Status key: every ring explained  
`/help/status-key` · 30 sec · **draft**

> Each query wears a ring that says where it stands. Dashed means the agent has asked for something; solid means you've sent it.

The centre says what is in play: half filled for a partial, full for the whole manuscript, a bar for a query that has closed. The words beside a closed query say how it closed.

_(then every status's glossary entry, each with its StatusDot ring)_

Related: `partials-and-fulls`, `record-a-response`, `expected-dates`, `log-a-query`

#### Past expected: what it means  
`/help/expected-dates` · 1 min · **draft**

> A query is past expected when it is waiting on the agent and the date a reply was expected has come.

The expected date comes from you or from the agent. If you gave a date when you logged the query, that is the one. Otherwise QueryHawk counts the agent's reply time from the day you last sent them something. With no reply time and no date from you, a query has no expected date, so it never shows as past expected.

Only a query waiting on the agent can be past expected: queried, partial sent, full sent, or resubmitted. Once it is your move, the date stops counting.

Past expected says only that the date has come.

Related: `reply-times`, `response-policy`, `when-to-nudge`, `birds-eye-view`

### Agents — Your contact list

#### Add an agent  
`/help/add-an-agent` · 2 min · reviewed (the mock's) · guide item: Contact list · add

> Every query starts with an agent on your list. Add one by hand in under a minute, or bring a spreadsheet in all at once.

1. **Open the editor.** On the Contact list, press `+ Add an agent` in the header. The editor slides in from the right so your list stays in view.
2. **Name and agency.** A name or an agency is enough to start. Add the country and city if you know them. Each agent sits on their own, even if two share an agency.
3. **What they're looking for.** On `What they want`, pick genres from the list, and paste their wishlist in their own words. Genres tell QueryHawk which agents take your book's genre.
4. **Response policy.** On `How to query`, set how long they take to reply, and choose `No response means no` or `Always replies`. The reply time is how QueryHawk works out when a query has gone past its expected date; the policy decides what your to-do list suggests after that.
5. **Save.** Press `Add to your list`. Any gap List health counts shows up there, ready for later.

_Figure slot: Screenshot slot: the add-agent editor, filled with an example agent_

**QUICKER WITH A LIST** — Got agents in a spreadsheet already? Bring them in with Smart import: press ⌘K (Ctrl K on Windows), type Import, and open the page.

Related: `smart-import`, `list-health`, `response-policy`, `status-key`

#### Find an agent  
`/help/find-an-agent` · 30 sec · **draft** · guide item: Contact list · search

> Search by name or agency from the box above the list. Results narrow as you type.

Type into `Find an agent` above the list, or press `/` to jump there. It matches any part of an agent's name or their agency, whatever the capitals.

The list narrows as you type. Clear the box to see everyone again.

Related: `open-an-agent`, `pin-the-list`, `add-an-agent`, `list-health`

#### Pin the list  
`/help/pin-the-list` · 30 sec · **draft** · guide item: Contact list · pin, Query Centre · pin

> Pinning gives the list the whole page and tucks the header away. Unpin to bring it back.

The Contact list and the Query Centre both pin the same way, and this article is for both.

Press `Pin list` in the list's toolbar, or press `F`. The header folds away and a navy band takes its place, carrying the page's figures and its add button. On the Query Centre the sidebar tucks away too, for more room.

Press `Unpin`, or `F` again, to bring the header back. QueryHawk remembers the pin on this device.

Related: `find-an-agent`, `find-a-query`, `open-an-agent`, `open-a-query`

#### Open an agent's card  
`/help/open-an-agent` · 30 sec · **draft** · guide item: Contact list · open

> Click any row to open the agent: wishlist, genres, materials and every exchange you have had.

Click a row on the Contact list and the agent opens in a panel on the right. The list stays where it was.

`Profile` shows the genres they're after, their wishlist, how to query them (how to send, how long they take to reply, their response policy), what to send them, and your queries to them. `History` and `Notes` sit beside it.

The `···` menu holds the rest, such as opening their queries in the Query Centre.

Related: `edit-an-agent`, `find-an-agent`, `response-policy`, `list-health`

#### Edit an agent  
`/help/edit-an-agent` · 1 min · **draft** · guide item: Contact list · edit

> Change any detail from the agent card. If a change affects your reports, the editor tells you which.

Open the agent, then press `Edit profile` at the foot of the panel. The editor has three tabs: `Details`, `What they want` and `How to query`.

When a change reaches something else, the editor says so before you save. A new reply time moves the expected date on queries waiting on that agent, and the editor shows the dates it would move. Changes to their name, their door, their genres or their response policy say what they touch too.

Press `Save changes` when you're done, or `Cancel` to leave everything as it was.

Related: `open-an-agent`, `reply-times`, `response-policy`, `list-health`

#### What List health measures  
`/help/list-health` · 1 min · **draft** · guide item: Contact list · hk

> List health is the share of useful details your list has filled in. Each gap you fill helps tracking and suggestions.

Each agent can hold five details QueryHawk uses: their reply time, the materials they want, their genres, their wishlist and, for an agent closed to queries, the date they reopen. List health is how many of those your list has, out of all it could have.

Reply time counts most, because it is how QueryHawk works out when a query is past its expected date. If an agent doesn't state one, say so in Housekeeping and it stops counting as a gap.

To fill gaps one at a time, press `Fill in the gaps` in the header, press the List health ring, or press `H`. Housekeeping opens beside your list. `Later` hides a gap for 30 days, but it still counts until it is filled.

Related: `add-an-agent`, `edit-an-agent`, `reply-times`, `response-policy`

#### Response policy explained  
`/help/response-policy` · 1 min · **draft**

> Whether an agent replies to every query or treats silence as a no. QueryHawk uses it to decide what to suggest once a reply is past its expected date.

Set it on the agent's `How to query` tab: `No response means no` or `Always replies`. Until you choose, it reads Not stated. When you log a query, the drawer asks the same question for that query.

It doesn't change when a query goes past its expected date: that comes from the reply time. What it changes is your to-do list. Two weeks after a reply was due, a query to an agent marked `No response means no` brings a suggestion to close it. Any other agent's brings a suggestion to send a nudge, and closing is suggested later if the nudge goes unanswered.

QueryHawk never sends a nudge for you. It reminds you, and records the one you send.

Related: `when-to-nudge`, `expected-dates`, `reply-times`, `edit-an-agent`

### Materials — Manuscripts and packages

#### Save a new version  
`/help/save-a-version` · 30 sec · **draft**

> A version is a named record of your manuscript as it stood: what changed, and how long it was.

On Manuscripts, press `+ New version`. Give it a name, say what changed, and add the word count if you know it. Press `Save version` and it becomes the current version.

QueryHawk keeps the record, not the file, so there is nothing to upload. When you build a submission package, you choose which version it sends.

Related: `build-a-package`, `add-comparable-titles`, `log-a-query`

#### Build a submission package  
`/help/build-a-package` · 1 min · **draft**

> A package is the set of materials you send with a query: your letter, a synopsis, and which version of the book.

1. **Start one.** On Submission packages, press `+ New package`.
2. **Name it.** Give the package a name you'll recognise when you log a query.
3. **What goes in it.** Choose the query letter, a synopsis or `No synopsis`, the manuscript version, and anything else it sends.
4. **Save.** Press `Create package`.

The pages you send each agent are recorded on the query itself, not in the package. Choose `Use for new queries` from a package's `More` menu to mark the one you're sending now.

Once a package has gone out, the text of what it sent is fixed. Changing its contents starts its next edition, and `Duplicate` makes a copy you can change freely.

Related: `save-a-version`, `log-a-query`, `add-comparable-titles`

#### Add comparable titles  
`/help/add-comparable-titles` · 30 sec · **draft**

> Comps are the books, films and shows you set beside yours in a query letter.

1. **Start one.** On Comparable titles, press `+ Add a comp`, or press `N`.
2. **What it is.** Choose Book, Film, TV or Other, and give the title. The rest is optional: who made it, who published it, and the year.
3. **Why it fits.** Add what it shares with your book, and a line in your own words.
4. **Save.** Press `Add comp`, or `Add and add another`.

Related: `build-a-package`, `save-a-version`

### Tasks — To-do, calendar, corkboard

#### How tasks are created  
`/help/how-tasks-are-created` · 1 min · **draft**

> Most of your to-do list writes itself from your queries and agents. You add the rest.

When an agent asks for pages, a task asks you to send them. Two weeks after a reply was due, a task suggests a nudge or closing the query, depending on the agent's response policy. Offers, revise and resubmit requests, and gaps in an agent's details each bring a task of their own.

The list groups them: `Your move`, `Worth a nudge`, `Gone quiet`, `Housekeeping`, and `Your tasks`, which holds the ones you add yourself with `+ Add a task` or `N`.

Related: `finish-a-task`, `pin-a-note`, `response-policy`, `when-to-nudge`

#### Finish a task  
`/help/finish-a-task` · 30 sec · **draft**

> Finishing a task means doing what it asks. The task goes once the query shows it is done.

Open a task on the To-do list and press its button, such as `Record a nudge` or `Decide what to do`. The same drawer opens as on the Query Centre, so the query is updated in one place, and the task clears because the query has moved on.

A task you added yourself has `Tick it off`.

Related: `how-tasks-are-created`, `record-a-response`, `pin-a-note`

#### Pin a note to the Corkboard  
`/help/pin-a-note` · 30 sec · **draft**

> The Corkboard holds the notes you want in front of you.

On the Corkboard, choose a pad colour under `Add to your board`, write your note, and press `Pin it`.

You can pin one from the To-do list too: press `+ Add a task`, switch to `✎ Note`, and press `Pin the note`.

Related: `how-tasks-are-created`, `finish-a-task`

### Getting set up — Imports and your account

#### Smart import  
`/help/smart-import` · 1 min · **draft**

> Bring in the queries you've already sent from a spreadsheet, and QueryHawk reads the columns for you.

Open the Import page: press ⌘K (Ctrl K on Windows) and type Import. Under Smart import, press `Import a spreadsheet` and choose a .csv, .xlsx or .xls file. QueryHawk works out which column is which and shows you what it found before anything is saved.

An agent already on your list isn't added twice. A row it can't read, such as one with no agent name or agency, is left out and listed on your Dashboard so you can see what was skipped.

A free account has one Smart import, and Pro has one each month. The template and matching your own columns are always free.

Related: `download-the-template`, `add-an-agent`, `log-a-query`

#### Download the template  
`/help/download-the-template` · 30 sec · **draft**

> Prefer to fill in a sheet yourself? Use QueryHawk's template and nothing needs matching.

On the Import page, press `Download the template` to get QueryHawk-template.xlsx. Fill in a row for each query, then press `Upload my sheet`.

The template is always free, with no limit on how often you use it.

Related: `smart-import`, `log-a-query`

#### Your account and data  
`/help/your-account-and-data` · 30 sec · **draft**

> Your settings, how to take your data with you, and how to close your account.

Settings has seven sections: Profile, Sign-in & security, Plan & billing, Notifications, Preferences, Tasks and Your data. Your home country is how QueryHawk tells agents at home from agents abroad.

Under Your data, `Download a copy` saves everything you've put in as one JSON file.

To close your account, type DELETE and press `Schedule deletion`. You have 14 days to change your mind with `Cancel deletion`. During the beta, deletions are completed by hand after that.

Related: `smart-import`, `download-the-template`

### Querying basics — How UK querying works

#### What a partial and a full are  
`/help/partials-and-fulls` · 1 min · **draft**

> An agent who wants to read more after your query asks for a partial or a full.

A **partial** is part of the manuscript, usually the opening chapters or a set number of pages. A **full** is the whole manuscript. Some agents ask for a partial first, then a full.

In QueryHawk a request shows as a dashed ring: half filled for a partial, full for a full. Record the request with `Record a response`. When you've sent the pages, press `Mark partial sent` or `Mark full sent`: the ring turns solid, and the query is waiting on the agent again.

Related: `status-key`, `record-a-response`, `build-a-package`

#### Reply times, and what QueryHawk does with them  
`/help/reply-times` · 1 min · **draft**

> Most agents say how long they take to reply. Put it on their profile and QueryHawk keeps the dates for you.

Set an agent's reply time on their `How to query` tab, in weeks. QueryHawk counts it from the day you last sent them something, to give each query an expected date, and shows the query as past expected once that date comes.

If an agent doesn't say, leave it unset. QueryHawk doesn't guess a reply time, so their queries have no expected date unless you give one when you log the query.

Changing a reply time moves the expected date on every query waiting on that agent, and the editor shows which before you save.

Related: `expected-dates`, `response-policy`, `when-to-nudge`, `edit-an-agent`

#### When to send a nudge  
`/help/when-to-nudge` · 1 min · **draft**

> A nudge is a short follow-up to an agent who hasn't replied. QueryHawk reminds you; you write and send it.

Check the agent's own guidance first. An agent marked `No response means no` doesn't expect one, so QueryHawk never suggests a nudge for them.

For any other agent, your to-do list suggests a nudge two weeks after the reply was expected. You can also ask for a reminder when you log the query, with `Remind me to nudge`.

When you've sent one, record it on the query with `Nudge` and choose `I've sent a nudge`. Add the date, and paste what you said if you'd like a record. QueryHawk never writes or sends a nudge for you.

Related: `response-policy`, `expected-dates`, `reply-times`, `how-tasks-are-created`
