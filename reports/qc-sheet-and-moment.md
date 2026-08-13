# Query Centre — the rest state, the sheet, and the moment

Refs: `design-refs/93-rest-final.html` · `92-both-sheets.html` · `91-sheet-lift.html` (shadow only).
Commits `fa38b7a` → `5114bef`, interleaved with another stream's comps work. **Not deployed, not pushed.**

---

## 0 · Gates, baseline and final

| | tsc | `vite build` | Vitest |
|---|---|---|---|
| **Baseline** (before any edit) | pass | pass | **4397 passed / 1 failed / 2 skipped**, 265 of 266 files |
| **Final** | pass | pass | **4481 passed / 0 failed / 2 skipped**, 270 files |

The baseline failure was `src/components/manuscripts/compsTokens.test.ts` — the comparable-titles
stream's WIP, fixed by them mid-run. Nothing in this pack touched it.

**Mid-run their `tsc` went red** (`ComparableTitlesPage.tsx`, `Cannot find name 'CompForm'` — a
mid-edit state in their own file). Every gate from §2 onward was therefore run in an **isolated
worktree** at this stream's own HEAD carrying only this stream's files, per CLAUDE.md's protocol.
The figures above are that isolated run.

**No file under `src/components/manuscripts/**` was touched, staged or reformatted, and neither was
`compsTokens.test.ts`.** Their `toast/` WIP was inspected once — because §2's stacking lock reads
`toast.css` z-indexes — and confirmed additive with no z-index change; it was not edited. Every
commit used `git commit -F <msg> --only -- <explicit paths>`; `git add -A` was never run.

---

## 1 · What each section actually did

**§1** was mostly already landed (§1a/b/d/e came with the rhythm pack) and is now locked rather than
rebuilt. The real work was **§1c**: search, Filter and Sort moved *down* out of the grid's page-wide
`toolbar` row into the head of the list **column**. They narrow the list and do nothing to the
reading pane, so a strip spanning both columns claimed a reach they do not have. The grid's
`toolbar` prop is gone from this page; `.wpg-scroll` pays the 18px gap instead of `.wpg-tools`,
which is the grid's own documented no-toolbar case, so the rhythm is unchanged.

The **button vocabulary** followed them: the head's triggers were 36px circles while the kebab eight
pixels away was a 9px-radius rectangle sized by its text padding. Both now read `--f12-icon-btn`
(34px) and the existing `--r-md`, and the search field reads the size token too — matched by *token*,
not by literal.

**§1f was re-scoped, not built**: an auto-select fallback means "nothing selected" is only reachable
when the filter matched nothing, so that is the state locked — stated in the pane, `Clear filters`
also clearing the search, and no kebab, because a menu with no subject is absent rather than greyed.

---

## 2 · `condensed` and the dock prop

**`condensed={creating || recording}` is removed.** It stripped the header band during a journey,
which was right while a journey *replaced* the page. A journey is an overlay now: the desk stays
whole underneath it, band and all, and stripping the chrome behind a scrim would animate a page the
writer is not looking at.

**The `dock` prop usage on `WorkspacePageGrid` is deleted.** The dock left grid row 4 for the
sheet's foot — it states what committing the composition will do, so it belongs to the composition
rather than to the page the composition is lying on.

> ⚠️ **The rhythm pack's scrollport warning no longer applies on this page, and must not be
> reinstated here.** "A dock's height comes out of the scrollport" was true of a *grid row*: it
> changed `clientHeight` in one header state only and added a term `--wpg-reclaim-pad` did not know
> about. A child of a portalled overlay takes no grid height at all, so nothing about the reclaim is
> coupled to it any more. **The warning still stands for any page that puts a dock back in row 4** —
> it is retired for this page, not deleted from the shell.

`.qh-take .f12-list { display: none }` is deleted with both takeover classes. A sheet laid on a desk
that has deleted half of itself is not laid on anything.

---

## 3 · What §3's extraction removed, and what both files now import

**Nothing here was new.** The mechanism existed twice, copied verbatim.

| Removed from `todo/FocusFlow.tsx` and `todo/TaskSettingsSheet.tsx` | Now in `components/shell/useOverlay.ts` |
|---|---|
| `const invoker = document.activeElement …` + `invoker?.focus?.()` | focus capture and restore, in a `useLayoutEffect` |
| `const release = lockStageScroll()` | the scroll lock, same app-wide mechanism |
| `const trapTab = (e) => { if (e.key !== "Tab") … }` (~14 lines each) | one Tab trap, wrapping at both ends |
| `const scrimClick = (e) => { … classList.contains … }` | one backdrop test, taking a callback |
| *(TaskSettingsSheet only)* its own Escape effect | `onEscape`, window-bound |

Both files now `import { useOverlay } from "../shell/useOverlay"` and keep only what is theirs.

**The one real difference between them survived**: FocusFlow's backdrop click **nudges** (it holds a
staged model a stray click must not discard); the settings sheet's **closes** (everything is already
written). That is why the primitive takes `onScrimClick` rather than assuming a meaning.

**One accidental difference did not**: one selector list had `select` and `textarea` and the other
did not, so Tab walked out of the settings sheet the moment anything with a dropdown went into it —
and it has one. The union is taken. That is a bug the merge fixed.

**New in the primitive, because the sheet needed it:**

- `inert` on `#root`, which removes the background from the tab order *and* the accessibility tree.
- **Reference counting on that seal.** `inert` is one attribute on one shared node, and the Query
  Centre sheet sits underneath its own discard confirm routinely — so add-on-mount / remove-on-unmount
  would hand the still-covered desk back to Tab the moment the confirm closed.
- Teardown order: focus is restored **after** un-sealing, because focusing into a still-`inert`
  subtree silently does nothing.

**The dirty guard was not rebuilt.** `closeCreate` / `closeRecord` already diffed against the
baseline and routed through `showConfirm`; §3 added Escape and backdrop-click as routes into that
one handler. The page's own two Escape effects were **deleted** — two window listeners both calling
`closeCreate()` would run the guard twice, giving two confirms on one keypress, the second asking
about a draft the first had discarded.

### Fields treated as seeds

**None are enumerated, deliberately** — the mechanism is that *the baseline is the seed*. Both
openers build one object and store it as draft **and** as baseline, so anything seeded is equal to
itself and the diff is empty. An enumeration would need updating every time a seed was added, and
would be wrong quietly.

What that covers today: **create** — today's date, `SubmissionMethod.EMAIL`, the house nudge preset
(`{kind: "preset", weeks: HOUSE_NUDGE_WEEKS, seeded: true}`), the agent's materials rows, and any
agent or manuscript the caller preselected. **Record** — today's arrival date.

---

## 4 · Where "everything else can wait" was found and removed

Exactly two occurrences, both create's:

- `src/components/Queries.tsx:3588` — the live lede. **Deleted.**
- `src/lib/createHeader.test.ts:142` — a `toContain` lock on the exact string. **Inverted**: it now
  asserts the phrase is absent, comment-stripped.

Nowhere else — not onboarding, tooltips, marketing copy or `CLAUDE.md`. **Recon corrected the
pack's premise**: record's lede was different copy ("What came back, and when — the rest follows
from that."), which also went.

Both elements doubled as the save-error announcer, so the announcer is kept and now renders **only
when there is a failure** — the more honest live region anyway: one populated at rest has nothing to
announce when it changes.

---

## 5 · How "responses received" is derived, and where closed-no-reply is excluded

`agentRepliesForManuscript(activities, manuscriptId, excludeQueryId)` in `lib/queryAmbient.ts`.
It counts **activity rungs** whose `resultingStatus` is in `AGENT_RESPONSE_STATUSES`
(`lib/queryDerivation.ts` — the same five rungs `recomputeQuery` derives `hasAgentResponded` from),
for that manuscript, excluding the query being recorded.

### What it replaced, and the three faults

The old rule was `queryBucket(x.status) !== "waiting"`, counting queries.

| Fault | Why it was wrong | Test |
|---|---|---|
| **Silence counted as a reply** | A query closed with no reply is not "waiting", so it counted — in the one sentence whose job is to say how often an agent wrote back | `a closed-no-reply contributes 0` |
| **The unit was queries, not replies** | partial → full → offer contributed 1 instead of 3, so the ordinal drifted further from the truth the longer a campaign ran — always low, always the same direction | `a partial → full → offer query contributes 3, not 1` |
| **A correction double-counted** | Re-recording on a query that already had a reply counted that query's own history | `re-recording an existing response does not double-count it` |

**Closed-no-reply is excluded structurally**: `NO_RESPONSE` is absent from
`AGENT_RESPONSE_STATUSES`, and the no-reply outcome maps to it. That is now **asserted**
(`NO_RESPONSE is absent from the canonical reply set`) rather than assumed, because it holds only
while the set stays honest. `WITHDRAWN` is likewise absent; `REJECTED` is asserted **present** — a
pass is a reply, an agent wrote back.

**It does not call `responsesReceivedCount`.** That selector's legacy fallback includes
`PARTIAL_SENT` and `FULL_SENT` — the *writer's* sends. Fine for a dashboard's tolerance and wrong in
a sentence, and it fires only on unmigrated imports, which is exactly when nobody would catch it.

`undefined` and `0` are kept apart: an unknown figure omits the line, `0` states a real first.

---

## 6 · Stacking order, as built

| Layer | z-index | Note |
|---|---|---|
| page popovers (`.qc-drop`, `.f12-pop`) | 30 | on the desk, behind the sheet |
| mobile command bar `.qh-mcmd` | 40 | `<md` only — never meets the sheet |
| `TasksPopover`, account menu | 60 | |
| `ConfirmDestroy` | 70 | |
| **`.qc-sheet-layer` (scrim + sheet)** | **200** | scrim and sheet are siblings inside it |
| **the dock** | *(none)* | a child of the sheet, in normal flow |
| `.sa-toasts` | 300 | a receipt must read **above** the sheet |
| `.sa-confirm` scrim | 320 | the dirty guard must draw **over** the sheet it asks about |
| `MobileSheet` | 1000 | |

The ceiling matters as much as the floor: raise the layer above 300 and the guard opens behind the
thing it is guarding. Browser-measured `200 / 300`.

---

## 7 · Browser checklist — measured, `tests/e2e/qcSheet.measure.ts`

Against a **local `build:dev` preview** (`vite preview`, `SA_E2E_BASE_URL=http://localhost:4173`),
signed in to the dev harness account. **Nothing was deployed.** All ten green.

| Check | 1024 | 1440 | 1920 |
|---|---|---|---|
| seam: `.f12-list` = `.f12-body` = `.qp-pane` height | 665 = 665 = 665 | 677.75 ×3 | 677.75 ×3 |
| list rows rendered | 20 | 20 | 20 |
| sheet width (`min(1080, vw−84)`) | **940** | **1080** | **1080** |
| sheet height (`vh−76`) | **824** | **824** | **824** |
| journey body inside it | 763 | 763 | 763 |
| `border-radius` | 0px | 0px | 0px |
| layer z / toast z | 200 / 300 | 200 / 300 | 200 / 300 |
| `#root[inert]` | true | true | true |
| `#root` opacity / filter | 0.4 / `saturate(0.82)` | same | same |
| list behind the sheet | `display: flex` | `flex` | `flex` |

Head controls at 1440: both pills **34×34 r9px**, search field **34**, kebab **34×34 r9px** — one
vocabulary, measured rather than asserted.

Keyboard-only open and close (create): focus enters the sheet, Escape closes, **no confirm**,
`inert` released, `#root` opacity back to **1**, focus returned.

Scrim-click, **clean**: closes silently, no confirm. Scrim-click, **dirty** (an agent picked):
`confirm=true, sheetStillOpen=true` — the guard fires.

### ⚠️ The bug the browser found that four sections of source locks could not

Written with `max-height` alone — the ref's shape — **the sheet is a content-sized container**, and
every box inside the journey says `flex: 1 1 0` with `min-height: 0`. That contributes **zero** to a
content-sized parent and then has no free space to grow into. Measured: the sheet was **182px at
every width** — header and dock only, the whole journey body at 0px, every element inside it
mounted, styled and correct. Nothing errored. This is the fault CLAUDE.md records twice
(`.tpl-cols`, `.f12-body`) arriving a third time through a new parent. Fixed with a definite
`height: calc(100% - 76px)`, which is also right on the merits — a workspace fills.

### Two findings about the harness itself

- **The saved `storageState` is not a session.** Firebase persists auth in **IndexedDB**;
  Playwright's `storageState` captures cookies and localStorage only. The saved file holds this
  app's preferences and no session, so any measurement trusting it runs **signed out against the
  auth page** — the exact failure the config header warns about for a missing password, through a
  door the guard does not cover. This file signs in for itself in one serial context.
- **Wait for the data, not the page.** The list renders before the query snapshot lands, so for a
  beat `queries.length === 0` and the page draws its welcome branch, whose CTA is "Send your first
  query". Clicking in that beat opened nothing and looked exactly like a broken sheet.

`tests/e2e/seed.mjs` **fails with `PERMISSION_DENIED`** against the dev project's deployed rules — a
pre-existing environment state, not this pack's, and not something to fix by deploying. The account
had data anyway, so the seam figures are real; the measurement opens the journey to reach the
populated branch, which is the stronger reading of §2 regardless.

### Not browser-verified

- **The three §5 devices under reduced motion.** Source-locked (suppression rules, and the JS
  branch at both arming sites); not exercised with the emulated preference.
- **All six outcome seals in the running app.** The colour map and its binding to write resolution
  are unit- and source-locked; driving six real saves needs seeded queries in six states.
- **The record journey end-to-end.** It needs a query in the right state to open on.
- The scrollbar, always — Chromium follows the macOS setting and nothing overrides it.

---

## 8 · Locks added or amended

**New:** `queryCentreRest.test.ts` (§1, 18) · `queryCentreSheet.test.ts` (§2, 17) ·
`queryCentreOverlay.test.ts` (§3, 20) · `queryCentreMoment.test.ts` (§5, 21).

**Amended:** `queriesHubColumn` · `queryCentreHeads` · `queryCentrePane` · `createListStandsDown`
(inverted wholesale) · `createEntrance` · `createSaveMotion` · `createCancelExit` · `createStack` ·
`createLogAnother` · `createHeader` (lede lock inverted) · `queryPlaceLine` (rewritten) ·
`queryAmbient` · `recordResponseShell` · `boardSettings` · `taskSettingsSheet` · `todoScrim`.

### Existing locks that caught real faults

Five, and each was right:

1. `queryCreateMotion` / `queryLoadAnimation` — a **`var()` inside `@keyframes qc-dock-glow`**, the
   documented silent failure. The tint moved onto the rule; only opacity is animated.
2. The same pair — a **one-line keyframe** (`qc-scrim-in`) had no `\n}` terminator, so the extraction
   regex ran past it into `.qc-sheet` and reported *its* `var()`. Reformatted to the house form.
3. `recordResponseShell` — **eight raw hexes** from the ref's three-stop seal gradients, in a
   stylesheet whose palette is tokens. The wax is now one token per family shaded by white and ink
   alpha, which also tracks the theme.
4. `queryCentreMoment` (mine, on its first run) — **`#root.qc-lamp` declared twice**, making a
   first-match slice ambiguous. Folded into one rule, per this repo's own stated preference.
5. `testAnchors` — the meta-lock for ambiguous source anchors — caught **two of mine**:
   `qc-sheet-layer` (twice in the sheet: the class, and `scrimClasses` naming the backdrop) and
   `return () => {` (three times in the primitive).

### Two over-broad slices fixed in passing

- `recordResponseShell`'s no-literals slice ran to **end of file**, so it read every rule appended
  after the response block. Bounded at both ends.
- `queryCentreSheet`'s reduced-motion anchor used **`lastIndexOf`**, so it started reading §5's block
  the moment that was appended. Re-anchored. A "last of its kind" anchor bets nothing will ever be
  added below it.

### ⚠️ The recurring trap, seven times in one pack

A lock asserting something is **absent** kept matching the **comment explaining its absence** —
`createListStandsDown` (both files), `createHeader`, `queryCentreOverlay`, `queryCentreMoment`
(twice: once for the word, once because the slice started *inside* the opening comment so the
stripper never saw its `/*`). Every one is now comment-stripped. **A rule about code is asserted
against code** — and when a slice is involved, it must start at the comment's opener, not at a
marker inside it.

---

## 9 · Open, and deliberately not resolved

- **The masthead's `actions` still empty during a journey.** `condensed` went because the desk must
  not change behind an overlay; by the same argument `actions={creating || recording ? [] : …}` makes
  the header visibly lose two buttons when the sheet opens. The pack named only `condensed`, and the
  emptying encodes a deliberate earlier decision (`Log query` would start a second journey), so it
  is flagged rather than changed. The desk is `inert`, so nothing there is clickable regardless.
- **`TagsSheet` still inlines its own overlay obligations.** It was not one of the two copies §3
  extracted; folding a third call site in unreviewed is how an extraction quietly changes behaviour.
  `boardSettings` states this explicitly rather than skipping it.
- **`--f12-icon-btn` is declared in `f12.css`, not `index.css`** — that file's own precedent
  (`--mono-tonal`) while a parallel stream holds `index.css`. Fold it into the `.t-f12` block when
  the tree is quiet.

---

**Not deployed. Not pushed.**

---

# Pack C — verified, and the one section that was new

Refs: `96-form-colour.html` · `98-sheet-crumb.html` · `100-sheet-watermark-lab.html` ·
`Sent_queries_final.png`. Commit `bf1cab8`. **Not deployed, not pushed.**

## Gates

| | tsc | `vite build` | Vitest |
|---|---|---|---|
| **Baseline** | pass | pass | 285 files / **4707 passed**, 0 failed |
| **Final** | pass | pass | 285 files / **4713 passed**, 0 failed |

Run in an isolated worktree carrying only this stream's files, per the pack.

## §0 — the six findings, re-verified

| # | Finding | Status |
|---|---|---|
| 1 | Portal to `document.body`; `.f12-root` clipped by two `overflow:hidden` ancestors | **still true** |
| 2a | `f12.css:1181`'s `.qh-take .f12-list { display:none }` | **gone** — 0 occurrences; removed with the sheet |
| 2b | `condensed` readers | **gone from Queries**; the prop survives on `WorkspacePageGrid` for the other nine pages |
| 3 | `dock` prop on `WorkspacePageGrid` | **gone** — the dock is the sheet's |
| 4 | The two To-do traps | **both migrated** to `useOverlay`; no local copies, so no drift is possible |
| 5 | Stacking | sheet **200** · toast **300** · confirm **320** — unchanged |
| 6 | `AgentContextPanel`'s content seam | **record uses it** (`body={` in `ResponsePane`), so the sheet inherits it unchanged |

So §1, §2, §4 and §5 were **already built** in this session and are locked rather than rebuilt.
§4b's "kept as built" items are already the state.

## §2's gate — no collision

`ManuscriptPlate.tsx` imports `createPortal` and renders `role="dialog" aria-label="Word count"`,
but it is an **anchored popover** (`useFixedMenu`), not an overlay: no `aria-modal`, no focus trap,
no scrim, no scroll lock. Same category as `TasksPopover`. **No second overlay primitive is being
born**, so §2 had nothing to stop for.

## §3 — measured

| | 1024 | 1440 | 1920 |
|---|---|---|---|
| band ground (create) | `rgb(247,227,221)` | same | same |
| controls in the band | **0** | 0 | 0 |
| open step's cap | `linear-gradient(…)` | same | same |
| watermark | `Sent_queries_final.png`, opacity **0.17**, `z-index: 0` | same | same |
| dock | `z-index: 2` on `rgb(255,253,251)`, overlapping the mark | same | same |

### ⚠️ The 1024 overlap — reported, not adjusted

The pack predicted it and it is real, but the number is sharper than "an overlap will show":

| | how far the collapsed rows reach into the 390px mark | text rows over it |
|---|---|---|
| 1440 | **32px** — a graze at its left edge | 2 |
| 1920 | **32px** | 1 |
| **1024** | **392px — the rows span the mark entirely** | **2** |

At 1440 and 1920 the mark is essentially clear of the rows. At 1024 the two-column body compresses
enough that the collapsed *What* and *Notes* rows cover the whole illustration, with two rows of
text over it at 0.17. **Opacity not adjusted** — the options are a lower opacity at that width, a
smaller mark, or hiding it below 1100 as the glance panels already do, and that is a design call.

### The crumb reads a stale name

The band renders **"SCRIPTALLY / QUERYING / QUERIES HUB / LOG A QUERY"** — but the page's masthead,
six inches above and behind the scrim, says **Query Centre**. `shellCrumbForPath` is faithful; the
**nav data is stale**. CLAUDE.md states the rule directly: *"The nav, the crumb and the page's own
heading must say the same thing."* The rename was applied to the page and never to the nav.

**Not fixed here.** "Queries Hub" appears across `index.css`, `types.ts`, `topNav.ts` and eight
components and tests — an app-wide rename, its own pass. Fixing it in the band alone would only move
the disagreement from the band-versus-masthead to the band-versus-sidebar.

### The illustration was already there

`public/Sent queries final.png` exists, **byte-identical** (md5 `d38d2f47…`), spaced, and referenced
by nothing. The underscored copy is used instead — a space in a URL is a known footgun — and the
spaced duplicate is reported rather than deleted.

## Locks

`.qc-sheet .qc-dock` was briefly declared twice (§2's and §3's), so a first-match slice read the
wrong block and the lock reported the dock had stopped drawing above the mark. **Folded into one
rule per selector** — the fix this repo prefers where sharing is not the point. Third instance of
that trap across these packs; the previous two were the avatar disc and `.f12-lhtitle`.

## Unexercised

- **`.qc-sheet--record::before`** — the sage hue-rotation is locked at source but not browser-checked,
  because reaching the record sheet needs a query whose primary is *Record response* and the §3 walk
  opens create.
- The chips-drop at 700 and the twenty-note case remain unexercised from the previous pack, for the
  same reason: no query on the harness account carries materials, and none carries notes.

**Not deployed. Not pushed.**
