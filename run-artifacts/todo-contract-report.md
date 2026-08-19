# The materials contract, worked as a table. Run report

**The file existed — in `~/Downloads`, not at `design-refs/todo-materials-contract.html`.** Three
byte-identical copies; one is now committed to the repo path (`362e682`) so it stops going missing.

**Baseline** 330 files · 5773 passed · 0 failed → **final** 330 · **5776** · 0 failed.
**Contract assertions: 44 RED → 2 RED of 92**, measured on the real page.
The two remaining are journeys with **no card on this account** — `chase` (no `nudge_overdue`
anywhere in the harness data) and `fix1`, which is suppressed by its own bulk threshold. `fix1` was
exercised by forcing the threshold to 100: **all fifteen of its rows green**, then reverted.

---

## ⚠️ Premises that turned out false

1. **"D1 has been silently green all along" — worse than that.** It had never been asked. Three runs
   of assertions checked *"does a `.rim` exist"* and the pane had exactly one, wrapping band, tiles,
   form and timeline together. Measured before: `cards=0 rims=1`. The contract wants three cards,
   each with its own rim, the workrow a **sibling** of the header.
2. **My 786px threshold was still a breakpoint.** I derived it carefully last run and defended it in
   a commit message; the contract's instruction — flex-wrap decides, nothing else — is simply
   better, and 1440 had been sitting permanently on the wrong side of my number.
3. **The band had no figure at all.** Not mis-styled — absent. `.tdk-facts` carried a forward-looking
   fact; the contract's Playfair-33 numeral over a mono unit did not exist.
4. **G3 was my mechanism preference dressed as a requirement.** It demanded the contract's
   `.band::after`; the live band draws the identical line with `border-bottom`. The guard was
   corrected, not the code.

## What changed, by row

| rows | landed |
|---|---|
| **D7–D10** | Six container queries gone. Rail `minmax(260px, 340px)`; workrow a wrapping flex row (form `1 1 420px`, timeline `0 1 300px` / 240 floor); tiles `repeat(auto-fit, minmax(150px, 1fr))`; both foot hints wrap on a basis; `.tdk-body`'s two columns — the last breakpoint in the pane — now wrap. |
| **D1–D4** | Three `.tdk-fc` cards, each with its own `.tdk-rim`. `.tdk-w` is the column's box and draws nothing. `.tdk-act` at the contract's `21px 24px 22px`; the timeline card gains a real `.tdk-storyfoot`, head and foot both on `--rimline`. |
| **D5** | Group class on the **column** (`.u-now` / `.u-house` / `.u-yours`). The group is still `liveFamily`'s — `GROUP_CLASS` is a naming map keyed off its return type, so a fourth family cannot be added without landing there. |
| **D11–D13** | Band `20px 24px 18px` + `.nofig`; deed 27px; tile `14px 20px 15px`, label weight 500, `.tdk-tilesub` for the sub line. |
| **D6** | **Reversed deliberately** (below). |
| **D14/D15** | Unchanged — `var(--line)` stands. The contract's own footer: *"values come from the live stylesheet."* |

## D6 — a shipped decision overturned

`panePresence` gave a Note none of the three. The contract gives it a figure and three tiles and
withholds only the timeline. Nick's correction, recorded verbatim in the code: *"I wrote 'Note has
no figure and no tiles' into a brief after drawing the mockup with both, and never reconciled
them. The mockup is right."*

It is. A note has a real added-date and a real age; **"Due · No date set"** and **"Attached to ·
Nothing"** are the absent-data grammar doing exactly the job it exists for. My original reasoning
read *"no query"* and concluded *"nothing to state"* — true of the history, false of the other two.

## The eleven matches held

Rim geometry · the three gradients and their bottom rules · deed inks per group · sub tints per
group · absent-data mono · no pill or tier label in the band · no gendered pronouns · no
`[object Object]` · the timeline's mono header, its count, its burgundy footer link. **None went red
during the restructure.** G3 is the single correction, and it was to the guard.

## Twelve locks re-pointed, none deleted

`.f12-card`'s four values (now on `.tdk-fc`) · the rail token (twice — it no longer exists) · the
body's grid tracks · the body's container query · the jgrid · band padding · deed 26px → 27px · the
note's presence · the card-fills-the-pane cap check. Each carries its reason in place.

## Two faults of my own, both caught

- A comment I wrote contained a literal comment-terminator and **closed itself early** — tsc
  reported a missing paren four lines below. The malformed-comment class, in JS this time.
- The page-side CSS check went red **on my own prose**: my notes name `@container` while explaining
  its removal. It strips comments before asserting now, which is the house rule it should have
  followed from the start.

## ⚠️ The one thing to look at first in the morning

**The band figure duplicates the first tile.** On a send it reads `10 weeks` in the band and
`ANA'S WAITED · 10 weeks` in tile one. The contract avoids this by giving the band a *different*
fact from the tiles — its `now` journey shows `4 days with you` beside tiles for *Send to ·
Requested · Sent previously · Their window*. Ours points the band at `figureFor`, which is the
wait, and the wait is also a tile. **That is a data-mapping decision, not a layout one**, so I
left it: choosing which fact the band should carry is yours.

Second: `chase` cannot be exercised on this account at all, so its rows are unverified on a real
page — its data, not its code.

## Out of scope, named

The count gap · `Query.materialsWanted` vs `Activity.materials` · duplicate React key warnings ·
`.tdb-jngrid`'s container query (the **FocusFlow takeover**, a different surface) · materials forms,
bulk table, Pro versions.
