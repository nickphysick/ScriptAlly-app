# Submission packages — restructure (rail + infographic)

Design authority: `design-refs/submission-packages-restructure.html`.
Report is append-only, one section per phase.

---

## Phase 0 — Recon gate

### Design ref — found, and NOT where the prompt said

The prompt named `design-refs/submission-packages-restructure.html` and made its absence a RED GATE.
That path did not exist. Before declaring the gate I checked the alternate location this repo has
used before (CLAUDE.md records it twice: *"the specified `design-refs/` dir was ABSENT again — built
from Nick's Downloads attachment"*), and found:

    ~/Downloads/submission-packages-restructure.html   19,225 bytes   19 Aug 22:08

Same basename, timestamped minutes before this session opened. This is the known hand-off pattern,
not a missing artefact, so **the gate is not tripped**. The file is copied to
`design-refs/submission-packages-restructure.html` byte-identical and committed with this phase —
which is exactly what Phase 0's "commit: report + design ref only" anticipates.

### Baseline gates (recorded BEFORE any edit)

Pass condition for every later gate is **no worse than this**, not green.

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0**, no output — clean |
| `npx vite build` | **exit 0**; whole log grepped for `error\|[WARNING]` → no matches (only the expected chunk-size note). Per CLAUDE.md this is grepped, never `tail`-ed |
| `npx vitest run` | **exit 1** — 1 failed file / 328 passed (329). Tests: 1 failed / 5556 passed / 2 skipped (5559) |

**Baseline vitest is RED, and it is not mine.** The failing file is
`src/components/todo/tasksViewport.test.tsx:1169` — the to-do list stream's own WIP, which is both in
the baseline dirty list below and on this prompt's do-not-touch list. Baseline red is therefore
expected and untouchable.

> Note on how this was captured: the background-task summary for the vitest run reported *"exit code
> 0"*, because that is the exit of the outer `… | tail -40` pipeline. The real signal came from
> `set -o pipefail` plus an explicit `echo "VITEST_EXIT=$?"`, which reported **1**. This is the exact
> masking CLAUDE.md warns about ("piping to tail otherwise masks a red tsc"). Every gate in this run
> records its own explicit exit code for that reason.

### Baseline `git diff --name-only HEAD` (40 paths)

Other streams are live in this tree, as the prompt said they would be. Recorded verbatim so Phase 4
can prove only my paths were added:

```
reports/audit/send-journey.png                      run-artifacts/audit-recon.txt
reports/audit/send-rest.png                         run-artifacts/audit-recon2.txt
reports/card-conformance/{chase,close,decide,send}-{1440,1920}.png
reports/pane/*.png  (22 files)                      run-artifacts/frame-RED-before.txt
run-artifacts/qc-match-deployed.txt                 run-artifacts/qc-match.txt
src/components/todo/TaskList.tsx                    src/components/todo/ToDoPage.tsx
src/components/todo/tasksViewport.test.tsx          src/lib/elapsed.ts
```

`src/lib/elapsed.ts` is dirty (another stream). D10 requires the app's single existing elapsed-time
formatter — I **import** from it and never stage it.

---

### R1 — Where the page lives

| | |
|---|---|
| Route | `/manuscripts/packages` |
| Mount | `src/App.tsx:719` → `<SubmissionPackages />` (inside the shared `/manuscripts` `StagePage`) |
| Host | `src/components/SubmissionPackages.tsx` (296 lines) |
| Chrome | `WorkspacePageGrid` with `plate={<PageHeader variant="workspace" mark="packages" …/>}` |

Current anatomy, top to bottom:

1. `PageHeader` — title *Submission packages*, description *"Bundle your materials once, then send
   them without rebuilding each time."*, `titleAdornment` = `.pkgw-propill` (ShieldCheck + "Pro"),
   `actionsSlot` = manuscript selector chip + `New package` primary button.
2. `.pkgw-strip` — the scorecard sentence.
3. `PackageTabs` — the **Workshop · Analytics** strip (`src/components/packages/PackageTabs.tsx`).
4. `WorkshopTab` or `AnalyticsTab` in a `.pkgw-tv` tabpanel.

The route mount is in `App.tsx`, which is do-not-touch — **and the restructure does not need it.**
Everything changes inside `SubmissionPackages.tsx` and its own `packages/` components, so no route
change is required and no red gate is tripped on that count.

**Notable: the ref's header card is already this page's header, restyled.** The ref draws icon disc ·
`Submission packages` · PRO pill · *"Bundle your materials once, then send them without rebuilding
each time."* · a manuscript button · a `New package` primary. That is `PageHeader` + `actionsSlot`
exactly, including the description string verbatim. So D5 is a **treatment** change, not a new
component — and this file already establishes the precedent for doing that page-scoped rather than
forking a component eleven pages share (its own comment: *"restyled to the 2px Pro rule under the
`.pkgw` scope — Discover's pattern, so there is no second rule and no fork"*).

**What the Analytics tab renders (F1):** `AnalyticsTab.tsx` — a scope row (All packages + one pill
per package) over either an all-packages view or one package in focus: funnel stages, reply-rate
ranking, median reply windows, per-material usage, overdue sends, recommendations and community
percentiles. Its framing rule is that **reply rate is primary and requests are events, never a
rate**. It has its own empty state (`AnalyticsEmpty`). It is reused whole — see F1 below.

### R2 — Materials data model

`ManuscriptVersion` (`src/types.ts:232`), scoped per manuscript by `manuscriptId`:

```ts
id, manuscriptId, userId, componentType: ComponentType, versionName: string,
fileAttached: boolean, fileName?, createdDate: string /* ISO */,
contentDraft?, notes?, contentType?: "text"|"link"|"file", contentLink?
```

Taxonomy in code is `ComponentType` = `Query Letter · Synopsis · Sample Pages · Full Manuscript`.
The builder surfaces **three**: `BUILDER_TYPES` in `src/components/packages/typeMeta.ts` excludes
Full Manuscript deliberately — which matches the standing law in CLAUDE.md that full manuscript and
author bio are excluded from both material surfaces.

**Display labels already agree with the ref and must be read from code, not typed as literals.**
`TYPE_META[QUERY_LETTER].label` resolves through `materialLabel("Query letter")` →
**"Covering letter"** (UK copy; the stored token stays `Query letter` for ever). Synopsis →
"Synopsis", Sample Pages → "Sample pages". These are exactly the ref's three eyebrows, so the
register reads `TYPE_META`, never a hard-coded string.

**Two honest gaps in the ref's detail line — flagged, not faked:**

* **There is no edited date.** The only timestamp is `createdDate`. Rendering it as *"edited 4 days
  ago"* would put a created date under an edited label — precisely the fault CLAUDE.md records
  against the Manuscripts tile (*"a first-query date wearing the wrong label — a plausible number
  stating something untrue"*). The register says **"added {ago}"**.
* **There is no version number.** `versionName` is free text (the ref's "Hook-first" is a name, its
  "v3" is not a field). Deriving an ordinal would invent a number the data does not hold, so the
  detail line carries only what is real: word count where a draft exists, plus added-recency.

Word count is not stored either but **is** honestly derivable, and a helper already exists:
`versionMeta(v)` in `packageMetrics.ts` counts words in `contentDraft` and returns
`"~7,400 words"`, falling back to the attached file name. Recency uses the app's single formatter,
`agoLabel(daysBetween(…))` from `src/lib/elapsed.ts` — no new formatter is written (D10).

### R3 — Packages data model, and F3 answered

`SubmissionPackage` (`src/types.ts:249`):

```ts
id, manuscriptId, userId, packageName,
queryLetterVersionId: string, synopsisVersionId: string, samplePagesVersionId: string,
status: "Active"|"Retired", createdDate
```

**Packages reference real material IDs.** The legacy free-text fields the prompt asked about —
`queryLetterDetails` / `synopsisDetails` / `samplePagesDetails` — **do not exist anywhere in `src/`**
(grepped, zero matches). So:

* The composition line *"Hook-first v3 · One-page v2 · Ch 1–3"* **is** derivable — resolve each of
  the three slot ids to its `ManuscriptVersion.versionName`, in `BUILDER_TYPES` order, via the
  existing `SLOT_FIELD` map in `typeMeta.ts`.
* Empty slots are the `UNFILLED_SLOT = ""` sentinel, tested with the existing `isSlotFilled`.
* **F3 needs no migration.** There is nothing legacy to migrate; no migration shape is proposed
  because none is required.

### R4 — Package → query linkage, and F2 answered

`Query.packageId: string` (`src/types.ts:412`, *"Links to active SubmissionPackage"*). Everything the
ref's Tracking panel draws is derivable **today**, from helpers that already exist in the locked
`packageMetrics.ts` (read and reused, never edited):

| Ref line | Derivation |
|---|---|
| "Sent with 6 queries" | `packageMetrics(pkgId, queries).sent` — queries whose `packageId` matches |
| "Standard UK · 2 of 6 replied" | `.responses` of `.sent`; `isResponse` = `hasAgentResponded \|\| isRequest` |
| "1 partial request logged" | `materialUsage(versionId, packages, queries).requests` via `isRequest` |
| Step 3 "LIVE" | any query with a non-empty `packageId` |

**F2: reply-per-package is derivable now — no engine work needed.** The R4 fallback clause in the
prompt (leave step 3 dormant, limit Tracking to "Sent with N queries") is therefore **not** invoked;
Tracking ships both rows the ref draws.

### R5 — Existing add/edit flows (nothing new is built)

| Affordance | Existing flow |
|---|---|
| New package | `setNewPkgSignal(n+1)` in the host → `newPackageSignal` prop → `WorkshopTab` opens a fresh draft |
| Open a package for editing | `openPackageId` / `onOpenedPackage` props on `WorkshopTab` — the seam Analytics recommendations already use |
| Add a material | `WorkshopTab` internal: `setNewType(t); setSelMat(null); setMatMode(true)` — the same editor `WorkshopEmpty`'s `onAddMaterial(type)` opens |
| Edit a material | same editor with `setSelMat(v.id)` |

Packages already have a host-level seam; **materials do not** — the materials editor is reachable
only from inside `WorkshopTab`. The rail's `+ ADD` and its material rows therefore need one, and it
is added as an **additive optional prop pair mirroring the package seam exactly**
(`openMaterialsSignal`, `openMaterialId`/`onOpenedMaterial`). No editor is built or duplicated.

### R6 — Pro / free gating

**There is no Pro gate on this route, and none is added.** No `isProUser`, `UserPlan.PRO` or plan
comparison appears in `SubmissionPackages.tsx`, `WorkshopTab.tsx` or `AnalyticsTab.tsx`, and no
free-tier package ceiling exists. The host's own docstring records why: the Pro-selling landing that
used to front this page *"was retired because this route has no Pro gate, so it was pitching the
feature to people who already had it."*

The `.pkgw-propill` in the header is therefore **decorative branding, not a gate**. D5 says the PRO
pill is "preserved per existing gating" — existing gating is none, so the pill is preserved exactly
as it renders today and nothing is added behind it. This also matches the prompt's "Free plan has no
agent or query ceilings", and CLAUDE.md's standing rule that Submission packages sells nothing.

### RED GATE check — all clear

| Condition | Status |
|---|---|
| Design ref missing | **No** — found in `~/Downloads`, the documented hand-off path; copied in |
| No structured materials model (free-text only) | **No** — `ManuscriptVersion` is fully structured and packages hold real ids |
| Requires editing a do-not-touch file | **No** — route unchanged; all work is in `SubmissionPackages.tsx` + `src/components/packages/*` |
| Page mid-refactor by another stream | **No** — no packages path appears in the baseline dirty list; the live streams hold `src/components/todo/*` and `src/lib/elapsed.ts` |

R4's non-blocking fallback is not needed (F2 above).

### Measurement instrument — one deviation, stated

`playwright.config.ts` measures **the deployed dev site** by design. No deploys are permitted
tonight, so a deployed measurement cannot include these changes. Measurements therefore run against a
local **`vite preview` of the production `build:dev` bundle**, via the config's own
`SA_E2E_BASE_URL` override.

This keeps the property the config actually argues for — *"the faults being chased are in what
SHIPS: the built stylesheet, its cascade, and the real DOM"* — because it serves the same bundled,
minified output. What it does not reproduce is hosting itself (rewrites, headers). Stated here so no
later reader mistakes these numbers for deployed ones.

### Recon measurement — the current page

Run: `SA_E2E_BASE_URL=http://localhost:3080 npx playwright test tests/e2e/pkgRestructure.measure.ts`
at 1440×900. Screenshot: `reports/pkg-restructure/recon-1440.png`. Raw:
`run-artifacts/pkg-restructure/recon.txt`.

| Reading | Value |
|---|---|
| Measured scrollbar width | **0px** (overlay) — the harness's one blind spot, stated per house rule |
| `.pkg-root` box | x 247, y 111, **w 1170**, h 810 |
| Tab strip present | yes — `Workshop`, `Analytics` |
| `.pkgw-strip` present | yes (the scorecard sentence) |
| `.pkgw-propill` present | yes |

The 1170px content column at 1440 comfortably holds the ref's `300px` rail + `26px` gap + fluid
stage, so no responsive compromise is forced at the review width.

**⚠️ A trap worth recording, caught on the first measurement: `document.querySelector` reads the
WRONG PAGE here.** The probe asked for `.wpg-plate` and got a **0×0** box and the title
**"Query Centre"** — because workspace pages stay MOUNTED and are toggled with `display`, so the
first `.wpg-plate` in the document belongs to the hidden Queries page, not to this one. The same
contaminated the filled-control inventory, which came back holding the rail's `Upgrade`, the shell's
`Search ⌘K` / `New`, and `Log query` / `View website` from hidden pages.

This matters directly for Phase 4, whose pass condition is *"single filled control count = 1"*: run
document-wide it can never be 1, and a naive reading would look like a failure of the design rather
than of the probe. **Every selector from here on is scoped inside `.pkg-root`.** This is the same
family as CLAUDE.md's off-screen-probe rule — a probe that measures something other than its subject
and reports confidently.

What the page renders today (from the screenshot): the white header card (already close to D5 —
icon disc, title, Pro pill, description, manuscript chip, pink `New package`), the `.pkgw-strip`
sentence, the `Workshop · Analytics` tabs, then `WorkshopEmpty` — which already carries **its own
three-step strip** ("1 Add your materials · 2 Bundle them into a package · 3 Send it with a query")
and three per-type material cards. The ref's infographic is a richer treatment of a device this page
already has, which is a point in its favour rather than a new invention.

The harness account's active manuscript is **The Smoke Test** with zero materials and zero packages,
so the empty state is what renders by default. Phase 2 needs a populated state as well as this one.

---

## Flags for Nick

**F1 — What the Analytics tab contained, and how Tracking reaches it.**
`AnalyticsTab.tsx` is a substantial, working analytics view: a scope row (All packages + one pill per
package) over funnel stages, packages ranked by reply rate, median reply windows, per-material usage,
overdue sends, generated recommendations and community percentiles. Its framing rule is deliberate
and worth preserving — **reply rate is the primary measure and requests are counted as events, never
turned into a rate**, because at four or five sends a request rate is noise wearing a percentage
sign. It is **reused whole, not rebuilt**: the rail's Tracking rows select it, exactly as D1 asks.
The tab strip that used to reach it is gone, so Tracking becomes its only route in.

**F2 — Reply-per-package is derivable TODAY. No engine work needed.**
`Query.packageId` links a query to its package, and the locked `packageMetrics.ts` already exposes
everything the ref's Tracking panel draws: `packageMetrics(pkgId, queries)` gives `sent` and
`responses` (so "2 of 6 replied"), and `materialUsage(versionId, packages, queries)` gives per-material
`requests`. The prompt's fallback (leave step 3 dormant, limit Tracking to "Sent with N queries") is
**not invoked** — both rows ship live.

**F3 — Packages reference real material IDs. No migration needed, so none is proposed.**
The legacy free-text fields the prompt asked about (`queryLetterDetails` / `synopsisDetails` /
`samplePagesDetails`) **do not exist anywhere in `src/`** — grepped, zero matches. `SubmissionPackage`
holds three real version-id references with the `UNFILLED_SLOT = ""` sentinel for empty. The
composition line is therefore genuinely derived, not reconstructed from prose.

**F4 — `npm run build:dev` currently ABORTS on its own deploy guard, and the cause looks like a
concurrent-session race rather than a repo fault. Worth one clean re-run before tomorrow's deploy.**
`scripts/assert-build-target.mjs dev` reported *"forbidden projectId gen-lang-client-0801391782
PRESENT — wrong-project bundle"* and aborted (the Vite build itself succeeded: `✓ built in 21.53s`).
Evidence it is a race, not a bad bundle:

* Building the same mode into an **isolated** output directory produced a bundle containing
  `projectId:"scriptally-dev"`, `authDomain:"scriptally-dev.firebaseapp.com"` and **zero**
  occurrences of the prod id.
* Meanwhile `dist/` on disk changed hash underneath this session (`index-BTd3ELed.js` →
  `index-LNnLdIlg.js`) and its bundle contains **only** the prod id and **no** `scriptally-dev` —
  i.e. someone else's `npm run build` landed in `dist/` between my build and my assert.

`dist/` is shared mutable state across sessions in one working tree. The guard is behaving correctly;
it read a bundle it did not build. **Nothing here needs fixing in the repo** — but the guard will keep
firing while two sessions build concurrently, so re-run `npm run build:dev` alone before deploying and
confirm it passes.

> This is also why the safety check below was done rather than assumed: **I refused to point a
> signed-in harness at `dist/`**, because at the moment I looked it was a production bundle. Signing
> the harness account into prod and letting it write is not a risk worth taking to save a build.

**F5 — the page title is clipped at 1440.** In the recon screenshot the h1 "Submission packages" runs
under the manuscript chip. Pre-existing, not introduced here; the Phase 1 header rebuild should stop
it, and Phase 4 states whether it did.

---

## Instrument, stated plainly

| | |
|---|---|
| Tool | Playwright, real browser, `tests/e2e/pkgRestructure.measure.ts` |
| Target | **local Vite dev server on :3080** (`.claude/launch.json` → `scriptally-dev-packages`, this stream's own port, following the file's existing one-server-per-stream convention) |
| Firebase project | **scriptally-dev** — verified before signing in, not assumed |
| Not the deployed site | deploys are forbidden in this run, so a deployed measurement could not contain the change |
| Not the bundled CSS | the dev server serves unbundled sources; the built stylesheet is grepped separately for the same rules |
| Scrollbar | 0px (overlay) on this machine — the known blind spot |

---

## Phase 0 commit

Paths: `design-refs/submission-packages-restructure.html`,
`reports/submission-packages-restructure.md`, `reports/pkg-restructure/recon-1440.png`,
`run-artifacts/pkg-restructure/*`, `tests/e2e/pkgRestructure.measure.ts`, `.claude/launch.json`.

No `src/` file is touched by this phase.
