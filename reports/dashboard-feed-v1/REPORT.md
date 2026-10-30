# Dashboard feed v1 — report

Branch `dashboard-feed-v1`, cut from the branch dev served (`dev/…-ppp1-pa2-8-sip1-pls1`, ba0513b6, `index-4L_rFD9m.js`).
Seven parts, one commit each (A–G), plus this part (H): the DF1 locks, this report, the shots and the dev deploy.

## False premises

1. **There is no dashboard guide and no Help Centre page about the dashboard to re-point (Part G).** The page guides
   (`lib/pageChecklist`) cover the Query Centre, the Contact list, the manuscript and versions; `PageGuide` is mounted
   nowhere; no Help Centre article or glossary entry names the dashboard, its header, the feed tab or the tip. No guide
   string changed. The only Part G change is the CLAUDE.md line.
2. **There is no desktop "Streaks & goals" page to link "Set a weekly goal" to.** On a computer `/goals` redirects to the
   dashboard (`GoalsRoute`). The link opens the existing goal sheet (`GoalTargetSheet`) in place, with the goals card's
   own write.
3. **There is no Cookies page and the app has no social links.** "Cookies" is a section inside the privacy policy with
   no anchor; every social link in `src/` is an agent's. Both are left out of the footer (Part F).
4. **`DASH_TIPS` has no headline field.** Each tip's `lead` (its full stop dropped) is the headline; `rest` is the text.
5. **Halving the side padding does not give the pack's column widths.** v58's padding is 50px (34px under 1366); half
   is 25, which gives 411 / 504 / 411 at 1512 collapsed — outside A1's 417 / 511 / 417 ±4. The ref's 20px gives
   414 / 508 / 414. 20 is used at every width. (Before → after: 50 → 20 at 1512; 34 → 20 at 1280.)
6. **The drawer cannot be deleted.** `Dash58Feed` (the half-screen drawer) is still opened by the phone dashboard
   (`DashPhone`), which this pack does not touch. Only the desktop's floating tab and its unseen-count bookkeeping were
   deleted.
7. **"A full request renders … the materials tiles" is not on the harness account.** No query there has its materials
   recorded. D1 seeds one query's package materials for its reading and puts the query back in the same run.
8. **The grain does not sit wholly between the last point and the hawk's box.** The hawk's box begins about 13px after
   the last point and the fill only breaks up 30–50px past it, under the box. C1 hides the hawk for its one pixel
   reading and looks for a column in that span that is 20–80% fill.

## The base

`dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pk393-pa2-2-td12-ppp1-pa2-8-sip1-pls1` at ba0513b6 (dev served `index-4L_rFD9m.js`
from it). It carries dashboard v118.1 (7 commits), dashboard first visit v1 (7) and the help system v1 (10), and
`FeedbackDock` is mounted by `AppShell`.

## Step 0

| Card | Built component |
|---|---|
| Active queries chart (hawk, gradient, grain spill) | `OneScreenChart` |
| Closed queries ring | `ClosedHoop` (v60 `Dash60Left`, v116 stacks) |
| Agents on file | `AgentsHoop` (v60 `Dash60Left`, v116 stacks) |
| Founding writer | `Dash105Founding` (v116 tilt) |
| Task card | `Dash71Task` over `dashList` / `dashTaskCard` |
| Activity feed tab and drawer | `FeedTab` + `Dash58Feed`, `feedFamily` |
| Top tip | `fv1/MentorTip`, `lib/dashTips` (`DASH_TIPS`) |
| Weekly goal and streak data | `queryingGoals` (`deriveGoalProgress`), `milestones.weekStreak`, `GoalTargetSheet` |
| Phone dashboard | `phone/DashPhone` |
| Feedback | `FeedbackDock`, opened through `lib/feedbackStore.openFeedback` |

- **The grain:** yes, the built chart already has the gradient and the grain spill. Part C keeps it untouched.
- **The feed's sources** (`lib/dashF1Feed.ts` lists them at the top): who = `FeedEntry.dir` (in = the agent, out = you);
  date = `FeedEntry.at`; package = `sentRecordOf(query)` (`sentPackageName`); materials = `readSummary(sentMaterials)`;
  a request's due date = `Query.expectedSendDate`; an offer's = `offerResponseDeadline`; the journey = `QcRow.history`
  (`stageHistory`, the document first). Figures used: Days to reply, Send by, Weeks querying, Reply by, Words,
  Days since query, Days to send. **None dropped for want of a source**; a card drops a figure when its own query
  lacks the field.
- **Footer routes:** Help centre `/help` · What's new `/help#whats-new` · Pricing `/pricing` · About `/about` ·
  Contact us `/contact` · Privacy `/privacy` · Terms `/terms`. **Cookies: no page** (left out). **Follow us: no app
  social links** (left out).
- **The Scout's flag:** `notifyPrefs.scout`, one dotted leaf, the same as Discover's `notifyPrefs.discover`.
  `notifyPrefs` is in the users update allowlist and `isValidUser` does not validate inside it, so **no rules change**.
  `scout` is added to `NotifyPrefs`, its default and its total reader, because Settings saves the whole map.
- **Side padding:** 50px at 1512 and 34px at 1280 before; 20px at both after (see false premise 5).

## What was removed from the dashboard

- **The navy header band** (`Dash58Header`) on the querying page. **Kept**: the first-visit page still uses it.
- **The floating "Activity feed" tab** (`FeedTab`), its rules in dash59.css and its unseen-count bookkeeping
  (`lib/dashFeedSeen` + test). **Deleted**: nothing else used them.
- **The drawer** (`Dash58Feed`) is no longer opened by the dashboard. **Kept**: the phone dashboard opens it.
- On this page: the chart's band (with its range control) and the Closed hoop's band (with "See all →") are hidden
  by the combined card, which has its own header. The slices and rows still open the filtered Query Centre.

## Deviations

- **The task card no longer turns by itself.** The kind band's 7-second dwell went with its progress segments; the new
  card steps by its pager only. Having two cards turn on their own every seven seconds, one with nothing to show it
  is about to, read as the page fidgeting.
- **The close task reads "Close your query to {name}", not "…?"** (the band's question mark is dropped in this card).
- **R&R and signing get big cards** with the requests and offers (they are the request and offer families).
- **The materials tiles say "Opening sample"**, the app's one name for that piece, where the summary says "Sample".
- **The pointing Mentor** is the pack's PNG resized to 317×260 (107KB, from 421KB); 2.5× its drawn size.
- **The Scout's bird** is the Contact list's binoculars bird (`DISCOVER_BIRD`), the one in the reference.
- **"Set a weekly goal"** opens the goal sheet in place (premise 2), defaulting to 5 a week.

## Changed strings

| String | File |
|---|---|
| "Top contributors win a weekly prize." (this page's founding card only, via `ranksLine`) | `v58/Dash58.tsx` (`FOUNDING_RANKS_F1`) |
| "Querying" / "Getting ready" / "Between rounds" (sentence case of the eyebrow) | `lib/dashFirstVisit.ts` (`campaignLabel`) |
| "Log a query", "Record a response", "Add an agent" (the card's buttons) | `f1/F1Book.tsx` |
| "Set a weekly goal", "query sent / queries sent", "agent added / agents added", "{n} weeks in a row" | `f1/F1Book.tsx` |
| "All activity", "Agents", "You" | `f1/F1Feed.tsx` |
| "That's the last 7 days.", "Show earlier", "Nothing new this week.", the headlines and figure labels | `lib/dashF1Feed.ts` |
| "Your next task", "To do · {kind}", "Do this task", "Do this task: {task}" | `v71/Dash71Task.tsx` |
| "Top tip", "From the Mentor · {i} of {n}" | `f1/F1Tip.tsx` |
| The Scout's words, "Tell me when it's ready", "We'll let you know" | `f1/F1Scout.tsx` |
| The footer's links, "Give feedback", "© 2026 QueryHawk" | `f1/F1Footer.tsx` |
| The dashboard layout line | `CLAUDE.md` |

No guide or Help Centre string changed (premise 1).

## The locks (DF1, `tests/e2e/dashFeedV1.measure.ts`)

**Red first, against the base** (`SA_E2E_BASE_URL=dev`, `index-4L_rFD9m.js`): **12 of 12 red** (`redfirst-base.txt`).
**Red by mutation, against the branch build** (`mutations.txt`), each against its own lock:

| Lock | Mutation | Red reading |
|---|---|---|
| A1 | 50/50 split | left 683.0 (417 ±4) |
| A2 | `position: static` | the feed's top 119.8 → −480.3 after a 600px scroll |
| A3 | leave three columns | the cards in two columns (x 268, 963) at 1280 |
| B1 | ring hard-coded "3 of 5" | "3 of 5" vs the goals page's 0 of 8 |
| C1 | cut the fill | every column past the last point 1% fill |
| C2 | founding card in the right column | not in the left column, not last |
| D1 | every event big (source) | 8 query-sent rows drawn as big cards |
| D2 | keep the tab | a tab on the page |
| E1 | the box goes elsewhere (source) | box: nothing opened; Do this task: the query's panel |
| E2 | height measured in JS (only the current tip laid out) | heights 359.2, 359.2, 334.4, 359.2 |
| E3 | slate band | rgb(106, 137, 167) |
| F1 | a dead Cookies link | /cookies lands on /dashboard |

E1's named mutation ("make the box complete it") would write to the shared account, so the break measured is the box
not going where "Do this task" goes; the lock's other half re-reads the plan after a fresh load and finds the task
still there.

**Green on the branch build** (`green-branch.txt`, ledgers in `ledger/`): **12 of 12, 113 readings.**

| Lock | Readings | Key green readings |
|---|---|---|
| A1 | 7/7 | 414.2 / 507.7 / 414.2 at 1512 collapsed, gaps 30.0 / 30.0, no header band |
| A2 | 10/10 | scrolled 600 at both sizes: the feed's top 119.8 → 119.8, the book card up 600.0; the feed's own scrollTop 200 |
| A3 | 10/10 | at 1280 and 1512 expanded: one card column, the feed beside it, Part A's order, the footer last |
| B1 | 9/9 | the sheet's top on the card's bottom; ring "0 of 8" = the goals page's 0/8; no goal → "Set a weekly goal", tiles and streak |
| C1 | 14/14 | Active pressed; body 224 / 224; Closed moves the next card 0; a grain column at 20–80% fill |
| C2 | 8/8 | last in the left column; "Top contributors win a weekly prize."; nothing clipped |
| D1 | 13/13 | three pills; Agents / You each non-empty and one-sided; full requests big with journeys; sends mini; seeded materials → 3 tiles (restored) |
| D2 | 4/4 | no tab, no drawer |
| E1 | 10/10 | the box and Do this task open the same query panel; the task still in the plan after a reload |
| E2 | 10/10 | the art inside the card; heights equal; a turn every 7049ms; holds through an 8s hover; › restarts (7052ms); still under reduced motion |
| E3 | 9/9 | band rgb(236, 211, 202); nothing focusable in the example; "We'll let you know" survives a reload (cleared after) |
| F1 | 9/9 | seven links each render their own route; Give feedback opens the dock |

## L1: no regression

Run against the branch build: dashboard v118, first visit v1, mobile v1, help system v1 (`l1-branch.txt`).

**Re-pointed, each with a note at the change** (all now pass, `l1-repointed.txt`):

- `dashFirstVisit` DFV-A, A2 "the founding card shows everything it shows after the first query" → "the founding card
  is drawn and nothing in it is cut". The querying page's card is now a full-size card in a scrolling column, so it is
  no longer the yardstick for the one-screen first-visit slot.
- `dashFirstVisit` DFV-A, A2 "the founding card ends above the feed tab" → "no feed tab (retired)".
- `dashFirstVisit` DFV-A, A3 "once a query exists, Record a response and QUERYING" → reads the manuscript card's
  buttons and its "Querying".
- `dashMobileV1` DM1-E1, "the header's Log a query / Record a response" → `[data-d58="buttons"], [data-df1="btn-record"]`.
- `dashV118` DB118-A1, before probing a hoop's stacks: press Closed (for the Closed hoop) and scroll the card into view.
- Unit locks re-pointed in Parts A and E: `dashboardPageSmoke`, `dashFirstVisit.test`, `artSlots.test`,
  `accountPrefs.test`.

**Not this pack's, left as they are:** 12 help-system cases (HS1-A1, B1, B3, C1–C6, D1–D3) are red on the branch and
**equally red on dev without this pack** (`l1-hs1-base.txt`, `l1-hs1-base-2.txt`). Every one is on the Contact list or
the Query Centre — `[data-cl19="pin"]`, an agent's panel, the status column, the page's three articles — none of which
this pack touches. (Those base runs read dev as it was served at the time; dev moved mid-pack from the base to phone
fixes v1, which changes phone files only.)

The suites' passing cases: dashboard v118 (all but A1, re-pointed), first visit v1 (all but DFV-A, re-pointed), mobile
v1 (all but DM1-E1, re-pointed), help system v1 (all but the 12 above).

## Shots

`shots/`, one beside each `screens/*` file at 2×: `01-desk-1512`, `01-desk-1280`, `02-desk-full-1512`,
`02-desk-full-1280`, `03-feed-agents-1512`, `03-feed-agents-1280`, `04-queries-closed-1512`, `04-queries-closed-1280`,
`05-sidebar-expanded-1512`.

{{DEPLOY}}

