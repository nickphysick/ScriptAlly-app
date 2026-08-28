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
