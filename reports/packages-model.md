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

---

## Phase 3 — Part B rests on two premises that do not hold. Stopping here.

### 1 · D7's dotted divider is not in any ref

`packages-page-settled.html` contains **no strip and no divider**. The word *portion* appears twice
in it, both in the lede — *"What portion actually went is recorded on the query, because the agency
decides that"* — and nothing draws it. Sweeping every committed ref for `dotted`: the only instance
in either strip ref (`package-strip-parcel.html`, `packaged-strip-cuts.html`) is
`border-bottom: 1px dotted` on `.e-via`, the underline beneath the *via Email* label. There is no
drawn separation between package contents and a portion anywhere.

This is the same shape as last round's `SUBMISSION PACKAGE`, which was cited as *per the ref* and
turned out to come from a band retired three commits earlier. D7's own words are clear enough to
build from — *package contents left of it, this query's own fact right of it* — but it should be
built as a **decision**, not as a restoration, or the next reader will go looking for the drawing.

### 2 · The portion is already modelled, and a second field is the fault this surface has paid for

This is F-BJ from Phase 1, restated because it is now the blocking one. `Query.materialsWanted`
already pre-fills from the agent's stated requirement, already stores nothing until edited, already
carries free text through `QueryMaterial{ type: "other" }`, already has one writer, an allowlist
entry and an undo. `classifyQueryMaterial` already partitions it into letter / synopsis / sample /
other, so *the portion* is the sample-and-other members of that list.

A second stored field means a rules allowlist change and two answers to what a query holds. The
retired `attachPackage` path is the precedent, and its own note records the cost: two models of
what a query holds, one of which *"contributed to no scorecard at all"*.

**Both readings are defensible and the difference is a design decision rather than a bug**, which
is why this is a question rather than an assumption:

* **(a) Derive** — the strip's right-hand side reads `materialsWanted`'s sample/other members; the
  editor writes back through the existing single writer. No new field, no rules change, D6 satisfied
  by construction. Costs: the letter and synopsis members of that list are then stated by the
  package too, so something must decide which surface owns them.
* **(b) A dedicated field** — as D5 literally specifies. Cleaner semantics (one portion, one
  string), costs a rules allowlist entry and leaves `materialsWanted` recording an overlapping fact.

Parts C and D do not depend on this and could proceed first.

## Flags

* **F-BJ** — as above. The blocking question.
* **F-BK** — D7 cites a divider no ref draws. Build it as a decision, not a restoration.
* **F-BH** — the vestigial material `bookVersionId` (D11), open until Part C.
* **F-BI** — CSV import and the portion field, open until Part B lands.

---

## Phase 4 — Part C, measured on the running app

```
[ScriptAlly] sample-pages retirement — 0 materials archived (4 already), 3 packages hold
a sample slot that is no longer read (no package document is written)
```

**Against the recon's prediction: 4 materials archived, 3 packages affected — exactly as forecast.
D10's red gate is not triggered.** The Phase 1 census found those same 4 samples in the ACTIVE
shelf; this run reports them as already archived, so the migration ran, did its work, and a second
pass planned nothing — **idempotence proved on live data rather than only in the unit test.**

The shelf, rendered:

```
materials     3   two covering letters and one synopsis; the 4 samples are in the archive drawer
ghost         "Add a material · Letter or synopsis"      (D13, and it names no sample)
slot labels   ["Letter","Syn","Version"] × 3 cards       (D4/D12 — the three slots a package has)
```

**No package document was written.** The three packages still store their `samplePagesVersionId`;
nothing reads it. That is the whole of D10 as it can honestly be executed — see the Phase 1 finding
for why rewriting a locked package would violate the guarantee the lock exists to give.

### F-BH — the vestigial `bookVersionId` on sample materials (D11), proposed not decided

**Leave it.** Removing it is more expensive than leaving it, and the expense is of the worse kind:

* It has exactly **one reader**, `bookVersionOf()`, which gates on `componentType === SAMPLE_PAGES`.
  Nothing else in `src/` dereferences `m.bookVersionId`. After D15 that reader has no caller either,
  so the field is inert rather than merely unused.
* Every sample carrying one is now **archived**. A migration to strip the field would be a write
  across archived documents — rewriting a record of what the writer wrote, to tidy a model. That is
  the same objection as D10's, one collection along.
* Restoring an archived sample is a supported action. A stripped field would silently change what
  came back.

The cost of leaving it is one optional key on documents nobody edits, and one gated helper. The cost
of removing it is a write over the writer's own archived material. `MaterialModal`'s branch is kept
as a named `showVersionField = false` constant rather than deleted markup, so whoever revisits this
can see what used to write it.

---

## Phase 5 — Part D, measured at both widths

The ledger, on a served build, 1440 and 1920 — identical at both:

```
heads      Package · Covering letter · Synopsis · Version · Sent · Replied · Requests
aligned    true          every row's cells within 1px of their column head
borders    0px/0px       on every cell — rules, not a spreadsheet
fills      one value     no striping
rules      1px           one under every row
mark       26px × 3      the strip's own asset, above the 20px stroke floor
counts     centred       Playfair; heads are JetBrains Mono
ghost      colSpan 7     full width, in its own tbody, carrying no rule
overflow   none          the page does not scroll sideways
```

### ⚠️ THE STRUCTURAL GATE PASSED WHILE EVERY VERSION CELL SAID THE WRONG THING

`slotTexts` came back `["Hook-first", "One-page", "Not included"]` on all three rows. The version's
empty state must read **`Not recorded`** (D3), and `Not included` claims the writer built a package
without a manuscript. Columns aligned, borders absent, striping absent, mark 26px — **every
assertion about arrangement passed, because arrangement is not what was wrong.** The gate caught it
only because it also prints what the cells SAY.

Fixed, and locked as three cases: an omitted material is a stated choice, an absent version is not,
and a stated version reads its name.

### And the tint was unprovable until the fixture had one

`verTint` read `rgb(156, 136, 120)` — the muted ink — because the probe took the FIRST
`.pkgb-slotv--ver` and every version cell on the fixture was empty, so it also carried
`--none`. **A pass there would have proved nothing.** One package was seeded with a version, and
the filled cell measures:

```
Prologue-first   rgb(65, 98, 127)   weight 600   upright     --pkg-pro-ink
Not recorded     rgb(156, 136, 120) weight 400   italic      --pkg-muted
```

**The fixture was restored in the same run** — `seed-pkg-noversion` is the versionless case and its
name says so, so the seeded version was cleared with `deleteField()`.

### D15's panels

`Requests by opening` reads the package's own version; `Who holds what` already reached it through
the send activity and did not move. Versionless packages form a `Not recorded` row that scales
against the same maximum as the named versions, and renders only when it holds something.

---

## Phase 3 (deferred) — Part B, derived per the ruling

The split you asked me to confirm **holds**: `MaterialKind` is exactly
`queryLetter | synopsis | sample | other`, so the portion is the sample-and-other members and the
letter/synopsis members are cleanly separable. No new field, no rules change.

Measured on a served build, 11 of 11 packaged strips at both 1440 and 1920:

```
first 3 chapters + 1-page pitch   soft=false  normal  600   RECORDED — the query's own
Opening sample                    soft=true   italic  400   the AGENT'S ask, standing in
Not recorded                      soft=true   italic  400   nobody has stated one
```

Divider dotted on every strip — `border-left` inline, `border-top` stacked. The portion sits right
of the package's contents at every width, truncates rather than reflowing, and stays on one line.

### ⚠️ AND EVERY STRIP READ `Not recorded` UNTIL THE FIXTURE HAD THE OTHER TWO

The first run passed with 11/11 — and proved only the empty branch. **The recorded case and the
pre-fill were both unexercised, so the treatment that distinguishes an expectation from a record
was unproven.** Same family as the version tint an hour earlier, and as the doubled "not recorded"
before that: a probe whose every subject is in one state reports a pass about one third of the
behaviour.

Seeded a recorded portion and a sample requirement on the agent, measured all three, and **restored
both in the same run** — the queries back to no `materialsWanted`, `seed-agent-2` back to exactly
`["Query letter","Synopsis"]`.

### F-BI — CSV import and the portion (reported, not built)

The importer has no column for a portion and should not gain one by inference. What it CAN do
safely is nothing: a query imported without a portion reads `Not recorded`, which is true. The
tempting move — deriving one from the agent's stated requirement at import time — would write the
agency's ask into the writer's record as though it were what they sent, across every imported row
at once, and D6 exists to forbid exactly that on a single query. If a column is ever added it
writes one `QueryMaterial{ type: "other" }` through `withPortion`, and an empty cell must clear
rather than store `""`.
