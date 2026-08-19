# Onboarding chrome — reduced header, step spine, handover

**19 Aug 2026 · six phases, six commits on `main`, unpushed · run alongside a live To-do stream.**

---

## 1 · Step 0 — the seven findings

### 1 · The onboarding container

`src/components/Onboarding.tsx`. It is a full-screen overlay (`position: fixed`, z-index 9999), not
a route. It holds `step` (a number) and `flow` (`"A" | "B" | null`), and routes by rendering one of
three things inside `ScreenTransition`: `BranchA`, `BranchB`, or the welcome question.

The branch is decided in one place — `setFlow(STAGE_TO_BRANCH[queryingStage])` — when the writer
presses Continue on the opening question. `STAGE_TO_BRANCH` maps `starting → A` and
`early | deep | interest → B`; "Skip setup" is the only route to the exploring path and leaves
immediately.

The "your list" fork is not in the container at all: it is `BranchB`'s `screen === "pipeline"`,
rendering `CaptureFork`.

### 2 · How the position is held — **localStorage, and only partly**

`localStorage["scriptally_onboarding_progress_<uid>"]`, written by `saveProgress` and read once by
`loadProgress`. The stored shape is `{ step, manuscriptTitle, manuscriptGenre, queryingStage }`.

**But `step` is deliberately discarded on return.** `normalizeStep` is `(_s) => 0` — a hard-coded
zero with a comment explaining that only one numbered screen survives. And `flow` is
`useState<Branch | null>(null)`: it is never persisted and never restored.

`queryingStage` is the exception that is genuinely durable — it is written to localStorage *and* to
the user profile, and `effectiveQueryingStage` prefers the stored profile value.

### 3 · Resumability — **it does not resume, and this is the finding that shapes the spine**

There is **no `useEffect` anywhere in `Onboarding.tsx`**, so nothing re-enters a branch on mount.
A writer who leaves inside step two and signs back in lands on **the welcome question**, with their
stage answer and manuscript draft pre-filled but their branch forgotten.

So the spine is built from the container's own live state, and **resumability is unsolved** — the
third skip-and-continue gate, logged rather than fixed. It is not a spine defect: a spine that
survived a refresh would be claiming a position the flow itself does not restore.

### 4 · `mk-head` — **it does not exist**

The ref's `mk-head` is a ref-only class. The real marketing header is **`MarketingShell`**
(`src/marketing/MarketingShell.tsx`), rendering `.mk-navwrap > .mk-nav`. Its props are
`{ user, onNavigate, path, children }` — **no centre slot**, and no slot of any kind. It also
carries auth-aware CTAs (Log in / Start tracking / avatar) and the Features/About/Pricing/Contact
links, none of which belong above a signup flow.

**Gate hit: built standalone in the same grammar.** Nothing in the marketing tier was modified.

### 5 · `fix/onboarding-trap` — **it does not exist on the remote**

`git ls-remote --heads origin` returns exactly two heads: `refs/heads/main` and
`refs/heads/backup/rules-tests-2026-06-21`. There is no such branch to touch, merge or act on.

### 6 · The import sub-flow — **it renders inside the container**

Upload, review and duplicates are all `BranchB` screens (`B3Screen` = `book | pipeline | confirm |
blocked | reading | overview | review | fallback | importing | done`), rendered as `if (screen ===
…)` branches. Duplicates is `SmartImportReview`'s own internal `screen` union
(`"duplicates" | "agents" | "queries"`), gated on a real `hadDuplicates`.

Nothing routes away. **Phase 5 ran** — with one limit; see §3.

### 7 · Concurrency at the start

`git diff --name-only HEAD` was dirty in 34 files, every one the To-do stream's: `reports/audit/`,
`reports/card-conformance/`, `reports/pane/` screenshots and `run-artifacts/*.txt`, plus an
untracked `src/components/todo/taskPane.css`. **None belong to this run.**

---

## 2 · What existed, and what was built

| | |
|---|---|
| **Already there** | The onboarding card (`OnboardingCard`) and its band — including a `step` prop already documented as "an honest step marker, omitted when the screen does not know its position". Phase 3 and Phase 5 both use that existing slot rather than adding one. `ScriptAllyLogo` with a `heightPx` prop. The whole import sub-flow. |
| **Built** | `lib/onboardingSpine.ts` (pure) · `OnboardingSpine.tsx` · `OnboardingHeader.tsx` · `lib/onboardingHandover.ts` (pure) · `HandoverScreen.tsx` · the `ob-*` block appended to `onboarding.css`. |
| **Retired** | `OnbChrome` — the card's own "Skip setup" link. |

### The defect, and why retiring `OnbChrome` was part of fixing it

`OnbChrome` drew "Skip setup" at 13.5px above the card as the **only** thing on screen besides the
card. Adding a quiet exit to a new header while leaving it in place would have put the fix beside
the defect. Retiring it made `onSkip` genuinely unused on `OnboardingCard`, so the prop went with
it — an accepted-and-never-rendered prop is precisely the shape that left a whole sign-out
unreachable a fortnight ago. `BranchB` keeps its `onSkip`, because `CaptureFork`'s "I've nothing to
capture yet" still calls it.

### A silent exit found on the way

A **successful** import used to leave onboarding without showing anything: the loader's completion
beat called `onImportComplete` directly, and the `done` screen was only ever reached when *nothing*
imported. A writer whose nine queries landed was dropped on the dashboard, untold. That is the seam
Phase 6 replaces.

---

## 3 · Skip-and-continue gates hit

| Gate | Outcome |
|---|---|
| **No shared header takes a centre slot** | Hit. `MarketingShell` has no slot and carries the wrong controls. Built standalone; marketing untouched. |
| **`journeyStage` neither stored nor derivable** | Partially hit. `queryingStage` is durable; the *branch and position* are not. Spine built from the container's live state; **resumability logged as unsolved**. |
| **Import sub-flow routes away** | Not hit — it renders inside. Phase 5 ran. |

### One limit inside Phase 5, reported rather than papered over

The brief's example is `Step 3 · Reviewing 2 of 3`. The screens that could know that total —
`ImportOverview` and `SmartImportReview`'s agents/duplicates/queries walk — **render their own
full-screen shells, not an `OnboardingCard`**, so they have no band to state it in.

Two things were declined rather than faked: designing a band for those screens (no ref draws one),
and inventing an N-of-M for the card-based screens (there is nothing to count). Each card-based
sub-screen therefore names what it is doing — "Confirming your file", "Reading your sheet",
"Bringing it in" — and a test asserts **no sub-label ever claims a count**.

### A duplication accepted deliberately

`onboardingHandover.ts` carries its own number-words array. `spellNumber` is exported from
`src/lib/todoColumns.ts`, but importing it would have coupled the onboarding to a file the other
stream is actively refactoring. A fourth copy (after `manuscriptTiles`, `todoBoard`, `todoColumns`)
is flagged for consolidation rather than resolved across a live boundary.

---

## 4 · Measurements

Playwright could not be used: it opens the **deployed** dev site, which does not carry this work,
and no deploy was permitted. Measurements are from the **local dev server in a real browser**
(`localhost:3010`), on the auth screens — which mount the same `OnboardingHeader` component and are
reachable without signing in.

### The header does not wrap

| Viewport | Header box | Brand y | Exit y | One row? | Horizontal overflow |
|---|---|---|---|---|---|
| 1280 | 1280 × **55** | 14 | 17 | yes | **0** |
| 1024 | 1024 × **55** | 14 | 17 | yes | **0** |
| 768 | 768 × **55** | 14 | 17 | yes | **0** |
| 740 | 740 × **51** | 12 | 15 | yes | **0** |

Height stays at one row (55px = 26px brand + 14px padding top and bottom) at every width, tightening
to 51px below the breakpoint by design.

### The exit is demoted — the numbers, not the adjective

| | Exit ("Back to site") | Primary (`.b-primary`, "Sign in") |
|---|---|---|
| Box | 86 × 20 | 360 × 44 |
| Area | 1,720 px² | 15,840 px² |
| Font | 10.5px, weight 400 | 11px, weight 500 |
| Colour | `rgb(165,152,142)` muted | on a filled `rgb(245,226,218)` pill |
| Fill | none | yes |

**The exit is 10.9% of the primary's area**, unfilled, muted and underlined. Measured at 1280 and
1024; identical.

### The spine's states and its breakpoint

Measured by injecting a probe carrying the spine's own classes, because the auth screens render no
spine — so the **rule** is tested rather than one instance of it.

| Viewport | `.ob-spine` | `.ob-spmob` |
|---|---|---|
| 780 | `flex` | `none` |
| 740 | `none` | `inline` |

Computed styles at 780: current dot `rgb(124,58,42)` with ring `rgba(124,58,42,0.14) 0 0 0 4px`;
upcoming dot transparent with border `rgb(226,217,204)`; join `1px` `rgb(233,226,215)`. Each is the
token the phase specifies — burgundy, `onbOptionEdge`, `onbHairline`.

### ⚠️ Unmeasured, and named as such

- **The spine inside the real flow**, and **the onboarding card's clipping by its ancestors.** Both
  need an account that has not completed onboarding. Creating one means entering a password, which
  I will not do, and the harness account has already onboarded. The header component itself *is*
  measured above; its behaviour in the onboarding overlay is not.
- **The handover screen in a browser.** Its logic, copy and routing are unit-tested; its layout is
  unmeasured.

What would unblock both: a dev-only preview route (the `#/shell-lab` pattern), or a fresh account on
dev. Neither was in scope.

---

## 5 · Gates

| | Baseline (start) | Final |
|---|---|---|
| `tsc` | **0** | **0** |
| `build` | pass | pass |
| Vitest | **1 failed** / 5,776 passed / 331 files | **0 failed** / 5,697 passed / 2 skipped |

The baseline was already red: `todoTokenResolution.test.ts` failed because the To-do stream's
untracked `taskPane.css` read an undefined `--dash`. Not mine, not fixed.

Mid-run their tree moved further — `tsc` briefly reached 5 errors and the suite 4 failures as they
deleted `TodoDock.tsx` and `paneCopy.test.ts` out from under their own tests. Throughout, **no error
named a file this run owns**, verified by filtering `tsc` output on `src/components/todo/`. My own
attributable gate during that window was `vitest --exclude 'src/components/todo/**'`: 284 files,
4,806 tests, all green. By the end their work settled and the whole suite is green.

The test total falls from 5,776 to 5,699 because they deleted test files, not because anything was
removed here.

---

## 6 · Commits

| Hash | Phase |
|---|---|
| `358765f` | 1 · design refs |
| `e7c8601` | 2 · the onboarding header |
| `620f41d` | 3 · the step spine |
| `700d455` | 4 · auth continuity |
| `25cade4` | 5 · sub-steps in the band |
| `e25ed57` | 6 · the handover |

Phase 2 also lands the spine component and its model, because a header with a centre slot needs
something to put in it; Phase 3 adds the band's count and the branch-honesty tests. Stated in the
commit rather than left to be inferred.

---

## 7 · Concurrency

- **`git diff --name-only HEAD` is empty for every path this run owns.** The dirty files are the
  To-do stream's screenshots and run-artifacts, exactly as they were at the start.
- **Nothing was reverted, stashed, checked out or cleaned.**
- **No file was touched that the To-do stream also touched.** The two streams' paths are disjoint:
  everything here is `src/components/onboarding/`, `src/components/Onboarding.tsx`,
  `src/components/Auth.tsx`, `src/lib/onboarding*.ts` and `design-refs/`.
- **`index.css` was not touched at all** — the onboarding stylesheet this run owns had room, so the
  shared-file protocol was never needed.

### ⚠️ The hazard that nearly bit, and what stopped it

Before the Phase 2 commit, `git status` showed **five files staged that this run never staged** —
`src/components/todo/TodoDock.tsx`, `todoDock.css`, `todoDockSurface.test.tsx`,
`src/lib/paneChassis.test.ts`, `src/lib/paneCopy.test.ts` — the To-do stream staging into the shared
index mid-run.

`git commit --only -- <explicit paths>` is what made that harmless: the commit contains exactly the
eight files named, and their staged deletions were still sitting in the index afterwards, untouched.
**`git add -A` at that moment would have committed another stream's half-finished refactor inside an
onboarding commit.** This is the concrete case the rule exists for.

---

## 8 · Deploy

Not run. No rules changed, so hosting-only:

```bash
npm run build:dev && firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev
```

Worth doing before judging any of this by eye — and the two unmeasured claims in §4 need a fresh
account on dev to settle.
