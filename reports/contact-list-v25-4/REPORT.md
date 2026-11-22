# Contact list v25.4 — simpler rows

Done and on dev, served as `index-BWCFj_tT.js`. The branch is `contact-list-v25-4` (`b53c2ace`, plus this report) and the integration branch is `dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252-pk40-cl253-db93-cl254`. Nothing was merged to main and prod is untouched.

## False premises

- **"Queried · Partial requested" doesn't fit at the pack's widths above 1440.** The pack checks only 1280, where Your query is 252px wide and every stage fits. Above 1440 the pack's 1.7fr track gives the words 193px at 1512, and less just above 1440. Three stages are wider than that:

  | Stage text | Width |
  |---|---|
  | "Queried · Partial requested" | 194px |
  | "Queried · Revise & resubmit" | 202px |
  | "Queried · Closed with no reply" | 219px |

  This app's sheet is 1,200px at 1512, the same as the mock's. Measured off the screen, the mock's own column is wider (about 243px). Fix: under Decisions made.
- **v25.3's "first missing field" order is Housekeeping's points order.** That is usually Replies in, not genres, so the profile link on a genre-less agent with no reply time opens at Replies in. The pack says to follow v25.3's order, so I did.
- **An agent with no genres may have no Housekeeping gap.** If Housekeeping's genres gap was put off with Later, the agent has none, so the link falls back to opening at genres.
- **Fixtures.** The harness account has one agent with neither genres nor a reply time, and none with a reply time but no genres. `seedCl254Sparse.mjs` writes one of each, and they are removed in the same run.

## Base

`7205be3b`, the branch dev served as `index-cvalq0h2.js`: v25.3 plus Dashboard v93. It carries CL253.

Baseline on the clean base:
- `tsc` 0, the production build 0 (no CSS warnings) and the dev build 0.
- Vitest: 1 failed test in 3 failed files, all under `functions/` (`eval/run`, `email`, `smartImportCore`); 10,555 passed.

After the change: the same failures, and 10,558 passed (my 3 new unit tests).

## What changed

**A · Column order and widths.**
- The columns are Agent · What they want · Replies in · Your rating · Your query.
- Above 1440 they are 2.2 / 2.5 / 1 / .9 / 1.7fr. At ≤1440 they are 1.9 / 1.9 / .9 / 1.9fr: Your rating drops and Replies in comes back.
- Each heading keeps its v25.1 sort. A heading's `data-col` is its cell's, so the existing "drop column 5" rule still drops Your rating.

**B · Your query, one line.**
- **Queried agents:** the stage's StatusDot (15px) and "Queried", or "Queried · {stage}" in the app's own names (`STAGE_NAME`, for example "Queried · Passed").
- **Not queried:** the dotted ring and "Not queried", with "Log a query" on hover. "Closed to queries" is unchanged.
- **Removed from the row:** the status pill, DAY count, track and next-step line.
- The words come from `lib/contactRow254.ts`, which has a unit test.

**C · Sparse profiles.**
- An agent with no genres shows "Fill in {first}'s profile →", or "Fill in this profile →" for an agency-only record. It is always visible, not only on hover.
- With no reply time either, the link's cell spans What they want and Replies in, and no Replies cell is drawn.
- The link opens the card's edit mode at the first gap.

**D · Where gaps live.**
- **Row:** the hover "Fill in {n} gaps" button, its reserved ≤1440 track, and the copy-email / open-website icons are gone. On hover a row offers only "Log a query" (not-queried agents).
- **Card:** a line at the top of the Profile tab reads "{n} details missing · Fill them in →" (absent at 0). Its link opens the card's edit mode at the first gap.
- **Filters panel:** a new "Profiles" section with **Missing details** and its count, in List and in full screen. It narrows the list to agents with any Housekeeping gap.
- **Where n comes from:** always Housekeeping's per-agent count. `AgentList` now builds Housekeeping's model before the list's facts, so each agent's facts carry `gaps`. Everything that block reads was already declared above it.

## Decisions made

1. **Your query has a 244px floor above 1440:** `minmax(244px, 1.7fr)`. That fits the longest one line ("Queried · Closed with no reply", plus the glyph). The fractions are the pack's, and the floor works like the floors in the mock's own column rules. With it, nothing is cut at 1441, 1512 or 1280 (checked on every row).
2. **The Filters toggle is under a new "Profiles" heading.** The menu's two other sections are Genres and Submissions, and "Missing details" fits neither.
3. **"Missing details" is part of the shared filter model.** It is `ContactFilters.missing`: remembered for the visit, shown as an applied-filter chip, and counted in the filter badge. It is not a page-only switch.
4. **The card's line is on the panel card only**, as the pack names "the card's Profile tab". The full-screen wide card has no tabs and doesn't show it.

## Left unused

- `Track` in `shared/agentRowParts.tsx` (the Query Centre's `Track` in `QcList138` is a different component).
- `rowSecond` in `lib/contactV24.ts`.
- `fillGapsWords` in `lib/contactHousekeeping.ts`.

I left all three in place. `QueryPill` is still used by the card's header.

## Locks: CL254

Run at 1512 × 900 and 1280 × 800 with the shell. `tests/e2e/cl254.measure.ts`, with `CL254_BASE` and `CL254_MUTATE`.

| Lock | On v25.4 | On the v25.3 base | Under its own break |
|---|---|---|---|
| F1 order | 13/13 | 9/12 red | 12/13 red (Query before rating) |
| F2 query | 186/186 | 0/186 red | 86/186 red (the pill restored) |
| F3 link | 127/127 | 107/121 red | 121/127 red (link on hover only) |
| F4 no row actions | 42/42 | 2/42 red | 2/42 red (the gaps button restored) |
| F5 fit | 4/4 | 2/4 red | 3/4 red (column narrowed) |
| F6 gaps home | 9/9 | 2/7 red | 6/9 red (the card's count off by one) |

All six also pass against dev itself. Ledgers are in `ledger/`, and the red-first log is `redfirst.txt`.

Where the figures come from:
- F2's stages and F3's genres and reply times come from Firestore (`cl254Data.mjs`, read-only).
- F6's count comes from Housekeeping's own drawer (its By agent view), never from the row.

F6's break is a script that adds one to the card's number. The pack named the break "count from the row", but that would need a build carrying a second count. Off-by-one tests the same thing: n must equal Housekeeping's.

### L1 and re-points

L1 passes:

| Suite | Result |
|---|---|
| CL253 | 2/2 |
| CL252 | 6/6 |
| CL251 | 5/5 |
| CL25 | 4/4 |
| QC150 | 25/25 |
| QC1501 | 15/15 |
| HR1 | HR1-1…7 green; HR1-8's phone `/agents` reading red as on the base, which has been red since v24 |

Re-points, each with a comment in the test:
- **CL253 E2, E3 and E4 are retired.** They measured the hover gaps button. Their rules now live in CL254 F3, F4 and F6.
- **CL252 A1:** the new heading order.
- **CL252 A5:** reads the one-line query; the pill, track and day count are gone.
- **CL252 A8:** on hover, no gaps button.
- **CL251 E1 and E3:** Your query is now the last column and Your rating comes just before it. The pack didn't list these; they assert the order this pack changes.

## Screens (dev, `index-BWCFj_tT.js`)

| Reference | Dev |
|---|---|
| `design-refs/contact-list-v25-4/screens/01-rows-sparse-1512@2x.png` | `screens/01-rows-sparse-1512.png` |
| `…/01-rows-sparse-1280@2x.png` | `screens/01-rows-sparse-1280.png` |
| `…/02-rows-full-1512@2x.png` | `screens/02-rows-full-1512.png` |
| `…/03-not-queried-1512@2x.png` | `screens/03-not-queried-1512.png` |

## Deploy and clean-up

- Dev served `index-cvalq0h2.js` when I started and again just before the deploy.
- The integration branch is a fast-forward of the branch dev served, so its tree is the one the gates and L1 ran on.
- I built it with `build:dev` in a clean, detached worktree and deployed hosting only, to `scriptally-dev`. Dev now serves `index-BWCFj_tT.js`.
- The worktrees go when v25.5 is done (this run continues straight into v25.5 on top of this branch).

## For Nick

- **The harness account can't show the mock's your-move row with a profile link.** Its your-move agents all have genres; the link is exercised by the Not queried fixtures instead.
- **"Closed to queries" still uses its v25.1 mono pill**, which sits next to the new serif one-line status. The pack says it is unchanged, so I left it, but it is the one Your query cell that still reads in a different voice.
