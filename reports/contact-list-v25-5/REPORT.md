# Contact list v25.5: the agent card's Profile is a contact card, History is the query story, and "your move" is the "!"

Done and on dev, served as `index-C6Y5YnWL.js`. The branch is `contact-list-v25-5` and the integration branch is `dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252-pk40-cl253-db93-cl254-cl255`. Nothing was merged to main and prod is untouched.

## False premises

- **The base didn't carry v25.4 when this pack arrived.** Neither the code nor the v25.4 pack existed yet. I stopped, the v25.4 pack was sent, and I built v25.4 first (`reports/contact-list-v25-4/REPORT.md`) and this pack on top of it.
- **"The Query Centre's group header and filter chip, if any use a stage glyph" — none do.** Its Your move group heading draws its tone art (or the band art, by grouping). Its Your move chips and quick pick are words. Its "Where it stands" chips are colour swatches. So the Query Centre is unchanged, and QC150, QC1501, QC1492 and QC149 pass untouched.
- **"14 in full-screen letter rows":** full screen's list has no Your move row. Its sections are letters, months, reply bands or single stages. The only Your move label in full screen is the band's segment, and that is where the 14px disc went.
- **"Both tiles click into the matching inline edit (v25.2 C1)":** v25.2 has no inline edit for the door or the submission method. Those two fields only ever opened in the edit mode, so the tiles open the edit mode at that field.
- **"Keep anything v24's History showed":** v24's History also listed notes, but the card has always been given an empty notes list there, so it never showed any. Nothing about notes was lost.

## Base

The tip of `contact-list-v25-4`, `8f8116a8`, deployed as `index-BWCFj_tT.js` just before this pack. It carries v25.4 and CL254.

Baseline is the v25.4 gate run on the same tree:
- `tsc` 0, the production build 0 (no CSS warnings) and the dev build 0.
- Vitest: 1 failed test in 3 failed files, all under `functions/`.

After this pack: the same, with 10,565 passed (my 7 new unit tests).

## Per part

The reference is enrolled at `design-refs/contact-list-v25-5/` (`75b116bd`), with every SHA-256 matching.

**A · Profile is the contact card** (`a396e054`). From the top:
- v25.4's "{n} details missing · Fill them in →" line.
- **How {first} works:**
  - The reply scale: twelve blocks, the first {reply weeks} navy at .85, all twelve over 12 with the real number in the words. It reads "Replies in about {n} weeks · {policy}".
  - With no reply time it reads "Reply time not known yet". Clicking it opens the inline Replies editor.
  - Two tiles:
    - **Taking queries:** a green dot "Open to queries · checked {Mon}", a grey dot "Closed to queries · reopens {Mon}", or a hollow dot "Not known".
    - **How they take queries:** "By email", "Online form", "QueryManager" or "By post", with an envelope or form icon.
- **Reach {first}:**
  - Rows for email (Copy), website, submission form and social (Open), always in that order.
  - A missing one is a dashed "+ Add …" row that opens its inline edit.
  - The social row reads the agent's social as before, and is "+ Add social" when there is none.
- **Also at {agency}**, as built.
- The four-fact grid, the old contact list and "You and {first}" have left Profile.

**B · History is the query story** (same commit).
- **Heading:** "You and {first}". On its right: "waiting to hear back" while a live query sits in Queried, Partial sent or Full sent, otherwise "heard back".
- **One block per query** to the agent, on any manuscript, newest first, each under its book's line (click to open the query).
- **The waiting bar**, only in those three stages:
  - One block per week, up to max(reply weeks, weeks waited) and capped at twice the reply weeks.
  - Waited weeks within the usual time are navy, past it rust.
  - The caption reads "{w} weeks since you sent it · usually {n}", or "· past {first}'s usual **{n}**" with the number in rust.
  - With no reply time, the caption alone.
- **The timeline:**
  - Each stored step (the query's own dated stages, `bookSteps`) with its StatusDot and date; the latest is bold.
  - Then the writer's next step: a hollow rust ring with the step in italic rust and its date. The steps are Send the partial / full / revision, Decide on offer, Nudge and Consider closing.
  - A closed query ends on its close.
- **Not queried:** the dashed "You haven't queried {first} yet. / When you do, every step lands here." panel.
- The logic is pure, in `lib/contactStory255.ts`, with a unit test.

**C · The wide card** (same commit). Full screen's three columns: column 1 is What {first}'s looking for (as built), column 2 is How + Reach, and column 3 is the story, then the call box and Notes. They are the same components as the panel (`AgentCardParts255.tsx`). At ≤1440 the two-column layout is as built.

**D · "Your move" is the "!"** (`c2e05639`).
- `YourMoveMark` is the rust disc (#c9765d, white serif bold "!").
- `SetGlyph` draws it for the Your move group heads in List and Cards, at 17px. Both drew the partial glyph before.
- The full-screen band's Your move key is the disc at 14px, in place of the colour swatch.

**E · Locks, CLAUDE.md and this report** (`5a662160` and the report commit).

## Decisions made

1. **A, B and C are one commit.** They share `AgentCard24` and the new pieces file; D and E are their own commits.
2. **The next step appears only when the move is the writer's.** While the writer waits on the agent, the waiting bar stands in for "reply expected".
3. **Undated next step:** if the date is unknown the step shows no date. If it has passed, or it's a nudge, the date reads "Now".
4. **The heading reads "closed with no reply" when every query closed without a reply.** "Heard back" would be false there.
5. **The waiting bar's weeks count from the current stage's date** (the query, the partial or the full, whichever was sent last). Under a week reads "Under a week since you sent it".
6. **From v24's History I kept:**
   - nudges, as "Nudged" rows among the steps by date;
   - the agent's pass comment, quoted under the close.

   **Moved:**
   - the send method, to Profile's "How they take queries" tile;
   - the due and offer-answer dates, to the next step's date;
   - "You added {first} …", to the footer's "Added {date}", which was already there.

   **Gone:** the materials chips on "You queried {first}".
7. **The tiles are buttons.** A click opens the card's edit mode at the door or method field (see false premises).

## Left unused

`Facts`, `Contact`, `YouAnd` and `History` in `AgentCard24.tsx`, the card's `history` prop (and the `agentHistory` call that fills it), and `factsOf`. I left them in place.

## Every "Your move" mark

**Changed:**
- the Contact list's List group head;
- its Cards group head;
- the full-screen band's Your move key.

**Left, because each shows a single stage:**
- the List rows' one-line status glyph;
- full screen's row glyphs;
- the card's stage pill;
- the history steps.

**Left, because they are not stage glyphs:**
- on the Contact list: the your-move "!" badge on discs (already the rust "!");
- on the Query Centre: the Your move group's tone art, the Your move chip and quick pick (words only), and the "Where it stands" marks (swatches).

## Locks: CL255

Run at 1512 × 900 and 1280 × 800 with the shell. `tests/e2e/cl255.measure.ts`, with `CL255_BASE` and `CL255_MUTATE`.

| Lock | On v25.5 | On the v25.4 base | Under its own break |
|---|---|---|---|
| G1 profile | 38/38 | 2/38 red | red ("You and" left on Profile) |
| G2 reach | 25/25 | 1/19 red | red (plain text rows) |
| G3 history | 68/68 | 1/11 red | 67/69 red (a bar on an offer) |
| G4 not queried | 8/8 | 2/8 red | red (a blank tab) |
| G5 wide | 8/8 | 2/8 red | red (the old fact grid) |
| G6 your move | 12/12 | 6/12 red | red (the half glyph) |

All six also pass against dev itself. The red-first log is `redfirst.txt`.

**One fix to my own lock:**
- G1 first stayed green under its break. The injected "You and …" label is uppercase, and `innerText` returns the transformed "YOU AND".
- G1 now reads `textContent`, case-insensitively. It is red under the break and green on the change.

**Where G3's figures come from:**
- Each step's date comes from the query document's own fields, via `cl255Data.mjs` (read-only), never from the page.
- Its rust count is recomputed from the stored send date and the agent's reply weeks.
- It also proves both branches ran: a story of three or more steps, and a bar with rust.

### L1

| Suite | Result |
|---|---|
| CL254 | 7/7 |
| CL253 | 3/3 |
| CL252 | 7/7 |
| CL251 | 6/6 |
| CL25 | 5/5 |
| QC150 | 25/25 |
| QC1501 | 15/15 |
| QC1492 | 4/4 |
| QC149 | 17/17 |
| HR1 | HR1-1…7 green; HR1-8's phone `/agents` reading red as on the base (red since v24) |

Two more notes:
- **QC149-L0 is red on the v25.4 base too, identically:** the Versions page differs from its stored screenshot by the same 20,121 pixels on both builds, with 0 of 18 parts differing in style. This pack doesn't touch Versions.
- **One re-point:** CL252-C1 opened the inline Replies edit by clicking the old "Replies in" fact. It now clicks the reply scale, which opens the same edit (comment in the test).

## Screens (dev, `index-C6Y5YnWL.js`)

| Reference | Dev |
|---|---|
| `design-refs/contact-list-v25-5/screens/01-profile-waiting-1512@2x.png` | `screens/01-profile-waiting-1512.png` |
| `…/02-history-waiting-1512@2x.png` | `screens/02-history-waiting-1512.png` |
| `…/03-profile-your-move-1512@2x.png` | `screens/03-profile-your-move-1512.png` |
| `…/04-history-your-move-1512@2x.png` | `screens/04-history-your-move-1512.png` |
| `…/05-profile-not-queried-1512@2x.png` | `screens/05-profile-not-queried-1512.png` |
| `…/06-history-not-queried-1512@2x.png` | `screens/06-history-not-queried-1512.png` |
| `…/07-your-move-header-1512@2x.png` | `screens/07-your-move-header-1512.png` |
| `…/08-full-screen-1512@2x.png` (the old wide card; Part C governs) | `screens/08-full-screen-1512.png` |

## Deploy and clean-up

- Dev served `index-BWCFj_tT.js` (my v25.4) before the deploy.
- The integration branch is a fast-forward of that branch, so its tree is the gated one.
- I built it with `build:dev` in a clean, detached worktree and deployed hosting only, to `scriptally-dev`.
- The worktrees (`ScriptAlly-cl254`, `ScriptAlly-cl255`, `ScriptAlly-cl255int`) and their preview servers were removed after this report was committed.

## For Nick

- **An agent not queried for the book in scope, but queried for another, shows that other book's story on History.** For example, Theo Abara is under "Not queried" for Murphy's Day Out, and his History shows Harbour of Glass's steps under its book line. That follows the pack ("other books"), but nothing on the tab says "Not queried for Murphy's Day Out yet". The old wide card said that. One line would bring it back if you want it.
- **On the wide card at 1512, the two tiles are narrow** (about 135px each), so "Open to queries" wraps onto two lines. The panel card holds it on one line.
- **The harness account has few reply times on its your-move and waiting agents.** Most of them show the "Reply time not known yet" scale and a caption-only waiting line. The full bar (navy and rust) shows on the seeded agents, such as seed-agent-4 at 12 weeks against 8.
