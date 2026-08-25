# Manuscript versions

Design refs: `design-refs/manuscript-loop-design.html` (the model, and Parts B–D's panels) ·
`design-refs/query-centre-version-impact.html` (Part E) · `design-refs/opening-variant.html`
(background; the narrower cut that was not chosen).

Baseline at start: **tsc 0 · build clean · 6705 passed / 3 skipped**.

---

## Step 0 — recon

**R1 · `Manuscript`'s shape, and whether an append-only array already ships.** It does, and this
feature reuses it wholesale. `User.queryingGoals?: QueryingGoalEntry[]` is an append-only list whose
**shape is owned by one module** (`lib/queryingGoals.ts`) while the rules guard only *"is a list, at
most N"* — with the cap artefact-locked to `MAX_GOAL_ENTRIES`. `bookVersions` is written to the same
division of labour: `lib/bookVersions.ts` owns the shape, `firestore.rules` guards the list and its
size, and `MAX_BOOK_VERSIONS` is locked against the rule text by a test. **F-AW is answered: yes,
and it was reused rather than re-derived.**

**⚠️ R1a — THE ONE DEVIATION FROM THE PACK, AND IT IS A NAME.** D1 says "`versions` on Manuscript".
That name is not free. `ManuscriptVersion` is already this repo's word for a **material** — a query
letter, a synopsis, a set of sample pages — living in the `users/{uid}/versions` subcollection, and
`versions: ManuscriptVersion[]` is already a live prop on `ManuscriptDossier`,
`ManuscriptPackagesPane`, `PackageModal` and `TrackingBand`. `ManuscriptDossier` is the component
that hosts the new panel, so `manuscript.versions` and `versions` would have sat three lines apart
meaning different things.

The stored field is therefore **`bookVersions`**, and every identifier in the feature says
`bookVersion`. **The writer-facing word is unchanged** — the panel, the chips and the dropdown all
say "version", exactly as the ref draws them. Only the identifier is disambiguated, and the reason
is written at the type so nobody re-tidies it back.

**R2 · Sample materials.** Created and edited through `packages/MaterialModal.tsx`; the record is
`ManuscriptVersion` in `users/{uid}/versions`. It can carry an optional reference — the file already
has four optional fields on the safe `hasAll` guard pattern — but the update allowlist
(`firestore.rules`) has to name the key or the write is silently denied. Both landed together.

**R3 · The activity log.** There is **no `Full Sent` / `Partial Sent` activity *type***: the type is
`Materials Sent` or `Status Changed`, and it is `resultingStatus` that carries `'Full Sent'` /
`'Partial Sent'`. So D3 attaches to *activities whose `resultingStatus` is one of those two*, which
`isSendStatus()` names once. `Activity.materials` set the precedent for an optional payload field —
optional in the rules precisely so every activity written before the deploy stays valid.

**R4 · "Requests by material".** `materialUsage(versionId, packages, queries)` in
`lib/packageMetrics.ts`, walking **material → package → query** via `packagesUsingVersion`. Part D's
"Requests by opening" is that shape with one hop added at the front (**book version → sample →
package → query**), and `requestsByVersion` deliberately mirrors it rather than inventing a second
way to count the same sends. One difference, and it is the point of D15: `materialUsage` returns a
`replyRate`; `requestsByVersion` returns **no rate at all**.

**R5 · Where the panel goes.** The Manuscripts page has a home already: `ManuscriptDossier` renders
four tabs, and the "The record" tab renders `<div className="msv-dbody"><ManuscriptDetailTiles/></div>`.
The versions panel goes there. It also already receives `versions`, `activities`, `packages`,
`queries` and `updateManuscriptQuiet` — so **Part A needed no change to `db.tsx` at all**: the pure
module computes the next array and the existing quiet writer stores it.

### Red gates — none tripped

| Gate | Result |
|---|---|
| A ref missing from both locations | No — all three were in `~/Downloads`, copied into `design-refs/` and committed. |
| Any part requiring a change to `recomputeQuery` | No. A version is payload on an activity. Locked: `recomputeQuery.ts` may not contain the string `bookVersion`. |
| Rules allowlist changes colliding with another session's staged work | No collision. Three separate validators, three separate allowlists, none touched by anything in flight. **But note:** `firestore.rules` on `main` already carries an undeployed `colour` key on `isValidUserTask` (noteboard, 22 Aug). Any dev rules deploy from here carries it too — which is that session's stated intent, not a conflict, but it should not arrive as a surprise. |

---

## Part A — the data model

| | |
|---|---|
| **D1** | `Manuscript.bookVersions?: BookVersion[]` — append-only. Each entry: `id`, `name`, `kind` (`initial`/`reordering`/`revision`), `createdDate` (date-only, London), optional `note`, optional `fromActivityId`. |
| **D2** | `ManuscriptVersion.bookVersionId?: string`. **Sample-pages-only is enforced in the client**, by `bookVersionOf()` — see below. |
| **D3** | `Activity.bookVersionId?: string`, read only where `isSendStatus(resultingStatus)`. |
| **D4** | Six rule edits: three shape guards, three allowlist keys. Rules compile; a live write test is in the deploy section. |
| **D5** | No migration. All three fields optional; absent means "not recorded". |
| **D6** | Locked, and structurally: the live gate is `manuscriptLimitError(plan, existingCount)`, which takes **a count of manuscripts** and has no access to a manuscript at all. It could not reach a version if it tried. |

**⚠️ SAMPLE-PAGES-ONLY IS A CLIENT RULE, DELIBERATELY, AND SO IS SENDS-ONLY.** Both could have been
written into `firestore.rules` and both would have been wrong there.

- A `componentType` changed after the fact would make an **existing, valid document unwritable** — a
  worse failure than an ignored field, because it locks the writer out of a record they can see.
- Restating "Full Sent or Partial Sent" on the activity would make a **correction that moves an event
  between statuses** fail on a field it is not touching. The correction pack does exactly that.

So the rules guard the *type and size* of the value; the client is the single writer and never puts
one where it does not belong. `bookVersionOf()` is the one reader, and it returns `null` for a
letter or a synopsis carrying a stray id rather than rendering it.

### What the lock found on its first run

The module's own verdict-word ban (`recommend|best|winner|preferred|strongest|should send`) went red
immediately — on `latestVersion`'s **reduce accumulator**, which was called `best`, inside the one
function whose entire point is that it ranks nothing. Renamed to `newest`.

**⚠️ AND THAT CASE READS COMMENTS, WHICH REVERSES THE HOUSE RULE ON PURPOSE.** The standing
convention is to strip comments before a source lock, because prose recording a retirement quotes
the token it retired — right for *"is this class still emitted"*, wrong here. The ban is on the
**concept**: a comment telling a future reader which opening to prefer is as much a verdict as code
returning one. The cost is accepted and stated in the test — `bookVersions.ts` may not quote those
words even to explain them, and its note about the renamed accumulator is written around the word for
that reason. **If that case ever goes red the fix is to reword the prose, never to add a `decls()`
strip**, which would quietly delete half of what it checks.

### Evidence

`src/lib/bookVersions.test.ts` — 36 cases, all passing. They are **derivation and source checks**:
they prove the arithmetic and the model's shape, never that anything rendered. The rendered claims
(panel absent at one version, present at two; counts on screen matching) are measured in Part B.

---

## Part B — the panel

Lives on **"The record"** tab, beneath the detail tiles. Not a fifth tab: a tab would advertise the
feature to every writer who has never used it, which is the thing the gate exists to prevent.

### ⚠️ F-AZ — the gate has a door below it, and that is a deviation

D8 says the panel renders only when a second version exists; the fence says a writer with one
version sees none of it. **Both are honoured for the list** — below two there is no band, no row, no
count, and not even the one version's name.

But this panel is the only place a version can be created, so **a gate at two with nothing below it
makes the feature permanently unreachable**: no writer could ever reach a second version. The ghost
row is therefore the entry point at nought and one, and everything else arrives at two.

Flagged rather than assumed. Moving the entry point elsewhere — the plate's ⋯ menu, say — is a
one-line change if that reads better.

### Two reconciliations with standing locks, both against the ref

- **The band is a token, not sage.** `manuscriptPlate.css` already carries the ruling: *"Editorial is
  monochrome and has no sage at all; a sage band there is not 'the theme with a green tint', it is
  the wrong theme."* Sage in Cappuccino, pink-and-ink in Bold, a grey step in Editorial. A mockup
  wins on what it shows; a standing, reasoned lock wins over an artefact that could not know about it.
- **The R&R chip replaces the kind chip** rather than joining it — which is what the ref itself
  draws. "From R&R" already says the version is a revision, and two chips saying one thing is noise.
  It renders only while the activity is still there; a link the correction pack has since moved shows
  **nothing** rather than a dead chip, and the row falls back to stating its kind.

### The date is parsed by hand

`new Date("2026-03-01")` is UTC midnight, so a browser west of Greenwich renders **FEB** for the
first of March. `monthYear()` reads the string, like every other day-granular field in this app.

### Evidence — measured on the deployed dev site

`tests/e2e/bookVersions.measure.ts`, at **1440 and 1920**, against `seedBookVersions.mjs` at three
different counts. The gate is a claim about absence, so it is proved from **both** sides:

| Versions seeded | rows | bands | chips | ghost |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 1 |
| 1 | 0 | 0 | 0 | 1 |
| 3 | 3 | 1 | 4 | 1 |

At three, the rendered rows against figures derived by hand from the seed:

```
Prologue-first        [INITIAL]            MAR 2026 · 2 samples · held by 1 agent
Worldbuilding-first   [REORDERING]         MAY 2026 · 1 sample  · held by 1 agent
Post-R&R (T. Marsh)   [§ FROM R&R][LATEST] JUL 2026 · 0 samples · held by 0 agents
```

Exactly one `Latest`, on the **newest by date** rather than the last in the list. Exactly one R&R
chip, and the row carrying it has **no** kind chip. No cropped descenders at either width.
Identical at both widths — the panel caps at 720px, as the ref draws it. Screenshots in
`reports/manuscript-versions/`.

**⚠️ THE MEASUREMENT'S FIRST TWO RUNS REPORTED A WORKING PANEL AS ABSENT**, both times through the
locator rather than the page:

- `.mlib-card` **does not exist**. The library card's affordance is `.mlib-plate`. A locator written
  from the obvious guess found nothing and the failure read *"no panel"*.
- The tab labels are **uppercased by CSS**, so `innerText` is `THE RECORD` while the source says
  `The record`. This repo has recorded that trap repeatedly and it still cost two runs here.

Both are the standing shape: a probe that answers a question you did not ask, in the format of the
question you did.

### D4 — proved on the live dev database, both directions

`node tests/e2e/rulesProbe.mjs`, after deploying dev rules with **both** configs and verifying by
release `updateTime` rather than the success line (`cloud.firestore` 18:48:34Z ·
`cloud.firestore/ai-studio-…` 18:48:49Z, both 25 Aug):

```
✅ bookVersions (a real list)                    ACCEPTED
❌ bookVersions as a string                      DENIED
❌ bookVersions over the cap (51 entries)        DENIED
✅ material bookVersionId                        ACCEPTED
❌ material bookVersionId as a number            DENIED
✅ activity bookVersionId                        ACCEPTED
❌ activity bookVersionId as a list              DENIED
```

Every write was undone; **D5 holds** — no existing document was changed.

**⚠️ AND THE SEED SCRIPT LEARNED THE CREATE/UPDATE SPLIT THE HARD WAY.** `setDoc(…, { merge: true })`
on an existing material is an **update**, and the versions update allowlist is a `hasOnly` — so
re-sending `createdDate` with a different value denied the whole write, silently, about a field the
seed had no business touching. Existing documents now get the one field; missing ones get a full,
valid create.

### F-AX — nothing to report yet

The flag asks where a version chip would land with no room for it. **No chip renders outside this
panel today**: the sample card (D12), the package drawer's slot (D13), the Query Centre's `SAMPLE`
row (D19) and the query list's column (D22) are all Parts C–E. The answer belongs to those parts and
is not guessable from here.

### Deployed

Dev rules (both databases) and dev hosting, from a clean worktree at `80cbe2af`.
Bundle hash-compared at both ends — `index-CzSZ8Tis.js` served and local — and the served
stylesheet greps `bv-panel · bv-band · bv-row · bv-chip--rr · bv-chip--latest · bv-ghost`, one each.

**The fixture is left at three versions**, so the panel is on screen at
https://scriptally-dev.web.app → Manuscripts → *The Smoke Test* → The record.

---

## Where this stops

Parts A and B stand alone and are the intended first seam. **Parts C–D are the next session**
(samples reference a version; the two tracking panels), and **Part E is its own** (the Query Centre).
