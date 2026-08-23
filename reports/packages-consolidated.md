# Packages, consolidated — visual re-cut, flexible slots, and the Query Centre strip

Three parts in one session: **A** the visual re-cut of Submission packages, **B** flexible package
slots, **C** the sent-strip in the Query Centre.

Refs committed in Phase 1: `design-refs/submission-packages-recut-v2.html` (already in tree at
`acbf2f77`), `design-refs/package-shapes-amendment.html`, `design-refs/query-sent-strip-v2.html`.

---

## ⚠️ INCIDENT — a second session was editing this checkout while recon ran

**Reported first because it changes what any gate in this report is worth.**

`src/components/todo/useTaskPaneSession.tsx` is **untracked** and was **created at 19:40:24**, about
seventy seconds into this session's recon. It was **not** in the opening `git status`. Sampled over
the next seventy seconds it changed again — 40,183 → 40,212 bytes at 19:42:38. That is a live edit
loop, not a leftover.

It is syntactically incomplete at the moment of writing — an unterminated ternary at line 649
(`...(isBulkCard(paneCard) ? { … }` with no `: {}` and no closing paren) — so:

| gate | in the primary tree | in a clean worktree at `HEAD` |
|---|---|---|
| `tsc --noEmit` | **RED** — `useTaskPaneSession.tsx(649,3): error TS1005: ':' expected.` | **exit 0, zero lines** |
| `vite build` | not run there | **exit 0**, no `error`/`[WARNING]` lines (chunk-size note only) |
| Vitest | 379 files / 6483 passed, 3 skipped | same |

**The red is entirely theirs.** Their file is untracked, so it can never enter an explicit-path
commit; but it *is* under `src/`, so it poisons `tsc` for anyone sharing the tree.

**Consequences, and why this was not simply worked around:**

1. **The baseline gate is unobtainable in the primary tree.** Global rule 3 asks for
   "no worse than baseline", and a baseline that another process is editing is not a baseline.
2. **Phase 7's `git diff --name-only HEAD` empty** cannot be satisfied while a second session
   dirties the tree.
3. **Playwright measurement is unwinnable by construction.** `bundleGuard` refuses a bundle whose
   sources changed after it was built — correctly. CLAUDE.md already records this exact race as
   *"not slower — unwinnable"*, with six measurement files that were unfinishable in a shared
   checkout and ran 12/12 in a worktree.

**Remedy taken — the one CLAUDE.md prescribes.** A detached measurement worktree at
`/Users/nickphysick/ScriptAlly-pkgcons` (`git worktree add --detach … HEAD`), `node_modules`
symlinked, `.env.local` and `tests/e2e/.auth/` copied in (both gitignored, both the dev-only harness
account — **delete the second copy when the worktree goes**). Gates and measurement run there;
**commits still come from the primary tree**, by explicit path, so direct-to-main is unchanged.

**There is no file collision.** Their session is in `src/components/todo/`; this work is in
`src/components/packages/`, `src/components/reading-pane/`, `src/lib/package*` and
`firestore.rules`. The collision is the tree, not the files — which is why isolation is sufficient
and stopping was not required.

**⚠️ For Nick:** two sessions are live in `/Users/nickphysick/ScriptAlly-app` right now. That is the
thing CLAUDE.md forbids outright. The other session should be moved to its own worktree or stopped;
this report cannot tell you which session is which.

### Baseline, recorded fresh at commit time (worktree `d4bdf418`)

```
tsc --noEmit   exit 0, 0 lines
vite build     exit 0, no error/[WARNING] lines (chunk-size note is the expected match)
vitest run     379 files, 6483 passed, 3 skipped
```

---

## ⚠️ SCOPE — Part A is already built. This prompt was written against an older tree.

Checked against code, not commit messages.

**Part A landed on 21 Aug** as `3726ba4e` ("packages, re-cut — the hero stops being a void, the
columns become a grid, and the briefs become drawings") and `7bef5209` (closeout), with its own
report at `reports/submission-packages-recut.md` — including the slot inventory table that D-A5
calls the deliverable.

| deliverable | state | evidence |
|---|---|---|
| **D-A1** PRO marker removed | **done** | no wax seal, no `PRO` string in `src/components/packages/`. `reports/submission-packages-recut.md` R3 records it was this page's own code, and F-K closed: `PageHeader` renders no Pro marker of its own. |
| **D-A2** hero re-cut | **done** | `PackagesHeroBand.tsx`; recut report measures left column 241/168 at 1440 and 187/168 at 1920 — the left column sets the band height. **F-I closed by it.** |
| **D-A3** materials grid | **done** | three-row columns; heads share a top, ghosts share a bottom, columns equal. |
| **D-A4** icon placeholders | **done** | `packageIcons.tsx` — seventeen marks ported verbatim; `IllustrationSlot.tsx` is the single `(icon, px)` component. |
| **D-A5** slot inventory table | **done** | `reports/submission-packages-recut.md` § "The slot inventory — the artist's commission". |
| **D-A6** `.pkgo-rail` sweep | **OUTSTANDING** | `packagesOverview.css:47` still declares it; `grep -rnE "pkgo-rail" src --include=*.tsx` returns **nothing**. Orphan confirmed. |

**So Part A reduces to D-A6, plus adding Part C's two new slots to the inventory table (D-C5).**
Nothing else in Part A is re-done — redoing measured, committed, reported work would be waste, and
the re-cut's own measurements are in its report rather than repeated here.

---

## Step 0 — recon

### R1 — the illustration slot is a single implementation

`src/components/packages/IllustrationSlot.tsx` is the only one, taking `(icon, px)` and reading
`PACKAGE_ICONS` from `packageIcons.tsx` (seventeen marks, one 32×32 viewBox, stroke set once on the
parent `<svg>`). Confirmed by grep: the only other reference to `PACKAGE_ICONS` outside the library
is a comment in `packageTracking.ts` recording the stamp bug the re-cut found.

**One homonym is not it:** `ArtSlot` (`src/components/todo/ArtSlot.tsx`) is the To-do board's art
component, and the landed `PackageGroup` uses **that** one for its package mark — see R5.

### R2 — the PRO marker was page-local, and is gone

Page-local, and already deleted (D-A1 above). `PageHeader` renders no Pro marker of its own, so
there is no app-wide decision hanging off this. **F-K stays closed.**

### R3 — where the all-three-slots invariant is enforced

**`firestore.rules:180–190`, `isValidPackage`:**

```
&& data.queryLetterVersionId is string && data.queryLetterVersionId.size() <= 128
&& data.synopsisVersionId    is string && data.synopsisVersionId.size()    <= 128
&& data.samplePagesVersionId is string && data.samplePagesVersionId.size() <= 128
```

`X is string` requires the **key to be present**; `""` passes the size test. The update allowlist is
`firestore.rules:629` —
`['packageName','queryLetterVersionId','synopsisVersionId','samplePagesVersionId','status']`.

**⚠️ The finding that matters for Part B: the rules are not what makes synopsis compulsory.** All
three slots may already be `""` and the rule passes. The compulsion is **client-side**, in
`PackageModal.tsx`: the sample slot has a `<option value="">Not included</option>` and the synopsis
slot does not, so synopsis can only become empty *by accident* (when the writer has saved no
synopses at all and `synopses[0]?.id` falls through to `""`) and never *by choice*.

So D-B1 is two edits, not one: give synopsis the stated choice in the builder, and — since "only the
covering letter is required" is now a real invariant rather than a wish — **tighten** the rule so
`queryLetterVersionId` has `size() >= 1`. `""` stays the sentinel; `UNFILLED_SLOT` in
`src/lib/packageMetrics.ts` remains the single source of it.

### R4 — `SubmissionPackage` has no free-text field

`src/types.ts:367–377` is `id · manuscriptId · userId · packageName · queryLetterVersionId ·
synopsisVersionId · samplePagesVersionId · status · createdDate`. Nothing free-text.

Part B's "Other" therefore needs an **additive** field, and **both** halves of the rules change or
the write is silently denied: a clause in `isValidPackage` *and* an entry in the `hasOnly` update
allowlist at line 629. (Silent denial on a missing allowlist entry is already a recorded fault
class in this repo.)

### R5 — the sent event, and what renders there today

`src/components/Queries.tsx:5803` renders `<PackageGroup>` inside `.qc-msub`, the send event's
materials area. `src/components/reading-pane/PackageGroup.tsx` (76 lines) +
`packageGroup.css` (54 lines) are what Part C replaces.

**It is built to refs 177/178, not to this prompt's ref.** Landed shape is a *block* — a head row
(mark + name over meta) above a wrapped items row. `query-sent-strip-v2.html` draws a *single row* —
`slot | seal | items`. Concretely different:

| | landed (refs 177/178) | `query-sent-strip-v2.html` |
|---|---|---|
| shape | block: head row over items row | one row: slot · seal · items |
| leading mark | `ArtSlot` at `maxWidth={28}` | `IllustrationSlot`, 22px icon in a 38px dashed plate, in a 52px cell |
| seal | Playfair name **over** mono meta | mono `PACKAGE` **over** Playfair name |
| tokens | `--pastille #c2cfda` / `-tint #edf1f6` / `-ink #3a5570` | `--pro-fill #e6edf4` / `--pro-edge #c3d5e4` / `--pro-ink #41627f` |
| loose materials | bare pills below the group | 38px loose-sheets slot + chips, **no container** |
| promote | — | `Save as package ›` at the row's end |

**What must survive the re-cut** — behavioural decisions from earlier prompts that still stand:
`packageDrift`'s three states (`changed` → `As sent, 12 Aug`; `deleted` → `Package no longer
exists`; `none`/`unknown` → silent), `driftNote`, and the fact that the pills inside are the *same*
pills the page builds elsewhere, with their own editors and `×`. D-C6's "display only" is about the
**strip** adding no affordances — not about the pills losing theirs.

### R6 — an activity carries both, and the group is presentation

`materialsWanted` is **one flat list** of `string | QueryMaterial`. A material that came from a
package carries an origin mark on the item; `groupByOrigin` (`src/lib/packageAttach.ts:251`) reads
those marks and splits the list into `MaterialGroup`s plus the ungrouped remainder. There is no
nested structure in the data.

So the answer to "packageId **or** a loose list?" is **both, always, in the same list** — a send can
carry a package group *and* hand-attached items, and Part C must render the two treatments in the
same event. That is already how `Queries.tsx:5803–5814` is written (groups first, then
`pills.filter((p) => !claimed.has(p.material))`), which is the seam Part C's loose treatment hangs
off.

### Concurrency gates — both cleared

- **Page-header session:** `/Users/nickphysick/ScriptAlly-masthead` is clean and last touched
  20 Aug. No shared-header edit is needed by the outstanding work (D-A6 is a CSS deletion in
  `packagesOverview.css`; Parts B and C are page-local).
- **Correction UI:** `git fetch` run; `origin/main` and local `HEAD` are **level (0/0)** — the
  prompt's "origin/main is behind local" no longer holds. `CorrectionFork`, `CorrectionEdit`,
  `ConsequenceSheet`, `MovePicker`, `MoveSheet` are all settled in
  `src/components/reading-pane/CorrectionSheet.tsx` at `HEAD`, and **no worktree has any
  `reading-pane` file modified or staged**. Part C may proceed.
- **Third, unanticipated:** the live session above. Isolated, not blocking.

### Red gates — none tripped

All three refs were present (one already committed, two in `~/Downloads`); no required edit lands in
a do-not-touch or shared-header file; Correction UI is settled.

---

---

## Part A — D-A6, the only survivor

**The brief named one rule. The fault was twenty.**

`.pkgo-rail` was declared in `packagesOverview.css` and rendered by nothing — but so was most of the
sheet. §4 of the broadsheet pack (`71debcac`) retired the rail and three bands took its place; the
re-cut moved the problem statement into the hero band. Neither change swept the CSS behind it.

**The sweep was for RENDERS, not declarations**, over the whole of `src`, in every form a class can
take. Of 36 declared `.pkgo-*` classes, **10 are live and 26 were dead**; six of the dead were
modifiers living in a *second* file.

| | |
|---|---|
| `packagesOverview.css` | **439 → 150 lines.** Gone: the two-column body (`pkgo-grid`/`rail`/`stage`), the rail panels (`panel`/`head`/`lbl`/`meta`/`chip`/`add`/`body`), the back control, the ghost empty states (`ghost`/`ghost--inert`/`gtitle`/`gsub`), the register rows (`reg`/`row`/`type`/`name`/`comp`/`detail`), the problem statement (`prob`/`prob::after`/`probsub`/`hand`), and the how-it-works header (`hiwhead`/`hiwtag`). Plus the dead `.pkgo-grid` line in the 1080 media query. |
| `packagesFlow.css` | **393 → 364 lines.** Orphaned modifiers on bases that no longer exist: `.pkgo-ghost--locked` (+ `:hover`, + its `.pkgo-gtitle` descendant), `.pkgo-ghost--next`, `.pkgo-add:disabled` (+ `:hover`), and `.pkgf-tile--ghost .pkgo-gtitle`. |
| survivors | `pkgo-eyebrow · num · num--done · plate · platelbl · step · step--live · steps · tick · tick--live` — the how-it-works infographic, whose only consumer is `PackagesOnboarding.tsx`. |

### ⚠️ Three live classes read as dead first, and the reason is worth keeping

`pkgo-num`, `pkgo-step` and `pkgo-tick` are rendered **only** as
`` className={`pkgo-num${state.done ? " pkgo-num--done" : ""}`} `` — the token immediately followed
by an interpolation. The house bounded matcher (`/["\s`]token["\s`]/`) correctly declines that
form, because when the question is *"is this exact class forbidden"* a concatenation is not the
token. Here the question is the **opposite** one — *"is this class ever produced"* — and the same
matcher gives the wrong answer. Deleting on that first reading would have stripped the styling from
the one part of the sheet that still renders.

**The general form: a matcher is only correct with respect to the question being asked.** Reusing
the repo's bounded form without re-deriving it for an inverted question is how a correct idiom
produces a wrong answer.

### The lock — `packagesOverviewSweep.test.ts` (4 cases)

A comment would not have stopped this; the sheet *had* comments. The lock asserts the **property**
over the whole sheet rather than forbidding a list of retired names — a name-list would have been
written from the same twenty-item blind spot that let these survive:

1. **population floor first** (≥ 8 selectors found, and the component mentions `pkgo-`) — a
   negative check over an empty set passes, which is this repo's recorded vacuous-probe family;
2. every declared class is rendered by `PackagesOnboarding`, using a matcher that **does** count the
   `${` form;
3. the twenty-two retired names are not declared again;
4. `packagesFlow.css` contains no `.pkgo-` at all — a modifier on a deleted base is dead twice over,
   and it lives in the file a sweep of the *named* file would never open.

**Proven red before believed:** re-adding `.pkgo-rail { display: flex; }` fails cases 2 and 3 with
`dead rules in packagesOverview.css: pkgo-rail`; removing it restores 4/4.

**Comments stripped before asserting** — the sheet's new header names every class it just retired,
which is precisely the false-red this repo has hit seven times in one session.

### Gates (worktree `d4bdf418` + these changes)

```
tsc --noEmit   exit 0, 0 lines
vite build     exit 0, no error/[WARNING] lines
vitest run     380 files, 6487 passed, 3 skipped   (baseline 379 / 6483 — +1 file, +4, all the new lock)
```

**No page was re-measured for this phase, and deliberately so:** every deleted rule was proven to
match no element, so there is nothing whose rendering could have changed. The re-cut's own
measurements stand in `reports/submission-packages-recut.md`.

### Found in passing, NOT swept — a decision for Nick

`.pkgf-tile--ghost` (`packagesFlow.css`) is also rendered by nothing, and it has a `:hover` rule
under it. It is a `pkgf-` class, a different family from the one D-A6 names, so it is reported
rather than deleted — widening a housekeeping sweep into a neighbouring family without being asked
is how a small commit becomes an unreviewable one. One line to remove when someone wants it.

---

## Part B — flexible package slots

### D-B1 · only the covering letter is required

**The rules were never the constraint.** `isValidPackage` already permitted `""` in all three slots;
what made a synopsis compulsory was the *builder*, where sample had a stated `Not included` and
synopsis did not. A synopsis could therefore only become empty **by accident** — the writer had
saved none, and `synopses[0]?.id` fell through to `""`. A slot empty because nobody could say
otherwise is not the same fact as a slot the writer left out, and the card cannot tell them apart
afterwards.

**⚠️ The letter requirement is enforced on CREATE only, and that split is the important decision.**
`isValidPackage` gates **update** as well as create. Requiring a filled letter inside it would make
every package written before this change **permanently unupdatable — and therefore un-archivable and
unrepairable, silently**, because the writer's only route to fixing it is an update. Legacy
letterless packages are producible today (build one with no saved letters and the select has no
options). So:

- `firestore.rules` create rule: `&& incoming().queryLetterVersionId.size() >= 1`
- `isValidPackage`: unchanged on the letter — all three keys **present**, none required **filled**
- the builder: Save is disabled *and states why* — `Save a covering letter first — every package
  needs one.`

A disabled button with no sentence teaches nothing, and without the client-side refusal the write
would come back from three layers away as `Database transaction error`.

**A second fabricated-value fault, fixed in passing:** the builder seeded `synopsisId` from
`synopses[0]` **even when editing**, so opening a letter-only package and pressing Save would have
silently re-filled the slot the writer had chosen to leave out. Only a *new* package now takes a
default. Same family as `completionVia`'s writing default and `RemindChoice`'s fabricated lead.

### D-B2 · one free-text "Other" line — additive, and absent when empty

`SubmissionPackage.otherMaterials?: string` (R4: there was no free-text field).

**Both halves of the rules change, or the write is silently denied** — the recorded fault class:

```
isValidPackage:  && (!data.keys().hasAny(['otherMaterials'])
                     || (data.otherMaterials is string && data.otherMaterials.size() <= 512))
update allowlist: hasOnly([… 'samplePagesVersionId', 'otherMaterials', 'status'])
```

**Empty means ABSENT, never `""`** — a stored empty string would claim the writer answered the
question. `addPackage` omits the key; `updatePackage` converts blank to `deleteField()`. That
conversion lives in `db.tsx`, not in the callers, so the two write paths cannot drift — and the
caller therefore **always sends the key**, because omitting it would make "cleared" indistinguishable
from "untouched" and the old text would survive the edit.

`OTHER_MAX = 512` sits beside `UNFILLED_SLOT` in `packageMetrics.ts` and is asserted **equal to the
rule's ceiling**, so the input cannot compose a write the rule will refuse.

### D-B3 · it renders in Caveat, and nothing counts it — F-N

**It is not a fourth `TileSlot`, and that is a type-level decision rather than a convention.**
`PackageTile.other: string | null` sits *outside* `slots`, because everything that walks `slots`
would otherwise treat prose as a material. **It also omits itself**: the three slot rows always
render (`Not included` states that a slot was considered and left out — a fact about the package's
shape), but there is no equivalent fact about free text, and a permanent empty `Other` row would make
every package look unfinished.

Set in **Caveat, burgundy, `font-style: normal`** (`.pkgb-sln--other`) — the hand the app already
uses for the writer's own words. It reads as something *typed* rather than something *chosen*.

**F-N — confirmed, and asserted against a derivation rather than a list.** A hand-written "these
modules must not mention it" list would go green the day someone adds a fourth derivation. Instead
the contributing set is **read from `PACKAGE_SLOTS`** and the claim is that `otherMaterials` is not
in it — so adding a real slot is caught, and so is this one being quietly promoted. Plus:
`packageItems` yields nothing for it, and `packageMetrics` / `packageAnalytics` / `packageTracking` /
`packageAttach` are asserted to contain **zero** field reads (two allowed in `packageMetrics`, which
defines the accessor).

### D-B4 / D-B5 · builder copy and the composition line

Hint takes the ref's wording verbatim, and **"one of each" had to go** — it is no longer true.
Labels carry `Required` / `Optional` / `Optional · free text` in a `.pkgf-opt` tag that is quieter
than the label beside it: "Optional" is the ordinary case on three of four rows, and a tag with any
weight would read as a caution on every one of them. The composition line filters through
`isSlotFilled`, so an unfilled slot is **absent** rather than printed as `Not included` — and `Other`
is not in it either, because the line lists what the package *sends* and free text is a note about
the package, not one of its contents. Empty throughout reads `nothing yet`.

### ⚠️ My own probe had the exact substring fault this repo documents

The F-N check first counted `otherMaterials` as a substring — so **the accessor's own name,
`otherMaterialsText`, scored as a read of the field it exists to wrap**, and the case went red on
correct code. Same shape as `tdk-q` matching `tdk-quiet`. Bounded to
`/otherMaterials(?![A-Za-z0-9_])/`. Recorded because the trap is documented, I had just re-read it,
and I still wrote it — a paragraph is not protection.

**And one fake knob, caught before commit:** `.pkgb-sln--other` was first written
`font-family: var(--font-hand, 'Caveat', cursive)`. No `--font-hand` exists anywhere in `src`, so the
rule would have rendered perfectly while advertising a knob that was never there — the
"parameterised and is not" class. The house idiom is the family directly, and a lock now forbids the
token.

### Locks — `src/lib/packageShapes.test.ts` (26 cases)

Behavioural where behaviour is the claim (`otherMaterialsText`, `packageTiles`, `packageItems`),
source where the claim is about a rule or a piece of copy. Slice anchors are asserted before use.

**Proven red before believed** — two breaks, both restored:
- pushing `Other` into `slots` → *"NEVER puts Other in slots"* fails;
- reinstating `size() >= 1` inside `isValidPackage` → *"isValidPackage does NOT require a filled
  letter"* fails.

### Gates

```
tsc --noEmit   exit 0, 0 lines
vite build     exit 0, no error/[WARNING] lines
vitest run     381 files, 6513 passed, 3 skipped   (baseline 379 / 6483)
```

### ⚠️ RULES ARE EDITED AND NOT DEPLOYED — what that means on dev today

This session deploys nothing (global rule 2), so `firestore.rules` in the tree is ahead of both
databases. Until a `firestore:rules` deploy lands:

| path | dev/prod behaviour now |
|---|---|
| **create** a package with `Other` filled | **works** — the old `isValidPackage` does not restrict extra keys on create. |
| **update** a package to add, change or clear `Other` | **SILENTLY DENIED** — the old `hasOnly` allowlist has no `otherMaterials`, and a denied update surfaces as nothing happening. |
| letter-required-on-create | **not enforced** yet — the builder enforces it client-side regardless. |

**Dev deploy is Claude's to run when asked** (CLAUDE.md, 18 Aug) — one command, naming its config
and project, with the before/after checks that section specifies. It was **not** run here because
this prompt forbids it. **Prod rules remain Nick's**, and this adds a sixth item to that queue.

### Found in passing — a live tension with a CLAUDE.md law, not changed

`TYPE_META[ComponentType.SAMPLE_PAGES].label` is `"Sample pages"`, hardcoded, while the covering
letter goes through `materialLabel(…)`. CLAUDE.md states as a **correctness rule** that
`SAMPLE_PAGES` reads *"Opening sample", never "Sample pages"* — because three unit choices
(pages/chapters/words) map to that one `ComponentType`, so the label asserts a unit the data does not
carry. The builder therefore contradicts the law on every render.

Left alone deliberately: `package-shapes-amendment.html` says "Sample pages" too, this is app copy
rather than this brief's subject, and the argument is weaker here than on the agent Materials tab —
in the builder you are choosing a saved version whose own `versionName` carries the specifics. **A
decision for Nick**, one constant either way.

## Flags

| flag | state |
|---|---|
| **F-M** | **Raised early, because the refs and the landed code disagree in writing.** `query-sent-strip-v2.html` names its tokens `--pro-fill/--pro-edge/--pro-ink` and derives them from `--pro-slate:#6A89A7`. The landed `packageGroup.css` argues the *opposite* in a comment: *"IT IS NOT `--slate`. Slate is the PRO TIER's colour … blue here means provenance … Reusing the tier's token would collapse two axes into one hue and make a package look like a price."* Both cannot stand. Full inventory of the app's blues below once Part C lands; Nick to rule. |
| **F-L, F-N** | pending Part C / Part B. |
| **F-A** | moot for this page (the wax seal is deleted); carried. |
| **F-H** | open, unchanged — still no un-archive surface. |
| **F-I** | **closed by the re-cut** (`reports/submission-packages-recut.md`); no re-measure needed. |
| **F-B** | open, unchanged. |

**Phase 5 of the broadsheet pack remains held. This session deploys nothing.**
