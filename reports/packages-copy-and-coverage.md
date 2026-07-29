# Packages — honest copy on the empty state, and its first coverage

**Commits:** `7256dd9` remove the community promise → `5bf690a` correct the overdue copy → `6677428`
smoke coverage. Gates green per commit (tsc clean, `vite build` ✓). No deploys.

**Vitest: 1724 → 1737 (+13).** All from the new spec; nothing was removed.

---

## 1 · The community promise is gone

Deleted from the analytics empty state:

> ~~Once you've sent a few queries, ScriptAlly will also show how your reply rate compares with the
> wider writing community.~~

…along with its container and the `.pkgw-commteaser` CSS, which had no other consumer. Zero
references remain.

It was the last forward promise on the surface: no aggregation pipeline exists, the flag is off, and
nothing commits us to building it.

**Untouched, as specified:** `COMMUNITY_STATS_ENABLED`, `placeholderCommunitySource`, and the flag-off
line on the *populated* view ("Comparisons with other ScriptAlly writers arrive as the community
grows"). That line does a different job — it explains why an **existing** panel is quiet, rather than
promising a panel that doesn't exist. The component docstring now says so explicitly, so the two
aren't collapsed back together by someone tidying later.

## 2 · The overdue line now describes the behaviour

| | |
|---|---|
| **Was** | "…and a nudge when someone's overdue." |
| **Now** | "…and a flag on anyone who's overdue, with a link through to the Queries Hub to nudge them." |

The tab derives the overdue send (via `taskPrecedence`, the app's shared rule), surfaces it as the
"Waiting game" recommendation, and links out. The nudge is drafted in the Queries Hub. One sentence,
same voice.

## 3 · Smoke coverage — 13 tests

`src/components/packages/workshopEmpty.test.tsx`. Everything asked for:

| Assertion | How |
|---|---|
| renders at `packagesCount === 0` | through **WorkshopTab**, not the leaf alone — the wiring is tested, not just the component |
| does **not** render with an unsaved draft | `firstRunState(0,0,1)` and `(3,0,1)` → `populated` |
| exactly one tour entry point | one "Try it with example data" control in the render |
| skeletons decorative | both `aria-hidden`; nothing focusable inside; the create card beside them stays a real button |
| steps strip advances | `activeStep(0,0)=1`, `(1,0)=2`, `(3,1)=3`, and exactly one `.now` in the markup |

Plus the packages-only degradation (type cards drop, packages section stays).

No layout, no motion, no snapshots.

### Two things worth knowing about the how

**There is no jsdom in this repo.** `vitest.config.ts` is `environment: 'node'`, and neither
jsdom/happy-dom nor testing-library is installed. The house pattern for component specs
(`pageHeader.test.tsx`, `shellV2Smoke.test.tsx`) is `renderToStaticMarkup`, so this follows it. That
is *stricter* about what it can honestly assert — structure and attributes, never geometry — which
suits the brief's "no layout" instruction rather than fighting it.

**One small production change, flagged rather than slipped in.** Effects don't run under static
rendering, so the draft state can't be reached by clicking. Rather than drop that assertion, the rule
moved out of two inline expressions in `WorkshopTab` into an exported pure
`firstRunState(materials, packages, drafts)` in `WorkshopEmpty.tsx` — the same precedent as
`activeStep`, which already lived there. Behaviour is identical. The rule is now named, documented
(including *why* the draft clause exists: without it, starting a package from the empty state would
bounce you straight back to it), and pinned by tests.

### A bug in the test, caught before commit

The skeleton-focusability check sliced each shell on `pkgw-gfoot`, where the class is `gfoot`. The
last shell therefore ran on into the example band and picked up its button, and the test failed. It
failed *honestly* rather than passing vacuously, which is the better of the two failure modes — but
worth recording, because a test that slices markup by string is exactly the kind that can go green
for the wrong reason if the boundary is wrong in the other direction.
