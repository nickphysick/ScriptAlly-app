# Calendar — retire the density tiers

> **DEPLOYED TO DEV.** All five phases on `main` (`4d5af390` → `07334b4c`), every gate green, and
> `https://scriptally-dev.web.app` verified as carrying them — the labels, the sentences, the
> notches and today's mark read back off the deployed bundle rather than off the success line.

**Session** `calendar` · base `b66e8fa5` · **complete** · hosting only; nothing touched functions
or rules.

| phase | commit | what landed |
|---|---|---|
| 0 | `4d5af390` | recon |
| 1 | `8fe90b11` | the range stops deciding whether a bar speaks |
| 2 | `9bed17be` | the row head carries a sentence, and finishes it |
| 3 | `9e8b5441` | the notch supersedes the dashed ring; v11 amended |
| 4 | `76501ac7` | a fixed mark meeting a variable label, and a shorthand erasing an image |
| 5 | `07334b4c` | the acceptances join the matrix |

**Suite at close:** 418 files, 7,182 passed, 3 skipped. tsc clean. Production build clean.
**27 calendar locks green.**

---

## What a reader sees — identical at 1280 / 1440 / 1920 / 2400

| range | bars | **labels** | notes | bar height | row heads |
|---|---|---|---|---|---|
| 1 week | 16 | 15 | 6 | 44px | 13, 0 clipped |
| 2 weeks | 19 | 15 | 6 | 44px | 13, 0 clipped |
| 1 month | 27 | 14 | 6 | 44px | 13, 0 clipped |
| **3 months** | 33 | **15–16** *(was 0)* | 6 | 44px | 13, 0 clipped |
| **6 months** | 42 | **16–17** *(was 0)* | 6 | 44px | 13, 0 clipped |

---

## Flags

**1 · Deployed, and why.** Twenty acceptance stops at four widths, 27 calendar locks, and the
deployed bundle re-measured rather than assumed. Hosting only.

**2 · Two tier rules kept, one deleted.**

| rule | verdict |
|---|---|
| `.dense3/.dense4 .tl-node { --disc: 22px; --ddot: 15px }` | **kept — geometry.** How big a marker is, is a real response to range. |
| `.dense3/.dense4 .tl-node[data-marker] { box-shadow: 0 0 0 2px <ground> }` | **kept — geometry.** At 22px a marker on a filled bar has no edge of its own; the halo punches it out of the board. A response to the marker having shrunk, not decoration. |
| `.dense3/.dense4 .tl-seg .tl-lbl` **+** `.tl-cnt { display: none }` | **deleted — content.** A claim about a bar's WIDTH, answered from its RANGE. |

⚠️ **The diagnosis's third item does not exist.** There is no per-tier bar height: `--bar-h: 44px`
sits on `.tl-row` and `.tl-seg { height: var(--bar-h) }` reads it, and no tier touches either. The
new lock therefore confirms a property the sheet already had — worth having, since it is the shape
a future tier would reach for first.
⚠️ **`--clear` does not exist either**, so "keep `--clear`" had no subject. It was deliberately left
undeclared in the range pack rather than shipped as three values nothing reads.

**3 · Neither, quite — it ran, on a measurement of nothing.** `barFit` walks every `.tl-seg` at
every range. But `scrollWidth` on a `display: none` element is **0**, so:

```
fitLabel(clientWidth, 0, 0)  →  clientWidth >= 0 + 26  →  "long"
```

Every bar wider than 26px was judged to hold its long form comfortably, `.narrow` was never
applied, and the tier hid the label anyway. **It did not merely lose the cascade — it computed a
confident wrong answer first**, and a probe reading `.narrow` would have reported a board where
every label fits.

**4 · The blob was a fixed mark meeting a variable label, and neither half was wrong on its own.**
`.tl-dd` is a **19×19 round disc** — exactly right for the thing it was designed around, a one- or
two-digit day number at day grain. The range control then made that label **`"25 Aug"`** at week
grain and **`"Aug"`** at month grain, and nothing changed the marker wrapping it. The mark is
`inline-flex` and centres its content, so the text spilled equally out of **both** sides of a 19px
circle — which reads as a blob rather than as a clipped word.
**The fault is the fixed size, not the roundness.** It is a pill now: 25×19, 50×19, 31×19 across
the five ranges, with the height held at 19 — which is what the original comment was protecting.

**5 · Label counts, before and after** — 1440, real text, not just visible elements:

| range | before | after |
|---|---|---|
| 1 week | 15 long / 0 short / 0 bare | 15 / 0 / 0 |
| 2 weeks | 15 / 0 / 0 | 15 / 0 / 0 |
| 1 month | 14 / 0 / 4 | 14 / 0 / 4 |
| **3 months** | **0 / 0 / 19** | **13 long / 2 short / 4 bare** |
| **6 months** | **0 / 0 / 21** | **14 long / 2 short / 5 bare** |

⚠️ **AND THE SHORT FORM WAS NEVER DEAD — IT WAS UNREACHABLE.** The settled pack reported it as live
code this account never exercises, because its bars were either ~600px or exactly 28px with nothing
between. That was true *of the ranges where labels were allowed*. The band where a short form is
the answer is precisely the band the tier was hiding: **four bars take it now.**

**6 · What remains unverifiable, and cross-session notes.**
- ⚠️ **THE `openL` HATCH IS UNREPRODUCIBLE ON THIS ACCOUNT, AND WHAT I FIXED IS A MECHANISM RATHER
  THAN THE SYMPTOM.** `calLook` has reported for three packs that there is no hatch here — no
  your-move stretch has an expectation that has passed. So I could not see "a striped block sitting
  apart". Reading the cascade did find a real defect: `@keyframes tlUrge` animated `background`, the
  **shorthand**, which resets `background-image` — and that is how `.tl-seg.hatched` paints the
  overrun. An animation outranks normal declarations, so **the breath was erasing the hatch on
  every frame it ran**, on precisely the bar that has both. Every bar rule uses `background-color`
  now, locked over the whole family. **Whether that was the reported symptom, I cannot say.**
- **There is no long-standing bar at three months** on this account, so the breath is unasserted at
  that one stop — reported at the stop rather than absorbed.
- **`--tl-head-w` steps to 200 and 150 below 1200 and 1000**, and there 5 and 6 sentences ellipsis.
  That is the trade those breakpoints exist for — seven day columns on a small laptop — and it is
  outside the four acceptance widths.

---

## Two things found by looking rather than by being told

**⚠️ I NEARLY MISSED THE RULE THIS PACK IS ABOUT.** Its selector spans **two lines**, and my first
recon sweep used `[^\n{}]*dense[1-4][^\n{}]*\{` — a pattern that cannot cross a newline. It
reported **two** tier rules and a clean bill on labels: the answer that would have made the whole
pack look unnecessary. It did not error, it under-reported. The new lock reads whole rules, and a
mutation restoring the suppression **with a multi-line selector** is one of the three it was proved
red against.

**⚠️ `tlPhase2` WAS RED FOR TWO PACKS AND NOBODY LOOKED.** It pinned the board's ground as
`rgb(247, 244, 238)` — `--ws-ground`, which the board borrowed while its bars were white. The
settled pack gave the board its own `--board-ground` **and did not run this file.** That is exactly
the discipline this pack restates at the top, missed by me, in the pack immediately before it. It
asserts the **token** now rather than the value, which is what makes it a claim rather than a
maintenance cost.

---

## Known, carried, not attempted

- **Marker clearance** — 43.1px at one week, 1.7px at six months, 39 of 72 marker/bar overlaps at
  the long end. This pack's own instruction was not to attempt it; the table from the settled
  report is where its phase starts.
- **`.tpn .ws`** squeezes the pane below ~600px. **`nudge_overdue`** survives as a stored task type
  across ninety files. Both confirmed, neither in scope.

---

## Phase 0 — recon (read-only), as taken

**Red gate: clear.** Tree clean, level with `main`, 8 ahead of `origin/main`. No session mid-edit;
`barFit.ts` and the tier definitions untouched since the settled pack closed.

---

## 1 · Every tier rule — three, and only one suppresses content

| rule | sets | kind |
|---|---|---|
| `.tl.dense3 .tl-node, .tl.dense4 .tl-node` | `--disc: 22px; --ddot: 15px` | **geometry** — keep |
| `.tl.dense3/.dense4 .tl-node[data-marker]` | `box-shadow: 0 0 0 2px <ground>` | **geometry** — keep |
| `.tl.dense3/.dense4 .tl-seg .tl-lbl` **+** `.tl-cnt` | `display: none` | **content** — delete |

The second is not decoration: at 22px a marker sitting on a filled bar has no edge of its own, and
the halo punches it out of the board. It is a response to the marker having shrunk, which is
geometry, and `barFit` says nothing about it.

> ⚠️ **I FOUND THE THIRD RULE ONLY ON THE SECOND ATTEMPT, and the near-miss is worth more than the
> rule.** Its selector spans **two lines**, and my first sweep used `[^\n{}]*dense[1-4][^\n{}]*\{`
> — a pattern that cannot cross a newline. It reported **two** tier rules and a clean bill on
> labels, which is exactly the answer that would have made this pack look unnecessary. The same
> family as every bounded match in this repo: it did not error, it under-reported.

## 2 · `barFit` is not skipped — it is overridden, after being fed a zero

It runs over every `.tl-seg` at every range. But the tier hides the label, and **`scrollWidth` on a
`display: none` element is `0`** — so:

```
fitLabel(clientWidth, 0, 0)  →  clientWidth >= 0 + 26  →  "long"
```

Every bar wider than 26px is judged to fit its long form comfortably, `.narrow` is never applied,
and the tier's `display: none` hides the label regardless. **So it does not merely lose the
cascade: it computes a confident wrong answer first, from a measurement of nothing.** A probe
reading `.narrow` would report a board where every label fits.

## 3 · Bar height has one source, and no tier touches it

```
.tl-row  { --bar-h: 44px }
.tl-seg  { height: var(--bar-h) }
```

**Nothing else sets `--bar-h` and nothing else sets a `.tl-seg` height.** The only other height in
that family is `.tl-seg .d { height: 8px }`, the bullet. ⚠️ **The diagnosis's "and their own bar
height" is not the case** — there is no per-tier bar height to remove, and Phase 1's assertion will
be confirming a property the sheet already has rather than fixing one.

## 4 · Two locks assert a tier or a suppressed label

- **`tests/e2e/tlPhase3.measure.ts`** — `:44` asserts the tier per range (`1,2,2,3,4`); `:63`
  asserts `barText === "none"` at 3 and 6 months.
- **`tests/e2e/tlAccept.measure.ts`** — its table carries `barText: false` for those two ranges.

Both were written when the tier was the mechanism. Phase 1 retargets them, each stating its law.

## 5 · The notch is in the ref, was never in a pack, and v11 still says ring

**`design-refs/timeline-settled.html` (v44) specifies it — twelve mentions**, including the rule:

```css
.notch { position:absolute; top:50%; width:2px; height:calc(var(--bar-h) + 12px);
         background:var(--dash); transform:translate(-50%,-50%); border-radius:2px;
         z-index:5; cursor:pointer }
```

**No pack's prose has ever named it**, so it arrived in the repo as part of an artefact and nothing
was built to it. `timeline-marker-grammar.html` (v11) still describes the dashed ring, and the two
refs have been contradicting each other since v44 landed.

⚠️ **v44 gives the notch `cursor: pointer`. This pack says it is not clickable.** The pack wins —
it names the behaviour and gives its reason (nothing is behind it), and a pointer cursor on an inert
mark is a promise the app cannot keep.

⚠️ **AND THE DASHED RING IS ONLY ONE OF OUR TWO WAYPOINT SHAPES.** `.tl-wp` already draws a **2px
dashed vertical upright** for every kind; only `[data-kind="reminder"]` suppresses it and draws a
dashed circle instead. So Phase 3 is smaller than it reads for four of the five kinds — the upright
goes from dashed to solid and gains its full height — and a real replacement for the fifth.

---

## Findings the pack did not anticipate

- ⚠️ **THE NOTE IS NOT SUPPRESSED AT ANY TIER.** Zero rules pair `dense` with `.tl-tail`, and the
  settled pack measured **six notes at every one of the five ranges**. The diagnosis's "`display:
  none` on the end label and the note" is half right: the end label (`.tl-cnt`) is suppressed, the
  note never was.
- ⚠️ **`--clear` DOES NOT EXIST**, so "keep the geometry tiers — … `--clear`" has no subject. It was
  deliberately left undeclared in the range pack rather than shipped as three values nothing reads;
  the stylesheet carries that reasoning where the token would go. The marker clearance is still
  `journeyBars.GAP`, and is out of scope by this pack's own instruction.
- ⚠️ **`--dash` IS NOT A TOKEN HERE.** It is the ref's name for `#c9a89e`, which appears in our
  sheet as a literal on `.tl-wp.yours`. Phase 3 needs it declared rather than repeated.
