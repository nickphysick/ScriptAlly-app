# Close-out — Move, `#/pkg-lab`, blue tokens, Phase 5 (25 Aug)

## Part 1 — Move

### ⚠️ The premise is wrong: Move was already on the menu

The brief says Correction UI *"shipped everything except the control: the ⋯ menu offers no Move
rather than a dead one"*. It offers one. `CorrectionFork` takes an `onMove` prop and renders a third
branch when it is passed, and `Queries.tsx:4315` passes it — gated on `moveTargetsFor().length`, so
it appears only when there is somewhere to move to.

**D2 was already honoured too, in the code's own words:**

> *"MOVE SITS ON THE CORRECTION BRANCH, not beside it. Filing an event under the wrong agent IS the
> record being wrong, so it belongs with 'I'm correcting a mistake'; offering it as a third peer
> would suggest a move is a different KIND of act from an edit."*

**No code was written for Part 1.** What follows is verification.

### Measured on the running app, 1440

```
fork branches   ✏ I'm correcting a mistake  ·  ↩ Something changed since
                ↦ It belongs to a different query        ← last, and `.cor-branch--minor`  (D2)
picker          43 candidates, each "agent · agency · STATUS"
sheet control   "Move it · one undo restores both queries"
```

⚠️ **The guard fired first, and it was right.** The probe's first pick produced no picker at all:

> *"This entry cannot move — this is the first thing that happened on this query, so it cannot move.
> The query would be left with no beginning."*

A probe that always takes entry one measures the guard rather than the move. It now takes the last
of a query with more than one.

### D3 / D4 — the source, both directions

```
BEFORE      seed-query-9  status "Partial Sent"  lastStatusChange 2026-08-23T19:18:07.647Z
AFTER MOVE                status "Full Sent"     lastStatusChange 2026-08-21T15:27:50.587Z
AFTER UNDO                status "Partial Sent"  lastStatusChange 2026-08-23T19:18:07.647Z
```

The source lost an entry, **recomputed a different status from its own remaining log, and re-anchored
`lastStatusChange`** — then undo restored both figures exactly. One toast, one undo, and the control
says so.

⚠️ **What I did not measure: the destination's derived state.** D4 asks for both sides; I captured
the source before, after and after-undo, and inferred the destination from `moveActivity`'s batch and
the restored source. Stated rather than claimed.

⚠️ **And my first assertion was wrong about a move that had worked.** I counted the top-level
`activities` feed by `queryId`; the move does not re-key that projection, so the count held at 4 and
the probe reported *"the source did not lose an activity"* about a source that visibly had. The
derived status is the evidence — a shorter log deriving a different status is exactly what D4 asks
about.

⚠️ **Harness note:** the run that failed on that wrong assertion left `cor-move-a` mutated (its
Partial Sent entry moved and not undone). Repaired by re-running `tests/e2e/seedCorrection.mjs`.

## Part 2 — `#/pkg-lab` removed

Route gone from `App.tsx`, `PkgLab.tsx` deleted, census entry dropped from `devSurfaceSmoke`.

### ⚠️ The brief's reason was wrong, and the answer is stronger than it

`#/pkg-lab` was **not** the caller of `STAT_CELLS`, `repliesByPackage` or `ledgerRows`. It imported
`PackageTabs`, `WorkshopTab` and `AnalyticsTab` and none of those three. **With comments stripped,
the three had zero references anywhere but their own test file** — already orphaned by an earlier
change, not by this one. They are deleted with their tests in the same commit.

⚠️ **What made a plain grep read as though a caller survived:** `TrackingBand.tsx` carries a comment
*recording* that it stopped importing them. The prose names all three. Strip comments before
believing a reachability answer — the same trap the source-string locks are written against.

### What the deletion pulled with it, and what it nearly took

`LedgerRow` went too (only `ledgerRows` used it), along with four types and **two whole module
imports** — `./activityEvent` and `./queryDerivation` — that nothing else in the file needed.

⚠️ **`BarRow` and `pct` were nearly lost and are live.** Both were introduced for `repliesByPackage`
and both are used by `requestsByMaterial`, which stays. tsc caught them: they read as part of the
retired band and are not.

⚠️ **Two anchors went with their functions, and the lock said so.** `packageTracking.test.ts`'s D8
block navigates with `sliceBetween`; deleting `export const STAT_CELLS` and
`export function repliesByPackage` made it **fail loudly naming the missing anchors** — which is
exactly why that lock uses `sliceBetween` rather than a bare `indexOf` pair, and the difference
between reporting a retirement and silently widening to the rest of the file. Re-anchored on what
survives, claim unchanged.

The `ledgerRows` case — *"the ledger is the only function allowed to read the activity log"* — is
retired with its subject and **replaced by the stronger whole-file property**: nothing in
`packageTracking.ts` reads the log at all now. That assertion failed first, correctly, on an
`ActivityType` import the deleted function had owned.

### F-AL — what removing the route stranded

| symbol | other callers | disposition |
|---|---|---|
| `PackageTabs` | none | **stranded** — proposed for deletion |
| `AnalyticsTab` | none | **stranded** — proposed for deletion |
| `WorkshopTab` | `workshopEmpty.test.tsx` only | **stranded, tested-but-unmounted** — the exact shape D6 names |
| `tourExample` / `WORKSHOP_TOUR_STEPS` | `SubmissionPackages.tsx` | **live, kept** |

The first three are the same fault D6 describes, one level out. **Not deleted** — the brief scoped
this run to the three named exports, and `AnalyticsTab` in particular is substantial. Proposed for a
follow-up rather than taken now.

Gate: tsc clean, build clean, **Vitest 387 files / 6670 tests, all green.** Grep with comments
stripped: no live reference to the route, the component, or the three exports.

## Part 3 — the packages page's blue is one set now (D8)

`--pkg-pro` · `--pkg-pro-fill` · `--pkg-pro-edge` · `--pkg-pro-ink`, defined in
`packageWorkshop.css` and read by every blue on the page. **No hex at a call site.**

⚠️ **What the call sites actually held was worse than a hex — it was `var(--slate-tint, #eef2f7)`.**
The token exists (`index.css:48`), so the fallback was dead weight *and* a hard-coded value, wearing
a knob's clothes. Third time this session that a `var()` fallback has stood in for a token; the
other two were tokens that did not exist at all.

## F-AK — the blue audit, as input to a later app-wide ruling

| family | where | values | used by | proposed |
|---|---|---|---|---|
| **`--slate`** + `-deep` `-tint` `-line` | `index.css:43,47–49` | `#6A89A7` `#4f6b86` `#eef2f7` `#c7d6e3` | Pro pill, slate accents, app-wide | **the canonical root.** Everything else should derive from it |
| **`--pro`** | `index.css:977` | `#6A89A7` | — | ⚠️ **exact duplicate of `--slate`.** Recommend deleting and repointing readers. **Not touched** (D10): `index.css` is do-not-touch |
| **`--blue-t/-b/-i`** | `index.css:955` | `#e7eef6` `#d3e0ee` `#2b4a6b` | the post-it band triple | **a different job** — a note colour, not a tier colour. Recommend renaming so it stops reading as a fourth Pro blue |
| **`--pro-fill/-edge/-ink`** | `packageGroup.css` (reading pane) | `#e6edf4` `#c3d5e4` `#41627f` | the Query Centre sent strip | **merge with `--pkg-pro-*`** — same three values, two page-local copies |
| **`--pkg-pro*`** | `packageWorkshop.css` *(new)* | as above | the packages page | this run's canonical set |

**The shape of the ruling this is input to:** one root (`--slate`), one derived Pro set the tier's
surfaces read, and a rename for `--blue-*` so a note colour stops looking like a fifth Pro blue. That
touches `index.css` and two page sheets other sessions own, which is why it is a report and not a
change.

## Part 4 — the hold gate is CLOSED

```
src/components/shell/workspacePageGrid.css       M
src/components/shell/workspacePageGrid.test.tsx  M
```

Both modified and uncommitted; the page-header session is mid-flight (last commit 9 hours ago,
*"the retract is withdrawn"*). **Phases 5A–5D not run. The hold stands — that is the gate working.**

---

# Tidy-ups (25 Aug)

## Part 1 — F-AM: the cascade was larger than three components

A fixed-point reachability sweep from `App.tsx` (458 files reachable) found **eight** unreachable
files in the packages region, not three:

```
AnalyticsEmpty.tsx      88     PackageWorkshop.tsx    910
AnalyticsTab.tsx       405     WorkshopEmpty.tsx      193  TESTED
PackageTabs.tsx         44     WorkshopTab.tsx        583
lib/communityStats.ts   93 T   lib/packageAnalytics.ts 280  TESTED
```

`PackageWorkshop.tsx` — the largest of them — was not in the brief at all. The cascade is clean:
`PackageWorkshop`, `WorkshopEmpty` ← `WorkshopTab`; `AnalyticsEmpty` ← `AnalyticsTab`; both tabs ←
the deleted `#/pkg-lab`.

⚠️ **And the page's own comment had already recorded it, with one clause that went stale yesterday:**

> *"THE TAB STRIP IS GONE AND THIS IS WHAT REPLACED IT (restructure D1) … The strip's component
> survives untouched for the DEV `#/pkg-lab` route, which still mounts it."*
>
> *"THE `view` STATE IS GONE, AND SO ARE BOTH BRANCHES IT SWITCHED … which made the WorkshopTab and
> AnalyticsTab branches unreachable code."*

The restructure knew all three were unreachable and kept them **because pkg-lab mounted them**. That
route went in Part 2 of the last run, so the stated reason for all three expired then.

### Deleted — six views and one test, 2,223 lines

`PackageTabs` · `AnalyticsTab` · `AnalyticsEmpty` · `WorkshopTab` · `WorkshopEmpty` (+
`workshopEmpty.test.tsx`) · `PackageWorkshop`.

### Kept, and marked at the head — two pure libs

| file | why it survives |
|---|---|
| `lib/packageAnalytics.ts` (280, tested) | the reply-rate framing, material ranking, composition read and recommendations. **`TrackingBand` derives from `packageTracking.ts` and reproduces none of it** — deleting this loses work rather than tidying a duplicate |
| `lib/communityStats.ts` (93, tested) | percentile logic behind `COMMUNITY_STATS_ENABLED`, a feature the live page has no surface for yet |

Both now carry a head note saying they are unmounted, why they survive, and that a later session
should neither restore a surface for them nor delete them as dead. **D1's duplication question,
answered:** there is none — the two analytics families derive from different libs, and the live one
is the smaller.

⚠️ `TypeGlyph` was in the same neighbourhood and is **live** — `Queries.tsx` uses it. It survived the
sweep on its own merits, not by being missed.

Gate: tsc clean, build clean, Vitest 387 files / 6680 tests green; grep with comments stripped finds
no reference to any deleted symbol.

## Part 2 — the `var()` fallback sweep, and why "does the token exist" is the wrong question

⚠️ **D5's test is too simple, and the sweep proves it with the same token twice.**

`--f12-serif` is defined — once, on **`.t-f12`**, a theme class `Queries.tsx` applies and the
packages page does not sit under. So the identical construct has **opposite dispositions**:

| site | inside `.t-f12`? | `var(--f12-serif, …)` is | done |
|---|---|---|---|
| `packageGroup.css:102` (Query Centre strip) | **yes** | dead weight — the token resolves | fallback dropped |
| `packageTracking.css:20` (packages page) | **no** | **the painted value** — `Georgia, serif` renders | made an honest literal |

Dropping the second as dead weight — the obvious reading of *"the token exists"* — would have
silently changed the font on a live surface. **Existence is not resolution.**

### The rest of this pack's sheets

* `--burg`, `--ink` in `packageGroup.css` — defined on `.t-f12`, which this sheet renders inside, so
  both fallbacks were **provably inert**. Dropped. (`--ink` is also `:root` at a *different* value;
  inside `.t-f12` the theme's wins, and the fallback was a third value that never applied.)
* `--pink-cta-edge` — **defined nowhere.** The hex was the value wearing a knob's clothes; now a
  literal with the reason recorded.
* `--pkg-near-black`, `--font-hand`, `--pkgo-page` — already literals from an earlier pass; the only
  matches left are the comments recording that.

⚠️ **A source lock was asserting the fallback.** `sentStrip.test.ts` read
`toContain("Playfair Display")`, which passed on the fallback string rather than on the token. It now
asserts `var(--f12-serif)`; the claim — the name is Playfair — is unchanged, and `.t-f12` sets
`--f12-serif` to exactly that family.

⚠️ **D7's proof is by scope, not by screenshot.** A fallback applies only when the token is unset;
`.t-f12` sets all three at the sites they were dropped from, so those three were inert by
construction and the painted values cannot have moved. Where the token does **not** resolve, the
value was kept verbatim. A browser run was attempted and timed out; the scope argument is the
stronger evidence in any case, because it holds at every viewport and theme rather than the one
measured.

## F-AN — `index.css`, reported not edited

Its `.t-f12` block (lines ~948–1029) defines `--ink`, `--burg`, `--f12-serif` and siblings **at theme
scope**, while `:root` defines `--ink` and `--burg` at *different* values. That is not a fault — it is
how the F12 theme retones — but it is why a fallback sweep cannot be done by grep alone, and why the
same `var(--ink, …)` is inert in one file and load-bearing in another. **Not edited.**

## Part 3 — the destination side, measured

Move: a Partial Sent event from `seed-query-9` (Ana Duarte) to `seed-pkgq-8` (David Marsh, Rejected).

| | destination `seed-pkgq-8` | source `seed-query-9` |
|---|---|---|
| **before** | `Rejected` · lsc 5 Jul · partialSent — · fullSent — | `Partial Sent` · lsc 23 Aug · partialSent 23 Aug · fullSent 21 Aug |
| **after** | `Partial Sent` · lsc 23 Aug · **partialSent 23 Aug** · fullSent — | `Full Sent` · lsc 21 Aug · **partialSent —** · fullSent 21 Aug |
| **after undo** | `Rejected` · lsc 5 Jul · partialSent — · fullSent — | `Partial Sent` · lsc 23 Aug · partialSent 23 Aug · fullSent 21 Aug |

**Both sides derive from their own logs.** The destination gained the event and derived
`Partial Sent` with a `partialSentDate`; the source lost it and fell back to `Full Sent` with
`partialSentDate` cleared. `revisionRound` and `responseReceivedAt` held on both — each is derived
from its own log and neither log's answer to those changed. **Undo returned both objects exactly**,
asserted field-by-field rather than on a status string.

### D9 — the one thing that looked like a defect, and is not

The destination went from **`Rejected`** — a terminal status — to `Partial Sent`. The seed script
carries a fixture named *"move DESTINATION, closed → this does not reopen it"*, so this reads at
first glance as the opposite of what was promised. It is not. `moveNotices` says:

> *"{agent}'s query is closed — {status}. **An event dated before the closure** slots into the record
> without reopening it."*

My moved event is dated **23 Aug** against a closure of **5 Jul** — *after*, so the condition does not
apply and reopening is the honest derivation. The copy is precise; I read past the qualifier.

⚠️ **One observation, not a defect.** That notice renders whenever the target is closed, and states
a **conditional** the reader has to apply themselves — and `moveNotices(target, note, agentName)` is
not passed the moving event's date, so it *cannot* say which side of the closure this event falls on.
A writer moving a post-closure event sees a true sentence that does not describe what is about to
happen. Sharpening it means passing the date; **flagged, not changed** — the copy is not wrong.
