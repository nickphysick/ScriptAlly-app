# Calendar v60b — completion pack

## Phase 0 — ref check: **PASS**
`design-refs/timeline-v60.html` · `<title>` = `ScriptAlly — Calendar v60 · design of record` ·
sha256 `abf9bf08621295744034b9debcb00f3f778d2350825cd864fdd56c20a4a8c872` · `check-design-refs`
green (15 refs). Measured in a worktree at `/tmp/sa-v60b`, `vite preview` on 4192, served bundle
hash verified against the local build before every run.

---

## Phase 1 — fidelity. **Three founded, two unfounded.**

| # | Hypothesis | Verdict | Reading |
|---|---|---|---|
| 1 | Numbers column has no fill | **FOUNDED** | all five sections tinted the column; now `rgba(0,0,0,0)` in all five, and the painted pixel matches the lanes |
| 2 | Badge is far larger than the token | **UNFOUNDED as stated** — box was 58×58 against `--badge: 58px` exactly | but the *halo* half is founded, below |
| 3 | Urgent chips and facts | **FOUNDED** | 7 of 13 Urgent rows read `No Response` in the sand tone with "reply expected 27 Jul · none yet" |
| 4 | Today line spans rail-top to rows-foot | **FOUNDED** | line top 331 against rail top 349 — **18px high**, in the gap under the controls |
| 5 | Fades on every running card | **UNFOUNDED** | 13 cards end at today, **all 13** carry overlay and shadow; `crisp = 0` |

### ⚠️ H1's cause is an `!important` I read past

I built the tint onto the header *and* the number column from the ref's per-section rule
(`.grp.g-over .ghead, .grp.g-over .gnums { background: #f1d5cc }`) and missed that its base rule
carries **`background: transparent !important`** on `.gnums` — which beats the per-section rule
outright. The standing reading rule ("where two live blocks collide, the later declaration is the
design") **does not cover this**: `!important` wins wherever it sits.

The lock now measures it **twice**: the computed value, and a **painted pixel**. A computed
`transparent` says only that *this* element paints nothing — an ancestor may still be painting a
tint behind it, which no computed-style probe can see.

### ⚠️ H2 — the box was right and the *ring* was the fault

Box 58×58, SVG 58×58, exactly the token. What reads as a pale disc is that `StatusDot`'s ring is a
**constant 1px** — correct at 12–22px, a hairline at 58 — over a tinted fill. The ref draws the
same circle with a ring at **~11.5% of its drawn diameter** (`r=7.4` stroked `1.7` in a 20-unit
viewBox) and a **white** centre, so the glyph sits in a clear field.

`StatusDot` gains an **additive `badge` prop**: proportional ring, white centre. Every existing
caller is byte-identical without it. It is a prop rather than a size threshold inside the component
**because a rule like "scale the ring above 24px" would change every caller that ever passes a
larger size, silently** — and this component is locked precisely so that cannot happen.

### ⚠️ H3 — and the chip's tone came from a *second* derivation

Fixing the words was not enough: `chipKind` decided the tone from the bar's state while `pillText`
decided the words from the status and the holder. Two answers to one question, and they came apart
the moment the passed-estimate case gained a deed — **seven rows reading the imperative `Nudge
them` in the sand tone reserved for "nothing is happening"**. The chip takes the pill's tone now;
only `closed` and `nudged` stay local, because they are facts about the *bar* that `pillText` is
not told.

`DEEDS` gains a sixth, `Nudge them`. The lateness clause becomes `expected 27 Jul · 6 weeks
overdue` — the board's one vocabulary — where it read `reply expected 27 Jul · none yet`, three
clauses that stated the date, restated that nothing came, and never said how long.

⚠️ **The owed branch still reads `overdue since 20 Aug · 15 days` against the ref's `due 26 Aug ·
7 days overdue`** — a third shape. The pack quoted only the estimate branch, so only that one
changed. Flagged for a ruling rather than unified in passing: it is on six rows and it is a copy
decision.

### ⚠️ H4's cause: `top: 0` resolves against the *padding* box

`.tl-wrap` pads its top by `--tl-flag-lift` to give flags room to fly, so `top: 0` put the line
18px above the rail, pointing at nothing. The offset now reads that same token, so the two cannot
drift.

---

## Phase 2 — flags. **Built.** The v58 caps are gone.

**Future states** are the ref's `.nlab:not(.od)`: dotted outline, no fill, no lift, the deed in
Caveat over the day in mono, rotated −1.5°, standing to the right of the bar's end. Measured: 6
rows, `borderStyle: dotted`, `backgroundColor: rgba(0,0,0,0)`, `boxShadow: none`, family Caveat —
`Nudge · FROM 11 SEPT`, `Nudge again · FROM 8 SEPT`.

**Urgent flags** are the side-strip layout at today: pink strip carrying a `!`, white body, deed in
Caveat, lateness in mono, wobbling on `tlWobF`. Measured: 13 of 13 Urgent rows, one each, 17px from
today's line, and **zero** on any calm row.

- **Positioned by `min()` only** (Law 6). No element is measured to place either family.
- **One urgent flag per ROW, not per segment** — a row can hold several late stretches, and three
  identical pink flags stacked on one column say the same thing three times.
- **Every keyframe restates `translateY(-50%)` in full and no `var()` appears in the block.** The
  lock reads the frames out of the **live stylesheet** and checks them one by one.
- ⚠️ **The animation claim needs `liftMotionSuppression` first.** The harness suppresses animation,
  and `animation: none` is exactly what a suppressed board reports — indistinguishable from a rule
  that was never written.

⚠️ **A flag was stating its own deed twice.** A reminder that has come round carries no date of its
own, so its fact is the words "nudge due" — and the flag read `Nudge due` over `NUDGE DUE`, one
sentence in two typefaces. Where the lateness clause adds nothing to the deed, the flag falls back
to the row's opening clause, which is a date.

### ⚠️ And the Caveat lock had to be restated rather than dropped

Adding the flag's deed reddened `calendarTokens`' "no Caveat in the calendar path". That lock's own
prose says what the scrawl was: *"a handwritten copy of the deed… a second rendering of a fact the
action column already states"* — the fault was **duplication**, and the typeface was how you
spotted it. A flag names a move that becomes available on a future date, which nothing else on the
row says.

So the lock now asserts **where** the hand may appear — `.tl-cap .w` is the only selector in the
sheet permitted to set it, and the page may not set it inline at all. That is **stronger** than the
blanket ban: the scrawl cannot come back under a new class. Proved red by adding a second
handwritten element.

---

## Two conflicts between the pack and the ref, resolved to the ref

The authority split gives geometry to the ref, so both were resolved that way and are recorded
rather than silently absorbed.

1. **"Lock: badge box height … exceeds the bar height."** The ref pins `--badge: 58px` against
   `--bar-h: 62px` — the badge fits *inside* the bar vertically. What it exceeds is the card's
   **left edge**, by `calc(var(--badge) * -0.35)`. The lock asserts the horizontal overhang, which
   is the claim the ref makes and the one a reader can see.
2. **"every Urgent row's chip is one of the five imperatives."** The app has **six**: `Send the
   revision`, which Revise & Resubmit needs and the ref's fixture has no equivalent of —
   `calendarPill` has flagged it as an unnamed fifth since v39. The lock reads `DEEDS`, the app's
   own set, because one spelling out five would fail on a status the app legitimately produces.

---

## Two faults found in my own locks

1. **⚠️ `refTokens` read only the ref's FIRST `:root`, and v60 declares three.** `--badge`,
   `--agent-w` and `--rail-h` all came back `undefined`. It failed loudly in the new lock because
   that one asks with no fallback — but yesterday's badge case wrote `refTokens()["--badge"] ??
   "58px"` and had been **passing on its own fallback**, asserting a number typed into the test
   against a ref it never read. Same shape as the `?? "10px"` fixed in that file the day before,
   one function along. Both fallbacks are gone; the helper merges every `:root` in cascade order.
2. **Yesterday's section lock asserted the wrong claim** (`numsBg === headBg`) and correctly went
   red when H1 was fixed. Retargeted, with the reason at the line.

---

## Not built

| Phase | State |
|---|---|
| 3 · In-card trail (`.ctrack` / `.ctrail`) | **unbuilt** — no CSS written, so no rule without a subject |
| 4 · Past stages with sentences | **unbuilt** |
| 5 · Probe and focus | **focus is built** (hover lifts and scales, nothing else changes); **probe unbuilt** |
| 6 · Navigation and edge tags | **unbuilt** |
| 7 · Sweep of stale `cal*` cases | **unbuilt** |

The pack said Phases 1–2 must land. They did.

## Standing observations, not acted on

- **Two Urgent rows carry a future flag as well as an urgent one** — Elinor Hale and Tom Ellery
  read `expected 27 Jul · 6 weeks overdue` and `Nudge · from 19 Sept` together. Both are true (a
  passed estimate, and the agency's next window), and read side by side they sound contradictory.
  Reported rather than resolved: which one a reader should act on is a product call.
- **`--tl-nearblack` still duplicates `--btn-ink`** (`#1c130f`), and **`--tl-pink` duplicates
  `--pink`**. Same value, two owners, both unfixed.

---

## Gates

| | Baseline (`3f64bf89`) | After |
|---|---|---|
| `tsc` | 1 — `mastheadMatrix.measure.ts`, another session's | **1, unchanged** |
| `vite build` | exit 0, 0 diagnostics (whole output grepped) | **exit 0, 0 diagnostics** |
| `vitest` | 1 failed in 1 file — `datePickerHub` | **1 failed in 1 file — `datePickerHub`** |
| Suite | 7,365 passed / 3 skipped / 439 files | **7,365 passed / 3 skipped / 439 files** |
| Calendar measurement | 13 cases (`calSurface60`) | **17 green** — `calSurface60` 8 · `calFidelity60` 5 · `calFlags60` 4 |

`datePickerHub` and `mastheadMatrix` are other sessions' and are left alone. **Nothing introduced.**
One red *was* introduced mid-run — `calendarTokens`' Caveat clause — and is resolved above by
restating the claim rather than deleting it.

### Mutations proved red before anything was trusted

| | Mutation | Failure |
|---|---|---|
| A | numbers column re-tinted | *over's number column is filled* |
| A | today line back to `top: 0` | *the line starts −18px from the rail's top* |
| B | badge ring back to a 1px hairline | *the badge's ring is 1px on a 58px disc* |
| C | the passed estimate stops prompting | *an Urgent row says "Queried", which is not one of the app's moves* |
| D | future flag filled and solid | *Elinor Hale's flag is solid, not dotted* |
| D | a keyframe drops the base transform | *a frame reads "rotate(-1.5deg)" and drops the base transform* |
| E | passed-estimate rows lose their urgent flag | *Elinor Hale carries 0 urgent flags* |
| F | a second handwritten element | *the calendar sheet sets Caveat on: .tl-cap .w \| .tl-note* |
