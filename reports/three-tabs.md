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

---

## Three fixes on the screenshots, and F-BR — `cbf80967`

### ⚠️ The single column was not a density trade. `.bldr-split` pinned the rail at 296px

The container query was resolving honestly; it was being handed 296px at every viewport. That
literal fitted a column of CHIPS and outlived them.

```
                      1440        1920        2560
.bldr-split      296 + 690   296 + 1170   296 + 1810
.bldr-cards            1 col       1 col       1 col
```

**A grid that answers the same at 1440 and 2560 is not answering.** After:

```
.bldr-split      506 + 480   977 + 489   1404 + 702
.bldr-cards       2 × 247.5   4 × 236.1    5 × 272
```

The column count is `repeat(auto-fill, minmax(236px, 1fr))` — no threshold, no breakpoint, and
correct at whatever width Part C's panel produces. 236 is the ref's drawn card and clears the
measured floor of 182 (the foot's two phrases need 147.3px inside a card less 34px of padding).
`auto-fill` rather than `auto-fit`, so the Synopses section's single card stays card-sized instead
of stretching to the full rail; and never `minmax(0, 1fr)`, which is the hundred-phantom-tracks
fault this repo already measured on the dashboard.

The composer's floor is 480 — `.bldr-slots` is three equal tracks each needing a material's name
beside a clear control. The 2:1 share is the reading that the library is what you browse and the
composer is what you reach for once. Part C's pinned panel inherits both.

### ⚠️ And the gate needed a second claim, because the obvious one passes on the bug

`cols === floor((railW + gap) / (236 + gap))` is satisfied at 296: `floor(307 / 247)` is 1, and one
column is what it rendered. **The derivation cannot catch a starved container** — so the gate also
asserts the library is the larger half of the split, which is the structural claim the arithmetic
can't make. That is the assertion the red proof tripped.

### The explainer trio was outside all three panels

`<FootnoteBand />` was a sibling after the panels, so it rendered on every tab — the same three
cards explaining how Replies and Requests are counted, beside a ledger and a card library that state
neither as a concept. Moved inside Tracking.

```
FOOT  packages: mounted 3 · showing 0
      builder : mounted 3 · showing 0
      tracking: mounted 3 · showing 3 · panel pkgt-panel-tracking
```

Mount count and visible count are asserted separately: every workspace page stays mounted and panels
hide with `hidden`, so a second mount would satisfy "three showing" while doubling "three exist".

### F-BR — the holdings line is back, and the fixture could not show it

```
Prologue-first        Opens on the flood, and holds the guild back until chapter four.
                      1 package · held by 3 agents
                                                              Latest        In 1
```

**No package on the fixture named a book version and no query was still out**, so `held by N agents`
could only ever render as its absence — the unit lock proved both branches while the page could show
one. It could not be added to either existing package: the version slot is frozen once a package has
been sent, permanently and by design, and the rules refused the write. `seed-pkg-3` carries it from
create, with a Full Sent and a Partial Sent still out on it.

The line is omitted at zero rather than reading `held by 0 agents` — the foot's `Not in a package`
states that absence once.

### ⚠️ Card height, measured rather than eyeballed

Nick's third point, for a decision rather than a change:

```
one-line band     14px of ink in a 34px reservation   →  20px of slack, on 5 of 8 cards
material card     116.6px            version card     130.8px
```

At four-up it reads better than it did at one-up, but the slack is real and it is half the band. The
band is reserved so that a card with a description and a card without are the same height in a row;
dropping the reservation gives a ragged grid, which is what Option A in the ref was rejected for.
**Left as it is, with the number recorded.**

One thing that was fixed: a version with no holdings line had **3px** between its band and the foot
where every other card has 9, because the note was the band's last child and carried the tighter
margin meant for the line above the holdings.

### Proved red three times

| broken | what noticed |
|---|---|
| the rail pinned back to 296px | `the composer holds more width than the library` |
| the holdings line removed | `no version in a package — F-BR unproven` |
| the explainer moved back outside the panels | `footnoteBand.measure.ts` |

---

## Part C — the bench is a pinned panel — `01d735e6`

### ⚠️ The split's second column has been empty since it was written

`<BuildRow>` sat INSIDE `.bldr-railcol`, under the library. So a two-column grid held its composer
in column one and **nothing at all in column two** — which is the empty right half of a 2,000px
page, and it means last pass's widening moved the library into space the composer was never in.
The panel is the second column now.

### What went with the row

`BuildRow` and `buildRow.css` are deleted in the same commit that mounts `BuildPanel`. `open` and
`armed` go with them: they existed because the row was hidden until clicked, so a drag needed
something to arm. A pinned panel is always its own target. `Cancel` becomes `Clear` — there is
nothing left to close, only slots to empty — and Escape empties them, bound only while something is
in the panel so an empty bench never swallows a key the page wants.

What survived the move is what other files render: `.bldr-split` and its columns (the page), and
`.bldr-btn` (VersionQuickAdd). Everything else described the strip.

### `MaterialCard` is extracted, not copied

A filled slot holds the library's own card. The alternative was a second card implementation inside
the panel, which is how two surfaces come to disagree about what a material looks like — already
paid for once here as two ghost cards differing by a single word. The modes are additive props
rather than a `variant`: a library card drags, picks, reports its hover and dims; a slot card
renders and offers a remove control. Passing neither gives the static card, which is what a slot
needs and what a union would have had to spell out as a third member.

### Two shell figures come back, because something reads them

```
--wpg-stuck-h   55.6px   the SETTLED slab height   →  panel top = 55.6 + 16 = 71.6
--wpg-port-h     752px   the scrollport's own box  →  cap = 752 − 55.6 − 32 = 664.4
                                                      100vh would give           812.4
```

`--wpg-stuck-h` was deleted when its last consumer went, which was right — a token nothing reads is
a knob people go looking for. The panel is `position: sticky` inside the same scrollport the
masthead slab pins in, so without it the panel clamps to the same line and slides under. It
publishes the **settled** height, not the live one: `h` falls by the whole settle the instant the
page pins, and a sticky `top` bound to a value moving 62px mid-scroll takes the panel with it.

`--wpg-port-h` is new, and it exists because **`100vh` is the wrong unit here** — the scroller starts
below the shell's own chrome, so a viewport cap over-claims by exactly that offset. Same fault as
the Tasks chassis's unreachable 21px, one element up. The gate asserts the two figures **differ**,
so a run where they happen to agree cannot pass by coincidence.

### ⚠️ `position: sticky` applied, computed correctly, and did nothing

`.bldr-split` sets `align-items: start`, so every track collapses to its own content — which made
the panel's track exactly as tall as the panel, leaving it **zero range to travel in**.

```
before  position: sticky · top: 71.6px · panel top in the viewport: −6.1
```

The declaration was right, the computed value was right, and the panel scrolled clean off the top of
the screen. The fix is a per-item `align-self: stretch` on the panel's column, not a change to the
container's default — `start` is correct for the library column, which must not stretch its cards.
Same family as the marketing hero's grid alignment, and as `mix-blend-mode` killed by an ancestor's
transform: **the rule applies, the browser honours it, and the thing you wanted does not happen.**

### The internal scroll, proven with three cards at a short viewport

```
1440×900   panel 499 · cap 664.4 · slots 383/383 · scrolls false
1920×700   panel 464.4 · cap 464.4 · slots 348.4/361 · scrolls true
1440×620   slots 310 against 268 · scrolled to 42 · title visible · Create visible
```

An empty bench is 310px tall and would never overflow anything, so a check taken on it proves the
panel exists and nothing else. At 900 the cap is 664 and three cards fit — **the overflow branch is
unreachable at a tall viewport**, so a gate that only ran tall would go green on a panel with no
scroll at all. The scroll is on `.bldp-slots`, not `.bldp`: a panel that scrolled whole would take
its own Create button off the screen at the moment it became usable.

Card heights are printed rather than assumed — `[Hook-first 116.6, One-page 116.1, Prologue-first
130.3]` — so a fixture drifting to three identical cards is visible rather than silent.

### The 480px floor, re-derived rather than inherited

It was three side-by-side slots each needing a name beside a clear control. The slots stack now, so
that argument is gone. Under the pin: a slot holds a full card, whose own minimum is 236, and
236 + 2 × 18 of panel padding is 272 — **the foot is what holds the number up**, carrying a reason
line beside two buttons. Same figure, different constraint, and it is stated at the value rather
than left looking like an inheritance. Measured 480 at 1440 and 488.7 at 1920.

### And the library sweep needed re-scoping

`document.querySelectorAll(".bldr-mc")` returned **9** the moment a card was picked, because the
slot now holds the same component. The "library keeps every card" check counted a card twice. Not an
app fault — a selector that stopped identifying the thing it was named for.

### Proved red three times

| broken | what noticed |
|---|---|
| the panel's column stops stretching | the panel's top no longer clears the slab |
| the cap goes back to `100vh` | the cap disagrees with the scrollport, and the short viewport stops overflowing |
| the scroll moves to the whole panel | `overflowY` on the slots, and `the slots did not move` |

### One note on the commit form

The deleted paths made `git commit --only -- <paths>` refuse the pathspec, so this one was committed
from a verified index instead: `git diff --cached --name-status` was read in full first and lists
exactly the eleven files, and `git status` afterwards shows only another session's untracked report
images. Same guarantee, reached the other way round.

---

## The three on the Part C screenshots — `6b1a7912`

### The slots had no affordance

Each empty slot now carries a quieter second line — the label states what goes in it, the line
states how it gets there, and the second is smaller so a reader who already knows can skip it.

```
SLOT  Covering letter · required   Drag a card here, or click one   10.5px
      Synopsis · optional          Drag a card here, or click one   10.5px
      Version · optional           Drag a card here, or click one   10.5px
      head: ""
```

### ⚠️ And retiring the head's line was a consequence the brief did not ask for

`Drag or click a part in` was the ref's, carried because the ref's slots said nothing. With three
slots each stating it, the head was the same instruction **a fourth time, three inches above three
copies of itself** — the fault the last two passes have spent their time removing from the card
foot. Retired, with the lock asserting the head does not say it. One line to put back if the slots
ever stop.

### The name now reads as a field

Dashed underline plus lucide's pencil — this app's established editable-in-place mark
(`.qp-inplace`) and the same pencil the agent card and the manuscript actions already use, rather
than a fourth drawing of the same object. The border is on the **wrapper** and the pencil is
`pointer-events: none`, so the mark cannot swallow a click aimed at the field it is advertising.
Asserted as `dashed 1` on the wrapper, plus the pencil's presence and its pointer-events.

### The Packages tab at four packages — measured before deciding

```
PKG  panel 345.7 of a 852px scrollport (40%)  ·  4 rows  ·  tab reads "Packages 4"
     4 BUILT · 9 SENT
     Standard UK        Hook-first     One-page   Not recorded    5 · 2 · 2
     Comps-led variant  Comps-forward  One-page   Not recorded    2 · 1 · 0
     Prologue-led       Hook-first     One-page   Prologue-first  2 · 2 · 2
     Unattributed set   Hook-first     —          Not recorded    Not yet sent
```

**It needs nothing.** At one package it read as a page with a row on it; at four it is a ledger, and
40% of the scrollport is honest for four rows rather than a hole to fill. The version column also
shows the frozen-slot design working as intended — `Prologue-led` names its ordering because it was
created with one, and the two sent packages read `Not recorded` permanently, which is the rule
refusing a retrofit rather than a gap.

Worth re-reading if a writer ever has twenty; nothing to do at four.

### On the deploy sequence

Recorded against myself in CLAUDE.md: a failed check is a stop, and proving afterwards that it could
not have reached the bundle is a good answer to the wrong question. The gate exists so nobody has to
reason about it.
