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
