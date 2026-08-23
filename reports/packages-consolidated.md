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

**⚠️ For Nick:** two sessions were live in `/Users/nickphysick/ScriptAlly-app` throughout this run.
That is the thing CLAUDE.md forbids outright.

**And it was not theoretical — they committed twice while this pack was landing**, so `main` is now
interleaved:

```
18733bed  Pack B Phase 2 — the rendered check the source locks cannot make   ← other session
eed3c482  packages, Part C                                                    ← this session
438f5bf4  Pack B Phase 2 — the task pane's session leaves the page            ← other session
1cb71409  packages, Part B                                                    ← this session
6d5349e5  packages, D-A6                                                      ← this session
5fdbdc66  packages consolidated, recon                                        ← this session
```

Explicit-path staging held — no commit here contains a byte of theirs, and their file was untracked
for most of the run so it could not have been swept in. **The final gate below was therefore run in
the PRIMARY tree, on the true tip, so it covers both sessions' work rather than only mine.**

The other session should be moved to its own worktree; this report cannot tell you which is which.

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

---

## Part C — the Query Centre sent-strip

**Re-cut, not built from nothing.** `PackageGroup` already existed, landed 22–23 Aug against refs
177/178 as a *block* — head row (mark + name over meta) above a wrapped items row.
`query-sent-strip-v2.html` draws a *single row*: `slot · seal · chips`. The behaviour underneath —
drift states, the link, the pills being ordinary pills — is preserved; the shape and the tokens are
the ref's.

### D-C1 · scope — and the half that is BLOCKED, not skipped

`sentExtra` is gated in `QueryTimeline` by
`!!sentExtra && row.status === QueryStatus.QUERIED && !row.kind`, so requests, replies, holding
replies and waiting states carry no attachment block. **That negative half is exactly as specified.**

**⚠️ The positive half is not.** D-C1 asks for the strip on *query sent, partial sent and full
sent*. It renders on **query sent only**, and extending it is blocked on a data question that is
already gated on Nick: `materialsWanted` lives on the **query**, not on the activity.
`Queries.tsx` says so in its own words — *"§2's migration — moving `materialsWanted` onto the
activities — is gated on Nick's confirmation and is NOT done here"*.

Rendering the same query-level list under three send rungs would **state that the same materials
went three times**, which is a false statement about a real record, and precisely the
"copy asserts only what the code does today" family. So it is reported rather than faked. **The
loose treatment is built and correct; it simply has one send to appear on until the migration
lands** — which is a shame, because the ref's own note says the loose shape is *"the common case
further down a query"*, and further down a query is exactly where it cannot yet appear.

### D-C2 · packaged — a contained strip

One row, `align-items: stretch`, so slot and seal share a fill and read as a single sealed object:
52px slot · 142px-min seal · chips at `flex: 1`. Rim `--pro-edge`, both left cells `--pro-fill`.
Seal is **mono `Package` above the Playfair name** — the kind before the instance, which is the
inversion from the block shape's name-over-meta.

The plate **recolours in context** — `.qc-strip .pkgb-plate` takes the strip's ink — rather than
`IllustrationSlot` learning a colour prop, which keeps the library's one-stroke-rule law intact.

**⚠️ One deviation from the ref, on a standing law.** The ref sets the package name at
`line-height: 1.15`. A package name is **writer-supplied**, so it can hold a `y` or a `g`, and this
repo's descender law asks **1.3** of mixed-case Playfair — a law written after a value taken from
two refs that both happened to draw descender-free titles cropped the largest text on every page.
Shipped at 1.3 and locked with a numeric floor.

### D-C3 · loose — no container, and this is the case that will be broken

No border, no fill, no radius, no padding, no slug. Sheets plate on a **transparent** ground.

**The ref's own CSS is the tell:** it defines `.mslug` — a "Sent" label for the floating row — and
then never renders one. Porting the stylesheet faithfully would have reinstated the very wrapper the
design removed.

The lock states this as a **property** of `.qc-loose` (no `border:`, `border-radius`, `background:`,
`box-shadow`, `padding:`) rather than as today's declarations, because the regression it guards is
not a typo — it is somebody tidying a floating row into a light box, on purpose, and silently
reversing the design's one claim. **Proven red** by adding a 1px border.

### D-C4 · Save as package ›

Mono, hairline-underlined, `margin-left: auto`, no fill. Absent — not inert — when there is nothing
to promote. **Not offered beside an attached package** (`groups.length === 0`): those pills are
additions to it, and the offer would be asking which of two packages the writer meant. **It shares
the attach gate** (`canAttachPackages`, `true` for everyone today, `isProUser` when billing arrives)
rather than inventing a second predicate for one feature. Nothing stores a dismissal — a thing you
may ignore forever needs nowhere to remember that you did.

### D-C5 · two slots, one library

`sheets` ported verbatim from the ref; `parcel` was already in the library. Both at **22px in a 38px
plate**, both through `IllustrationSlot`, both still **dashed** — they are placeholders. A new
`chip` shape carries the small plate (8px radius, **no padding**: the other shapes' 12px would leave
14px of room for a 22px mark). Added to the inventory below.

### D-C6 / D-C7 · display only, derivation untouched

The strip has exactly two buttons: the package **name** (its only control, per D-C6) and the promote
link. The block shape's separate `view` button is **retired into the name** — one control where
there were two. No `onEdit`/`onRemove`/`onDelete`/`onCorrect` anywhere in the component; Correction
UI owns editing these rows. `recomputeQuery` is asserted to contain no `packageId`,
`materialsWanted`, `otherMaterials` or `MaterialGroup` — the single-writer rule holds.

### Slot inventory — the two new marks (D-C5, extending Part A's D-A5 table)

The full thirteen-slot commission stays in `reports/submission-packages-recut.md`. These two are
additions, and they are a **pair**: same size, same weight, so they read as two categories rather
than as a filled and an empty state.

| id | surface | icon | rendered | brief |
|---|---|---|---|---|
| `strip-parcel` | Query Centre · packaged send | `parcel` | 22px mark in a 38px dashed plate, on `--pro-fill` | **a wrapped parcel, tied with string and sealed** |
| `strip-sheets` | Query Centre · loose materials | `sheets` | 22px mark in a 38px dashed plate, on the bare pane | **two or three loose sheets, slightly fanned** |

**⚠️ For the illustrator — the small-size constraint is the hard part.** 22px is roughly a third of
the smallest plate elsewhere on the packages page (64px footnote discs). Both marks must survive
that reduction with no fill and a ~1.1px stroke. **The parcel gets a coloured ground and the sheets
get none — that difference belongs to the container, not to the drawing**, so neither should be
drawn assuming a backdrop.

### Locks — `src/components/reading-pane/sentStrip.test.ts` (25 cases)

Includes a bounded sweep proving the old `qc-pkggrp*` classes and `--pastille*` tokens are **gone,
not merely unused** — and it was worth writing: the whole suite passed before this pack with the
block shape in place, so **nothing had ever locked that component's markup**.

### Gates

```
tsc --noEmit   exit 0, 0 lines
vite build     exit 0, no error/[WARNING] lines
vitest run     382 files, 6538 passed, 3 skipped   (baseline 379 / 6483)
```

---

## Phase 7 — driven, at 1440 and 1920

**Environment.** Local `vite preview` of a `build:dev` bundle in the measurement worktree
(`SA_E2E_BASE_URL=http://127.0.0.1:4191`), signed in as `harness@scriptally.test`, against the dev
Firestore. Build target asserted: *"bundle targets scriptally-dev (dev); gen-lang-client-0801391782
absent"*. **Measured scrollbar width: 0px** — the harness's standing blind spot; a
classic-scrollbar question still needs Nick's own browser.

Files: `tests/e2e/packagesConsolidated.measure.ts`, screenshots and the full log in
`reports/packages/`.

### Packages page — Part A holds

| | 1440 | 1920 |
|---|---|---|
| horizontal overflow | **0px** (1440 / 1440) | **0px** (1920 / 1920) |
| retired rail classes in the DOM | **none** | **none** |
| bands rendered | 4 | 4 |
| filled controls | 2 | 2 |

**The filled-control count needs its caveat rather than a tick.** The two are `＋ New package` — the
page's own, and correctly one — and `New`, which is the **shell's** quick-action button. My first
probe scanned the whole document and reported **3** (it also caught the plan `Upgrade`); scoping to
the main region removed one but not the other, because the shell's `New` sits inside `.ws-main`.
**So: the page has exactly one filled control, and the probe cannot yet say so without a human
reading its output.** Stated as measured rather than rounded to the answer the gate wanted.

### The builder — Part B, verified live

```
fields:   ["Package name","Covering letterRequired","SynopsisOptional",
           "Sample pagesOptional","OtherOptional · free text"]
synopsis: ["One-page","Not included"]        ← the stated omission
letter:   ["Hook-first","Comps-forward"]     ← and NOT there, correctly
composition, as opened:        THIS PACKAGE SENDS → Hook-first · One-page
composition, synopsis omitted: THIS PACKAGE SENDS → Hook-first
Other placeholder: e.g. chapter outline, author bio, pitch document
composition after typing Other: THIS PACKAGE SENDS → Hook-first    ← free text does not leak in
```

D-B1, D-B2, D-B4 and D-B5 all confirmed on the running page.

### The sent strip — Part C

**Loose, at both widths** (the first query in the list carries one):

```
border 0px · radius 0px · background rgba(0,0,0,0) · box-shadow none
plate 38px on rgba(0,0,0,0)
```

**D-C3 measured, not read off the stylesheet.** No container, and the sheets plate sits on a
genuinely transparent ground.

**Packaged, after attaching `Standard UK`** (there was no packaged send in the harness data — see
the cleanup note):

| | 1440 | 1920 |
|---|---|---|
| rim | `rgb(195,213,228)` = `#c3d5e4` ✓ `--pro-edge` | same |
| seal fill | `rgb(230,237,244)` = `#e6edf4` ✓ `--pro-fill` | same |
| label + mark stroke | `rgb(65,98,127)` = `#41627f` ✓ `--pro-ink` | same |
| slot / seal / items tops | all `624.9` — **one row** | all share |
| slot / seal / items heights | all `112` | all `53.6` |
| plate | **38 × 38** ✓ | 38 × 38 |
| name `Standard UK` | `scrollHeight 20` vs `clientHeight 20` — **not clipped** | same |
| strip width | **319.2** (wraps to 114px tall) | 533.6 (one line, 53.6px tall) |

**⚠️ At 1440 the strip wraps and triples in height.** The reading pane is narrower there, so the
52px slot and 142px-min seal leave ~123px for three chips and they stack. It is not broken — the
row is `flex-wrap` and the object stays coherent — but a 114px strip is a different thing from the
ref's 53px one, and the ref only ever drew it at its 600px maximum. **Reported, not changed:** the
honest fixes are a narrower seal minimum or letting the chips scroll, and both are design calls.

**D-C1's negative half, measured at both widths:** `attachment blocks on non-send rows: 0`. Visible
in `packed-1920.png` — *Partial requested*, *Partial sent* and *Closed — no response* all render
with no attachment block beneath them.

### ⚠️ The strip test passed once while measuring nothing

The first run reported `packaged strips: 0 · loose rows: 0` and **four tests passed**. Both branches
were skipped, so the file asserted nothing about the thing it is named for. It did not lie about it —
the precondition lines say *"cannot measure the packed strip here"* — and that is the only reason it
was caught. **A negative check over an empty set passes; the population line is what makes the
difference between a green run and a green run that means something.**

The cause was two selector faults, and the second is the documented one:

1. `.qc-qrow` / `.qc-listrow` do not exist — the row is **`.f12-row`**.
2. **An unscoped text locator for a query found "Elinor Hale" on the DASHBOARD.** Every workspace
   page stays MOUNTED, so `querySelector` returns a hidden page's copy and the click then fails on a
   zero-sized element. The hazard CLAUDE.md records, hit on the first attempt. Every locator is now
   scoped to `.qc-wpg`.

### ⚠️ Test data left on the dev harness account, and why it could not be removed

The measurement attached **`Standard UK`** to the harness account's first query (**Rachel Lin ·
Lin Literary**), because there was no packaged send to measure otherwise. It is still attached.

**There is no UI route to un-attach a package.** The Attach menu offers *"Attach a submission
package"* and lists the three materials as `ATTACHED`; nothing offers a detach. Clicking the chips'
`×` did not remove them.

**`detachPackage` exists — `src/components/Queries.tsx:1990` — and has zero callers.** It is written,
commented, and unreachable. Somebody intended the control and it was never mounted; the
reachability sweep this repo prescribes finds it in one grep. **That makes the leftover data a
symptom rather than sloppiness, and it is the thing worth fixing** — see F-O.

Before: one loose chip, `First 15 pages`. Now: a packaged strip carrying
`Covering letter · Synopsis · First 15 pages`. One `updateQuery` on one query on the dev harness
account; no other record was touched.

---

## Final gate — the real `main` tip, both sessions' work

Run in the **primary tree** after the other session's two commits landed, so this is the honest
answer to "is `main` green", not just "are my changes green in isolation".

```
tsc --noEmit   exit 0, 0 lines
vite build     exit 0, no error/[WARNING] lines (grepped in full, never tail alone)
vitest run     382 files, 6538 passed, 3 skipped
```

**Baseline was 379 files / 6483 passed.** The delta is +3 files and +55 tests: 4 from
`packagesOverviewSweep`, 26 from `packageShapes`, 25 from `sentStrip` — and the rest from the other
session's commits.

`git diff --name-only HEAD` at close carries only this phase's own additions plus three artefacts
that were **already dirty when this session opened** and belong to other runs
(`reports/calendar-fixes/month-{1440,1920}.png`, a deleted `run-artifacts/finish-round.txt`, and two
untracked files). None was touched here.

## Flags

### F-L — the pink chip inside the blue strip · **ANSWERED, and it works**

Measured: chip fill `rgb(245,226,218)` = `#f5e2da`, border `#eecdc3`, against a seal of `#e6edf4`
and a **white** strip body (`rgb(255,255,255)` — the tint is the chips, not the container).
Screenshot at real size: `reports/packages/fl-strip-actual.png`; the seal zoomed 3×:
`fl-strip-zoom.png`.

**It does not clash.** The blue is confined to the two left cells and the chips sit on white, so
warm and cool never share an edge — and that is the design working: *blue marks the package, never
its contents.*

**The one thing worth Nick's eye is weight, not hue.** Three pink chips are the loudest thing in a
534px object, so the eye lands on the CONTENTS before the CONTAINER — arguably backwards for a strip
whose whole job is to say "this came from a package". **Proposed, not changed**, and the two options
are not equal:

- quieten the chips *inside a strip* to a neutral — which **contradicts the standing law** that the
  pills are the same pills, and that law is load-bearing (it is what makes removing one an ordinary
  act rather than "breaking the package");
- accept it, on the grounds that the law is worth more than the optics.

**My read: accept it.** The seal already carries the identification, and the alternative buys a
small visual gain by making one class of material look different from another — which is the thing
the law exists to prevent.

### F-M — pastille blue is now a system token · **UNRESOLVED, and bigger than expected**

The ref names its tokens `--pro-*` and derives them from `--pro-slate: #6A89A7`. The code being
replaced argued **the opposite, in a comment**: *"IT IS NOT `--slate`. Slate is the PRO TIER's
colour … blue here means provenance … reusing the tier's token would collapse two axes into one hue
and make a package look like a price."* Both cannot stand. The ref won (global rule 6), the old
sentence was **deleted rather than left contradicting the code**, and the argument is this flag.

**The full inventory — the app has at least four near-identical blue families and one exact
duplicate:**

| where | tokens / values | what the blue means there |
|---|---|---|
| `index.css:43,47–49` | `--slate #6A89A7` · `--slate-deep #4f6b86` · `--slate-tint #eef2f7` · `--slate-line #c7d6e3` | the **Pro tier** |
| `index.css:972` | `--pro #6A89A7` | **an exact duplicate of `--slate`** |
| `packageGroup.css` (new) | `--pro-fill #e6edf4` · `--pro-edge #c3d5e4` · `--pro-ink #41627f` | **provenance** — came from a template |
| `oneScreen.css:44–47` | `--os-pastille-bg #f4f7fa` · `-line #dde6ee` · `-ink #4a5a6b` · `-fig #2c3f52` | dashboard pastilles |
| `comps.css` | `--ct-scout-*` | the **tier** again (states so in its own header) |
| `todo.css:141–144`, `manuscripts.css:459`, `manuscriptPlate.css:332`, `f12.css:3072`, `discover.css:154,166` | hard-coded `#6A89A7` | the tier |

**The three new values are within a few points of `--slate-tint` / `--slate-line` / `--slate-deep`
and are not equal to them** (`#e6edf4` vs `#eef2f7`; `#c3d5e4` vs `#c7d6e3`; `#41627f` vs `#4f6b86`).
So this pack adds a fourth family that is *almost* the third.

**Two questions for Nick, and they are separable:**

1. **Does blue mean one thing or two?** If provenance and tier are genuinely different axes, they
   need visibly different hues, not two slates four points apart — the current pair is close enough
   to read as an inconsistency rather than a distinction.
2. **If it is one thing**, the new set should collapse into `--slate-tint/-line/-deep` and the
   duplicate `--pro` should go.

**Nothing propagates until that ruling.** The three tokens are declared **page-locally in
`packageGroup.css`, deliberately not in `index.css`**, so a reversal costs one file.

### F-N — Other is excluded from tracking · **CONFIRMED**

Nothing aggregates it, and the check is derived rather than listed — the contributing set is read
from `PACKAGE_SLOTS`, so a fourth slot added later is caught. `packageItems` yields nothing for it;
`packageMetrics` / `packageAnalytics` / `packageTracking` / `packageAttach` contain zero field
reads. See Part B.

### F-O — **NEW: a package can be attached to a send and never un-attached**

`detachPackage` is written at `src/components/Queries.tsx:1990`, complete with a comment explaining
its undo semantics, and **nothing calls it**. The Attach menu offers no detach; the chips' `×` did
not remove them. Found because this session's measurement attached a package and then could not
take it back — the leftover harness data is the symptom.

Same family as the row/reel cluster: a symbol that looks live, reads as considered, and has no
caller. **One control away from being fixed**, and until it is, attaching is a one-way act on a
real record.

**⚠️ And `detachPackage` is not quite right either, so mounting it is not purely wiring.** It
restores `materialsWanted` and says nothing about `packageId`, while `attachPackage` deliberately
writes `packageId: ""` as the snapshot lands (*"a query carries the link OR its own materials, never
both"*). Whoever mounts it should decide what the link should be afterwards.

### F-P — **NEW: the builder contradicts a standing CLAUDE.md law**

`TYPE_META[ComponentType.SAMPLE_PAGES].label` is the hardcoded `"Sample pages"`, while the covering
letter goes through `materialLabel(…)`. CLAUDE.md states as a **correctness rule** that
`SAMPLE_PAGES` reads *"Opening sample", never "Sample pages"*, on **every surface** — because three
unit choices map to that one `ComponentType`, so the label asserts a unit the data does not carry.

Not changed: the ref says "Sample pages" too, it is app copy rather than this brief's subject, and
the argument is weaker in the builder than on the agent Materials tab (here you are choosing a saved
version whose own `versionName` carries the specifics). **One constant either way.**

### Carried forward

| flag | state |
|---|---|
| **F-A** | Storage / the wax seal — **moot for this page**, the seal is deleted. Unchanged. |
| **F-B** | open — no guard on deleting a sent package from the Workshop's own surfaces. Unchanged. |
| **F-H** | **open, and still the most visible gap** — no un-archive surface, and no `unarchiveVersion` writer. Now joined by F-O, which is the same shape one layer along: an act with no way back. |
| **F-I** | **closed** by the re-cut; the left column sets the band height at both widths. Not re-measured. |
| **F-J, F-K** | closed in `reports/submission-packages-recut.md`. |
| **Move surface** | Correction UI's outstanding piece. Untouched here — Part C adds no edit affordance, by design. |

---

## What is NOT done, stated plainly

1. **D-C1's positive half is partial.** The strip renders on *query sent* only. *Partial sent* and
   *full sent* are blocked on the `materialsWanted` → activities migration, which is gated on Nick.
   Rendering the query's one list under three send rungs would state that the same materials went
   three times.
2. **Sparse-vs-full states.** The harness account has one data state (2 letters, 1 synopsis, 1
   package). The 6-materials / 3-packages case was **not** measured; manufacturing it means writing
   a lot of records to the dev account, which is a bigger act than a measurement should be without
   being asked.
3. **Nothing is deployed.** `firestore.rules` is ahead of both databases — until a deploy,
   **creating** a package with `Other` works and **updating** one to add, change or clear it is
   silently denied. Dev rules are Claude's to deploy on request; prod is Nick's, and this is the
   sixth item in that queue.
4. **Test data left behind** — see the cleanup note above. One query on the dev harness account.
