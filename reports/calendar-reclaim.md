# Calendar — reclaim the cell, measure the fold

**Session:** `calendar` · 22 Aug 2026. Small, urgent, one outcome.
Context: `reports/tasks-chassis-21px.md` — the chassis fix did not cause this, it revealed it.

> **DEPLOY — filled in at Phase 3.**

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
