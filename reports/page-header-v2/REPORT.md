# Page header v2 — run report (27 Sep)

**Deployed to dev:** commit `97c04144`, bundle `index-B8P3fcVV.js`, built from a clean detached worktree of the pushed tip and confirmed as the served bundle. **Measured against the deployed build:** `pageHeaderV2.measure.ts` + `shellV3.measure.ts`, **26/26**.

Ref: `design-refs/page-header/contact-list-header-v5.html`. Where the mock and the brief's text disagree, the mock wins; each case is named below.

## False premises, first

1. **The mock's bar colour is not the sidebar's.** The mock draws `#ebe6de`; the app's sidebar is `#e7e3dc`. Per ruling 1 the bar reads the sidebar's token (`--shell-side`), and the lock asserts that the two computed backgrounds are equal.
2. **The hawk cannot be exported at 2× from the named source.** `hero-archivist.png` holds about 1.25× the drawn size: the crop is 389×344 and the header draws it 276 tall. The export is native and never upscaled. A 2× export needs the illustrator's original; `scripts/crop-contact-hawk.mjs` re-runs against it with a new crop box. The original PNG stays because the script reads it.
3. **The brief's header heights (267/261) came from v1's eyebrow gap.** The v5 ref puts the title at eyebrow + 24; v1 used + 22. Both full headers now measure the rendered ref's height ±2: Contact list 271.4 against 271.7; Query Centre 272.4.
4. **My first explanation of that 2.3px gap was wrong.** I attributed it to the intro's Special Elite run. Measured, the intro's line boxes are identical to the ref's (54.73 in both); the whole gap was the eyebrow margin.
5. **Tool spacing and menu rows follow the mock** (ruled). Tools are 4px apart and groups 12px. Menu rows state only what the record has, so there is no "0 words".
6. **The Query Centre's title rendered in Playfair from v1 until Phase 3.** `brand.tsx` forces headings with `!important`. The fix is `.ph .ph-title` with `!important`.
7. **The Query Centre's intro rendered the manuscript name in Playfair.** `.qcv-line .qcv-line-ms` has had no `.qcv-line` ancestor since v1. It now uses the shared `.ph-ms`. The other `.qcv-head`/`.qcv-line` rules are orphans and are flagged for a sweep.
8. **The Contact list did not follow a manuscript switch.** Its scope was memoised on `manuscripts` alone. It now keys on the location key, and the switcher lock on `/agents` covers it.
9. **A census lock was vacuous for the Query Centre since v1.** "Opted-out pages mount no PageHeader" passed only because the Query Centre's PageHeader lives in a different file. It is retired; `masthead={null}` carries the real claim.

## What landed

| Phase | Commit | What |
|---|---|---|
| 2 | `4ff10499` | One app-wide bar in the sidebar's colour: page name with its section eyebrow, the manuscript switcher moved from the sidebar card (card and arrows deleted), ghost tools. |
| 3 | `25cb2cad` | Query Centre: the full header spans the column with a centred 920 hero frame, and the Birds-eye rail starts at the rule + 24. |
| 4 | `190a7b7d` | Contact list: the shared full header, `+ Add an agent` quick-add card, `Paste a link`, the hawk-only art, and the counts and Housekeeping below the rule. The v11 hero, `heroLayout` and `place()` are retired, along with 24 CSS rules. |
| 5 | `97c04144` | The screenshot sweep (34 images) and the CLAUDE.md section. |

## Locks and mutations

The new cases are in `tests/e2e/pageHeaderV2.measure.ts`: the bar on 15 routes × 3 widths (§1), the switcher (§4.5), each full header × 3 widths (§2/§4), the two headers' tops being equal (§4.4), and the quick-add card (§4.6). Each was proved red by a mutation in the measurement worktree:

| Mutation | Went red |
|---|---|
| The card back in the sidebar; the bar on the page colour; the bar inside the scroller; `barPageName` eyebrow null (P2) | §1 |
| The hero frame `max-width: none` | §4.3 frame |
| The rail in row 1 (both pages) | §4.2 rail ×2 |
| The Contact group's 16px top padding back | §4.4 × 3 widths |
| The quick-add card 30px down | §4.6 position |
| The card's own `z-index` removed | §4.6 painted-over, plus both click-throughs |
| The scope memo without the location key | §4.5 page follows the switch |

Two mutations stayed green and each changed something:

- **A `z-index` on `.ph-acts` does nothing.** The card's own `z-index: 30` is what puts it over the count cards, so the row's `z-index` was removed and only its `position` remains, as the anchor.
- **The painted-over check sampled one point**, the card's centre, which falls below the count cards. It now samples a 5×5 grid across the card.

Locks retired or retargeted (details in the P3/P4 commit messages):

- **Unit:** `pageHeaderDefault` (frozen strings, updated deliberately), `mastheadFormat` (art anchor through `--ph-pad-y`), `pageHeader` (padding token), `qcRail` (regex no longer matches `margin-top`), `contactList` (heroLayout × 5), `workspacePageGrid` (census line).
- **e2e:** `contactV11` (three hero cases retired; one restated; four add-card doors re-pointed; one outside-press target swapped; the phase-1 column top retargeted) and `shellV3` L13 (tightened to equality).

## Gates

- **tsc:** 0.
- **Vitest:** 8,282 passed, 3 skipped (8,285). This is 5 fewer than baseline: the retired heroLayout cases.
- **Production build:** clean.
- **Design refs:** 85 guarded, unchanged.

## Pictures

`reports/page-header-v2/shots/` holds:

- every bar route at 1280 and 1440, Dashboard included;
- the ref at both widths, beside `agents-*` and `queries-*`;
- `switcher-open-1440.png`;
- `quickadd-open-1440.png`.

## Standing

- The orphaned `.qcv-head`/`.qcv-line` rules in `qcvPage.css`.
- The hawk at 2× needs the illustrator's original.
- The count cards are moved but not restyled: 54px, where the mock draws 80px.
