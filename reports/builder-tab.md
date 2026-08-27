# The Builder tab

Refs: `design-refs/builder-refined.html` (normative) · `package-notes.html` · `packages-tabs.html`,
copied from `~/Downloads` and committed in Phase 1. All three were present — the red gate did not
fire.

Baseline at `9be6a2b6`: tsc 0 · build 0 · vitest **420 files, 7217 passed, 1 FAILED**.

⚠️ **The baseline is not clean, and the failure is not mine.**
`workspacePageGrid.test.tsx > ⚠️ TWO MEASURES` fails on `--mast-wash-top` being spelled out in
`illustratedMasthead.css` — the masthead lane's committed work. Gate is therefore "no worse than
one failure, and that one".

---

## Phase 1 — recon

### R1 · The page's component tree, and what survives

`SubmissionPackages.tsx` (604 lines) mounts, inside one `WorkspacePageGrid`:

| | lines | fate |
|---|---|---|
| `PageHeader variant="workspace"` | — | **survives**, gains the scope line (D6) |
| `PackagesBand` (the ledger) | 248 | **survives** — Part A of the last pack; moves inside Builder |
| `MaterialsBand` (the shelf) | 179 | **superseded by the rail** (Part C) — swapped, not added |
| `TrackingBand` (three panels) | 198 | **moves wholesale** to the Tracking tab (D4) |
| `PackageDetailDrawer` | 202 | **survives**, gains the note section (D26) |
| `PackagesDrawer` ("How it works") | — | **survives**, belongs to Builder (D5) |
| `PackageModal` / `MaterialModal` | — | survive; the rail's `＋ Add` opens them |

### R2 · No tab primitive exists — one must be built

Six files carry `role="tab"`, and none is reusable. The closest, `ManuscriptTabs`, is typed to its
own `ManuscriptTabKey` union and hard-codes `MANUSCRIPT_TABS`; its header also states *"THERE IS NO
PACKAGES TAB, AND ITS ABSENCE IS THE POINT"*, which is about the book profile and would read as a
contradiction if this page borrowed the component. **See the flag below on where a shared one
should live.**

### R3 · The scope, and what the masthead may say

Scope is `localStorage["scriptally_active_manuscript_id"]` → `activeMsId` → `activeMs`, with a
first-manuscript fallback. Everything on the page derives from `msId`.

`PageHeader variant="workspace"` **accepts an action slot on a Type A page** (amendment 3, 27 Aug)
and Submission packages is Type A — so a control here would be permitted. **D6 does not want one**:
the scope line is context, and `Switch book` defers to the sidebar's existing switcher. It goes
beside the title, not in an actions slot.

⚠️ **The ref's masthead is not this app's masthead, and I am not rebuilding it.** The ref draws its
own `.masthead` with a 34px parcel icon and three artwork thumbnails. This page's committed decision
is the opposite — *"NO MARK ON THIS PAGE — the illustration IS the page's picture, and a 52px
monoline parcel opposite a drawing of parcels is the same subject twice in two hands"* — and the
banner artwork now sits there. Taking the ref's masthead would undo that. **Reported, not built.**

### R4 · The package shape and the rules

The update allowlist is now eight keys:

```
['packageName','queryLetterVersionId','synopsisVersionId','samplePagesVersionId',
 'otherMaterials','status','firstSentAt','bookVersionId']
```

…and the freeze clause names five of them once `firstSentAt` exists. **A note is additive on both
counts**: it joins the allowlist and must be kept OUT of the freeze list — which is D24's whole
point and is provable in both directions with `rulesProbe`.

### R5 · The keyboard path is an idiom the app already has

Nothing in the app assigns from a list to a target by keyboard, so there is no affordance to match.
What there IS is the idiom D14 describes: a `role="button"` element whose `Enter`/`Space` performs
its own action (`Queries.tsx:4954`, `:6042`). A chip whose action is *"fill the next empty slot of
my type"* is that idiom, not a new one.

### D7 · Everything on this page is manuscript-scoped — confirmed

`msVersions`, `msPackages`, `msQueries`, `msBookVersions` and both archived sets all filter on
`manuscriptId === msId`; `bookVersions` live on the manuscript document itself. **Nothing is
cross-manuscript.**

---

## The type tints already exist, and eight of twelve match the ref exactly

The rail's chips need letter / synopsis / version tints. The app already has the full ladder at
`:root`, role-named at the `--cap-*` layer and aliased to `--pkgt-*` for this page — so the chips
**reuse it** rather than adding the ref's parallel `--let-*` / `--syn-*` set.

| ref | value | app | value | |
|---|---|---|---|---|
| `--let-*` × 4 | | `--cap-outgoing-*` | | **identical** |
| `--syn-*` × 4 | | `--cap-incoming-*` | | **identical** |
| `--pro-ink` | `#39587a` | `--cap-pro-ink` | `#2d4a6b` | deeper |
| `--pro-a` | `#e3ebf3` | `--cap-pro-a` | `#cfdcea` | deeper |
| `--pro-b` | `#d5e1ec` | `--cap-pro-b` | `#bccfe2` | deeper |
| `--pro-edge` | `#b9cdde` | `--cap-pro-edge` | `#9db6cf` | deeper |

**The four version tokens diverge because the app deepened them on purpose**, per
`packaged-strip-cuts.html` — the note at the value says the lighter pastille was superseded because
*"the stationery band asks for more contrast"*. `builder-refined.html` carries the older, lighter
set. This is ref-against-ref, not ref-against-me, so **I am using the app's deepened values and
flagging it** — it is the same question as F-AK, which is still awaiting a ruling.

---

## Flags

* ⚠️ **THE FLAG LETTERS IN THIS PROMPT COLLIDE WITH THE LAST PACK'S.** `F-BJ` and `F-BK` are both
  already taken and were both ruled on: F-BJ was the portion derivation (ruled: derive), F-BK the
  dotted divider with no ref (ruled: build as a decision). This pack's two are recorded as **F-BL**
  and **F-BM** so the earlier rulings stay findable.
* **F-BL** (this prompt's F-BJ) — **no tab primitive existed**; one is being built. On where it
  should live: it stays in `components/packages/` for now and is not promoted. A primitive earns its
  place from a second caller, and there is exactly one; `ManuscriptTabs` is the counter-example —
  a tab rail written for one page, typed to that page's key union, which nothing else can use. If a
  third surface wants tabs, the two get reconciled then, with two real sets of requirements rather
  than one and a guess.
* **F-BM** (this prompt's F-BK) — things named here that no ref contains. **None so far**: every D
  checked against the three refs in Phase 1 was found. Two things are the other way round — the ref
  contains a masthead and artwork strip that this app deliberately does not have (R3), and the ref's
  four version tokens are the app's superseded lighter set.
* **F-AV** — the material drawer. **The rail supersedes its subject**: `MaterialsBand`'s banded
  cards are what the rail replaces, so a pass to give those cards a drawer would be a pass on a
  surface that no longer exists. Recommend closing it and re-opening against the rail chip if a
  reader-for-a-material is still wanted.
* Carry forward: Correction UI's `CorrectionDraft` widening · F-AK (four blues — now with a fourth
  instance, above) · broadsheet Phase 5 (held) · F-R, F-S, F-AB, F-AE, F-X.

---

## Phase 2 — Parts A + B, measured

Identical at 1440 and 1920, on a served build:

```
tabs        2            Builder 3 · 10  ·  Tracking 11 sent
type        Playfair Display          active rgb(46,39,35)   inactive rgb(156,136,120)
underline   2px  rgb(124,58,42)       burgundy, on the active tab only
gutter      tabLeft 327 == ledgerLeft 327            left-aligned at the body's gutter
scope       "for The Smoke Test"      below the title
duplicates  []                        no second manuscript control on the page
console     no errors
```

### D3 proven in BOTH states, because the fixture only has one of them

A census of all three manuscripts found **none** in D3's state — `seed-ms-1` has 11 sends, and the
other two have nothing at all and sit on teach-first. A sweep of the default scope would have
reported "two tabs" and proved nothing about the rule.

One covering letter was created on `seed-ms-2` to put it in the populated branch with zero sends,
and **deleted in the same run** — the census afterwards shows all three manuscripts exactly as
found.

```
with sends   tabs 2   Builder 3 · 10 · Tracking 11 sent   panel in DOM: yes
no sends     tabs 1   Builder 0 · 2                       panel in DOM: NO      teach-first: no
```

The last two columns are the ones that matter: the Tracking panel is **not in the document**, not
hidden; and `teachFirst: false` proves the case is genuinely the populated branch rather than the
first-run screen, which would have shown one tab for an unrelated reason.

### ⚠️ Two probe faults found on the way, both mine

**`document.querySelector(".wsh-sub")` returned another page's masthead.** The workspace keeps every
page MOUNTED, so the first match in the document was the To-do page's description — and the probe
reported the packages masthead as stating *"Every query, every response…"*. Scoped to the visible
`.wpg`, it reads `for The Smoke Test`. The hazard is recorded in CLAUDE.md and it still caught me.

**The scope switch timed out rather than clicking.** Per the standing rule that is the element
saying something, not an invitation to `force`. The switcher is chrome this page does not own, and
what is under test is how this PAGE responds to a change of scope — so the measurement writes
`scriptally_active_manuscript_id` and reloads, which is the same read path the page uses on every
visit.

---

## The flag register — authoritative, swept from the repo

Swept from `reports/*.md`, `CLAUDE.md` and `src/`, not from memory. **Next unused letter: `F-BN`.**

Allocated: `F-A`…`F-Z`, `F-AA`…`F-AQ`, `F-AT`…`F-AZ` (no `F-AR`/`F-AS`), `F-BA`…`F-BM` (no `F-BG`).

**The two that collided in this pack's prompt, and what they actually are:**

| | subject | ruling |
|---|---|---|
| `F-BJ` | the portion derived from `materialsWanted` rather than a second field | **ruled: derive** |
| `F-BK` | D7's dotted divider, which no ref draws | **ruled: build as a decision** |
| `F-BL` | *(this pack)* no tab primitive existed; one built, not promoted | open |
| `F-BM` | *(this pack)* `Switch book` in the ref, deliberately unbuilt | **ruled: stays unbuilt** |

⚠️ **Regenerate this by sweeping, never by remembering.** The command is one line and it is what
found the collision:

```
grep -rhoE "\bF-[A-Z]{1,2}\b" reports/*.md CLAUDE.md src/ | sort -u | tail
```

## D6's premise was wrong, and it is the third of its kind

The prompt says `Switch book` defers to *"the sidebar's existing switcher"*. The switcher is
`ShellScope` in the **top bar** — moved there deliberately, its own note saying *"it lives in the bar
because every figure on screen is filtered by it, and in the sidebar it vanished the moment the
panel collapsed."* That change of premise is what makes the link redundant rather than merely hard
to wire: a control that is always on screen does not need a second door.

Recorded beside the two from the last pack — `SUBMISSION PACKAGE` from a retired band, and the
dotted divider from a mockup — because three instances is a shape, not a slip.

---

## Phases 3+4 — Parts C and D, measured

The rail, identical at 1440 and 1920:

```
sections   let / syn / ver   Covering letters · Synopses · Versions
head ink   rgb(138,68,51) · rgb(79,102,71) · rgb(45,74,107)     three distinct inks
＋ Add      on all three      note on Versions only
layout     rail 296px at x=327, ledger at x=647, same row
chips      6, all draggable, all tabIndex 0, 6 grip dots each
build row  closed by default
console    no errors
```

### ⚠️ The drag filled the slot with a BLANK NAME, and `filled: true` hid it

The first measurement passed. Printing the composed value did not:

```
DRAG [{"kind":"let","filled":true,"name":""}, …]
```

`onDrop` built a `RailChip` at the drop site with `name: ""` — because a `dataTransfer` carries only
what was put on it, and I had put an id and a kind. The drag worked and the slot said nothing. The
page owns the rail, so the page resolves the id now; the handler takes `(kind, id)` and cannot
fabricate a chip. **An assertion on `filled` alone passes on that bug** — the case now asserts the
name.

### The three build routes, and the two gates

```
CLICK  syn filled "One-page", let untouched      — only its own type
KEY    Enter on a letter chip filled "Hook-first"
DRAG   native HTML5, filled "Hook-first"          — no library, no `force`
GATE   disabled: true · why: "Add a covering letter to continue" · title: ""
NAME   suggested "Hook-first · One-page"          — from the filled slots
NAME2  typed "My own name", then filled a slot → still "My own name"
ESC    closed, and reopened empty
```

`title: ""` is the assertion that matters for D17: the reason is **on the page**, not reachable only
by hovering the control that is not working.

### D16 against a real package

```
TARGET {"name":"Standard UK","cells":["Hook-first","One-page","Not recorded"]}
DUPE   why: Same combination as “Standard UK”   styled as a warning   createDisabled: FALSE
```

Taken off the ledger rather than hand-written, so the duplicate is a real record. And the version
slot left empty against that row's `Not recorded` proves on the running app what the unit test
proves in isolation: **an empty slot is part of the combination, not a wildcard.**

### Two things the fixture could not show, and one it showed honestly

**Every version chip read `not yet in a package`** — the used branch was unexercised, so
`N packages · held by N agents` was unproven on the app. One package was pointed at a version,
both branches measured, and the fixture **restored in the same run**:

```
Prologue-first        1 package · held by 1 agent     used
Worldbuilding-first   not yet in a package            unused
Post-R&R (T. Marsh)   Latest · not yet in a package   unused, and newest
```

**The letters read `Text · in 2`, not the ref's `Text · 412 words · in 2`** — and that is the DATA,
not the code. `sourceLabel` drops the count when a material has no pasted body, which these have
not; the ref's fixture had word counts. Checked rather than assumed.

---

## Phase 5 — Part E, measured

```
CHIP → LEDGER   Standard UK lit · Comps-led variant DIMMED · Unattributed set lit
LEDGER → CHIP   exactly 1 chip lit (Hook-first), 5 dimmed
SORT            natural [8,2,1] → desc [8,2,1] → asc [1,2,8]
                aria-sort "descending" then "ascending"
BARS            Sent max 8 → 100%, 2 → 25%, 1 → 13%
                Replied max 5 → 100%, 1 → 20%      each column scaled independently
                every bar aria-hidden="true"
```

Both highlight directions have **both branches entered** — some rows lit and some dimmed, one chip
lit and the rest dimmed. A ledger where everything lit would have proved one.

## Phase 6 — Part F, the model and D24's proof

Rules deployed to dev and verified by release `updateTime` (`11:30:46` → `16:27:06`), never the
success line, and probed after a wait.

### ⚠️ BOTH WRITES AGAINST ONE LOCKED RECORD, IN ONE RUN

Two passes could each be true of a different fixture state — a note accepted on some package, a slot
refused on another — and together they would prove nothing about the asymmetry. The package is
created **sent**, and the four attempts run against it back to back without it being touched:

```
✅ create a SENT package for the pair
✅ note on a SENT package (must be ALLOWED)
❌ slot on THAT SAME sent package (must be DENIED)
✅ note CLEARED on a sent package (must be ALLOWED)
❌ note 2001 chars (must be DENIED)
```

**The refusals are half the proof.** A probe that only wrote the note would pass identically on a
build that had accidentally unfrozen the slots.

The allowlist gained `note` and `noteEditedAt`; the **freeze list is unchanged** — that asymmetry is
the whole of D24. A package's slots are frozen because they are a claim about what an agent
received; a note is the writer's own margin and says nothing about the envelope. Freezing it would
mean a writer could never record what they learned from the very send that froze the package.

### A lock retargeted from a line to a claim

`packageShapes` pinned the literal `payload.otherMaterials = t ? t : deleteField()`. Part F
generalised that into a loop when the note became the second unsettable field, so the lock went red
on a refactor that changed nothing it was about — **a source lock that pins an implementation cannot
tell a refactor from a regression**, which is the only thing it exists to do. It now asserts the
property: the unsettable set is a named array, both members are in it, and the version slots stay
out (they use `""` as their sentinel, so unsetting one would be denied).

⚠️ **And my first retarget was itself too broad** — `not.toContain("queryLetterVersionId")` over the
function body failed on a correct build, because the slot names appear in its TYPE SIGNATURE. The
claim is about the unsettable SET, so that is what gets sliced.

---

## Phase 7 — read it aloud

Against a fixture holding a package **with** a note beside two **without**, a versionless package,
and three versions in no package — all in one run, which is the monoculture rule applied to a
visual state.

```
TABS      Builder 3 · 10  |  Tracking 11 sent
RAIL      Covering letters  2  ＋ Add
            Hook-first             Text · in 2
            Comps-forward          Text · in 1
          Synopses          1  ＋ Add
            One-page               Text · in 2
          Versions          3  ＋ Add
            Prologue-first         not yet in a package             Not used
            Worldbuilding-first    not yet in a package             Not used
            Post-R&R (T. Marsh)    Latest · not yet in a package     Not used
            Versions belong to the manuscript. Adding one here writes it there too.
HEADS     Package · Covering letter · Synopsis · Version · Sent · Replied · Requests
ROW       Standard UK        Locked · sent with 8   Hook-first · One-page · Not recorded
            8 5 5    note: For the agencies that want comps up front — Hook-first opens…
ROW       Comps-led variant  Locked · sent with 2   Comps-forward · One-page · Not recorded
            2 1 0    [hover] ＋ Note
ROW       Unattributed set                          Hook-first · Not included · Not recorded
            1 0 0    [hover] ＋ Note
BUILD     ＋ Build a package · or drag a chip here
GHOST     Build another package · A different letter, a different synopsis.
```

No sentence states an absence as a zero. `Not included` (a stated choice) and `Not recorded` (an
absence of one) sit in the same row and stay distinct.

### The lock line on an unsent package — it does not render, and that is right

```
DRAWER UNSENT  sections ["Note","What's in it","Who has it","What came back"]
               lock: ""      note: the placeholder, italic      foot: ""
DRAWER SENT    lock: "Contents are fixed because this package has been sent. Your note
                      isn't — it's yours, and you can change it whenever."
               note: "For the agencies that want comps up front…"   foot: "Edited 14 Aug"
```

The line is gated on `locked`, so an unsent package carries none — a sentence explaining a freeze
that is not in force would teach a rule the writer is not subject to. The note section is first in
both, and its footer is empty rather than `Not edited yet` when there is no note: a stamp for a note
that does not exist is the same fault as one outliving a cleared note.

### ⚠️ AND THE READ-ALOUD CAUGHT SOMETHING THE GATES COULD NOT

The masthead read **`Query Centre / Bundle your materials once…`** — neither the packages title nor
the scope line committed in Phase 2.

Two separate things, and only one was a bug:

1. **My probe took the title from the first `.wpg` in the document**, which is a hidden page. The
   workspace keeps every page MOUNTED. I scoped the SUB and not the TITLE — the same hazard that
   caught me in Phase 2, in the same file, one line along.
2. **The scope line had been reverted, and deliberately, by another session** — with a reasoned
   comment naming my commit. See below. That is not a bug and I have left it alone.

---

# Fix pack — three faults and a verification pass

Baseline at `d784599d`: tsc 0 · build 0 · vitest **424 files, 7281 passed, 0 failed** — clean.

## Part 1 — the ghost card was the third generation, and there were three of them

The card is the ledger's own `pkgb-ghostrow`, and it is the middle of three generations of one
control:

| | | opens |
|---|---|---|
| gen 1 | two hand-written ghost CARDS side by side, one superseding the other | modal |
| gen 2 | `pkgb-ghostrow` — the ledger pack replaced that pair with one full-width `tbody` | modal |
| gen 3 | `＋ Build a package` — the Builder pack added it BELOW the ledger | the build row |

**Gen 3 arrived without gen 2 being deleted.** A replacement added rather than swapped — which is
the fault gen 2's own comment described happening to *its* predecessors. Third time in this
feature, and mine, one pack ago.

⚠️ **And there were THREE, not two.** `＋ New package` in the ledger head is the one nobody counted,
including me when I wrote the brief's premise into this report. `builder-refined.html` contains
**"New package" zero times and "Build a package" twice**; the ledger head holds the count and
`How it works`, and nothing else.

`.pkgb-gt` / `.pkgb-gs` were **left**: they are still rendered by `MaterialsBand`, which the rail
replaced but which is not deleted. **Reported, not swept** — that is a different removal from this
one, and it is the same class of loose end (see below).

## Part 2 — the empty section, and a premise that did not hold

D4 asked for Versions to match "how the other two sections behave when empty". **They behave the
same way it does** — a heading, a zero and a blank. There was no treatment to match, so fixing the
instance that was seen would have left two-thirds of the fault. All three now invite their first.

`.radd` is styled in the ref and **rendered zero times**, because every section in its fixture has
chips. The shape is the ref's; the sentence is mine (**F-BO**).

## Part 3 — `Text · 1 word` is the FIXTURE, and no change was made

Read directly from the dev database:

```
seed-mat-ql1  Query Letter  "Hook-first"     wordCount=undefined  bodyChars=0  bodyWords=0
seed-mat-ql2  Query Letter  "Comps-forward"  wordCount=undefined  bodyChars=0  bodyWords=0
seed-mat-syn  Synopsis      "One-page"       wordCount=undefined  bodyChars=0  bodyWords=0
```

All three hold **no text at all**. `wordsPhrase` returns `null` at zero words, so `sourceLabel`
emits `Text` with no count — which is what the rail measured (`Text · in 2`) in the previous pack.
**`1 word` is not reproducible on this data**, and the label is correct: the seed is what is thin.

**D8's sweep ran anyway**, over every word-and-count derivation rather than the one that was seen:

```
materialDraft.wordsPhrase     words === 1 ? "word" : "words"     ✔ and null at zero
manuscriptPitch:160           n === 1 ? "word" : "words"         ✔
manuscriptProfile:112         word${words === 1 ? "" : "s"}      ✔
compsPage:115                 elapsed === 1 ? "year" : "years"   ✔
builderRail.versionMetaLine   package/packages, agent/agents     ✔ locked
```

One inconsistency found and **not** changed, since it is outside this pack: `agentMaterials.ts:116`
formats with `toLocaleString("en-US")` in an `en-GB` app, and always says "words". It describes the
AGENT's stated requirement rather than a material's length, so the plural is not wrong there —
the locale is. Flagged, not fixed.

## Part 4 — verification. E and F both landed; two faults found in a third place

Measured at 1440 and 1920, identical:

```
D3   AFFORD    exactly one — "＋ Build a package · or drag a chip here"
D9   HL        chip → 2 rows lit, 1 dimmed  ·  cell → 1 chip lit, 2 dimmed
D10  SORT      desc [5,2,0] · asc [0,2,5] · aria-sort descending then ascending
D11  NOTES     Standard UK: the Caveat line, and NO ＋ Note
                the other two: ＋ Note, opacity 0 → 1 on hover
D12  TRACKING  one panel … see below
```

**D11's answer is "both, and neither is a fault".** Part F's UI shipped — `pkgb-pnote`,
`pkgb-paddnote`, `PackageNote` and `pkgn-box` are all present — and no package had a note, because
I seeded one for last pack's read-aloud and restored it afterwards. Seeded again, both states proven
in one run, restored again.

### ⚠️ THE FIXTURE HAS LOST `seed-ms-1`'s BOOK VERSIONS, AND THAT IS WHY THREE THINGS LOOKED BROKEN

```
seed-ms-1   "The Smoke Test"     bookVersions = undefined      (three, last pack)
seed-ms-2   "The Quiet Second"   bookVersions = 1
thin-ms     "The Quiet Fixture"  bookVersions = undefined
```

The tell was the chip count: **3 chips where there were 6.** With no versions, `versionsActive` is
false and every version surface hides itself — which is its stated law, *"a writer with fewer than
two versions sees NONE of this"*. So:

* **D12's "only one panel" is correct behaviour, not a regression.** Seeded three versions back:
  all three panels render (`Requests by material`, `Requests by opening`, `Manuscripts out with
  agents`). Restored to as-found afterwards.
* **Part 2's empty Versions section is the same cause** — the section was empty because the
  manuscript has no versions, not because the section mishandles the state. The fix stands on its
  own merits; the screenshot's trigger was the data.

I cannot attribute the loss. **It is worth a decision: dev currently shows none of the versions
feature on the main fixture.**

### Two faults found by reading the seeded panel aloud — REPORTED, NOT FIXED

This is a verification pass, so neither was touched.

1. **`Requests by opening` renders `0 packages`.** `bookVersions.ts:369` emits
   `${r.packages} package${…}` with no absence branch, so a version in no package reads
   `§Prologue-first · 0 packages · 0 requests from 0 sent`. The version CHIP was given the
   words-not-a-zero treatment last pack (`not yet in a package`); this panel was not. Same fault
   class, different surface — which is what D8's "sweep the class, not the instance" is for, applied
   to the wrong pack.
2. **The panel's tag reads "Across every sample and package that carries it."** Samples are retired
   as a material type; the aggregation no longer touches one. The heading beneath it was corrected
   at D15 and this line was not.
