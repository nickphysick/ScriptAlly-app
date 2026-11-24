# Add an agent v2 — the journey rebuilt as the third in the family, and "Quick actions" in the top bar

Dev only. Desktop only (768px and up). UK spelling throughout.

## Global rules

- Work in your own worktree on a new branch `add-agent-v2`, cut from the branch dev currently serves (find it in Step 0; do not assume it is `main`, which is behind the dev line). One session per worktree.
- Commit with `git commit --only -- <explicit paths>`. Never `git add -A`. One commit per phase.
- Record baseline `tsc`, build and Vitest before any edit. The gate is "no worse than baseline", not "green". Read the whole output, never a `tail`.
- `git diff --name-only HEAD` must be empty before you trust any gate result.
- Deploy to dev when finished. Do not merge to `main`. Do not touch prod, and do not change prod database rules. If any phase needs a rules change, stop and report it.
- Do not run any eval or test that spends API money.
- The design ref is the oracle, not your judgement. Port it wholesale: its markup, class names and values. Do not translate it to prose and rebuild from the prose. Where the ref uses a part the app already has, use the app's own part and read its values from the code, not from the mock.
- Copy asserts only what the code does. If a line in the ref claims something the app does not do, stop and report it; do not ship the claim and do not invent the feature.
- Desktop copy never says "tap". No small uppercase mono labels above text. No green anywhere.
- Name false premises at the top of your report before describing any fix.

## Design ref

Commit the pack to `design-refs/add-agent-v2/` as Phase 0:

- `add-agent-v2.html` — the normative, clickable mock. SHA256 `ee5f10b8f4f0567558ef864a160ee8a750340a5cafc29133e682a569f03e1189`
- `screens/01` to `screens/21` — every state, numbered in journey order
- `SHA256SUMS`

Verify the hash before reading the ref. If the file is absent or the hash differs, STOP and report. Do not fall back to `design-refs/add-agent-v1/` or any older ref.

The grey review bar at the top of the mock is not part of the design. The mock redraws the agent card preview inside an embedded frame only so that it can stand alone; in the app the preview is the real agent card component (see B7).

## Step 0 — recon gate (read only, then report before editing)

Report each of these, then carry on unless a red gate fires.

1. Which branch dev serves, and that `add-agent-v2` is cut from it. Whether these are on that line yet: Log a query v2.3, Record a response v2, Agent card v2.2, Plumage colours v3.
2. The Log a query journey as built: its panel, header, track, stage body and footer components and its stylesheet (`qcLogStages.css`, the `.laq-*` and `.flh-*` classes). The Record a response v2 journey: how it reuses those parts and how it carries its own identity (the Archivist's head, the status colour).
3. The Add an agent journey as built ("Adding new agent", add agent v1): its component, every field it saves and the exact shape each is saved in, and every door that opens it. Expect at least: the top bar menu, the Dashboard header's "Add an agent", the Contact list's own add control, the Contact list empty state, Log a query's "add a new agent" on its first step, and any To-do or Next up task.
4. The top bar's "Log a query" split button and its menu in `WorkspaceShell` (`.ws-pagebar`): the component, what each row opens, and whether any page swaps it for something else.
5. The agent card component (agent card v2.2) and whether it can be drawn read-only from an unsaved agent object.
6. Whether the Contact list really ranks or can sort by Agent fit, and the exact wording of the Agent fit "i" pop-up as built.
7. Where the Scout illustration lives in the repo, and the files used for the Mentor's head in Log a query's header and the Archivist's head in Record a response's.
8. Which fields from the ref the agent record cannot store today (check each: synopsis length, "another way" free text for how they take queries, "Not sure" for open to queries, a country name for Elsewhere, the suggested extras under "Something else").
9. Every existing test that names the old add-agent journey or the top bar split button, and whether each is live or already stale (the cl251 B3 spec is known stale and may already be dealt with by After Log a query v1).

Red gates — STOP and report:

- The ref is missing or its hash differs.
- Log a query v2 or Record a response v2 is not on the dev line, so there is no family to join.
- Saving any ruled field would need a prod database rules change.
- Another session's uncommitted work sits in files this prompt must edit and cannot be worked round. (A dirty tree elsewhere is not a red gate.)

## Part A — "Quick actions" in the top bar

### Phase A1 — the button

Replace the "Log a query" split button in the top bar with one button, as `screens/01`:

- A cream pill, 36px high, fully rounded, reading "Quick actions", with a small navy disc holding a plus at its left. The plus turns to a cross while the menu is open and the pill takes the darker cream.
- The same button, in the same place, on every workspace route. Search, Quick actions and Help keep their order and their positions.
- Search does not change. The mock draws the search field a little rounder than the app's; ignore that and keep the app's own.

### Phase A2 — the menu

As `screens/01`: a white panel in the journeys' own frame (white rim, inner hairline), opening under the button with its right edge aligned to the button's.

- Three rows in this order: Log a query, Record a response, Add an agent.
- Each row: that journey's hawk head on a 46px navy disc (Mentor, Archivist, Scout — the same files the journey headers use), the name in Special Elite, one line beneath in the serif:
  - Log a query — "You've sent one. Get it on the record."
  - Record a response — "An agent has replied."
  - Add an agent — "Someone new for your list."
- Below a dashed rule: "Add a manuscript", muted, with "coming soon" in italics at the right. Not a button. No capitals badge.
- No "ADD SOMETHING" heading. Remove it.
- Each row opens its journey in place, over the current page, with the desk dimmed. Nothing navigates. If Record a response from this menu still navigates on any route, fix it here.
- Keyboard: opening moves focus to the first row; up and down arrows move between rows; Enter opens; Escape closes and returns focus to the button. Clicking outside closes it.

### Phase A3 — locks for Part A

Measured on the rendered page at 1280 and 1512 wide, on Dashboard, Queries and Agents:

- The button's left and right edges and vertical centre are identical on all three pages.
- The menu's three rows each open their journey with the route unchanged.
- No element with the old split button's chevron segment remains.

Prove each lock red first by breaking its fix.

## Part B — the Add an agent journey

One journey, the same wherever it is opened. Every door found in Step 0 item 3 opens this one, in place. The old "Adding new agent" panel retires on desktop once every door is repointed.

### Phase B1 — the shell and its identity

As `screens/02`. Build it from Log a query's own panel, header, track, stage body and footer. Do not fork their styles.

- It slides in from the right over the page the writer is on, with the desk dimmed, exactly as Log a query does.
- Header: navy, as the other two. The Scout's head (head alone, no binoculars, round) where Log a query has the Mentor.
- Headline on two lines, the second in light slate `#c3cedb` where Log a query uses blush:
  - First screen: "Found someone new?" / "Let's add them to your list."
  - After the first screen, once there is a name: "Adding Sarah Jones." / "Add as much as you know."
  - Once added: "Sarah is on your list." / "That's 18 agents on file." (the real count)
- Track, six steps: Agent, Wishlist, Asks for, How, Replies, Add. A finished step shows a tick and its value beneath (the first name; "2 genres"; "3 things"; "Email"; "8 weeks"; or "Skipped") and can be clicked to go back to it.
- The form's accent is the agent card's band slate `#5e7189`, with tint `#eef2f6`, on ticks, selected options, chosen chips, the slider and field focus — used the way Record a response uses the query's status colour. Primary buttons stay navy.

### Phase B2 — step 1, Agent

As `screens/02` to `07`. "Who are you adding?" / "A name is enough to start. The rest can come now or later."

- Name, focused on open. Agency. Based in: UK, Ireland, US, Elsewhere, with flags, then "City, if you know it". Elsewhere adds a Country field beside the city.
- City and country always make sense together: typing a city the app knows belongs to another country switches the country and says so in a toast ("Dublin is in Ireland, so that's switched too."). Use the app's existing city list.
- Already on the list: if the name matches an agent on the writer's list, show the slate box naming the agent, the agency and how the query stands, with "Open Priya's card". Carry on is disabled while it shows. The card opens over the journey with the journey stepping back behind it, the way Record a response v2.1 does it; if v2.1 is not on the dev line yet, open the card over the journey without closing the journey and report it.
- Agency suggestions: typing in Agency offers matching agencies already on the writer's list, each with "N agents on your list". Choosing one fills the field.
- Same agency: when the agency matches one on the list, show the slate line naming the agents there. Say that an agent "has a query from you" only where a query exists; otherwise just name them.
- The agency ask (ruled 9 Nov, unchanged): carrying on with no agency shows the sand box — "Do you know the agency? Having it on file helps you avoid querying two agents at the same agency, and helps QueryHawk keep agents' records up to date." — with "Add the agency" and "Agency unknown". "Agency unknown" disables the field, shows "Marked as unknown. I know it now", and lets the writer carry on.
- Footer: Cancel at the left; "Add now, finish later" and "Carry on" at the right, both shown only once there is a name. "Add now, finish later" goes straight to the review screen. Enter in a field carries on.

### Phase B3 — steps 2 and 3, Wishlist and Asks for

Step 2, as `screens/08`. "What is Sarah looking for?" / "From their wishlist or their agency page."

- Genres: the app's existing type-to-find genre field (the one the To-do desk uses), with the manuscript's own genres marked "Your book". Chosen genres sit above as slate chips with a cross.
- Wishlist, "in Sarah's words": a text box, 400 characters, "Paste it from their wishlist or agency page".

Step 3, as `screens/09` and `10`. "What does Sarah ask for?" / "Tick everything on their submissions page." Four tiles that tick, each opening in place:

- Query letter.
- Synopsis — opens to One page, Two pages, They don't say.
- A sample, sub-heading "Pages, chapters or words" — opens to the app's own sample control (pages, words or chapters, stepper, quick amounts, from the opening or a specific section), free quantities allowed.
- Something else, no sub-heading — opens to the four suggested extras Record a response v2 offers (Author bio, Series outline, Comp titles, Chapter outline), plus a free-text field.

Nothing is pre-ticked.

### Phase B4 — steps 4 and 5, How and Replies

Step 4, as `screens/11`. "How does Sarah take queries?" / "It goes on Sarah's card, ready for when you query."

- Email, Online form, QueryManager, Post, Another way. Another way opens a text field.
- Email and Website fields beneath, side by side. Choosing Email moves focus to Email; choosing Online form or QueryManager relabels Website as "Link to the form" and moves focus to it.
- "Is Sarah open to queries?" — Open, Closed, Not sure. Not sure saves as not known.

Step 5, as `screens/12` and `13`. "How long does Sarah take to reply?" / "Most agents say on their submissions page."

- The app's week slider, 1 to 26, labelled "Response time", starting as Unknown. Moving it sets a value; the Unknown pill clears it.
- Under it, when set: "With this on file, QueryHawk can tell you when a reply is due and when to nudge." When unknown: "Not known yet. You can add it to Sarah's card any time."
- "And if Sarah doesn't reply?" — They always reply, No response means no. Neither is chosen to begin with.

On steps 2 to 5 the footer is Back at the left; "Skip to the end" and the primary button at the right. The primary reads "Skip this" while the step is empty and "Carry on" once anything is entered.

### Phase B5 — step 6, the review screen

As `screens/14` to `16` and `18`. "Ready to add Sarah?" / "This is Sarah's card, as it will sit in your Contact list."

- The real agent card component, read-only, drawn from the unsaved agent and scaled down so the whole card is visible at once without scrolling inside it. Not a redrawn copy. It shows the card's own "Finish Sarah's profile" block for whatever is missing.
- Agent fit beneath it: five stars, "Not rated yet" until one is chosen, then the label (Poor fit, Worth a try, Good fit, Great fit, Dream agent). Clicking the chosen star again clears it. The stars on the card preview above light up as the writer rates. Agent fit moves here from the first screen.
- The "i" opens the explanation above the stars, never cut off by the panel's edges. Use the wording the app already has for Agent fit; only say it ranks the Contact list if Step 0 item 6 found that it does.
- The two big numbers, in Log a query's "big numbers" style: agents on file with a "+1" badge in slate, and "N of 9" details on the card, counted the way the card's own profile ring counts them.
- Footer: Back; "Add and start another"; primary "Add to your list".

### Phase B6 — added

As `screens/17`. The Scout illustration, "Sarah is on your list.", then one line:

- With gaps: "4 details still to add. They're waiting on Sarah's card whenever you have them." (singular handled)
- With none: "Everything's on file. Sarah's card is ready when you query."

Then the same card preview with an "Added" stamp and the date on its bottom-right corner, in the journeys' stamp style, in slate.

Footer: "Open Sarah's card"; "Add another"; primary "Log a query to Sarah", which opens Log a query in place with the agent already chosen.

Saving writes exactly the fields the old journey wrote, in the same shapes, plus any ruled field Step 0 item 8 found a home for. For any it did not, leave that control out and list it in the report. Do not invent storage. The agent appears in the Contact list, the Dashboard's "Agents on file" and search without a reload.

### Phase B7 — opened from inside Log a query

As `screens/20` and `21`. Adding an agent must never take the writer out of Log a query.

- The journey opens over Log a query, which steps back behind it, dimmed.
- Step 1's primary button reads "Add and go back to your query"; "Add more detail first" carries on through the steps instead.
- Once added, the line reads "Back to your query. Sarah is already chosen." and the primary is "Back to your query", which returns to Log a query on the step the writer left, with the agent chosen and nothing else lost.
- Cancel or Escape returns to Log a query as it was.

### Phase B8 — leaving, and the doors

- Close, Cancel or Escape with nothing entered closes at once. With a name or agency entered, the footer asks "Discard this? Sarah hasn't been added yet." with "Keep going" and "Discard" (`screens/19`). Escape closes the "i" pop-up first, then answers "Keep going", then asks.
- Repoint every door from Step 0 item 3 at this journey. Then remove the old panel from desktop routes. Leave the phone journey alone.
- Motion follows Log a query's: the slide between steps, the headline's fade, the tiles opening. Nothing jitters or shifts on hover. Respect reduced motion.

### Phase B9 — locks for Part B

Measured on the rendered page, each proved red first:

- From each door, the journey opens with the route unchanged and the desk dimmed.
- The panel's box, header height and track geometry match Log a query's to the pixel at 1280 and 1512.
- A name alone, with "Agency unknown", can be added in two actions from the first screen.
- A name already on the list cannot be added.
- An agent added with everything filled shows 9 of 9 and no "Finish profile" block; with a name and agency only, 1 of 9.
- From inside Log a query: after adding, Log a query is on the step it was left on with the new agent chosen.
- The saved record for a fully filled agent equals, field for field, what the old journey would have saved for the same answers.
- The whole card preview is visible on the review screen at 1280 × 800 with no scroll inside the preview.

A suite that cannot find its subject has failed, not skipped. Rewrite or delete old add-agent specs that can no longer find theirs, and say which.

## Baked decisions — do not relitigate

- One "Quick actions" button in the top bar; no split button; Log a query is the menu's first row.
- Navy header. The Scout's head alone.
- Six steps in the order given. Agent fit on the review screen.
- A name is enough; everything after step 1 can be skipped.
- The agency is asked for, politely, once; "Agency unknown" is allowed.
- Flags on countries. Simple 1 to 5 stars for fit with the five labels.
- The response time is the usual week slider, called "Response time".
- Query letter, Synopsis, A sample, Something else — tiles that open in place.
- The review and added screens show the real agent card, small enough to see whole.
- The form's accent is the agent card's slate, not teal and not the ochre Log a query uses for materials.
- Dates and durations use the app's slider; no fixed date pills.
- Copy never uses "he" or "she" for an agent; first name, or "the agent".

## Do not touch

- Manuscripts page files (owned by a parallel session).
- The query card and its parts, and the agent card's own editing (Agent card v2.2.1 / Query card v168.2 is pending in another session). Read-only use of the agent card component is fine; if the preview needs a new prop on it, add the smallest one and report it.
- Record a response's journey files (v2.1 is pending in another session), beyond reusing shared parts.
- Log a query's steps, beyond the hand-off in B7.
- Phone layouts below 768px.
- Prod, `main`, database rules, anything that spends API money.

## Final report

1. False premises found, first.
2. The dev line you cut from, and what was and was not on it.
3. Phase by phase: landed or not, the commit, and the measurement that proves it. A phase whose measurement has not run is not landed.
4. Every door, and what it opens now.
5. Ruled fields with no home in the agent record, and what you left out because of it.
6. Anything in the ref's copy the code does not do.
7. Old tests rewritten or removed.
8. Baseline against final for `tsc`, build and Vitest.
9. The dev URL and build id.
10. Anything left for a ruling, each as a question with your recommendation.
