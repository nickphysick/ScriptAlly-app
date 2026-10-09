# Contact list v15.3 — report (9 Oct)

One phase on `main`, on top of `036289e7` (v15.2 plus the Query Centre's v133.1). Not deployed.

## 1. Recon

### False premises

1. **The mock's Queried ring is still pale blue.** `design-refs/contact-list-v15-3.html` draws the closed arc in
   `#9fb0c4`; the prompt says grey `#b3aca5`. Built to the prompt: discs, key dot and arc are one grey.
2. **The Query Centre's header is locked to this one, and the new 30px of top padding breaks that lock.**
   `qcV133` H3 holds the header's top, hairline and desk top on `/queries` equal to `/agents`. This header is now
   30px taller, so H3 is red by design (reading under "Neighbours"). Query Centre files were out of scope, so
   nothing there was changed. It needs a ruling: the Query Centre follows, or H3 is released.
3. **The prompt lists three retiring locks; five more readings move.** The same padding moves v15.1's H5 (the
   drawing's top: 30 / 24 is now 60 / 54) and H4's height allowance (14 is now 44). The h1 now carries the words'
   size, so CL15-1's "72 / 58" reads 42 / 34. All three are re-pointed in place with notes.
4. **At 1280 the faces row does not fit beside the drawing with all discs.** The app's text column there is
   526px (942 of content, less the 380 drawing and the 36 gap); the mock's is 579. The rule in §3 applies: the
   harness account shows 6 of its 7 discs at 1280 and all 7 at 1512. The key is never dropped.
5. **"The same derivation as the list's Query status column and the Queried desk card" is two derivations.** The
   list's column reads an agent as active if ANY of its queries is open; the desk reads the LATEST query by sent
   date. They differ for an agent with an older open query and a newer closed one. The faces use the desk's, so
   the key always equals the ring. No agent on the harness account differs between the two.

### Where the data lives

| Need | Where | Note |
|---|---|---|
| Per-agent query status | `lib/contactDesk.ts` `agentQueryStates` (new, factored out of `deskModel`) | Latest query for the manuscript in scope; rejected, no response and withdrawn are closed |
| "Most recent activity" | the same function's `at` | The latest `lastStatusChange` or `dateSent` across the agent's queries |
| `dateAdded` | `Agent.dateAdded` (ISO string) | An agent with no readable date is in no week |
| Weekly series | `lib/qcDeskWeeks.ts` `deskWeeks(now, 8)` | Monday to Sunday by the London calendar; read, not edited |

### v15.2 locks retired (`tests/e2e/RETIRED-contact-list-v15.md`)

- K2's On file row, and "On file's figure is the header's count".
- K3's On file month-on-month line. K3 keeps Queried and Profiles.
- K4's On file line chart, its "{month} → now" caption and its "on file" label.
- K4's ring colour (it was held in `deskCard.test.tsx`, never on the page).
- Unit: the two On file cases in `contactDesk.test.ts` and the line-chart case in `deskCard.test.tsx`.
  `LineChart` is deleted with its only caller.

## 2. What changed

| Part | Change | Files |
|---|---|---|
| Hero number | The h1 holds the count (124px, 98 below 1440) and "agents on file" (42 / 34) on one baseline. It still reads "37 agents on file" as text and keeps `data-page-title`. The header has 30px of top padding. | `ContactOpenHeader.tsx`, `contactV15.css` |
| Faces | Up to 4 active, 2 closed, 2 not queried, in that order. 38 (32) discs, overlapping 7 (5), with a page-colour halo. A tooltip on each; a click opens that agent's card. "+N more", then the key. | `lib/contactFaces.ts` (new), `ContactOpenHeader.tsx`, `contactV15.css`, `AgentList.tsx` |
| Week card | "{n} added this week", "{d} more / fewer than last week" or "Same as last week", and 8 weekly bars. Not pressable. | `lib/contactDesk.ts`, `shell/desk/DeskCard.tsx` (`WeekBars`), `ContactDesk.tsx` |
| Ring | Closed arc `#b3aca5`. | `shell/desk/DeskCard.tsx` |

While the page loads, the hero number and the faces row hold their boxes (a placeholder figure and eight
placeholder discs).

## 3. Locks — `tests/e2e/contactV153.measure.ts`

Red on `036289e7`: there was no hero number, no faces and no week card, so every lock failed at its population
reading ("hn false ht false discs 0 key 0"; "probe file chart line bars 0 rects 0"). Each lock was then broken on
purpose. All 18 mutations went red (`mutation-proofs.jsonl`).

The harness account holds 37 agents: 5 active, 1 closed, 31 not queried, and 4 added this week with none in the
seven weeks before.

| Lock | Green, 1512 / 1280 | Mutation → red reading |
|---|---|---|
| N1 hero | `.hn` "37" at 124 / 98px; `.ht` "agents on file" at 42 / 34px; h1 99.2 / 78.4 tall (limit 136.4 / 107.8); text and drawing centres 0.0 apart | count at 72 / 58px → "72px"; top padding removed and text top-aligned → text 192.9 vs drawing 226.9 |
| N2 order | 7 of 7 discs / 6 of 7: ink, grey, white, a prefix of the rule; z-index falls along the row | slots filled by other groups → "active ×5, closed, none" on the page, and both unit fixtures red |
| N3 colours | ink `rgb(42, 58, 82)`, grey `rgb(179, 172, 165)`, white with an ink ring; ring's closed arc grey | closed left pale blue → discs, key dot and arc read `rgb(159, 176, 196)`; arc alone → the arc reading |
| N4 key | 5 + 1 + 31 = 37; equals the Queried card's "5 active, 1 closed"; "+30 more" / "+31 more" | closed counted from discs (unit, 6/3/5 fixture); not queried counted from discs → "= 8 vs 37"; more counted from 8 → "+29 vs 30" |
| N5 spacing | 16.0 under the subheader; 22.0 above the buttons; row 38 / 32 tall; key ends 36 or more before the drawing | key on its own line → row taller than a disc; margins 6 and 10 → "6.0"; discs never dropped → "key right 834.4, drawing left 851.0, gap 36" |
| N6 week card | "4 added this week"; ▲ "4 more than last week" `rgb(79, 122, 75)`; 8 bars, last at 1, the rest 0.22; "added per week"; no "agents on file" in the desk | v15.2 line kept → "37 agents on file"; every bar solid → "1,1,1,1,1,1,1,1" |

Unit locks (`src/lib/contactDesk.test.ts`, `src/components/shell/desk/deskCard.test.tsx`) hold what the shared
account cannot show:

- N2's two fixtures: 6 / 3 / 5 gives 4 ink, 2 grey, 2 white; 1 / 0 / 9 gives 1 ink and 2 white.
- N6's three comparisons: more, fewer and same (mutation: always "more").
- London weeks: an agent added at 00:30 BST on a Monday is in that week (mutation: weeks cut an hour late).

One lock was wrong on its first mutation run. "Discs never dropped" stayed green, because the row was checked
against the drawing's edge and not against the gap before it. The lock now includes the gap, and the mutation is red.

## 4. Gates

- tsc: 0 errors.
- Vitest: 540 files, 8,462 passed, 3 skipped (baseline 540 files, 8,456).
- Build: exit 0, whole log read: no error and no CSS warning; the standing eval, chunk-size and dynamic-import
  notes only.
- Design refs: 178 checked (the new oracle's hash is in the manifest).

## 5. Neighbours

One worker, on the v15.3 build:

- `contactV153`, `contactV152`, `contactV151`, `contactV15`, `contactV13`: 26 tests, all passed.
- `contactV14`, `contactV11`, `pageHeaderV2`, `qcV133`: 52 tests, 50 passed, 2 failed.

The two failures:

| Case | Reading | Cause |
|---|---|---|
| `qcV133` H3 "the header's top, the hairline and the desk's top equal the Contact list's" | 1512: hairline 401 (Query Centre) against 430.8 (Contact list); desk 473 against 502.8. Green on `036289e7` (401 against 400.8) | This pack's 30px of top padding. Red by design; see false premise 2 |
| `pageHeaderV2` §4.5 "the switcher" (on `/manuscripts/comps`) | a click waits out the test's timeout | Red on the unchanged `036289e7` build too, the same way. Not this pack's |

The first neighbour run also found one regression, fixed before the commit: **CL13-12 (the loading beat)** reads the
title's placeholder shimmer on the h1, and the shimmer had moved to its two spans. It is back on the h1.

## 6. Screenshots

`reports/contact-list-v15-3/shots/`, beside the pack's `screens/`:

| Pack | Built |
|---|---|
| `01-header-and-desk-{1512,1280}.png` | `header-desk-{1512,1280}.png` |
| `02-faces-detail-{1512,1280}.png` | `faces-detail-{1512,1280}.png` |
| `03-added-this-week-card-{1512,1280}.png` | `added-this-week-card-{1512,1280}.png` |

Written only with `CL153_SHOTS=1`.

## 7. Open, for Nick

1. **Query Centre H3** (false premise 2): does the Query Centre's header take the same 30px, or is H3 released?
2. **The disc dropped at 1280** (false premise 4): keep the 36px gap and drop a disc, or let the row use the gap?
3. **Which status rule the faces follow** (false premise 5): the desk's "latest query" (built), or the list's
   "any open query"?
4. A zero week's stub is 2 units of the chart, which is 1.5px at 1280 (the chart is 84 × 30 there). The mock
   draws it the same way.
