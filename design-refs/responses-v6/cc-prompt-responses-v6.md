# Responses v6: the answers page in the current look (QueryHawk)

You are restyling the Responses page (`/queries/responses`) to a frozen design reference. Read this whole prompt before touching anything. UK spelling throughout, in code comments, copy and the report.

**What this is.** Responses v5 is built (branch `responses-v5`, on the dev chain as `-rsp5`). Its content, data layer, panel and journeys mostly stand. This run gives the page the look of the latest Query Centre (v151.2), Contact list (v26) and Dashboard (v2), and changes a few sections. **v5's derivations, `RspPanel`, `?answer=` deep link, journeys and share builder stay.** Where v5 and this prompt differ, this prompt wins.

## Global rules (apply to every phase)

- Read `CLAUDE.md` first and obey its working discipline. Where this prompt and CLAUDE.md disagree on git hygiene, CLAUDE.md wins.
- Work in your OWN worktree on a short-lived branch `responses-v6`. **Base:** the branch dev serves, if it contains Responses v5; otherwise `responses-v5`. Report which you used and its tip. Run `git worktree list` first; if more than 5 exist besides the primary, tell me and offer to clean up the clean ones. Symlink the primary's `node_modules`.
- Stage by explicit path, `git commit --only -- <paths>`. Never `git add -A`, `--amend` or `git stash`.
- Record baseline `tsc`, production build and full Vitest BEFORE any edit. The gate is "no worse than baseline". Use `set -o pipefail`; read counts, never just exit codes or `tail`.
- After every commit, `git status` is clean for the paths you own. `git diff --name-only HEAD` is empty before every gate.
- **The design ref is the oracle.** Port it; never translate it to prose. Read values from the ref's CSS and from existing code, not from the screenshots.
- **Reuse shared parts.** Where a part lives on another page and isn't shared, build a page-local copy from the same values, mark it as a lift candidate in a comment AND in the report. Never edit another page to share it.
- Copy exactly as the ref has it. Plain, informational, no quips. No small uppercase mono eyebrows above headings (the column headings inside the wall's bands are mixed-case serif in this version).
- QueryHawk never uses green in the UI, **except** where an existing Query Centre status token already does (see D9). Never introduce a new one.
- No packages anywhere on this page (Pro feature): no package chips, columns, figures or copy.
- Deploy to dev when the run is complete (hosting-only unless rules changed). Prod is mine.

## Step 0 — recon gate (STOP and report if any red gate fails)

1. Confirm `design-refs/responses-v6/responses-v6.html` exists and matches `design-refs/responses-v6/SHA256SUMS`:
   `58ae3f7f4c00cb23fceee9174ad49993e2298b9809d788db4d2a17372855b427  responses-v6.html`
   **RED GATE:** absent or mismatched → STOP. Never substitute `responses-v5` or older.
2. Confirm the worktree is level with its base and read `git log --oneline -15`. Has any of this landed already? Say so first.
3. Confirm Responses v5 (`src/components/responses/*`, `src/lib/responses.ts` with v5's functions) is on the base and renders. **RED GATE:** if not, STOP and report where it lives.
4. Locate by reading code, with file paths:
   a. the Query Centre v151.2 **navy header card** (`hero-navy`: title, italic subline with typewriter figures, pill buttons);
   b. the **standard query card** — the landing hero's living card (`src/marketing/HeroCard.tsx` / `heroCard.css`) and any in-app version of it. **This page must render that card, not a second build of it.** If only the marketing copy exists, report it and make an in-app wrapper that imports the same component/styles;
   c. the Query Centre's **status colour tokens** (stage pill caps and group-head colours) and the **Your move / With the agent** group classification;
   d. the Query Centre's **Gone quiet** classification and the **expected-reply date** on `QcRow` (`expectedMs` / `expectedKind`);
   e. the Dashboard v2 **card construction** (white rim, hairline inner frame, tinted head band);
   f. `gatePaths` (the tally drawing) and `RspShare`.
   **RED GATE:** if (c) or (d) can't be found, STOP. Every colour and date here must match the Query Centre.
5. Write down, component by component, what of v5 survives on the base before you change anything.
6. Name any false premise at the TOP of your report, before any fix.

## The page, top to bottom (populated)

**1. Header** — the Query Centre's navy header card.
- Title "Responses"; subline "{book} · **{sent}** queried".
- Under it, the **tally line**: one thin mark per query (blush = asked for more, grey = passed, faint = everything else, in that order), then "**{rate}%** response rate · {replies} of {sent} replied".
- **Response rate = (asked for more + passed) ÷ queried.** No-reply closes and still-waiting queries count in the denominator, never the numerator. This is the only response-rate figure on the page.
- Buttons, right: `Share your wall of no` (outline, scrolls to the wall) and `+ Record a response` (white, query panel v2's existing `openRecordPicker`).

**2. Two stat cards** (replies only — Dashboard card construction, side by side):
- **Asked for more** (blush band): big number left; right, a list with a glyph disc per row — Partial (partial requested or sent), Full (full requested or sent), Revise & resubmit, Offer — each with its count. Rows at 0 are omitted. Click → scroll to the requests.
- **Passed** (grey band): big number; rows At the query / After a partial / After the full (from `furthest`). Click → the wall with its filter on Passed.
- **No corner facts** in the bands. No "No reply" or "Still waiting" cards.
- **No requests yet** (asked for more = 0, at least one reply): the Asked for more card keeps its band, shows a faint "0" on the right, and in place of the list shows a glyph disc, a heading and copy:
  - fewer than 10 replies → "It's early days" / "Only {replies} of the {sent} agents you've queried have replied so far, and {waiting} are still to come back to you. A few noes before the first request is a normal part of querying."
  - 10 or more replies → "No requests from {replies} replies" / "That's worth a pause before you send your next batch. Writers in this spot often take a fresh look at their query letter and opening pages, and check that each agent is actively looking for their genre." plus the link "See what the passes said →" (scrolls to the wall).
  - The requests section (3) is not rendered at all in this state.

**3. Agents who want to read on** — the request carousel in the "Row" format.
- Heading and line as v5 (no dashed art box).
- **Each item is the standard query card (4b), unrotated, 440px wide.** Band follows the Query Centre groups: **Your move** navy/white (offers included), **With the agent** stone. The status pill takes its stage colour. The timeline opens scrolled to its latest step. Footer: the deadline on the left (rust when it's your move), the state's action on the right, running the existing journeys exactly as v5 does.
- The row: both edges fade into the page (60px mask), round arrow buttons sit on the edges (hidden at the ends), and under it a dot per card (your-move dots blush, current dot a navy pill) with "{n} of {N}". Arrow keys step when nothing is focused in an input. Order as v5 (your move first, then newest).

**4. What your answers tell you** — one Dashboard card with a navy band and a chip "{replies} of {sent} replied". Inside: v5's intro line, three tiles (days to the quickest request, % asked to read more, typical wait), then v5's three-up showcase below a hairline. The "came with a note" item's subject band is grey (they're passes). Early days: v5's warming-up cards. With no requests, the first showcase item becomes "Passes came in {n} days" with the quickest answer as its subject.

**5. How long agents took** — Dashboard card with an oat band and "Typical wait **{n} days**" on the right; v5's lead line, key, four bars and waiting line inside. Bars use the status colours.

**6. In their words** — on the page (no paper band). v5's segmented filter and quote cards, restyled as the ref.

**7. The wall** — the blush banner (rounded, no point), the tally and caption, then:
- the Query Centre's segmented tabs `All {n} · Passed {n} · No reply {n}`;
- a row "Showing **{x}** of **{n}** nos" with Find an agent, Filters and Full screen on the right, above a hairline;
- **each month is its own rounded sheet** with the Query Centre's **Closed grey** band holding the month, its count and the column headings (Queried · Answered · Took · Got as far as · What they said), sticky within its group; sorting stays on the headings, as v5. Sorted by anything other than Answered, one sheet headed "{n} nos".
- Rows as v5: agency in mono caps under the name, grey face discs, the "What they said" tag as a pill with a grey glyph cap (notes included).
- Then the Query Centre's oat end card: a small navy share preview, "That's all {n}.", the line, and `Make a share image` opening the existing `RspShare` unchanged.

**8. The answer panel** — unchanged from v5, except its status strip colours follow D9.

## Nothing back yet (0 replies)

- **Header:** subline "{book} · {sent} queried"; tally line all faint, "Nothing back yet · {waiting} out with agents"; buttons `Open the Query Centre` and `+ Record a response`.
- **While you wait** — Dashboard card with an oat band, "{waiting} out with agents" on the right:
  - three figures in one framed row: {waiting} queries out ("The first went out on {date}."), {date} next reply due ("{agent} at {agency} gives {n} weeks.", omitted if none), {n} gone quiet (soft blush cell when > 0, with "Open your To-do list →").
  - **When replies are due**: a horizontal timeline from just before the first query to a fortnight past the last due date. Each waiting query **with a stated reply time** is a disc (initials) at its expected reply date — **from `QcRow.expectedMs`, never re-derived** — stacked into lanes so discs never overlap. A navy Today line; a blush **This week** band from today to +7 days labelled "This week · {n}"; month ticks beneath. Gone-quiet discs (from the Query Centre's own classification) are blush; the next due disc has a navy ring with a slow pulse (off under reduced motion).
  - **Hover or focus a disc:** a navy pop-up (name, agency, "Queried {date} · gives {n} weeks", then "Reply due {date} · in {n} days" or, in blush, "Reply time ran out {n} days ago · nudge or close", then "Click to open the query"); a line from the queried date to the disc (navy, or blush if gone quiet); the other discs fade. **Click** opens `RspPanel`.
  - **Hover a figure:** "queries out" lifts every disc; "next reply due" picks out that disc; "gone quiet" picks out the gone-quiet discs.
  - Queries with **no reply time** sit in a row beneath, "No reply time given", one chip each ("{name} · queried {date}"); clicking opens the panel.
- **What this page will show you** — three Dashboard cards with tinted bands (Track your requests · Keep their notes · Your wall of no), each with an inert example (a scaled standard query card, a quote card, a tally) tagged "Example", and one line of copy. Example data is fixed, clearly fake, and never the writer's.
- Switches to the populated page the moment the first answer is recorded, without a reload (as v5).

## Baked decisions (do not relitigate)

- **D1.** Every figure comes from `src/lib/responses.ts` over the Query Centre's rows, extended with pure functions as needed (`responseRate`, `requestBreakdown`, `passBreakdown`, `noRequestsState`, `waitTimeline`). One clock per render.
- **D2.** Placement stays v5's (asked for more / passed / no reply / still waiting; withdrawn and signed off the page; each answered query once, by its latest answer).
- **D3.** The response rate counts replies only (asked for more + passed) over queried. "Answers" (which include no-reply closes) is no longer shown anywhere on the page.
- **D4.** The early-days threshold is **10 replies**, as a named constant.
- **D5.** The carousel item is the standard query card. Do not build a Responses-only card.
- **D6.** The timeline's dates and gone-quiet flags come from the Query Centre's derivations (Step 0.4d). If a disc and the Query Centre ever disagree, that's a bug.
- **D7.** Removed from v5: the white title card with the blush highlighter and wall-hawk art, the four At a glance cards and their sentence, the dashed illustration boxes beside section headings, the full-width navy insights band, the paper band behind In their words, and v5's flat wall sheet with month dividers.
- **D8.** The ref's bottom-left STATE switch, its sample data and the "No requests" mock state are mock-only. Don't build them.
- **D9. Colours are the Query Centre's tokens** (read from code, don't hard-code new ones): Queried sand, partials blush, fulls pale blue, Offer as the Query Centre has it, Passed / No response grey with grey text; group heads Your move navy, With the agent stone, Closed grey. Revise & resubmit uses blush. Report the Offer token's value.
- **D10.** The sidebar and shell are out of scope.

## Phases (one commit each)

1. **Data layer** — D1's functions, pure, with red-before unit tests: rate maths (no-reply in denominator only); breakdown rows sum to their card; the no-requests state flips at 10; the timeline's dates equal `expectedMs` and its gone-quiet set equals the Query Centre's for the same rows.
2. **Header** — navy card, subline, tally line (populated and empty), buttons.
3. **Stat cards** — the two cards, clicks, the no-requests messages, hiding the requests section.
4. **Request carousel** — standard card, Row format, dots, arrows, keys.
5. **Insights and timing** — the navy-band card with tiles and showcase; the oat-band timing card.
6. **In their words and the wall** — restyle, tabs, Showing row, grouped Closed sheets with sticky headings, end card.
7. **Nothing back yet** — header variant, While you wait (figures, timeline, interactions, no-time row), the three preview cards.
8. **Locks and dev** — `tests/e2e/rs6.measure.ts` with a self-cleaning fixture at 1512 and 1280, each lock red first by a named mutation (`RS6_MUTATE=<lock>`):
   - H1 header tally has one mark per query; the rate equals the lib's;
   - S1 exactly two stat cards; their breakdown rows sum to their numbers; zero rows absent;
   - S2 at 0 requests: early copy below 10 replies, advice copy at 10+, requests section absent;
   - C1 each carousel item is the standard query card component (assert by component marker/class, not by look); your-move items first;
   - C2 edge arrows hide at the ends; dots and "n of N" track the scroll;
   - W1 every month group has the Closed grey band and its own headings; rows sum to the tab count;
   - E1 timeline discs sit at `expectedMs` (±1 day of pixel width); gone-quiet discs equal the Query Centre's set; no two discs overlap;
   - E2 hover shows the pop-up and the span; click opens `RspPanel` for that query;
   - P1 no package text or class anywhere on the page;
   - smoke tests for populated, no-requests and empty states in `src/test/pageSmoke.tsx`.
   Retire superseded rs5 locks in `tests/e2e/RETIRED-responses-v6.md`, one line each with the reason. Update CLAUDE.md with a "Responses v6" section in the house style. Deploy to dev from a dev branch named after the current dev chain plus `-rsp6`.

## Do not touch

- The sidebar and shell (`src/components/shell/*` except reading shared pieces).
- The Query Centre, Contact list, Dashboard, Analytics, Versions, Submission packages and landing pages, their CSS and locks. Read and reuse; never edit. If a shared piece needs a change, STOP and report.
- `gatePaths`, `RspShare`'s output, `RspPanel`'s journeys.
- `firestore.rules`, functions, prod config. Manuscripts page files.

## Final report (in this order)

1. False premises.
2. The base used, and what survived from v5 (Step 0.5).
3. Per phase: commit hash, what changed, gate counts against baseline.
4. Every lock with its red-before mutation and result.
5. Lift candidates (page-local copies), and the Offer colour token's value.
6. Anything you couldn't match to the ref, with a screenshot pair (ref vs build) at 1512 and 1280.
7. Dev deploy: branch, commit, URL.
8. Worktree removed, or kept and why.
