# Responses v5 — the answers page, rebuilt in the current look (QueryHawk)

You are building the Responses page (`/queries/responses`) to a frozen design reference. Read this whole prompt before touching anything. UK spelling throughout, in code comments, copy and the report.

## Global rules (apply to every phase)

- Read `CLAUDE.md` first and obey its working discipline. Where this prompt and CLAUDE.md disagree on git hygiene, CLAUDE.md wins.
- Work in your OWN worktree on a short-lived branch `responses-v5` cut from `main`. Run `git worktree list` first; if more than 5 exist besides the primary, tell me and offer to clean up the clean ones before adding yours. Symlink the primary's `node_modules`; never install a second copy.
- Stage by explicit path, `git commit --only -- <paths>`. Never `git add -A`, never `--amend`, never `git stash`.
- Record baseline `tsc`, production build and full Vitest BEFORE any edit. The gate is "no worse than baseline", not "green". Use `set -o pipefail`; read counts, never just the exit code or `tail`.
- After every commit, `git status` must be clean for the paths you own. Check `git diff --cached --name-status` and take both sides of any rename.
- The design ref is the oracle, not your judgement. Port it; never translate it to prose. Read design values from the ref's CSS and from existing code, not from the screenshots.
- Name and extend existing primitives. A page-local copy is allowed only where the shared piece doesn't exist yet; mark it as a lift candidate in a comment AND in the report.
- No verdict words anywhere in copy or code-generated text: no "overdue", no red states, no ratings, no appraisal. The app reports facts.
- Copy is plain and informational. Use it exactly as the ref has it. Never invent quips.
- No small uppercase mono "eyebrow" labels above headings. The ref has none; do not add any. Column headings in the list are the one existing mono-caps exception, as on the Query Centre.
- QueryHawk never uses green in the UI.
- Deploy to dev when the run is complete (hosting-only unless rules changed). Prod is mine; never touch it.

## Step 0 — recon gate (STOP and report if any red gate fails)

1. Confirm `design-refs/responses-v5/responses-v5.html` exists and that `sha256sum` matches `design-refs/responses-v5/SHA256SUMS`:
   `292bf87fc6d25793784f9d2f5cc7f28a217ca34dad2ba371f727210d7aafc1e9  responses-v5.html`
   **RED GATE:** absent or mismatched → STOP. Never substitute `responses-v4` or anything older.
2. Confirm the worktree is level with `main` (`git rev-list --count HEAD..main` = 0) and read `git log --oneline -15`. Has any of this already landed? Say so before doing anything.
3. Confirm Responses v2 (`src/components/responses/*`, `src/lib/responses.ts`) is on `main` and renders at `/queries/responses`. **RED GATE:** if it lives only on a branch, STOP and report where.
4. Locate, by reading code (not guessing), the shared pieces this page must reuse, and list each with its file path:
   a. the title-card page header used by the Query Centre v150 and Versions v2.2 (white rounded card, Special Elite title with the blush highlighter band, intro line, navy primary + white secondary button, illustration on the right);
   b. the Query Centre's "At a glance" stat cards (tinted head strip with dot, label and icon slot; big Special Elite number; face discs);
   c. the navy list toolbar and its sticky column headings, plus the cream "ledger" group heading;
   d. the packages page's "how they're doing" showcase (a subject card with a stats card overlaid; metric as the heading, contents as sub-text) from `submission-packages-v38`/`v40`;
   e. the Query Centre's own "Gone quiet" classification (v141.1) and the expected-reply date derivation on `QcRow` (`expectedMs` / `expectedKind`);
   f. where an agent's stated reply time is stored and how the Query Centre reads it.
   **RED GATE:** if (e) or (f) cannot be found, STOP. Those figures must come from the same derivations the Query Centre uses, or the two pages will disagree.
5. Write down, component by component, what of Responses v2 survives today on `main` (header, card, carousel, banner, tally, list, share builder, panel, empty page) before you change anything.
6. Name any false premise in this prompt at the TOP of your report, before you apply any fix.

## What the page is (summary of the ref, top to bottom)

Populated (any answers recorded):
1. **Title card**: "Responses", with the line "Every answer from agents on **{book}**: who wants to read on, who passed, and what the answers have in common." Buttons: `+ Record a response` (query panel v2's existing door) and `Share your wall of no` (scrolls to the wall). Illustration: `public/images/responses/responses-wall-hawk.webp`.
2. **At a glance**: four stat cards. Each card's head has a short fact; each body has the count and up to 6 faces plus "+n".
   - Asked for more (blush head): fact = "{n} your move". Click scrolls to the requests.
   - Passed (grey head): fact = "{n} with a note". Click scrolls to the wall and sets its filter to Passed.
   - No reply (hatched grey head): fact = "after the wait". Click scrolls to the wall and sets its filter to No reply.
   - Still waiting (sand head): fact = "{n} gone quiet". Click scrolls to How long agents took.
   Below the cards, one sentence: "You've heard back from **{replies} of {sent}** agents you've queried, and **{more}** of them asked to read more."
3. **Agents who want to read on**: the request carousel. Your-move cards come first, then newest. The section heading has an illustration placeholder on its left (as every section heading in the ref does) and a "{n} waiting on you" sub-line. Cards use the landing-card grammar as in the ref, with no mono labels.
4. **What your answers tell you**: a full-width navy band with an art placeholder, a heading, a line, and three figures: % of agents queried who have replied, % who asked to read more, typical wait in days. Below it, the three-up showcase:
   - **Requests came in {a} days, passes in {b}**: the median days from query to first answer for requests / passes / no-reply closes. The subject card is the writer's quickest request.
   - **{x} of {passes} passes came after reading pages**: passes at the query / after the partial / after the full (`furthest`).
   - **{n} of {passes} passes came with a note**: with a note vs form reply.
5. **How long agents took**: one white well, four horizontal bars (Within 2 weeks / 2 to 4 weeks / 4 to 8 weeks / Over 8 weeks). Each bar is split into Asked for more / Passed / No reply, with the count printed inside each segment and "{n} answers" on the right. Above the well: "Most of your answers came **{bracket}** after you queried. Your typical wait for a reply is **{n} days**." Under the bars: "**{n}** still waiting, and **{m}** have gone past the reply time the agent gives. Their nudge and close dates are on your To-do list."
6. **In their words**: on the paper-white band, a masonry of quote cards (personal rejection notes and revise-and-resubmit notes), filterable All / With a pass / With a request, with the line "To add a note to an answer, open it and choose Edit the response."
7. **Blush banner, then Your wall of no**: the hand-drawn tally (keep v2's `gatePaths` exactly), the caption "{p} passes, {r} no reply · {n} came with a note", then the list in a white sheet under the navy toolbar: search, All / Passed / No reply segmented, Filters, Full screen.
   - Columns: AGENT · QUERIED · ANSWERED · TOOK · GOT AS FAR AS · WHAT THEY SAID.
   - TOOK shows "{n} days", "they say {w} weeks" (or "no time given"), and a small bar with a marker at their stated time.
   - Sorted by Answered, newest first, grouped by month under the cream ledger heading. Sorting is on the column headings only.
   - Then the share card ("Share your wall of no" + preview), which opens the EXISTING share-image builder (`RspShare`) unchanged.
8. **The answer panel**: any card, quote, bar segment's agent or list row opens the existing `RspPanel` container (`?answer=`).
   - Its content follows the ref's drawer: status strip in the state colour, What they said, a facts grid (Queried, Answered, First answer took, They give, Got as far as, Answer), and The journey (glyph per step with date).
   - Footer: the state's own action (Mark partial sent / Mark full sent / Answer the offer / Record the resubmission / Record a response / Edit the response) plus Open in the Query Centre. Actions run the existing journeys exactly as v2 does today.

Early days (1–4 answers): the navy band's line reads "These fill in as answers arrive…". The three showcase items become "warming up" cards (dashed outline, 5-step progress, "{got} of 5 answers needed. {left} more and this fills in."). Everything else renders with whatever exists. See screens `10-early-days-insights-*`.

Nothing back yet (0 answers): see screens `11-` and `12-`.
- The title card line becomes "Nothing back from agents on **{book}** yet. When the first answer arrives, record it here and this page starts to fill up." Buttons: `+ Record a response` and `Open the Query Centre`.
- **While you wait**: three cards.
  - {n} queries out with agents, with "The first went out on {date}" and faces.
  - The next reply you can expect: the earliest future expected date, naming the agent, agency and the weeks they give. Omit this card if none exists.
  - {n} agents have gone quiet: blush when n > 0, with "Open your To-do list →".
- **What this page will show you**: three alternating picture-and-text rows, each with a real component on an oat panel tagged "Example":
  - **Track your requests**: "See who asked for pages, what they want and when to send it." with an example request card.
  - **Keep your notes**: "Every personal note from an agent, saved in one place." with an example quote card.
  - **Rejection collection**: "Each no adds a mark to your wall. Share it when you're ready." with an example tally.
  Example data is fixed, clearly fake, and never the writer's.
- It switches to the populated page the moment the first answer is recorded, with no reload (as v2 does).

## Baked decisions (do not relitigate)

- **D1. No packages anywhere on this page.** Packages are a Pro feature. No package chips, no package column, no package figures, no package copy, no Pro tags.
- **D2. Every figure comes from `src/lib/responses.ts` over the Query Centre's own rows (`buildQcRows`)**, extended with pure functions.
  - Add at least: `firstAnswer(row)` (the first agent step after Queried, its kind and days), `waitBrackets(items)`, `medianDays(list)`, `passDepth(items)`, `noteSplit(items)`, `nextExpected(rows, nowMs)` and `goneQuiet(rows, nowMs)`.
  - `goneQuiet` and `nextExpected` MUST call the Query Centre's own Gone quiet and expected-date logic, never re-derive it.
  - One clock per render, as v2 does.
- **D3. Placement stays v2's:**
  - Asked for more = Partial/Full requested, R&R, Offer and the three sent states.
  - Passed = Rejected.
  - No reply = No Response.
  - Still waiting = Queried.
  - Withdrawn and Signed are not on the page.
  - Each answered query appears once, by its latest answer.
- **D4. "Typical wait"** = the median days from query to first answer, over requests and passes only (no-reply closes excluded). The four wait brackets use first-answer days INCLUDING no-reply closes, so each bar adds up to its "{n} answers".
- **D5. A personal note** = `rejectionFeedbackType === "detailed"` with `rejectionFeedbackText`, or `rrNotes` on an R&R. Notes are shown exactly as stored: no summarising, no themes, no AI anything.
- **D6. Gone quiet** wording only. Never "overdue" or "late".
- **D7.** The header's `+ Record a response` stays query panel v2's door (`openRecordPicker`). Do not create a second record flow.
- **D8.** The ref's bottom-left "STATE" switch and its fake data are mock-only. Do not build them.
- **D9.** The ref's sidebar shows a "Responses" row. **Out of scope for this run.** Do not touch the sidebar.
- **D10.** Illustration slots are dashed placeholders, as in the ref, until art is supplied. The title card uses the existing wall hawk.
- **D11.** The empty and early-days states are part of this build, not a later pass.
- **D12.** Section order is exactly as listed above. Do NOT move the timing or insights sections to Analytics in this run; that is a separate decision.

## Phases (one commit each)

**Phase 1 — data layer.**
- Extend `lib/responses.ts` with D2's functions; pure, no Firebase imports.
- Unit tests in `src/lib/responses.test.ts`, each red-before (delete the fix, see it fail, restore):
  - brackets sum to the answered count;
  - the median excludes no-reply closes;
  - pass depth matches `furthest`;
  - note split respects D5;
  - `goneQuiet` and `nextExpected` agree with the Query Centre's figures for the same rows.
- Commit.

**Phase 2 — title card and At a glance.**
- Reuse 4a and 4b. Remove v2's centred header, summary card and Reply rate ring from the populated page.
- Glance clicks scroll, and set the wall filter where the ref says.
- Commit.

**Phase 3 — the request carousel.** Restyle to the ref; keep v2's ordering, card actions and in-panel journeys. Commit.

**Phase 4 — insights band, showcase and warming-up state.**
- The navy band and the three-up showcase (page-local copy of 4d if it isn't shared; lift candidate).
- Early-days warming-up cards below 5 answers.
- Commit.

**Phase 5 — How long agents took.** The four-bar well, the sentence above it and the waiting line below it. Hovering or focusing a segment lists its agents' names; clicking a segment does nothing. Commit.

**Phase 6 — In their words.** The masonry, the three filters with counts, and cards opening the panel. Commit.

**Phase 7 — the wall.**
- Banner, tally (v2's `gatePaths` untouched), caption.
- The list on 4c's toolbar and headings, with columns per the ref (no package column). Month grouping, sortable headings, search with `/`, sticky headings.
- Keep v2's pinned behaviour and its hysteresis. Share card opening the existing builder.
- Commit.

**Phase 8 — the panel.** Restyle `RspPanel`'s contents to the ref's drawer, keeping the container, the `?answer=` deep link, ↑/↓ walking and every existing journey. Commit.

**Phase 9 — nothing back yet.** Replace `RspEmpty` with the ref's empty page (title card variant, While you wait, What this page will show you). Commit.

**Phase 10 — locks and dev.**
- `tests/e2e/rs5.measure.ts` with a self-cleaning fixture `seedRs5.mjs`, at 1512 and 1280. Each lock is proved red first by a named mutation (`RS5_MUTATE=<lock>`):
  - A1 the title card matches the ref's geometry ±2;
  - A2 the four glance counts sum to answered + waiting, and their clicks land where specified;
  - B1 your-move cards first;
  - C1 the three band figures equal the lib's;
  - C2 warming-up shows at 1–4 answers and not at 5;
  - D1 bracket segments sum to the row total and the rows sum to answered;
  - E1 the note filter counts;
  - F1 the list has exactly six columns and no package text anywhere on the page (assert by text and by class);
  - F2 the month groups and sort;
  - G1 the panel opens from a card, a quote and a row, and its footer action matches state;
  - H1 the empty page shows While you wait and three Example rows, and switches to populated on the first recorded answer without a reload.
- Smoke tests for the populated AND empty states in `src/test/pageSmoke.tsx`.
- Retire superseded v2 locks (rs2) in `tests/e2e/RETIRED-responses-v5.md`, one line each with the reason. Do not delete a lock that still asserts something true.
- Update CLAUDE.md with a "Responses v5" section in the house style.
- Deploy to dev from a dev branch named after the current dev chain plus `-rsp5`, as recent runs did.
- Commit.

## Do not touch

- The sidebar and the ink shell (`src/components/shell/*` except reading shared pieces).
- The Query Centre, Contact list, Analytics, Versions and Submission packages pages, and their CSS and locks. Read their shared components and reuse them; never edit them. If a shared piece needs a change, STOP and report instead.
- `gatePaths` and the share-image builder's output.
- `firestore.rules`, functions, prod config.
- Manuscripts page files (owned by a parallel session).

## Final report (in this order)

1. False premises found in this prompt.
2. What survived from v2 before you started (Step 0.5).
3. Per phase: commit hash, what changed, gate counts against baseline.
4. Every lock with its red-before mutation and result.
5. Lift candidates (page-local copies made).
6. Anything you could not match to the ref, with a screenshot pair (ref vs build) at 1512 and 1280.
7. Dev deploy: branch, commit, URL.
8. Worktree removed, or kept and why.
