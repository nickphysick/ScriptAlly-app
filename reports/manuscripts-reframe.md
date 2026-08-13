# Manuscripts reframe — library, dossier and pitch shelf

## Phase 0 — Recon (report only, no commit)

Run at `main` = `3ebfd88`, worktree level with main (`git rev-list --count HEAD..main` = 0).

---

## Blockers and premise corrections — read first

Five findings change what the later phases should build. Three of them are corrections to
premises stated in the prompt.

### B1 — ⚠️ BOTH DESIGN REFS ARE ABSENT FROM THE FILESYSTEM (hard blocker for 1, 2, 4)

Neither file named in the prompt exists:

- `~/Downloads/scriptally-manuscript-library-concept.html` — not present
- `~/Downloads/scriptally-plate-white.html` — not present

Searched `~/Downloads`, `~/Desktop`, `~/Documents` by name and by pattern (`*library-concept*`,
`*plate-white*`). `design-refs/` holds only `manuscripts-page-v1.html`, `manuscripts-page-v2.html`
and `manuscripts-plate.html` — the last is treatment B, the sage plate this reframe replaces.

This bites hardest on Phase 2, which does not say "make the band white" but "build **variant D
plain**, selectable bottom-right, from a mockup carrying four band variants and a variant bar".
Variants A/B/C and the bar are explicitly not to be built — which means the ref is the only thing
that says what D *is*, and I cannot infer three rejected alternatives from a name. Phase 1's grid
and Phase 4's four inline editors are likewise specified as "per the ref" in their particulars
(the shelf-meter geometry, the popover chrome, the decision-sheet layout).

**Nick: the two files need to land in `~/Downloads`** (or anywhere I can read). Phase 3 — the pitch
shelf — is fully specified in prose and can proceed without either ref.

### B2 — ⚠️ FIRESTORE RULES SILENTLY DENY EVERY PITCH FIELD (blocks Phase 3 persistence)

`firestore.rules:520` gates manuscript updates on an exact allowlist:

```
incoming().diff(existing()).affectedKeys().hasOnly([
  'title', 'genre', 'subGenres', 'ageCategory', 'wordCount', 'logline', 'comps',
  'status', 'shelvedReason', 'statusChangedDate', 'notes', 'shelved', 'activePackageId'
])
```

This is the `affectedKeys` gotcha in its exact documented form: a write carrying a new pitch field
is **denied with no client-visible error**, and the UI can trap on it. Phase 3 can be built and
will render, but nothing new persists until Nick deploys rules. `logline` is already in the list,
which is one more reason to reuse it (see Q3).

Rules Nick will need — the shape depends on the Q3 decision, so this is the maximal version:

```
// in isValidManuscript, alongside the other optional clauses
&& (!data.keys().hasAll(['elevatorPitch'])  || (data.elevatorPitch  is string && data.elevatorPitch.size()  <= 2048))
&& (!data.keys().hasAll(['backCoverBlurb']) || (data.backCoverBlurb is string && data.backCoverBlurb.size() <= 4096))
&& (!data.keys().hasAll(['onePageSynopsis'])|| (data.onePageSynopsis is string && data.onePageSynopsis.size() <= 16384))
&& (!data.keys().hasAll(['fullSynopsis'])   || (data.fullSynopsis   is string && data.fullSynopsis.size()   <= 32768))
&& (!data.keys().hasAll(['pitchEdited'])    || data.pitchEdited is map)

// and each new key added to the update allowlist above
```

Final names await the Q3 ruling; I will restate the exact block in the Phase 3 report.

### B3 — ⚠️ SYNOPSIS PROSE ALREADY HAS A HOME, SO TWO OF THE FIVE ASSETS WOULD BE A SECOND ONE

`ManuscriptVersion` carries `contentDraft?: string` and `componentType: ComponentType.SYNOPSIS`,
and the Package Workshop **already authors synopsis text into it** — `SubmissionPackages.tsx:100`
(`createVersion`) and `PackageWorkshop.tsx:176` (`onUpdateVersion({ versionName, contentDraft })`).
A writer today types their synopsis in the Package Workshop, and the result is what a submission
package's `synopsisVersionId` points at.

Phase 3's *One-page synopsis* and *Full synopsis* would therefore be a **second store for the same
prose**, on a page that also renders the packages pane naming the first one. This contradicts the
prompt's own baked decision 5 ("One home per asset") and the standing two-surface law that
`PACKAGE_MATERIALS` exists to enforce.

The other three assets — logline, elevator pitch, back-cover blurb — have no existing home and are
clean.

Three ways out, and this is Nick's call, not mine:

1. **Shelf stores all five as manuscript fields.** Simplest; accepts that synopsis prose exists in
   two places and that the packages pane and the pitch shelf can disagree.
2. **Shelf stores three; the two synopses read and write through `ManuscriptVersion`.** One home
   preserved, but the shelf's five cards then have two different storage backends and a version
   concept (v1/v2) the shelf's UI does not model.
3. **Shelf stores all five; the package synopsis slot is repointed at the manuscript field** and
   version-authoring of synopses retires. Cleanest end state, largest blast radius, and it reaches
   into `SubmissionPackages.tsx` / `PackageWorkshop.tsx` — outside my owned file set.

I recommend **(1) for this build with the conflict documented**, because (2) buys the letter of the
law while breaking its spirit, and (3) is a packages-page project wearing a manuscripts-page hat.
But it should be an explicit decision rather than a default.

### B4 — ⚠️ `deleteManuscript` DOES NOT ORPHAN QUERIES. Phase 6's premise is wrong.

The prompt says "`deleteManuscript` currently orphans attached queries immediately." It does not.
`db.tsx:1134` runs a full ordered cascade via `cascadePlan("manuscript", …)`:

versions + packages → queries, **each preceded by its live-fetched `activity` subcollection** →
global-feed projections → `taskFlag` stances → **the manuscript LAST**, so a mid-way failure leaves
it and a clean retry intact. Batched at 450 (Firestore caps at 500). A durable delete record is
written to the global feed with no `queryId`, so the cascade cannot purge it.

`AllManuscripts.tsx:104` already guards it with `ConfirmDestroy` + `destroyManifest` — type-to-confirm,
no undo window, the dialog states the cascade.

So Phase 6's delete half is **already built and already correct**. What it does is the opposite of
orphaning: it takes the queries with it. If Nick wants a *different* behaviour — orphan-and-warn, or
reassign — that is a new decision, not a fix. Recommend striking the delete guard from Phase 6.

### B5 — ⚠️ `updateManuscript` APPENDS AN ACTIVITY ON EVERY CALL

`db.tsx:1080` writes a `MANUSCRIPT_UPDATED` activity — *"You updated a manuscript's details"* — after
every successful update. Under Phases 3 and 4 that fires on **every inline title edit, every word-count
nudge, every genre chip, and every pitch-asset save**, so a writer polishing a blurb three times
lands three identical entries in the global feed.

The precedent for the fix is in the same file, twelve lines down: `setActivePackage` writes direct
with **no** activity, commented *"a quiet preference, not an edit"*.

Phases 3 and 4 need a quiet writer on the same pattern. Per the concurrency contract that is an
**additive function in `db.tsx`** (never a modification of the existing writer), and the commit
message will name `db.tsx`. Proposed: `updateManuscriptQuiet(id, fields)` — same `updateDoc`, same
`statusChangedDate` stamping, no `addActivity`. Status changes keep the loud writer.

---

## Answers to the eight recon questions

### Q1 — Ownership

**Clean. No red gate.** `git status --porcelain`:

```
 M src/components/Queries.tsx      ← Queries Centre stream
 M src/components/shell/f12.css    ← Queries Centre stream
?? design-refs/94-rest-polish.html ← Queries Centre stream
?? design-refs/95-tracking-half.html ← Queries Centre stream
```

Nothing I own is dirty. `AllManuscripts.tsx` is clean. Both shared-spine files (`types.ts`, `db.tsx`)
are clean and available.

One note: `src/components/manuscripts/` saw a **comps rebuild land today** — `ComparableTitlesPage.tsx`,
`comps.css`, `compMarks.tsx` and five comps test files, commits `be5c9b9`…`cbe4e64`. All committed,
tree clean. `ManuscriptCompsPane.tsx` (the tab pane I reuse) was untouched by it — last modified
11 Aug. No conflict, but the comps sub-page is more capable than it was when the Q6 retirement note
below was written.

Single worktree: `/Users/nickphysick/ScriptAlly-app`. No stale parallel checkout.

### Q2 — Baselines

| Tree | tsc | Vitest |
|---|---|---|
| Shared (dirty) | green, exit 0 | **1 failed** / 4573 passed / 2 skipped — 277 files |
| **Isolated worktree at HEAD** | — | **277 files, 4574 passed, 2 skipped, 0 failed** |

The single shared-tree failure is `src/lib/queryCentreFrame.test.ts` reading the Queries stream's
uncommitted `f12.css` (a missing `padding-right: var(--gut)` on `.f12-list`). Not mine, not my gate.

**The isolated worktree is the run to believe: green at HEAD.** Kept at
`…/scratchpad/wt-ms` for per-phase verification.

### Q3 — Pitch fields

`Manuscript.logline: string` exists — **required, not optional**, and already in both the rules
validator (`size() <= 2048`) and the update allowlist. Reuse it; do not add a second field.

Nothing else exists. No `elevatorPitch`, no `blurb`, no `pitch`, no synopsis *text* on `Manuscript`.
`SubmissionPackage.synopsisVersionId` is a slot pointer, not prose. The only other prose store is
`ManuscriptVersion.contentDraft` — **see B3, which is the finding that decides this phase's shape.**

So Phase 3 adds **four** fields, not five, plus whatever carries the edited timestamps.

One wrinkle worth stating: `logline` being required and every other asset optional means the shelf's
five cards are not uniform underneath. An empty logline is `""` (a stored empty string); an empty
elevator pitch is an absent key. The prompt's `deleteField()` instruction applies to the four new
ones only — clearing the logline to a missing key would break `isValidManuscript`, which demands
`data.logline is string`. I will encode that asymmetry in one place rather than let callers meet it.

### Q4 — Genre model

Live shape: `genre: string` (primary) + `subGenres?: string[]` + `ageCategory: string`. Genre is
therefore **single-primary-plus-extras**, not the flat multi-select the mockup implies.

- **The taxonomy exists**: `src/lib/genres.ts` — `CANONICAL_GENRES`, ids not labels
  (`"gothic-horror"`), a generous alias table, personal genres (`u:{uid}:{slug}`, capped at 10),
  and resolution helpers (`resolveGenre`, `genreLabel`, `genreDisplay`, `genresForUser`).
  **Do not create a second list.** There is also a legacy `PREDEFINED_GENRES` in `lib/manuscripts.ts`
  which `genres.ts` unions and supersedes.
- **A picker already exists**: `GenrePicker` in `src/components/forms` (wrapping `GenreCombobox`),
  live in `AddManuscriptFocusForm`, `AddAgentFocusForm` and `EditAgentDrawer`. It already does the
  token field, the predictive search, the personal-genre creation and the `onCreatePersonal` seam.

**Recommend Phase 4 reuse `GenrePicker` rather than build the typeahead the prompt describes.** A
second genre input would fork the personal-genre creation path — the exact "two surfaces diverge"
shape the repo keeps getting bitten by. The prompt's genuinely new asks (age-category segmented row,
common-genres pills that update with the category, cap at three) sit *around* the picker and can be
built without reimplementing it. Flagging because the prompt specifies the control in detail.

`AGE_CATEGORIES` = `["Picture Book", "Early Reader", "Middle Grade", "Young Adult", "Adult"]`
(`lib/manuscripts.ts:31`).

### Q5 — Routing

`AllManuscripts` mounts at `App.tsx:711` inside `<StagePage active={routeKey === "manuscripts"} layout="fill">`,
sharing that slot with `SubmissionPackages` (`/manuscripts/packages`) and `ComparableTitlesPage`
(`/manuscripts/comps`), selected by plain path booleans.

Two in-repo precedents for library→dossier:

1. **Search param** — Queries uses `?q=<id>` for deep selection. Deep-linkable, survives reload,
   back button works. Costs an `App.tsx` edit only if you want a distinct path; a bare `?m=<id>`
   read inside the page needs none.
2. **Local state** — the agent list opens a card in place with no URL. Zero shell involvement.

Selection state today is neither: `AllManuscripts.tsx:62` seeds `selectedId` from
`localStorage["scriptally_active_manuscript_id"]`, the shared pointer the comps and packages
sub-pages also read. So a manuscript choice already persists across navigation — it just isn't
addressable.

**Building Phase 1 on local state as instructed**, with the open/close in one place so a param or
route can replace it in a single edit. **Nick's call**, and my recommendation is `?m=<id>` — it needs
no `App.tsx` change, it makes a dossier linkable from the dashboard and to-do rows, and back-out-of-dossier
becomes the browser back button for free.

### Q6 — Status

**Stored, and only ever asserted by the user.** `Manuscript.status: ManuscriptStatus` — one of
Drafting / Revising / Ready to Query / Querying / Shelved / On Submission.

Writers, all user-driven: the create form (`AddManuscriptFocusForm`, defaults Drafting), the edit
modal (`AllManuscripts.tsx:434`), CSV import, onboarding, seeds. **Nothing derives or auto-writes it** —
`db.tsx:746` only *reads* `READY_TO_QUERY` to raise a "you haven't started querying" to-do.

`statusChangedDate` is stamped by `updateManuscript` when status changes. **There is no `shelvedAt`**
anywhere in `src/`. The lifecycle overlay is `shelved?: boolean`, deliberately kept out of `status`
so the workflow status survives shelving (`types.ts` comment), and `isShelvedPresentation` is the
single predicate (`status === SHELVED || shelved === true`).

**On the architectural question, and then I stop as instructed:** the finding supports the derived
reading. Every status value except Shelved is either an assertion the writer alone can make
(Drafting, Revising, Ready to Query) or a fact the query records already prove (Querying,
On Submission). Since nothing auto-writes status, the incoherent state the prompt names — *stored
Drafting while three queries are out* — is not merely representable, it is **reachable today by
doing nothing**: send queries, never revisit the edit modal. And `shelved` already exists as a
boolean overlay that deliberately does not disturb status, which is one step from `shelvedAt` being
the only stored assertion. The counter-argument is real though: Revising and Ready to Query are
distinctions no query record can derive, so a fully-derived model would either lose them or need a
second stored assertion beside `shelvedAt`. **Reporting, not deciding.**

### Q7 — `deleteManuscript`

Answered in full at **B4**. Cascades, does not orphan; already guarded; already correct.

### Q8 — The five reused components

All present, all wired into `AllManuscripts.tsx`, all green in the isolated run:

| Component | Path | Wired at |
|---|---|---|
| `ManuscriptPlate` | `manuscripts/ManuscriptPlate.tsx` | `:246` |
| `ManuscriptTabs` | `manuscripts/ManuscriptTabs.tsx` | `:296` |
| `ManuscriptDetailTiles` | `manuscripts/ManuscriptDetailTiles.tsx` | `:300` |
| `ManuscriptCompsPane` | `manuscripts/ManuscriptCompsPane.tsx` | `:318` |
| `ManuscriptPackagesPane` | `manuscripts/ManuscriptPackagesPane.tsx` | `:338` |

Plus `manuscriptMarks.tsx`, `PACKAGE_MATERIALS` (`lib/manuscriptPackages.ts:30`), and
`PITCH_PHRASE` / `PITCH_LABEL` / `PITCH_NEEDS_TWO` / `PITCH_NEEDS_ONE` (`lib/manuscriptTiles.ts:108`).
Lock files present for plate, tabs, tiles, comps pane, packages pane, marks and tokens.

---

## One further correction, to Phase 2

**Phase 2's flex chain would walk straight into a trap this repo has already measured twice.**

The prompt specifies "complete `min-height: 0` flex chain — content → window → inner → card". But
`AllManuscripts` **already renders inside `WorkspacePageGrid`** (`.msv-wpg`), whose row 3 is the only
scrolling row — the chrome left the scroller in the header stream's work. `.wpg-scroll` is a
**block**, and CLAUDE.md records the exact consequence: `flex: 1 1 0%` with `min-height: 0` under a
non-flex parent *"contributes ZERO to a content-sized container and then has no free space to grow
into, so it computes to EXACTLY 0"* — with every element inside it mounted, styled and correct. It
cost two measured incidents (`.tpl-cols`, `.f12-body`).

The fix already exists as a prop: `WorkspacePageGrid` takes `fill?: boolean` (line 101), opt-in,
which puts `display: flex; flex-direction: column` on the scroll row. Phase 2 will **pass `fill`**
rather than hand-roll the chain, and hang the `min-height: 0` chain off that. `PageHeader` and
`WorkspacePageGrid` live in `src/components/shell/` — the header stream's territory — so this is
prop usage only, no edit to either file.

Same caution on `scrollbar-gutter: stable both-edges`: the e2e harness cannot verify it (Chromium
follows the macOS scroll-bar setting and nothing overrides it), so it ships unverified by
measurement and needs Nick's eyes in a classic-scrollbar browser.

## Also flagged

- **`PortalMenu` lives in `src/components/todo/`**, not a shared location, and `Queries.tsx:3944`
  carries a comment reasoning about *not* using it. Phase 4 will import it read-only (no edit), but
  it makes Manuscripts depend on a To-do component. Worth a shared home eventually.
- **Retiring word-count range guidance reaches outside my file set.** Live consumers:
  `AddManuscriptFocusForm.tsx:476` (placeholder), `onboarding/ManuscriptFields.tsx:76`,
  and `lib/manuscriptPage.ts:132` (`wordCountWhisper`, currently unrendered). `genres.ts` also carries
  `wordCountRange` per genre and `wordCountRangeForGenre`. Phase 4 removes it from the plate; the
  creation form and onboarding are **not mine to edit** — reporting for a follow-up, per the prompt's
  own instruction to record the retirement.

## Verdict

**No red gate. Phase 1 can start** — it needs the library ref (B1) for fidelity but not for the
data model.

Two decisions are Nick's before their phases run: **B3** (where synopsis prose lives) gates Phase 3's
shape, and **B1** (the two refs) gates 1, 2 and 4's fidelity. **B2** (rules) gates Phase 3 *persisting*,
not building. **B4** should strike the delete half of Phase 6. **B5** and the Phase 2 correction I
will handle inside their phases as described.

---

## Phase 1 — Library grid

Commit: `manuscripts: library grid` (names `src/types.ts` and the new `src/lib/manuscriptPitch.ts`).

The page body is now a responsive grid of manuscript cards plus a dashed add tile, opening into the
dossier. What was there before — the shelf switcher — is **deleted, not hidden**: it existed to pick
the single card's subject, and a library does that by being a library. Keeping both would have given
the page two controls for one job.

### What landed

| File | |
|---|---|
| `src/lib/manuscriptPitch.ts` | NEW — the four-asset derivation and the shelf meter. Pure. |
| `src/lib/manuscriptPitch.test.ts` | NEW — 17 locks incl. the no-appraisal adverb lock. |
| `src/components/manuscripts/ManuscriptLibraryCard.tsx` | NEW — the card and the add tile, props only. |
| `src/components/manuscripts/manuscriptLibrary.css` | NEW — grid, card, meter, add tile, back link. |
| `src/components/manuscripts/manuscriptLibraryCard.test.tsx` | NEW — 11 render locks. |
| `src/components/manuscripts/manuscriptLibraryTokens.test.ts` | NEW — 12 theme + structure locks. |
| `src/types.ts` | +2 optional fields (`elevatorPitch`, `backCoverBlurb`). Additive only. |
| `src/components/AllManuscripts.tsx` | library/dossier view state, grid render, switcher removed. |
| `src/components/materialsPageSmoke.test.tsx` | repointed at the new populated state. |

### Decisions taken inside the phase

- **Four segments, four assets** — per the addendum. The meter's caption adjusts: `Pitch shelf empty
  · Start with the logline` → `N of 4 pitch pieces written · {what is missing} to go` → `All 4 pitch
  pieces written` with no second clause. The right clause **names up to two missing pieces and counts
  beyond that**: three names truncate in an 8.5px mono line, and a truncated list reads as a shorter
  list rather than as a clipped one.
- **A synopsis counts as written only when it has prose.** A version in `link` mode carries a URL and
  no `contentDraft` — nothing to show, nothing for Copy to lift — so filling a segment for it would
  report a piece the shelf cannot produce. **This under-reports a writer who keeps their synopsis in
  a linked document**; recorded as an open item for Phase 3 rather than split silently.
- **Genres render through `genreDisplay`.** `GenrePicker` stores canonical IDS (`literary-fiction`),
  so the card resolves them. ⚠️ **`ManuscriptPlate` does NOT** — it prints `genres={[ageCategory,
  genre]}` raw, so the dossier plate shows the writer the stored id. That is a live (pre-existing)
  display bug; **Phase 2 fixes it when it restyles the plate**, rather than Phase 1 propagating it
  into a new component for consistency's sake.
- **The status pill mirrors the plate's rule exactly** — shelved → grey, else the accent pill. The
  ref draws a third, muted `.pill.drafting` variant for non-live statuses; that is **deliberately not
  built here**, because adding it on the card alone would make the card and the plate disagree about
  one manuscript. It is reconciled in Phase 2, where both change together.
- **The card is a single `<button>`** — one keyboard stop, one accessible name. A clickable `<div>`
  wrapping a link gives the same book two of each.
- **The mechanism is three lines** (`openDossier` / `closeDossier` / `dossier`), so a `?m=<id>` param
  or a nested route replaces it in one edit. It deliberately does **not** seed from the stored
  active-manuscript pointer: the page opens on the shelf, per the prompt.

### Two faults this phase found in its own work

- **`mlib-segs` was a PREFIX of `mlib-seg`.** A container class that prefixes its children's makes
  every prefix-matching selector and test read the container as an extra child — it did exactly
  that, reporting five segments where there are four. Renamed to `mlib-meterrow` and locked.
- **A lookahead regex counted all four segments as unfilled.** `mlib-seg(?= |")` backtracks onto the
  space inside `mlib-seg on` and matches it. This is the documented house trap, hit while writing a
  test *for* a four-segment meter. Rewritten to extract the class values and compare them in code.

### Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | green |
| Vitest, shared tree | **280 files, 4620 passed, 2 skipped, 0 failed** |
| `npm run build` | green (built in 4.48s) |
| Token lock verified RED | yes — a bogus `var()` fails it before it was believed |

**Live-app verification was not possible and no claim is made that it was.** The dev server is
auth-gated and signing in is not something I will do. Geometry was measured in a harness loading the
**whole built stylesheet** (`dist/assets/index-*.css`, never a hand-picked source list — the
box-sizing trap), which per house rule answers *"did the change do what I intended"* and **not**
*"is the app correct"*. Measured at 1280×900:

- Grid `397 · 397 · 397`, gap 20; reflow 3 → 2 → 1 columns at 1280 / 900 / 390, **no horizontal
  overflow at any width**.
- Three cards with wildly different logline lengths: **all 377px tall, all three feet at offsetTop
  364** — `margin-top: auto` is doing its job, so meters line up across a row.
- **The `<button>` card resolves to `display: flex; flex-direction: column; box-sizing: border-box`**
  — the one genuinely uncertain thing about making the whole card a control.
- At **one manuscript** (the commonest shelf): card and add tile both 336px, same row. That is the
  intended appearance.
- **Editorial measured on the RENDERED card, not just the tokens**: cover stops chroma 1, segments 0,
  genre pill 2, status pill 2. No hue leak anywhere.

### ⚠️ A coverage gap this phase opens, and it is not nothing

The populated page smoke now lands on the **library grid**, so the dossier branch's wiring — its
tabs, its four Details tiles and the lifecycle menu — is **executed by no smoke**. This repo's specs
read source with no jsdom, so nothing can click a card.

It is narrower than it looks (`plateStats` still runs, on the card; the tile derivations keep their
own unit tests and `ManuscriptDetailTiles` its own render spec), and the page's default render is
smoked so a module-load throw is still caught. But it is real, and CLAUDE.md names this exact failure
mode as one that shipped through a fully green suite once before.

**The fix is the first task of Phase 2**: extract `ManuscriptDossier` as a props-only component with
its own render spec. Phase 2 rewrites that wrapper anyway (white plateband, four tabs, `fill`), so
extracting it is the natural first step rather than churn.

---

## Phase 2 — Dossier shell, white plateband, viewport fit

Commit: `manuscripts: dossier shell and white plateband`.

### ⚠️ The Phase 1 coverage gap bit before Phase 2 could close it

Phase 1 recorded that the dossier branch was executed by no smoke. Opening this phase's first file
found the consequence already shipped: a `/* … */` block left in **JSX children position** was
rendering as **literal comment text at the top of the dossier card**.

JSX treats a block comment outside braces as text. It is invisible to `tsc`, invisible to the
production build, and invisible to every source-string spec — and it went to `main` through a green
typecheck, a green build and **4,632 green tests**. Nothing but rendering the dossier could have
caught it.

Extracting `ManuscriptDossier` as a props-only component with its own spec is the fix, and the
spec's first assertion is now that no `/*`, `*/` or `⚠️` reaches the output.

### What landed

| File | |
|---|---|
| `manuscripts/ManuscriptDossier.tsx` | NEW — the dossier, props only, its own menu state. |
| `manuscripts/manuscriptDossier.test.tsx` | NEW — 12 locks incl. the comment-leak assertion. |
| `manuscripts/manuscriptPlate.css` | variant D tokens + the white band, per theme. |
| `manuscripts/manuscriptLibrary.css` | the height chain, `.msv-wrap--doss`, back link. |
| `manuscripts/ManuscriptTabs.tsx` | `Details` → **The record**. |
| `manuscripts/manuscriptLibraryTokens.test.ts` | +6 locks for the chain. |
| `manuscripts/manuscriptPlateTokens.test.ts` | variant D values; superseded strip lock rewritten. |
| `manuscripts/manuscriptPlate.test.tsx` | tab labels. |
| `AllManuscripts.tsx` | 111 lines of inline dossier deleted; `fill`; shared genre resolver. |

### Variant D, as built

White band, `1px` hairline bottom, **no gradient**. Sage survives in exactly two places: the plate's
fill and the genre pills. Three consequences worth naming:

- **The plate and the band swapped roles.** It was a white plate lifted off a sage band; on a white
  band that reads as nothing, so the band went white and **the plate took the colour**. Its shadow
  went with the swap — the only thing casting on a flat white band read as a sticker.
- **The stat strip was repointed, not restyled.** `--msv-stripbg` was `rgba(255,255,255,.62)` — a
  real surface *on sage*, and nothing at all on white. It is parchment with a warm hairline now.
- **⚠️ Bold's plate fill is PINK, and could not be `--msv-palebg`.** That token is `#ffffff` in Bold
  (its genre pills are white with an ink border), so the obvious reuse would have put a white plate
  on a white band and the plate would have vanished. Sage's *role* in Bold is pink. Bold's
  "hairline" is likewise its 1.5px ink rule — every edge in that theme is ink, and one soft warm
  line would have been the odd one out. Both locked with the reasoning attached.

### ⚠️ The height chain was measured BROKEN before it was measured working

Passing `fill` is necessary and was **not sufficient**. `fill` makes `.wpg-scroll` a flex column, but
the page's own `.msv-wrap` sits between it and the card **as a plain block** — so `.msv-doss`'s
`flex: 1` had no flex parent, the card sized to its content, and:

> the **scroll row** scrolled **1810px** while the pane, **1456px tall**, scrolled **not at all**.

Every element mounted, styled and correct. This is the documented trap pointing the other way, and
its tell is exactly as CLAUDE.md states it: *a page that scrolls where its spec says the panes do*.
The fix is `.msv-wrap--doss`, a **modifier** rather than a base rule — the library shares that
wrapper and must keep flowing, or a filling wrapper would stretch the grid to the row's height and
strand the cards at the top of a tall box.

**It is locked link by link** (`.msv-wrap--doss` → `.msv-doss` → `.msv-dcard` → `.msv-dpane`), and
the lock was verified failing red by deleting the link.

### ⚠️ The second internal-scroll exception, recorded

This is the app's **second deliberate internal-scroll exception**, after the to-do page. The dossier
does not scroll the page; its pane body scrolls. The **library view keeps normal page scroll** — a
shelf that grows is meant to grow. No `dvh`, no header arithmetic, and that is asserted.

### Deviation: three tabs, not four

The reframe makes `The pitch` the fourth tab **and the default**, but its pane is Phase 3's build.
Shipping the tab now would open the dossier onto nothing for one commit, and the standing law is
that the shell renders what EXISTS, never what is planned. So Phase 2 ships **three** tabs with
`The record` as the default; **the pitch tab arrives with its pane in Phase 3 and takes the default
with it**. A lock fails the moment the tab appears without the pane.

### Also fixed here

- **The plateband's genre ids.** It printed `genres={[ageCategory, genre]}` raw, so the writer saw
  `literary-fiction`. Both surfaces now share one `msGenres` resolver, which needs `currentUser` for
  personal genres and so lives on the page rather than in either component.
- **The status pill reconciled.** Phase 1 deferred the ref's muted `.pill.drafting` variant rather
  than make card and plate disagree. Both surfaces still read the one rule (shelved → grey), so
  there is nothing to reconcile — recorded as settled rather than carried forward.

### Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | green |
| Vitest | **283 files, 4653 passed, 2 skipped, 0 failed** |
| `npm run build` | green |
| Chain lock verified RED | yes — deleting `.msv-wrap--doss` fails it |

Measured against the **built stylesheet**, with the harness DOM matching the app's real nesting
(`.msv1 > .wpg > .wpg-scroll > .msv-wrap > …`) — the first harness had it wrong and its numbers
described a page the app never serves, which is the standing warning about harnesses:

- **Dossier**: pane 280px visible / 1456px content, **the only scroller**. Scrolling it 600px moved
  the plateband **0px** and the tab row **0px**; `.wpg-scroll` stayed at 0 and the body did not
  scroll.
- **Library**: modifier off, row scrolls again (825 > 682), grid `flex: 0 0 auto`, cards at the top.
- **Three themes**: Capp white band + sage plate; Bold white band + ink rule + pink plate; Editorial
  band `background-image: none` (no gradient), plate chroma 2, strip 1, pill 2 — all monochrome.

**The app itself is still auth-gated and was not verified live.**
