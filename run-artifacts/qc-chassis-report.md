# To-do on the Query Centre's chassis — night one

**Where I stopped:** at the **Phase 1 boundary**, with Phase 1 now MEASURED and deployed. Phases
2–7 are night two. Full recon in `run-artifacts/qc-chassis-recon.md`.

✅ **Phase 1 is measured: 15 of 15 green against the deployed dev bundle** (`run-artifacts/qc-chassis-p1.txt`).
The earlier version of this report led with a warning that it was not; that warning was right, and
running the measurement is what found the two faults below.

⚠️ **AND THE MEASUREMENT FOUND A PAGE THAT CRASHED ON EVERY TILE CLICK.** Phase 1 shipped to dev
with `tsc`, 7,443 unit tests and a clean production build all green, and the To-do page fell into
its error boundary the moment a reader touched a tile. That is the whole argument for the rule this
round added to `CLAUDE.md`: *a phase whose measurement has not run is not landed, whatever the gates
say.*

| phase | SHA | what landed |
|---|---|---|
| contracts | `af98bb58` | the three refs, enrolled (38 guarded) |
| 0 · recon | — | `run-artifacts/qc-chassis-recon.md`, no commit |
| 1 · header, tiles, toolbar | `e7acb30e` | the page moves onto the Query Centre's own parts |
| 1 · measured | `48e429ec` | the TDZ crash, the two totals, `visiblePage()`, two `CLAUDE.md` rules |
| 1 · reconciled | `c595a02e` | the nine reds Phase 1 left in `tightened.measure.ts` |
| 1 · reported | `<this>` | the rail badge is a third number; screenshots from dev |

---

## The contracts arrived twice

`8221911a` enrolled all three from **another session** by mistake, and `12e7b40d` reverted it so
this session could enrol them itself — a revert rather than a reset, because `main` is shared.
That session wrote no source, no report and no run-artifact, so `af98bb58` is the round's true
first commit. Recorded because a reverted enrol followed by a fresh one reads as churn in the log
and is not.

---

## Recon: which Query Centre parts were reused, and how

The brief's central instruction was *do not fork a Query Centre component*. What that meant in
practice was decided by one fact recon turned up first:

⚠️ **THE QUERY CENTRE IS HOT.** `Queries.tsx` (8,517 lines) and `src/components/queries/` were
last committed **three hours before recon**, mid-round — `colours v2` Phases 1–6 then `v14`. **The
stat tiles and the view switch this brief asks me to reuse were created that afternoon at 17:15.**
One shared checkout, one live stream in those files.

So extraction happens in the SMALL component files, never in `Queries.tsx`:

| part | how it was reused |
|---|---|
| page header | **untouched** — `PageHeader variant="workspace"`, which `/todo` already mounted through `TasksPageLayout`. It gained the subtitle and the primary it was not passing. |
| illustration slot | **untouched** — `queries/IlloSlot`, no query coupling. |
| stat tiles | **extracted**: the markup moved to `shared/StatTiles`; `QueryStatTiles` keeps its name, props, semantics and call site and mounts it. **Zero diff to `Queries.tsx`.** |
| view switch | **additive**: `views` prop defaulting to the Query Centre's four. Its call site passes nothing and renders byte-identically. |
| toolbar buttons | **extracted from inline markup** — the only unavoidable edit to `Queries.tsx`: its three ~40-line blocks became three `ToolbarButton` mounts. Done in one pass, `git status` checked either side. |
| board column head | not yet — Phase 4. |
| card, drawer shell | **no shareable ancestor exists.** ⚠️ There is no generic drawer primitive in the app: the Query Centre's panel, the packages drawer and the Query log sheet each own their own fixed element. Phase 5 builds `SlideOver` as a shared primitive and names the three that could adopt it. |

---

## Phase 1 — what changed

- **The header** is the Query Centre's, now carrying the same three things: the subtitle
  ("Everything that's yours to do, and everything worth a look."), one primary (`+ Add a task`),
  and an illustration slot — an **additive `illo` prop on `PageHeader`**, which nine pages pass
  nothing to and which renders no node and reserves no width when absent. `mark` becomes optional
  on `TasksPageLayout` for the same reason the Query Centre carries none: a glyph beside a
  commissioned picture is a second picture competing with the first.
- **Seven tiles**, mounting the shared component. The five categories **partition** the board, so
  their sum IS All structurally rather than by two derivations agreeing; **Urgent is a lens** and
  is deliberately outside that sum.
- **The toolbar** is the Query Centre's row: one search with `/`, Filter · Group · Sort, and the
  view switch offering Grid and Board. The drawer round's own Filter and Group & order panels are
  **re-hosted, not rebuilt** — same components, same conditional counts, same `AnchoredPanel`;
  what changed is the trigger they hang off.
- **`lib/todoCategory.ts`** (new) is the derivation: exhaustive over `TaskType`, closed with the
  house `never` idiom, so a thirteenth task type fails to compile until it says which category it
  belongs to. It does not re-derive what `cardBucket` already decides.
- **The card's own bar loses its search, filter and sort** — the page owns them now, so there is
  one of each. ⚠️ **The set-aside door STAYS in the card**, deliberately and against the
  contract's toolbar: it is the only route to the ledger and to tag management, and this page has
  taken both offline once already by unmounting the sheet that held them. Phase 3 rehomes it.

---

## What Phase 1 found

**1 · A spelling-lock caught a real regression, and it was right to.** `respondDesk.test.tsx`
pinned three literal lines inside `QueryStatTiles` — the form this repo's own rules call wrong
("assert the claim, not the spelling"). My extraction gave `StatTiles` a single `selected` key,
and the lock went red. It was correct: the Query Centre's row is **two axes** — one active court
plus an independent `Past expected` flag — so "with you AND past expected" must ring **two** tiles,
and a single key silently collapsed that. `selected` takes a set now. The lock has been retargeted
to the claim, but only **after** its spelling had done the work no claim-shaped version would have.

**2 · A timeout under contention is indistinguishable from a broken page.** `paneMounts` failed
twice with the shell "not found" after sign-in, on a build whose only errors were none. I bisected
— badly, leaving `TaskList` and `ToDoPage` inconsistent, which produced a second false signal —
before the same suite passed 2/2 unchanged. The cause was the machine: another session is running
its own suites in this checkout. This is the third time this session has paid for it.

**3 · And the measurement read two pages at once.** Its first completed run reported **twelve
tiles** (the Query Centre's five plus To-do's seven) and the Query Centre's own title as the To-do
page's. Every workspace page stays MOUNTED under the display-toggling shell, so
`document.querySelector` reaches the hidden page — the hazard this repo already records. The probe
now finds the visible `.tdb-wrap` by measuring it, tags it, and reads inside the tag.

---

## What the measurement found — the two faults, and why no gate could see either

### 1 · A temporal dead zone that took the whole page down

`railGroups()` is a hoisted function whose first render-time caller sits at line 924. Phase 1 made
it reach `tileNarrow`, which reads `nudgedBefore` — declared eight hundred lines further down. Every
tile click threw `Cannot access 'oc' before initialization` and dropped the page into its error
boundary.

**Three things made it invisible.** `tsc` cannot see through a function boundary, so the read
typechecked. `tileNarrow` returns early while the selected tile is `all` — the initial state — so
the page LOADED perfectly and only died on the first click. And a warning comment describing this
exact fault, from the last time this file had it, sat **four lines above the offending call site**.

Comments are not guards. `todoTileTdz.test.ts` asserts the ORDER now, both halves — that the chain
still reads each dependency, and that each is declared above the first caller — and was proved red
by putting the bug back and watching both fire.

### 2 · The page stated two different totals

The tiles counted `railGroupsAll()` raw while the list renders `railGroups()`, so the page showed
**29 in a tile beside "27 tasks" in the card's own footer**, three inches apart, and a Housekeeping
tile reading 3 that narrowed to two rows. Both numbers were right about their own set; nothing said
which one the word "tasks" meant.

The difference was two snoozed-or-dismissed cards, which `applyView` drops under a law it states
outright: *what is not shown is not counted, anywhere.* Both surfaces now read one `tileScope()`,
so they agree structurally rather than by two derivations happening to match. The footer's own
`totalUnfiltered` had already filtered them for that reason — the page knew the right population
and the tiles were the one surface that missed it.

⚠️ **A THIRD SURFACE STILL DISAGREES, AND IS REPORTED RATHER THAN FIXED.** The rail rib reads
`To-do list29` against the page's 27, because it counts `boardFigures(cols).cards`. That predates
this round — the page moved to the view-excluded total in the drawer round and the badge never
followed — and it contradicts `ShellSidebar`'s own comment promising the badge "cannot drift from
the page counts". **What the badge should MEAN is a product call**, and it is shell chrome besides,
so P1.2c prints both figures every run instead of patching it here.

---

## The nine reds Phase 1 left behind, reconciled

Retiring the list card's toolbar broke nine assertions in `tightened.measure.ts`. **Provenance was
established before anything was touched**: the same file was run against the deployed dev bundle and
produced the identical nine, so none came from the fixes above.

- **`TodoToolbar.tsx` was deleted**, with `.l-toolbar`, `.l-tbsp`, `.meterMini`, the `.cb` cluster
  and `.l-search`. It had zero importers and zero tests naming it — a replacement that was ADDED
  rather than swapped, the third recorded instance of that shape in this repo.
- **The dead-class sweep ran against the RENDERED page, not the source**, and it mattered: a source
  scan reported `grp` and `l-icon` as dead too, and both are live behind interpolated class names.
  Four more (`l-fbadge`, `l-slbl`, `l-wide`, `fchip`) were deliberately left — drawer-round filter
  chrome that may be conditional on filters the probe did not set.
- **Every retired assertion names where its claim went**, and a new `P1.0b` asserts the retirement
  itself, so a supersession cannot be mistaken for a regression. `P1.1` and `P1.9` followed the row
  to `.tdb-qtool`; `P2.6` was retargeted and re-measured green.

⚠️ **AND `P3.10b` IS A FINDING, NOT A RETUNE.** Phase 1's two rows of chrome lowered the task
drawer's cap. Measured: the sheet's content wants **461px**, the cap is **404 at a 900px viewport**
and clear of 461 from **1050** up. So the hug branch became unreachable at the harness's default
height and the sheet was capped at both widths — a branch tally passing over one state twice. The
1920 case runs at 1050 now so the law is still tested. **It must not be read as "the hug is fine":
on a 1440×900 laptop the drawer scrolls internally where it used to hug.** Nick's to rule on.

---

## `visiblePage()`, and why it is a function rather than a tag

Every `/todo` probe now scopes through `visiblePage(page)` (`tests/e2e/measure.ts`), a rule this
round added to `CLAUDE.md`. It installs `window.__saVisRoot()`, which finds the one visible root by
MEASURING it and throws on none or two.

**The tag version was written first and broke within the hour.** Setting `data-sa-vis` on the
element works until the first interaction: React re-created the root on a tile click, took the
attribute with it, and the next probe crashed on `null.querySelectorAll` — a crashing probe, which
tells you nothing and hides every assertion below it. Re-measuring on every call cannot go stale,
because it never remembers anything.

---

## Corrections to the brief

1. **`.card .ttl` is declared twice in `todo-qc-style.html`** — Inter 14.5/600, then Playfair 18/500
   two hundred lines later. The browser takes the second, so the ref RENDERS Playfair while the
   brief specifies Inter 600. The brief is a reasoned value in prose and wins; recorded because a
   reader diffing ref against build will find it.
2. **The Query Centre's subtitle is not italic** (`.wsh-sub` sets no `font-style`). The contract
   draws italic. Not changed: a style flag on the app's one masthead, added for one page, is how a
   shared format starts forking. Flagged for the header stream.
3. **"the Query Centre's drawer shell" does not exist** — see the recon table.
4. **The Filter and Group panels "built in the drawer round" are the To-do page's own**, not the
   Query Centre's; re-hosting means keeping them and changing their trigger.

---

## Concurrency

One session, `/todo` and the pane. This round necessarily touches four files outside that: three
in `src/components/queries/` and `shell/PageHeader.tsx`, all additively, all named above. The
Query Centre's own call sites are unchanged except the three toolbar mounts.

⚠️ **Another session is live in this checkout right now** — `TodoCalendarPage.tsx`,
`design-refs/action-journey.html` and `design-refs/.refhashes.json` are dirty and are not mine.
Every commit here stages by explicit path.
