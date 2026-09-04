# Query Centre rebuild — run report

Status: **Step 0 complete. Build not started — one decision is blocking Phases 3(b)/4/6.**

---

## False premises in the brief

The brief describes a Query Centre that has not existed for some time. Five corrections, the
first of which is the blocking one.

### 1. ⚠️ The grid is not a plain page. It is a `WorkspacePageGrid` with a **record mode** — and
### that mode was added this week by the masthead pack I have been told not to supersede.

The brief assumed `/queries` was an ordinary page onto which a panel could be dropped. It is
not: it is one page with two *layouts*, switched by a prop, and the second layout is a
first-class mode of the shared grid component.

`/queries` renders one component (`Queries.tsx`, 7,297 lines) whose layout is derived from a
single prop: `view: "cards" | "detail"`, which `App.tsx:658` computes as
`params.has("q") ? "detail" : "cards"`. There is no second route and no second component.

The two layouts are already exactly the two the brief names:

| Brief's name | What it actually is |
|---|---|
| "card gallery" | `.qc-cards` (`Queries.tsx:4666`) — the browsing grid |
| "Outlook-style manager" | `.f12-body` — the two-pane list + reading pane |

**The conflict.** `WorkspacePageGrid` receives `fill={!!activeQuery}` and
`record={activeQuery ? {...} : undefined}` (`Queries.tsx:4204-4210`). Those two props are the
masthead pack's, added in this week's `compact header §1–§3` commits, and Query Centre is one of
only two consumers of `record` (the other is `AllManuscripts.tsx:364`). The file's own comment
at :4187 calls this "the whole of the two-view change" and explains at length why the detail
surface must be `fill` and why `barOnly` gives it "identity in 46px instead of a third of the
working area saying a name nothing else states."

The design ref draws the detail as a **fixed right-hand slide-over** over a permanent grid —
`.panel{position:fixed;top:0;right:0;bottom:0;width:580px;transform:translateX(102%)}` with a
scrim, `query-centre.html:171`. Building that makes `fill` permanently false and `record`
permanently undefined on this page, which deletes the masthead pack's work here.

**These two cannot both be honoured. See "Decision needed" below.**

### 2. There is no "Log a query" page to retire.
It is inline create mode inside the same Queries component, reached through
`onNavigate("queries", "Log a query", { agentId?, manuscriptId? })` — a seam with **eight live
call sites** (Discover, Search palette, rail `+ Query`, Agent list, Agent card, To-do empty
state, Packages tracking band, and the masthead primary). It is already a stepped form:
`QueryCreatePane.tsx` (41 KB) + `StepStack.tsx` + `queryDraft.ts`. Phase 5 is therefore a
re-dress of an existing stepped form, not a build, and §5.10's `#/queries/new?agent=:id` would
be a *ninth* mechanism competing with the eight-site seam rather than replacing it.

### 3. The expected-reply override already exists, and `types.ts` needs no addition.
`src/lib/expectedDate.ts` owns `WRITER_EXPECTED_FIELD = "writerExpectedDate"` plus
`writerExpectedSetAt`, and `resolveExpectedDate()` already composes writer / agent / reply and
**already prefers the writer's**. Phase 1's "extend `expectedDate.ts` to prefer the override" is
done. The one permitted `types.ts` addition is not needed.

### 4. `createAgent` is called `addAgent`.
A db-context method (`db.tsx:2006`), not a module export. `editActivity` / `deleteActivity` /
`deleteActivities` are likewise context methods (`db.tsx:3382 / 3330 / 3174`), not exports —
0.8's "missing primitive" red gate would have fired on a `grep export` alone. All present.

### 5. The reusable sample control is richer than the brief assumes.
`SampleSpecPicker` carries a `purpose: "wanted" | "sent"` distinction — an agency may ask "three
chapters *or* fifty pages" (multi-unit), but what you put in an envelope is one parcel measured
one way (single-unit, enforced). Phase 5.5 records what was **sent**, so it must pass
`purpose="sent"`; the brief does not mention the prop.

---

## Step 0 — recon

### Red gates: none fired.

| Gate | Result |
|---|---|
| 0.2 `recomputeQuery` exposes expected reply / `expectedDate.ts` extensible | **Clear** — and already implements the override |
| 0.5 Reusable unit-aware sample control | **Clear** — `SampleSpecPicker` |
| 0.9 Single "Query sent" activity primitive | **Clear** — `addQuery` |
| 0.4 / 0.7 / 0.8 primitives | **Clear** — all found |

### 0.1 Routes and components
- `/queries` → `Queries.tsx` (`App.tsx:700`), `view` derived from `?q=`; `?q=<id>` = detail.
- `/queries/analytics` → `QueryAnalytics.tsx`, a separate `StagePage`.
- Deep links in: `analytics/openInQueryCentre.ts` (the one adapter Analytics owns),
  `lib/queriesFilterParam.ts` (`QUERIES_STATUS_PARAM`), NavSearch `?q=` deep-selection.
- Create-mode entry: the eight sites listed under false premise 2.

### 0.2 Derived state
`RecomputedFields` (`recomputeQuery.ts:65`) = `status`, `partialRequestedDate`,
`partialSentDate`, `fullRequestedDate`, `fullSentDate`, `revisionRound`, `hasAgentResponded`,
`responseReceivedAt`, `rejectedDate`, `lastStatusChange` — ten fields, the single writer.
Expected reply is **not** among them; it is resolved at read time by
`resolveExpectedDate()` returning `{ source: "writer" | "agent" | "reply" | null }`, and `null`
is a deliberate answer ("nobody has stated one") rather than a default.

### 0.3 Nudge
`lib/logNudge.ts` — `reconcileNudge(remaining)` → `{ nudgeDate, lastNudgeSentDate, hasNudges }`.
Create-time reminder: `queryDraft.ts:270` writes `nudgeDate` from the draft's reminder, absent
when the writer declined. `NUDGE_SENT` is a non-status activity, invisible to `recomputeQuery`.

### 0.4 Chassis and Form 11
`StatusDot.tsx` · `MountCard.tsx` · `MountPanel.tsx` · `forms/BrandDropdown.tsx` ·
`forms/BrandDatePicker.tsx` (`.sa-dp`) · `forms/SegmentedToggle.tsx` · `forms/FormShell.tsx`.

### 0.5 Sample control
`components/materials/SampleSpecPicker.tsx` — props `{ rows, onChange, join: "or"|"and",
purpose?: "wanted"|"sent", hideSummary? }`. Physics from `agentMaterials.ts` `UNIT_CFG`
(Chapters 1/1/3 · Pages 5/1/10 · Words 500/500/5000), capped by `MAT_QTY`.

### 0.6 Materials
`Query.materialsWanted?: (string | QueryMaterial)[]` — a backward-compatible union; every reader
must route through `formatQueryMaterial()`. `PACKAGE_MATERIALS` / `MATERIAL_LABEL` in
`manuscriptPackages.ts`; `STRIPPED_PILLS = ["Author bio", "Full manuscript"]` stripped on write
(`agentMaterials.ts:284/356`). `Query.packageId` links the active `SubmissionPackage`.

### 0.7 Agent creation
`addAgent` (`db.tsx:2006`), `Omit<Agent, "id"|"userId"|"dateAdded"|"lastCheckedDate">`.

### 0.8 Correction / toast / menu
`useTodoToast` (`todo/useTodoToast.ts`) · `PortalMenu` (`todo/PortalMenu.tsx`) ·
`CorrectionFork` (`reading-pane/CorrectionSheet.tsx`) · `computeRecomputedFields`
(`recomputeQuery.ts`) · `editActivity`/`deleteActivity`/`deleteActivities` (db context).

### 0.9 Query-sent primitive
`addQuery` writes the query doc, appends one `ActivityType.QUERY_SENT` activity, then calls
`recomputeQueryOnline` to derive. It no longer seeds `responseDeadline` (provenance pack §1).

### 0.10 Themes
`design-refs/themes.md` present (112 KB). Cappuccino only in scope.

### 0.11 Harness
`tests/e2e/` — 364 files, `*.measure.ts` convention, `npm run e2e`.
⚠️ `SA_E2E_BASE_URL` is **required** and throws when unset.

### 0.12 Baseline (tree clean under `src/` before running)

| Gate | Result |
|---|---|
| `tsc --noEmit` | **0 errors** |
| `vite build` | **clean** — no `error` / `[WARNING]` in the full log |
| `vitest run` | **2 failed · 7374 passed · 3 skipped (7379)** |

The two reds are **not mine** and predate this run:
- `src/lib/datePickerHub.test.tsx` — nudge picker floor, `sa-dp-day off` absent.
- `src/components/todo/calendarTokens.test.ts` — `.tl-todayline` declared twice. This belongs to
  the calendar stream whose uncommitted `timeline-v62.html` is in the tree.

"No worse than baseline" therefore means: tsc 0, build clean, **exactly these two** vitest reds.

---

## Phase 0 — design refs committed

`7df890c6` — five files, all five SHA256s verified against the brief's table **before** copying.
All matched.

`design-refs/.refhashes.json` was deliberately **not** touched. The manifest is a curated
watchlist and enrolling these five would be right — but another session holds an uncommitted
enrolment of `timeline-v62.html` in that same file, and rewriting it would commit their work
under my message. **Follow-up: enrol the five refs once that session's line has landed.**

---

## Decision taken — Nick, this run

**The slide-over is the design.** Build the ref's panel; on Queries pass **neither** `fill` nor
`record`. `record` support stays in `WorkspacePageGrid` for `AllManuscripts`, its remaining
consumer. Nick's reasoning: the record bar would state the same name twice, once behind a scrim;
keeping the two-pane view abandons the point of the run; keeping a record bar over a panel keeps
a mode of the page that has nothing to do.

### Checked as instructed: does `record` mode own the breadcrumb or the back link? **No.**

`record`'s entire reach is inside the grid's own 46px bar — `.wpg--record` on the root,
`.wpg-bar--record` on the bar, `wpg-barback` (the back button), `wpg-barwho` (the record's
title), the optional `within` pager, and the `barOnly` implication that suppresses the masthead
(`WorkspacePageGrid.tsx:286, 591, 629-643, 694`). It touches nothing else.

**The breadcrumb is a different surface and always has been.** It is drawn by the shell from
`shellCrumbForPath(pathname)` (`shellV2Nav.ts:195`) — pathname only, so `?q=` is invisible to
it. It reads `Queries / Query Centre` whether or not a query is open, and has never named the
record. The `record` prop's own doc comment says so in as many words: the bar omits the page
name because "the reader can already see [it] in the breadcrumb."

**So the panel owes the crumb nothing, and giving it something would be the bug.** With the
slide-over the page underneath genuinely *is* Query Centre — the panel is an overlay on it, not
a navigation away from it — so a masthead reading "Query Centre" and a crumb reading
`Queries / Query Centre` are both correct. Renaming the crumb to the open query would be a
second answer to "where am I" for a state that never left.

⚠️ **The one live risk this did surface** is z-order, not the crumb. The ref puts the scrim at
`z-index: 60` and the panel at `70`; this app's ladder is rail 40 · drawer 45/46 · modals 50 ·
**dropdowns 60**. Taken literally the panel would sit above its own Form 11 menus, which open
through `useFixedMenu`. Phase 4 must pick app-appropriate levels and prove a dropdown inside the
panel still renders above it. Recorded here so it is not discovered as a bug later.

⚠️ **And if the panel ever needs a trail of its own**, the precedent exists and must be reused
rather than hand-written: `journeyCrumb(pathname, act)` (`shellV2Nav.ts:217`), built for the
modal sheet whose real crumb is behind a scrim. Its rule — the act is *appended*, never
substituted — would apply. The ref's panel draws no crumb, so nothing is built for it now.

---

## Build log

| Phase | Commit | Files | Gate (tsc · build · vitest) |
|---|---|---|---|
| 0 · design refs | `7df890c6` | 5 | — (docs only) |
| 1 · tokens + `cardFacts` | `ef0a7908` | 5 | 0 · clean · 1 red / 7395 passed |
| 2 · `QueryCard` | `ba5fbf36` | 3 | 0 · clean · 1 red / 7412 passed |
| 3a · grid core + FLIP | `7f0d5e69` | 4 | 0 · clean · 1 red / 7437 passed |
| 3a+ · `turnFor` ↔ `queryBucket` | `16e47062` | 1 | 0 · clean · 1 red / 7440 passed |
| 3b · the grid mounted | `5a202c36` | 4 | 0 · clean · 1 red / 7449 passed |
| 3c · the Group control | `68659b84` | 2 | 0 · clean · 1 red / 7441 passed |

⚠️ **The total FALLS between 3b and 3c (7453 → 7445) and none of it is mine.** Another session is
mid-swap of the manuscript carousel and holds staged deletions in the shared index; `carouselDeck.
test.ts` and `manuscriptCarouselTokens.test.ts` went with them. +4 mine, −12 theirs. Established
by reading `git status`, not by moving anything, and every commit here is scoped with `--only` so
their staged deletions are still staged and uncommitted.

**Baseline was 2 vitest reds; it is 1.** `calendarTokens` went green with another session's
`calendar: v62` (`0c12bf61`), and `queryCentreMoment` was repaired in §1. The survivor —
`datePickerHub.test.tsx`, the nudge picker's floor — is another stream's and untouched.

### Mutations proved red

Every assertion in every phase was made to fail on purpose before its green was trusted; a green
nobody has watched fail is worth nothing. **58 mutations, 58 caught** — but two of those were
caught only *after* the mutation exposed the assertion as vacuous, and those are the two worth
reading:

- **§2, the ghost's `aria-hidden`.** The case read `expect(html).toContain('aria-hidden="true"')`
  and every card's monogram chip carries that attribute — so a ghost that lost its own still
  passed. It reads the root's opening tag now. The case was green, the component was correct, and
  the claim was about a different element.
- **§1, the §5 stylesheet lock.** Not vacuous but over-broad: `css.slice(from)` with no end anchor
  ran to end of file, so "§5 states no colour" had been asserted over ~750 unrelated lines and
  passed because none of them held a hex.

### Deviations from the brief, and why

| Brief said | Built | Why |
|---|---|---|
| `useFlipGrid(ids)` hook | Adopted `lib/flip.ts` + two additive options | The helper exists and already enforces settle-before-measure. A parallel one is what the repo's own rules forbid. |
| Extend `expectedDate.ts` to prefer the override | Nothing | It already does (false premise 3). |
| Add the override field to `types.ts` | Nothing | `writerExpectedDate` exists. |
| `CardMaterials` keyed `{letter, …}` | Keyed by `MaterialKind` | It is what `classifyQueryMaterial` returns, so there is no translation table to drift. |
| Tokens on a Cappuccino module | `.t-f12` | Nothing declares `.t-capp .t-f12`; theme-scoping them would have painted nothing in two themes. |


---

## Open questions for Nick

### 1. Is an open Offer "closed"? Two surfaces already disagree, and the grid picks a side.

`queryBucket` — the CTA engine's split, read by `getPrimaryAction`, the existing filter pills,
`queriesPulse`, the To-do board and Analytics — files **Offer** under `closed`. The agent list
does not: its own law says *"terminal is exactly Rejected/Withdrawn/No Response, so Offer counts as
ACTIVE"*. The ref gives Offers their own quick filter and their own band, so the grid now agrees
with the agent list and not with `queryBucket`.

**The consequence, stated so nobody reconciles two numbers by hand later:** the grid's "Closed"
pill is `queryBucket("closed")` **minus the offers**. `queryCardFacts.test.ts` locks the divergence
as exactly `[Offer]`, so a second one cannot appear quietly — but whether `queryBucket` should
change is a product call, not a refactor, and it would move figures on four other surfaces.

### 2. The quick pills and the Filter popover's "Whose turn" radio are now two controls over one state.

They share `turnFilter` deliberately — two states would be worse. But the browsing grid shows five
pills and the detail popover shows three radio rows for the same field, so choosing "Offers" in
the grid leaves that popover showing none of its three selected. Reconciling them belongs with
Phase 4, when the detail view stops being a page layout and becomes a panel.

### 3. `/api/waitlist`-style caveat: none of this is measured on a rendered page yet.

Everything above is **code + unit verification**. Phase 7's Playwright pass is what turns it into a
layout claim, and this repo has an audit about the difference. Nothing here should be described as
"landed on the page" until that runs.

---

## NOT RUN, and why

| Phase | State |
|---|---|
| 4 · detail slide-over | **Not started.** Decision taken (build the ref's panel; drop `fill`/`record` on Queries). ⚠️ Its first blocker is z-order — see the note in "Decision taken". |
| 5 · Log-a-query slide-over | **Not started.** Note false premise 2: this is a re-dress of the existing `QueryCreatePane` + `StepStack`, not a build, and §5.10's `#/queries/new` would be a ninth mechanism beside an eight-site seam. |
| 6 · Wiring + retirement | **Not started**, and deliberately last — it deletes components. |
| 7 · Measurement pass | **Not run.** Needs `SA_E2E_BASE_URL` (required; the harness throws when unset) and a built bundle newer than `src/`. ⚠️ In a measurement worktree the build gate is `npm run build:dev` — running the production build there overwrites the dev bundle the preview server is serving, and the measurements then silently run against prod. |

### Handover notes for whoever runs Phase 4

- `record`'s whole reach is `WorkspacePageGrid.tsx:286, 591, 629-643, 694`. Remove both props from
  `Queries.tsx:4204-4210`; leave the prop in the grid for `AllManuscripts.tsx:364`.
- The crumb needs **nothing** — see "Checked as instructed" above. If the panel ever wants its own
  trail, reuse `journeyCrumb(pathname, act)`; do not hand-write one.
- The panel will contain Form 11 dropdowns, which open through `useFixedMenu`. The ref's
  `z-index: 60/70` sits above this app's dropdown tier; pick app-appropriate levels and **prove a
  dropdown inside the panel renders above it**.
- ⚠️ `Queries.tsx` keeps every page mounted and three pages share `tpl-wpg`. Any new probe must
  select the VISIBLE grid by measuring height, not `.first()`.
