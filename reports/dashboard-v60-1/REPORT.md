# Dashboard v60.1 — "Where do I start?", the eyebrow, plainer copy

Branch `dashboard-v60`, continued (not a new branch), from its tip `ce6e9848`. Step 0: `git log --oneline -8`
showed v60's commits and nothing of v60.1; the worktree was level with the tip and clean. Measured in this
worktree on its own `vite preview` (port 4861). Ref: `design-refs/dashboard-v60-1/dashboard-v60-1.html`
(SHA256 `cd8f8b1a…05bc05`, enrolled). Not merged.

## False premises

1. **"No tile description is cut at any of the Part E widths."** The ref itself cuts them. In its own 2×2 grid
   at 1440 and 1512 three of the four descriptions need a third line (the tile's text is 184px and 198px wide;
   the longest description needs about 235). At 1709 and 1920 they fit. So the tiles had to change shape to
   meet the rule, see deviation 2.
2. **The eyebrow's cause.** It was not reading anything wrong: it was the constant `"— NOW QUERYING —"`
   (`DASH_EYEBROW`), so every manuscript was announced as querying whatever its status. The sidebar reads the
   manuscript's status through `switcherStanding` in `BarSwitcher.tsx`.
3. **"Use the shell's `usePopover` if it fits."** It does not. Its outside press is hard-wired to the shell's
   `.lpop` class, it closes on any scroll, and it does not return focus. **"Use `PageGuide` if it can do the
   ring and the spotlight."** It cannot without contortion: it is a first-visit card that stores a per-page
   "seen" flag, which this pack forbids. Both the pop-up and the spotlight are page-local
   (`v60/WhereStart.tsx`), on the app's one escape stack at `ESC_LEVEL.page`.

## Deviations

1. **The eyebrow shows the status alone.** The sidebar adds "· N with you" after it; the eyebrow does not.
   A manuscript with no status shows an empty eyebrow line (it keeps its height).
2. **Tiles become full-width rows between 1401px and the point where the 2×2 grid gives 540px.** Each row is
   the icon, the title over its description, and the link; the mono status ("0 OF 3 ON FILE") is not drawn
   there, as it is not below 1400 in v60. At 1440 and 1512 every description then fits two lines. From 1709
   up the 2×2 tiles are unchanged. Below 1401, v60's one-line rows (no description) are unchanged.
3. **The spotlight's ring is drawn on the card itself** (`[data-spot="ring"]`, a box-shadow) and the
   "START HERE" tag sits inside the first target, 11px above its top edge and 28px from its right. The ref
   positions the tag on the page; this way it moves with the card.
4. **A press inside a ringed target that is not an action keeps the spotlight**; any press elsewhere, or on
   any button or link (including the ringed target's own action), clears it. Escape clears it too.
5. **The disc colour for the materials answer is the pale rust of the tiles' icon discs** (`#f3e3dc` with rust
   ink), the colour of the tiles it points at.

## What was built

- `lib/manuscriptStanding.ts` — `switcherStanding` moved out of `BarSwitcher.tsx` (re-exported there) so the
  dashboard can read the same function without importing shell chrome.
- `Dash58Header` takes `status` and `start`. The eyebrow is `dashEyebrow(status)`. Before the first query
  `start` replaces the three buttons.
- `v60/WhereStart.tsx` + `whereStart.css` — the button (50px white pill, rust "?" disc; navy ring and navy disc
  when open, `aria-haspopup="dialog"`, `aria-expanded`), the pop-up (portalled, 460px, 400px below 1400px of
  window; literals and `:root` tokens only), the spotlight context and the tag. Two pulses on the ring, none
  under reduced motion.
- `lib/dashFirstUse.ts` — `startAnswers(hasAgents)`, `START_TARGETS`, `spotOf(answer, target, hasAgents)`,
  unit-tested; the four tiles' copy.
- Copy, as written in the pack: the Queries card (both states, the "THE AGENT CARD OPENS FIRST" hint removed,
  the button's behaviour unchanged), the Agents card's empty title and line, the four tiles, the counter
  ("{d} OF 4 · OPTIONAL") and the sub-line with agents ("You could also:"). No em dash in any first-use copy.

## Locks

`tests/e2e/dashV601.measure.ts` at 1280×800, 1440×900, 1512×900, 1709×849 and 1920×1080; states A (day one),
B (agents, no queries), C (querying); the pop-up shut and open. Ledgers in `ledger/`.

| Lock | Red first | Green |
|---|---|---|
| S1 eyebrow = sidebar status | base `ce6e9848`: 15 of 15 states · `S1` (eyebrow set back to the constant): 15 | all states, all sizes |
| S2 pre-query header = one button; querying = three, no start button | base: 10 · `S2` (a Log button injected): 10 | |
| S3 each answer rings exactly its targets, dims the rest, founding panel never dims | base: no start button (4) · `S3` (panel dimmed): 12 | 2 sizes × 2 states × 3 answers |
| S4 Escape closes the pop-up first, focus returns, then clears; ✕ closes and returns focus | base: unreachable (no button) · `S4` (focus dropped after Escape): 12 | |
| S5 no em dash in cards, tiles, pop-up | base: 10 · `S5` (a dash in a tile): 16 | |
| S6 no tile description cut | base: 22 · `S6` (24px descriptions): 18 | |
| S7 nothing written, nothing stored | base: unreachable · `S7` (a choice that stores a key): 1 | no Firestore write request, no new local or session key |
| E fit, pop-up shut and open | base: 10 (no pop-up) · `S6` also reddens E (12) | one screen, nothing past the sheet, pop-up inside the sheet, nothing cut in it |

Unit: `dashFirstUse.test.ts` (answers → targets for both agent states, copy, no em dash).
Proofs: `redfirst-base-ce6e9848.txt` + `ledger-base-ce6e9848/`, `mutation-proofs.jsonl` (all seven red on
their own lock).

Older locks: DB58 H1 and DB60 P8 re-pointed to the new wording (`tests/e2e/RETIRED-dashboard-v60-1.md`).
On this build DB601, DB60, DB59 and DB58 pass except **DB58 F2 at 1280×680 and 1366×650** (the chart's
axis on a short window; pre-existing, the same 195 and 189 as v60's report). The first full run caught one
fault of this pass: the loading eyebrow was a plain space, which collapses, so the header grew 14px when the
data landed (DB59 L1, DB60 P10). It is a no-break space now. One DB59 L1 reading ("the hold is real") went
red once at 1280 and was green on a re-run of DB59 alone.
Unit: Vitest 599 files, 8,956 passed, 3 skipped.

## Shots

`shots/{A,B,C}-{size}.png` (closed), `…-open.png` (the pop-up open, A and B), `spot-{A,B}-{1512x900,1280x800}-{answer}.png`.

## Open items

- **The tiles' row shape at 1440 and 1512** is my answer to the ref cutting its own copy. If you would rather
  keep the 2×2 tiles there, the alternatives are shorter copy or a wider right column before the first query.
- **The eyebrow with no status** is an empty line. If it should say something (the ref drew "READY TO QUERY"),
  that needs a ruling on the words.
- Carried from v60: the three add actions have no outside door; a long manuscript title can push the header's
  buttons (now the one button) off the sheet.

## Branch and build

BRANCH-RESULT
