# Retiring the Pro showcase landing

**Commits:** `743478d` route the zero-package state → `fb30dc5` delete the landing → `a3bdd65` fence
the refs → `b5fb0e2` Pro-signal coherence. Gates green per commit (tsc clean, `vite build` ✓, Vitest
**1724**). No deploys. Supersedes Phases 6 and 7 of `packages-emptystate-landing-prompt.md`, which are
cancelled.

---

## Step 0 — the reference sweep, in full

### Every reference to `PackageShowcase` and its parts

| Location | What it was | Outcome |
|---|---|---|
| `packages/PackageShowcase.tsx` | the component itself, 452 lines | **deleted** |
| `SubmissionPackages.tsx:28` | import | removed |
| `SubmissionPackages.tsx:184-193` | the `packagesCount === 0` render branch | removed |
| `SubmissionPackages.tsx:9,45` | docstring + comment describing it | rewritten |
| `PkgLab.tsx:16` | import | removed |
| `PkgLab.tsx:28,88,142,144,160-162` | the `"showcase"` View type, default view, toolbar entry, render branch | removed |

**Nothing outside the packages surface imported it** — so the stop condition on the red item was not
triggered and the shape of the work was unchanged. `SubmissionPackages.tsx` is the route host, which
is expected rather than a surprise dependency.

**`psw-*` keyframes:** all **113** occurrences lived inside `PackageShowcase.tsx` itself — its CSS was
an inline `SHOWCASE_CSS` template string, not a stylesheet. Zero occurrences anywhere else in `src/`,
so the deletion could not orphan a keyframe.

**Demo-only assets:** none. No separate CSS, SVG or fixture file, and no `public/` asset reference.
The 24-second animated demo was entirely self-contained in the one component.

**Post-deletion greps in `src/` — all zero:**

```
psw-              0
psw               0
PackageShowcase   0
showcase          0
```

Two documentary mentions of the retired landing survived the deletion in docstrings, explaining *why*
it went. Rather than delete the rationale to satisfy a grep, they were reworded to "Pro-selling
landing" — the reasoning survives, the token doesn't.

### The two conditions (2)

Before: the host branched at `activeMs && msPackages.length === 0 && !entered` → landing. The workshop
already owned its own first-run conditions — `nothingYet` (no materials, no packages, no drafts) and
`noPackagesYet` (materials but no packages). So this was **one deletion, not two competing
conditions**: removing the host branch hands the state straight to conditions that already existed.
`entered` and `enterViaTour` went with it — both existed solely to escape the landing.

### Tour entry points (3)

Three call sites before: `enterViaTour` (landing), and `startTour` twice — the workshop empty state's
example-data band and the analytics empty state's matching action. After: `enterViaTour` is gone and
**`startTour` is the single path in**, reached from those two surfaces. No orphaned trigger.

### Vitest — the delta is zero, and that is the honest answer (4)

**No spec ever referenced the landing.** A grep for `PackageShowcase|showcase` across `*.test.ts(x)`
returns nothing. Verification for it was always browser screenshots — defensible for a presentational
marketing component with a 24s CSS animation that jsdom cannot evaluate, but it does mean the suite
count is **unchanged at 1724**, not fallen. Nothing was deleted or rewritten, because there was
nothing to delete or rewrite. Reporting that rather than manufacturing a drop.

### `PackageWorkshop.tsx` (5)

Last touched at `8ca9850`, before this arc began. **Untouched**, still fenced to the Phase D sweep,
still referenced only for its `PackageSaveFields` type.

---

## Phase 1 — the four states

All verified in the browser at `#/pkg-lab`, whose three views now mirror the three data states the
route can actually be in:

| State | What renders |
|---|---|
| **no materials, no packages** | the full first-run screen — step 1 active, three type cards at 0 (pulse on the query letter only), the create card + two `aria-hidden` skeletons, the example-data band |
| **some materials, no packages** | the real sidebar + grid return; only the PACKAGES section degrades to its empty form; step 2 active; example band kept |
| **materials of only one type** | the sidebar shows just the populated group (empty groups hide) and the type cards give way to it; otherwise as above |
| **packages exist** | the populated workshop, unchanged — three cards, no steps, no ghosts, no band |

**One behaviour worth recording:** an open unsaved DRAFT legitimately suppresses the empty state and
shows the grid. That is what the `newDraftIds.length === 0` clause is for, and it is correct — you do
have a package in progress. It surfaced during testing because the lab's view toggles reuse the same
`WorkshopTab` instance, so a draft created under one fixture survived into the next. A harness
artefact of switching fixtures mid-session, not something a user can hit as a bug.

---

## Phase 4 — what was kept, and what still overclaims

**Removed:** nothing called "Unlock with Pro" remained — the only one lived on the landing and went
with it. What did remain was one piece of unlock-*flavoured* language: the community flag-off
fallback, "Comparisons with other ScriptAlly writers **unlock** as the community grows." Not a CTA,
not about tiers — "unlock" there meant "there is no cohort yet" — but the word reads as pay-to-open,
which is the misreading this pass exists to remove. Reworded to "…**arrive** as the community grows",
class renamed `.pkgw-unlock` → `.pkgw-commsoon`. The community flag and its placeholder source are
untouched, per the fence.

**Kept, as specified:** the PRO pill and the Pro-tinted strip. The pill marks the feature's intended
tier; the strip carries a value claim ("Every package keeps its own scorecard…"), not an upsell. Both
remain true whether or not gating ever exists.

**Nothing elsewhere links here expecting a sales screen.** Every reference to `/manuscripts/packages`
is nav, crumb or route plumbing — `railNav`, `shellV2Nav`, `topCrumb`, `routeTiers`, `App.tsx`.

### Copy that still promises more than the build does — reported, not silently rewritten

1. **The community teaser** (analytics empty state): "ScriptAlly will also show how your reply rate
   compares with the wider writing community." There is no aggregation pipeline, the flag is off, and
   nothing commits us to building it. This wording was *specified deliberately* last session
   (foreshadow without claiming data exists), so it stands until you say otherwise — but it is a
   forward promise on a surface we have just finished making honest.
2. **"…and a nudge when someone's overdue"** (same panel). The tab detects the overdue send and points
   at the Queries Hub; the nudge itself happens there. One word from being exact.

`PackageWorkshop.tsx` also carries a "Coming soon" file-upload affordance, but that file is dead and
fenced — it renders nowhere.

---

## Kept rather than deleted

- **`design-refs/scriptally-packages-landing-newlook.html`** and
  **`design-refs/scriptally-packages-showcase.html`** — both fenced with a NOT BUILT header at the top
  of the file. They are the design work for a Pro persuasion surface, which becomes worth having the
  moment a real gate exists; it just doesn't belong on an authenticated route without one. Deleting
  them would throw away the thinking and leave the next person to redo it.
- **`pkg-lab` itself** — retained, per the fence; only its default view moved off the deleted landing.
  It stays with the Phase D sweep.

Nothing else was kept back: no part of the landing turned out to be shared with a surviving surface.
