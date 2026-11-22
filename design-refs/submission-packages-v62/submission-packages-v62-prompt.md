# Submission packages: rebuild the page to the v62 mock

You are working on QueryHawk (React, TypeScript, Vite, Firebase, Tailwind). This prompt asks you to rebuild the Submission packages page, under Materials, to match a mock. Read the whole prompt before you touch anything.

## 1. What this is

Submission packages is a Pro page. A package is everything one agent receives from the writer: a query letter, a sample from one version of the manuscript, and any extras. The writer picks a package when they log a query.

The page already exists. This work changes how it is laid out and what it says. It keeps what a package is, how one is created, and how one is chosen for new queries.

The idea behind the new page is one sentence: **send a few, see what comes back, change one thing, send again.** Each package is a record of exactly what went out, and of what came back for it.

## 2. Ground rules

- **Branch.** Work on a new branch in its own worktree, cut from the branch that dev serves. Deploy to dev only. Do not merge to main and do not deploy live.
- **Copy says only what the code does.** Every sentence on the page must be true of the running app. If a line in the mock describes something the app cannot do, stop and report it; do not ship the line and do not quietly build the feature to make it true.
- **Statuses are drawn only by the app's StatusDot component.** Do not draw your own status marks. The mock's small ring marks are stand-ins for StatusDot.
- **Use the app's own parts.** Shell, top bar, navy workspace header, drawers, snackbars, footer and buttons already exist. Reuse them. Do not restyle them and do not add a dependency.
- **Touch only this page.** Letters, Comps, Versions, Manuscript and the Log a query flow are out of scope, including their labels.
- **No green.** The app does not use green accents. Do not introduce any.
- **No percentages on this page.** Results are always counts ("2 of 4"). Samples are too small for percentages to be honest.

## 3. Reference files

These are in the usual QueryHawk designs folder.

| File | What it is |
|---|---|
| `submission-packages-v62.html` | The mock. Open it in a browser. It is the source of truth for layout, spacing, type and copy. |
| `screens/01-everyday-full-page.png` | The whole page in everyday use. |
| `screens/02-everyday-top.png` | Header, first-visit note, list, and the top of the open package. |
| `screens/03-unfinished-package-choosing-a-letter.png` | A package with no letter yet, with the letter picker open. |
| `screens/04-ready-package-not-sent.png` | A finished package that has not been sent. |
| `screens/05-retired-package.png` | A retired package, opened from the list. |
| `screens/06-pro-tag-after-first-visit-note.png` | The header after the note is dismissed, with the Pro tag and its tooltip. |
| `screens/07-change-package-for-new-queries.png` | The "Change" picker in the header. |
| `screens/08-how-it-works.png` | The How it works pop-up. |
| `screens/09-new-package-drawer.png` | The New package drawer. |
| `screens/10-nothing-sent-yet-full-page.png` | Packages exist but no query has gone out with any of them. |
| `screens/11-day-one-full-page.png` | No packages at all. |
| `screens/12-laptop-1280-full-page.png` | The page at 1280px wide. |
| `screens/13-phone-420-full-page.png` | The page at 420px wide. |
| `CHECKSUMS.txt` | SHA-256 of every file above. Check them before you start. |

About the mock:

- The dark strip at the very top ("Submission packages v62 · mock") is a set of mock controls. It is not part of the app.
- All names, agents, dates and numbers in the mock are sample data. Build from the app's real data.
- The mock's file contains some unused styles left over from earlier versions. Build from what you see rendered, not from every rule in the file.
- The hawk carrying boxes in the header is the page's existing illustration. Keep whatever the live page uses.

## 4. Before you build: read, then report

Do not write page code until you have answered these and posted the answers back. Several parts of the mock depend on them.

1. Where does the page live (route, component files), and which shared components does it use today?
2. What does a package store today? List the fields.
3. **Copied from.** When a package is copied, does the copy record which package it came from? If not, see 6.5.
4. **Queries.** How does a query record the package it went out with? Can you list every query for a package, with its agent, agency, date and current status?
5. **Status history.** For a query that got a partial or full request and was later rejected, can you tell that it was requested first? The verdict in 6.3 needs this.
6. **First sent.** Can you get the date of the first query logged with a package?
7. **Extras.** What extras can a package hold today? The mock shows "Author bio" and "Pitch sheet" plus a synopsis. Report what really exists.
8. **Synopsis.** Where does a synopsis come from, and can a writer have more than one?
9. **Founding writer banner.** Which component draws the current "Founding writer perk" band on this page, and how does it decide who sees it? Is there already somewhere to store per-user "I have seen this" flags?
10. **How it works.** What does the "How it works" button open today?
11. **Agent preview.** Does the page already show a preview of what an agent receives? If so, where does its text come from?

Stop and report, without building around it, if:

- queries cannot be listed per package (section 5.5 cannot be built), or
- there is no status history (rule 3 in section 6.3 cannot be evaluated), or
- anything in the mock's copy would be untrue in the app.

## 5. The page, top to bottom

Follow the mock for exact sizes, colours and spacing. This section says what each part is and how it behaves.

### 5.1 Header

The shared navy workspace header, unchanged in structure.

- Title: the number of packages that are not retired: "4 packages", "1 package". With none: "No packages yet".
- By-line: "for {manuscript title}".
- Buttons: "+ New package" and "How it works". With no packages the first reads "+ Make your first package".
- Right block: "New queries go out with", the current package's icon and name, then one line:
  - sent: "Sent to {n} agents, {m} asked to read more"
  - not sent: "{version name} · {letter name}, not sent yet"
  - then a "Change" button.
- "Change" opens a small list of packages that are finished and not retired. Each row shows icon, name, and "Sent to {n} agents" or "Not sent yet". Under the list: "A package needs a version and a letter before it can go out." Choosing one makes it the package for new queries and shows a snackbar "{name} now goes out with new queries." with Undo.
- Hide the right block when there are no packages.
- The collapsed header that appears on scroll shows the title, "{current name} goes out with new queries", and a "New package" button.

### 5.2 First-visit note and Pro tag

This replaces the "Founding writer perk" band **on this page only**.

- The first time a founding writer opens this page, show one slim line under the header: a small hawk disc, "**Packages is a Pro page.** It's free for you as a founding writer.", and a "Got it" button.
- "Got it" removes the note for good, for that user. It must not come back on reload or on another device.
- Once the note is gone, show a small "Pro" tag after the page title. On hover or keyboard focus it shows "Free for you as a founding writer".
- Writers who are not founding writers see neither the note nor the tooltip. Report what they see on this page today and leave that alone.
- There is no "Tell us what you think" button on this page. Feedback stays in the side rail.
- If there is no existing place to store the dismissal, report that before adding one.

### 5.3 Your packages (left column)

A framed card with a sand band: "Your packages" and, on the right, "{n} packages".

One row per package that is not retired. Each row has:

- the package's icon in a disc,
- its name, with an "In use" tag on the package that goes out with new queries,
- one line of what is in it: "{letter name} · sample from {version name}". Missing pieces read "No letter yet" and "no sample yet",
- one result line:
  - replies in: "**{asked} of {replied}** asked to read more"
  - sent, no replies: "Sent to {n} agents, no replies yet"
  - finished, not sent: "Ready to send"
  - unfinished: "Needs a query letter", "Needs a manuscript version", or "Needs a version and a letter".

The selected row has a tinted background. Clicking a row opens that package on the right.

Foot of the card: "New package →" on the left. On the right, "Retired ({n})" when any exist; it toggles to "Hide retired" and adds the retired packages to the list, each with a grey "Retired" tag.

The card stays in view while the right column scrolls.

### 5.4 The open package (right column, first card)

**Navy band**

- Icon disc, the package name, and one line of context joined with " · ": the writer's note, "Sent in {month}", "Copied from {name}". Leave out any part that does not apply. With nothing at all: "No note yet. Who is this package for?"
- Buttons, in this order:
  - the package for new queries shows a white pill "In use for new queries" (not a button),
  - a finished package that is not in use shows "Use for new queries",
  - a retired package shows "Retired",
  - then "Edit" and "Make a copy" on every package.

**Left half: "What's in it"**

Two groups, each a short list of rows. A sent or retired package shows "As it went" beside the heading and has no controls.

*Always sent*

| Row label | Value | Second line |
|---|---|---|
| Query letter | the letter's name | the letter's own description |
| Sample | "From {version name}" | the version's own description |

*Only if an agent asks*

| Row label | Value | Second line |
|---|---|---|
| Synopsis | the synopsis's name, or "None" | its description |
| Other extras | the chosen extras, comma-separated, or "None" | |

Each row starts with a round mark: filled navy with a tick when the row has a value, an empty ring when it does not. An empty required row reads "Not chosen yet".

On a package that has not been sent, each of the first three rows has a link on the right: "Choose" (required, empty), "Add" (synopsis, empty), "Change" (filled), "Close" (while open). The link opens a list of options directly under the row, one option per line with a radio mark. Choosing an option saves at once and closes the list. An open synopsis list with a synopsis chosen also offers "Send no synopsis". After choosing a version on a package with no letter, open the letter list next.

"Other extras" on an unsent package shows the available extras as toggle chips under the row.

The row label is "Sample", never "Manuscript sample" or "Sample taken from". The value carries the "From".

Under the lists on a sent package: a quiet line with a lock icon, "Sent, so it can't be changed. Make a copy to try something different." On a retired one: "Retired, so it can't be changed. Make a copy to try something different."

**Right half: "What an agent receives"**

The preview of the query as an agent would see it, drawn as a sheet of paper, with "Preview" beside the heading. Under it, "Sent with it": one line each for the sample ("Sample taken from {version name}"), the synopsis if any, and each extra with "if asked". With no letter chosen the sheet reads "Your query letter goes here."

If the page already has this preview, keep how it gets its text. If it does not, report before building it.

**Foot of the card, unsent packages only**

- finished: "Not sent yet, so you can still change any piece."
- unfinished: "A package needs a letter and a sample before it can go out."

### 5.5 What came back (right column, second card)

Shown only when at least one query has gone out with the package. A stone band: "What came back" and, on the right, "Sent in {month}".

**Left half**

- Three figures in a row: sent, replied, asked to read more. Definitions in 6.2.
- The verdict: a short heading and one sentence. Rules and exact words in 6.3. When the verdict says something needs fixing and the package is not retired, add a button "Copy it and change something".
- If the package was copied from another: "Copied from **{name}**, where **{asked} of {replied}** asked to read more." followed by a chip for each change (6.5). If the parent has no replies, end the sentence after the name.

**Right half: "Who got it"**

Beside the heading: "{n} agents" and, if any have not replied, ", {k} still to reply".

One row per query: the status drawn by StatusDot, the agent's name, the agency, the status in the app's own words, and the date sent. Under the list: "See these in Queries →", which opens Queries filtered to this package.

Use the app's status names here. The mock's wording ("Asked for a partial, still reading") is a guide to the level of detail, not text to copy.

### 5.6 All your packages, side by side

A full-width framed card under the two columns. Stone band: "All your packages, side by side" and, on the right, "In the order you sent them" (or "Nothing sent yet").

A plain table, one row per package including retired ones:

| Column | Contents |
|---|---|
| Package | icon, name, "In use" or "Retired" tag, and the same contents line as the list |
| Sent | count, or "–" |
| Replied | count, or "–" |
| Asked to read more | count, or "–" |
| What it tells you | the verdict heading; or "Not sent yet"; or what the package still needs |

Order: sent packages by the date of their first query, oldest first; then unsent packages.

Under the table, when anything has been sent: "{total} queries have gone out with a package. {replied} agents have replied and {asked} asked to read more."

Clicking a row, or pressing Enter on it, opens that package in the right column and scrolls back up to it. If it is retired, show retired packages in the list.

### 5.7 Other states

- **Nothing sent yet** (`10-…png`). The list and the open package show as normal. There is no "What came back" card. The table shows dashes.
- **Day one** (`11-…png`). No list, no open package, no table. Under the header and note: one framed card, "How it works", holding the same storyboard as the pop-up (5.8), and under it "A package needs a version and a letter before it can go out."
- **Retired** (`05-…png`). Opens like any sent package, read-only.

### 5.8 How it works

The "How it works" button opens a pop-up titled "How packages work", with one line under the title: "A package is how you answer the four things every agent wants to know." Then a four-row storyboard, then a "Got it" button.

Build it exactly as drawn in `08-how-it-works.png`. It names no real letters, versions or packages.

1. **What the agent wants to know.** Four speech bubbles: "Who are you?", "What's the book about?", "Where does it fit?", "Can you write, and is it for me?"
2. **What gives them their answer.** A bracket gathers the first three questions into a card "Your query letter / one of your letters", with a small tag "names your comps". The fourth question drops into a card "Your manuscript sample / taken from one of your versions". Both cards are drawn as the top sheet of a small stack.
3. **The things you send.** One navy strip, also drawn as a stack: "A package", then "Query letter", "Manuscript sample", a plus sign, and an outlined "anything else they ask for". Under them: "Mix them however you like, and make as many as you want. A package is locked once it's sent."
4. **What happens next.** Three pills joined by arrows: "Send it to a few agents", "See what comes back", "Change one thing, go again".

Do not delete whatever "How it works" opens today. Stop using it on this page and say in your report where it lives.

### 5.9 Creating, editing, copying, deleting

Keep the existing drawer and its fields (name, "Who is it for?", icon). Wording:

- New: title "New package", line "Name it, then pick its pieces on the page.", button "Create package". After creating, open the new package with the version list open, and show "{name} created. Pick its pieces." with Undo.
- Edit: title "Edit package", line "Rename it, or change its icon or its note.", button "Save". Snackbar "Saved." with Undo.
- Delete is offered only on a package that has never been sent: "Delete this package". Otherwise the drawer says "You can't delete this package because agents have received it." Snackbar "{name} deleted." with Undo.
- "Make a copy" creates "{name} copy" with the same pieces and nothing sent, records which package it was copied from, opens it, and shows "Copied. Change a piece, then send it." with Undo.

## 6. Rules

### 6.1 Finished, sent, locked

- A package is **finished** when it has a query letter and a version.
- A package is **sent** once any query has been logged with it.
- A sent or retired package cannot be changed. Its pieces show without controls.
- Only a finished package that is not retired can be the one for new queries.

### 6.2 The three counts

For one package, over the queries logged with it:

- **Sent**: all of them.
- **Replied**: queries where the agent has answered. That is any request, any offer, and any rejection. A query still waiting does not count. A query the writer closed as no response, or withdrew, does not count.
- **Asked to read more**: queries that have ever had a partial or full request, including ones later rejected and ones that became an offer.

Tell me in your report exactly which of the app's statuses you mapped to each count.

### 6.3 The verdict

Work through these in order and stop at the first that fits. "Replied" and "asked" are the counts above.

| # | When | Heading | Sentence |
|---|---|---|---|
| 1 | replied is under 4 | Too early to say | "{replied} of {sent} have replied. Wait for {4 − replied} more before you change anything." With no replies the first sentence is "No one has replied yet." On a retired package leave out the second sentence. |
| 2 | asked is 0 | No one has asked to read more | "{replied} agents replied and none asked for pages. Look at your letter and your opening before you send again." |
| 3 | at least 2 requests were later rejected, and no request is still open | Agents ask for more, then pass | "Your letter and opening are getting you read. The passes are coming after that, so look at the manuscript itself." |
| 4 | asked is at least half of replied | This is working | "{asked} of {replied} agents who replied asked to read more. Keep sending it." On a retired package leave out the second sentence. |
| 5 | anything else | Some interest | "{asked} of {replied} agents who replied asked to read more." |

Styling follows the mock: rule 4 on navy, rules 2 and 3 on blush with the "Copy it and change something" button, rules 1 and 5 on stone.

These thresholds are a first guess. Put the number 4 and the "half" test in one place so they are easy to change.

### 6.4 Dates

"Sent in {month}" uses the month of the first query logged with the package. Add the year if it is not the current year.

### 6.5 Copied from, and what changed

Compare a package with the one it was copied from and list each difference as a short chip:

- a piece added: "Added a {query letter | manuscript version | synopsis} ({name})"
- a piece removed: "Took out the {piece}"
- a piece swapped: "Swapped the {piece}: {old name} to {new name}"
- an extra added or removed: "Added the {extra}" / "Took out the {extra}", with the extra's name in lower case.

If packages do not record what they were copied from today:

- start recording it on every copy made from now on,
- show nothing for older packages (no "Copied from" in the band, no comparison in "What came back"),
- do not try to guess a parent for existing packages.

If the parent has since been deleted, show nothing.

## 7. Responsive

- **1380px and below**: the two halves of each right-hand card stack, as in `12-laptop-1280-full-page.png`.
- **900px and below**: the list sits above the open package and no longer stays in view on scroll; the table drops its Sent and Replied columns; the storyboard stacks, as in `13-phone-420-full-page.png`.
- Nothing may scroll sideways at any width from 360px up.

## 8. Accessibility

- Every control is a real button or link, reachable by Tab, with a visible focus ring.
- List rows mark the open package with `aria-current`. Table rows are focusable and open on Enter.
- Option lists are radio groups. Extras chips are toggle buttons with `aria-pressed`.
- The pop-up and drawer trap focus, close on Escape, and return focus to the button that opened them.
- The right column announces changes politely when a different package is opened.
- Respect reduced-motion settings.

## 9. Not in this work

- Any change to Letters, Comps, Versions, Manuscript, Queries or Log a query.
- An open-ended "add anything" extras feature. Use the extras that exist today.
- Any ranking, podium, percentage or chart on this page.
- Changes to the founding writer band on other pages.
- Merging to main.

## 10. Done when

- [ ] Checksums verified and section 4 answered before any page code was written.
- [ ] Each state matches its screen: everyday, unfinished, ready, retired, nothing sent, day one.
- [ ] The first-visit note shows once per founding writer, stays dismissed, and leaves the Pro tag behind.
- [ ] "What's in it" uses the two groups, and the sample row reads "Sample · From {version}".
- [ ] The three counts and the verdict follow 6.2 and 6.3, with the threshold in one place.
- [ ] "Copied from" and the change chips appear only where a real parent is recorded.
- [ ] "Who got it" uses StatusDot and the app's status names, and links through to Queries.
- [ ] No percentages and no green anywhere on the page.
- [ ] Every sentence on the page is true of what the app does.
- [ ] Works by keyboard alone; nothing scrolls sideways from 360px up.
- [ ] Deployed to dev only, on its own branch.

## 11. What to send back

1. Your answers to section 4.
2. The status mapping you used for 6.2.
3. Anything in the mock you could not build as drawn, and what you did instead.
4. Any copy you changed to keep it true, with the old and new wording.
5. The branch name and the dev URL.
