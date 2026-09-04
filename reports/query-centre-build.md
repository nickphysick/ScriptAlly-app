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

---

## Correction pass 1 — spacing and sizing, measured against the ref

### ⚠️ False premise in the prompt: no global rule reaches the card

The prompt expected *"global type/layout rules that the ref's scoped CSS does not [inherit] —
specifically a heading scale"*, and instructed scoping the card's type rather than editing the
global rule. **Measured, there is nothing to scope against.**

- **Not one `font-size` differed** anywhere in the probe. No `h3`/`h4`/`.playfair` rule reaches the
  card. Step 1's item 3 had nothing to fix.
- **Every `display` mismatch attributed to `(no rule — initial/inherited default)`** via
  `CSS.getMatchedStylesForNode`. Nothing was overriding anything.

The real cause was mine and one level simpler: **the card's root is a `<button>`, which may not
contain block content, so every part of it is authored as a `<span>` — and `<span>`'s initial
`display` is `inline`.** My stylesheet declared `display` on none of ten boxes. The ref uses
`<div>`s and gets block for free. The fix is ten declarations; nothing global is touched and no
`!important` was used.

### What was actually broken, in geometry

| claim | before | after | ref |
|---|---|---|---|
| agency below the name | **8px** — same line | 30px | 27px |
| leaf day below the month | **−15px** — day above month | 18.9px | 18px |
| name box width | 122px (inline shrink-wrap, so `text-overflow` applied to nothing) | 376px | 279px |

### Three measurements that decided values a rule could not

1. **Playfair Display has old-style figures.** `0123456789` at 19px, `line-height: 1`: 26px of ink
   in a 19px box, **3px below**. So the ref's tight leaf-day value IS the construction the house law
   forbids — and is nonetheless safe here, because the day's `padding: 6px 0 5px` absorbs the spill
   inside a leaf that clips. Matched the ref, and recorded a warning against tightening that padding.
2. **The ref's name line-height crops.** At `1.15` the ink of `Jorge Pippa Guy qy` spills **+2px
   below** a box that clips (`overflow: hidden`, no vertical padding). At `1.3`, **0**. Kept 1.3 —
   now on evidence rather than on citation, and locked as *the name does not crop* so a future
   retune passes if it is safe.
3. **`PillTrig` is icon-only by decision** (36px since v5 P1, "the word in the title, the
   aria-label and the popover's own header"). The prompt's item 8 called the lone icon wrong, and
   it was — but because it sat alone in a row of courts, not because it lacked a label.

### Two faults in my own probe, both caught by mutation

- **The chips row was reported missing on a page with no active filter** — a statement about the
  fixture, not the page. It now sets a filter, reads, and puts it back; the row is present with 2
  controls.
- **The name-crop assertion measured a synthetic probe span, not `.qcc-nm`.** Reverting the card to
  the ref's 1.15 left it **green**. That is the "test the wrong artefact" fault, and only aiming a
  mutation at it found it. It reads the real element now.
- Also: the first toolbar probe reported Filter/Group/Sort present at `top: 0` — the hidden-page
  trap, since every workspace page stays mounted. Scoped to the visible `.wpg`.

### Result

3 property diffs remain, all three named deliberate deviations; everything else is an identical
string or within 1px. Widths differ only by column count (2 at 1280/1440, 4 at 1920/2560), which is
`auto-fill` working against a content column narrower than the ref's standalone page — **not** a
fault, and `minmax` must not be widened to force three.

Proved red: 4 mutations — name/agency losing `display: block`, the leaf children losing it, the
body losing it, and the name reverted to the ref's 1.15. All caught, the last only after the probe
was repaired.

Gate (isolated worktree, this pass's files on clean `HEAD`): **tsc 0 · build:dev clean · vitest 1
failed / 7462 passed**. The red is `datePickerHub`, another stream's, unchanged since baseline.
`functions/src/email.test.ts` fails to COLLECT in the worktree only — it lacks
`functions/node_modules`; it passes 9/9 in the primary tree.

---

## Correction pass 2 — the stage ladder, the 1480 cap, and a rulesheet that does not exist

### ⚠️ False premises, at the top as asked

1. **`design-refs/query-tint-ladder.md` is not on this machine.** Searched Downloads, Desktop,
   Documents and `/tmp`, by name and by pattern. The brief names it as superseding every band
   colour. §4 was built from the ref's own `:root` and its status→stage map at line 618 — the
   project's standing authority — so the missing document cost the RATIONALE, not the values.
   **Anything it says beyond them is unknown to this pass.** The commit is 1 file, not 2.
2. **There is no `togglePop` in the ref, and nothing toggles `edge`.** `edge` occurs once in the
   whole file: the CSS rule at line 66. The ref declares the treatment and never applies it.
3. **§5's leafless cards do not exist on this build.** 54 of 54 carry a leaf; there is exactly one
   distinct card height. `Daniel O'Rourke` and `Marcus Reed` are the REF's fixtures, and the ref
   renders its leaf unconditionally too. Almost certainly the pre-pass-1 build, where the leaf's
   inline children collapsed it to 28px against the ref's 64 — present in the DOM and absent to
   look at. Fixed by pass 1; now guarded both ways.
4. **The updated ref was in Downloads as `query-centre (1).html`.** The plain name still held the
   pass-1 file. Hash verified before copying.

### What was real, and what it cost

| § | finding |
|---|---|
| 1 | The rows were **uncapped** — 1660px at 2560 — and the track floor was 380. Now one wrapping column at 1480 that all five rows share, and the ref's 340 floor. 3 columns at 1440, 4 at 2560. |
| 2 | Search was `flex: 1 1 0%`, measuring **962px at 1440 and 1522px at 2560**. Now `0 0 260px`, scoped to the browsing column. |
| 3 | Portal: **already true**, no change. Overflow: real — Group's panel at `right: 1388` against vw 1280. Filter gained the three missing facets (24 → 41 rows). |
| 4 | Bands painted a gradient **image over a transparent colour**. Now flat `background-color`, matching the ref rung for rung. |
| 5 | Nothing to fix; a guard added so it cannot regress. |

### Two things worth carrying forward

**The edge rule cannot be proved red, and that is reported as unproved rather than as safe.** §1 and
§2 between them cured the overflow structurally — the trio now sits far enough left that no popover
runs off the screen whatever its alignment does, even at 1024 where all three triggers cross the
midline. The rule is correct and cheap and stays; it is simply unfalsifiable in this layout now.

**Dead code from my own §3a was mounted.** `GridFilters` / `matchesGridFilters` / `emptyGridFilters`
were written and unit-locked in `7f0d5e69` and rendered nowhere. That is the fault this repo has an
audit about, committed by me, and the Filter facets are where they belong now.

### Open for Nick

**1280 renders 2 columns, not 3.** The app's content column is 1010px there against the ref's 1208 —
198px narrower, because of the rail. `auto-fill` with the ref's own 340px floor fits two. Three
would need the floor at ≤323px, i.e. overriding a value the ref states in order to compensate for
the rail. Flagged rather than changed; one line if wanted.

---

## Correction pass 2 · addendum — the 320 floor, and the rulesheet audited

The floor moved in the **ref** (`6f790958` — one line in 107,778 bytes, verified) and the code
follows it. Pass 2 declined to lower it because the ref stated 340; the authority moved first, so
this is following rather than compensating.

**1280 now renders 3 columns** (≈323px cards), and 1440 / 1920 / 2560 are unchanged at 3 / 4 / 4.
⚠️ The ref and the build now disagree at 1440 — the ref's 1368px page fits four where the app's
1170px column fits three — and that is the rail again, not a fault.

### `query-tint-ladder.md` audited: every value matches, two surfaces do not

The rulesheet arrived after pass 2 had built §4 from the ref's own code. **All eight tokens, the
mapping, the hairline, the band type and the 24px StatusDot match what shipped** — including two
rows the ref could not have supplied (a requested-but-unsent parcel takes the step it was requested
at; a decided offer becomes closed).

Two contradictions, both on the **record view**, which this pass does not touch:

- **"Detail panel header band — same token as the card that opened it" is not implemented.**
  Measured: opening a card reaches the record view and **nothing inside it paints a ladder token**
  (`stageTokenUsersInRecord: 0`), and no state-tinted header band exists to carry one. Phase 4
  replaces that surface with the slide-over and should close this rather than inherit it.
- **The record list's selected row is a pink FILL (`rgb(247, 227, 221)`) that is not a ladder
  token.** The sheet says *"Selection is a 1.5px #e8c8bc ring, not a fill"*. The card obeys that;
  the list row predates it. Needs Nick's ruling — item 5 only claims rows *"that encode state"*, and
  a selection tint arguably encodes selection.

Also flagged: the sheet maps **"Offer accepted or declined → closed"**, and `QueryStatus` has no
accepted/declined member. Not a contradiction — a distinction the sheet assumes and the data does
not carry.
