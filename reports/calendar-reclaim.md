# Calendar — reclaim the cell, measure the fold

**Session:** `calendar` · 22 Aug 2026. Small, urgent, one outcome.
Context: `reports/tasks-chassis-21px.md` — the chassis fix did not cause this, it revealed it.

> # ✅ DEPLOYED — **https://scriptally-dev.web.app** → Tasks → Calendar
>
> **Both conditions passed for the first time in five runs.** Own gates green — `tsc` **0**,
> Vitest **364 files / 6198 passed / 0 failed**, build exit 0, target guard *"bundle targets
> scriptally-dev (dev); gen-lang-client-0801391782 absent"* — and **no other session's uncommitted
> source in the tree at build time**. Verified against the live asset and then re-run on the
> deployed site: cushion 13 / 4 / 4 / 4, `data-fold-short` absent at every width.

---

## Step 0 — gates

- **Red gate — is the chassis fix in the tree?** `.ws-main` now reads
  `flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
  padding: 0 22px 20px` — **`height: 100vh` is gone**. Numbers are meaningful. Gate passes.
- Territory clear; **0 dirty source files**; **`tsc` 0**. HEAD `20a49c3c` ("deploy: all five
  sessions pushed and live on dev").

---

## Phase 0 — MEASURED: the cell's budget on the corrected chassis

| width | rowPx | cell clientH | available | 2 pills + counter needs | **cushion** | overflowing |
|---|---|---|---|---|---|---|
| **1000** | 99.33 | 98 | 65.25 | 61 | **+4.25** | none |
| **1280** | 89.50 | 89 | 56.25 | 61 | **−4.75** | days 12, 13, 21, 22, 4 |
| **1440** | 89.50 | 89 | 56.25 | 61 | **−4.75** | days 12, 13, 21, 22, 4 |
| **1920** | 89.50 | 89 | 56.25 | 61 | **−4.75** | days 12, 13, 21, 22, 4 |

**The overflow reproduces on days 12 and 13 as reported — and on three more (21, 22, 4).** All at
`scrollHeight 94 vs clientHeight 89`. **1000 is already fine**: the collapsed layout has a taller
row, so the shortfall is a wide-viewport fault only.

### Where the cell's height goes

| term | value | is it slack? |
|---|---|---|
| cell padding | 6 / 6 = **12px** | **yes** — the pack's second target |
| `.cal-d` numeral row | **20.75px** | **yes, but bounded** — see the disc |
| ↳ `.cal-dn` numeral box | 20 × 20, font 10.5px, line 10.5px | |
| ↳ **today-disc** | **20 × 20**, `border-radius: 50%` | **⚠️ IT IS THE SAME BOX** |
| pill | 23 + 2 margin = **25 flow** | **no** — reclaimed to ~0.5px last pack |
| counter | **11** (padding `2px 2px 0`) | **no** — same |

### ⚠️ The today-disc sets the floor on the numeral row — measured, not assumed

`.cal-cell.today .cal-dn` **is** the numeral box: 20 × 20, `border-radius: 50%`, filled burgundy.
There is no separate disc element to keep. **So shrinking the numeral row shrinks the disc**, and
the question is how small a disc can hold a 10.5px numeral rather than how small a row can hold
one. That is why the pack's "target ~16px" is a ceiling on ambition here, not a free choice.

### The arithmetic Phase 1 must satisfy

At 1280/1440/1920: **56.25 available, 61 needed — short 4.75**, and the pack asks for **≥ +4**
cushion. So Phase 1 must find **≥ 8.75px** inside the cell, from the two slack terms only.

---

## Phase 1 — RECLAIMED, in the pack's order of preference

Three reclaims, measured after each, stopping at the bar:

| what | from | to | recovered |
|---|---|---|---|
| the numeral box (**= the today-disc**) | 20 × 20 | **16 × 16** | 4.75px |
| cell vertical padding | 6 / 6 | **4 / 4** | 4px |
| the row's `align-items` | `baseline` | **`center`** | 0.75px |

**The third was not planned and is the more correct alignment anyway.** Baseline alignment on a row
whose tallest child is a 16px inline-flex disc added 0.75px of descender slop — the row measured
**16.75 for a 16px box** — and that was the last of the shortfall. It is also right on its own
terms: the numeral is centred inside its own disc, so aligning the row on a baseline aligns on a
box that no longer has a meaningful one.

**Untouched, as instructed:** the pill's metrics and margin, and the counter's padding — all
reclaimed to ~0.5px last pack.

### After, at all four widths

| width | rowPx | available | needs | **cushion** | overflowing |
|---|---|---|---|---|---|
| 1000 | 99.33 | 74 | 61 | **+13** | none |
| 1280 | 89.50 | 65 | 61 | **+4.0** | none |
| 1440 | 89.50 | 65 | 61 | **+4.0** | none |
| 1920 | 89.50 | 65 | 61 | **+4.0** | none |

**Exactly the bar, not past it** — "take no more than needed". Being *at* the bar is only safe
because of Phase 2.

## Phase 2 — the fold measures the pill

`calFoldCap` divided by `CAL_PIP_H` / `CAL_MORE_H` / `CAL_CELL_CHROME` — a hand-kept copy of the
stylesheet. The page now reads a rendered cell and the fold divides by what it is told. `chrome` is
measured as *padding + numeral row* rather than as a list of terms, so adding something to the cell
tomorrow carries through without an edit. The constants survive as `FOLD_FALLBACK`, consulted only
before a cell has been read.

> **⚠️ THE STALENESS WAS NOT HYPOTHETICAL — IT HAPPENED INSIDE THIS PACK.** Phase 1 moved the
> numeral row and the cell's padding by **8.75px**, which made `CAL_CELL_CHROME = 35` wrong by that
> amount, **and the entire suite stayed green**. Nothing tied the number to the CSS it described.
> That is the argument for Phase 2 in one sentence.

> **⚠️ AND THE ACCEPTANCE CAUGHT A REAL BUG IN PHASE 2 ITSELF.** A `ResizeObserver` fires once on
> `observe`, and at that moment the month's **pills are not painted** — so with no pill to measure,
> the metrics stayed at their fallback for the life of the page and the fold went on dividing by the
> stale `chrome`. Measured: the grid reported **`data-fold-short="6.5"` at 1280 while the cells
> fitted comfortably**. The read now runs after every render as well; it cannot loop, because
> `setMetrics` writes only on a real change. Without the browser assertion this would have shipped
> looking exactly like a working fix.

## Phase 3 — acceptance

Run on the **deployed** site after the deploy, not only locally:

```
@1000  cushion 13  foldShort=none  disc 16px burgundy 50%  foot true
@1280  cushion  4  foldShort=none  disc 16px burgundy 50%  foot true
@1440  cushion  4  foldShort=none  disc 16px burgundy 50%  foot true
@1920  cushion  4  foldShort=none  disc 16px burgundy 50%  foot true
```

Days **12 and 13 asserted by name** — and the assertion first checks they are still *populated*, so
a data change that empties them fails rather than passing vacuously. `chip = shown + overflow`
reconciles; `"Open the list"` on screen.

---

## FLAGS FOR NICK

**1. Deployed —** yes. Both conditions passed for the first time in five runs; see the top.

**2. Where the 5px came from, and the cushion after —** 8.75px in total, from the numeral box
(4.75), the cell's vertical padding (4) and the row's baseline slop (0.75). Cushion **+13** at 1000
and **exactly +4.0** at 1280/1440/1920.

**3. Did the today-disc set the floor? — YES, and it is worth knowing why.**
`.cal-cell.today .cal-dn` **is** the numeral box: there is no separate disc element, so shrinking
the row shrinks the mark. The question was therefore never "how small can a row be" but "how small
can a disc be and still read as a field behind the glyph". **16px** leaves 2.75px of ground around a
10.5px numeral; below that it becomes a ring rather than a field. **The disc is what stopped the
reclaim at 16 rather than the ~16 the pack suggested being a coincidence.**

**4. What the page does when the fold measures a cap below the floor —** it **draws the ruling and
states the shortfall**. `foldFor` returns three answers: `cap` (the ruling), `fits` (what the cell
affords) and `shortfall` (the gap in pixels); the grid carries **`data-fold-short="{px}"`** whenever
the floor cannot be met. The old behaviour was to return the floor into a cell with room for one and
let the pills overflow to announce it. **No user-facing copy was invented overnight** — reversing
`CAL_CELL_FLOOR` is a product decision, so the ruling still wins and the attribute is the honest
minimum. The acceptance asserts the attribute is **absent** at every width, which is the fold saying
the floor was satisfiable rather than a test saying so.

**5. Cross-session —** the deploy condition **did not** fail a fifth time: the tree was clean at
Step 0 and at build time, and stayed clean throughout. No `dist/` race, nothing moved under me, no
worktree needed. The only cross-session note is that HEAD arrived at `20a49c3c` ("deploy: all five
sessions pushed and live on dev"), so the tree had just been consolidated — which is presumably why
it was quiet.
