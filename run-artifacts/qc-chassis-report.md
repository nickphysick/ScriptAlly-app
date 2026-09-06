# To-do on the Query Centre's chassis — night one

**Where I stopped:** at the **Phase 1 boundary**. Recon (Phase 0) and Phase 1 are written and
committed; Phases 2–7 are night two. Full recon in `run-artifacts/qc-chassis-recon.md`.

⚠️ **Phase 1's MEASUREMENT did not complete, and that is stated first because it is the thing a
reader most needs to know.** The unit gates are green (tsc, the full 7,418-case suite, the
production build), but `tests/e2e/qcChassis.measure.ts` has not yet produced a trustworthy run —
see "The measurement's state" below. Nothing in this report claims a measured layout.

| phase | SHA | what landed |
|---|---|---|
| contracts | `af98bb58` | the three refs, enrolled (38 guarded) |
| 0 · recon | — | `run-artifacts/qc-chassis-recon.md`, no commit |
| 1 · header, tiles, toolbar | `<this>` | the page moves onto the Query Centre's own parts |

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

## The measurement's state — read this before trusting anything visual

`tests/e2e/qcChassis.measure.ts` exists, is scoped to the visible page, and asserts twelve claims
including the partition law and that both pages import the one shared module. **It has not
produced a clean run.** The one run that completed was the unscoped version (5 red, all of them
artefacts of reading the Query Centre); every run since has died in `auth.setup` under contention.

⚠️ **And I read a STALE REPORT once while establishing that** — the file on disk was the previous
run's, because the test deletes it at its own start and the run never reached that line. Identical
numbers read as "the change did nothing" rather than "the change never ran". The same fault I
recorded in the last round, in the same session.

**Night two starts by running it on a quiet machine**, red-proving each assertion, and only then
treating Phase 1's layout as measured.

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
