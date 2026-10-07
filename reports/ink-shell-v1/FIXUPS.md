# Ink shell v1 — fix-ups and follow-up items 1–2 (7 Oct)

Same worktree (`../ScriptAlly-ink`, detached at `main` 46573d0a plus this pass). **Nothing pushed,
nothing deployed by this report** (a dev deploy of the fix-ups was made on request; prod is Nick's).

Commits: `e1f1f83e` (the fix-ups, INK3 fractional, HC1–HC7) · `9452cccb` (item 1: the e2e suite green).

## False premises (first)

1. **The empty state is not a band.** The brief describes making the Query Centre's empty header a
   card as well. `QcEmpty` renders the open, light header, not the band. Ruled: *leave it light*. It
   now shares the card's column edges and its 20px top gap (HC5), and nothing more.
2. **The gap below the card is 40, not 48.** The brief quotes 48 to the stat strip; the page has always
   rendered 40, from the strip's own margin. Kept at 40 — the brief asked for the card, not a new rhythm.
3. **HC1 was already true.** The band's edges already equalled the stat strip's at every width
   (1280/1440/1710) before the change. The lock is still worth having: its mutation (bleeding the card
   60px left) goes red.
4. **INK3's mutation cannot be seen at whole-pixel layouts** — not a new finding, but item 2 makes it
   precise: the sheet's top lands on a whole device pixel at deviceScaleFactor 1, 1.25 and 3, so removing
   the 1px overlap draws no seam there. Only fractional layouts (browser zoom 90% and 110%) expose it.

## Step 0

✓ level with the previous tip · ✓ the fix-ups pack's reference is the ink ref already enrolled ·
✓ the HC numbers before the change (below) · ✓ the folded feedback button rendered the follow-up's
filled pill, which this brief reverses.

## The Query Centre header card

| | before | after (1280 · 1440 · 1710) |
|---|---|---|
| top gap, sheet top → card | 0 | **20 · 20 · 20** |
| card edges vs stat strip | equal | equal (288.95/1231.05 · 294.08/1385.92 · 347/1603) |
| bottom gap → strip | 40 | 40 |
| radius | 0 (full-bleed band) | 18 |
| card height | 557 · 564 · 337 (the band stacked its disc under the text below ~1700) | **337 at every width** — the disc stays right of the text |
| empty state top gap | 18 | 20 |

Shots: `fixups/before/` and `fixups/after/` — `qc-1440-t-capp.png`, `-t-bold.png`, `-t-edn.png`,
`qc-1440-empty.png`.

## Help and the folded feedback button

- **Help**: a 34×34 ringed circle (inset 1px ring at cream 16%), an 18px gap and an 18px rule to its
  left, tooltip "Help and shortcuts"; hover fills 8% and brightens the ring. Crops beside the
  reference: `fixups/after/help-crop.png` / `help-crop-ref.png`.
- **Folded feedback** (below 920px): the reference's outlined `.fbb` again — transparent, an inset
  1.5px terracotta ring, cream text, terracotta icon. Crops: `feedback-folded-crop.png` /
  `feedback-folded-crop-ref.png`. INK13 asserts it at 900 and 800.

## Locks — HC1–HC7 (`tests/e2e/inkFixups.measure.ts`), red first

| Lock | Mutation | Verdict |
|---|---|---|
| HC1 edges = the strip's | card bleeds 60px | red — left 228.95 vs 288.95 |
| HC2 20px top gap | gap removed | red — top gap 0 |
| HC3 radius 18, read off the pixel | square corners | red — corner pixel is the band's colour |
| HC4 the disc is right of the text | disc moved under the text | red |
| HC5 empty state on the same column and gap | DOM moved outside | red — top gap 18 |
| HC6 Help is a ringed circle with its rule | ring removed · rule removed | red · red |
| HC7 the folded button is outlined | filled | red — "no fill" expected, got fill |
| INK13 (amended) | filled | red |

All in `mutation-proofs.jsonl`. Final runs: HC1–HC7 green, `inkShell.measure.ts` 20/20 green.

## Item 2 — INK3 at fractional scales

| Scale | Sheet top in device px | Overlap removed |
|---|---|---|
| zoom 90% (dsf 0.9, viewport ÷ 0.9) | 57.6 | **red** — a seam, rgb(189,190,192), across the tab's foot |
| zoom 110% (dsf 1.1, viewport ÷ 1.1) | 70.4 | **red** — the same seam |
| deviceScaleFactor 1.25 | 80.0 (whole) | green — no seam can form |
| deviceScaleFactor 3 | 192 (whole) | green — as above |

So the overlap is proved: it is what stops a seam at fractional zoom. Browser zoom is emulated as
deviceScaleFactor × viewport ÷ zoom, which is what Chromium's page zoom does to layout.

## Item 1 — the e2e suite on the ink build

Census of 57 specs, then every red re-run against a build of `main`: **46 caused, 78 already red on
`main`, 6 not comparable.** All 46 are now green, re-pointed or retired with a named replacement.
Three were genuine regressions and were fixed in the product (the 768px drawer inset, reduced motion
on the portalled switcher menu, and the peeked card not following the inset drawer). The full list,
each change, and the 78 pre-existing reds: `tests/e2e/RETIRED-ink-shell-v1.md`.

## Other full-bleed headers (reported, not changed)

The Query Centre's band is now a card. Three other surfaces still run edge to edge across the sheet:

- **Analytics** — `QueryAnalytics.tsx:117`, `PageHeader band bandFixed`.
- **Contact list** — `AgentList.tsx:906`, `PageHeader band`.
- **`AppFooter`** — its light band paints a 100vmax shadow to reach both edges.

Turning those into cards is one `card` prop each on the first two; Nick's call.
