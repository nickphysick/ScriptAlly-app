# F-O — package attach was a one-way door

`detachPackage` (`Queries.tsx`) had **zero callers**. A submission package could be attached to a
send and never removed as a package. Fixed, driven, and the harness account restored.

Two commits: the fix, and the restore.

---

## ⚠️ Which tree, and why

**Measured in a detached worktree** at `/Users/nickphysick/ScriptAlly-detach`; **committed by
explicit path from the primary tree.**

The baseline *was* obtainable in the primary tree and was taken there — tsc exit 0, build exit 0 with
no error or `[WARNING]` lines, Vitest **382 files / 6538 passed, 3 skipped**, at `80025e72`. Then
another session began editing `src/components/todo/ToDoPage.tsx` in the same checkout and added an
untracked `useTaskCommit.tsx`, and measurement became unwinnable: `bundleGuard` refuses a bundle
whose sources moved after it was built, so every rebuild was stale again before Playwright reached
sign-in. That is the race CLAUDE.md records as *"not slower — unwinnable"*, and global rule 3's
remedy. `node_modules` symlinked, `.env.local` and `tests/e2e/.auth/` copied in (both gitignored,
both the dev-only harness account) and **deleted with the worktree**.

Collision check before copying anything in: `git diff --name-only d9ec6461..HEAD --
src/components/Queries.tsx src/lib/packageAttach.ts tests/e2e/` returned empty.

**The final gate was run in the worktree, on top of the other session's commits** (`1a1fdc6f`):

```
tsc --noEmit   exit 0, 0 lines
vite build     exit 0, no error/[WARNING] lines
vitest run     6556 passed, 3 skipped   (baseline 6538 — the +18 are this pack's lock)
```

---

## Step 0 — recon

### R1 — what `detachPackage` writes, and what it deliberately does not

| | writes |
|---|---|
| `attachPackage` | `materialsWanted` (appends marked snapshot items) **and** `packageId: ""` |
| `detachPackage` | `materialsWanted` only |

**It misses nothing, and the asymmetry is correct.** Attach *clears* `packageId` as the snapshot
lands — its own comment says a snapshot is *"a REPLACEMENT of the link, not an addition beside it"* —
so by the time a group exists there is no link left for detach to clear. Re-clearing it would add a
key to `affectedKeys` for no change; **restoring** the pre-attach link would be wrong, because detach
is not an undo of the attach (the toast's undo is that), it is a removal of the items.

The one real consequence is not detach's to fix: a query linked by `packageId` that is then given a
snapshot loses that link permanently, because detach restores materials and not links. **That is
F-P, and it bit this very session — see the restore.**

### R2 — where attach happens

One place: the **Attach menu** (`F12Menu`, `.qc-mchip-add` trigger) → `packageMenuRow` →
`PackagePicker` → `attachPackage`. So under **D1** the removal belongs in that menu, and nowhere
else. No second entry point was added.

### R3 — the rules already permit clearing. **No rules change, no deploy.**

- `isValidQuery` (`firestore.rules:321`): `data.packageId is string && data.packageId.size() <= 128`
  — the key must be **present** and a string, so `""` passes.
  ⚠️ **`deleteField()` on `packageId` would be DENIED** (an absent key fails `is string`). `""` is
  the only honest clear.
- The query update allowlist carries `'materialsWanted', 'packageId'` side by side, with a comment
  saying they travel together because `materialsLinkWrites` writes one and clears the other.

A detach write of `{ materialsWanted: next }` satisfies both. **RED GATE not tripped** — nothing here
needs a rules edit, so nothing touches another session's in-flight work, and nothing is deployed.

### R4 — the post-detach render

`groupByOrigin` reads the items' marks. With the marked items gone there are no groups, so every
remaining pill falls to the `loose` bucket and `LooseMaterials` renders — **the floating treatment,
per D-C3/D4**. Confirmed by measurement below, not by reading the code.

### ⚠️ A correction to this pack's own premise

The previous report said *"clicking the chips' `×` did not remove them"*, and the prompt repeats that
framing. **That was wrong.** `.qc-mchipx` is `display: none` until `.qc-mchip:hover`; the earlier
harness clicked without hovering, so there was no box to aim at and the click could never resolve.
Hovered first, the `×` works and shows an undo toast.

So the accurate defect is narrower and still real: **the pills were individually removable; the
package was not removable as a unit.** Three removals and three separate undos for one decision, and
nothing on the page said those items belonged to one. The retired origin tag's comment claimed *"each
pill already carries its own ×"* as the reason its undo could go — true, and not the same act.

---

## Phase 1 — the fix

**`detachMenuRows(groups)`** in `packageAttach.ts`, beside `packageMenuRow`, so the rows are data and
the gate is testable without rendering a 6,000-line component. One row per package the send actually
carries, **named** (a send may legitimately draw on two, and a single "Remove package" would have to
guess), with a hint stating scope — `3 ITEMS` — not warning about it.

The name comes from the **group**, i.e. from the mark stored on the items, so it still reads
correctly after the package itself has been deleted — the same reason the strip shows it.

**One derivation, read twice.** `groupByOrigin` was hoisted out of the pills IIFE to the `sentExtra`
scope so the strip and the menu share it. Two calls could disagree: a menu offering to remove a
package no strip shows, or a strip with no way off it.

⚠️ Hoisting it above `materialsOf` first produced `TS2448: Block-scoped variable used before its
declaration` — caught because the reference shares the declaration's scope. **The same mistake one
helper deeper typechecks clean and throws at runtime**, which is why the declaration order carries a
note rather than a shrug.

**D2 — the wording.** Row: `Remove Standard UK`. Toast: `Removed 3 items from Standard UK`, with a
working undo that restores the list captured *before* the write. **No confirm**: the act is
reversible and this app's grammar for a reversible act is a toast with an undo — a dialogue would ask
the writer to be certain about something they can put straight back. Locked against
`lost|careful|permanent|warning|sure|…`.

> **⚠️ D2's sentence does not describe this model, and the difference matters.** The brief says a
> confirm should state that *"the materials the query was sent with are unaffected, only the package
> link is removed"*. That is the **link** model. In the snapshot model the items **are** the
> attachment, and removing the package removes what it brought — which is what `detachPackage` does
> and what D4 needs in order to have anything to fall through to. Implemented as the snapshot model;
> flagged rather than silently reconciled.

**D3 — a correction, not history.** No activity is appended; no status, date or count is written;
`recomputeQuery` is untouched. Locked by extracting the `updateQuery(…)` calls and asserting the
forbidden fields against **those**, not the function body.

---

## The round trip, driven

`tests/e2e/detachPackage.measure.ts`, at 1920×1000 against a local `vite preview` of a `build:dev`
bundle. Screenshots in `reports/detach/`.

```
clean query at row 1  ·  round trip on: Tom Ellery

attached → packed strips 1, name "Standard UK",
           chips ["Covering letter","Synopsis","Opening sample"]
"Remove Standard UK" offered in the attach menu: 1
toast: "Removed 3 items from Standard UK UNDO ✕"
after detach → packed 0, loose rows 1, chips ["Covering letter","Synopsis"]
after RELOAD → packed 0, loose rows 1, chips ["Covering letter","Synopsis"]
```

The reload is the part a unit test cannot reach: the removal **persisted**. And the surviving chips
are the writer's own materials, floating — the package's three went, `Opening sample` with them,
because only that one was purely the package's. **D4 confirmed by measurement.**

### D5 — the figures, before and after

```
                BEFORE   ATTACHED   AFTER
sent               7         7        7
replies            2         2        2
requests           2         2        2
byPackage    before === after : true
byMaterial   before === after : true
```

They do not move — and **the honest reason is not the one D5 assumes.** D5 expects the query to stop
contributing after a detach. It never started: `packageMetrics` filters `q.packageId === pkgId`, and
**nothing in the tracking layer reads the snapshot mark `fromPackageId` at all.** Attaching a package
in the Query Centre therefore adds nothing to that package's scorecard — measured: Standard UK read
`2 of 5 replied` before, during and after an attach of Standard UK.

So D5's *claim* holds (derived at read time, no stale count survives a detach) and D5's *premise*
does not (the snapshot path was never counted). That gap is **F-P**, below.

⚠️ **My first D5 capture read the arrow glyphs, not the numbers.** The dashboard renders
`7 → QUERIES SENT WITH A PACKAGE`, so "the token before the label" is `→`; `toBeTruthy()` waved it
through and the before/after comparison compared three arrows with three arrows. Now it takes the
last **number** before the label and asserts `/^\d+$/`.

⚠️ **And the first version of `readTracking` returned `undefined`.** `page.evaluate` treats a string
as an *expression*, so passing a function's source evaluated to a function object, failed to
serialise, and handed back `undefined` — which passed `not.toBeNull()`. Two vacuous shapes stacked:
a probe that measured nothing and a guard that let it.

---

## ⚠️ A defect I introduced, chased, and did not have

Adding a row pushed the attach menu past its cap, and the removal row measured at `y 920.1` in an
**800px** viewport — apparently 155px below the fold. I added `overflow-y: auto` to `.f12-menu` to
"make `constrain`'s `max-height` mean something".

**That was wrong, and it is reverted.** The items are not children of `.f12-menu`; they are children
of `.f12-menu-body`, which already carries `min-height: 0; overflow-y: auto`. Measured properly:

```
.f12-menu       max-height 200px   (set inline by useFixedMenu's `constrain`)
.f12-menu-body  scrollHeight 236 · clientHeight 188 · overflow-y auto · scrollable TRUE
```

**A scrolled-out child reports its position in the SCROLL CONTENT, not clamped to its container.**
So `y 920` in an 800px viewport is not evidence of anything: the row is inside a scroller that can
bring it into view, and the menu behaves correctly. The viewport-rect instinct is the right one —
this repo has a law about it — but the right question for an element inside a scroller is *"can it be
scrolled to"*, not *"is its rect on screen"*. `f12.css` is byte-untouched by this pack.

---

## Phase 2 — the harness, restored

`tests/e2e/restoreHarness.measure.ts`, through the **Node SDK** (`devWrite.ts`), never
`page.evaluate` — the served page is a bundle, so `import("firebase/firestore")` inside it throws,
and that failure is silent in a cleanup wrapped in a `.catch`.

**It sweeps by MARK, not by a list of query ids** — a hand-written list goes stale the moment a run
touches a different query and cannot know about a run that failed half way.

```
queries on the account: 44
  seed-pkgq-1  (agent seed-agent-1): 2 → 0 materials, dropped Standard UK
  seed-query-7 (agent seed-agent-7): 3 → 1 materials, dropped Standard UK
  seed-pkgq-1: packageId "" → "seed-pkg-1"
re-read: 44 queries · 0 still marked · 0 still unlinked
```

### ⚠️ The mark sweep was not enough, and F-P is exactly why

Stripping the marks left the account **still wrong**: `seed-pkgq-1` is seeded with
`packageId: "seed-pkg-1"` and **no** `materialsWanted` at all (checked in `seedPackages.mjs`'s own
query batch), and a measurement run had attached a snapshot to it — so `attachPackage` cleared its
link. Removing the marks restored its materials and not its link, and the package stayed a send
short, silently.

**Confirmed at the surface the writer reads**, which is the only place that settles it:

| | before the restore | after |
|---|---|---|
| queries sent with a package | **7** | **8** |
| Standard UK | `2 of 5 replied` | `2 of 6 replied` |

The restore therefore has two halves — strip the marks, and re-assert the seeded links from
`seedPackages.mjs`'s own `SENDS` table — and it **re-reads** rather than trusting its own writes,
because a cleanup that reports success from its intent is the fault this file exists to undo.

### Final state, re-verified after every probe had run

The visibility probes attached again after the first restore, so it was run once more at the end and
then checked on the page rather than from its own output:

```
DASHBOARD: sent 8 · replies 2 · requests 2
  REPLIES BY PACKAGE  Standard UK 2 of 6 replied · Comps-led variant 0 of 2 replied
scanned 12 queries · packaged strips found: 0
```

**Eight sends, six on Standard UK, and no snapshot attachment anywhere.** That is the seed state.
The restore is idempotent and safe to re-run; it is the tool this account needs whenever a
measurement attaches something, and it exists because the fix in Phase 1 did not exist when the
first one did.

### Left alone, deliberately

`seed-pkgq-3` and `seed-pkgq-4` carry `materialsWanted: ["First 10 pages"]` — plain strings, no
marks — alongside a `packageId`. The seed writes neither, so it is somebody's residue, but it is not
this pack's and it predates it. It also violates `materialsLinkWrites`'s "the link OR the materials,
never both". **Reported, not swept**: stripping another session's fixture on a guess is worse than
leaving two documents untidy.

---

## Locks — `src/lib/detachPackage.test.ts` (18 cases)

**The reachability case is the point of the file.** Every other assertion would have passed on the
broken build, because the function was correct — it simply ran for nobody. A behavioural lock cannot
tell a live function from a dead one, and this repo has lost a session to exactly that.

- `detachPackage` has a caller — a bounded `detachPackage(?![A-Za-z0-9_])` count **greater than one**
  (before this pack it was one: its own `const`);
- the rows come from the same `sentGroups` the strip draws;
- removal sits in the **same** `items={[…]}` array as attach, within 2,000 characters of it — D1 as a
  measurable claim, not an intention.

Behaviour is asserted with inputs **built by the real attach path** (`attachedMaterials(pkg,
packageItems(...))`), never hand-written fixtures — a literal goes green the day the mark changes and
the removal would then match nothing on a real send. Slice anchors are asserted before use.

**Proven red:** unmounting the rows fails three cases with *"detachPackage is unreachable again:
expected 1 to be greater than 1"*. Restored → 18/18.

⚠️ **One of my own probes had the substring fault this repo documents.** Forbidding `packageId:` over
the function body matched the **signature** (`packageId: string`) and went red on correct code. The
check now extracts the `updateQuery(…)` calls and asserts against those — *"does this function
mention the word"* and *"does this function write the field"* are different questions.

---

## Flags

### F-P — **two attachment models that do not talk, and one of them silently un-tracks a query**

Asked to check whether any other write path here is one-way. The bigger finding is next to it.

- **Link** — `packageId`, written by `EditQueryDrawer`'s package select and by CSV import. It drives
  **all** tracking (`packageMetrics` filters `q.packageId === pkgId`). It is removable: the drawer's
  select has an empty option, and `materialsLinkWrites` clears it.
- **Snapshot** — `fromPackageId` marks on `materialsWanted`, written by the Query Centre's Attach.
  It drives the strip. **Nothing in tracking reads it.**

**And attaching a snapshot CLEARS the link.** So attaching a package in the Query Centre to a query
that was linked removes that query from the package's scorecard, permanently, with no notice — the
send is still packaged, and the package stops counting it. Measured on this account: 8 sends became
7, and `Standard UK` went from `2 of 6 replied` to `2 of 5`, from one attach nobody was told about.

Not fixed: reconciling the two models is a model decision, not a repair. The options are visibly
different products (make tracking read marks; make attach preserve the link; retire one model), and
`materialsLinkWrites` exists precisely to forbid holding both.

- **Archive** — checked, **not** one-way. `status: "Retired"` is a field the update allowlist carries
  and the builder writes; nothing about it is irreversible in the data. What is missing is a
  **surface** to reverse it, which is the standing **F-H**, not a new flag.
- **Material → package references** — checked, **not** one-way and deliberately so. `resolveSlot`
  resolves against the **full** version list, retired materials included, so archiving a material
  leaves every package holding it intact and re-resolvable; a missing one reads `No longer
  available` rather than vanishing.

### Carried forward, untouched

| flag | state |
|---|---|
| **F-M** | blue tokens stay page-local in `packageGroup.css` pending Nick's consolidation ruling. |
| **F-L** | accepted as shipped. |
| **D-C1** | partial/full-sent strips still blocked on the `materialsWanted` → activities migration. |
| **F-H** | no un-archive surface. Now the nearer neighbour of F-P than of F-O. |
| **Move surface** | Correction UI's outstanding piece. |
| **Phase 5** of the broadsheet build | remains held. Nothing here is deployed. |

---

## Deploy record — dev only, 23 Aug

Asked for after the two commits above. **Dev rules are Claude's; prod remains Nick's, and prod was
not touched.**

### Rules — both databases, because `scriptally-dev` has two

`.firebaserc`'s `default` is the **prod** project, so every command named its target explicitly.

| database | pinned by | updateTime before | after |
|---|---|---|---|
| `(default)` | `firebase.dev.json` | `2026-08-23T15:29:38Z` | **`2026-08-23T20:47:55Z`** |
| `ai-studio-ae82196c-…` | `firebase.json` | `2026-08-22T10:04:05Z` | **`2026-08-23T20:48:19Z`** |

Verified by **release `updateTime` under `--debug`**, never the success line — which never names the
database. `gen-lang-client-0801391782` appeared **0 times** in either deploy log, and the second
command touched **0 hosting lines** (`--only firestore:rules` with `firebase.json`, whose hosting
site is `scriptally-app`, i.e. prod — the reason `--only` is load-bearing there).

### Probed, after propagation — `rulesProbe.mjs` gained this pack's section

The probe predated Part B and had no case for it, so it would have reported a clean vintage while
saying nothing about the fields just deployed. Six cases, and **both negatives matter**:

```
✅ package create — letter present              ACCEPTED
✅ otherMaterials on UPDATE                     ACCEPTED   ← the silent denial is gone
✅ otherMaterials cleared (deleteField)         ACCEPTED
❌ otherMaterials 513 chars (must be DENIED)    DENIED     ← the 512 cap is real
✅ update to an empty letter (must be ALLOWED)  ACCEPTED   ← legacy records stay repairable
❌ package create, NO letter (must be DENIED)   DENIED     ← create-only, as designed
   probe package removed: yes
```

The fifth and sixth together are the whole point of R3's split: **refused on create, permitted on
update.** A probe that only tried the happy path could not tell that from a rule applied everywhere.

### Hosting

`npm run build:dev` → `firebase deploy --only hosting --config firebase.dev.json --project
scriptally-dev` → **https://scriptally-dev.web.app**. Prod project id and prod site name both **0**
occurrences in the log. The deployed page references `assets/index-n4ujkbJb.js`, the exact asset the
build produced, and that bundle carries `qc-strip`, `qc-loose`, `otherMaterials`, `Not included` and
`Only the covering` — with `gen-lang-client-0801391782` absent.

### ⚠️ What is NOT on dev, and how that was proved

The page-header session is editing the shared shell **uncommitted** right now
(`WorkspacePageGrid.tsx`, `workspacePageGrid.css`, `workspacePageGrid.test.tsx`), and their WIP
deletes `.wpg-hem--top` — which makes **three `workspacePageGrid` cases fail in the primary tree**.

**None of it is deployed, and none of it is mine.** Two independent checks:

- the deployed stylesheet still **contains** `.wpg-hem--top`, the marker their WIP removes;
- a build of **committed HEAD in a clean worktree** produces `index-n4ujkbJb.js` — the identical
  hash to what is live.

And committed HEAD is green: **383 files / 6557 passed, 3 skipped**. The three red cases exist only
in the shared checkout's working tree.

