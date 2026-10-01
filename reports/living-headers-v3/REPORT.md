# Living page headers, across six pages — run report

Ref: `design-refs/page-header/living-headers-v3.html` (SHA256 `842c777b…72dc`, matched and enrolled in C1).
Worktree `/private/tmp/sa-lh3`, branch landed on `main` by fast-forward. **No deploys.**

## False premises and deviations — read these first

1. **Nothing showed a breadcrumb at first paint.** The quiet bar named the page only once its title had scrolled behind the bar. §2 is therefore a change of behaviour, not a restyle: on the six living routes the crumb shows from first paint (`lib/livingRoutes.ts`); every other route keeps the quiet bar unchanged.
2. **The art is capped at 272px, not the ref's 286.** The ref's drawing rises above its header into room our page does not have; 286 runs into the bar. Width (46%) and `bottom: -26px` are the ref's. LH0 holds the width and the header height to the ref at 1440.
3. **Reduced motion is instant, not fade-only.** The shell's single reduced-motion rule sets 0.01ms on everything under `.ws-app`. The ref itself also goes instant under reduce.
4. **The To-do list keeps its own tiles** (Your move · Chase or close · Housekeeping) in the caught-up state, not the ref's Overdue / Due this week / Your own: "overdue" is banned on that page.
5. **Each page keeps its own buttons.** The ref's button labels are not adopted, so no action was invented.
6. **The To-do subline names the oldest item by its deed** ("The oldest of them is Consider closing, and it was due on Sat 27 Sep."), where the ref writes "‹Agent›'s partial". The page's rows carry deeds; agent possessives would need a second wording engine.
7. **"Most-used live package" had no function.** It is composed in the page from `packageResults` (contract §C4): the live package with the most queries sent with it.
8. **The Analytics funnel has no "Partial requested" stage** in `analyticsModel`. The exhibition draws the ref's four-row funnel (27 → 5 → 2 → 1) as a sample constant. The page's own tiles are not in that picture: their only sample is `exampleModel`'s eleven queries, which would state a second total.
9. **The Analytics rail stacks at 1280** (the page's own `@container anv-page (max-width: 968px)`), so "hero right = rail right" holds at 1440/1512/1920 and is reported, not asserted, at 1280 (LH4 counts 23 of 24).
10. **LH12 is read as "the subline never restates the headline's count".** The ref's own sublines carry related counts (e.g. Contact list: "6 queried, and 31 still to go").
11. **The Comparable titles empty state lost "How your comps work"** and the tagged example cards. The ref draws heading, sentence, buttons and exhibition with nothing between. The add form stays open by default above the exhibition: it is the page's own add action.
12. **The To-do "desk cleared" and "new desk" first-run states are retired** (recover from `9c0373a8`), and so is Analytics' `AnvEmpty`. Each was replaced by the exhibition, and is deleted in the same commit.
13. **Packages had no loading state and no readiness flag of its own**; `db.tsx` is out of bounds. The header settles on `collectionsReady`, so the page never states "No packages yet" over a loading account. A packages listener that lands after the other collections could still show the empty state for a moment (unmeasured, not observed).
14. **Packages: "+ New package" now shows in the empty state.** Before this pass, dismissing the default-open composer left no way to reopen it.
15. **The Comps session did not reply** to the §0.9 message; it was treated as not mid-rebuild. Every other session said clear.

## §0 recon (measured on the running page, before any edit)

`recon-0.json` holds every number, read at 1280/1440/1512/1920.

**Shared header.** All six pages use `PageHeader variant="full"`, and the shared top bar is `WorkspaceShell`. The red gate was not met.

**Header values before this pass.**
- Living pair (QC, Contact): padding 14/0/26, h1 clamp (47.36 at 1280, 56 at 1920).
- The other four: padding 26/0, h1 56 (50 at ≤1360), intro `min-height: 0`, art 48% × 276.

**Buttons.**
- QC: + Log a query · Record a response.
- Contact: + Add an agent · Paste a link.
- To-do: Set aside · 9.
- Packages: + New package · Side by side.
- Comps: + Add a comp.
- Analytics: none.

**Art.**
- QC, Contact and Packages have their own art.
- The To-do list has an empty art slot.
- Comparable titles and Analytics have none. Their art boxes are left empty, and no art was copied between pages.

**Alignment.**
- One left edge on every page at every width: 289 / 294.1 / 296.4 / 456.
- Hero right = rail right: 1239 / 1393.9 / 1463.6 / 1712, except Analytics at 1280, where the rail stacks (right 629).

**Answerability (§0.7).** Every subline case is answered from existing derivations, so no engine was written:
- Contact: `hk.counts.gaps`.
- Packages: `packageResults`.
- Comps: `inQuery`, `publisher` and `year`.
- Analytics: `replies`, `requests` and the median wait. `medianWaitDays` was exposed on the model; it is the number `facts.medianWait` already displayed.
- To-do: the page's own date sort.

**Hint routes.**
- They exist for QC (`/import`), Contact (`/agents/discover`) and Analytics (the log journey).
- There is no route for "See what agents usually ask for", "What makes a good comp title?" or "See what QueryHawk keeps track of", so those three lines are omitted.

**Held pages.** None; all six were built.

## Commits

| | |
|---|---|
| `1fe4efbb` C1 | the fixed shape: 22px top, the art cap |
| `613ec9d1` C2 | the crumb in the bar from first paint; no eyebrow on the six |
| `9c0373a8` C3 | the six copy functions, every branch tested |
| `090b84d1` 7a | Query Centre: tile rule |
| `873662ad` 7b | Contact list: the ref's subline, tile rule, the memo ordered after `hk` (TDZ lock) |
| `9ae0abe6` 7c | To-do list: the three states, the exhibition, the retired desks |
| `27f4742a` 7d | Submission packages + `4fa8b6f4` pkgMat retarget |
| `df2b909a` 7e | Comparable titles (+ compsMat retarget) |
| `9e4d05cd` 7f | Analytics |
| `d486a051` C8 | the rendered locks LH1–LH11, two faults they found, the retargets, the README |

The brief's commits 4–6 (empty state, exhibition, To-do states) landed inside the per-page commits. The shared parts, `PageHeader`'s `empty` and `LivingExhibition`, already existed from v1.

## Gates

| | baseline | after |
|---|---|---|
| tsc | clean | clean |
| production build | clean (chunk-size note only) | clean (chunk-size note only) |
| Vitest | 8,195 passed | **8,215 passed** · 3 skipped · 509 files |

## Red-first evidence

- **LH12** (copy, unit) went red under a date-formatter mutation once a September fixture was added. Its first run stayed green because no fixture held a September date; the fixture was fixed and the lock re-proved red with 8 failures.
- **LH1–LH11** (rendered) were each mutated in this worktree with path-derived backups, then restored and rebuilt. Raw output is in `red-first-e2e.json` and `red-first-e2e-LH10.json`.

| Lock | Mutation | Red |
|---|---|---|
| LH1 | subline `min-height: 0` | intro 52.2→26.1, buttons up 26px |
| LH2 | title `white-space: normal; max-width: 5ch` | "One query out" on 3 lines |
| LH3 | the To-do tile one-line rule removed | 122.3 vs 172.4 |
| LH4 | 6px padding on the text block | 300.1 vs 294.1 |
| LH5 | the crumb's opacity rule removed | opacity 0 at first paint |
| LH6 | `data-n={count}` on the header | shape differs at 111 |
| LH7 | the empty state keeps its rule | rule 1 |
| LH8 | `inert` removed from the band | not inert, tabbed in |
| LH9 | To-do counts filtered rows and always offers `empty` | a searched-to-nothing list became the empty state |
| LH10 | both readiness gates removed | "2 things to do" → "34" |
| LH11 | caught-up renders the exhibition | caught panel and rail gone, band shown |

**On LH10.** Removing only the `tasksSettled` gate stayed green in that run: the feed gate alone held. Both gates are kept because the flash was seen with only the feed gate earlier.

## Two faults the suite found, fixed in C8

- **LH3: a To-do tile grew 122 → 172px with a three-digit figure.** The fix applies §1's rule: the number gets `flex: none`, and the label and sub-line are one line, truncated. The cost is that long sub-lines such as "13 agent requests · 2 yours" truncate at 1280.
- **LH10: the To-do headline flashed "2 things to do" before "34".** The store derives `tasks` in an effect a render after `collectionsReady`. The header now waits for the activity feed, and for `tasks` to change once after the data is ready, with a 600ms fallback.

## Rendered headline widths at 1280 (ink, px; `headline-widths-1280.json`)

| Page | One | 9 | 13 | 27 | 148 |
|---|---|---|---|---|---|
| Query Centre | 333.1 | 325.1 | 350.8 | 350.9 | 380.5 |
| Contact list | 233.1 | 200.4 | 226.1 | 226.2 | 255.9 |
| To-do list | 372.4 | 339.8 | 365.5 | 365.5 | 395.2 |
| Submission packages | 288.9 | 256.2 | 281.9 | 282.0 | 311.7 |
| Comparable titles | 350.8 | 318.2 | 343.9 | 344.0 | 373.6 |
| Analytics | 307.9 | 299.9 | 325.6 | 325.7 | 355.4 |

"All caught up" is 327.0. Every headline is one line at every width (LH2: 124 checks).

## Neighbouring suites, re-run against the dev build

| Suite | Result |
|---|---|
| contactV11 | 25 passed |
| todoV2 | 19 passed |
| analyticsV2a | 73 checks, 0 failed |
| pkgMat | 11 passed (retargeted) |
| compsMat | 27 passed (retargeted) |
| pageHeaderV2 | 20 passed (retargeted) |
| quietBar | 6 passed (retargeted) |
| livingHeadersV3 | 8 passed (LH1–LH11 + LH0) |
| qcV65 | 33 passed, **5 failed** — five reds were recorded at baseline before this pass. These five are the top bar, head row, rail placement, expanded view and loading. They match the baseline by count and by subject, not case by case, and none is a header claim |

## Screenshots (`shots/`)

- At 1440, every page in its empty, one and many states, plus `todo-1440-caught-up.png`.
- Every hero at 1280 and 1920 (`*-1280-hero.png`, `*-1920-hero.png`).

## Hint lines omitted for want of a route

- "See what agents usually ask for ›" (Packages)
- "What makes a good comp title? ›" (Comps)
- "See what QueryHawk keeps track of ›" (To-do)

## Not done / for Nick

- Prod: nothing to deploy for rules or functions; hosting is Nick's.
- Manuscripts is out of scope (README note in `LIVING_HEADERS.md`).
- The quiet bar and the crumb now coexist: living routes show the crumb at rest and every other route keeps the quiet bar. This is the brief's §2 taken literally. Worth a look on dev, since the two behaviours now sit side by side across the app.
