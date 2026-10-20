# Analytics v24 — seven plain-English sections, benchmarking, and the steps card

Branch `analytics-v24` (worktree `../ScriptAlly-analytics-v24`), from `origin/dashboard-v59` at **`5f566578`**, the
branch dev served when the pack began. Not merged to `main`. Ref: `design-refs/analytics-v24/` (31 files, enrolled in
`design-refs/.refhashes.json`, every hash as the prompt gives it).

## False premises

1. **"Most are still waiting" for 13 of 27.** The mock's S1 answer opens "Most are still waiting for an answer" on a
   sample where 13 of 27 are waiting, which is not most. The prompt's own rule ("Most" only when waiting is more than
   half) gives **"13 are still waiting for an answer."**, and that is what the page says.
2. **S7's "left out of the rates until they close".** Untrue of this page: every rate is over all the queries sent, so a
   waiting query is counted, as one not yet asked to read more. S7 now reads "The 13 queries still waiting count in the
   rates as not yet asked to read more, so the rates can go up or down from here."
3. **"Most writers see about 1 in 20."** 6% is 1 in 17. The reading derives it from the constant: "about 1 in 17".
4. **The 37% / "10 of 27" premise was in v21's empty page, not its locks.** `A21Empty.tsx`'s example card stated
   "Request rate 37%, 10 of 27 asked for more". The card is gone (Part I); the sample's truth, 26%, 7 of 27, is what the
   derivation tests assert. v21's unit fixture (`analyticsV21.test.ts`) and its locks did not encode 37%: AN21-I1 checked
   only the example's label.
5. **The mock's units.** It prints "1 wks" and "0 wks past"; the one formatter makes those "1 wk" and "on time", and
   AN24-U1 forbids "1 wks", "0 wks" and "0 days" anywhere on the page.
6. **"27 Nov (23 days)".** In the mock the first request falls in the year before "now", and the page dates anything
   outside the current year with its year: "27 Nov 2025". The day count (23) is unchanged.

## §0 findings

- **Base:** `5f566578` contains v21 (refs enrolled, AN21 locks present) and comps v27's steps card. Neither stop rule fired.
- **The steps card is page-local to comps** (`manuscripts/comps25/CompsSteps.tsx`), so analytics has its own copy,
  `analytics/A24Steps.tsx`, built from comps' values and comps' arrow. **Comps is untouched.** The two are lift candidates.
- **Stated reading times: none exist.** `Agent.responseTimeWeeks` is the agency's time for the QUERY; nothing records a
  time for reading requested material. So S5's reading rows draw one bar from the day they asked, against nothing.
- **Phone components retired:** all of v17's phone figures (`A17Figures.tsx`, deleted whole: Funnel, TrainingLog,
  ShareBars, Records, OverTime, Lanes, Caveats). The phone keeps the at-a-glance strip and v21's phone band.
- **Code deleted:** `A17Figures.tsx`, `A21Window.tsx`, `A21Steps.tsx`, `A21Records.tsx`, `A21Stand.tsx`, and v21's
  empty-page example and three points. **Kept:** `A17Frame` (Glance, SectionTab, TipProvider, Skeleton), `A21Header`,
  `A21Desk` (it gained a dot strip), `A21Empty` (panel and ways), and `lib/analyticsV21` (`standing` still drives the
  header card; `desk()` still builds card 1).

## Commits

`da95f24a` derivations · `2912b51c` A · `ccec5a07` B · `c8f1ae52` C · `7f3dc778` S1 · `eee239c2` S2 · `e3a94cda` S3 ·
`6a5fc9e6` S4 · `d3576491` S5 · `8add8486` S6 · `84d57c1c` S7 · `aa0269cf` I · `ff49052f` fixes the locks found ·
`5871c7d5` locks + CLAUDE.md · `10885992` fixes the screenshots found · then this report.

## Derivations (`src/lib/analyticsV24.ts`, 48 unit cases on the mock's sample through the real `analyticsModel`)

`span` / `spanParts` / `diffWords` (the one formatter) · `outcomes` (7 · 13 · 7; 3 by letter, 4 closed, 0 withdrew;
asked split 1 · 4 · 2; 2 asked for the full) · `requestRate` (26%, 7 of 27; a count under five) · `replyKeeping` (kept 5,
longer 5, overruns 2 days to 7 wks, typical 7 wks from 2 to 13) · `stillWaiting` (13, 9 past, Grant Hill 42 wks; 4 being
read, 2 your move) · `expectedByNow` (22 past = 9 · 4 · 9; 5 inside; no stated time a fifth count) · `monthlySends`
(busiest Nov and Jun at 4) · `moments` (4 Nov 2025 · 27 Nov 2025, 23 days · 17 Mar, 133 days · 1 to 7 Jun, 4) ·
`benchmark` against `BENCHMARKS_QUERYTRACKER` · `deskV24` · `ringOf` · `heads` (the seven kickers, questions and answers).

## Calls I made

- **Asked to read more = a partial, full or revision request, or an offer**, whatever happened after. A writer who
  withdrew after a request is a fourth slice ("You withdrew"), never a "said no".
- **The rate shows as a percentage from five queries up**, a count below (the thin-sample rule).
- **The replied count in "what you could expect" counts a request or a pass as a reply**, so it can exceed the page's
  "replies" (dated replies only): on the harness account 29 against 24.
- **A bar of 0 days reads "Today"; an undated one draws no bar and reads "Not dated"**; a difference rounding to nothing
  reads "On time" over "the time they said". A zero reading is "None".
- **The said / took label column is 118px compact, 124 full** (the ref's 104 / 110 clip "SINCE THEY ASKED").
- **The compact desk rows wrap** where v24's longer wording would otherwise end in an ellipsis at 1280.
- **The reply card's stamp is hidden in the compact sheet**, as the prompt says (the mock hides it below 1440 of viewport).
- **S5's scale covers the reading rows too** (one scale for the section).
- **S4 with nothing placed draws no rows**: the answer says why, and the frame carries its readings alone.

## Locks

**Retired and rewritten** (recorded in `tests/e2e/RETIRED-analytics-v24.md`): AN21 C1, D1, E1, F1, G1, I1 retired; A3 and
B1 rewritten as AN24-A3 and AN24-B1; A1, A2 and L1 kept (L1 now scrolls to sections 2, 4 and 5). AN17-7, 8, 9, 12 and 13
retired with their figures; AN17-15, 16, 17 and 18 rewritten; AN17 now pins "The Smoke Test" (another session added a
query-less manuscript to the shared account mid-run).

**Red first, on the base `5f566578`** (`reports/analytics-v24/redfirst/`): ten of eleven red. A3, B1, S1–S6 red at "the
page publishes the v24 model" (a missing model is a named failed reading, never a crash); C1 red on ten readings (nine
sections, no seven questions); I1 red on seven (the example card, no steps card). **U1 was green on the base**, correctly:
the base page printed no "1 wks"; its red is its mutation's.

**Named mutations, each run alone at `5871c7d5` and red on its named reading** (`mutation-proofs.jsonl`):

| Lock | Mutation | Red reading |
|---|---|---|
| A3 | Point the ring at S5 | pressing it scrolls S4 into view — −2299 |
| B1 | Count replies as requests | 'asked' is no more than requests + offers — 25 vs 21+1 |
| C1 | Tint S3 | S3 is on the page colour — rgb(233, 230, 224) |
| S1 | Put all replies in asked | 'asked' is the requests, plus any offer — 25 vs 21+1 |
| S2 | Inline 6% as a literal in the component | Most writers is the anchor (anchors swapped) — 6% vs 9% |
| S3 | Drop zero months | one column per calendar month — 7 vs 18 |
| S4 | Give each row its own scale | one shared scale (±1px) — 29 off |
| S5 | Measure reading rows from the query date | counts from the day they asked — 13 of 13 off |
| S6 | Hard-code the busiest week | busiest: the date is moments' — 1 to 7 Jun vs 3 to 9 Aug |
| U1 | Format weeks with `${n} wks` | no /\b1 wks\b/ — "1 wks" |
| I1 | Count the example pie | the tiles' numbers are not counted — 27 |

**Green, one consolidated run at `10885992`** (`green-run-10885992.txt`): AN24 A3 14 · B1 26 · C1 42 · S1 36 · S2 32 ·
S3 22 · S4 12 · S5 14 · S6 20 · U1 10 · I1 17 readings, none failed; AN21 A1 32 · A2 30 · L1 72, none failed; AN17-15 45 ·
16 26 · 18 6, none failed; **AN17-17: 6 of 18 failed, the disc readings, red on the base too** (header v3's shared panel).

**The locks found two faults before the report**, both fixed in `ff49052f`: U1 found "0 days" on five reading rows with an
undated request; AN17-16, cut to one query, found S2's overdue reading as a bare "0".

**L2 (the neighbouring header suites, headerPanelV2, headerV3, pageHeaderV2):** no red on v24 that is not red on the base,
except headerV3 H8 on /queries/analytics, which failed once in the full run and **passed alone on both builds** (a timing
flake under load). /agents §4.5 and §4.6 are red on both.

**A process slip, recorded:** S2's gate exited 1 and its commit ran in the same shell block. The non-zero exit was the
known reporter flake ("Timeout calling onTaskUpdate", 8986 passed, no failed test), so the commit is sound, but it ran
without the result being read. Every later gate and commit ran as separate steps.

## Screenshots (`reports/analytics-v24/shots/`)

One beside each reference screen at its width: `00-top` to `09-empty-how-it-works` at 1512, 1280 and 390. Then
`state-one-query-*` (the dev review aid cut to one query), `state-one-pass-*` (one reply, a pass), `state-no-stated-times-*`
(agencies that give no time), each at the top and S1, S2, S4 and S5, and `top-1920.png`, `top-1024.png`. The seeded states
are written and removed by `tests/e2e/seedAn24.mjs` in the same run.

## For Nick

- **At 1280** everything fits once the desk rows wrap (`10885992`); before that, card rows ended in an ellipsis. The
  section tab overlaps the first section's title while the page is at the top, as on v21.
- **The harness account** ("The Smoke Test", 51 queries): `outcomes` 21 asked · 20 waiting · 10 ended (8 by letter,
  1 closed, 1 withdrew); of the asked 1 offer · 18 still with the agent · 2 said no; 14 asked for the full.
  `requestRate` 41%, 21 of 51. `expectedByNow` 44 past = 29 replied · 2 closed or withdrew · 13 overdue; 6 inside; 1 with
  no stated time. Verdicts: asked to read more **Well above** (41% against 6%), any reply **Above** (66% against 50%),
  queries sent **About typical** (51 against 44). Month 30 of querying.
- **No stated time:** 0 of the 24 dated replies; 1 of the 20 waiting queries. And 5 of the 18 being read have no request
  date recorded, so they draw no bar.
- **The art slots are placeholders** awaiting your three illustrations (the Archivist filing a reply card; with a pie
  chart; two writers' desks).
- **"Most writers" is QueryTracker's rough figures**, fixed in `BENCHMARKS_QUERYTRACKER`. No community data is collected.

## Integration and dev

See the end of this file once deployed.
