/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1, Part A — THE ARTICLES. Every sentence says what the app does today, checked against the code on
 * 20 Oct 2026; nothing here promises a figure, a judgement or a feature the app does not have. QueryHawk never writes or
 * sends a letter or a nudge, and no article implies it does.
 *
 * ⚠️ `draft: true` is an article written from the app's behaviour and not yet reviewed by Nick. It carries a DRAFT tag
 *    on dev builds and none in production (`showDrafts`).
 * ⚠️ AN ARTICLE A GUIDE ITEM OR THE HELP MENU LINKS TO MUST BE HERE (lock HC1-C5): `lib/helpArticles` builds the live
 *    list from this file, and a link to a slug missing from it falls back to /help.
 * ⚠️ "Add an agent" is the mock's article (design-refs/help-system-v1), with four sentences corrected where the mock
 *    described something the app does not do; the report lists them.
 */
import type { HelpArticle } from "./model";

const CL = "Contact list";
const QC = "Query Centre";
const D = "2026-10-20";

export const HELP_ARTICLE_LIST: readonly HelpArticle[] = [
  /* ═══════════ Queries ═══════════ */
  {
    slug: "log-a-query", area: "queries", title: "Log a query", draft: true, updated: D,
    lede: "Every query you send gets one entry: who you sent it to, which book, when, and what went with it.",
    guide: { page: QC, key: "log" },
    steps: [
      { title: "Open the drawer", body: "Press `+ Log a query` on the Query Centre, or `Log a query` in the top bar on any page. The drawer opens on the right." },
      { title: "Agent and book", body: "Choose the agent and the manuscript. If you already have a live query with them, or with someone at the same agency, the drawer says so." },
      { title: "Sending", body: "Set the date you sent it and how you sent it." },
      { title: "What you sent", body: "Attach a submission package, or choose the pieces one by one: query letter, synopsis, and how much of the book." },
      { title: "If they don't reply", body: "Check the date a reply is expected and say whether no reply means no. Then choose `Remind me to nudge`, `Close it` or `Do nothing`. `Close it` closes the query as no reply once that date passes. Press `Log query` to save." },
    ],
    related: ["record-a-response", "expected-dates", "build-a-package", "status-key"],
  },
  {
    slug: "find-a-query", area: "queries", title: "Find a query", draft: true, updated: D,
    lede: "Search and filter the Query Centre's list until it shows the queries you want.",
    guide: { page: QC, key: "find" },
    body: "Type into `Find an agent or agency` above the list, or press `/` to jump there. It matches the agent's name and the agency recorded on the query.\n\n"
      + "Press `Filters` for more. `Your move`, `Overdue`, `Waiting to hear back` and `Offers` sit at the top, then every stage under Where it stands, what you sent, and a few more such as due this week. Filters add up, and the button shows how many are on.\n\n"
      + "The export button downloads the queries the list is showing.",
    related: ["open-a-query", "status-key", "pin-the-list", "birds-eye-view"],
  },
  {
    slug: "open-a-query", area: "queries", title: "Open a query", draft: true, updated: D,
    lede: "Click a row and the query opens beside the list: where it stands, its whole story, and your next move.",
    guide: { page: QC, key: "open" },
    body: "The panel's top line gives the agent, the agency, the status and how many days it has been since you queried. `Tracking` shows each step so far, `Agent` shows what you know about them, and `Notes` holds your own notes.\n\n"
      + "The button at the foot is the next move for where the query stands: `Mark partial sent` once you've sent requested pages, `Record your answer` for an offer, `Nudge` once a reply is past its expected date, and otherwise `Record a response`. The `···` menu beside it has the rest, including `Delete query`.",
    related: ["record-a-response", "status-key", "expected-dates", "find-a-query"],
  },
  {
    slug: "record-a-response", area: "queries", title: "Record a response", draft: true, updated: D,
    lede: "When an agent replies, record it on the query. The status moves on, and your to-do list follows.",
    guide: { page: QC, key: "resp" },
    steps: [
      { title: "Choose the query", body: "Open the query and press `Record a response`. Or press it in the Query Centre's header and pick the query from the list." },
      { title: "What they said", body: "Choose `Partial requested`, `Full requested`, `Revise & resubmit`, `Pass` or `Offer`." },
      { title: "The detail", body: "Answer what it asks next: what they'd like to see and when you'll send it, what they'd like revised, any feedback, or the terms of an offer." },
      { title: "Save", body: "Press `Save response`." },
    ],
    body: "No reply isn't a response. When you decide to stop waiting, press `Close query` on the query and choose `No reply`.",
    tip: { label: "TRY IT FIRST", text: "The Query Centre's page guide has a practice query. Record a response on it: nothing is saved." },
    related: ["status-key", "partials-and-fulls", "open-a-query", "log-a-query"],
  },
  {
    slug: "birds-eye-view", area: "queries", title: "Birds-eye view", draft: true, updated: D,
    lede: "Every live query on one timeline, so you can see what is due and what has gone quiet.",
    guide: { page: QC, key: "birds" },
    body: "Press the floating `Birds-eye view` tab on the Query Centre, or press `B`. The tab shows how many queries are overdue and how many are coming up.\n\n"
      + "Queries are grouped by urgency to begin with: overdue, upcoming, watch and wait, and no date. You can group and sort another way, and narrow the view by name, by when, or by stage. Closed queries aren't shown.",
    related: ["expected-dates", "find-a-query", "status-key", "open-a-query"],
  },
  {
    slug: "status-key", area: "queries", title: "Status key: every ring explained", draft: true, updated: D,
    lede: "Each query wears a ring that says where it stands. Dashed means the agent has asked for something; solid means you've sent it.",
    body: "The centre says what is in play: half filled for a partial, full for the whole manuscript, a bar for a query that has closed. The words beside a closed query say how it closed.",
    related: ["partials-and-fulls", "record-a-response", "expected-dates", "log-a-query"],
  },
  {
    slug: "expected-dates", area: "queries", title: "Past expected: what it means", draft: true, updated: D,
    lede: "A query is past expected when it is waiting on the agent and the date a reply was expected has come.",
    body: "The expected date comes from you or from the agent. If you gave a date when you logged the query, that is the one. Otherwise QueryHawk counts the agent's reply time from the day you last sent them something. With no reply time and no date from you, a query has no expected date, so it never shows as past expected.\n\n"
      + "Only a query waiting on the agent can be past expected: queried, partial sent, full sent, or resubmitted. Once it is your move, the date stops counting.\n\n"
      + "Past expected says only that the date has come.",
    related: ["reply-times", "response-policy", "when-to-nudge", "birds-eye-view"],
  },

  /* ═══════════ Agents ═══════════ */
  {
    slug: "add-an-agent", area: "agents", title: "Add an agent", updated: D,
    lede: "Every query starts with an agent on your list. Add one by hand in under a minute, or bring a spreadsheet in all at once.",
    guide: { page: CL, key: "add" },
    steps: [
      { title: "Open the editor", body: "On the Contact list, press `+ Add an agent` in the header. The editor slides in from the right so your list stays in view." },
      { title: "Name and agency", body: "A name or an agency is enough to start. Add the country and city if you know them. Each agent sits on their own, even if two share an agency." },
      { title: "What they're looking for", body: "On `What they want`, pick genres from the list, and paste their wishlist in their own words. Genres tell QueryHawk which agents take your book's genre." },
      { title: "Response policy", body: "On `How to query`, set how long they take to reply, and choose `No response means no` or `Always replies`. The reply time is how QueryHawk works out when a query has gone past its expected date; the policy decides what your to-do list suggests after that." },
      { title: "Save", body: "Press `Add to your list`. Any gap List health counts shows up there, ready for later." },
    ],
    figure: "Screenshot slot: the add-agent editor, filled with an example agent",
    tip: { label: "QUICKER WITH A LIST", text: "Got agents in a spreadsheet already? Bring them in with Smart import: press ⌘K (Ctrl K on Windows), type Import, and open the page." },
    related: ["smart-import", "list-health", "response-policy", "status-key"],
  },
  {
    slug: "find-an-agent", area: "agents", title: "Find an agent", draft: true, updated: D,
    lede: "Search by name or agency from the box above the list. Results narrow as you type.",
    guide: { page: CL, key: "search" },
    body: "Type into `Find an agent` above the list, or press `/` to jump there. It matches any part of an agent's name or their agency, whatever the capitals.\n\n"
      + "The list narrows as you type. Clear the box to see everyone again.",
    related: ["open-an-agent", "pin-the-list", "add-an-agent", "list-health"],
  },
  {
    slug: "pin-the-list", area: "agents", title: "Pin the list", draft: true, updated: D,
    lede: "Pinning gives the list the whole page and tucks the header away. Unpin to bring it back.",
    guide: [{ page: CL, key: "pin" }, { page: QC, key: "pin" }],
    body: "The Contact list and the Query Centre both pin the same way, and this article is for both.\n\n"
      + "Press `Pin list` in the list's toolbar, or press `F`. The header folds away and a navy band takes its place, carrying the page's figures and its add button. On the Query Centre the sidebar tucks away too, for more room.\n\n"
      + "Press `Unpin`, or `F` again, to bring the header back. QueryHawk remembers the pin on this device.",
    related: ["find-an-agent", "find-a-query", "open-an-agent", "open-a-query"],
  },
  {
    slug: "open-an-agent", area: "agents", title: "Open an agent's card", draft: true, updated: D,
    lede: "Click any row to open the agent: wishlist, genres, materials and every exchange you have had.",
    guide: { page: CL, key: "open" },
    body: "Click a row on the Contact list and the agent opens in a panel on the right. The list stays where it was.\n\n"
      + "`Profile` shows the genres they're after, their wishlist, how to query them (how to send, how long they take to reply, their response policy), what to send them, and your queries to them. `History` and `Notes` sit beside it.\n\n"
      + "The `···` menu holds the rest, such as opening their queries in the Query Centre.",
    related: ["edit-an-agent", "find-an-agent", "response-policy", "list-health"],
  },
  {
    slug: "edit-an-agent", area: "agents", title: "Edit an agent", draft: true, updated: D,
    lede: "Change any detail from the agent card. If a change affects your reports, the editor tells you which.",
    guide: { page: CL, key: "edit" },
    body: "Open the agent, then press `Edit profile` at the foot of the panel. The editor has three tabs: `Details`, `What they want` and `How to query`.\n\n"
      + "When a change reaches something else, the editor says so before you save. A new reply time moves the expected date on queries waiting on that agent, and the editor shows the dates it would move. Changes to their name, their door, their genres or their response policy say what they touch too.\n\n"
      + "Press `Save changes` when you're done, or `Cancel` to leave everything as it was.",
    related: ["open-an-agent", "reply-times", "response-policy", "list-health"],
  },
  {
    slug: "list-health", area: "agents", title: "What List health measures", draft: true, updated: D,
    lede: "List health is the share of useful details your list has filled in. Each gap you fill helps tracking and suggestions.",
    guide: { page: CL, key: "hk" },
    body: "Each agent can hold five details QueryHawk uses: their reply time, the materials they want, their genres, their wishlist and, for an agent closed to queries, the date they reopen. List health is how many of those your list has, out of all it could have.\n\n"
      + "Reply time counts most, because it is how QueryHawk works out when a query is past its expected date. If an agent doesn't state one, say so in Housekeeping and it stops counting as a gap.\n\n"
      + "To fill gaps one at a time, press `Fill in the gaps` in the header, press the List health ring, or press `H`. Housekeeping opens beside your list. `Later` hides a gap for 30 days, but it still counts until it is filled.",
    related: ["add-an-agent", "edit-an-agent", "reply-times", "response-policy"],
  },
  {
    slug: "response-policy", area: "agents", title: "Response policy explained", draft: true, updated: D,
    lede: "Whether an agent replies to every query or treats silence as a no. QueryHawk uses it to decide what to suggest once a reply is past its expected date.",
    body: "Set it on the agent's `How to query` tab: `No response means no` or `Always replies`. Until you choose, it reads Not stated. When you log a query, the drawer asks the same question for that query.\n\n"
      + "It doesn't change when a query goes past its expected date: that comes from the reply time. What it changes is your to-do list. Two weeks after a reply was due, a query to an agent marked `No response means no` brings a suggestion to close it. Any other agent's brings a suggestion to send a nudge, and closing is suggested later if the nudge goes unanswered.\n\n"
      + "QueryHawk never sends a nudge for you. It reminds you, and records the one you send.",
    related: ["when-to-nudge", "expected-dates", "reply-times", "edit-an-agent"],
  },

  /* ═══════════ Materials ═══════════ */
  {
    slug: "save-a-version", area: "materials", title: "Save a new version", draft: true, updated: D,
    lede: "A version is a named record of your manuscript as it stood: what changed, and how long it was.",
    body: "On Manuscripts, press `+ New version`. Give it a name, say what changed, and add the word count if you know it. Press `Save version` and it becomes the current version.\n\n"
      + "QueryHawk keeps the record, not the file, so there is nothing to upload. When you build a submission package, you choose which version it sends.",
    related: ["build-a-package", "add-comparable-titles", "log-a-query"],
  },
  {
    slug: "build-a-package", area: "materials", title: "Build a submission package", draft: true, updated: D,
    lede: "A package is the set of materials you send with a query: your letter, a synopsis, and which version of the book.",
    steps: [
      { title: "Start one", body: "On Submission packages, press `+ New package`." },
      { title: "Name it", body: "Give the package a name you'll recognise when you log a query." },
      { title: "What goes in it", body: "Choose the query letter, a synopsis or `No synopsis`, the manuscript version, and anything else it sends." },
      { title: "Save", body: "Press `Create package`." },
    ],
    body: "The pages you send each agent are recorded on the query itself, not in the package. Choose `Use for new queries` from a package's `More` menu to mark the one you're sending now.\n\n"
      + "Once a package has gone out, the text of what it sent is fixed. Changing its contents starts its next edition, and `Duplicate` makes a copy you can change freely.",
    related: ["save-a-version", "log-a-query", "add-comparable-titles"],
  },
  {
    slug: "add-comparable-titles", area: "materials", title: "Add comparable titles", draft: true, updated: D,
    lede: "Comps are the books, films and shows you set beside yours in a query letter.",
    steps: [
      { title: "Start one", body: "On Comparable titles, press `+ Add a comp`, or press `N`." },
      { title: "What it is", body: "Choose Book, Film, TV or Other, and give the title. The rest is optional: who made it, who published it, and the year." },
      { title: "Why it fits", body: "Add what it shares with your book, and a line in your own words." },
      { title: "Save", body: "Press `Add comp`, or `Add and add another`." },
    ],
    related: ["build-a-package", "save-a-version"],
  },

  /* ═══════════ Tasks ═══════════ */
  {
    slug: "how-tasks-are-created", area: "tasks", title: "How tasks are created", draft: true, updated: D,
    lede: "Most of your to-do list writes itself from your queries and agents. You add the rest.",
    body: "When an agent asks for pages, a task asks you to send them. Two weeks after a reply was due, a task suggests a nudge or closing the query, depending on the agent's response policy. Offers, revise and resubmit requests, and gaps in an agent's details each bring a task of their own.\n\n"
      + "The list groups them: `Your move`, `Worth a nudge`, `Gone quiet`, `Housekeeping`, and `Your tasks`, which holds the ones you add yourself with `+ Add a task` or `N`.",
    related: ["finish-a-task", "pin-a-note", "response-policy", "when-to-nudge"],
  },
  {
    slug: "finish-a-task", area: "tasks", title: "Finish a task", draft: true, updated: D,
    lede: "Finishing a task means doing what it asks. The task goes once the query shows it is done.",
    body: "Open a task on the To-do list and press its button, such as `Record a nudge` or `Decide what to do`. The same drawer opens as on the Query Centre, so the query is updated in one place, and the task clears because the query has moved on.\n\n"
      + "A task you added yourself has `Tick it off`.",
    related: ["how-tasks-are-created", "record-a-response", "pin-a-note"],
  },
  {
    slug: "pin-a-note", area: "tasks", title: "Pin a note to the Corkboard", draft: true, updated: D,
    lede: "The Corkboard holds the notes you want in front of you.",
    body: "On the Corkboard, choose a pad colour under `Add to your board`, write your note, and press `Pin it`.\n\n"
      + "You can pin one from the To-do list too: press `+ Add a task`, switch to `✎ Note`, and press `Pin the note`.",
    related: ["how-tasks-are-created", "finish-a-task"],
  },

  /* ═══════════ Getting set up ═══════════ */
  {
    slug: "smart-import", area: "setup", title: "Smart import", draft: true, updated: D,
    lede: "Bring in the queries you've already sent from a spreadsheet, and QueryHawk reads the columns for you.",
    body: "Open the Import page: press ⌘K (Ctrl K on Windows) and type Import. Under Smart import, press `Import a spreadsheet` and choose a .csv, .xlsx or .xls file. QueryHawk works out which column is which and shows you what it found before anything is saved.\n\n"
      + "An agent already on your list isn't added twice. A row it can't read, such as one with no agent name or agency, is left out and listed on your Dashboard so you can see what was skipped.\n\n"
      + "A free account has one Smart import, and Pro has one each month. The template and matching your own columns are always free.",
    related: ["download-the-template", "add-an-agent", "log-a-query"],
  },
  {
    slug: "download-the-template", area: "setup", title: "Download the template", draft: true, updated: D,
    lede: "Prefer to fill in a sheet yourself? Use QueryHawk's template and nothing needs matching.",
    body: "On the Import page, press `Download the template` to get QueryHawk-template.xlsx. Fill in a row for each query, then press `Upload my sheet`.\n\n"
      + "The template is always free, with no limit on how often you use it.",
    related: ["smart-import", "log-a-query"],
  },
  {
    slug: "your-account-and-data", area: "setup", title: "Your account and data", draft: true, updated: D,
    lede: "Your settings, how to take your data with you, and how to close your account.",
    body: "Settings has seven sections: Profile, Sign-in & security, Plan & billing, Notifications, Preferences, Tasks and Your data. Your home country is how QueryHawk tells agents at home from agents abroad.\n\n"
      + "Under Your data, `Download a copy` saves everything you've put in as one JSON file.\n\n"
      + "To close your account, type DELETE and press `Schedule deletion`. You have 14 days to change your mind with `Cancel deletion`. During the beta, deletions are completed by hand after that.",
    related: ["smart-import", "download-the-template"],
  },

  /* ═══════════ Querying basics ═══════════ */
  {
    slug: "partials-and-fulls", area: "basics", title: "What a partial and a full are", draft: true, updated: D,
    lede: "An agent who wants to read more after your query asks for a partial or a full.",
    body: "A **partial** is part of the manuscript, usually the opening chapters or a set number of pages. A **full** is the whole manuscript. Some agents ask for a partial first, then a full.\n\n"
      + "In QueryHawk a request shows as a dashed ring: half filled for a partial, full for a full. Record the request with `Record a response`. When you've sent the pages, press `Mark partial sent` or `Mark full sent`: the ring turns solid, and the query is waiting on the agent again.",
    related: ["status-key", "record-a-response", "build-a-package"],
  },
  {
    slug: "reply-times", area: "basics", title: "Reply times, and what QueryHawk does with them", draft: true, updated: D,
    lede: "Most agents say how long they take to reply. Put it on their profile and QueryHawk keeps the dates for you.",
    body: "Set an agent's reply time on their `How to query` tab, in weeks. QueryHawk counts it from the day you last sent them something, to give each query an expected date, and shows the query as past expected once that date comes.\n\n"
      + "If an agent doesn't say, leave it unset. QueryHawk doesn't guess a reply time, so their queries have no expected date unless you give one when you log the query.\n\n"
      + "Changing a reply time moves the expected date on every query waiting on that agent, and the editor shows which before you save.",
    related: ["expected-dates", "response-policy", "when-to-nudge", "edit-an-agent"],
  },
  {
    slug: "when-to-nudge", area: "basics", title: "When to send a nudge", draft: true, updated: D,
    lede: "A nudge is a short follow-up to an agent who hasn't replied. QueryHawk reminds you; you write and send it.",
    body: "Check the agent's own guidance first. An agent marked `No response means no` doesn't expect one, so QueryHawk never suggests a nudge for them.\n\n"
      + "For any other agent, your to-do list suggests a nudge two weeks after the reply was expected. You can also ask for a reminder when you log the query, with `Remind me to nudge`.\n\n"
      + "When you've sent one, record it on the query with `Nudge` and choose `I've sent a nudge`. Add the date, and paste what you said if you'd like a record. QueryHawk never writes or sends a nudge for you.",
    related: ["response-policy", "expected-dates", "reply-times", "how-tasks-are-created"],
  },
];

const BY_SLUG = new Map(HELP_ARTICLE_LIST.map((a) => [a.slug, a]));
export function articleBySlug(slug: string): HelpArticle | undefined {
  return BY_SLUG.get(slug);
}
