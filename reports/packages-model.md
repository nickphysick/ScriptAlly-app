# The settled packages model

Ref: `design-refs/packages-page-settled.html` (copied from `~/Downloads`, committed in Phase 1).
Supersedes `packages-banded-cards.html` for the band and the shelf; `package-drawer.html` still
governs the drawer, amended by D14.

Baseline at `e9ecd7ec`: tsc 0 · build 0 · vitest **417 files, 7182 passed, 3 skipped, 0 failed**.
Tree level with `origin/main` (behind 0); one unpushed commit ahead belongs to the timeline lane and
is not touched here.

---

## Phase 1 — recon

### R1 · `bookVersionId` on sample materials, and everything that reads it

**There are TWO fields of that name and they are unrelated.** Conflating them is the first way this
part goes wrong.

| | `types.ts:392` | `types.ts:745` |
|---|---|---|
| Owner | `ManuscriptVersion` — a sample material | `Activity` — a send event |
| Means | which ordering this pasted text excerpts | which ordering went out on this send |
| Part C | **vestigial** (F-BH) | **untouched** — it is what D15 and the holdings read |

Readers of the **material** field: exactly one, `bookVersionOf()` in `lib/bookVersions.ts:93`, which
gates on `componentType === SAMPLE_PAGES`. Its own comment states the law — *"Every reader goes
through this function; none reads `m.bookVersionId` directly."* Verified: no other non-test
reference dereferences `m.bookVersionId`. `MaterialModal.tsx` writes it (`:271`), gated on
`showVersionField = type === SAMPLE_PAGES && bookVersions.length >= 2`.

Readers of the **activity** field: `queryVersions.ts:66` (`openingRead`), `bookVersions.ts:197`
(`holdings`), `MarkSentPopover` → `db.tsx:2435`. All stay.

### R2 · The package slot shape, `isValidPackage`, and the allowlist

`SubmissionPackage` (`types.ts:437`) carries three slots — `queryLetterVersionId`,
`synopsisVersionId`, `samplePagesVersionId` — where `""` is the `UNFILLED_SLOT` sentinel and an
absent key fails outright. Only the letter is required, and only on **create**
(`firestore.rules:747`), deliberately: `isValidPackage` also gates update, and requiring it there
would make a legacy letterless record permanently unupdatable and therefore un-archivable.

The update allowlist (`firestore.rules:758`) is exactly:

```
['packageName', 'queryLetterVersionId', 'synopsisVersionId', 'samplePagesVersionId',
 'otherMaterials', 'status', 'firstSentAt']
```

A version slot is additive and needs **both** an optional clause in `isValidPackage` and an entry
here. Unlisted fields are silently rejected — the `affectedKeys` gotcha.

### R3 · Consumers of the sample-pages material type

**`ComponentType.SAMPLE_PAGES` serves two different systems, and only one of them is being
retired.** This is the most load-bearing finding of the recon.

1. **The writer's own material** — a `ManuscriptVersion` document holding pasted sample text.
   Consumers: `PackageModal` (builder), `MaterialModal` (editor), `typeMeta.ts`
   (`BUILDER_TYPES`, `SLOT_KEY`, `SLOT_OF`), `CardBand`, `TypeGlyph`, `packageAttach.PACKAGE_SLOTS`,
   `packagesOverview`, `manuscriptPackages.PACKAGE_MATERIALS`, `materialDraft`, `bookVersions`,
   `seeds`, `tourExample`. **This is what Part C retires.**

2. **The agent's stated requirement** — `agentMaterials.ts:70-72` maps *"Sample pages"*, *"Sample
   chapters"* and *"Sample words"* all onto this one member, because the unit is the only thing
   separating them. `MaterialsField.tsx` renders it. **This must survive**: it is the source D5
   pre-fills from. Retiring the enum member wholesale would delete the pre-fill.

So Part C removes the sample **material and slot**, not the enum member.

### R4 · How the two panels reach a version

`openingRows` (`bookVersions.ts:316`) → `requestsByVersion(v, materials, packages, queries, …)` —
it walks materials of type `SAMPLE_PAGES`, takes `bookVersionOf(m)`, finds packages whose
`samplePagesVersionId` is one of those materials, then queries carrying those packages. Three hops.
`holdingRows` reaches the version through the send activity, not through samples, so **only the
opening side repoints.** `unattributedOpening` (`:512`) reconciles the samples with no recorded
version and exists solely because of that aggregation; after D15 its subject is gone.

### R5 · Does a query already record what portion went?

**Yes — and this is a flag, not a footnote.** `Query.materialsWanted` (`types.ts:650`) is described
in `Queries.tsx:1958` in as many words:

> *"The query's own materialsWanted is the record of what was sent; when it's empty we DISPLAY the
> agent's expected set, and the first edit promotes that set onto the query."*

Point by point against Part B:

| D | asked for | `materialsWanted` today |
|---|---|---|
| D5 pre-fill from the agent's requirement | new | `baseMaterialsFor()` falls back to `ag.materialsWanted` |
| D5 free text for *"first 3 chapters + 1-page pitch"* | new | `QueryMaterial{ type: "other", quantity: string }` (`types.ts:620`) |
| D6 reads not recorded, stores nothing | new | already: empty = display the agent's set, store nothing |
| D8 `recomputeQuery` untouched | required | already payload; allowlisted, one writer, undo |

`classifyQueryMaterial` already partitions the list into `queryLetter` / `synopsis` / `sample` /
`other`, so *"the portion sent"* is expressible today as the sample-and-other members of that list.

Two further fields exist and are **not** the same thing: `materialsRequestedType` +
`materialsRequestedQuantity` record what the agent **asked for**, and `fullVersionSent` names which
draft of the full went — neither is the portion of the opening that went with the query.

**Recommendation (F-BJ), proposed not decided.** Build D5–D7 as the query's own portion **derived
from and written back to `materialsWanted` through its existing single writer**, rather than as a
second stored field. Every stated behaviour is met, no rules change is needed, and it avoids the
exact fault this surface has already paid for once — `attachPackage`'s retired snapshot path, whose
own note records that two models of what a query holds *"contributed to no scorecard at all"*.
A second field would also make D7's divider ambiguous, since after Part C the package no longer
states a portion but `materialsWanted` still lists a letter and a synopsis.

---

## Flags

* **F-BH** — the vestigial material `bookVersionId` (D11). Recommendation in Part C.
* **F-BI** — CSV import and the portion field.
* **F-BJ** — R5 above: the portion is already modelled. Recommendation stated; awaiting the ruling.

---

## Phase 1 — two findings that change what Part C can do

### ⚠️ D10 CANNOT RUN AS A DATA MIGRATION, BECAUSE A SENT PACKAGE'S SLOTS ARE IMMUTABLE

`firestore.rules:757` forbids it outright. Once `firstSentAt` exists, the three slot fields and the
stamp cannot change:

```
&& ( !existing().keys().hasAny(['firstSentAt'])
  || !incoming().diff(existing()).affectedKeys().hasAny(
       ['queryLetterVersionId','synopsisVersionId','samplePagesVersionId','firstSentAt']) )
```

The rule's own note says why, and it is the merits rather than the mechanism: *"every query that
used this package keeps reporting what the agent actually received."* Dropping the sample slot from
a package that has gone out would change the record of what was sent — which is the one thing the
lock exists to prevent.

**Measured on the dev fixture: 3 packages, and 2 of them are Locked.** So D10's write is denied for
the majority of them and should be.

D3 already anticipates half of this — *"a locked one cannot be edited, so some packages stay
versionless for good"* — it simply was not joined up to D10.

**Resolution, proposed:** D10 is a MODEL and UI change, not a migration. The sample stops being a
slot everywhere it is read, rendered or aggregated; no package document is rewritten. Locked
packages keep their stored `samplePagesVersionId` because it is the true record of what went out;
unlocked ones keep theirs too, unread, because writing `""` to them buys nothing once nothing reads
it. **Nothing in the rules changes**: `isValidPackage` still requires the key to be present, so the
create path must go on writing `""` — removing the requirement would be a separate, riskier edit,
and removing the field from `isValidPackage` would invalidate every existing package.

### The prediction D10's red gate is measured against

Rendered census, `/manuscripts/packages`, dev, 1440 — **one manuscript's scope**, which is what that
page shows; a full-estate figure needs the same count per manuscript and is taken in Phase 4.

| | count | detail |
|---|---|---|
| Packages | **3** | all three hold a sample slot; **2 Locked**, 1 unlocked |
| Materials | **7** | 3 letters/synopses + **4 sample pages** |
| Samples carrying a version | **3** | `Chapters 1-3` §Prologue-first, `Sample 2` §Prologue-first, `Sample 3` §Worldbuilding-first |
| Samples with no version | **1** | `Unattributed pages` |

So Phase 4 expects **4 materials archived** and **3 packages affected** on this manuscript. More
than that at the same scope is the red gate.

---

## Phase 2 — Part A, measured

Dev rules deployed and verified by release `updateTime` (`10:42:32` → `11:30:46`, ruleset
`830c8db7`), never by the success line, which does not name the database. Probed after a 45s wait,
because rules take seconds to propagate and an impatient probe reports a false denial.

`rulesProbe.mjs`, against the deployed dev database — both directions:

```
✅ package create with NO version (must be ALLOWED)      absent is legal — D3's permanent bucket
✅ bookVersionId on UPDATE                               the good write lands
✅ bookVersionId cleared (deleteField)                   clearing back to Not recorded is expressible
❌ bookVersionId = 7 (must be DENIED)                    the type is real
❌ bookVersionId = "" (must be DENIED)                   `""` is NOT this field's sentinel
❌ bookVersionId 129 chars (must be DENIED)              the ceiling is real
✅ create a SENT package (firstSentAt present)
❌ bookVersionId on a SENT package (must be DENIED)      the freeze covers it
✅ packageName on a SENT package (must be ALLOWED)       a sent package stays filable
```

The builder, measured on a served build at 1440:

```
options  ["Prologue-first","Worldbuilding-first","Post-R&R (T. Marsh)","Not recorded","＋ New version…"]
value    ""                     not seeded — absent means the writer has not said
sub      "Which shape of the manuscript this package is testing. Versions live on your
          manuscript — create one here and it's added there too."      the ref, verbatim
colour   rgb(156, 136, 120)     `--pkg-muted` RESOLVES (rule 5) — an unresolved var()
                                 would have invalidated the declaration and inherited black
sample   absent                 the slot is gone, not hidden
console  no errors
```

`＋ New version…` — list grew by exactly one, one entry not two, the select landed on a real
`bv-jmytsi76mtbg336z` rather than the sentinel, the inline row closed, and **it survived a reload**,
which is what proves it reached the manuscript rather than the form.

**The fixture was restored in the same run.** Book versions are append-only by design — rename is
the only permitted edit — so the version the gate had to create was removed by writing
`seed-ms-1`'s list back without it (4 → 3). The probe's own package documents delete themselves.
