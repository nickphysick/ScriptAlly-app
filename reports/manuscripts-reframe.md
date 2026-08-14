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

---

## Phase 3 — The pitch shelf

Commit: `manuscripts: pitch shelf` (names `src/types.ts` and `src/lib/db.tsx`).

### ⚠️ RULES FIRST — the two new fields are DENIED until Nick deploys

`firestore.rules:520` gates manuscript updates on an exact `affectedKeys().hasOnly([...])`. Neither
new key is in it, so **an elevator-pitch or blurb save is silently denied today**. The logline saves
(it is already in the list). Nothing is worked around and `firestore.rules` was not edited.

Deploy alongside the next hosting deploy: `firebase deploy --only firestore:rules --project scriptally-dev`
(and per the dual-database note, with **both** configs, verifying by release `updateTime` rather than
by the success line).

```
// isValidManuscript — beside the other optional clauses
&& (!data.keys().hasAll(['elevatorPitch'])  || (data.elevatorPitch  is string && data.elevatorPitch.size()  <= 2048))
&& (!data.keys().hasAll(['backCoverBlurb']) || (data.backCoverBlurb is string && data.backCoverBlurb.size() <= 4096))

// the manuscript update allowlist — two keys appended
incoming().diff(existing()).affectedKeys().hasOnly([
  'title', 'genre', 'subGenres', 'ageCategory', 'wordCount', 'logline', 'comps',
  'status', 'shelvedReason', 'statusChangedDate', 'notes', 'shelved', 'activePackageId',
  'elevatorPitch', 'backCoverBlurb'
])
```

### What landed

| File | |
|---|---|
| `manuscripts/ManuscriptPitchPane.tsx` | NEW — the shelf: strip, four cards, inline editing. |
| `manuscripts/manuscriptPitchPane.test.tsx` | NEW — 18 locks. |
| `lib/manuscriptPitch.ts` | descriptions, derived word counts, the live-count label. |
| `lib/db.tsx` | **+`updateManuscriptQuiet`** — additive; the existing writer is untouched. |
| `manuscripts/ManuscriptTabs.tsx` | `The pitch` added, **first, and the default**. |
| `manuscripts/ManuscriptDossier.tsx` | renders the pane. |
| `AllManuscripts.tsx` | `savePitch`, the derivations, the wiring. |
| `manuscriptLibrary.css` | the shelf's surfaces, all on `--msv-*`. |

### Decisions taken inside the phase

- **The quiet writer is in use.** Polishing a blurb three times is not three events in the query
  journey; `updateManuscript` would have written three identical *"You updated a manuscript's
  details"* entries into the global feed. `updateManuscriptQuiet` still stamps `statusChangedDate`
  on a status move, because that stamp is **data the plate and tiles read**, not narration.
- **⚠️ THE TWO EMPTINESSES ARE NOT THE SAME SHAPE, and one place knows it.** `logline` is required by
  `isValidManuscript` (`data.logline is string`) so clearing it writes `""`; the two new fields are
  optional and are cleared by **deleting the key**, because a stored `""` is a value claiming the
  piece exists. `savePitch` resolves both so no caller has to.
- **The logline and the synopsis span both columns**; the middle two share a row. A one-sentence
  logline reads badly in a narrow column, and the synopsis is the longest piece and the only
  read-only one — a ragged 2×2 with a hole in it was the alternative.
- **The synopsis is read-only here and its Edit is a deep link.** Both its Edit and its Write it land
  in the Package Workshop, which stays the single editing home for that prose.
- **`The pitch` is first and is the default** — the reframe's complaint about the old page was that
  nothing on it had been put there by the writer, so the shelf is what the dossier opens on. The
  Phase 2 lock forbidding the tab came out and was **replaced by one asserting the pairing**: no tab
  may render without something behind it, checked for all four.

### ⚠️ Two open items, both stated rather than resolved

1. **No "Edited {date}" on the three manuscript-backed pieces.** The ref draws `12 words · Edited 12
   June`, but the ruling was **two new fields** and a per-asset timestamp needs a third (a
   `pitchEdited` map). Nothing else on the manuscript carries an honest edit date, and deriving one
   from another field would be a plausible number stating something untrue — so the footer states
   the word count alone. **The synopsis card DOES have a real date** (its version's `createdDate`)
   and says so. One small addition if you want the others; say the word.
2. **A link-mode synopsis reads as unwritten** (carried from Phase 1). A version in `link` mode has a
   URL and no prose — nothing to show, nothing for Copy — so it fills no segment. That under-reports
   a writer who keeps their synopsis in a linked document.

### Two faults this phase's own locks caught

- **A description said "you".** *"The pitch you would give in a lift"* tripped the no-coaching lock.
  Reworded to *"A lift-length pitch: premise, character, and what is at stake."* — the sentence now
  describes the artefact rather than the reader.
- **An assertion was over-broad.** The "states the threshold rather than urging" test swept the
  **whole pane** for `your`, and failed on `PITCH_LABEL` — *"…of your pitch — from your comp shelf"* —
  where the possessive is descriptive and correct. Narrowed to the threshold strings, which is what
  the rule is actually about.

### Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | green |
| Vitest | **284 files, 4687 passed, 2 skipped, 0 failed** |
| `npm run build` | green |

Measured against the built stylesheet at 1180px: grid `531 · 531`; **logline and synopsis 1078px
(spanning both columns)**; elevator and blurb 531px each, same row, **same height (215px)**.
Editorial checked on the rendered pane — strip 1, asset 1, textarea 0, meta 0, dashed border 2. All
monochrome; the editing card's accent border is the app-wide `--msv-hue`, not a new colour.

**The app itself is auth-gated and was not verified live.**

---

## Phase 4 — Inline editing on the plate

Commit: `manuscripts: inline plate editing` (names `src/lib/genres.ts` and `src/components/forms/GenrePicker.tsx`).

The plate is the form. Title, word count and genre edit where they are rendered; the logline jumps
to the pitch shelf, which is its home.

### One standing grammar, stated once

`plateEdit.ts` states it and all three obey it: **hover reveals the affordance · click opens it
seeded with the current value and selects it · Enter saves · Escape cancels and restores · a brief
mono "Saved" confirms.** Every write goes through the **quiet** writer — including the title, per the
ruling: the activity feed records the query journey, not field maintenance.

### Genre — what `GenrePicker` already did, and what I extended

Extended **in place**, never wrapped or forked, because a second picker would fork the
personal-genre creation path.

**It already had** the search-first portalled popover, ghost completion, the visibly-ringed ⏎
target, the helper line, chips with removal, alias resolution, the personal-genre escape (with its
cap/junk/dedupe guardrails), single vs multi mode, Escape and outside-click dismissal, and
ID-not-label storage.

**I added two props**, both optional so every existing caller is unchanged:

- `cap` — at the cap the picker **states the fact and refuses**, rather than silently dropping the
  click. Three for a manuscript (`MAX_MANUSCRIPT_GENRES`).
- `ageCategory` — the category's shortcut pills, offered **before typing** and changing with the
  category.

Plus `COMMON_GENRES_BY_AGE` + `commonGenresFor` in `lib/genres.ts` (additive), because **no age
dimension existed** in the taxonomy and none is added here — it is a per-category ordering of
existing ids.

> **⚠️ IT IS A SHORTCUT, NOT A CONSTRAINT, AND THE LOCK SAYS SO.** Every canonical genre stays
> reachable by typing for every category; nothing validates against the list and nothing warns about
> a choice absent from it. A Middle Grade horror is a real book. The lock proves it by pointing at
> `horror`, which appears in **no** shortcut list and is still canonical. An unknown category yields
> an empty list — no pills, rather than the wrong ones.

### The word-count range retirement

`WORD_COUNT_HINT` is `null` and the plate renders no range, no target, no placeholder range. The
rejection note is one line stating what is wrong (`Word count is a number.`), locked against
addressing the writer.

> **⚠️ THE RETIREMENT IS INCOMPLETE AND THAT IS DELIBERATE.** `genreWordCountRange`
> (`lib/manuscripts.ts`) is still read by **`AddManuscriptFocusForm.tsx:476`** (the placeholder) and
> **`onboarding/ManuscriptFields.tsx:76`**; `wordCountWhisper` (`lib/manuscriptPage.ts`) survives
> unrendered. Those files are outside this pass's file set, so the retirement there is **reported,
> not silently done**. Two small edits when someone is next in them.

Separators are accepted (`50,000`, `84 000`) because **the plate prints them** — rejecting a writer's
own displayed value would be the field disagreeing with itself. An empty field is `null`, not zero:
clearing a field is not a claim that the manuscript is empty.

### ⚠️ Deviation — "Edit details" left the plate but not the app

The reframe says the button disappears. **It disappears from the plate**, which is what the change
was about. The form itself moved into the dossier's ⋯ menu, because **three fields have no inline
editor and no other surface on this page: status, shelved reason and notes.** Deleting it outright
would strand them — a functional regression wearing a design decision's clothes. Status leaves that
form when Phase 6's decision sheet lands; the other two need a home before the form can go. Locked
in both directions: the menu has it, and `ManuscriptPlate` no longer takes the prop at all.

### ⚠️ Deviation — the genre editor is an inline row, not a popover

`GenrePicker` **portals its own popover**. Nesting it inside a second portalled popover would stack
two layers for one control. Inline, the picker behaves exactly as it does in every other form.

Relatedly: the prompt says popovers use `PortalMenu`/`splitMenu`. **`PortalMenu` is a grouped
item-list menu** (`{anchor, groups, openSub, onPick}`) and cannot host a numeric stepper. The shared
piece that actually matters is **`useFixedMenu`**, the positioning hook `GenrePicker` itself uses,
and that is what the word-count popover uses — one positioning implementation, not a second.

### Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | green |
| Vitest | **285 files, 4707 passed, 2 skipped, 0 failed** |
| `npm run build` | green |

Measured against the built stylesheet:

- **The title does not jump when clicked.** Input vs `<h2>`: same family (Playfair Display), size
  (34px), weight (600), ink (`rgb(93,64,55)`), line-height (37.4px), and the **glyph left edge is
  identical — 201 vs 201, drift 0**.
- Word popover anchored under its trigger, **332 × 122** against a 100px trigger, fits the viewport.
- Genre row 55px, sitting between the meta line and the logline.

**One dead declaration found and removed:** `.msv-wordpop` carried `min-width: 236px`, but
`useFixedMenu` writes an **inline** `minWidth` (the trigger's width) and inline always wins —
measured `100.023px`. It could never apply. The popover sizes to its content instead, and the rule
now says why rather than carrying a number nobody could read off the page.

**The app itself is auth-gated and was not verified live.** The three editors are stateful, and a
static harness cannot drive React state — it verified the resting, title-editing, genre-open and
popover-open states as geometry, which is what a harness may answer.

---

## Plate editor and dossier header fixes (follows Phase 4)

Ref: `design-refs/manuscript-plate-editors.html`, variant **B**. Four commits.

### Step 2 — the dossier condenses the page header

A **second consumer** of `WorkspacePageGrid`'s existing `condensed` prop, not a second mechanism.
The grid already unions `stuck || condensedByMode` for Query Centre's journeys and passes the header
**one boolean** through context, so it never learns which half fired. The page supplies
`condensed={!!selected}` and nothing in the grid changed. Verified the mechanism was reachable and
not mid-change from the other stream before building.

**No scroll signal is synthesised** — the dossier's scroll row never moves (the pane body scrolls
instead), so a sentinel would never fire. Locked against the page growing `scrollTop` /
`IntersectionObserver` / `stuck` / `onScroll`.

> The lock **strips comments before reading the source**. The page's own comment explains the union
> *by naming `stuck`*, so a bare-string sweep flagged the prose describing the decision as if it were
> the decision being broken. It caught this test on its first run.

### Step 3 — the word-count field

Replaced three text labels in a row with the ref's field: **one bordered box** holding the number
(JetBrains Mono 17px, left), a muted mono `WORDS` unit, and a **36px stacked ▲▼ column inside the
same border** behind a 1px divider, its two buttons split by a hairline. **The focus ring is on the
box**, not the bare input — that is what makes three parts one field. Native spinners suppressed in
both engines.

- **`e E + - .` are rejected at the keystroke, not at save.** Every one is valid to a numeric input
  and none is valid as a word count — and the browser then reports the value as `""` rather than the
  text typed, so a save-time check could not even say what went wrong. `Numbers only.`, clearing on
  the next valid input.
- **Cancel restores** rather than merely closing; otherwise the next open shows an abandoned edit as
  if it were stored.
- **A blank field steps from the stored value, not from zero** — clearing the box to retype is normal
  half-way through, and stepping from 0 would discard the number being edited.
- Hint `↑ ↓ steps 500`, reading its step from `WORD_STEP`. It states what the KEYS do; no range, no
  target, no placeholder range — that stays retired and is asserted.

Measured: popover **270px**, steps column **36px** with a 1px left border, input **17px** mono,
`-moz-appearance: textfield`, ring on the box (none → 3px) with the input's own outline `none`.

> **The lock caught its own parser first.** A flat `selector { body }` sweep **desyncs at the first
> at-rule** — it reads `@media (…)` as a selector and that block's first inner rule as its body, and
> every rule after is off by one. It reported `.msv-stepper` missing from a stylesheet that declares
> it. Comments are stripped and `@media` unwrapped before parsing, with an assertion that the sweep
> parses at all.

### Step 4 — the genre popover

Variant B: a **520px portalled, fixed popover** anchored under the pills. Two columns —
`AGE CATEGORY` (186px, hairline right, a row each with a 3px accent bar, weight 600 and a
right-aligned tick on the current) and `GENRE — up to three` (token field with chips inside it).
**Buffered**: Cancel discards, Done commits both fields in one quiet write.

**Measured: removing the popover moves the plateband 0px and the logline 0px** — which is the fix.
Columns 186px + 1fr, bar 3px, tick visible only on the current row.

**The picker was extended in place, not forked**, with an `embedded` mode that renders its search and
results inline instead of behind a trigger that opens its own portalled popover. Every piece of
logic is shared verbatim — matching, the ⏎ target, aliases, the personal-genre escape and its
guardrails, the cap, the shortcut pills. Added alongside it: ↑↓ walking the list, Enter taking the
highlight, Backspace on an **empty** input removing the last chip, and the typed span marked.

Two deviations worth stating:

- **`PortalMenu` could not host this, and I checked rather than asserted it.** It takes
  `groups: MenuGroup[]` and renders `role="menu"` with `role="menuitem"` buttons — fixed markup, no
  children slot, and wrong ARIA around a text input. **`placeMenu`, the pure placement it positions
  with (flip at the viewport edge included), IS shared** and is what this uses. That is the part of
  the machinery that is genuinely reusable.
- **The right-hand "family" slot carries the only grouping the taxonomy has.** `CANONICAL_GENRES`
  has no family dimension; inventing one would be a second taxonomy. Personal genres say `Yours` and
  canonical ones render nothing — absence omits its clause rather than filling the slot with a guess.

### ⚠️ A theme leak found by measurement, twice

`genrePicker.css` is written for the `.t-f12` wrapper its own popover portals into, so every colour
is `var(--something, <warm fallback>)`. **Embedded there is no `.t-f12` ancestor, so the fallbacks
applied — in every theme.** Measured in Editorial on the rendered popover: the chosen chip at chroma
**26 / 44 / 90**, the tick at **64 (blue)**, option ink at 14, the personal-genre border at 25 — in a
theme whose limit is 6.

**The first fix was incomplete because the first sweep was hand-picked.** Probing a list of surfaces
I had authored missed the chip, the option text and the tick, which belong to the picker. Only
walking **every element and every colour property** found them.

The fix is to **define the variables the picker reads**, scoped to `.msv1`, rather than override its
rules one at a time — which also covers the rules nobody probed. Re-swept afterwards: **zero
elements above chroma 6** in Editorial, excluding `--msv-hue` itself (`#44484d`, chroma 9), the
app-wide Editorial accent already used by the active tab and the primary button.

### Also fixed at the cause

`msv-gpgroup` was a **prefix of `msv-gp`**, so the "no genres means no pills" lock failed on a plate
rendering no pills. Renamed `msv-genreanchor`. Second time this shape has bitten in this build; the
fix is always the name, never the assertion.

And one lock **did not fail red on its first check**: `toContain("placeMenu(")` is satisfied by
`XplaceMenu(`. Re-anchored to `/\bplaceMenu\(/` and re-verified red.

### Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | green |
| Vitest | **4,737 passed, 2 skipped, 0 failed** |
| `npm run build` | green |
| New locks verified red | yes — condensed prop, placeMenu anchor |

**The app itself is auth-gated and was not verified live.** No claim is made about behaviour behind
the gate; the editors are stateful and a static harness verified their geometry only.

---

## Popover rendering and dossier height

Commit: `manuscripts: popover rendering and dossier height`. Ref: `design-refs/manuscript-plate-editors.html`.

Diagnosed before changing anything. **Two of the five hypotheses were wrong, and one fault turned out
to be a symptom of another** — stated below as what it actually was.

### Fault 1 — translucent popovers · CAUSE CONFIRMED, but not the theme-specific one

Every `--msv-*` is declared on a **descendant** selector — `.t-capp .msv1`, `.t-bold .msv1`,
`.t-edn .msv1`. Both popovers portal into `document.body` with `className="msv1"` and **no theme
ancestor**, so not one of those selectors matched. Measured on the shipped build:

| | measured |
|---|---|
| `--msv-card` | **(empty)** |
| `background-color` | `rgba(0, 0, 0, 0)` |
| `border-width` | `0px` |

⚠️ **It was identical in all three themes, not one.** The brief suggested a token that resolves in
Cappuccino and not Editorial; there was no theme for it to be wrong in, because the wrapper was
outside every theme.

**Fixed** by reading the theme class off the plate itself (`themeClassOf`, walking ancestors —
nearest wins, no guessed default) and putting it on the portal wrapper. Both popovers now take an
opaque parchment fill, a **literal `1px` hairline** and radius 14. The border is deliberately *not*
`--msv-cardbd`: that token is `none` in Editorial, whose *cards* are borderless by its grammar — but
a popover floats over content rather than resting on a desk and needs an edge in every theme.

### Fault 3 — "overlapping" rows · NOT A LAYOUT BUG. It was Fault 1.

The brief expected a fixed height, an absolutely positioned child or a negative margin. **There are
none.** Measured with the rows' own rects: `133–153, 201–227, 227–248, 256–294` — strictly
sequential, **zero overlaps**. What the review saw was the page printing *through* an unfilled panel.
Filling the popover fixed it; nothing about the stack changed. Re-measured after the fix: still zero
overlaps, in all three themes.

One real thing was found alongside it: the wrapper carried `.msv1`'s **page-root** layout into
`document.body` — `height: 100%; overflow: hidden; display: flex`, measuring a **0px-tall clipped
flex container**. Harmless for a `position: fixed` child and wrong for anything else, so
`.msv1.msv-portal` undoes it rather than working around it.

### Fault 2 — popover in the top-left · CAUSE: the anchor had no box

`.msv-genreanchor { display: contents }` — which generates **no box at all**, so
`getBoundingClientRect()` returned zeros and `placeMenu` resolved them to `left 8, top 6`: the
window's corner, over the nav. `display: contents` was my own choice, to keep the pill row's flex
layout undisturbed.

**Fixed** with `inline-flex` carrying the meta row's own gap — the pills look identical and the
anchor is measurable. `placeMenu` (the shared one, from `PortalMenu`'s own module) was **extended in
place** with an optional `align` argument, defaulting to `"right"` so every existing caller is
unchanged; a 520px panel right-aligned to a short trigger throws it off the left of the viewport.
The plate also **refuses to place against a zero rect** — better nothing than something at 0,0.

Measured after the fix: anchor **166 × 30** (was 0 × 0), popover left-aligned to the trigger's left
edge, **exactly 8px** below it, **flips above** when the trigger is low, and **shifts** to stay
inside the viewport near the right edge (right edge 1272 in a 1280 window) rather than shrinking.
Grid stays `186px 332px` — self-contained, so the columns cannot pull apart wherever it lands.

**Scroll behaviour: it repositions, it does not close.** These popovers hold a buffered draft, and
closing on a scroll would discard an edit nobody asked to abandon. Capture phase, because the pane
scrolls rather than the window.

### Fault 4 — typography

Playfair for headings and figures, mono for labels and hints, Inter for content. Popover titles
(`Word count`, `Age category`, `Genre`) are Playfair 600 ~15px in ink — not mono, not uppercase, not
letter-spaced. The word-count value is Playfair 600 22px, matching the stat strip's numerals. `WORDS`,
`↑ ↓ STEPS 500` and `COMMON IN {age}` stay mono; genre rows, chips, input and results stay Inter.

### Fault 5 — dead space below the card · CAUSE: the scroll row's own padding

**`fill` is doing its job** — the card measures the full *content box* of row 3. But row 3 pays
`padding-bottom: calc(var(--wpg-foot) + var(--wpg-reclaim-pad))`, and the **working** state sets the
reclaim to the header's height-and-gap delta so a *scrolling* page keeps its max scroll when the
header condenses. The dossier does not scroll — its pane body does — so the reclaim is a dead band
exactly the size of what the header gave back. **Condensing the header (the previous step) is what
introduced it.**

The height is lost at **the scroll row**, not the window, the wrapper or the card.

**Fixed** by contributing `--wpg-reclaim-pad: 0px` and `--wpg-foot: var(--content-top-gap)` from the
page's own class. This is the established pattern, not an override fight: **Query Centre — the other
`fill` page whose panes scroll internally — already does exactly this**
(`.qc-wpg.wpg--working > .wpg-scroll { --wpg-reclaim-pad: 0px }`), and the grid sums those two tokens
precisely so a page can contribute without replacing anything. Reading the *top* gap's own token is
what makes the inset even by construction rather than by two matched numbers. No `height`, no `dvh`,
no arithmetic anywhere.

Measured, all three themes: **padding-top 35px, padding-bottom 35px, card bottom gap 35px**, pane
scrolls, row does not.

> **Flagged:** every `.wpg--fill` row has this same dead band. Generalising the fix belongs in
> `workspacePageGrid.css`, which is not this pass's file.

### Also found

**`--pg-gut` is declared nowhere** — not in any source file, not in the bundle — while three separate
comments (`pageHeader.css`, `workspaceShell.css`, `manuscripts.css`) describe it as "the one gutter,
declared once", and a lock forbids pages from declaring it. Any rule reading it resolves to nothing.
Nothing of mine reads it; reported rather than touched, since all three files are outside this pass.

### Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | green |
| Vitest | **4,788 passed, 2 skipped, 0 failed** |
| `npm run build` | green |

⚠️ **The harness read a zero-height viewport on its first run** — `window.innerHeight` is `0` in this
pane, so a `height: 100%` chain collapsed and reported the card overflowing by 172px. Every number in
that pass described a page the app never serves. Re-measured with **pinned pixel dimensions** and a
screenshot first to force layout, which is the documented handling.

**I cannot see any of this in the running app — it is auth-gated, and I make no claim to have.**
What I measured is the rendered result against the built stylesheet, in the real DOM order, in all
three themes. **What remains for Nick to confirm in the browser:** that the popovers open where the
pointer expects them relative to the live plate, that repositioning on scroll feels right rather than
distracting, and that the 35px bottom gutter reads as even against the side gutters at the viewport
widths you actually use.
