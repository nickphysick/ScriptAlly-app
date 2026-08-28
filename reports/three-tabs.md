# Three tabs, material cards, and manuscript switching

Refs: `design-refs/builder-nopill.html` (normative for Builder, the colour system and switching) ·
`three-tabs.html` (the tab split, the Packages carousel, the Tracking comparison) ·
`package-notes.html` (unchanged, still governs the drawer). All three present — the red gate did not
fire; two were copied from `~/Downloads` and committed in Phase 1.

Baseline at `39aa2d44`: tsc 0 · build 0 · vitest **429 files, 7334 passed, 0 failed** — clean.

**Next free flag letter: `F-BP`** (swept from `reports/`, `CLAUDE.md` and `src/`, not remembered).

---

## Phase 1 — recon

### R1 · What survives from the current Builder

Everything, and all of it is mounted exactly once:

| | lines | fate under this pack |
|---|---|---|
| `PackageTabs` | 65 | **extends** — two tabs become three (D1) |
| `BuilderRail` | 106 | **superseded** — chips become cards (D5); swapped, not added |
| `BuildRow` | 163 | **superseded** — the inline row becomes the pinned panel (D10) |
| `PackagesBand` (ledger) | 329 | **moves** — the ledger is Builder's today; Packages gets a carousel (D19) |
| `PackageDetailDrawer` | 224 | **survives** — `package-notes.html` still governs it |
| `PackageNote` | 102 | **reused** at creation (D13), not re-implemented |
| `VersionQuickAdd` | 46 | survives — the Versions section's Add |

### R2 · The colour tokens — all three fills already exist, none needs a hex

| ref fill | value | app token | scope |
|---|---|---|---|
| pink (letters) | `#f3e0d6` | **`--pkgo-pink-band`** | `.pkgw` — this page |
| sage (synopses) | `#d7ddd5` | **`--pkgo-sage-a`** | `.pkgw` — this page |
| blue (versions) | `#d5e1ec` | **`--pro-fill-deep`** | `:root` |

⚠️ **These are NOT the `--pkgt-*` ladder the current chips use.** That ladder's tops are `#f7e3da` /
`#dfe6dc` / `#cfdcea` — a lighter set. So the ref's accents are a fourth family of blues-and-pinks
against the three already recorded in **F-AK**, which this pack was told is input to. Reported before
building: the fills are taken from the tokens above, and no hex is introduced.

### R3 · A switcher exists, and it is the shell's — the page's was deleted as a duplicate

`ShellScope` in the top **bar** (`.sv2-scope`) owns `localStorage["scriptally_active_manuscript_id"]`,
which Packages, Comps, Analytics and the Dashboard all read. Its own note says why it moved there:
*"in the sidebar it vanished the moment the panel collapsed."*

The page-level line was removed last pack by another session, whose reasoning was that the masthead
holds no controls and the shell states scope permanently. **D14 does not contradict that** — it
reinstates a **switch**, not a label, and puts it on the tab row rather than in the masthead. The
distinction is the one D14 states, and it is the reason this is not the same element returning.

### R4 · ⚠️ THERE IS NO DESCRIPTION FIELD ON A MATERIAL, and the card must come from the body

`ManuscriptVersion` carries `versionName`, `contentDraft` (the pasted body), `fileName`,
`contentType`, `contentLink`, `wordCount` — and a `notes?` that **nothing reads or writes**.

So D5's two clamped lines come from **`contentDraft`**, which is what the prompt anticipated. The
source line is already derivable: `sourceLabel` gives `Text · N words` / `Ref · file.docx`, and
`wordsPhrase` returns **null** at zero — which is exactly D5's `Nothing written yet` branch.

**Version cards are different and already served**: `BookVersion` carries `note?`, which is the
description D8 asks for, and `builderRail.versionMetaLine` already produces `2 packages · held by 4
agents` with the words-not-a-zero treatment. D8 is a re-skin of an existing derivation, not a new one.

### R5 · The note is allowlisted for create as well as update

`note` and `noteEditedAt` are in the package update allowlist, and `isValidPackage` — which gates
**both** create and update — carries the optional clause. `addPackage` takes
`Omit<SubmissionPackage, "id"|"userId"|"status"|"createdDate">`, so a note supplied at creation
validates and lands. **D12 needs no rules change.**

### Recon rulings, recorded

* **R4** — the two lines come from `contentDraft`. Where a material is an attached file with no
  draft, the description area is **left empty** rather than reaching for a placeholder sentence.
  Reported if it looks wrong on the page rather than designed around now.
* **R4b** — `ManuscriptVersion.notes?` is **dead or abandoned**: nothing in `src/` reads or writes
  it. Flagged, not repurposed, and not removed.
* **R2** — this pack uses the ref's fills, which are tokens and which the section heads must match.
  The **fourth ladder is recorded in F-AK**; consolidation is a ruling for the audit's end, not for
  inside a build pack.
* **R3** — stated so the history reads coherently: the **top-bar switcher owns the key**; what was
  deleted last pack was a **label** in the masthead; D14 adds a **switch** to the tab row.
* **R5** — no rules change.

---

## Phase 2 — Part A, measured

Identical at 1440 and 1920, on a served build:

```
labels     Packages 3  ·  Builder 7 parts  ·  Tracking 7 sent
type       Playfair Display   active rgb(46,39,35)   inactive rgb(156,136,120)
underline  2px  rgb(124,58,42)
gutter     tabLeft 327 == bodyLeft 327
panels     exactly one shown
console    no errors
```

**D3, the new claim, driven rather than read:**

```
DEEP LINK   ?tab=builder  → active "Builder 7 parts"
RELOAD      → still "Builder 7 parts"          the tab survives
CLICK       Tracking → url "?tab=tracking", active "Tracking 7 sent"
BOGUS       ?tab=nonsense → active "Packages", exactly one panel shown
```

**D2 needed seeding — no manuscript had materials, no packages and no sends.** One letter on
`seed-ms-2` put it there, and it was deleted in the same run:

```
full   labels [Packages, Builder, Tracking]   panels [packages, builder, tracking]
bare   labels [Builder 2 parts]               panels [builder]            teach-first: no
```

### ⚠️ And that seeded case found a real inconsistency

The first run showed `bare.panels === ["packages", "builder"]`: **the Packages panel stayed in the
DOM with no tab to reach it.** Tracking's was gated and this one was not — invisible, because
`hidden` covered it, and therefore exactly the kind of thing that survives until something queries
it by id. A panel and its tab are one condition now.

### And the probe's own fault

The gutter check first read `.wpg-scroll > *` — the masthead's full-bleed slab, which starts 80px
left of the gutter — and reported a correct layout as 327 against 247. The showing panel's own
content is the honest reference.

---

## The empty description, and the source line's two grammars — Option B

`74002bc0`, one commit for both parts. `RailChip` carried `desc: string | null` plus a `descNone`
flag; the two parts are the same interface, so splitting would have meant writing an intermediate
state nobody built or measured. Both gates ran. Ref enrolled at
`design-refs/empty-description.html`.

### Part 1 — the band holds something true in every state

The census, printed at both widths so a monoculture cannot hide in a pass:

```
BANDS  words:Nothing written yet
       plate:voice-led-v2.docx / WORD DOCUMENT
       text:When the tide went out at Ravensme…
       text:Opens on the flood, and holds the …
       words:No note on this version
BANDH  [34, 34.5]        WRAPPED 0 · CLIPPED 0 of 8
```

All four bodies render. `34.5` is a two-line clamped body's own line box and always was — the
assertion is the reserved 34 within a pixel, not an equality, because pinning one value fails on a
correct card.

### ⚠️ The plate measured 44 against a `min-height` that reads 34

`Word document` at 6.5px with 0.1em tracking **wrapped inside the plate's text column**, making it
36px tall against a 26px icon: 36 + 6 padding + 2 border = 44, which raised every card in that grid
row. Nothing in the rule says 44. **The height of a box is not what its `min-height` says; it is
what its tallest child leaves it** — a source read would have reported 34 and been wrong by ten
pixels. Fixed by holding the kind to one line and taking the padding to 2px.

### Part 2 — and the fix for the wrap was ellipsing words into nonsense

D10 asked for zero wraps and got them. It also got `Attac…` and `Late…`, because a slot set to
`nowrap` with `text-overflow: ellipsis` **cannot wrap by construction**, so a wrap check over it is
satisfied by a truncated word. The proxy passed; the screenshot did not.

Measured, at both 1440 and 1920 — the rail is a fixed 296px at either:

```
card 142.5  ·  inner 107
Not in a package  77.3      Attached file  62      +8 gap  =  147.3   ✗
Not in a package  77.3      Latest         29      +8 gap  =  114.3   ✗
In 2              19.3      39 words       53      +8 gap  =   80.3   ✓
```

Two of eight cards over, both because the right slot is the long phrase. The column count is a
**container query** now, against the width the phrases need (`min-width: 390px` on `.bldr-rsec`).

### ⚠️ At today's rail that resolves to ONE column, and it halves the library's density

Stated rather than absorbed. It is the only option that keeps every word the brief specified and
every card readable; the alternative is a shorter usage phrase, which is one constant. Written as a
query rather than a flat `1fr` so a wider rail — which Part C's New-package panel may bring — takes
two columns back without anyone remembering to. **If you would rather keep two columns, say so and
the phrase shortens.**

The gate now asserts **clipping**, not wrapping. `scrollWidth > clientWidth` on both slots and on
both lines of the plate.

### The `Not used` tag is retired, and the brief did not ask for that

D8 moves `Not in a package` into the foot's right slot. The tag at the card's top-right said the
same fact, three inches away, in a third vocabulary — which is the fault this pass exists to remove
from the left slot. Retired with its CSS rule in the same commit. `chip.unused` survives because
callers read it. **One line to put back if you want it.**

### ⚠️ And `held by N agents` is gone from the version card

`versionMetaLine` built `2 packages · held by 4 agents` for a slot that now carries only what a
version IS. The usage half moved to the right slot as `In 2`; the agents figure has no slot under a
two-register grammar and is **not** restated in a shorter form, because a second fact in either slot
is what wrapped the card in the first place. A genuine reduction in what the card says — reported,
not absorbed (**F-BR**).

### F-BQ — `seed.mjs` is what kept deleting the book versions

Not a race, and not another lane misbehaving.

```
tests/e2e/seed.mjs:74   setDoc(doc(db,"users",uid,"manuscripts","seed-ms-1"), { …no bookVersions… })
```

`setDoc` without `merge` **replaces** the document. `seed.mjs` is documented in four measurement
files as the canonical fixture restore, so every session that ran it deleted a field owned by
`seedBookVersions.mjs` — having no reason to think it had touched versions at all. The symptom lands
nowhere near the cause: below two versions `versionsActive` is false, so every version surface hides
itself, which reads as a regression in the app three lanes away.

The write carries the field across now. The two in-app writers (`AllManuscripts.tsx:303`,
`SubmissionPackages.tsx:233`) both append or rename from the current list and cannot remove the key;
neither was ever implicated. `seedThinCases.mjs:179` has the same `setDoc` shape on `thin-ms`, which
has no versions to lose — same trap, nothing on the other side of it today.

### The fixture gained the two states the sweep could not otherwise see

`seed-mat-ql1` a real body, `bv-prologue` a note. Every material in the rail was previously
draft-less and every version note-less, so the `text` branch of the band was unrepresented on both
kinds — the same monoculture the last pack fixed for the source line, one level down.

### Proved red three times

| broken | what noticed |
|---|---|
| the plate returns a blank band | `no attachment card — D2 unproven` |
| the grid returns to two columns | `a truncated word reads worse than the wrap it replaced` |
| a usage phrase back in the source slot | both `D7` unit cases |

### And the containers lock caught a name collision

`CardBand` already exists — the cap band on a `CappedCard` — and `containers.test.tsx` sweeps for
its renderers. Naming the new description component `CardBand` grew that set to five. Renamed to
`CardDescription`; the lock was not rebaselined.

### One byte-level note

Enrolling the new ref rewrote `.refhashes.json`'s `_note` line from `—` to a literal em dash.
That is the enrol script's own JSON serialisation, not an edit — the hashes are unchanged apart from
the new entry.
