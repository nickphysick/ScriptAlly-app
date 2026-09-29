# Analytics v2a — run report (29 Sep)

Branch `analytics-v2a` in worktree `../ScriptAlly-analytics-v2a`, off `main` @ `5a9956aa`. **Not merged, not pushed, not deployed.**
Ref: `design-refs/analytics-v2a.html`, SHA256 `66c208d5…cbce`, 39,398 bytes.

## False premises (what the prompt asserted that did not hold)

1. **"`design-refs/analytics-v2a.html`" existed in the repo.** It did not. It was in `~/Downloads`, hash- and size-matched, and was committed and enrolled in the ref watchlist (P1).
2. **"Dev shows a median wait of 434 days from 2 responses."** Not on this build. On the main seed manuscript (*The Smoke Test*, `seed-ms-1`) the page reads **14 days from 25 dated replies**. The 897-day-query seed fault is real, though: the first query is dated 18 Apr 2024, which gives "894 days of querying this book".
3. **"Work on a short-lived branch."** CLAUDE.md says direct-to-`main` only. I followed the prompt's own instruction, and the branch still needs merging (see Deferred).
4. **"Share card" as a possible working mechanism.** `ShareCard` existed, but its only output ("Download PNG") was `disabled`. It was a dialog that shared nothing.
5. **"Use StatusDot at ~80px."** It renders at 80px, but its 2-on-24 stroke draws about 6.7px where the ref's hand-drawn ring is 4.2px. It is not forked; the difference is visible.
6. **"Group at the ref's max width (1480)."** The app has ONE content column: 1360px, with the gutter inside it. The width-chain lock forbids a page from capping itself, so I followed the house law. The measured group is 1100px at 1440 and 1256px at 1920.
7. **"The caveat 'Silence isn't a no' — still-out queries sit outside the request rate."** In this build the rate counts them in its denominator. The note now says what the code does.
8. **The ref's split colours** (for example "5 to full" in sage). The locked five-state map says requested = blush, so the splits show where each stage's queries stand today, in the state fills.

## 1. Baseline vs final

| Gate | Baseline (`main` @ 5a9956aa) | Final (`1f5f645d` + this commit) |
|---|---|---|
| tsc | 0 errors | 0 errors |
| build | exit 0, no error/WARNING lines | exit 0, no error/WARNING lines |
| Vitest | 498 files · 8,204 passed · 3 skipped | 493 files · 8,170 passed · 3 skipped |
| Playwright (`analyticsV2a.measure.ts`) | 3/3 red at first check (page absent) | 3/3 green, **73 checks, 0 failed** |

The Vitest drop is by design: six unit suites retired with the components they tested (StatStrip, charts, click-through, horizon, old funnel, outcomes, waits), and +36 new model tests. Baseline Vitest needed `functions/node_modules` symlinked into the worktree, which is a worktree artefact.

## 2. Step 0

See `STEP0.md`. In summary: A shell v3 has landed (gate passed) · B scope = localStorage key + re-navigation (gate passed; the page keys on `useLocation().key`) · C every figure is derivable (see below) · D, E Share card and Export omitted · F old suites retired or census deferred · G above · H the five state fills are `:root` tokens (`--state-*`); cream `#f8f4ec` has **no token** (→ `--sp-cream`), and neither does the lane `#faf7f1` (→ `--mat-parch-2`).

**Derivation fixes found on the rendered page, not in recon:**
- A reply falls back to the query document's dated incoming rungs when the log has none. The story rail had dated a "first request" while the fact line said "no dated replies".
- A `lastStatusChange` close equal to the send date is treated as undated, because a legacy stamp had drawn a 0-week ending.

## 3. Per phase

| Phase | SHA | Landed | Measured |
|---|---|---|---|
| P1 data layer | `3a8fc637` | `analyticsModel.ts` + 30 tests | unit |
| P2 harness | `f7271063` | `analyticsV2a.measure.ts` | red against main (page absent — masks the rest; see §4) |
| P3 scaffold | `5dac9650` | full header, group, skeleton, entrance, empty state, retirements | rendered 1440 |
| P4 story rail | `f433ccf8` | StoryRail + PageRail `fill`/`foot` | rendered 1440 (found and fixed the foot clipped by the window inset) |
| P5 hero + journey | `c104f724` | hero, range, journey | rendered 1440/1920 |
| P6 facts + reply | `5f38b4bd` | fact line, reply chart | rendered 1440 |
| P7 two-up | `508c3d97` | endings, stages | rendered 1440 |
| P8 volume + caveats | `5ae36e31` · `1f5f645d` | volume, caveats, locks tightened | **full suite 73/73 at 1440×900 and 1920×1080** |
| finish | this commit | card-scoped journey queries, skeleton grid, per-worker ledger, report | full suite 73/73 re-run |

## 4. Every lock, proved red

Each lock was broken on purpose in the measurement worktree, rebuilt, measured, and restored from a path-derived backup (hash-verified). Raw rows: `mutation-proofs.jsonl`; runner: `mutate.mjs`.

| Lock | Mutation | Result |
|---|---|---|
| header-full-width | header confined to column 1 | RED |
| header-above-group | main moved to row 1 | RED |
| group-centred | `margin-right: 60px` on the group | RED |
| group-max-width | not separately mutated — the shared 1360 column cannot exceed 1480 | **unproved** |
| rail-340 | rail `width: 320px` | RED |
| rail-sticky-declared | `position: relative` | RED (it also masked rail-stuck) |
| rail-stuck | `top: 60px` | RED |
| rail-fits-on-load | `fill={false}` | RED |
| funnel-stages / funnel-counts | not separately mutated | **unproved** |
| funnel-links | connectors removed | RED |
| funnel-dots | StatusDots removed | RED |
| funnel-ref-height | ring well 260px | RED |
| chart-reply / volume / endings / stages marks | marks `display: none` (stages alone in a second run) | RED ×4 |
| chart-*-present | not separately mutated | **unproved** |
| story-date-order | events sorted in reverse | RED |
| story-ends-today | today moved first | RED |
| caveats-last | caveats moved above volume | RED |
| range-pressed | click made inert | RED |
| range-changes-sent | model ignores the range | RED |
| range-reaches-charts / -story | not separately mutated (they moved with range-changes-sent's fixture) | **unproved** |
| no-eyebrow | a section provided | RED |
| no-burgundy | a fact value painted `#7c3a2a` | RED |

**Harness faults found by the proofs:**
- The ledger was one file per run, and a failing case restarts the Playwright worker, so the next worker overwrote the red. The first mutation run therefore read "no failures" off a red case. The ledger is now one file per worker.
- `range-changes-sent` was `<=`, which an inert control passes. It now has a precondition (a query older than three months exists) and a strict `<`.

## 5. Controls omitted

- **Share card** — no mechanism (its PNG export was never built).
- **Export** — was `disabled`.
- **Illustration slots** (the header art, the hero art, the rail's hawk head) — no artwork exists. Absent art renders no slot (the PageHeader rule and Comps D6).

## 6. Deferred (owned here, not in comments)

1. **Merge.** Branch `analytics-v2a` is 10+ commits ahead of `main`. CLAUDE.md's workflow is direct-to-main; it needs fast-forwarding or merging by whoever holds `main`.
2. **Census suites not re-enrolled** — about 20 e2e files with their own route tables (list in `tests/e2e/RETIRED-analytics-v2a.md`). The unit census and `optedOut.ts` are done.
3. **Dead lib exports.** `lib/analytics.ts`'s `CHART`, `statusBreakdown`, `replyBuckets`, `monthlySeries`, `eventMarks`, aging and horizon selectors, and `READING_THE_NUMBERS` have no component consumers now. `lib/analytics.test.ts` still tests some of them. Needs a sweep.
4. **The click-through doors are gone.** The old page opened the Query Centre filtered to each figure. The ref has no doors, so none were built.
5. **The rail can't stick while the column is shorter than the rail** (sticky cannot leave its grid area). This happens only on a very thin manuscript.
6. **A reply from an agency with no stated window** is counted but not drawn. On *Harbour of Glass* that is 3 of 4.
7. **Prod rules:** none touched. **Seed:** not touched (the 2024 dates reported under §G).
8. **The skeleton's controls placeholder** is nearly invisible against the page ground (lane on page ground).

## 7. Screenshots (local `vite preview` of `build:dev`, harness account — not the deployed dev site; nothing was deployed)

`theme-cappuccino*.png`, `theme-bold*.png`, `theme-editorial*.png` (the theme class is swapped in the DOM for the capture; no account write) · `page-1920*.png` · `empty-state*.png` (`seed-ms-empty`) · `skeleton.png` (held with `__SA_QC_HOLD_MS`) · `seed-ms-1*.png` (the main seed) · `ref-1386.png` (the ref at equal column width).
