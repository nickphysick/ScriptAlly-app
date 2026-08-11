# Manuscripts page — sage plate + tabbed pane

Rebuilding the interior of `AllManuscripts` to the approved design: one card whose head is a sage
plateband carrying the manuscript's identity, with a tab row beneath switching Details ·
Comparable titles · Submission packages.

**Status: Phase 1 complete. Phases 2–6 BLOCKED at the red gate** — see "The gate" below.

Design ref: `design-refs/manuscripts-plate.html`, treatment B (`.tiles2` / `.btile`).
Treatments A (journey) and C (timeline) and the devbar are mockup devices and are not built.

---

## The gate — still red, checked twice

Four of the five files Phases 2–6 must edit carry **another stream's uncommitted work**, and that
stream is identifiably the page-header session the brief fences off.

Checked at Phase 0 and re-checked at resume. **Byte-identical both times** — same blob hashes
(`AllManuscripts.tsx` `be86d4a → 9dcbdec → 6123096`), so the header stream has neither committed nor
reverted. Three commits landed between the checks (`0012a85`, `2999e59`, `9284ec4`) but all are
agents/queries work.

| File | Staged | Unstaged | Needed in |
|---|---|---|---|
| `src/components/AllManuscripts.tsx` | 10+/20− | 1+/8− | 2–6 |
| `src/components/manuscripts/ComparableTitlesPage.tsx` | 23 lines | 7 lines | 4 |
| `src/components/manuscripts/comps.css` | 27 lines | 23 lines | 4 |
| `src/components/manuscripts/manuscripts.css` | 10 lines | 21 lines | 2–6 |
| `src/components/shell/PageHeader.tsx` | 185 lines | — | never (fenced) |

What the header stream has in flight in `AllManuscripts.tsx`:

- **Staged**: moves `<PageHeader>` out of `.msv-wrap`; deletes the `toolbar` tally row carrying
  `N manuscripts · M in submission`.
- **Unstaged**: replaces `variant="workspace" mark="manuscripts"` with `variant="full"`.

Both land in the exact JSX region Phase 2 must edit — between `<div className="msv1">` and
`<div className="msv-wrap">`, immediately above the card. There is no explicit-path staging that
avoids either carrying their half-finished edit into my commit or clobbering it.

`PageHeader.tsx` is mid-refactor and internally inconsistent right now: the file declares
`variant?: "full"` as the only remaining value while the staged `AllManuscripts` still passes
`variant="workspace" mark="manuscripts"`. The unstaged hunk is that fix in progress.

**Phase 1 was unblocked and has shipped** — it creates only new paths and touches none of the five.

---

## Baseline and gates

Re-recorded at resume, after the three intervening commits. This is a baseline of the *dirty* tree —
it includes the header stream's in-flight edits.

| Gate | Baseline (dirty tree, pre-edit) |
|---|---|
| `npx tsc --noEmit` | exit 0, no diagnostics |
| `npm run build` | exit 0 |
| `npx vitest run` | 228 files · 3714 passed · 2 skipped |

### ⚠️ The shared tree went red mid-phase, and not from this work

Between recording that baseline and running the pre-commit gates, another stream broke the tree:

- **tsc**, 4 errors, all in `src/components/Queries.tsx` (`MM`, mid-edit) — a duplicate
  `recordQueryResponse` import, an undefined `todayInputDate`, and a `RecordResponseData` /
  `RecordResponseDeps` mismatch.
- **vitest**, 6 failures across 4 files, all `src/lib/create*.test.ts` — the queries create-mode
  stream's specs.

None of it is in this touch set, and "green locally" against a tree in that state proves nothing.
So the gates were re-run per the repo protocol in an **isolated worktree at HEAD (`9284ec4`) carrying
only this phase's four new files**:

| Isolated run at HEAD, carrying only that phase's files | tsc | build | vitest |
|---|---|---|---|
| Phase 1 (HEAD `9284ec4`) | exit 0 | exit 0 | **247 files · 3996 passed · 2 skipped** |
| Phase 2a (HEAD `1a2fd9b`) | exit 0 | exit 0 | **249 files · 4050 passed · 2 skipped** |
| Phase 2b (HEAD `2a23d58`) | exit 0 | exit 0 | **250 files · 4067 passed · 2 skipped** |
| Phase 3 (HEAD `40ed4f3`) | exit 0 | exit 0 | **253 files · 4120 passed · 2 skipped** |
| Phase 4 (HEAD `3928e2d`) | exit 0 | exit 0 | **255 files · 4167 passed · 2 skipped** |

Phase 1 adds 31 tests, Phase 2a adds 24, neither adds a failure. The isolated run is the one to
believe; the primary tree's red belongs to `Queries.tsx` and will clear when that stream lands.
Test totals move between rows because other streams commit throughout — recorded fresh each time,
never carried over.

---

## Phase 1 — design ref + illustrated marks

Commit: `manuscripts: add plate design ref and illustrated marks`

### The ref

`design-refs/manuscripts-plate.html`, copied from `~/Downloads/scriptally-manuscripts-details.html`
(46KB). Identified by its section markers — `treatment A: journey + illustrated cards`,
**`treatment B: big illustrated tiles`**, `treatment C: illustrated timeline` — plus a `devbar`.

### The marks

`src/components/manuscripts/manuscriptMarks.tsx` — **four** inline SVG marks, lifted verbatim from
treatment B's tile scenes: `PaperPlaneMark` · `BookSpinesMark` · `CalendarClockMark` ·
`StackedPagesMark`, plus a `MANUSCRIPT_MARKS` registry keyed `plane/spines/calendar/pages` so specs
can sweep all four rather than naming them one at a time.

Each takes `size` and nothing else, defaulting to `MARK_SIZE = 70` (the ref's tile size). All four
share a square `0 0 80 80` viewBox, so one number governs both axes and the four sit on a common
optical scale. All are `aria-hidden` + `focusable="false"` — the tile's own text is the label.

**Fills are baked**, per ruling 3: no `currentColor`, no `var()`, no theme token. Palette as drawn
in the ref — ink `#3a1c14`, sage ink `#5a6e58`, burgundy `#7c3a2a`, and washes `#fff` / `#fdfaf5` /
`#f5e2da` / `#e8c8bc` / `#cdd8ca` / `#e7ede3`. Stroke weights 1.3–1.8.

> The ref uses three hues beyond the brief's stated list (`#5a6e58` sage ink, `#7c3a2a` burgundy
> rules, `#e7ede3` clock face) and `#fff` alongside `#fdfaf5`. Taken from the ref as the design
> authority. Logged here rather than silently normalised.

### Four locks, three verified red before being believed

`manuscriptMarks.test.tsx`, 31 tests. The failures these guard are all silent ones — a mark that
inherits colour renders fine in Cappuccino and vanishes in Editorial; a mark that gains a blend mode
renders fine on white and dirties its own washes. So they assert the mechanism, not geometry.

1. **One optional prop** — every mark renders with no props at all, and at any requested size on
   both axes. *Verified red: removing the `size` default → 4 failures.*
2. **Inherits nothing** — no `currentColor`, no `var()`, no `--msv-`; every hex on-palette; ink
   present at 1.3–1.8. *Verified red: one `currentColor` → 2 failures; one off-palette hex → 1,
   naming the mark and the colour.*
3. **No blend mode, no transform** — the dashboard's mark CSS must not follow these across.
4. **No fifth mark** — asserts four exports, no `NotebookMark`, and that the PNG it defers to is
   still on disk under the name the plate will import.

### ⚠️ The notebook mark — resolved, and simpler than feared

Ruling 4 says reuse the PNG. Recon of how `OneScreenAuthor` actually renders it settles Phase 2's
treatment: **`.os-msicon` does NOT use `mix-blend-mode`.** The dashboard's blend rules apply to
`.os-mark-il` and `.os-cic`, not to this one. It renders as a plain `object-fit: contain` image on
a white plate with a `1px #ece0d2` border and a radius — which is *already* the Phase 2 plate's
description (118px, radius 18, white, hairline).

So Phase 2 imports `src/assets/shell/manuscript-icon.png` and matches that render directly. **No
blend mode is needed and none should be added**, which also means the transform trap does not bite
here — though the plate should still avoid a `transform` on any ancestor, since `.os-msicon`'s own
hover lift is a `transform` on the plate itself and would need the same care if copied.

---

## Phase 2a — plate and tab shell

Commit: `manuscripts: sage plateband and tab shell`

Authored as new files under addendum 2's re-sequencing: nothing here imports into or edits a
blocked file, so the plate could be built while `AllManuscripts.tsx` is still held.

| File | What it is |
|---|---|
| `src/lib/manuscriptPlate.ts` | `plateStats` / `plateStatCells` / `formatPlateDate` — the three figures, pure |
| `src/components/manuscripts/ManuscriptPlate.tsx` | the plateband |
| `src/components/manuscripts/ManuscriptTabs.tsx` | the tab row + `MANUSCRIPT_TABS` |
| `src/components/manuscripts/manuscriptPlate.css` | tokens + rules, additive to `manuscripts.css` |
| `src/components/manuscripts/manuscriptPlate.test.tsx` | 24 tests |

Both components are **props-only** — no context, no store, no Firebase — so they render standalone
in a spec and the figures are asserted against `plateStats` rather than a mocked database.

### The three figures are derived, and two kinds of nothing are kept apart

`plateStats(queries)` counts queries, counts responses **through `isResponse` from
`packageMetrics`** (the canonical predicate the package maths already uses — a local "did the agent
reply" test here would eventually give one fact two numbers on two pages), and takes the newest
`lastActivityMs` across the set.

> ⚠️ **Zero queries and no last activity are not the same absence.** The two counts read `0`,
> because zero is a true count. Last activity reads `—`, because there is no date and a `0` there
> would assert an event that never happened. The split lives in `plateStatCells` and in the types
> (`number` vs `string | null`) so a caller cannot collapse it back by accident.

No logline → the element is not rendered at all, and specifically **not** the current plate list's
`"No logline yet — add one in Edit details."` placeholder. Empty string counts as absent. No
genres → no pills. No word count → no words line.

### Tabs

Three, in order, opening on Details. Controlled component; the card owns the `useState` at Phase 6.
No route, no URL param, no `href` — asserted. **No Pro chip on any tab**, per addendum 1: the
mockup draws one on Submission packages, and that route has no gate, so it would sell a feature the
user already has. Locked, because this is the *second* Pro-selling surface retired from packages.

### Four locks verified red before being believed

A logline placeholder → 2 failures. A shelved manuscript still offering Send → 1. `lastActivity`
falling back to epoch instead of `null` → 1. A Pro chip on the packages tab → 2. Restored to 24
green each time.

---

## Phase 2b — theme verification

Commit: `manuscripts: plate theme verification`. One new file,
`src/components/manuscripts/manuscriptPlateTokens.test.ts` (19 tests).

Verification is a **rule-text lock** — the house pattern (`hubTokens.test.ts`, `railTokens.test.ts`)
and the only kind available here, since the repo has no jsdom and no browser in the loop. It parses
the stylesheet and asserts each theme's resolution directly, which is what "verified against the
components in isolation, do not wait for mounting" asks for.

### What the plateband resolves to

| | Cappuccino | Bold Pastille | Editorial |
|---|---|---|---|
| **Plateband** | `#dadfd7 → #d5dbd3` **sage** | `#f4c7c2` flat **pink** | `#f4f4f5 → #efeff0` **pale grey** |
| Band base rule | `1px rgba(138,158,136,.35)` | `1.5px #1d1712` ink | `1px #e3e2e0` hairline |
| Card surface | `#fdfaf5` | `#fffefb` | `#ffffff` |
| Card border | `1px #d8cebf` | `1.5px #1d1712` | none |
| Title | `#5d4037` mocha | `#000000` | `#000000` |
| Genre pill | `#e7ede3` sage / sage hairline | `#ffffff` / `1px` ink | `#f1f1ef` / transparent |
| Stat strip | white `.62` wash / sage hairline | `#fffefb` / `1.5px` ink | `#ffffff` / `1px #e3e2e0` |
| Primary action | `#f6e4da` fill, `#7c3a2a` text | `#f8dcd8` fill, `#1d1712` text | `#e9eaeb` fill, `#44484d` text |
| Active tab | `#7c3a2a` burgundy | `#1d1712` ink | `#44484d` graphite |

**Editorial renders no sage.** Asserted twice — once against the named sage vocabulary
(`#dadfd7`, `#e7ede3`, `#8a9e88`, `rgba(138,158,136,…)` and six more), and once **mechanically**, so
a *new* green nobody listed still fails: any hex in the Editorial block whose green channel leads
both others perceptibly is rejected. Verified red with `#dfe8dc`, a green on no list.

The primary action and the active tab read `--msv-hue`/`--msv-huec` — the theme's own accent pair,
which is `--sd-hue`/`--sd-centre`. Cappuccino's is `#7c3a2a`, **exactly** the ref's burgundy, and
`#f6e4da` against the ref's `#f5e2da` pink. So one rule gives three correct answers and no new
token was needed for either.

### Three deltas against the brief's expected Cappuccino values, all deliberate

| Surface | Brief expected | Resolves to | Why |
|---|---|---|---|
| Card | `#fefdf8` | `#fdfaf5` | reuses `--msv-card`, which already carries the card role |
| Card hairline | `#e2dacf` | `#d8cebf` | reuses `--msv-cardbd` |
| Mono label | `#a2907f` | `#9c8878` | reuses `--msv-label` |

Each is a 1–2 point difference and imperceptible. Ruling 3 says add a token only where no existing
one carries the role — all three roles are carried, so reuse won over three more near-duplicates.
**Flagged rather than silently absorbed**: if the exact drawn values matter, they are three token
values, not a code change.

### Ten tokens added, and one deliberately not reused

`--msv-plateA/B/line` · `--msv-palebg/palebd/paletx` · `--msv-stripbg/stripbd/stripkey` ·
`--msv-prbd`, declared on the same `.t-* .msv1` selectors the page already uses, in a **new**
stylesheet so the blocked `manuscripts.css` is untouched. A lock asserts none of the ten is a name
that file already owns — a token defined twice makes load order decide, not intent.

> ⚠️ **`--msv-plateA/B` is not `--msv-bandA/B`, and that is the point.** The existing band token is
> already used with exactly this declaration shape (`manuscripts.css:189, 292`) — but it resolves
> **warm foam** in Cappuccino (`#ece5d8 → #e5ddcd`), while this design's Cappuccino plateband is
> sage. Reusing it would have made Cappuccino quietly wrong while Bold and Editorial looked right.
> The reveal panels' band and the card's identity head are two surfaces that happen to share a
> gradient shape.

### ⚠️ The consumption → definition guard

Every `var(--x)` the stylesheet **reads** must resolve to a definition in either file. This is the
`--pad-r` lesson: `var()` on an undefined property drops the declaration silently, which once left
the shell's only active marker 0px wide through a green typecheck, a green build and a green suite.
Checking that what we wrote *arrived* cannot catch what we *referenced and never wrote*.

Verified red by pointing one rule at `--msv-stripkeyx`. It also means this spec reads
`manuscripts.css` — so if the header stream removes a token the plate consumes, this goes red
rather than the card going silently unstyled. That coupling is intentional.

One further lock: outside the three token blocks, **no rule authors a colour** — every hex must come
through `var()`, with `#ffffff` exempt as the plate's own paper. Verified red.

---

## Phase 3 — details tiles

Commit: `manuscripts: illustrated details pane`. `src/lib/manuscriptTiles.ts` (the four builders,
pure) · `ManuscriptDetailTiles.tsx` · tile rules appended to `manuscriptPlate.css` ·
`manuscriptDetailTiles.test.tsx` (30 tests). Treatment B only — A, C and the label-value fact rows
are not built and are not gaps to fill in.

| Tile | Zero | One | Many |
|---|---|---|---|
| **Out in the world** | `No queries sent yet` · *This one hasn't gone out yet.* | `1 query with agents` | `4 queries with agents` · *One response so far, on 8 August.* |
| **Comparable titles** | `Nothing on the shelf yet` | `1 on the shelf` | `3 on the shelf` · *Stormbreak* meets *Nightjar*. |
| **On the shelf** | — | — | `Querying since 20 June 2026` · *That's seven weeks of active submission.* |
| **Submission materials** | `No packages compiled yet` · *No materials added yet.* | `1 package compiled` | `2 packages compiled` · *Query letter (2) · Synopsis (1).* |

### Tile 3 leads with the status, and never invents a date

One rule produces both forms the ruling names — `${status} since ${date}` gives
`Querying since 20 June 2026` and `Revising since 20 June 2026` without a fork, because the status
word *is* the verb. The duration is `of active submission` only while Querying or On Submission, and
`so far` otherwise, since elapsed time is only submission time when the book is actually out.

`Added {date}` appears **only** when `createdDate` genuinely exists, and then in the detail line.
No status date at all → the status alone, no clause. A status change today → no duration, not
"zero weeks". **Nothing is derived from the earliest activity**: on an imported manuscript that is a
first-query date wearing the wrong label — a plausible number stating something untrue.

`status`/`statusChangedDate` are taken as the pair they are — the **workflow** status and the date
it changed. The reversible `shelved` overlay has no date of its own, so Phase 6 must not substitute
"Shelved" here; the plateband already carries that presentation. Documented at the function.

### Tile 4 has one variant

Real counts, absent materials **omitted** — the ref writes `Sample pages not added yet`, the ruling
says omit, and omit wins. Nothing at all → `No materials added yet.`, a plain sentence rather than
a pitch. Asserted to contain no `Pro`, `Upgrade`, `One tidy package` or `See what's included`.

### The Editorial lock got stronger, and needed to

Phase 2b's mechanical check tested for a **green** cast. Tile plates introduced a **pink** one
(`--msv-pinkplate`), which a green-only check would have waved straight through — the same mistake
one rung along. It now tests **chroma**: any colour in the Editorial block whose channels spread
more than 6 fails, whatever hue it is. Verified red by setting Editorial's tile plate to the
Cappuccino pink `#f8ede4` — **chroma 20**. Editorial's two tile plates stay distinct
(`#ebebe9` vs `#f1f1ef`) so the design's plane-vs-rest distinction survives monochrome without a hue.

One token added (`--msv-pinkplate`); everything else reuses `--msv-tile/-tilebd`, `--msv-palebg`,
`--msv-label`, `--msv-head`, `--msv-muted`, `--msv-hue`.

### Five locks verified red

Editorial tile plate set to pink (1, chroma 20) · `zero days` allowed to print (2) · an appraisal
(`only`) slipping into the duration copy (3) · absent materials listed as `(0)` (2) · an `Added`
date invented when `createdDate` is absent (3).

### Two adaptations logged

- **The "existing italic hint" the brief refers to does not exist.** `pitchLine` has no consumers
  anywhere in the app — this tile is its first. So the one-comp and no-comp copy is newly written:
  *"A second makes the 'X meets Y' line."* and *"Two comps make the 'X meets Y' line in a query
  letter."* Both state what is true without urging. The **composition itself** is `pitchLine`,
  reused and asserted to be the same call the shelf will make.
- **⚠️ `spellCount` is the FOURTH private number-speller in this repo** — `dashboardStats.ts`,
  `todoBoard.ts` and `topNav.ts` each keep their own and none is exported. Consolidating the four is
  a real follow-up and deliberately a separate one: it would touch three files this task has no
  business in. Flagged, not fixed.

---

## Phase 4 — comparable titles pane

Commit: `manuscripts: comparable titles pane`. `ManuscriptCompsPane.tsx` +
`manuscriptCompsPane.test.tsx` (23 tests), a fifth mark, comps rules and four tokens in
`manuscriptPlate.css`, and the shared threshold copy in `manuscriptTiles.ts`.

**The tab is free in full.** The shelf, the pitch box and the add tile carry no chip and no gate —
the pane's single `msv-prochip` belongs to the Scout strip, asserted by count.

### The threshold copy is now one string, on two surfaces

Per the ruling, the pair is parallel — one sentence, one number, stating the feature's threshold
rather than prompting:

- `The ‘X meets Y’ line needs two comps.`
- `The ‘X meets Y’ line needs one more.`

They are **exported constants** (`PITCH_NEEDS_TWO` / `PITCH_NEEDS_ONE`), and the Details tile and
the pitch box both render them — asserted **character for character on both rendered surfaces**,
not merely "both import something". Two near-identical sentences would drift the first time one was
edited, and the page would tell a writer two different things about one rule. A further lock rejects
`you`/`your`/`add`/`write`/`try`/`just`/`simply`/`makes` in either string, which is what caught the
coaching in the first pair.

Typographic single quotes (`‘ ’`) rather than the straight ones in the ruling text — the app's prose
elsewhere is typeset, and this string is prose.

### The Scout — three states, and two of them must not be confused

| | Chip | Body | Action |
|---|---|---|---|
| **Free** — an offer | `Pro` | what the Scout does | `See how it works` + `Upgrade` |
| **Pro + live** — a tool | none | what the Scout does | `Find comps` |
| **Pro + down** — an outage | mono `Unavailable` tag | *The Scout is unavailable just now. Nothing has been lost — try again shortly.* | `Find comps`, disabled |

The outage gets its **own surface treatment** (`.msv-offer-down`: quieter ground, no border, mark at
55%), not the offer greyed out. Locked four ways: the outage shows no chip, no `Upgrade` and no
`See how it works`; a **free** user never sees the outage wording (availability is not their fact —
telling them "unavailable just now" would be a temporary lie about a permanent state); the three
states are asserted to be **three genuinely different strings**; and the strip holds one slot with
one `msv-offeracts` in every state, so upgrading changes words rather than page shape.

Gating is `isPro` + `scoutAvailable` as props — `isProUser(currentUser)` and `scoutLive()` at the
Phase 6 call site. `SCOUT_LIVE` is `false` today, so the live state is currently unreachable in
production; that is the honest state and the outage strip is what a Pro user would see.

**No fabricated last-run line.** The ref's Pro strip reads *"Last run 2 August — 6 suggestions,
3 added."* Nothing anywhere stores that. The sentence renders without it; a `lastRun` prop exists so
the day a real field lands it has somewhere to go, and a lock asserts the line is absent without it.

### The shelf grid

Spine rotating by position, Playfair title, `AUTHOR · YEAR` omitted a clause at a time (author only,
year only, or the whole line gone), `isOlderComp` for the chip — the same rule the shelf and
Suggestions use — note in Caveat, and a removal control that **names what it removes**
(`aria-label="Remove Stormbreak"`) and is reachable by `:focus-visible`, not hover alone.

**Copy is absent, not inert, while the line is incomplete** — there is nothing to copy, so no button.

### Editorial keeps the spine distinction as value

The ref rotates three hues (sage `#8a9e88` / tan `#c9a06a` / mauve `#a98ba0`). Editorial gets three
**greys** — `#9a9a9a` / `#6f6f6f` / `#c2c2c2` — locked as three distinct values with ≥24 points of
spread. Three identical greys would have silently retired a distinction the design draws, and three
hues would have failed the chroma check. This is the standing rule applied, not a one-off.

### The fifth mark, and what the count lock taught

`MagnifierMark` joins the module. Phase 1's `toHaveLength(4)` would have failed here **for the right
reason and been "fixed" by bumping a number**, so the assertion was rewritten to what actually
matters: *no notebook is declared here, whatever else the registry grows.* The count is incidental;
the absence is the invariant.

The palette lock also fired — the magnifier's `#e9ede6` was not on Phase 1's list. It earned its
place (the ref's own `.node.in` fill, and the app's canonical sage fill elsewhere) and the list now
says so in as many words: **it is a gate, not a record**, and anything failing it should be checked
against the ref before the list is widened.

### Five locks verified red

Outage showing a Pro chip to a paying user · free user shown the outage wording · an invented
last-run history · the pitch box forking its own wording · coaching creeping back into the shared
copy.

### ⚠️ One thing Phase 6 must decide — two live editing homes for comps

This pane edits comps, and `/manuscripts/comps` (`ComparableTitlesPage`) still does too. The pane
itself is presentational — add and remove are callbacks, and the writes will go through the pure
`withCompAdded`/`withCompRemoved` and one `updateManuscript` — so **no second editing logic exists**.
But two live surfaces for one job is exactly the fork the addendum warns against. Phase 6 must
settle whether the sub-page is retired, kept as the deep view, or the tab defers to it. **Not decided
here**, and no extraction from the blocked `ComparableTitlesPage.tsx` was attempted.

---

## Rulings folded in (superseding the original brief)

1. **Submission packages is not Pro-gated** — the Free/Pro fork is deleted from Phase 5. One pane
   for everyone; no PRO chip on any tab; tile 4 has one variant. Confirmed against
   `SubmissionPackages.tsx`, whose own header records that a Pro-selling landing was retired
   *because* the route has no gate. `isProUser` now gates The Scout only.
2. **`createdDate` is absent** — tile 3 leads with the status fact (`Querying since {date}` /
   `{Status} since {date}`), not `Added`. No derivation from earliest activity; no backfill.
3. **`--msv-*` tokens, not literal hexes** — the brief's values are the expected Cappuccino
   resolution and are verification targets, not authored values. Marks keep baked fills (they are
   illustrations, not themed surfaces).
4. **The notebook is a PNG** — module holds the four SVGs only; the plate imports the existing
   asset. See above.

---

## Outstanding, separate from this build

- **⚠️ One number-speller, not four.** `spellCount` (mine), plus private copies in
  `dashboardStats.ts`, `todoBoard.ts` and `topNav.ts`, none exported. Extract one, retire the four:
  a single commit touching those three files and `manuscriptTiles.ts`. Out of scope here by decision.

## Open, carried into Phase 2+

- **Theme resolution must be verified in all three themes before the Phase 2 commit**, and what each
  band resolves to reported. The plateband must not render sage in Editorial. Any new `--msv-*`
  token will be named here.
- **No `source: 'user' | 'suggested'` field exists** — the brief assumed it. `inQuery` is the only
  stored intent. Phase 4 reads the live shape and introduces nothing.
- **The Scout is built but not live**: `SCOUT_LIVE = false` in `src/lib/suggestComps.ts`, with a
  `scoutLive()` reader and a `__SA_SCOUT_LIVE` dev override; the function is exported from
  `functions/src/index.ts` and its core tests pass, but it rides the standing Blaze/functions gate.
  Phase 4's Pro strip gates on `scoutLive()`, not a hardcoded boolean. **No "last run" field exists
  anywhere**, so that line renders without it rather than fabricating a claim.

## Reused, not rebuilt (recon-confirmed)

| Need | Source |
|---|---|
| Pro predicate | `isProUser` — `src/lib/suggestComps.ts`, re-exported via `assistFill.ts` |
| Pitch line | `pitchLine` / `pitchLineText` — `src/lib/comps.ts` |
| Older-comp chip | `isOlderComp` — `src/lib/comps.ts` |
| Comps read | `manuscriptComps` — `src/lib/comps.ts` |
| Response predicate | `isResponse` — `src/lib/packageMetrics.ts` |
| Active queries | `activeQueryCount`, `lastActivityMs`, `recentQueries` — `src/lib/manuscriptPage.ts` |
| Package slots | `isSlotFilled`, `UNFILLED_SLOT`, `resolveActivePackage` — `src/lib/packageMetrics.ts` |
| Accordion | `Reveal` in `AllManuscripts.tsx` — the CSS `0fr→1fr` trick collapses in the stage scroller |
| Active manuscript | `localStorage["scriptally_active_manuscript_id"]` — shared with comps + packages |

## To unblock Phases 2–6

The header stream commits or reverts `AllManuscripts.tsx`, `ComparableTitlesPage.tsx`, `comps.css`,
`manuscripts.css`, `PageHeader.tsx`. Then re-run the gate and proceed from Phase 2.
