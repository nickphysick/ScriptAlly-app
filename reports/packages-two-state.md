# Submission packages — two-state page, workspace, drawer, and the attachment model

Parts A–C rebuild the page; **Part D fixes a real defect** in how a package attached to a query
behaves. Refs committed in Phase 1: `submission-packages-teach-first.html`,
`packages-workspace-drawer.html`, `query-attachments-model.html`.

---

## Baseline and tree

Primary tree, `main`, level with it, clean of source dirt at `24ad9a0f`.

```
tsc --noEmit   exit 0, 0 lines
vite build     exit 0, no error/[WARNING] lines
vitest run     383 files, 6561 passed, 3 skipped
```

⚠️ **A background run of the same suite reported `FAIL src/marketing/demoTimeline.test.ts` with no
test count** — a file-level *load* failure, not an assertion, while another session was writing.
Re-run in the foreground: clean. Recorded because a collection error and a real failure look
identical in a summary line, and this checkout is shared.

`origin/main` is 12 behind local. Nothing is pushed and nothing is deployed here except the dev rules
Phase 2 is authorised to send.

---

## Step 0 — recon

### R1 — what renders the page, and where the split sits today

`src/components/SubmissionPackages.tsx` (473 lines), mounted once from `App.tsx:739`.

**The split is `msPackages.length > 0`** (line 381): with at least one package it renders the
workspace (`PackagesBand` → `MaterialsBand` → `TrackingBand` → `FootnoteBand`); otherwise
`PackagesOnboarding`.

⚠️ **So the boundary moves under D-A.** Today a writer who has saved three materials and built no
package still sees the onboarding screen — their materials are invisible. The spec is
`materials + packages === 0`, which puts *materials but no package* into the **workspace**, where
D-B2's shelf shows them. That is a behaviour change, not a re-skin, and it is the more important
half of Part A.

### R2 — Comparable titles' first-visit, and what is genuinely shared

`src/components/manuscripts/compsMarketing.tsx` (293 lines) — and it **imports nothing but React**,
which is what makes reuse possible at all.

| export | shape | reusable as-is? |
|---|---|---|
| `CompCarousel` | `{ slides: CompSlide[]; label: string }`, autoplay `4200ms`, dot nav, `1 / n` count, `data-slot` on the plate | **yes — already generic**, its own header says "a list, not five hardcoded blocks … one implementation serves both placements" |
| `StagesBlock` | no props; heading, sub, and `COMP_STAGES` all hardcoded | no — needs heading/sub/stages lifted to props |
| `FeatureBlock` | comps copy + `ct-btn-dark` CTA + carousel toggle | no — comps-specific |
| `CompSlide`, `COMP_SLIDES`, `COMP_STAGES` | data | data, not shared |

Conventions to match: slot ids are lower-kebab on `data-slot` (`comp-job-shelf`), the solid near-black
CTA is **`.ct-btn-dark`**, and stage discs render `.ct-stage-slot` + `.ct-lbl`. Styling is `ct-`
prefixed in `comps.css`.

**Their pattern is still moving** — `d2eea487 comps v3.1 §7–8` is the most recent commit on the file.
Per the brief, Part A builds to what is on `main` and flags divergence rather than inventing a third
variant. The plan: **import `CompCarousel`** (no edit to their file, so no collision), and build the
hero and stage strip page-local against their structure. F-S carries the shape a genuinely shared
component would need.

### R3 — the attachment shape, and it is THREE shapes, not two

`Query` carries **both fields**:

- `packageId: string` — **required**, `""` when none (`types.ts:552`, "Links to active
  SubmissionPackage").
- `materialsWanted?: (string | QueryMaterial)[]` — **optional**, a backward-compatible union
  (`types.ts:560`). `AttachedMaterial extends QueryMaterial` adds `fromPackageId`, `fromPackageName`,
  `fromVersionId` — the snapshot marks.

So a query can be in any of:

1. **link** — `packageId` set, no list;
2. **loose** — a list of plain strings / `QueryMaterial`;
3. **snapshot** — a list whose items carry `fromPackageId` marks (the model the Query Centre's
   Attach writes, and which `attachPackage` pairs with `packageId: ""`);
4. **both** — `packageId` *and* a list. Structurally possible; `materialsLinkWrites` forbids it, but
   only on the paths that go through it.

**Audited on the dev harness account (`tests/e2e/auditAttachments.mjs`, read-only by default):**

```
queries: 44
  package link ONLY        6
  loose materials ONLY     4
  ⚠️ BOTH (D-D4 migrates)   2
  neither                  32
  carrying snapshot marks  0
```

**F-Q, with the real rows:** `seed-pkgq-3` and `seed-pkgq-4`, both `packageId="seed-pkg-1"` carrying
a loose `["First 10 pages"]`. These are the exact two flagged as pre-existing residue in
`reports/detach-package.md` and left alone there for want of a rule; **D-D4 is that rule**, and the
migration drops the list and keeps the link.

**Snapshot marks: zero.** The account is clean of model 3, so D-D1's "no snapshot, no copied
materials" has nothing to unpick here — the marks were measurement residue and were swept last
session.

**And D-D5's bug is now explicable.** The chips read `Covering letter` / `Synopsis` rather than
`Hook-first` / `One-page` because they are rendered from the *material names* in `materialsWanted` —
canonical type strings — instead of resolving the package's slot version ids to their
`versionName`s. That is the leak the brief names.

### R4 — nothing stops a sent package being edited, and rules alone cannot stop it

Confirmed in all three places the brief asks about:

- **builder** — `PackageModal` has no sends input at all; its only disabled state is `noLetter`;
- **`updatePackage`** — no guard; it writes whatever fields it is handed;
- **rules** — `allow update` permits
  `hasOnly(['packageName','queryLetterVersionId','synopsisVersionId','samplePagesVersionId','otherMaterials','status'])`
  unconditionally.

⚠️ **The finding that shapes Phase 2: Firestore rules cannot determine sent-ness.** Sent-ness is "some
query somewhere holds this `packageId` and has gone out", and rules can `get()` a document by path
but cannot query a collection for matches — there is no reverse index from package to queries. So
*"a sent package's slot fields are immutable"* is **not expressible** against today's document shape.

It becomes expressible with **one additive field on the package** recording that it has been sent.
The rule then reads `existing()` and forbids slot changes once that field is present — an honest
server-side immutability guarantee, with the client owning when the mark is set. The alternative
(client-only enforcement) leaves the rule the brief asks for unwritten.

**This is a deliberate stored value where the house rule prefers derived**, and the reason is
specific: derivation is impossible in the one place enforcement has to happen. Phase 2 states the
field, its single writer, and why.

### R5 — there is no neutral drawer primitive to reuse

| candidate | what it is | fits Part C? |
|---|---|---|
| Noteboard "What writers keep here" | **page-local markup** — `.nb-drawer` in `TodoNoteboardPage.tsx` + `todoNoteboard.css`. Not a component. | closest analogue, but nothing to import |
| `Form11Drawer` | the shared **Form 11 editing** shell: parchment body in a burgundy inset clip, lean-then-straighten entrance, die-cut spine tab, punch-hole rail, Lottie pencil | no — that chrome says "you are editing a record"; this is an explainer, and the packages page is single-look |
| `CorrectionSheet` | Query Centre's correction fork, feature-specific | no |
| `MobileSheet` | below-`md` chassis | no |

**So Part C builds page-local**, and the honest consequence is that the Noteboard's explainer drawer
and this one become two page-local implementations of one shape. Flagged rather than pretended away
— extracting a neutral `SidePanel` is a real candidate and is the same conversation as F-S.

### Concurrency — all three gates clear

- **Page-header session**: `src/components/shell/` clean, nothing held in any worktree. No shared
  header edit is anticipated; **RED GATE if that changes**.
- **Comparable titles**: their files are committed and clean; the plan imports `CompCarousel`
  without editing it.
- **Query Centre / Correction UI**: `reading-pane/` and `Queries.tsx` clean in this tree and
  unheld in every worktree; `CorrectionSheet.tsx` last touched 20 Aug. **Settled — Part D may
  proceed.**

### Red gates — none tripped

All three refs were present in `~/Downloads`; no required edit lands in a do-not-touch or
shared-header file; Correction UI is settled.

---

---

## Phase 2 — Part D's data layer: the lock, the rules, the migration

### The stored field, and why it is stored

`SubmissionPackage.firstSentAt?: string` — ISO stamp of the first send. Absent = editable; present =
the three version slots are frozen.

**R4's finding forced this.** Sent-ness is *"some query holds this `packageId` and has gone out"*.
Firestore rules can `get()` a document by path but **cannot query a collection**, and there is no
reverse index from a package to its queries — so the derived form is **not expressible in the one
place enforcement has to happen**. Stated at the field, in the rule, and in the lock's test.

**It is permanent.** A package that went to twelve agents does not become editable by deleting the
queries; what those agents received is a fact about the world, not about the records still in the
app. ⚠️ **The cost is that a MIS-ATTACH also locks** — attach the wrong package and it is frozen
having never actually gone out. `Duplicate & edit` (D-D2) is the design's answer; clearing the stamp
when the last attachment goes is a **proposal, not a decision** — see F-T.

### What the lock freezes, and what it deliberately does not

Frozen: `queryLetterVersionId`, `synopsisVersionId`, `samplePagesVersionId`.
Open: `packageName`, `status`, `otherMaterials`.

**Renaming a sent package is not changing what went** — a name is the writer's own filing label, and
freezing it would punish tidying while protecting nothing. Freezing `status` would make a sent
package impossible to archive, which is the un-archive trap (F-H) one step along.

### Two layers, and neither is redundant

- **The rules are the guarantee** — they cannot be talked out of by a bug in `db.tsx`.
- **`updatePackage` is the explanation** — it returns the reason, so a refusal does not arrive from
  three layers away as `Database transaction error`.

⚠️ **And `savePackageDraft` was still discarding that return.** Left as it was, editing a locked
package would have closed the modal reporting success — the exact *"edited the package, query
unchanged, no feedback"* fault being fixed, reproduced one layer up. Now returned and shown.

`markPackageSent` is the stamp's **single writer**, idempotent by reading first: the FIRST send is
the fact, and re-dating on every later send would make "sent on" silently mean "last sent on".

### Deployed to dev, both databases

| database | updateTime |
|---|---|
| `(default)` | **2026-08-24T10:34:14Z** |
| `ai-studio-ae82196c-…` | **2026-08-24T10:34:23Z** |

`gen-lang-client-0801391782` appeared **0 times** in either log; the second command touched **0
hosting lines**.

### The gate — proven on the deployed database, both halves

`rulesProbe.mjs` gained eight cases. **Both halves, because "a sent package's slots are denied" is
satisfied by a rule that denies every slot write** — which would break the feature and still pass.

```
✅ UNSENT — slot write (must be ALLOWED)        ACCEPTED   ← it is a lock, not a wall
✅ stamp firstSentAt                            ACCEPTED
❌ SENT — slot write (must be DENIED)           DENIED
❌ SENT — letter slot too (must be DENIED)      DENIED
✅ SENT — rename (must be ALLOWED)              ACCEPTED
✅ SENT — archive (must be ALLOWED)             ACCEPTED
❌ SENT — re-stamp firstSentAt (must be DENIED) DENIED     ← write-once
❌ SENT — clear firstSentAt (must be DENIED)    DENIED     ← left mutable, this IS the unlock
   probe package removed: yes
```

### F-Q — the migration, with rows

`tests/e2e/auditAttachments.mjs`, **read-only by default** — "how many are affected" is a question
you ask *before* deciding to change anything, and a script that answers it by changing them cannot
be run twice for the same answer.

```
queries: 44 · link ONLY 6 · loose ONLY 4 · BOTH 2 · neither 32 · snapshot-marked 0

seed-pkgq-3  packageId="seed-pkg-1"  dropping 1: ["First 10 pages"]
seed-pkgq-4  packageId="seed-pkg-1"  dropping 1: ["First 10 pages"]
migrated 2 · re-read: 44 queries, 0 still holding both
```

**Two, and they are the pair `reports/detach-package.md` left alone for want of a rule.** D-D4 is
that rule. The link wins; the list is **unset**, never emptied to `[]` — an empty array is a stored
claim that the writer listed nothing.

**Zero snapshot-marked queries**, so D-D1's "no snapshot, no copied materials" has nothing to unpick
on this account.

### Locks — `src/lib/packageLock.test.ts` (18 cases)

Proven red twice: making the stamp mutable in the rule fails *"a sent package's three slots cannot
change"*; dropping the client's reason fails *"it RETURNS the reason rather than throwing or
shrugging"*.

```
tsc 0 · build 0, no error/[WARNING] lines · vitest 384 files, 6579 passed, 3 skipped
                                            (baseline 383 / 6561)
```

---

## Phase 3 — Part A, the first-visit state

`PackagesTeachFirst` + `packagesTeach.css`. Hero (Playfair headline, prose, solid near-black CTA),
auto-advancing four-job carousel with dot navigation and a dashed slot per card, and the three-stage
strip below. Copy verbatim from the ref.

**The boundary moved**: `materials + packages === 0`, derived, no stored flag. It was
`packages > 0`, so a writer with three saved materials and no package met the teaching screen while
their materials were invisible.

### ⚠️ D-A4 was still broken after the rebuild, and only the measurement said so

`PackagesHeroBand` and `MaterialsBand` rendered **unconditionally, above the branch** — so the new
teaching state came up with **three empty material columns, three ghost rows and seven zero counts**
beneath its own hero. That is precisely the fault Part A exists to fix, surviving the rebuild because
the branch was the only thing anyone thought to switch. Reading the JSX did not show it; the probe
did, first run:

```
before: {"materialColumns":3,"packageCards":0,"ghosts":3,"tracking":0,"zeroCounts":7}
after : {"materialColumns":0,"packageCards":0,"ghosts":0,"tracking":0,"zeroCounts":0}
```

### ⚠️ And the ref's `line-height: 1.12` really does crop

I wrote a comment asserting 1.12 was safe *because the headline is a fixed constant rather than
writer-supplied*. It is not: measured at both widths, `scrollHeight 138` against
`clientHeight 134` — four pixels of `g` and `y` gone from the largest text on the page. Raised to the
standing **1.3** floor; now `156 / 156` at both widths.

**Which is the Playfair-descender law's own story repeated**: a value fitted to a drawing crops the
words underneath it, and a comment asserting otherwise is not evidence. The comment now records
being wrong rather than being deleted.

### Measured, at both widths, on an emptied account

`tests/e2e/packagesTeach.measure.ts`. `seedPackages.mjs --clean` to reach the state, re-seeded after.

```
teach-first present: 1
furniture: all zero (columns, cards, ghosts, tracking, zero-counts)
headline : "Fed up of guessing which materials are landing with agents?"  · 156/156, unclipped
carousel : 4 slides · slot label "SLOT · PKG-JOB-RECORD · 396×214"   ⚠️ SUPERSEDED — see the v2 inventory below
stages   : Stage one / Stage two / Stage three · 3 discs
filled controls: ["Add your first material"]   · horizontal overflow: 0px
```

⚠️ **The filled-control probe counts controls that carry WORDS.** The carousel's active dot is a
solid burgundy button with no label — a position indicator, not a call to action. Counting it
reported two and would have had me lighten a dot to satisfy a rule about buttons; the comps carousel
this mirrors fills its active dot the same way.

### Three files deleted, because they became unreachable

`PackagesOnboarding.tsx` had no caller once the branch changed, which made `packagesOverview.css`
dead with it and **my own `packagesOverviewSweep.test.ts` vacuous** — a lock asserting that every
class in a sheet is rendered by a component that is now mounted nowhere. All three removed rather
than left to read as live.

`materialsBand.test.ts` lost its `onboarding` half: a loop over a deleted file is a case that asserts
nothing. **And one of its cases had to change shape** — it counted exactly three `setMatPreselect(null)`
calls, so it went red on a fourth, entirely correct entry point (the first-visit CTA). A literal
count is not *"every entry point clears it"*; it is *"there are three entry points"* — a claim nobody
meant to make, which fails on the change it should welcome. It now counts the opens and requires a
preselect beside each.

```
tsc 0 · build 0, no error/[WARNING] lines · vitest 383 files, 6575 passed, 3 skipped
```

---

## D-D2 / D-D3 — shipped WITH the lock, because Phase 2 had opened a gap

**The brief says `Duplicate & edit` "must ship with it, not after", and Phase 2 shipped the lock
without it.** For the length of one commit a writer could meet a frozen package, be told why, and be
offered nothing — the rule as a dead end. Closed here rather than left for Phase 6.

- **`PackageModal` gained a duplicate mode** — `duplicating` seeds the form and `editing` stays
  **null**, so Save takes the `addPackage` branch and the sent package is never the write target.
  That is the whole point: a duplicate is a create.
- **`duplicateName`** picks the first free `<name> vN`, stripping any existing suffix so duplicating
  a `v2` gives `v3` rather than `Standard UK v2 v2`.
- **The card carries the note** (D-D3) — `Locked — this package has been sent`, the reason beneath
  it, and `Duplicate & edit` **inside the same box**. A note that states a refusal with its remedy
  elsewhere on the page is where a reader stops.
- **It reports, it does not warn.** Sage tint, no blush, no amber: a sent package having stopped
  changing is the feature working, not damage. Asserted — the rule must contain `sage` and must not
  reach for a caution palette.

The three entry points are mutually exclusive by construction (open-to-edit clears duplicating,
duplicate clears editing, New clears both), and that is locked rather than assumed.

Six further cases in `packageLock.test.ts` (24 total). **Proven red** by removing the card's locked
block: two cases fail naming the missing block.

⚠️ **One existing lock had to be re-pointed, not re-written.** `packageShapes.test.ts` asserted the
literal `editing ? (isSlotFilled(editing.synopsisVersionId)`; the builder now reads a `seed` that is
either the edited package or the copied one. The **claim** — an empty slot is never silently
re-filled — is unchanged and now covers both modes; only the expression widened.

```
tsc 0 · build 0, no error/[WARNING] lines · vitest 383 files, 6581 passed, 3 skipped
```

---

## Part B — the workspace

`PackagesBand` → object cards, `MaterialsBand` → one shelf, `TrackingBand` → one panel. The
derivations already existed: `packageTiles` / `tileFooter` feed the cards, `requestsByMaterial` and
`trackingNudge` feed the panel. Two new pure functions — `materialShelf` (flat, sorted by type,
**empty types absent**) and `composition` (the card's one line).

- **D-B1** — art panel lid, Playfair name, one-line composition, three-cell scorecard footer, ghost
  card last. An omitted slot reads `no sample`, not `Not included`: this is a sentence about what the
  package sends, and `Not included` is a stated choice that belongs in the builder's list.
- **D-B2** — 196px paper sheets, folded corner, watermark of their type, one add card. **An empty
  type does not appear at all** — the columns stated a heading, a `0 held` and a ghost for every type
  a writer had not used yet.
- **D-B3** — "Replies by package" **deleted**; those figures are the cards' footers. Counts, never
  percentages. Pre-send is the nudge alone, without the two dashed ghost panels that promised tables.
- **D-B4** — one derived stat line, filled `New package` as the page's only filled control.

### ⚠️ Packages did not lead until the screenshot said so

The first render put materials first — a filing cabinet with the point of the feature underneath it,
`Your packages` below the fold at 1440. Fixed, and now asserted **by document position** rather than
by reading the JSX: `pkgTop 653` against `shelfTop 1327` at 1440, `599 / 1025` at 1920.

### D-B5 — descenders measured, and this time they were fine

The Part A ref's `1.12` cropped `g` and `y` by four pixels, so the card and sheet headings were
measured rather than trusted: **`16px / 20.8px`** on the sheet name (a 1.3 ratio) and no clipped
heading anywhere across `.pkgb-pkgname`, `.pkgb-mname`, `.pkgb-n`, `.pkgb-gt` at either width. The
ref's values were kept only where the measurement agreed with them.

### Measured, both widths, active fixture

```
package cards 2 · repliesByPackagePanel 0 · scorecards-on-cards 2 · labels Sent/Replied/Requests
matColumns 0 · shelves 1 · sheets 4 · addCards 1 · ghostPkg 1 · percentSigns 0
clipped headings [] · filled ["＋ New package"] · horizontal overflow 0px
```

### What the rewrite orphaned, and what was done about it

`STAT_ICON` and `BarPanel` lost their caller inside `TrackingBand` the moment the render changed —
**removed**, because an unreferenced component sitting in a file is the shape this build has twice
found costing a session. `STAT_CELLS`, `repliesByPackage` and `ledgerRows` are **unmounted but kept**:
still exported, still unit-locked, still drawn by the DEV `#/pkg-lab` route. That is a mount being
removed, not a derivation being deleted, and the file says so.

### Four locks moved, and one claim was retired rather than repointed

- *"passes a type from both the add button and the ghost"* — **retired**. It asserted two type-bearing
  entry points per column; the shelf has neither, by D-B2. The weaker surviving claim replaces it.
- *"prints the usage line's number from the derivation"* — the shelf's loop binds `sh`, not `s`, so a
  case about **where a number comes from** broke on a variable rename. Now `/\.usedIn\b/` — the
  property, not the identifier.
- Two more repointed to the new class names, claims unchanged.

The shelf also now **bolds the count from `usedIn`** rather than printing the pre-formatted string —
the same field the delete guard reads, so the sheet can never say a material is free while the guard
refuses to remove it.

```
tsc 0 · build 0, no error/[WARNING] lines · vitest 383 files, 6581 passed, 3 skipped
```

⚠️ **Baseline note:** this session opened with **one pre-existing failure**
(`src/marketing/marketingLinks.test.tsx`, the marketing session's). It was fixed by that session
mid-run, so the close is fully green rather than "no worse than baseline".


---

## Ruling 2 — the stamp is wired

### F-T · which path carries it, and why it is atomic there

**R1 — every path that puts a real `packageId` on a query:**

| path | writes a link? | stamped? |
|---|---|---|
| `EditQueryDrawer` → `editMaterialsUpdate` → `materialsLinkWrites` → `commitQueryEdits` | **yes** — the only UI path | **yes** |
| `ImportCsv.tsx:522` — `packageId: "pkg-seed-default"` | yes, a **placeholder id defined nowhere in the repo** | **no** — see below |
| `Queries.tsx` `attachPackage` (Query Centre) | **no** — writes `packageId: ""` | n/a |
| `draftToPayload` (logging a query) | **no** — writes `packageId: ""` | n/a |
| `seeds.ts`, `seedPackages.mjs` | fixtures, not app paths | no |

**R2 — atomicity.** `commitQueryEdits` already batches everything (`writeBatch` →
`batch.update(queryRef, queryPatch)` → `commit()`). The stamp is one more `batch.update`, on the
package ref, **inside that same batch**. So there is no window in which a package is locked with
nothing sent, or a send renders a package that can still change under it.

**R3 — attaching IS sending**, confirmed for both link paths: `QueryStatus` has no unsent member, so a
query record is a send. The Query Centre's attach is out of scope because it creates no link at all.

**⚠️ And that is the principled reason the Query Centre path is left unstamped, not an omission.**
The lock exists because a LINK renders the package's live contents. The Query Centre writes a
*snapshot* — names and version ids copied onto the query — so editing the package afterwards
misreports nothing, and there is nothing for a lock to protect. **The stamp follows the link.**

**ImportCsv is deliberately unstamped.** Its `packageId` is the literal `"pkg-seed-default"`, a
fallback id that exists nowhere in the repo, and `addQuery` writes per row with no batch — so a stamp
there could not be atomic *and* would lock a package that may not exist. D1's instruction is
explicit: leave the path unstamped rather than ship a stamp that can drift.

### The write-once problem, and who owns it

Re-stamping is **DENIED** by the deployed rule, and a denied write **fails the whole batch** — so a
writer re-selecting the same package, or correcting an unrelated field on an already-sent one, would
have their entire save refused. So the **caller** decides: the drawer has the packages in hand and
sets `stampPackageId` only for one that is not already stamped.

⚠️ **The race is acknowledged, not hidden.** Between that check and the commit another client could
stamp the same package and the batch would be refused. One writer, one session — and the refusal is
**shown** in `saveError` rather than swallowed, which is the difference that matters.

`hasQueryEdits` had to learn about it too: without that, a save carrying **only** the stamp
short-circuits at the no-edits guard and the package never locks.

### R4 · the rule, re-read

Keys on `firstSentAt`; `hasOnly` permits it; write-once via
`!existing().keys().hasAny(['firstSentAt']) || !affectedKeys().hasAny([...slots, 'firstSentAt'])`.
Stamping an **unstamped** package satisfies the first clause, so the slot-immutability arm is never
consulted — proven `ACCEPTED` by `rulesProbe` before this wiring existed.

### R5 · the data state, before and after

**Before: nothing was stamped**, and both seed packages had sends — the account was in exactly the
defective state. After the drive:

```
seed-pkg-1   stamped=2026-08-24T12:56:27   linked-queries=7
seed-pkg-2   stamped=NO                    linked-queries=2   ← still unstamped
```

⚠️ **`seed-pkg-2` remains unstamped and therefore still editable despite two sends.** Historical rows
are not backfilled — the stamp is permanent and unclearable, so backfilling real data is a one-way
act I have not taken unasked. **A decision for Nick**, and the audit tool (`tests/e2e/stampAudit.mjs`)
reports the gap on demand.

### Driven, end to end

```
BEFORE  seed-pkg-1 firstSentAt=NO
        → drawer → package select ["Custom materials","Standard UK","Comps-led variant"]
AFTER   seed-pkg-1 firstSentAt=2026-08-24T12:56:27.013Z          ← the stamp landed with the link

locked note   : "LOCKED — THIS PACKAGE HAS BEEN SENT"
refusal shown : "Locked — this package has been sent. Its contents are fixed so every query that
                 used it keeps reporting what the agent actually received."
modal          : stayed open · the slot did not change
Duplicate&edit : title "DUPLICATE PACKAGE" · name "Standard UK v2" · pre-filled ·
                 save "Save as a new package"
```

Rename, archive, re-stamp-refused and clear-refused were already proven **on the deployed database**
by `rulesProbe`'s eight cases and are not re-driven here — the rules evidence is the stronger of the
two. D4 (detach does not unstamp) is asserted at source: `detachPackage` contains no `firstSentAt`.

### ⚠️ Two harness traps worth keeping

**The drawer is unreachable from the desktop Query Centre.** Its Edit control sits inside
`isMobile && mobileDetailOn` — the standing **F10**. The drive signs in at desktop (the harness's own
sign-in wait watches `.ws-panel`, which is **hidden** below `md`, so opening straight at 375 times
out in the harness rather than in the app) and then resizes to 375.

**`force: true` was worse than the timeout it fixed.** `.pkgb-pkgcard:hover` lifts the card 4px, so a
real click never settles and Playwright retries out. `force` skips that check and fires at the
recorded **coordinates**, which by then belong to a neighbouring control — it opened the **edit**
builder instead of the duplicate, reporting `title="EDIT PACKAGE"`. That reads exactly like
*"Duplicate & edit is wired to the wrong handler"* when the wiring is correct. Dispatching on the
element cannot hit a neighbour. **A person is unaffected either way** — the whole card moves together
and the cursor stays on target.

### Measured in a worktree

The primary tree's bundle was overwritten twice mid-run — once stale from the other session's `src/`
edits, once replaced by their **production** build (which `bundleGuard` caught, refusing to point the
harness at prod). Measurement moved to `/Users/nickphysick/ScriptAlly-stamp`; commits are
explicit-path from the primary tree.

```
tsc 0 · build 0, no error/[WARNING] lines · vitest 383 files, 6587 passed, 3 skipped
                                            (baseline 383 / 6581)
```

### F-U — `#/pkg-lab` is now the last caller of three derivations

`STAT_CELLS`, `repliesByPackage` and `ledgerRows` lost their page mount in Part B. Their **only**
remaining caller is the DEV-only `#/pkg-lab` route. That route must go before any prod deploy — and
when it does, those three lose their last caller. Recorded so a future sweep finds the dependency
rather than rediscovering it.

### Not done in this run

**D-D5 was not attempted.** D6 makes it conditional, and recon confirms the condition holds —
`packageItems` resolves each slot id to its `versionName` and carries the `ComponentType` for the
eyebrow, and the strip renders `materialsWanted`'s canonical type strings instead. It is one
substitution. It was left rather than started thin: the brief's own instruction is not to let it grow
into a second feature inside this run, and there was not room to drive it properly.

---

## D-D5 — a linked package's chips name its real materials

**⚠️ The brief's diagnosis was wrong, and the finding is more interesting than the fix.** It expected
the leak to be a substitution inside the packaged strip. It was not: **a linked query rendered no
materials at all.** It rendered ONE chip carrying the package's *name*, with the canonical type
strings — `Covering letter · Synopsis · Sample pages` — hidden in a `title` **tooltip**. So a writer
could not see what went without hovering, and what they saw when they did was the *type* of each
slot rather than the material in it.

The strip the brief was describing only ever rendered for **snapshot** attachments, and D2 forbids
touching those. So D1 could only mean the linked case, and the linked case had no strip.

**It was still one substitution in weight** — `linkedChips(pkg, versions)` over the existing
`packageItems`, rendered through the existing `PackageGroup`. No new component, ~20 lines. So it did
not trip D4, and the report records the discrepancy rather than the fix pretending the diagnosis
held.

Read off the rendered strip at 1440, not off the derivation:

```
CHIPS: [{"eyebrow":"LETTER","name":"Hook-first"},
        {"eyebrow":"SYN","name":"One-page"},
        {"eyebrow":"SAMPLE","name":"Chapters 1-3"}]
edit affordances inside the strip: {"removeX":0,"attach":0}      ← D-D6 holds
```

`pkgComponents`, the derivation that filled the tooltip, is deleted — it had no other caller.

**D3** — a filled slot whose version has been deleted renders muted *"No longer available"*, the same
words the packages page uses. Locked with a fixture, since the harness has no deleted version.

⚠️ **`Sample` rather than `Opening sample` is not the unit problem.** The standing law forbids
labelling `SAMPLE_PAGES` "Sample pages" because three unit choices map to that one type. `Sample`
asserts no unit — it names the slot, and the version's own name carries the specifics.

⚠️ **And one probe fault worth keeping:** the eyebrow's source string is `Letter`; `innerText`
returns `LETTER`, because `text-transform: uppercase` is what the reader actually sees. A probe
comparing against the source is asking about a string nobody reads. Compared case-insensitively.

### F-V — the comparison could not be made on screen

**There are no snapshot-attached queries on the account** (`snapshot queries: 0`) — the marks were
swept in an earlier session's restore, and nothing has created one since. So how a snapshot reads
*beside* a linked strip could not be photographed.

From the data model, though, the answer is clear and worth Nick's attention: a snapshot stores
`material` (the canonical type string), `fromPackageId`, `fromPackageName` and `fromVersionId` — but
**not** `versionName`. So a snapshot strip can only ever say `Covering letter`, while a linked strip
now says `LETTER Hook-first`. **They are distinguishable — but only by the reader noticing that one
names materials and the other names types**, which is a difference nobody has been told to look for.
Both are wrapped in the same blue packaged strip with the same seal.

**That is a design problem, not something to fix here.** The two could be reconciled by resolving
`fromVersionId` for snapshots too — but the snapshot's own comment argues against live lookups, and
D2 forbids the change. Flagged as it stands.

### ⚠️ Found while driving: a package and a loose row DO render together

`reports/packages-two-state/dd5-linked.png` shows one query rendering **both** — pink
`Covering letter` and `Synopsis` chips with `+ Attach` and `SAVE AS PACKAGE ›`, *and* the blue
`Standard UK` strip beneath them. That is the first of Part D's three reported faults, on screen.

It is **not stored** as both: `materialsLinkWrites` cleared the list, and the loose chips come from
the pane's fallback, which displays the AGENT's expected materials when the query's own list is
empty. So the data obeys the either/or and the render does not.

Out of scope here — it is D-D4, carried — but this is the clearest evidence yet of why that phase
matters, and it now has a screenshot.

```
tsc 0 · build 0, no error/[WARNING] lines · vitest 383 files, 6593 passed, 3 skipped
                                            (baseline 383 / 6587)
```

---

## F10 — recon, and the RED GATE trips

**The mobile gate is deliberate. Desktop editing lives elsewhere, and it is not a drawer.** Per the
brief, I stopped here rather than add a desktop Edit button.

### R1 — why Edit is gated to mobile

`git log -S "qh-mq"` returns exactly one commit: **`7b86c290` (30 Jul) — *"mobile: queries — list to
pushed detail, espresso command bar, sheeted response flow (P4)"***.

The control was **added for mobile**, not removed from desktop. Mobile gained a pushed detail view
with no room for in-place affordances, so it got a drawer. Desktop never had the button because
desktop never needed one.

### R2 — what desktop already offers, read off the running pane

```
IN-PLACE EDITABLES
  Imogen Farr          title="Open the agent list"
  5 weeks · Waiting so far     title="Change the date this was sent"
  16 Sept · Reply expected by  title="Change when a reply is expected"
  Email                title="Change how this query was sent"
  The Quiet Fixture    title="Open your manuscripts"
```

**Three of the query's own fields are editable in place, each with a `title` beginning "Change".**
That is a deliberate editing model, not an absence of one: on desktop a writer edits a query by
clicking the thing they want to change. The drawer is the *mobile* equivalent of this pane, not a
desktop feature that was forgotten.

Query-level actions sit in the bar above — `Record response`, `Nudge`, `Mark closed`, download,
`Delete` — and none of them is an "edit query" door.

### R3 — Correction UI's reach, and the overlap

The timeline `⋯` offers **`Edit` / `Delete…`**, and it edits **timeline entries** — a rung's date,
kind and text. It does not reach query fields, and it should not: an entry is a record of something
that happened, and `packageId` is a property of the send.

**So there is no overlap to reuse, and that is the useful part of the answer.** Every editing route
desktop has is *in place, on the thing being edited*: the send method on the send method, the dates
on the dates, an entry from the entry's own menu.

### The one thing desktop cannot do

**Point a query at a package.** The `＋ Attach` menu does carry `Attach a submission package` (when
the manuscript has one — it is correctly absent on a manuscript with none, which is what the probe
caught), but that path is `attachPackage`, which writes a **snapshot** and `packageId: ""`. It does
not create the link, so it does not stamp and the strip does not render live contents.

The **link** — the model Part D standardises on and the only thing `markPackageSent` rides — is
reachable on desktop from nowhere.

### Recommendation — and it is F-W's answer too

**Do not add a desktop Edit button.** It would give desktop a second editing model beside the
in-place one, for a single field, and a writer looking to change a package would still have to learn
that this one field is behind a door while the send method beside it is not.

**Put the pointer controls in the reading pane, in place, on the strip** — which is exactly what
**Ruling 1** already specifies and what is not yet built:

> one footer: the lock note (when the package is stamped sent) plus **Change package / Remove**
> (always).

`Change package` on the strip is the same gesture as `Change how this query was sent` on the send
method. It routes through `materialsLinkWrites` + `stampPackageId`, so desktop starts stamping the
moment it ships — no new door, no second model, and F10 stops being load-bearing because the drawer
stops being the only stamping path.

**F-W: yes.** Part D's attachment block belongs in the reading pane rather than behind the drawer,
and R2 is the evidence: the pane is already where every other query field is edited. The shape is
the strip's footer, per Ruling 1 — no new component, and it supersedes the standalone `detachPackage`
mount for the packaged case (**F-O**).

### What this leaves true today

Desktop can attach a package **as a snapshot** and cannot link one. A snapshot needs no lock (its
contents are copied, so nothing can drift), so nothing is unsafe — but a desktop writer cannot
produce the linked, live-rendering, lockable attachment that Part D is built around. **That gap
closes with Ruling 1's footer, not with a button.**

---

## Parts 1 & 2 — pointer controls, and the fallback that caused the original complaint

**Committed together, and by path they could not be separated**: both live in the same render in
`Queries.tsx`, and Part 2's proof (exactly one attachment block) depends on Part 1's strip being
there to count. Explicit-path staging is the safety rule; the phase count is the convention, so the
rule won.

### Part 1 — one footer, both facts (Ruling 1)

`Change package` and `Remove` sit beside the lock note, never instead of it. **They read as the
fourth of a set**: the pane already edits the date sent, the expected date and the send method in
place, each with a `title` beginning "Change", and these take the same `.qp-inplace` affordance and
the same grammar — `"Change which package this query used"`, `"Change this query to carry no
package"`.

**`setQueryPackage` batches the link and the stamp.** `updateQuery` is a single `updateDoc`, so
calling it and then stamping would leave a window in which a query renders a package's live contents
while that package can still change under it. One `writeBatch` across the two documents closes it —
the same shape `commitQueryEdits` already uses for the drawer.

**D4 holds**: no activity appended, `recomputeQuery` untouched. Both writers capture the prior value
*before* the write, so the undo restores rather than re-writing what it just wrote.

### D5 — the contribution moves, proven both ways

Changing one query's package, then changing it back:

| | Standard UK | Comps-led variant |
|---|---|---|
| before | 7 / 3 / 3 | 2 / 0 / 0 |
| after the move | 6 / 2 / 2 | 3 / 1 / 1 |
| moved back | **7 / 3 / 3** | **2 / 0 / 0** |

And **Requests by material followed too** — `Hook-first 2 requests from 6 sent → 3 from 7`,
`Comps-forward 1 from 3 → 0 from 2`. Both surfaces are derived at read time; neither needed telling.

**The stamp landed on the new package**: `seed-pkg-2` went from `null` to
`2026-08-24T13:48:45.515Z` on the first change, and stayed put on the second — write-once, from the
pane. **F10 is closed**: desktop stamps.

### Part 2 — the fallback render

`baseMaterialsFor` falls back to the **agent's** `materialsWanted` whenever the query's own list is
empty — which is exactly the state `materialsLinkWrites` leaves a linked query in. So the pane drew
the agency's *asks* as pink chips above the package, and they read as a second thing that was sent.
**That is the original complaint, and this was its cause.**

**The fallback is kept where it earns its place.** With no attachment it answers a real question, and
the first edit promotes that set onto the query — which is why the **writers** still read
`baseMaterialsFor` unchanged. Only the **render** suppresses it, and only when something is attached.

Measured on a linked query: `{packed: 1, loose: 0, looseChips: [], attachBtn: 0}`.

### D11 — and `＋ Attach` had to go with it

A packaged query still offered `＋ Attach`, outside the strip. A control that can only produce the
forbidden state (a package *and* a loose list) is an invitation to a write the model then has to
undo. **Absent, not disabled** — a greyed control poses a question the writer cannot act on.

⚠️ **The first attempt used the `hidden` attribute and did nothing**: `.f12-popwrap { display: flex }`
overrides the UA's `display: none`. And the probe would not have caught it either, because
`querySelectorAll` counts hidden nodes — it now filters on `offsetParent`.

### ⚠️ `markPackageSent` had no caller, and is retired

Written last run in anticipation of a stamping surface that turned out not to need one: **both real
paths stamp inside their own atomic batch**, because a stamp that is not in the same commit as the
link can drift from it. A standalone stamp had nowhere safe to be called from, which is precisely
why nothing called it.

Its lock said "the stamp's SINGLE writer" — a claim about a function that never ran. The invariant is
not *one writer* but **no stamp outside a batch**, and that is what the lock now asserts, by walking
back from each stamp to its `writeBatch`.

### Four locks moved, two claims retired

| lock | outcome |
|---|---|
| `markPackageSent is the stamp's SINGLE writer` | **retired** — named a function with no caller; replaced by "no stamp outside a batch" |
| `the package name is the strip's only control` | **retired** — a count of two buttons, right before Ruling 1. The surviving claim is the property: nothing here edits the package's *contents* |
| `they go through IllustrationSlot, not a bespoke plate` | repointed — it forbade every inline `<svg>`, a fair shorthand until the footer gained a 10px padlock. Now forbids a bespoke *plate* |
| `reads the one materials derivation` | repointed — the expression widened to suppress the fallback; the claim is unchanged |

⚠️ **And the uppercase-`innerText` trap caught me twice more in one run** — once on the footer's
labels, once on a `Requests by material` heading that is *not* uppercased, so an uppercase search
reported `null` and I nearly recorded "the panel is missing". Third and fourth instances in two runs.

```
tsc 0 · build 0, no error/[WARNING] lines · vitest 383 files, 6593 passed, 3 skipped
                                            (baseline 383 / 6587)
```

**F-O is closed**: `Remove` on the strip supersedes the standalone `detachPackage` mount for the
packaged case. `detachPackage` still serves the snapshot groups, which Part 4 stops creating but does
not remove.

## Where this stopped, and what is left

| phase | state |
|---|---|
| 1 · recon + refs | **done** |
| 2 · Part D data layer | **done, deployed to dev**, both halves proven at rules level |
| 3 · Part A first visit | **done, measured** |
| — · D-D2 / D-D3 | **done** — pulled forward to close the gap Phase 2 opened |
| 4 · Part B workspace | **done, measured** at 1440 and 1920 |
| 5 · Part C drawer | **not started** |
| 6 · Part D UI + `markPackageSent` | **not started** |
| 7 · full verify | **not started** |

Stopped at a phase boundary again. The page is coherent: first-visit teaching, the rebuilt
workspace, and the lock with its way forward.

### Part C — the shape is known

R5 stands: **there is no neutral drawer primitive** (the Noteboard's is page-local markup;
`Form11Drawer` is a Form-11 *editing* shell whose chrome says the wrong thing). Part C builds
page-local and the duplication is the flag. Header needs a `How it works` control beside the stat
line; the drawer's three stage cards can reuse `TEACH_STAGES` from `PackagesTeachFirst`.

⚠️ **D-C2's "Worth knowing" wording must carry Ruling 1's correction (D-R1c):** a sent package's
**contents** stop changing — not the attachment. Which package a query points at stays correctable.

### Part D UI — still the visible half of the reported bug

- **`markPackageSent` still has NO CALLER** (Ruling 2). The rule and the refusal are live and proven,
  but nothing stamps, so **no package locks in the app yet**. The card's locked note and
  `Duplicate & edit` are built and will appear the moment the stamp is wired. **This is the single
  most valuable remaining change.**
- **D-D5** — chips still read `Covering letter`. `packageItems(pkg, versions)` already resolves each
  slot id to its `versionName` and carries the `ComponentType` for the eyebrow; the strip renders
  `materialsWanted`'s canonical type strings instead, and that substitution is the leak.
- **D-D4 / D-D6 / D-R1a** — the either/or fork, no `+ Attach` or per-chip `✕` inside a packaged
  strip, and **one footer**: the lock note plus Change package / Remove together, per Ruling 1.
- **D-R1b** — the before/after scorecard proof is unrun.

**F-O note (carried):** Ruling 1's `Remove` supersedes the standalone `detachPackage` mount for the
packaged case; the loose case keeps its own per-chip removal. Whether `detachPackage` should be
retired outright is a Part D UI decision, not settled here.

## Flags

| flag | state |
|---|---|
| **F-Q** | **answered and acted on: 2** — `seed-pkgq-3`, `seed-pkgq-4`, both `packageId="seed-pkg-1"` carrying a loose `["First 10 pages"]`. Migrated: link kept, list **unset**. Re-read confirms 0 remain. |
| **F-S** | **answered concretely.** `CompCarousel` is one hardcoded string from being shareable — it takes `{slides, label}` and imports nothing but React, but prints `396×250` inline. A shared component needs: that dimension as a prop (or read off the slide), the `ct-` classes renamed to a neutral prefix, and its styles moved out of `comps.css` into their own sheet. `StagesBlock` needs heading/sub/stages lifted to props. `FeatureBlock` is too comps-specific to share. Not attempted here: their pattern moved hours before this pack, and the brief's instruction for that case is to build to `main` and flag. |
| **F-T (new)** | **A mis-attach locks a package that never went out.** `firstSentAt` is permanent by design — deleting the queries does not un-send an envelope — but attaching the wrong package freezes it, and `Duplicate & edit` is a workaround rather than a repair. The alternative, clearing the stamp when the last attachment goes, is expressible client-side but **not in rules** (they cannot count attachments), so it would soften the guarantee. Proposal, not a decision. |
| **F-R** | **not reached** — the materials shelf is Part B. |
| **F-M** | carried. Blue tokens stay page-local pending the consolidation ruling. |
| **F-O** | **closed last session**; the removal rows are live in the Attach menu. |
| **F-H** | carried — still no un-archive surface. Now adjacent to F-T: two acts with no way back. |
| **D-C1 partial/full strips** | carried, still blocked on the `materialsWanted` migration. |
| **Move surface** | carried — Correction UI's outstanding piece. |

**Phase 5 of the broadsheet build remains held.** Dev rules and nothing else were deployed;
`origin/main` is untouched.

---

## Part D UI — Parts 3 & 4 (24 Aug, `3d9526a9` + `b0e156e3`)

**Landed (code + unit + measured at 1440×1000 on the dev bundle).** Undeployed.

### Part 3 — the either/or fork

A query carrying nothing asks once: **"What went with this query?"** with `Attach a package`
and `List materials` side by side. Measured: neither is a filled primary (pastille `#e6edf4`
and white), both carry their own `title`, and exactly **one** attachment block renders in that
state. `List materials` opens the editor; it writes nothing by itself.

**⚠️ The fork is narrower than "no package", and that is data, not design.** An unattached query
still renders the *agent's* expected materials as a fallback, so `loose.length > 0` and the fork
is suppressed. It draws only where there is no package, **no stored materials and no agent
defaults**. On the harness account exactly one query reaches it — and its manuscript has no
packages, so the package branch measured correctly **disabled**, titled *"Build a package on the
Submission packages page first"*.

> **F-Z (a):** the fork's package branch is **not drivable end-to-end on this account's data**.
> Its write is proven through the switch below, which calls the same `changeQueryPackage`.
> Nothing to fix — recorded so a future run does not read the gap as an untested path.

### The switch, driven

`Save as package ›` on a loose row now switches **in place** rather than navigating to the
packages page. Measured wording, with plural agreement:

> *"Use a package instead? The 2 materials listed here will be replaced by the package's
> contents. Nothing else about this query changes."* — Cancel · Choose a package

### Part 4 — snapshots retired as a writer

`attachPackage` is deleted and `onPick` routes to `changeQueryPackage`, so **every new
attachment writes a link**. Verified against the diff, not asserted: the declaration and its one
call site are both in the commit's removed lines, and no live reference survives in `src/`.

After the pick: `packed 1 / loose 0`, slot eyebrows **LETTER · SYN · SAMPLE** — which only a live
package lookup can resolve, so the write is a link and not a copy.

> **F-Z (b):** **0** snapshot-attached queries remain on the harness; **10** links. So D13's
> "existing snapshots keep rendering" is currently **unobservable on screen here** — there are
> none to look at. The render path is untouched and `detachPackage` still corrects them.

`attachedMaterials` is now orphaned and is **kept, documented as retired**: it and its tests are
where the shape of an existing snapshot is written down.

### ⚠️ A partial undo, found by driving the switch

Attaching **clears** the loose materials (`materialsLinkWrites` enforces one-or-the-other), and
the undo restored only `packageId` — so undoing a switch left the query with **neither the
package nor its materials**, while the toast said it had been reversed. That is the dead-undo
family in a worse form: a live control that half-works reads as a working one.

Fixed: the prior materials are captured before the write and restored **through the same
invariant that cleared them**, so the two halves cannot drift. `removeQueryPackage` is correct
as it stands — its prior state always has an empty list. Locked as a property of the inverse and
**verified red against the old wiring**.

### F-Y — the pane's in-place grammar does not accommodate a fourth control, because there was never one grammar

Measured on a packaged query — every visible in-place control in the reading pane:

| control | class | line | size | colour |
|---|---|---|---|---|
| date sent | `.qp-stat--edit` | none | 13px | ink `#141412` |
| reply expected by | `.qp-stat--edit` | none | 13px | ink |
| send method | `.qp-inplace` | 1px dashed grey | 12.5px | grey `#a19e9a` |
| **Change package** | `.qp-inplace .qc-strip-ptr` | 1px dashed grey | **7.5px** | ink |
| **Remove** | `.qp-inplace .qc-strip-ptr` | 1px dashed grey | **7.5px** | ink |

The `title` grammar **is** consistent — all five open with "Change …", and the two new ones
follow it. The visual grammar is not, **and two of the three treatments predate this pack**.

**Proposed, not done** — this is a judgement about the whole pane, and making it silently inside
a packages change is how a pane acquires a fourth treatment:

1. **Leave it.** The two new controls read as the strip's own mono furniture, which is arguably
   right: they act on the *strip*, not on the query's fields. Costs nothing.
2. **Unify on `.qp-inplace`** — 12.5px grey dashed for all three of that family, and let the two
   stat cells keep their own look, since a stat cell is a different kind of thing.
3. **Unify all five.** The largest change and the only one that ends with one editing model.

Screenshots: `reports/packages-two-state/fy-inplace.png`, `fy-strip.png`, `p3-fork.png`,
`p3-loose.png`, `p3-confirm.png`, `p4-linked.png`.

### Harness

`seed-query-20` was borrowed to drive the switch and **restored to its seeded state**
(`packageId: ""`, no `materialsWanted` — its chips were the agent fallback, so the restore is
exact). `seed-pkgq-1` and `cor-move-a`, borrowed by earlier attempts, were restored to
`seed-pkg-1`.

### Gate

tsc clean · build clean bar the standing chunk-size note · Vitest **383 files green**. The 3
failures in `src/marketing/landingCopy.test.ts` are another session's live WIP (`PULSE_HEADING`
mid-shape-change) and touch no file in this pack.

**D15:** `ImportCsv` is unaffected — it writes `materialsWanted` on import and never touched
`attachPackage`; Part 4 changes nothing about it.

---

## Part A visual amendments — hero de-boxed, stages enlarged (24 Aug)

Ref: `design-refs/submission-packages-teach-v2.html`, committed. Supersedes
`submission-packages-teach-first.html` for this state's layout. Measured at 1440 and 1920 in the
worktree at `/Users/nickphysick/ScriptAlly-ptr` — 2 commits behind main, neither touching
`src/components/packages/`, both files under test byte-identical to the primary tree.

Reached by **selecting** a manuscript with neither versions nor packages (`thin-ms`), not by
deleting anything: the predicate is `msVersions.length + msPackages.length > 0`, per manuscript.

### ⚠️ Two premise corrections

**There was no bottom-joined slab.** D1 called for removing a `14px 14px 0 0` / `0 0 14px 14px`
join between hero and stages. The hero was `border-radius: 14px` on all four corners and
`.pkgt-stages` had no container at all. Nothing was un-joined: the card came **off** the hero and
a card went **on** to the stages, which never had one. The end state is the ref's.

**The ref's `line-height: 1.18` is not taken — it crops.** Measured at 42px: `scrollHeight 151`
against `clientHeight 149` at both widths; `1.3` gives 164/164. This is the **second ref running**
to ask for less than the floor on this headline (v1's 1.12 cost 4px at 40px). The brief's own
clause covers it. Stage titles likewise keep 1.3 rather than the ref's 1.28.

### ⚠️ And a correction to the descender check itself

The sweep first reported two headings cropping at 1.3 — the section head and one stage title.
**Both were rounding, not lost ink.** `scrollHeight` and `clientHeight` are integers; a 44.19px
line box gives 44 and 45, so the standing check fires on 0.81px of arithmetic.

Measured against the **fractional** rect at three line-heights:

| heading | 1.3 | 1.35 | 1.4 |
|---|---|---|---|
| Managing your packages with ScriptAlly | 0.81 | 0.11 | 0.41 |
| Add your materials | 0.41 | 0.31 | 0.20 |
| Bundle them into packages | 0.81 | −0.38 | 0.41 |

Sub-pixel at every value — raising the leading does not clear it, because there is nothing to
clear. **The tell is that the boolean disagrees with itself:** "Add your materials" has the same
0.41px overflow as a heading the check called clean; only the rounding side differs. The check now
compares against the fractional box with a 1px threshold, which still catches the real thing — the
hero's 1.18 was 2px, and no single boundary rounds that far.

### Measured

```
@1440  hero    bg rgba(0,0,0,0) · border 0px none · radius 0px   (D1)
       columns 460 + 456 · gap 56 · block 972 · gutters 4 / 4    (D2)
@1920  columns 460 + 456 · gap 56 · block 972 · gutters 244 / 244
       — identical at both widths, which is the point of the fixed column
@1440  stages  bg rgba(255,255,255,.55) · radius 16 · pad 54/40/58 · 980 = content width
       tracks  251 | 72 | 251 | 72 | 251   (three equal columns)
@1920  stages  1460 = content width
       tracks  411 | 72 | 411 | 72 | 411
       both placeholders still dashed · 0 headings losing ink
```

### Slot inventory — v2 (D5). This table is the artist's brief.

| slot | id | rendered plate | mark | nature |
|---|---|---|---|---|
| carousel, ×4 slides | `PKG-JOB-RECORD` · `-REUSE` · `-REPLIES` · `-SCORECARD` | **418 × 230** (was 396 × 214) | 52 × 52 | dashed placeholder |
| stage disc, ×3 | `PKG-STAGE-ADD` · `-BUNDLE` · `-TRACK` | **128 × 128** circle (was 96 × 96) | **50 × 50** (was 36 × 36) | dashed placeholder |

The printed labels in `PackagesTeachFirst.tsx` were `396×214` and are now the measured box. The
older inventory block above is marked superseded rather than edited.

### F-AA — the 320px body measure at 1920

It does not run long; it runs **short**. The columns are 411px and the copy caps at 320, so each
paragraph sits as a centred block with ~45px of slack either side and breaks to three lines.
Readable, and consistent with the ref. **Proposed, not changed:** if anything wants attention it is
that the 72px dashes look thin against 411px columns at 1920 — but that is the ref's ratio, and
widening them is a design call. Screenshot: `reports/packages-teach-v2/stages-only-1920.png`.

### F-AB — this run **converged** the two pages; one new divergence

Comparable titles had already done what Phase 1 just did. `.ct-feature` is
`grid-template-columns: minmax(0, 500px) 420px; justify-content: center` with no background, no
border and no radius — and its own comment names the cause: *"A `1fr` here is what created the gap:
it consumes all free space by definition."* **Packages was the page that had drifted.**

Where they now stand:

| | Comparable titles | Submission packages |
|---|---|---|
| hero container | none | none ✓ *(new)* |
| hero columns | `minmax(0,500px) 420px`, gap 44 | `1fr → 460` + `456`, gap 56 |
| headline | 42px / 600 | 42px / **700** |
| body | 14.5px | 14.5px ✓ *(new)* |
| carousel slot | 396 × 250 | 418 × 230 |
| stage title | 22px / lh **1.25** | 22px / lh 1.3 |
| stages cap | `max-width: 1240px` | **`100%`** *(new divergence)* |
| stages container | none | **card, radius 16** *(new divergence)* |
| stage plate | 4:3 rounded rect | 128px circle |

**Applying the same treatment to comps would touch:** `.ct-stages` (gaining the card),
`.ct-stageswide` (dropping the 1240 cap), and the disc-versus-plate decision, which is the one real
design question — a circle and a 4:3 rectangle are different objects, not different sizes. The
headline weight (600 vs 700) and the two slot sizes are one-line reconciliations either way.
**Nick's call, not this run's work.**

⚠️ **One thing to check there before anyone acts on it:** comps' stage titles sit at
`line-height: 1.25`, below the floor. Whether that genuinely crops needs the *fractional* check
above — the integer form would report a false positive at 1px, which is exactly how a correct page
gets "fixed".

---

## Part D UI, re-issued — the recon (24 Aug)

The re-issued prompt describes four pieces of work and a live defect. **All four landed earlier the
same day** (`64311dba` Parts 1–2 · `3d9526a9` Parts 3–4 · `4e0d8e21` the report) and were deployed
to dev at 15:1x and again at 16:1x UTC. This section is the recon the prompt asks for, taken
against the **deployed** dev site rather than the source.

### F-AC — R-A's answer: neither branch, because the premise is stale

R-A offers a dichotomy — either the strip is snapshot-attached (so its generic chips are correct,
and Part 4 resolves it), or it is linked and D-D5 never reached that render path. **Measured, it is
neither.**

* **There are no snapshots.** Stored across all 44 queries: `link 9 · loose 3 · none 32 ·
  snapshot 0`. Not one query carries a `fromPackageId` mark.
* **D-D5 is complete on this path.** Linked strips read `LETTER Hook-first`, `SYN One-page`,
  `LETTER Comps-forward` — the version names. Nothing renders `Covering letter · Synopsis ·
  Opening sample`.

The screenshot showing generic chips under a fork predates the deploy. Both faults it shows were
fixed in `64311dba`, which suppressed the fork beside an attachment and the agent fallback with it.

### D8 — the census, every query on every manuscript

⚠️ **Taken at scope All.** The list is manuscript-scoped, so the first pass saw 30 of 44 and would
have omitted every query on another manuscript — which is exactly where a stale render would hide.

```
rows sampled : 44 of 44
strip 1 · loose 0 · fork 0   →  9   (every linked query)
strip 0 · loose 1 · fork 0   → 33   (3 stored loose + 30 agent-fallback)
strip 0 · loose 0 · fork 1   →  2   (nothing attached, no agent defaults)
offenders                    →  0
```

Every one of D8's three cases holds across the whole account. No query renders a fork beside an
attachment; none renders two attachment blocks.

Also measured on every row: `editsInStrip 0` — no per-chip `×` and no `+ Attach` inside a packaged
strip (**D11**) — and, on each of the 9 linked queries, `CHANGE PACKAGE` + `REMOVE` present
**together with** the lock note (**D1**, Ruling 1's one footer).

### D15 — verified, not asserted

`ImportCsv.tsx:522` writes `packageId: "pkg-seed-default"` (comment: *"Fallback standard
submittal"*). Grepped: that id is defined **nowhere** in `src/`, `tests/`, `firestore.rules` or
`functions/`. ImportCsv references none of `attachPackage`, `attachedMaterials`, `firstSentAt`,
`stampPackageId`, `setQueryPackage` or `materialsLinkWrites`. **Part 4 changes nothing about it.**

⚠️ **But it writes a dangling link, and that is a latent defect rather than a cosmetic one.** An
imported query points at a package that cannot exist, so the pane resolves it to the deleted-package
state and tells the writer their package "no longer exists" about one that never did. No such query
exists on this account, so the census could not see it. Left alone as instructed — flagged as its
own item, not folded into Part 4.

### F-O — closed by Part 1, with one qualification

`Remove` clears `packageId`; `detachPackage` removes snapshot-marked items from `materialsWanted`.
They act on different attachment kinds, so Remove supersedes it **for everything new** — and since
snapshots are no longer written, everything is new from here. `detachPackage` stays reachable only
where a historical snapshot exists. There are none on this account, so its menu never draws here;
prod may still hold some, which is why it was kept rather than deleted.

---

## F-AD — Phase 1: the guard was already built, and my flag was wrong about its route

I reported that *"deleting a package blanks the materials section of every query linked to it,
today"*. **That route does not exist.** `deletePackage` refuses before writing —
`if (queries.some((q) => q.packageId === id)) return false` — and it keys on **the link, not the
stamp**, which is exactly what D1 asks for. I had traced `deletePackage` to a live control and
proved a dangling id renders blank, then joined the two without checking the guard between them.

The whole ladder was already in place:

* `removalChoice(holderNames)` → `"delete"` at zero holders, `"archive"` at one or more.
* `packageHolders(id, queries, agentName)` → every query whose `packageId` matches, named by agent.
* `RemovePopover` renders the archive branch, and handles a late refusal by staying open so its
  props re-render on the archive branch — its own comment names the "delete that silently did
  nothing" fault and forecloses it.

### Driven at 1440, both branches

```
seed-pkg-1  Standard UK        · links 7 · stamped
seed-pkg-2  Comps-led variant  · links 2 · stamped
probe       Probe · unlinked   · links 0 · unstamped   (created for this, then deleted by the drive)

linked   → "Archive Comps-led variant? It leaves your packages list. The 2 queries sent with it
            — Rachel Lin and David Marsh — keep it on record, so what you sent stays answerable."
            buttons: Cancel · Archive          ← no Delete offered
unlinked → "Delete Probe · unlinked? Nothing has been sent with this package, so it can go for good."
            buttons: Cancel · Delete           ← clicked; the document is gone
```

### F-AE — stated without hedging: **client-side only**

A rule cannot express *"is this package referenced by any query"* — that is a predicate over a
collection, and rules have no query capability. `deletePackage`'s own interface note already said
so before this run. There is **no database-level guarantee**; D2 is the safety net that makes that
acceptable, and it is why D2 matters more than D1 did.

### One latent inconsistency, not reachable

The page passes `packageHolders(p.id, msQueries, …)` — **manuscript-scoped** — while `deletePackage`
checks **all** queries. They would disagree for a package linked from another manuscript's query:
the popover would offer Delete, the write would refuse, and the popover would re-render still on the
delete branch. `attachablePackages(packages, query.manuscriptId)` makes that unreachable — a query
can only link to a package on its own manuscript — so the two agree for all reachable data. Noted
rather than changed: the fix would be passing `queries`, and it is only correct while that scoping
holds.

## F-AD — Phase 2: a broken pointer says so

D1 cannot be enforced in rules, so the render is the real defence — and it covers every route D1
misses: prod data with a dangling id, a race, `pkg-seed-default`'s siblings, anything that reaches
the database another way.

**The fault, restated precisely.** `attachedHere = !!packageId` suppressed both the agent fallback
and the fork; `linkedPackage` being null drew no strip. Three correct-looking conditions, and
between them the whole section rendered nothing. **Measured before the fix on a planted id:
`strip 0 · loose 0 · fork 0` — the one anomaly in 45 rows.**

**The fix is a three-way distinction:** a pointer that resolves to nothing is not an attachment.
`danglingLink = !!packageId && !linkedPackage`, and the fork's condition becomes `!linkedPackage`
rather than `!attachedHere`.

> The package this query pointed at is no longer on file, so what went with it isn't recorded here.

A sentence in the pane's own soft ink — no blush, no icon, no rule. A package leaving the file is an
ordinary thing that can happen to a record, and the send is not damaged by it. The fork beneath
carries the action, and **both of its branches heal the pointer**: attaching writes a new link,
listing materials clears the old one.

⚠️ **The agent fallback stays suppressed here, deliberately.** On an unattached query it is useful —
it says what this agency asks for. Beside a broken pointer it would be a guess wearing the shape of
a record: this query *was* sent with something, and what the agency usually asks for is not evidence
of what went.

### Measured, full scope

```
rows swept (scope All) : 45 of 45
dangling query renders : strip 0 · loose 0 · fork 1 · message present
blank sections         : 0
```

⚠️ **And the token lock caught my own CSS.** The message was written
`color: var(--f12-ink-soft, #6b5a52)` — a token this stylesheet does not define, so **the hex was
the value, dressed as a knob someone could turn**. `queryCentreMoment`'s "the three waxes are
tokens" lock failed it as a colour literal, correctly. Now `var(--ink-2)`, which the sheet already
reads 78 times. Second time this pack that a fallback has stood in for a token that was never there.

## Part C — the explainer drawer (24 Aug)

### D5 — reused `Form11Drawer`; built nothing new

It already is a right-hand slide-in with a scrim, an Escape close, a `width` prop and
header/body/footer slots. `onPark` and the draft-stashing half are optional, so nothing form-shaped
comes with it. **The Noteboard's "What writers keep here" is not a primitive** — it is inline markup
in `TodoNoteboardPage` under page-scoped `nb-` classes, so reusing it would have meant lifting it out
of a page this pack does not own.

Its one gap: it renders no ✕. Its own prose says so (*"a header ✕ routed through the ref"*), and
`EditAgentDrawer` does exactly that. This drawer's ✕ calls `ref.close(false)` — **not `onClose`
directly**, which would skip the exit animation and make the panel vanish rather than leave.

### ⚠️ D4 could not be built where it was specified

The brief asks for the control **in the packages page header**. `PageHeader` **throws** when
`variant="workspace"` is handed an action:

> *"a masthead with nothing actionable in it never needs restoring mid-visit, so it can scroll away
> on a scrolling page and vanish outright on a fill page without stranding a control."*

That is a good law and it belongs to the page-header session, so the control moved to **the band
head** — this page's own element, beside `Your packages · N built`, which does not scroll away.

⚠️ **And the throw is dev-only** (`process.env.NODE_ENV !== "production"`), so in the built bundle
the prop silently rendered nothing. The measurement found it; a code reading would have shipped a
button that did not exist. The guard prevents the fault in development and displaces it in
production — worth knowing before relying on it.

### Measured at 1440

```
open      : from the band-head control only
geometry  : width 436 · right offset 32 · scrim present
content   : 3 stage cards · 3 sage notes · sections Stage one/two/three · Worth knowing
closes    : ✕ · scrim click · Escape · "Got it"      (all four driven)
D7        : not open on arrival; not open on the teach→workspace transition
D8        : first-visit state intact — teach 1, stages strip 3
```

### D9 — slot inventory, v3

| slot | id | rendered plate | mark | nature |
|---|---|---|---|---|
| carousel, ×4 slides (first visit) | `PKG-JOB-RECORD` · `-REUSE` · `-REPLIES` · `-SCORECARD` | 418 × 230 | 52 × 52 | dashed placeholder |
| stage disc, ×3 (first visit) | `PKG-STAGE-ADD` · `-BUNDLE` · `-TRACK` | 128 × 128 circle | 50 × 50 | dashed placeholder |
| **stage card, ×3 (drawer)** | **same three ids** | **362 × 88** | **46 × 46** | dashed placeholder |

⚠️ **SUPERSEDED — the two QUERY-STRIP slots have left this commission (25 Aug, Option B).** The
packaged attachment is now a stationery band whose mark is a **solid 15px glyph drawn inline**, and
the loose row has no mark at all. At 15px this is icon territory rather than illustration territory,
which is the risk already named at 22px: a dashed commission slot that small is a box saying an
artist owes us something.

| retired slot | was | why it went |
|---|---|---|
| `PARCEL_SLOT` — the packaged strip's parcel | 22px mark in a 38px dashed plate | drawn inline at 15px; an icon, not a plate |
| `SHEETS_SLOT` — the loose row's sheets | 22px mark in a 38px dashed plate | the row has no emblem at all now (D8) |

**The rest of the commission stands** — the first-visit carousel and the three stage discs are
unchanged and still wanted.


⚠️ **The drawer reuses the first-visit ids deliberately** — same three subjects, two placements, so
it is one asset each rather than six. The plate shapes differ (a 128px circle and a 362 × 88
letterbox), which the artist needs to know: the mark has to read at both.

### D6 — one copy amendment carried from Part D

The ref's first note says a sent package *"stops changing"*. The pane now offers **Change package**
and **Remove**, so the note says which half is frozen: the three materials inside are fixed, and
which package a query points at stays correctable from the query. A writer who read the ref's
sentence and then found a Change control would have been told two things.

---

# Ruling 1 — F-AG's three survivors, closed (25 Aug)

**Two stopped.** `notes` no longer writes *"Imported from Zite archives."* and `description` no
longer writes *"Activity logged via CSV Import."*. Both were **true**, and both were still the
logline fault at a smaller scale: the app putting its sentence where the writer's belongs.

**One kept.** `responseTimeWeeks: 8` stays. It is the app's stated assumption about agency response
times rather than a claim about a specific agency, it is visibly editable, and it carries no false
authorship. **Off the flag list.** It is now asserted in the drive so a later sweep does not remove
it by pattern-matching the others.

### Measured — an agent imported from a name-only CSV

```
name  "Empty Fields Probe" · agency "" · email "" · notes "" · mswlNotes ""
responseTimeWeeks 8
```

Every column but `Name` was absent from the CSV, which is the whole question: what does the app put
in a field the writer did not fill? Nothing, now — except the one stated default.

## ⚠️ F-AJ — a writer-neutral provenance field exists, and its own comment about itself is stale

**`Agent.fieldSources`** — `Record<string, { source: string; foundAt: string }>` — is exactly the
shape the ruling describes, and its docstring already states the principle:

> *"Written ONLY when a found value is saved unedited, so a found fact is never indistinguishable
> from one the writer verified/typed."*

Its comment says it *"rides a parked firestore.rules edit … saves carrying it are silently denied
until that deploy lands"*. **That is out of date.** It is in `firestore.rules` at line 251
(`isValidAgent`) and line 675 (the agent-update allowlist), and `src/lib/hkSave.ts` writes it through
`withProvenance`. The field is live.

**But it does not fit this job, for two reasons, and neither is a rules problem:**

1. **It is per-FIELD, keyed by the agent field it describes** — "this response time came from the
   agency page on this date". It has no way to say *"this whole record arrived in a CSV"*.
2. **It exists on `Agent` only.** Manuscripts and activities have no equivalent, and the two writes
   just stopped were on an agent's `notes` and an **activity's** `description`.

So carrying import provenance would mean either widening `fieldSources`' meaning to include
record-level origin, or adding the same shape to `Manuscript` and `Activity` — **a rules-allowlist
change on two more collections.** Reported, not added, per the red gate. The fields stay empty
meanwhile, which is the honest state.

# F-H — archived records have a way back (25 Aug)

A quiet **Show archived · N** in each band head, off by default; archived items appear in place,
recessed; **Restore** is the only action on them. No page, no empty state, no explanation of why
something was put away.

### ⚠️ D3 is structural, not remembered

`materialShelf` and `msPackages` are **untouched** and still active-only; the archived items arrive
as their own separate lists. So `N held` / `N built` cannot count an archived item in any state of
the toggle — not because the counts exclude them, but because the arrays they read never contain
them. Measured: the counts read `3 HELD` / `1 BUILT` with the toggle **off** and `3 HELD` / `1 BUILT`
with it **on**.

### ⚠️ D4 — verified, and it was already true

`archiveVersion` writes **one field on one document** (`status: "Retired"` on the version) and
touches no package. The interface's own docstring said so — *"IT STAYS RESOLVABLE BY EVERY PACKAGE
THAT HOLDS IT"* — and the drive confirmed it on the page: **"Hook-first" was archived while
"Standard UK" references it, and the package still named it.** Nothing to fix; no red gate.

### ⚠️ And the inverse arrived with its surface, exactly as the code asked

`db.tsx` carried the reason there was no `unarchiveVersion`: *"a writer that no surface can reach is
a claim that the feature exists. It arrives with the surface, not before it."* That reasoning is why
it waited, and it is why it is written now. `restoreVersion` and `restorePackage` write
`status: "Active"` — **not `deleteField()`**, though absent also means active: removing the key would
make a restored record indistinguishable from one that was never archived, and those are different
histories.

### Measured, at 1440

```
before        : 4 HELD · 2 BUILT · no toggle rendered                (D5)
archived, off : 3 HELD · 1 BUILT · "SHOW ARCHIVED · 1" ×2 · 0 rows visible
D4            : the archived material still named by its package     ✓
archived, on  : 3 HELD · 1 BUILT (unchanged) · 2 rows · hover lift 0px
actions       : ["Restore"] only                                     (D2)
after restore : 4 HELD · 2 BUILT · toggle gone                       (D5)
```

---

# Banded cards + the package drawer — Part A (25 Aug)

Refs committed: `packages-banded-cards.html`, `package-drawer.html`.

## D1 — the hero was inside the workspace branch, not leaking into it

⚠️ **The premise needs correcting.** The brief asks why it "renders outside the branch". It doesn't:
`PackagesHeroBand` is mounted at `SubmissionPackages.tsx:388`, in the **true** arm of
`msVersions.length + msPackages.length > 0` — deliberately placed there by the restructure, whose
own comment says *"the hero lives on as `PackagesHeroBand`, immediately beneath"*. So a writer with
four materials and two packages was still being asked *"Fed up of guessing which materials are
landing with agents?"*. The ruling stands either way; the cause is a decision, not a leak.

**Proven by element count, both states, before and after:**

```
                teach  heroBand  heroCopy  ghosts  realCards
before  workspace   0      1       true       2        2
        teach       1      0       true       0        0     ← its own hero, correctly
after   workspace   0      0      false       1        2
        teach       1      0       true       0        0
```

⚠️ **Its two controls moved rather than going with it.** The band carried the **manuscript
selector** — this page's scope — and the **New package CTA**, its primary action. Both are now in
the packages band head, where the ref puts a band's actions. Without that move the CTA would have
survived only on the ghost card at the *end* of the grid: a primary action behind a scroll, which
the hero had been hiding.

## F-AU — D2's cause, precisely

**Not a double-render and not a double-join.** Two *distinct hand-written* ghost buttons sat back to
back in `PackagesBand`:

```jsx
<button className="pkgb-ghost pkgb-pkgghost">  …px={54}…  "A different letter, a different length of synopsis."
<button className="pkgb-ghostpkg">             …px={44}…  "A different letter, a different synopsis."
```

One is a superseded version of the other, left in place when a later pass added its replacement
without deleting what it replaced. **The near-identical copy is what hid it** — differing by one
word, a reader skims the pair as a single block.

⚠️ **They also shared `id="pkg-ghost"`**, so the document carried a duplicate id — the hazard this
repo already records for components that gain a second mount.

**Third instance in this build of a superseded thing surviving beside its replacement** (the
`#/pkg-lab` cascade, the two auto-create blocks, now this). The pattern is worth the name: a
replacement that is *added* rather than *swapped* leaves the original reachable, and near-identical
copy makes the duplication invisible to review.

The smaller ghost survives, per D10 — a ghost must read as quieter and shorter than a real card, or
a populated page stops reading as populated.

## ~~Next session — start here~~ · SETTLED, see the handover at the foot of this file

**1 · The manuscript selector check (before D3).** Part A moved it into the packages band head out of
necessity — the hero carried it and removing the hero would have stranded it. **It does not stay
there.** A band head's actions act on *that band*; a manuscript selector scopes the whole page, so
sitting on Packages it implies it does not scope Materials, which is false.

* **Does it duplicate the sidebar's switcher?** The sidebar carries the manuscript with prev/next
  arrows on every page. If it is a duplicate, **delete it** — two controls doing one job in two
  places is worse than one.
* **If it does something the sidebar does not**, it goes in the **page header area** beside the stat
  line and "How it works". Page-level chrome for page-level scope. **Say what the difference is** in
  the report.

⚠️ **And before deleting it as redundant, check what else on the page assumes it exists.** This is
Part A's own lesson, one surface along: D1 said "delete the hero" and the hero was carrying the
manuscript selector *and* the New package CTA, so removing it as written would have left the page's
primary action reachable only through a ghost card at the end of the grid. **A control that looks
redundant may be load-bearing for something offscreen.**

**2 · `＋ New package` stays in the packages band head.** It genuinely acts on that band, and the ref
puts it there.

**3 · D3 onward** — rule-only bands, banded cards, then Part C's drawer.

### The instrument that has been working

Part A's two defects were found by a **rendered-element count in two data states** —
`ghostCards: 2` beside `realCards: 2`, and `heroBand: 1` in a state that should have had none. Several
passes of reading the component had missed both. `tests/e2e/partA.measure.ts` holds that harness with
the before/after figures; extend it rather than starting a new one, and **count in both states** for
anything D3–D20 changes.

### State at handover

Part A is committed and **undeployed** — dev serves `7f718ec0` (the stationery band). Deploy A–C
together once the bands are done. Both refs are committed.

## Phase 0 — the manuscript selector: R1's answer is *duplicate*, and the sidebar's is a superset

| | page selector (`msSelector`) | sidebar (`WorkspaceShell:400`) |
|---|---|---|
| storage | `scriptally_active_manuscript_id` | **the same key** |
| switch | chevron → listbox, **title only** | chevron → listbox with a **subtitle per row** |
| also | — | **prev/next arrows** + position dots |
| where | the packages page | **every page** |

Same job, same key, and the sidebar's carries strictly more: arrows, dots, and a subtitle the page's
list omitted. **Deleted (D0a).** It does not move to the header either — a band head's actions act on
that band, so page scope on Packages implies it does not scope Materials, which is false; and the
shared masthead refuses actions outright.

### D0c — what assumed it existed, checked before deleting

⚠️ **`activeMs` is load-bearing and stays.** It derives `msId`, which scopes *every* list on the page
(`msVersions`, `msPackages`, `msQueries`), and it drives the no-manuscript branch. This is the check
that D1 skipped last run, when the hero looked deletable and was carrying the New package CTA.

Everything else was the selector's own machinery and went with it in the same commit: `selectMs`,
`multiMs`, `msMenuOpen`, `msMenuRef`, its outside-click effect, `bookIcon`, and the `.pkgw-mschip` /
`.pkgw-mschip--static` / `.pkg-msopt` rules.

### Measured, workspace state

```
pageSelector 0 · newPkgCta 1 · sidebarScope 2
heroBand 0 · heroCopy false · ghostCards 1 · realCards 2
```

`＋ New package` stays in the band head (D0d) — it genuinely acts on that band, and the ref puts it
there.

---

## Next session — starts at D3

⚠️ **Phase 0 is DONE.** The earlier "start here" block above is superseded and struck through: the
manuscript selector question is settled (duplicate → deleted, `activeMs` kept), and `＋ New package`
is already in the band head. **Do not redo it.**

### The band head is a RE-ORDER, not a restyle

It already holds everything the ref asks for — heading, count, and three right-aligned actions. D3's
work on the head is arrangement plus the rule-and-tick treatment, not new controls.

**Ruled, so it is not decided mid-flight — order on the right:**

1. `How it works`
2. `Show archived`
3. `＋ New package`

⚠️ **`Show archived` sits with the actions but is the quietest of the three.** It modifies what the
band *displays* rather than acting on the page, so it belongs in the group without competing with
the two that do something. It is already the quietest treatment (bare mono, no fill); keep it that
way when the head is re-ordered.

### Then D3 onward

Rule-only bands → banded cards (D4–D10) → legend and marks (D11, D12) → the drawer (D13–D20).
**Deploy A–C together at the end.**

### What is in place

* Both refs committed: `packages-banded-cards.html`, `package-drawer.html`.
* `tests/e2e/partA.measure.ts` — the counts harness. **Extend it; do not start a parallel one.** It
  currently reports `teachState · heroBand · heroCopy · ghostCards · realCards · bandHeads ·
  pageSelector · newPkgCta · sidebarScope`, in both data states.
* Current workspace baseline to compare against:
  `heroBand 0 · ghostCards 1 · realCards 2 · pageSelector 0 · newPkgCta 1`.
* Dev serves `3ffd3ac5`, which now trails `main` by Phase 0.

## Part B — rule-only bands, banded cards (D3–D10)

Measured at 1440 and 1920:

```
band      background rgba(0,0,0,0) · 1px rule · 56px burgundy tick at bottom:-1px
actions   How it works · [Show archived] · ＋ New package     (the ruled order)
card head linear-gradient(#e3ebf3, #d5e1ec) · ink #39587a · "Submission package" · "Locked" · glyph 16px
slot rows LETTER Hook-first / SYN One-page / SAMPLE Chapters 1-3
lock      "Contents fixed — sent with 5 · DUPLICATE ›"
art panels 0 · grey lock boxes 0 · dashed on cards 0
ghost     230px against a 290px card, at BOTH widths
```

⚠️ **`Show archived` is conditional and its absence is correct** — it does not render with nothing
archived (F-H's D5). The assertion is about **order among what renders**, not a fixed list of three;
written the other way it would fail on a correct page whenever the archive is empty.

⚠️ **The ghost was the same height as a real card at 1920 and shorter at 1440 — same markup, opposite
readings.** The grid stretches its items, so D10 held at the width I happened to look at first and
failed at the other. `align-self: start` fixes it; measured 230/290 at both widths now. **A layout
claim proven at one width is a coincidence** — this file already says so, and this is the instance.

### Retired with their subjects, in the same commit (rule 7)

`.pkgb-pkgart` / `.pkgb-pkgslot` (D7) · `.pkgb-locked*` (D8) · `.pkgb-pkgcomp` (D6) · `.pkgb-wm` /
`.pkgb-mtype` (D5) · `TYPE_ICON` (D12), whose written brief was **not** lost — it lives in the
artist's slot inventory, which is unaffected.

**Four locks retargeted, not adjusted:** three in `packageLock.test.ts` asserted the grey box, and
one in `materialsBand.test.ts` matched the sheet's className as a literal, which broke when the band
head made it a template. ⚠️ **One of the three required the box to be SAGE** — correct for a tinted
box and meaningless for a footnote line with no fill; the claim it protected (*a sent package is the
feature working, not damage*) is now asserted as the absence of any caution colour.

**The card's Playfair name is unchanged at 19px** and was not re-measured for descenders — the size
did not move, only what sits above it.

---

# Band faults, Part B's finish, and the package drawer

Refs: `design-refs/packages-banded-cards.html` (Parts 1–2) · `design-refs/package-drawer.html` (Part 3).
Baseline at start: **tsc 0 · build clean · 391 files / 6800 tests**.

## Part 1 — the band faults

### F-BA — the letter glyph was a question mark *by construction*

Not a missing map entry, not a failed render, not a font fallback. The entry existed, resolved and
painted perfectly; the **artwork** was a `?`:

```
<path d="M8.5 9a3.5 3.5 0 116 2.4c-1 .9-2.5 1.5-2.5 3.1" />   ← the hook
<circle cx="12" cy="19" r="0.6" fill="currentColor" />        ← the dot
```

It arrived in `e4685f53` ("canonical type glyphs") and every covering-letter card has drawn it since.

**⚠️ THE TELL IS THAT EVERY OTHER TYPE RESOLVED.** A missing entry renders *nothing* here
(`if (!g) return null`), and a broken path renders nothing either. A `?` drawn at the right weight in
the right colour is a `?` somebody drew. Replaced with the ref's envelope, transposed from its 32
viewBox to the component's 24.

### D2/D3 — the inset came from a rule nobody was reading

`.pkgb-pkgcard` was declared **twice**. The banded block superseded the older one and was **added
rather than swapped**, so both were live. The later wins *per property* — but it declares no
`padding`, so `18px 20px 13px` survived from the earlier block.

**⚠️ THE TELL IS AN OFFSET THAT IS EXACTLY A PADDING VALUE NOBODY CAN FIND.** Grepping the winning
rule shows no padding at all, which reads as "already clean" rather than "declared somewhere else" —
the same shape as a `var()` fallback on a retired token.

Two dead things went with it: `.pkgb-pkgcard > .pkgb-plate--stamp` positioned a stamp **no packages
component renders**, and `.pkgb-pkgname`'s `padding-right: 64px` reserved a gutter for that stamp —
so every package name has been indented 64px on its right for an element that is not there.

The material cards had the same fault by a different route: `padding: 13px 15px 12px` on the frame.
Both frames are bare now; the inset lives on `.pkgb-pkgbody` and a new `.pkgb-mbody`, so the band is
a direct child reaching all three edges and `overflow: hidden` clips it — the MountCard construction.

### ⚠️ D3's premise was half wrong

The brief reported the package band as *"visibly deeper"* than the material bands. **Measured, every
band on the page was 33px** — package and material alike. What differed was the **inset**, which
reads as a deeper, floatier strip. The height needed nothing. The paleness did: at `#e3ebf3 → #d5e1ec`
the package band was *lighter* than the three material tints, which inverts the hierarchy — the
package is the parent object. Deepened to `#cfdcea → #bccfe2`, locked as a lightness comparison
against all three material tints rather than as a hex. Input to **F-AK**; Nick's ruling still pending.

### Measured, before and after — 1440 and 1920, identical at both

| | band height | gap top | gap left | gap right | fold | radius |
|---|---|---|---|---|---|---|
| material, **before** | 33 | **13** | **15** | **15** | **yes** | 10/16/10/10 |
| package, **before** | 33 | **18** | **20** | **20** | no | 16 |
| **all eight cards, after** | 33 | **0** | **0** | **0** | no | 10 / 16 |

Slot row: label **44 → 28.5px**, gap **9 → 6px**. Letter glyph: `path+circle` → `rect+path`.

D4's folded corner is deleted and the 16px top-right radius went with it — that corner existed only
to make room for the fold. **F-AT is answered: the note-yellow stays.**

## Part 2 — the legend, and the commission plates

### D6 — the band had to become a component before a legend could render it

The page already had **two** ways of drawing a band head: the material cards went through
`TypeGlyph`, the package card hand-wrote its own parcel `<svg>`. A legend drawing its own swatch
would have made three. `CardBand` is the one head now, and the material cards, the package card and
the legend all mount it — the same law as `StatusDot`'s legends.

`kind` is `ComponentType | "package"`, **not a class name**: the caller says what the card *is*. A
caller passing `pkgb-t-let` could pass a class that does not exist and get an unstyled band with
nothing to point at. The parcel is drawn inside `CardBand` rather than added to `TypeGlyph`, because
that enum is the data model and a package is not a material.

### D7 — three live commission plates, now bare

The dashed rim lives on `.pkgb-plate` and is dropped only by the `bare` variant, so the sweep is
about which **shape** each call site asks for — `chip`, `disc` and the default `rect` all draw it.

| | was | now |
|---|---|---|
| `FootnoteBand` | 64px `disc` under "How these figures are counted" | `bare` |
| `PackagesBand` | a 44px `chip` **inside the ghost's own dashed border** | `bare` |
| `PackagesDrawer` | the explainer's `chip`s | `bare` |

The ghost buttons keep their dashed borders — an add affordance is dashed by house convention across
the app, and that is a different device from a plate saying "artwork pending". Asserted, so the sweep
cannot creep into it.

**Two things found and not touched:** `PackagesHeroBand` renders a 92px default-shape (dashed) slot
and is **unreachable** — `SubmissionPackages` names it in two comments and never mounts it, so it is
not a D7 offender on the served page, and deleting a component is not a dashed sweep's business.
`QueryAnalytics` imports a **different** `IllustrationSlot` from `./analytics/`, with different props.

## Part 3 — the package drawer

**⚠️ D8's premise, corrected.** Clicking a card was not doing nothing — it opened the **composer**.
That is an edit the lock refuses on any sent package, and it answers "change this" when the question
a card provokes is "what *is* this?". The card opens the drawer now; Edit and Duplicate are its
footer.

It is `PackageDetailDrawer`, not `PackageDrawer`: the existing `PackagesDrawer` is the explainer and
the two would have differed by **one letter**. Both headers name the other; class prefixes are
`pkgd-` and `pkgdd-`. It reuses `Form11Drawer`, which owns the scrim, the slide, Escape and
outside-click.

**⚠️ Two clamps that are not substrings.** `drawerSlots` returns the *whole* opening and the
stylesheet clamps to two lines — cutting the string in JS bakes a line count into the data, wrong at
every width but the one it was cut for. The measurement proves it **on a slot that actually
overflows**; asserting two lines on a short opening would be asserting the content, not the rule.

**⚠️ D13 supersedes the ref.** The ref draws a row per material and all three read *"2 requests from
6 sent"* — because every material in a package rides the same sends. Identical rows are true, look
broken, and invite a hunt for a difference that cannot exist. One line.

**⚠️ D17 applied one surface along.** An unresolvable agent is **named** as unrecorded, never
dropped: dropping the row would make the list disagree with the scorecard's "3 sent" — three counted,
two shown, nothing saying why.

**⚠️ And my own fixture was wrong before the code was.** The returns test expected `replied: 2` from
a bare `Rejected` query. `isResponse` is `hasAgentResponded === true || isRequest`, and a bare
`Rejected` satisfies neither; `recomputeQuery` writes that flag, so a hand-built query without it is
an input the app cannot produce. Fixed, and the behaviour it surfaced — the repo's known global
under-count — kept as its own case rather than papered over.

### F-AV — a material drawer: the shape, not the build

Reported as asked, not built. The material record carries `versionName`, `contentDraft`, `wordCount`,
`contentType`/`fileName`, `notes` and `bookVersionId` — enough for a genuine reader: **the full
opening** (unclamped, which is the whole difference from the package drawer's two lines), the source
line, which packages carry it, its version chip, and the writer's own notes. The derivations exist:
`materialUsage` already answers "in N packages · N requests", and `packagesUsingVersion` names them.

Two questions decide whether it is worth building, and neither is mine:

1. **Does it displace `MaterialModal`, or sit beside it?** The modal is an editor with eleven pieces
   of state. A reader beside it means two ways into one object; a reader *instead* of it means the
   same retarget the package card just had — click reads, footer edits. The second is consistent with
   what Part 3 just did, and it is a bigger change than it sounds.
2. **What does it add that the card does not?** The package drawer earns its place because a card
   cannot show three openings or name six holders. A material card already shows its name, source and
   usage; the drawer would add the *full* text and the notes. That is real, but it is one step, not
   the three the package drawer collapses.

**Recommendation: yes, but as its own pass**, and shaped as "click reads, footer edits" so the two
surfaces match. Building it inside this run would have meant retargeting `onOpenMaterial` across four
call sites with no measurement budget left for it.

### Measured — 1440 and 1920, identical at both

```
drawer "Standard UK"   score  5 SENT · 2 REPLIED · 2 REQUESTS   writable 0
  head band            SUBMISSION PACKAGE — the SAME computed blue as the card's
  COVERING LETTER      Hook-first          v=—
  SYNOPSIS             One-page            v=—
  SAMPLE PAGES         Chapters 1-3        v=§ PROLOGUE-FIRST   lines=2  clamped=true
  who has it           5 holders, each with a StatusDot and a date
  what came back       5 SENT · 2 REPLIED · 2 REQUESTS      (one line)
  footer               DUPLICATE & EDIT · ARCHIVE · Close
  panel                left 972, right gap 52  → hugs the right
  ✕ over the band's label   false
dismissal   × ✓   footer Close ✓   Escape ✓   scrim ✓
```

### ⚠️ THREE FAULTS THE DRAWER FOUND IN THE SHARED PRIMITIVE

None was in this pass's code, and **all three were live on both drawers** — the How-it-works
explainer has had them since it shipped.

1. **Both drawers opened on the LEFT.** The wrapper carries an inline `right: 0` and no `left`,
   which should shrink-wrap a fixed box; measured, it resolves to the **full viewport width**, so the
   flex row's default `flex-start` put the panel at x=24 in a 1440 viewport. The inline `right: 0`
   read as though it were right-anchored and was not.
2. **The wrapper swallowed every scrim click.** Full-width at `z-index: 1001` over an overlay at
   1000 — so every click landed on a `div` with no handler, and the outside-click dismissal was
   **dead** while the overlay's `onClick` read as perfectly correct. `pointer-events: none` on the
   wrapper, `auto` on the panel.
3. **The ✕ sat on the band's `LOCKED` label**, rendering `LOCKE✕`. Found in a screenshot; every
   per-element assertion passed while the two boxes overlapped.

**⚠️ THE SECOND WAS INVISIBLE UNTIL THE FIRST WAS FIXED.** While the panel sat at x=24 there was no
"outside" a tester would think to click. And the scrim case that found it was *right about the
symptom and wrong about the cause* — it clicked a hardcoded x=60 "clear of the panel, on its left",
which was inside the panel. **A fixed coordinate cannot tell "the scrim is broken" from "the panel is
not where I assumed."** The click point is derived from the measured box now.

### ⚠️ AND THE HASH GATE HAS A BLIND SPOT — walked into twice in this run

`git checkout --detach $(git rev-parse HEAD)` **run inside the worktree** resolves the *worktree's*
HEAD, not main's — so it silently re-checked-out the commit it already had. The hash compare then
**passed**, because served and local were both built from the same stale tree.

**The hash gate proves the deploy matches what you built. It does not prove what you built is what
you committed.** The close now checks both: the worktree's HEAD against main's tip *by commit*, then
served against local *by hash*. The tip is read in the main tree and passed in.

Separately, the served hash must be re-read once after the deploy: two comparisons in this run failed
on the first read and matched on the second — the CDN had not finished swapping. A single strict read
reports a false mismatch.

### F-BA, answered

The letter glyph was **a question mark by construction** — not a missing map entry, not a failed
render, not a font fallback. See Part 1 above.
