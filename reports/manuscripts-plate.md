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
