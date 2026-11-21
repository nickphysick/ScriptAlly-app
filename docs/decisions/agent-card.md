# Agent card — decisions

Read this before touching `src/components/agents/contact/AgentCard262*.tsx`, `AgentCardPanel262.tsx`, `acv2.css`,
`src/components/agents/card/HostAgentCard.tsx` / `AgentCardHost.tsx`, `lib/agentCardV2.ts`, or any query-card part the
agent card borrows (`QcAgent158`, `QcNotes158`, `QcFoot1581`, `QcThreadRead`, `qcMotion160`).

## Current state (Agent card v2.1, 20 Nov 2026 — branch `agent-card-v2-1`, not merged)

v2.1 (`design-refs/agent-card-v2-1/`) changes how the card is edited and adds the head's contact line and the border's
colour. Everything under "Agent card v2" below still holds except where this section says otherwise.

### Reading
- Profile's order: the Finish block (when details are missing), the fact boxes, Wishlist, Genres {first} takes, What {first}
  asks for, then "Added {date}". Profile has no contact row and no "Edit these details".
- The head carries the contact line under the place: the email as its address (a mail glyph, then a quiet 28px copy
  button, `#9a948b`, no fill until hover; snackbar "Email address copied"); the website as its address, underlined,
  opening in a new tab; "+ Add email" / "+ Add a website" in their place when missing. `NxCopyEmail`/`NxSite` are the query
  card's and stay there; the agent card no longer draws them.
- The place line: the stored country's flag (flag-icons via `flagFor`, 18 × 13.5, 2px radius), then the city, or the
  country's name when there is no city. **The flag comes from the stored country alone, never the city.** No country: no flag.

### Editing — by section only, in place
- No band pencil, no "Edit these details", no save bar, no tinted box, no header bar, no "Close". Ways in: each section's
  28px pencil (hover, and focus within the section), the name's pencil (Contact details), the value itself (a faint edge on
  hover; buttons inside a value keep their action), the Finish block's buttons, the head's "+ Add …".
- An open section looks like itself with its contents live: a 1.5px navy outline 9px outside it; its heading and top edge
  do not move (the 7px of air is below it only). The fact boxes and the head show the draft as it changes.
- Each open section has its own cross (discard; no question; snackbar "Changes to {section} discarded" with Undo, which
  reopens it with the draft back) and tick (save that section only). A section's fields: `SEC_FIELDS` (`AgentCard262`).
- A tick saves the base with that section's fields from the draft (`partOf`) through the built save (`kit.onSave` →
  `saveDraft` → `commitCardSave`), so `cardPatch` writes exactly what it wrote for those fields before; How's tick carries its
  offer's plan, no other tick carries any. The other open sections keep their drafts (`useAgentForm` `commit` / `revert` /
  `rebase`). Snackbar "Saved {section} for {first}" (+ ", and moved the query’s dates"), Undo = that save's snapshot.
- Leaving with something unsaved (a tab, the arrows, ✕, Esc, another agent, a footer action, another page): the rust bar
  (`GuardBar`) takes the footer's place — "Unsaved changes", the sections named, Keep editing, Discard, Save all ("Save it"
  for one). Save all saves each changed section, one snackbar ("Saved {n} sections for {first}") whose Undo restores every
  snapshot in reverse, then carries on. With nothing unsaved, leaving just closes the open sections.
- How's controls follow the boxes: Response time (with its offer), If they don't reply, How they take queries, Open to queries?
- Based in: two lines at every card width (ruling 21 Nov) — line 1 the country control (pills, Elsewhere's search beside them, its list 280px running leftwards), line 2 the city, full width; locked by AC21-2g. A city in `lib/knownCities` known to be in another country gets an offer
  ("{City} is in {country}. Change the country?"), never a block; "Keep" is remembered per city and country while Contact
  details is open. Names two countries share are left out of the table.
- What they ask for: the same list, each row a tick, its quantity controls on the row (`MaterialRows`). Every change is
  `lib/matOps` `MAT_OPS` — MaterialPills' own transitions, lifted, so both dresses store the same thing.
- Genres: `GenreChips dress="field"` — one 52px field with the chips inside (the manuscript's genre ticked), the matches 8px
  beneath, "Suggested" 14px beneath; focus back in the input after every add and remove.

### Motion — the query card's own (qcMotion160 + v163), on the agent card's frame
- The frame (`.cl262-card.acv2`) draws its paper and shadow with `::before`; the breath swells that and nothing inside moves.
- The border's colour is the frame's `data-qc163-rim` / `data-qc163-rim-hi`: the agent's query's stage (v163's `rim`), or
  `NO_QUERY_RIM` slate `#5e7189` / `#c3cedb` with no query. qcMotion160 reads it through `rimColours` (the query card names
  none, so it reads its stage as before). The rim layer's CSS covers both frames by `--qc163-rim-w` / `-r`.
- A section opens: `breatheOpen`; typing: `breatheType`; the last closes: `breatheClose`. A tick, a star, Add note, Save all:
  `pressAtPointer` → `pressThen`, the pop (`bump`) on landing, held until the page is quiet (`hold`/`release`). A section's
  save (tick, Save all) runs v163's light once round; a star and Add note pass `{ light: false }` and hold no colour unless
  a section is open (`pressIn(frame, { tint: false })`). Undo of a section's save: `bump(…, "undo")` (sink, light reversed).
  Failure or nothing changed: `pressBack`. What changed settles (`SETTLE.from` → 1, the saved tint fading over 1.8s).

### Locks
AC21-1 … AC21-4 (`tests/e2e/acv21.measure.ts`, fixtures `seedAcv21.mjs`). Retired: AC2-6 (save bar and v2 motion — moved
to AC21-4), CO9 (the save bar's second line), AA10 (the band pencil and the save bar's names), CL262's editing shots.

## Agent card v2 (19 Nov 2026 — branch `agent-card-v2`, not merged)

The agent card is the query card's built parts inside the agent card's own frame. Reference: `design-refs/agent-card-v2/`.

### The shell
- Frame kept: the `#a5837b` line (`.cl262-card.apc > .apc-frame`), the 10px white mat, 580 wide (540 at ≤1280), the −1.2°
  lean and its arrival swing (`AgentCardPanel262`), the dim behind it.
- Height: always the slide-out query card's — `--qc-card-h` (`:root`, `qcv152card.css`, the one formula
  `min(700px, 100vh − 56px)`), centred in the viewport as the query card is. Band, head, query box, tabs and footer hold
  still; only `.qc152-body` scrolls. The add journey's finish-screen picture (`preview`) hugs its content up to that height.
- Inside the frame the card is a `.qc149c.qcv-legacy.qc152` root, so the query card's own stylesheets
  (`qcv152card`, `qcv1522card`, `qcv153thread`, `sc1card`, `qcv158`) place every shared part. `acv2.css` holds only what is
  the agent card's own (the band's slate, the not-queried and closed head, the query box, the Finish block, the genre
  chips, the history heading). Never copy a query-card rule into it.
- Band: slate `#5e7189` on every agent. Left: Agent fit and its five stars (a star saves at once; the chosen one pressed
  again clears it; the "i" tip stays). Right: "{i} / {n}", ‹ ›, the pencil, ✕ — the query card's 26px `.qc152-x`.
- Head: the query card's — 40px disc, name, the agency in the query card's caps line, the location, and the status pill
  (StatusDot and word) at the right.
- Colour (`lib/agentCardV2` `acTone` → `lib/stageColours`): by the agent's live query, the disc's outer ring is the stage
  Edge and the pill the stage Tint. Not queried: dotted navy ring and pill, no fill. Closed: grey. The band never changes.

### What was lifted from the query card, and where it lives
| Part | Lives in | The agent card draws |
|---|---|---|
| Fact box, Copy email, Website button | `QcAgent158` (`NxBox`, `NxCopyEmail`, `NxSite`) | Profile's three boxes and contact row |
| Notes list, the agent's words, the writing box | `QcNotes158` (`NotesTab158`, `quotesOf`) — new optional `placeholder`, `emptySub`, `NoteIn.top` | Notes |
| Footer, one row or two | `QcFoot1581` (`Foot`) — new icon `{ k: "node" }` | the footer |
| The thread, read-only | `QcThreadRead` (new: `buildThread` + `Bubble` + the "x days later" lines) | History |
| The bump | `qcMotion160` `bump()` | the save |
| Stage colours | `lib/stageColours` | ring, pill, query box |
| The height | `--qc-card-h` (`qcv152card.css :root`) | the card |
The query card renders the same DOM from the lifted parts; its locks (QC158, QC1581, QC160, QC161) are the guard.

### The query box
Under the head, only when the agent has a query for the active manuscript (`x.q`): the book icon, the title in the
typewriter face, one italic line (`queryBoxLine`), "Open the query →". Fill: the stage Tint; Offer adds the rose sheen.
The whole box is one button: `openQueryPanelFromAgent` (the query card with "← Back to {first}"); Back reopens this card
at the tab the writer left (`returnTo` in `AgentCard262`).

### The footer (`lib/agentCardV2` `acFoot`)
| Agent's position | Line 1 / line 2 | Button |
|---|---|---|
| Not queried | Not queried yet / "{first} is open to queries", "Not known if {first} is open to queries" (or reopens / closed) | **Log a query** navy |
| With the agent | Waiting on {first} / Reply expected by {date} | **Record a response** outlined |
| Request to send | {first} asked for your partial / full · Send it, then log it here | **Mark partial sent** / **Mark full sent** navy |
| Offer | {first} made an offer / Answer by {date} | **Record your answer** navy; "Make it a task" as the second-row link |
| Passed, no reply, withdrawn | Closed / "{first} passed · {date}" (the query card's closed words) | **Query again** outlined |
| Anything else on your move (R&R) | the next-step box's own words | its button |
Buttons open the journeys the next-step box opened (`nextStep(...).button.act`, lib/contactCard262 — kept for exactly
this). Nothing on the card writes a status. While editing, the save bar takes the footer's place.

### Profile (in order; a section with nothing in it is not drawn)
1. "Finish {first}'s profile": only when Housekeeping has items for the agent; the ring, "{n} details to add", one
   "+ {detail}" per item. `n` and the list are Housekeeping's (`agentGapAction(...).keys`; the host's `agentGaps`).
2. Three fact boxes (Replies in + policy · Takes queries · Open to queries + "checked/reopens {Mon}"); unknown reads
   "Not known yet"; all three unknown and the row is not drawn. Their pencil opens "How {first} works".
3. Copy email · Website (only those that exist). 4. "What {first} asks for" (quantities at the right). 5. "Wishlist
   *in {first}'s words*". 6. "Genres {first} takes", the manuscript's genre ticked, "includes yours". 7. "Added {date}" ·
   "Edit these details".
- Headings are the query card's (typewriter 17px, sentence case). No spaced capitals under 12px in the body, band or
  footer (AC2-3).
- **The one exception (Nick, 19 Nov):** the head's agency line keeps the query card's caps line — 10.5px mono, 0.17em —
  as the query card's head has it. AC2-3 exempts `[data-acv2='agency']` and nothing else.
- **Doors for what Housekeeping doesn't track (ruling 3):** the Finish block stays Housekeeping's list and count. In the
  contact row a missing email or website is "+ Add email" / "+ Add a website" (the query card's quiet `.nx-btn.gh`),
  opening Contact details with that field focused. A fact box that reads "Not known yet" carries a small "Add" that opens
  "How {first} works" at that field (`BOX_FIELD`: reply → weeks, method, door). All three unknown: the row stays hidden.
  Locked by AC2-8.

### History
The query card's thread for each query to the agent: its own log (`users/{uid}/queries/{id}/activity`, one listener per
query of the open agent only — `useAgentThreads`) through `buildCardView`, drawn by `QcThreadRead`. Stored events only:
no waiting line, no "next". More than one query: a heading per manuscript. One: no heading. None: "No history yet".

### Notes storage
- New notes are dated entries in the agent's existing `users/{uid}/agents/{id}/notes` subcollection (`{ text, createdAt }`,
  rules `isValidAgentNote`), written through `useAgentNotes` (which keeps `notePreview`). No rules change.
- The old `agent.notes` string is shown as one undated note at the top of the writer's notes, as written (untrimmed). It
  is never migrated, and adding a note never touches it (AC2-5 compares it byte for byte after a new note).
- **Pin (ruling 1):** as the query card's notes — one pinned note, first, marked "Pinned"; pinning another moves it; Unpin
  clears it. Stored as the agent's `pinnedNoteId` (a subcollection id, or `__flat__` for the old string), written with
  the recomputed `notePreview` in one patch. `firestore.rules` gained `pinnedNoteId` on the agent update allowlist and a
  string check in `isValidAgent` — additive, deployed to dev only. Locked by AC2-7.
- **The old string is editable (ruling 4):** it is the first of the writer's notes with Edit and Delete, like every other
  note. Edit writes back to `agent.notes` through the card's notes save (`onNotes` → `commitAgentEdits`); Delete clears
  it with Undo, which writes the same bytes back. No migration. Dated notes get Edit and Delete too (`useAgentNotes`;
  Undo restores the note with its id and date). Locked by AC2-9; AC2-5 still holds for a new note.
- The agent's own words come from their queries' steps (`quotesOf`). An action that needs a query and has none is hidden.

### Motion
| Moment | What moves |
|---|---|
| Start editing | As built: the card straightens, the dim deepens, the section opens, the save bar slides up. |
| While editing | Nothing on typing; an offer eases in and scrolls into view by only what it needs (as built). |
| Save | The bar leaves, the card leans back and bumps once with `qcMotion160`'s `bump()` on the first quiet frame after the save is acknowledged (three short frames, or 1.5s). Changed parts (`data-acv2-part`) hold `#dfe7f0` with a `#9db4cf` edge, fading to their own over 1.8s. Snackbar: "Saved {n} changes to {first}" (+ ", and moved the query's dates"), with Undo. |
| Undo | The snapshot goes back (`lib/agentCardSnapshot`). No bump. "Changes undone". |
| Cancel, Esc, Discard | The card leans back. No bump. |
| Agent fit star, new note | The bump; the app's snackbar. |
| Reduced motion | Nothing moves or fades; the bar goes, the snackbar appears. |
The bump means "saved" and nothing else. Its values are BUMP's (520ms, peak 1.035 since v161.1 — not v160's 500/1.022).

### Doors
Every door to an existing agent opens this card: `AgentCardHost` → `HostAgentCard` (edit doors at their section; read
doors unopened). Agent card v1's quick view (`AgentCardSession`) is left for a new agent's session and the dev lab's cast.
The query card's "Open {first}'s full card" reads the card (it used to open every section for editing).

### Retired
`cl262-next` (the next-step box) and `NextBox`; the ghost bars and per-section "+ Add …" (`Ghost`); the tab row's
"{n} details missing" line; the head's "+ Website / + Email"; the 60px disc; the four tiles; the foot's "Added" and pager;
the `is-saved` outline flash; `bandWords`, `metaLine`, `howTiles`, `materialChips` (lib/contactCard262).

### Locks
`tests/e2e/acv2.measure.ts` (AC2-1 … AC2-6; mutations by `AC2_MUTATE`), fixtures `tests/e2e/seedAcv2.mjs`, screens
`acv2Shots.measure.ts`. AC2-7 … AC2-9 are the rulings' locks. Retired or re-pointed: CL262 J1, J3, J4 and its shots; agentCardV1's two store-over-a-page cases;
addAgentV1 AA5 and AA9 (re-pointed); cardOffersV1 CO20.
