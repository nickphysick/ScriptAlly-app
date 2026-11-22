# Contact list v25.2 — QueryHawk rows, the "!" for your move, and editing inside the agent card

26 Oct 2026 · branch `contact-list-v25-2` · base **`dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77` @ 7aeac318** — the
branch dev served at the start (`index-bQvGGs31.js`, confirmed by building it), which carries Contact list v25.1
(`contact-list-v25-1`, the ledger, the drawer headers, the heading sorts), landing on phones v3 and Dashboard v77 ·
integration **`dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252`**, deployed to dev as **`index-Su9SiFnv.js`** · **NOT merged
to main.** Refs: `design-refs/contact-list-v25-2/` (13 files; every SHA-256 matched before enrolling).

## 1. False premises

1. **"The legacy centred pop-up … `AgentCardEditor` in its modal variant" was the whole editor story.** It was half of
   it: the modal was what "Edit agent" opened on the Contact list and on every other page, but the same component also
   drew the new-agent form in the agent panel (`variant="panel"`). Both are gone — `AgentCardEditor` is deleted, and the
   new-agent state is the edit mode under its v25.1 header, as C2 asks. The **centred quick view** (`AgentQuickView`)
   is not the editor and stays: it is what a plain "open this agent" draws on pages other than the Contact list; its
   pencil now opens the panel in edit mode.
2. **"The drawer pickers' rows" carry a your-move disc.** None did: every picker drew a neutral paper disc, and only the
   Who replied picker knows whose turn it is (`WhoItem.you`). The badge is on those rows; the log picker and the query
   drawer's QueryPicker hold no your-move fact to draw.
3. **"A 2px halo … navy on the selected address-book row".** The app's selected address-book row is pale blue-grey
   (#eef2f7), not navy. The rule — the halo is the colour of the surface under it — is followed: #eef2f7 there.
4. **"Taking queries (Open / Closed / Not known)" and "Response policy … Not known" as choices.** The editor's
   long-standing rules (decision 9, and the Unknown door law) are that an unstated policy or door is an ORIGIN, never a
   destination: the card only ever writes Open or Closed, and never writes a policy back to absence. Both "Not known"
   pills are drawn, chosen while nothing is stated, and disabled once something is.
5. **"Submission form" as a field.** The agent record has none (a website, an email, socials). It is kept as a
   `socials` entry `{ platform: "Submission form", handle }` — no new field and no rules change; `socialOf` and the new
   `socialOfAgent` skip it.
6. **"The genre input offers only list genres".** The app's matcher (`GenreField`) offers the list's genres AND, for a
   typed genre matching nothing, "+ Add “…” as a new genre", which registers it on the writer's own genre list
   (`addPersonalGenre`, ruling 1). That is the app's list, not free text; it is kept, and C1 asserts every other offer
   is a list genre.
7. **"Every field and rule AgentCardEditor has today must be here."** The modal's Notes tab edited the per-agent notes
   SUBCOLLECTION; the v24 card's own Notes tab writes the flat `notes` field. So the edit mode carries a fifth block,
   "Notes about {first}", with the modal's compose / edit / delete-with-undo (the panel card and the app panel; not the
   wide card, whose third column already holds the flat notes). The modal's "Paste a link" sorter lived only in the
   retired CENTRED add card — the panel's add form never had it — and is not rebuilt (§5).
8. **Screen 10 and the card's body in screens 04–08** still draw mono genre tags and stars, as the pack warns: the pills
   and the tally replace them (A3, A7). On **Cards** (`AgentPaperCard`) the pack moves the pills only, so the paper card
   keeps its stars in its band.

## 2. Per part

| Part | Commit | What changed |
|---|---|---|
| refs | f4753436 | 13 refs enrolled. |
| A | e17ed599 | The row (ContactSheet24): typewriter name with a .45px stroke over agency · city in mono caps; `GenrePills`; "~6 wks" over the policy; the status pill + "DAY n" over the `Track` and the next step in rust; the `Tally`; and a second grid row carrying the wishlist behind the `NIB`. Five columns above 1440 of window, three at ≤1440. "+ Add" only on row hover. The shared pieces are `shared/agentRowParts` (+ `lib/queryTrack`, unit-locked for every stage). The agent card and wide card wear the pills, the status pill and the tally; Cards the pills. |
| B | 5ebaea46 | Your move: navy with cream initials and the rust "!" (17px, −3/−3, 2px halo in the surface colour). The rust/blush disc (#d07a5c / #f8e3da) is retired at source — `.cl24-dsc--you` in contactV24.css was the only place either colour lived. |
| C | e9a0a1df | Inline edits in the card (`card/InlineEdits`), the card's edit mode (`card/AgentEditMode`) in the Contact list's panel, the wide card (two by two) and the app-level panel elsewhere; `useAgentForm`, `useAgentSave`, `useEditOptions`; `AgentCardEditor` deleted; `setAgentEditInterceptor` in `agentCardStore`. |
| D | 4455d385 | The CL252 locks, the L1 re-points, CLAUDE.md, the ledgers. |

**Where your move is drawn (B):** List rows, the address book and the card heads (all through `StateDisc`); Cards
(`AgentPaperCard`'s new `yourMove`); the Who replied picker's rows (`QcFlows149`, which now imports the shared sheet so
the badge reaches the Query Centre). At a glance's faces are navy without the badge.

## 3. Decisions made

- **One component each** for the pills, the status pill, the track and the tally, in `components/shared/` (the paper
  card is shared, and Housekeeping uses it too).
- **The track's current node is a real `StatusDot`** laid over the line drawing at r 5 (12px), so the house law holds;
  a closed query sits on the furthest step its dated rungs reached, every line grey.
- **"DAY n" counts from `sentMs`** (the query's own send date), the row's figure; the lock holds it to Firestore.
- **The next step drops "By"** ("Send the partial · 30 Sep"), as the pack writes it; `rowSecond` has no other reader.
- **Inline saves raise the toast, not the list's notice; the edit mode's save raises the notice** (with its FLIP and
  Undo, as before) on the Contact list and a toast with the saved line and Undo elsewhere.
- **On the Contact list, an edit asked for anywhere opens in the page's own card** (an interceptor in the store); a
  plain open still goes to the app's quick view. Housekeeping's carried answers always go to the edit mode (an inline
  box cannot carry them).
- **How they take them** keeps "By post" beside the pack's three, so a stored Post is never stranded.
- **The rating** saves at once from the tally on the card (C1) and is a field in the edit mode (C2).
- **The Query Centre's "Edit agent ›" (QueryAgentTab)** now asks for the editor (`tab: "who", host: "panel"`): it was the
  one door that opened the quick view rather than an editor.

## 4. Mock and app disagreements

- The mock's card body (stars, mono tags, the facts) is v24's as built in the app; where they differ the app wins, and
  the pills and tally replace stars and tags as the pack says.
- The mock's country picker is four separate pills; the app's segmented control is used (same four choices, then the
  app's country list behind Elsewhere).
- The mock's rating in edit mode is stars; the pack's bars are used.
- The mock draws "Nudge · Due now" and dates the harness account does not have; the app's next steps are the account's.
- Screen 08 shows the email input with an underline and the buttons on the row; built the same way.

## 5. AgentCardEditor's fields, old against new

| Old (centred editor / panel variant) | New (`AgentEditMode`) |
|---|---|
| Paste a link (centred add card only) | Retired with the centred card — the panel add form never had it |
| Name, with "Already on your list … Open them instead" | Who they are · Name, same |
| Agency (list combo), "N other agents at …", Use these details | Who they are · Agency, same |
| Country (six quick picks + Other…) | Who they are · Country: UK · Ireland · US · Elsewhere (the app's list) |
| City (list combo) | Who they are · City, same |
| — | Who they are · Your rating (the tally) — new |
| Wishlist (400-character cap, count) | What {first}'s looking for · Wishlist, same |
| Genres (`GenreField`) | What {first}'s looking for · Genres, same |
| Materials (four rows) | How to query {first} · What to send, same |
| Replies in (stepper, "Use N weeks · others at …") | How to query · Replies in, same, plus the nudge warning |
| Response policy (two pills) | How to query · Response policy (three; Not known the origin) |
| Submit by (Email · QueryManager · Online form · Post) | How to query · How they take them (By email · Online form · QueryManager · By post) |
| Door (Open · Closed) | How to query · Taking queries (Open · Closed · Not known, the origin) |
| Reopens (date, when Closed) | How to query · Reopens, same |
| Email · Website · MSWL | How to reach {first} · Email · Website · MSWL, same |
| — | How to reach · Submission form, Social — new |
| Also changes (per tab) | Also changes (per section) |
| Notes tab (compose, edit, delete with Undo, the earlier note) | Notes about {first} (the panel card and the app panel) |
| Foot: the count, problems, carried answers, discard ask | Foot: the same, the ask is the query drawer's confirm |

## 6. Every former caller of the modal, and where it goes now

| Door | Now |
|---|---|
| Contact list card · "Edit agent" (footer) and the wide card's button | The card itself, in edit mode |
| Contact list card · "+ Add" (wishlist, genres, email, website, social), the facts' Replies in | In place in the card (inline) |
| Contact list card · "+ Add how they take queries", the wide card's "+ Add what they ask for" | The card's edit mode, at the field |
| Contact list row · "+ Add" on hover | The card, at that field (inline, else the edit mode) |
| Contact list · Housekeeping's hand-off to the card | The card's edit mode, with the carried answers |
| Any edit door while on /agents (palette, tasks) | The page's own card (`setAgentEditInterceptor`) |
| Query Centre card · Agent tab "Edit agent" and its gaps | The agent panel in edit mode |
| Query Centre · QueryAgentTab "Edit agent ›" | The agent panel in edit mode |
| Dashboard (Dash58 housekeeping, Dashboard.tsx data-quality task) | The agent panel in edit mode, at the gap |
| To-do tray tasks | The agent panel in edit mode, at the gap |
| The centred quick view's pencil, "+ Website / + Email / + genres", Remind me without a date | The agent panel in edit mode |
| "+ Add an agent" (every door) | The agent panel's new-agent state (the edit mode under "Adding new agent") |

## 7. Locks

**Green on v25.2 (7aeac318 + the four parts) and again on the integration build:** A1 6/6 · A2 214/214 · A3 426/426 ·
A5 88/88 · A6 214/214 · A7 55/55 · A8 6/6 · B1 22/22 · C1 11/11 · C2 15/15 · C3 9/9. Unit: `src/lib/queryTrack.test.ts`
(15 cases, every stage). Every lock proves its population first; the tally, "+n", the wishlist line and the day count
are held to Firestore (`cl252Data.mjs`, read-only). **C1 writes**: it adds a wishlist to one agent, reads it back from
Firestore, presses the toast's own Undo, and reads it back empty — in the same run.

**Red first on the base build (`CL252_BASE=1`, v25.1):** A1 4/6 · A2 2/108 · A3 214/320 · A5 0/2 · A6 2/108 · A7 2/55 ·
A8 0/4 · B1 3/22 · C1 1/5 · C2 1/15 · C3 2/9. (A5's first base run passed on a floor that counted rows rather than
queried rows; the floor now requires rows that show a status and a next step, and A5 was re-run red.)

**And under each lock's own break:**

| Lock | Break | Reading |
|---|---|---|
| A1 | Replies in shown at 1280 | "agent · what they want · replies in · your query" |
| A2 | serif names, no stroke | "Special Elite" falls to Georgia, "stroke 0" |
| A3 | matches moved last | "matches first — om" |
| A5 | a dot for the current node | node "&lt;circle … fill=#2a3a52&gt;", not the StatusDot |
| A6 | the wishlist in the genres cell | "l 751.7/360.0 r 863.6/1450.0 (in genres)" |
| A7 | stars for the tally | "0/0 null" |
| A8 | "+ Add" at rest | "52 rows show + Add" |
| B1 | the rust disc | "bg rgb(208, 122, 92)" |
| C1 | the card's edits handed to a separate panel (build) | "inCard false, panels 1" ×4 |
| C2 | Reopens hidden | "Reopens when Closed — false" |
| C3 | the Query Centre's "Edit agent" left on the quick view (build) | "panelEdit false" |

C1 and C3's breaks were carried in ONE build (each touches only its own door); in it C3's Contact-list reading also
went red, because C1's break switches the page's interceptor off. Source restored from path-derived backups; `git
diff` empty; rebuilt.

**L1 (on v25.2, then the integration build):** CL251 6 passed · CL25 5 · CL24 7 · QC150 25 · QC1501 15 · QC1492 4 ·
QC149 17 (8 skipped, as before) · QC149-L0 3 passed (0 style differences, 0% pixels, against a reference re-captured
from the base this session) · HR1-1…7 pass. **HR1-8 is red on the base too** (`phone /agents`: `a: [null], b: [null]`),
as in v24, v25 and v25.1. On the integration build QC150 L3 at 1280 went red once ("16 rows") and was 7/7 at both widths
when run alone — timing on the shared account, not a fix.

**Re-points** (a comment at each): CL251-E1/E2/E3 read the shared pills (`data-cl252="pill"`/`"pill-more"`) and the
tally (lit bars; "—" for unrated); CL251-E4 reads "~6 wks", the pills and the status pill; CL251-B3 reads the edit mode's
sections where the deleted editor had tabs; CL24-B2 expects Replies in to drop at ≤1440 too. Unit: `contactAdd.test.ts`
and `unknownDoor.test.tsx` read `AgentEditMode` (the paste sorter is not rebuilt; "Not known" is drawn but never a
choice once a door is known), `agentCardRetire.test.ts` expects the QC's "Edit agent ›" to ask for the editor. No Query
Centre suite needed a re-point.

## 8. Screens (from dev, `index-Su9SiFnv.js`)

`screens/` beside each ref screen, the same size and state (1x where the refs are @2x): `01-rows-1280/1512`,
`02-rows-querying-1512`, `03-rows-not-queried-1512`, `04-card-your-move-1512`, `05-edit-wishlist-1512`,
`06-edit-genres-1512`, `07-edit-replies-1512`, `08-add-email-1512`, `09-edit-agent-1280/1512`, `10-full-screen-1512`.
The harness account carries two wishlists and no reply-by dates on its your-move queries, so most rows read
"No wishlist yet" and the next steps carry no date.

## 9. Dev, worktrees

Dev moved twice: from `…-cl251-lm3-db77` (7aeac318, `index-bQvGGs31.js`) at the start to `…-db77-lm4` (0b617518,
`index--JaQgqU2.js`, confirmed by building it: my base plus landing on phones v4) at deploy time. Integration
`dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252` = that + `contact-list-v25-2` (one conflict, the refs manifest:
base taken, the ref re-enrolled). Gates there match the baseline (tsc 0, both builds 0, Vitest 669 files / 10,521
tests). Deployed to dev from 735a5a6f as `index-Su9SiFnv.js`, the served hash checked before and after. Worktrees
`ScriptAlly-cl252`, `ScriptAlly-cl252base` and `ScriptAlly-cl252int` removed at the end.

## 10. For Nick

1. **The wide card (full screen) drops unsaved edits when another agent is picked in the address book.** On the normal
   page, picking another agent while the edit mode has changes asks first; the address book switches its card itself,
   so the wide card's edit mode is replaced without asking. Worth the same guard there.
2. **In the address book, the selected row's disc draws paler** than the other rows' (seen on screen 10); it predates
   this pack's colour but now carries the badge, so it shows.
3. **The genre box's list runs past the box's lower edge** in the card (screen 06) — it is the app's own combobox,
   positioned under its field; legible, not boxed.
4. **"Not known" for a door or a response policy is drawn but disabled once known** (§1.4). If you want a road back to
   "not known", it is a change to the editor's long-standing rule, and the rules already allow the write.
5. **The submission form lives in `socials`** (§1.5). If it should be its own field, that needs a rules change.
6. **The harness account has two wishlists and no reply-by dates on its your-move queries**, so the screens show few
   wishlists and next steps without dates; the locks hold both branches.
7. At 800px of window height the sidebar's "Give feedback" overlaps the To-do list row (screen 09 at 1280) — not this
   pack's, seen in passing.
8. Prod is untouched; nothing merged to main.
