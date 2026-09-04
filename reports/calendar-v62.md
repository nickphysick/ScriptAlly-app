# Calendar v62 — the scheme, the rail, the dividers

## Phase 0 — **PASS.** `design-refs/timeline-v62.html`, title `ScriptAlly — Calendar v62 · design of
record`, sha256 `a8233d4ecd9c43d6f3480dee3a5432a83e8d1502d82459006953da527020ee2c` (the pack's
`a8233d4ecd9c…`). Enrolled; 19 refs guarded. Body attributes match the pack exactly.

## Phase 0.5 — worktree at `/tmp/sa-v62`, preview on 4196; deployed from a clean worktree at HEAD.

---

## 1 · Colour scheme — **built, and it is one token set.**

Nineteen `--tl-cs-*` tokens on `.tl-board`: ground, rail, frame line, month line, card face, card
border, closed face, shadow (rest and hover), numerals, past-stage outline, chip face and border,
flag face and border, trail track, today. **Every element reads them; nothing paints its own
colour.** Greige only — cream, linen and sage are rejected alternatives and are not built.

⚠️ **The shadows are tinted to the ground, and that is the point of the set rather than a detail.**
Every earlier version of this board used `rgba(58,28,20,…)` — a warm brown, correct on cream and
reading as dirt on a cool greige, which is the same law this repo already records for the sage desk.
The lock asserts the *relationship* — a shadow's red channel within 14 of its blue — rather than the
greige literals, so a legitimate retone passes and a warm-on-cool one does not.

**One ground below the rail**, asserted as an identity: the container's interior, the rows area and
the divider label are the same computed colour, and the lanes, groups and wrap paint nothing at all.
v61 had the container white, the rows transparent and the sections tinted — three surfaces where the
design has one.

## 2 · Rail edge to edge — **built.** The board takes no side padding; the rail's box matches the
container's interior within 1.5px. ⚠️ **And the seam lock was re-run against it**: moving the rail's
box could have re-opened the 91px fault v60d found, so the lane-equality claim is asserted again
after the change, not assumed to have survived it.

## 3 · Date row — **built.** Two tiers in a 54px rail: mono month caps at their boundaries with a
light separator, plain day numerals beneath, today a filled rose circle with a reversed numeral —
**the only colour on the rail**. No tiles, no ticks, no today cap, and no month line below the rail:
the separator is a `border-left` on the label, so it exists in the rail and *cannot* run down through
the rows, which is what a line drawn as its own element would do.

## 4 · Badges at half size — **built.** 20px at the card's left, text at 44px, past-stage dots 16px,
and the white ring dropped: at 40 it lifted a pale disc off a white card; at 20 a 2px halo is a
second edge on a 20px object. `StatusDot`'s default variant throughout.

## 5 · Group dividers — **built.** Playfair 16px in the ink token, icon in the same ink, count muted,
and **no fill** — the label's background is the ground. ⚠️ That is also what draws the hairline
*"from the label to the right edge"*: the rule runs the full width beneath and the opaque label masks
the part behind itself. One element, two jobs, and no second rule to keep in step with the label's
width.

---

## ⚠️ Three faults of my own, and the third is the instructive one

1. **I built the scheme as a block declared last, and it added ~20 duplicate rules.** "Declared last
   so the scheme wins" is `!important` by another name, and it broke this file's own one-rule-per-
   selector invariant wholesale. `calendarTokens` caught exactly one of them — `.tl-todayline`
   declared twice, *"a lock cannot know which wins"* — which is the whole reason that invariant
   exists. Every read is folded into the rule that already owns its element now: one declaration per
   selector **and** one source of colour, which is strictly better than what I first wrote.
2. **The card's shadow stayed warm after the fold**, because the frame reads `--tl-frame-sh` and I
   had deleted the rule pointing it at the scheme. Repointed the *token*, not added a rule — one
   owner for the frame's shadow, which v61 fought to establish.
3. **⚠️ Rewriting `.tl-dt` and `.tl-mlab` wholesale dropped `position: absolute`.** The rail
   collapsed: the month caps bunched at the top-left and the day numerals ran *down the board's left
   edge as a column*, with the today circle floating beside row 02. That is the cost of the "delete
   every rule for a selector and write one authoritative block" practice this repo endorses — it is
   the right shape, and it requires knowing **every** declaration the original carried, positioning
   included. The screenshot caught it; no lock did, because every one of them measures a rail that
   exists.

---

## Still open

Edge tags against a seeded fixture, and the sweep — both carried from v61, both unbuilt.

## Gates

| | Baseline (`0d626374`) | After |
|---|---|---|
| `tsc` | 0 | **0** |
| `vite build` | exit 0, 0 diagnostics | **exit 0, 0 diagnostics** |
| `vitest` | 1 failed — `datePickerHub` | **1 failed — `datePickerHub`**, 439 files, 7,375 tests |
| Calendar measurement | 9 (`calOne61`) | **13** — `calOne61` 9 (three retargeted) · `calScheme62` 4 |

Two suites went red from the v62 changes and both were correct: `calendarTokens` found the duplicate
rule, and `todoPageSmoke` named the retired tile rail. Three `calOne61` cases went red for claims v62
supersedes — the container's white ground, the six tinted divider tones, and the tile rail — each
replaced with what v62 states rather than loosened.

### Mutations proved red

| | Mutation | Failure |
|---|---|---|
| N | a second ground, and a warm shadow on a cool one | *the rows area is not the container's ground* |
| O | the tinted pill returns; the rail is inset again | *the divider label is not on the ground* · *the rail is inset from the container's left* · *a divider label still carries a tint* |
