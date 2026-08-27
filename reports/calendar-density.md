# Calendar — retire the density tiers

**Session** `calendar` · base `b66e8fa5` · **Phase 0 — recon, read-only**

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
