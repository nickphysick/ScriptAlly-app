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
carousel : 4 slides · slot label "SLOT · PKG-JOB-RECORD · 396×214"
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

## Flags

| flag | state |
|---|---|
| **F-Q** | **answered: 2** — `seed-pkgq-3`, `seed-pkgq-4`. Migration in Phase 2; the outcome is recorded there. |
| **F-S** | forming — `CompCarousel` is already shareable verbatim; `StagesBlock` needs heading/sub/stages as props; `FeatureBlock` is too comps-specific to share. Full shape after Part A. |
| **F-R** | pending Part B. |
| **F-M, F-O, F-H, D-C1, Move surface** | carried, untouched. |

**Phase 5 of the broadsheet build remains held. Nothing is deployed in this phase.**
