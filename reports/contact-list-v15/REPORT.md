# Contact list v15 — report

Pack: `contact-list-v15-pack.zip` (oracle `design-refs/contact-list-v15.html`, art
`public/images/contact/contact-header-hawk.png`; both hashes verified against the pack's `SHA256SUMS.txt`). Built
8 Oct, direct to `main`, measured in `/private/tmp/sa-cl14` (dev build, `vite preview` on 127.0.0.1:4440). The pre-v15
baseline is `8093d64f`, served from `/private/tmp/sa-cl14base` on :4441. **Nothing has been deployed** (hosting,
functions or rules); Nick deploys to dev himself. No rules and no functions changed.

## False premises (in the pack, checked against the repo and the mock)

1. **The Query Centre's "Recently updated" is not the §4a layout.** On `main` it is a carousel. The composition §4a
   describes (text on the page, a card over a white panel's left edge, a list in the panel) was on the Query Centre's
   v132 branch while this pack was built. Ruling 1: built here as a Contact-list piece in `shell/featureStage`, named
   generically, and not read from that branch. **v132 reached `main` during Phase 6** (see "The merge" below).
2. **The desk's stamp and hatched trend are not shared pieces.** They live inside the Query Centre's own desk.
   Ruling 2: copied into `shell/desk/`, each copy commented at the other.
3. **Nothing records profile completeness over time.** So the Profiles card's "+n% this month" stamp has no source.
   Ruling 3: the stamp is hidden.
4. **The mock's Profiles card states one fact twice** (the bar's right-hand label repeats a row). Ruling 4: both rows
   stay, the bar reads "{filled} of {N} profiles complete" on the left and nothing on the right.
5. **Withdrawn queries break "reading + asked + passed = queried".** Ruling Q1: a fourth part, "{w} withdrawn", shown
   only when non-zero; the desk's Queried card counts withdrawn as closed.
6. **"Aug → now" on the trends is undefined.** Ruling Q5: On file is six month-end points; Queried is thirteen weekly
   bars, labelled with the first week's month, "Queries per week", and "Now".
7. **Guide step 1 described the strip.** Ruling 7 gave the new wording; it rings the desk.
8. **`PageHeader` cannot draw the header.** It has no 72px typewriter title, no form without an eyebrow and no drawing
   in the flow. Ruling 8: page-local (`ContactOpenHeader`), with `/agents` in a new `OWN_HEADER_ROUTES` register.
9. **There is no page-name fade left to check.** The ink shell retired the quiet bar's fade on 6 Oct: the folder tab
   names the page from first paint. `quietBar` passes; nothing was restored.
10. **The mock's own desk cards break the brief's limit.** They measure 201 at 1512 and 187 at 1280, against "≤ 200"
    and "≤ 186". The card's header row is 28 tall here, not the mock's 34: the cards are 195 and 181.
11. **The mock's stamp is not the Query Centre's stamp.** It is a triple-ring box shadow. Ruling 2 said copy the
    Query Centre's, so that is what the desk draws, at the brief's padding (6 × 13; 5 × 10 below 1440).
12. **"Closed with no reopening date" does not cover a reopening date already past.** Ruling Q3: a past date counts
    with the closed agents, and the note reads "{c} are closed to submissions."
13. **Lock 5b describes a fault only the mock can have.** The mock computed the pill's number by switching the mode
    on. Here the number is derived and nothing toggles. The lock holds the property (a fresh load shows all N; an
    older remembered shape cannot switch the mode on), and its mutation is the mode on by default.
14. **`notifyDiscover` is not a field the profile can take cleanly.** Approved instead: `notifyPrefs.discover`,
    written as one leaf. `notifyPrefs` is already in the user-update allowlist, so no rules change.
15. **The shared account cannot show two of the rule's branches.** Every ready agent on it fits the book (none has no
    genres), and its manuscript never reaches the all-queried state. Two self-cleaning seeders supply them
    (`seedReadyUnknown.mjs`, `seedAllQueried.mjs`); each lock removes what it seeded in the same run.
16. **The mock's coming-soon rows print invented agencies** ("Lumen Literary, London"). §4 says no real names. The
    rows here are shapes only: nobody real, and nobody invented.

## Deviations from the mock (deliberate)

- **The header's Discover button** opens the Discover route as v14's did; it is not gated on `DISCOVER_LIVE`.
- **The "nobook" form survives, narrowed.** With no manuscript in scope the section says "Choose a manuscript…". A
  manuscript with no genre runs the rule: it mismatches nobody, so every open, unqueried agent is ready.
- **A row's sub-line is the agency**, or the city where the agency is the name. The mock prints the agency only.
- **The reopening state with one agent has no panel.** There is nothing to list beside the card.
- **Singular copy.** "1 agent is open and hasn't seen…", "1 has no genres recorded", "The other 1 doesn't take…",
  "1 is closed to submissions", "has gone to the 1 agent on your list". The pack gives the plural forms only.
- **"and N more" counts past five rows**, as the mock's script does (the list shows the first five ready agents,
  including the one on the card).
- **The loading beat draws the section over two placeholders**, so the card sets its height (see Phase 3 below).
- **`/agents` left `livingHeadersV3`'s populated census.** Its header is no longer a living header. The empty state
  still draws the shared one and is held by CL13-14.

## Geometry: what matches the Query Centre's v132, and what I cannot say

Ruling 1 asked for a note of which values differ. I did not read the v132 branch while building, as ruled, and I have
not compared the two since it landed; that comparison belongs to the unifying pass. These are ours.
The four values the rulings named are matched exactly: the panel's left margin −150, its left padding 178, the card
300 wide, the rise 280ms. The rest, for the pass that unifies the two:

| | 1512 | below 1440 |
|---|---|---|
| grid | `0.86fr · 300px · 1.3fr`, no gap | `0.8fr · 270px · 1.2fr` |
| panel | margin `−34 0 −34 −150`, padding `26 26 20 178`, 22px corners | margin-left −130, padding-left 152, padding-right 20 |
| stage margins | 100 above, 92 below (66 and 58 to the panel) | 90 and 84 (56 and 50) |
| lede | right padding 44, gap 16; title 40 / 1.08; sentence 17 / 1.55, max 34ch | right padding 30; title 34 |
| compact title (all queried) | 34 | 30 |
| button | 46 tall, 24 side padding, `#2a3a52` | same |
| row | `36px · 1fr · auto`, gap 14, padding 11 10, 10px corners; picked `#eaf1f7` | reply time hidden |
| rise | 280ms, `cubic-bezier(.2,.7,.2,1)`, from opacity .4 and 6px down | same |

## Commits

| Phase | Commit | What |
|---|---|---|
| 1 | `a309cb8e` | the open header |
| 2 | `8f4f6f85` | the desk |
| 3 | `a0900cbe` | one ready rule, three states, the ready-only list mode |
| 4 | `294efc5e` | the section's layout (`shell/featureStage`) |
| 5 | `9b660a9e` | all queried: the Discover coming-soon panel, the stored request, the Add card |
| 6 | this commit | CLAUDE.md and this report |

All six are pushed to `origin/main`.

## Gates

Baseline before any edit (`8093d64f`): tsc 0 · build clean · Vitest 535 files, 8,417 passed, 3 skipped.

| Phase | tsc | build | Vitest | Contact e2e (one worker) |
|---|---|---|---|---|
| 1 | 0 | clean | 535 files · 8,409 passed · 3 skipped | 81 passed with the header suites; two reds pre-existing (below) |
| 2 | 0 | clean | 535 · 8,406 · 3 | 40 passed |
| 3 | 0 | clean | 535 · 8,413 · 3 | 41 passed, 1 failed (CL13-12), fixed and re-run green |
| 4 | 0 | clean | 535 · 8,414 · 3 | 43 passed |
| 5 | 0 | clean | 535 · 8,418 · 3 | 44 passed |
| 6 (final tree) | 0 | clean | 535 · 8,418 · 3 | the wide run below |

The Vitest count fell in Phases 1 and 2 because tests were deleted with what they tested (`contactHeaderCopy`,
`heroFacts`, `ContactStrip`, `stripFacts`); each is named in `tests/e2e/RETIRED-contact-list-v15.md`. "Build clean"
means the whole log was read: the only diagnostic is the standing chunk-size note.

**The final wide run** (the pushed tip of Phase 5, one worker, 40 minutes): `contactV15` + `contactV14` + `contactV13`
+ `contactV11` + `pageHeaderV2` + `quietBar` + `inkShell` + `livingHeadersV3` — **86 passed, 8 skipped, 3 failed.**
The eight skips are the cases the ink shell retired (`pageHeaderV2` §1, `quietBar` Q1–Q7 and Q9, `livingHeadersV3`
LH5). Two of the three failures are the pre-existing pair below. The third is **CL14-7 (the filter strip), once**: it
read "no strip" at both widths, which is the page not having rendered, not a strip fault. It passed in each of
Phases 2 to 5's runs on the same code and passed again when re-run with CL14-6 and CL14-8 straight after. I have not
established why that one load failed; my own build and unit gates were running on the same machine early in that run.

**Pre-existing reds, measured on `8093d64f` too and not this pack's:** `inkShell` INK19 (one phone-width element 360
wide at x 15 against main's 390 at 0, on routes v15 does not touch) and `pageHeaderV2` §4.5 (the switcher's
add-manuscript item is disabled for the harness account).

## Locks, each with its red before green

Every rendered lock runs at 1512 × 900 and 1280 × 800 with no horizontal overflow. "Baseline" is the same test file
run against `8093d64f`. Mutations ran in the measurement worktree; the readings are in `mutation-proofs-p*.jsonl`.

| Pack lock | Where | Red on baseline | Red by mutation |
|---|---|---|---|
| 1 Header | CL15-1 | yes: no header | top-aligned · gap 40 · title 64 · an ink card · the subheader paraphrased |
| 2 Headroom | CL15-2 | yes: no drawing | the header's top margin dropped |
| 3 Desk | CL15-3 | yes: no desk | header row 34 (201 / 187) · a row repeating the stamp · every bar solid · a Profiles stamp · Queried press not filtering · stamp padding shrunk · the desk 12 under the header · Profiles press dead · titles in the card's colour |
| 4 Ready rule | unit, `contactNextStep.test.ts` | no subject before v15 | an agent with no genres treated as a mismatch |
| 5a Layout | CL15-5a | yes: no stage | v14's 44 gap · panel 100 under the card · card under the panel · text in a well · every card "First up" · first row always tinted · 120ms rise · agency in place of "Genres not recorded" · reply time shown below 1440 · workspace 30 under the section |
| 5b Load state | CL15-5b | yes, three readings (weak: the v15 header's count is not there to read) | the mode on by default: 2 rows of 37 |
| 5 Pill = section = rows | CL15-5 | yes: ten readings | the pill on the plain Open + Not queried filter (28 rows against 3) · ✕ dead · a filter change not leaving the mode · the mode not remembered |
| 6 All queried | CL15-6; unit in `contactNextStep.test.ts` and `contactDesk.test.ts` | yes: v14's done state on the page, thirty or more readings (the ledger prints the first thirty) | queried counting only agents who fit · no withdrawn part · Add card at 322 (panel 390) · Add card see-through · the reader dropping the request · the note shown at zero · "of your N" when everyone is queried · a past reopening date not closed · the desk counting queries |
| 7 Gaps state gone | unit, `contactNextStep.test.tsx` | no subject before v15 | the old picker restored |
| 8 Every v14 lock passes or is retired | `contactV14` + `contactV13` + `contactV11`, each phase | — | retirements, each with its note: `tests/e2e/RETIRED-contact-list-v15.md` |
| 9 Clean tree before gates | each phase committed by explicit path; `git status` checked after | — | — |

No mutation stayed green.

## What each phase found

- **Phase 1.** `contactV11`'s add-card case hung for ten minutes on the old header's selector. It was repointed, and
  the neighbour runs now carry a timeout.
- **Phase 2.** The cards first measured 233: `.dk-body` collided with the dashboard tooltip's sheet. The desk's classes
  are `dsk-*`. One mutation (a Profiles stamp) showed a second thing: with a stamp beside it, the title "Profiles
  complete" overflows its row by 15px at 1512. It matters only if a completion history is ever built.
- **Phase 3.** CL13-12 (the loading beat) went red: the placeholder section stood 31px taller than the loaded one,
  because the list beside the card set its height and the placeholders listed more agents than the account has ready.
  The section is drawn over two placeholders now, so the card sets the height.
- **Phase 4.** The measured gaps landed on the brief's values at both widths without tuning: 66 and 58, 56 and 50,
  overlap 150 and 130.
- **Phase 5.** The panel is 344 tall at 1512. The Add card's old 322 minimum would have made it 390; removing that
  minimum is what the limit rests on.

## Follow-ups

- **Unify with the Query Centre's v132**, now that both are on `main`: `shell/featureStage` against `QcRecent`, and the
  desk's stamp and hatched trend (two copies today, by ruling). v132's own notes list its Contact-list look-alikes (the
  ink bar and pills, the filter strip, `CountTo`, density, the key card, the dead end) as lift candidates too.
- **A completion history**, if the Profiles stamp is wanted. The title and a stamp do not fit one row at 1512.
- **`AgentCardHost` and `contactEdit` still read the main genre only** for "fits" (carried from v14).
- **The note's genre noun** comes from v14's table, which has no entry for every genre: the seeded fixture reads
  "don't take western".
- **Prod rules** are untouched by this pack; the standing prod backlog is unchanged.
