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
