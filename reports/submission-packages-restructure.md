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

---

## Phase 1 — Shell

**What shipped:** the header card treatment (D5), the two-column grid (300px rail / fluid stage),
white containers (D4), and the tab strip removed (D1). The rail panels render their heads; their
registers and the stage's contents are Phases 2 and 3.

### The header card is a TOKEN override, not a component fork

`PageHeader` is shared by eleven pages and `.wsh` reads all three of its card properties through
`var()` **inside its own rule** — so overriding them on the `.pkgw` ancestor resolves at the use
site and every consuming declaration stays where it is. That is the mechanism CLAUDE.md records for
`--header-inset`, and the same aliasing the Agents page does through `--ag-*`. This page had already
refused to fork `PageHeader` once (for its Pro rule); this follows that decision rather than
re-opening it.

Two of the four properties needed nothing — `--wsh-plate-bg` is **already** `#ffffff` at `:root`.
So the change is `--wsh-plate-radius: 0px`, the ref's more-lifted `--wsh-plate-sh`, and one rule for
the sage edge.

**⚠️ The sage edge is scoped `:not(.wsh--scrolled)`, and that is load-bearing rather than tidy.**
This page scrolls (its grid takes no `fill` prop), so the plate condenses to a bare strip on
engagement — `.wsh--scrolled` deletes the border, radius and shadow precisely so what remains reads
as the page's own top edge. My selector is 0-2-0 against that rule's 0-1-0, so **without the
negation the sage edge would outrank `border-color: transparent` and survive into the working
state**: the one piece of card treatment that refused to leave. Scoping it to rest keeps the
collapse-on-engagement law intact instead of quietly winning against it.

### Measured at 1440×900 (scrollbar 0px, overlay)

| Claim | Measured |
|---|---|
| Header top border | **5px**, `rgb(154, 168, 150)` = `#9aa896` ✓ |
| Header corners square | `border-top-left-radius: 0px` ✓ |
| Header fill white | `rgb(255, 255, 255)` ✓ |
| Grid columns | `300px 654px`, `column-gap: 26px` ✓ |
| Rail width | **300px** exactly ✓ |
| Panels | 3 — `Materials`, `Packages`, `Tracking`, each 300px, each white ✓ |
| Tab strip present | **false** ✓ (D1) |
| Filled controls **inside `.pkg-root`** | **1** — `New package`, `rgb(245, 226, 218)` ✓ (D5) |

The filled-control count reaching 1 at Phase 1 is partly a side effect worth naming: the three pink
`＋ Add a query letter / synopsis / sample pages` buttons in the old empty state are pink, and they
are no longer on this surface because the overview replaced it. They still exist inside the
Workshop, which is where they belong.

Screenshot: `reports/pkg-restructure/p1-shell-1440.png`.

### F6 — the header card does not align with the body, and it did not before either

Measured: plate content **770px** wide, body content **980px**, plate inset a further 105px each
side. It is visible in both the recon and Phase 1 screenshots. Fully explained, and **neither term
is mine**:

* `.wpg-plate { padding-inline: calc(var(--content-gutter) + var(--header-inset)) }` — 80 + **120**.
  The 120 is the shell's standing "masthead is an inset island" law, applied on all nine workspace
  pages.
* `.wpg-scroll { scrollbar-gutter: stable both-edges }` — **15px each side** on this machine's
  forced classic scrollbars, and **0 on overlay scrollbars**, which is what Nick's browser uses.

So the gap is `120px` constant plus a scrollbar-dependent `15px`. CLAUDE.md documents the one-line
fix (`--header-inset: 0` page-scoped, as Query Centre once did) — and **I have not applied it**,
deliberately. The ref draws a standalone canvas with no shell, so it cannot speak to a law that
governs eight other pages; making this page the only one whose masthead is full-width is a
consistency decision that belongs to Nick, not a defect to fix inside a restructure. Flagged with
the numbers so the call can be made in one line either way.

Note the second term is the harness's known blind spot pointing at something real: the 15px exists
**only** under classic scrollbars, so the misalignment Nick sees will be 120px each side, not 135.

### Phase 1 gates

| Gate | Baseline | Phase 1 | Verdict |
|---|---|---|---|
| `tsc --noEmit` | exit 0, clean | **exit 0, clean** | no worse |
| `vite build` | exit 0, no diagnostics | **exit 0, no diagnostics** | no worse |
| `vitest run` (full) | 1 file / 1 test failed | 1 file / 1 test failed | no worse |

**⚠️ The full-suite failure is a TIMEOUT under machine contention, not an assertion — and the
distinction matters, because a raw count would have read as "same as baseline" for the wrong
reason.** The three concurrent streams turned a 48s suite into a 230s one, and slow source-reading
guards started hitting the 120s per-test ceiling:

* **Baseline** failed `src/components/todo/tasksViewport.test.tsx` on a **real assertion** (the
  to-do stream's WIP). Suite duration **48.40s**.
* **Phase 1** failed `src/test/pageStructure.test.ts > components/Queries.tsx …` with
  `Error: Test timed out in 120000ms`, alongside a `[vitest-worker]: Timeout calling "onTaskUpdate"`
  unhandled error. Suite duration **230.56s** — 4.8× baseline. `Queries.tsx` is a file this work
  never touches, and the suite **passes in isolation**.
* An intermediate run failed *three* files, all different ones, and I discarded it rather than
  reporting it: I had edited files while it was running, which is exactly the pollution that makes
  a gate meaningless. It is recorded here rather than quietly dropped.
* `tasksViewport.test.tsx` **passes now** — the other stream fixed it mid-session. The tree is live,
  so a baseline is a snapshot, not a constant.

Because a contended full suite cannot distinguish "my change broke it" from "the machine was busy",
the load-bearing evidence is a **targeted run of every suite that covers a file I touched**, on a
quiet machine:

```
src/test/pageStructure.test.ts            src/components/materialsPageSmoke.test.tsx
src/components/shell/workspacePageGrid.test.ts(x)  src/components/shell/pageHeader.test.tsx
src/lib/packagesOverview.test.ts          src/components/packages/workshopEmpty.test.tsx
→ 6 files, 133 tests, ALL PASSING (36.65s)
```

That includes `materialsPageSmoke`, which asserts `wsh-title">Submission packages` — the smoke that
would catch this page failing to render at all.

---

## Phase 2 — Rail

**What shipped:** three registers rendering real, manuscript-scoped, derived data; dashed ghost
empty states (D6); `+ ADD` / `+ NEW` and every row wired to flows that already existed (R5).

### Derivations, and where they live

All in the new pure `src/lib/packagesOverview.ts`, unit-locked in `packagesOverview.test.ts`
(**29 tests**). Nothing is stored, and **no counting is re-implemented** — `sent`, `replies` and
`requests` all come from the locked `packageMetrics`, so the rail cannot disagree with the analytics
view it opens. That is the same reconciliation the dashboard and the To-do board needed after they
counted "urgent" two different ways.

| Rail line | Source |
|---|---|
| Type eyebrow | `TYPE_META[type].label` — never a literal. Resolves to **"Covering letter"** (UK copy) while the stored token stays `Query letter` |
| Material detail | `versionMeta()` word count + `agoLabel(daysBetween(…))` from the app's ONE elapsed formatter |
| Composition | the three slot ids → `versionName`, in `BUILDER_TYPES` order, via the existing `SLOT_FIELD` map |
| "Sent with N queries" | `packageMetrics(pkgId, queries).sent` |
| "N of M replied" | `.responses` of `.sent` |
| "N requests logged" | `isRequest` over the packaged queries |
| Tracking chip | replies summed across packages |

### Two honesty corrections against the ref's literal copy

Both are flagged rather than silent, and both are the *same* fault the Manuscripts plate already
had to be protected from — a plausible number stating something untrue.

1. **"added", not "edited".** `ManuscriptVersion` carries exactly one timestamp, `createdDate`.
   Rendering it under the ref's "edited 4 days ago" would label a created date as an edit.
2. **No "v3".** There is no version-number field; `versionName` is free text (the ref's own
   "Hook-first" is the name). An ordinal from creation order would be a number the writer never
   chose. The line carries only what is real.

Locked by tests that assert the *absence*: `detail` must contain "added", must not contain
"edited", and must not match `/\bv\d+\b/`.

### Measured — populated (real seeded data, read from the rendered DOM)

```
MATERIALS  chip 4   + ADD
  COVERING LETTER · Hook-first      · added 4 days ago
  COVERING LETTER · Comps-forward   · added 2 weeks ago
  SYNOPSIS        · One-page        · added 6 days ago
  SAMPLE PAGES    · Chapters 1-3    · ~520 words · added 9 days ago
PACKAGES   chip 2   + NEW
  Standard UK        Hook-first · One-page · Chapters 1-3     Sent with 6 queries
  Comps-led variant  Comps-forward · One-page · Chapters 1-3  Sent with 2 queries
TRACKING   chip "2 replies"
  Replies by package     Standard UK · 2 of 6 replied
  Requests by material   2 requests logged
```

> **Corrected after Phase 3, and the reason is worth keeping.** This block first read `3 replies` /
> `3 of 6 replied`. Both figures are derived, so neither was wrong when taken — the *fixture* moved
> underneath them. My seed writes Rejected queries without `hasAgentResponded`, and the app's own
> `recomputeQuery` heals that field once the page has loaded, at which point a rejection starts
> counting as a response. Between the two captures I ran `--clean` and re-seeded, which replaced the
> healed documents with fresh unhealed ones and took the count back down. The figures above are the
> re-measured, currently-true ones. **A seeded fixture is not settled until the app has run over
> it** — worth knowing before anyone quotes these numbers back.

Rail width **300px**. Screenshots: `p2-rail-populated-1440.png`, `p2-rail-empty-1440.png`.

### Measured — empty (first visit)

Chips read `0` / `0`; Tracking has **no chip at all** (never "0 replies"). The three ghosts render,
and the D6 distinction is confirmed **in the DOM, not by intent**:

| Panel | Element | Inert |
|---|---|---|
| Materials — "Add a material" | `BUTTON` | no |
| Packages — "Build a package" | `BUTTON` | no |
| Tracking — "Replies land here once a package goes out with a query." | **`DIV`** | **yes** |

Tracking's note is a `div`, not a disabled button: you make a reply arrive by sending a query, not
by pressing a panel, and a control that does nothing is worse than none.

### ⚠️ The filled-control probe was wrong, and I changed the measure rather than the design

The first Phase 2 reading was **`filledCount: 9`**, which looks like a D5 violation. It was not —
it was a fault in my probe. I had defined "filled" as *any button whose background is not
transparent*, and the register rows are `<button>` elements (so they are keyboard-reachable and
announced as controls) with a white fill. **The ref draws them that way too**: `.reg-row` has
`background: var(--white)` in the same file whose only filled button is `.btn.primary`. So
white-on-a-surface is what a row *is*, and counting surfaces as controls was the error.

The probe now excludes white and keeps its teeth — a second pink or ink button still trips it.
**Both readings are recorded rather than the old one being quietly dropped:**

* `filledCount: 1` — `New package`, `rgb(245, 226, 218)` (D5 satisfied)
* `anyNonTransparent: 9` — the eight white rows plus that one

I am flagging this because "the number came out wrong so I redefined the number" is exactly the
move that should be visible to a reviewer, not buried.

*(A smaller one, recorded for the same reason: the fixed probe initially reported nothing at all —
Playwright said `No tests found` because I had put backticks inside a template literal and closed
it. The stale artefact I read next still held the previous run's figures. It was caught, but it is
precisely how a stale number gets reported as fresh.)*

### The row seam

`+ ADD` and material rows needed a host-level seam the materials editor never had — packages
already had `newPackageSignal` / `openPackageId`, materials had nothing above `WorkshopTab`. Added
as that seam's exact mirror (`openMaterialsSignal`, `openMaterialId`, `onOpenedMaterial`), landing
on the same `enterMat` the band and the empty state already call. **No editor is duplicated and no
new editor is built**, per R5. Every row type has a real destination, so **no row is inert** and
D10's inert-row flag does not arise.

### The overview shows YOUR data, never the tour fixture

The host passes `msVersions` / `msPackages` / `msQueries`, **not** the `ws*` variables the Workshop
takes. Those swap to `EXAMPLE_*` while the guided tour runs — correct for the Workshop, which the
tour drives, and wrong here: a register quietly listing four invented materials is the page lying
about the writer's own work.

### Phase 2 gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | exit 0, clean |
| `vite build` | exit 0; whole log grepped — no diagnostics |
| Targeted suites (6 files covering every touched file) | **133 passed** |
| `packagesOverview.test.ts` | **29 passed** (new) |

### Seeding — additive, and a rules constraint forced the shape

`tests/e2e/seedPackages.mjs` is new: `seed.mjs` covers manuscripts, agents and queries but writes
every query with `packageId: ""`, and other measurements rely on that fixture. This script only
**adds** documents under its own `seed-pkg*` prefix, and `--clean` removes exactly what it wrote
(both states above were captured that way).

**⚠️ The packaged queries are CREATED, not updated, and that is a rules constraint rather than a
style choice** — which is what turned up F7.

---

## F7 — a live bug found while seeding: attaching a package to an existing query is silently denied

**Not introduced here, not fixed here** (`firestore.rules` is do-not-touch), and worth Nick's
attention because it is silent.

`packageId` is required by `isValidQuery` (line 282), so it must be present when a query is
**created**. It is **absent from the query UPDATE allowlist**:

```
allow update: … && incoming().diff(existing()).affectedKeys().hasOnly([
  'manuscriptId','dateSent','status','personalisationNotes','sendMethod', … 44 more …
])                                    ← no 'packageId'
```

`hasOnly` fails the **whole write** if any changed key is outside the list. So:

* Writing `packageId` with an **unchanged** value is fine — it is not in `affectedKeys()`.
* **Changing** it — attaching a package to an existing query, or detaching one — fails the rule and
  the entire update is rejected.

There is a live call site: `src/components/EditQueryDrawer.tsx:307` does
`Object.assign(queryFields, editMaterialsUpdate({ touched: true, packageId: effPackageId, … }))`,
and `editMaterialsUpdate` returns `{ packageId, materialsWanted }` by design (the "exactly one
source of truth" guard). Whenever a writer edits a query's materials **and the package link changes
in the process**, that save should be denied — taking the materials edit down with it, since it is
one write.

CLAUDE.md already records this failure family: *"client field writes must be in the rule's hasOnly()
allowlist or they're silently denied & can trap UI"*. It also anticipated this exact feature —
*"the future attach-to-query flow"* — so the gap is most likely simply that the allowlist was never
extended when the link was introduced.

**Proposed fix (one line, not applied):** add `'packageId'` to the query update allowlist, then
deploy dev rules per the Deployment section and confirm with `tests/e2e/rulesProbe.mjs`. Worth
confirming against prod's deployed vintage too, since the prod rules queue is already several
commits deep.

*How it surfaced:* my seed needed eight queries carrying a `packageId`. Updating `seed.mjs`'s
existing queries would have been denied, so the script creates its own — and the reason it had to
is this gap.

## F8 — D4's white substitution flattens the rail's row-on-panel step

Applied as instructed, flagged as a consequence rather than quietly deviated from.

In the ref the rail panel is parchment `#fdfaf5` and the register rows are white `#ffffff`, so a row
reads as a **card lying on** the panel. D4 names "rail panels" among the containers to substitute to
white — and `.reg-row` is *already* white in the ref, so applying D4 literally makes row and panel
the same colour. The rows now read as hairline-outlined boxes rather than cards; the hover shadow
and the 1px edge carry the separation, and in the screenshots it is legible.

Two one-line options if the step is wanted back, both for Nick rather than for me to pick:
give the rows `--pkg-card`, or return the panels to the ref's parchment. I have changed neither,
because D4 is a baked decision and this is a taste call sitting on top of it.

### Phase 2 — full suite

| | Baseline | Phase 1 | **Phase 2** |
|---|---|---|---|
| Test files | 1 failed / 328 passed | 1 failed / 330 passed | **0 failed / 331 passed** |
| Tests | 1 failed / 5556 passed | 1 failed / 5613 passed | **0 failed / 5614 passed** |
| Duration | 48s | 231s | 111s |

**Zero test failures — strictly better than baseline**, which carried a real one. The command still
reports `VITEST_EXIT=1`, and the reason is worth stating rather than hiding behind a green count:
vitest exits non-zero on the `[vitest-worker]: Timeout calling "onTaskUpdate"` unhandled error, an
RPC timeout between the runner and a worker under the same contention that has been inflating these
durations all evening. It is an infrastructure error, not an assertion — no test failed.

---

## Phase 3 — Stage

**What shipped:** the problem-statement card, the how-it-works head, and three step cards whose
progress is derived (D3). Illustration plates ship as placeholders (D8). The old `.pkgw-strip` is
retired from this page.

### Copy is the ref's, verbatim (D7) — verified by reading it back off the page

```
"Fed up of guessing which materials are landing with agents?"          (Caveat, cursive)
"Every package keeps its own scorecard. ScriptAlly records which letter, synopsis and
 pages went to each agent — so the answer sits on the page, not in your head."
"How it works" · "Three steps"
"Add your materials" · "Arrange them into packages" · "Track what comes back"
```

No verdict words: step 3 reads *"reported, not guessed"* — the app reports, the writer decides.

### The strip is retired, not duplicated

`.pkgw-strip` carried the scorecard sentence as a thin band above the tab row. The ref promotes that
same sentence to the stage's opening card, so keeping both would state the page's one argument twice
a few pixels apart. It is removed from the render; its CSS stays, because the DEV `#/pkg-lab` route
still draws it — **verified, not assumed**: `PkgLab.tsx:124` contains `.pkgw-strip`. Measured
`stripPresent: false` on the live page.

### Measured at TWO widths — because one width is a coincidence

| | 1440×900 | 1920×1200 |
|---|---|---|
| Stage width | 654 | 1134 |
| Step widths | **206 · 206 · 206** | **366 · 366 · 366** |
| Equal | ✓ | ✓ |
| Plate heights | **150 · 150 · 150** | **150 · 150 · 150** |
| Plate SVGs / `ILLUSTRATION` labels | 3 / 3 | 3 / 3 |
| Ticks | `✓ 4 ADDED` · `✓ 2 BUILT` · `● LIVE` | same |
| `pkgo-step--live` | step 3 only | step 3 only |
| `.pkgw-strip` present | false | false |

**Plate height is exactly the ref's 150px at both widths** — inside the ±2px the phase asked for,
with nothing to round.

**On the "1240px canvas" the phase specified:** the ref is a standalone canvas capped at 1240px, but
inside the app the content column is 1170 at a 1440 viewport, so the stage is narrower than the
ref's and the step cards *cannot* be the ref's absolute width. What is portable is the ref's actual
rule — three equal tracks and a 150px plate — and that is what is asserted, at two widths. At 1920
the stage reaches 1134, which is the closest this shell gets to the ref's canvas.

**⚠️ `repeat(3, minmax(0, 1fr))`, not `repeat(3, 1fr)`.** A bare `1fr` carries an `auto` minimum, so
the widest step's content would set its own track and the three would stop being equal — the very
property being measured. The zero minimum makes equality a property of the grid rather than a
coincidence of the copy. (`auto-fit` with a zero minimum is the opposite trap and is deliberately
avoided: it is what resolved a stat block to two real tracks followed by a hundred phantom `0px`
ones and rendered correctly only by luck.)

**⚠️ The on-screen guard fired at 1440 and that is correct behaviour, not a failure.** The probe
records `onScreen: [false, false, false]` there — the step cards sit below the fold in a 900px
viewport — and `[true, true, true]` at 1920. The width and height readings stand either way
(`getBoundingClientRect` is defined off-screen; it is `elementsFromPoint` that silently returns an
empty array and satisfies a naive assertion by measuring nothing). The guard is in the probe so that
any *coordinate* claim added later cannot be made about a box the browser never looked at.

### Phase 3 gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | exit 0, clean |
| `vite build` | exit 0; whole log grepped — no diagnostics |
| Targeted suites (6 files) | **133 passed** |

Screenshots: `p3-stage-1440.png`, `p3-stage-1920.png`.

**Incidental, and it resolves F5:** at 1920 the `PRO` pill is visible beside the title. The clipped
heading is a 1440-only symptom of the same 770px plate width recorded in F6 — the title, the Pro
pill, the manuscript chip and the primary button share a plate that is 210px narrower than the body
beneath it. If F6 is taken, F5 goes with it.

**Phase 3 full suite: `VITEST_EXIT=0` — 331/331 files, 5614 tests, zero failures, and no unhandled
worker error this time.** The cleanest run of the session, and the first with a genuinely green exit
code; the contention that produced the RPC timeouts in Phases 1–2 had eased.
