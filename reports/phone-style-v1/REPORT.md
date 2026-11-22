# Phone style v1 — report

The phone style sheet (`design-refs/phone-style-v1/phone-style-v1.html`, P1–P27) is now the rule for every phone screen below 768px. This pack adds its tokens and parts, rebuilds Today's Queries tab to `phone-today-v6.html`, adds the locks that hold it, and audits every other phone screen without changing it. Branch `phone-style-v1` (7c702af46 … this commit), cut from `consolidate-main-v2` (347dfa639). Dev only. Nothing is merged to main.

## False premises and corrections, first

1. **Phone catch-up v1 does not exist.** There is no branch, commit or report for it. Nick ruled (22 Nov) that this pack runs without it. The lead card's button takes To do's own `verbOf`, not Next up's words.
2. **Dev moved during the pack.** At Step 0, dev served `consolidate-main-v2`: `index-d3wy2buF.js`, matched by rebuilding it. By deploy time it served `origin/dev/main-material-icons-v1` at `e0ed0becd` (`index-CLHUY0SC.js`). That was matched by the commit the bundle names as its Sentry `release:"e0ed0becd"`: a rebuild from a tree without `.git` differs only in that string and the chunk names that follow from it. Per ruling 3, this pack is stacked on that branch rather than overwriting it.
3. **Gate 0.4 was red.** Thirteen readers of `--pa-page` were insets, fills or a pressed or selected state, not page backgrounds. Nick ruled (1a/1b):
   - The seal's ring, the page-fold corner and the two fades follow the page.
   - The thirteen readers keep `#f8f6f2` through the holding token `--pa-inset-legacy`.
4. **0.3b: Today had no lead card.** v5 moved it to To do, so Phase 3 adds one, not restyles one. Everything else in 0.3 held:
   - a. `--pa-page: #f8f6f2` at phoneTokens.css:12.
   - b. TodayV5, TodayHeaderV5, V5Tabs, BirdsBlockV5, V5Chrome, phoneV5.css.
   - c. QRowV4 leads with `Seal` (the initials) carrying a `V3Glyph` badge.
   - d. PA5-13: dock labels excepted, Birds-eye rows excepted.
   - e. `.pa4-cta` min-height 56; `.pa4-card` radius 24.
5. **The sheet against the brief.** Where they disagree, the sheet wins:
   - **Birds-eye rows** are the sheet's own 40 high, so PS1-5's 48 skips them, as PA5-13 already did.
   - **The filled button** is 48 high, 16/600 (`.ps-cta`), not `.pa4-cta`'s 56/17.
   - **The sheet's own part CSS** breaks its own P19/P20 in three places: inset-shadow hairlines and outlines, and 2/5/8px corners. The port uses borders and fully round ends instead (named in `phoneStyle.css`).
6. **The tiles.** The sheet says "the selected one is navy"; the brief says With you is the navy tile, and a selected filter keeps its existing treatment. The brief was followed: With you is always navy, and a selected tile's label goes ink and semibold, which was v5's selected treatment. This is Question 3a.
7. **Pressing.** A synthetic touch or mouse press did not raise `:active` in this emulation, even on Today's rows, whose pressed state is known. The audit forces `:active` through DevTools instead, with Today as the calibration (8 of 16 tappables show a pressed state there).
8. **PA5-15's first base capture of Letters** caught the other of the two ways the sidebar's book spine rasterises (285 pixels, ±1, x 19–60, y 734–896). A second base capture differs from the first by those same 285 pixels and equals the new build exactly. See the PA5-15 section.

## What had already landed

Nothing. No phone-style tokens, parts or locks existed on the served branch, so no phase was skipped.

## 0.5 — the phone's primitives: extend or new

| Part | Existing | Decision | Why |
|---|---|---|---|
| Card | `.pa4-card` (24, the v4 shadow) | **new** `ps-card` | Read by every v4/v5 screen; extending it restyles screens this pack only audits. |
| List row | `.pa4-tap`, `.pa4-ib2` (QRowV4) | **new** `ps-row` | QRowV4 is the full query list's row too. |
| Section heading | `.pa4-grp` / `.pa4-h` | **new** `ps-hdg` | Shared by Lately, To do and others. |
| Tile / count | `.pa5-be-sn` buttons | **new** `ps-tile` | `.pa5-be-sm/-sn` are reused by Today's Agents tab (AgentsTabV5). |
| Filled button | `.pa4-cta` (56) | **new** `ps-cta` (48) | Every phone journey's button. |
| Text link | `.pa4-link` | **new** `ps-link`, `ps-tlink` | Shared. |
| Chip | `.pa4-chip` (48 target, white) | **new** `ps-chip` | The sheet's chip is 28 on the warm fill; the list's chips are filters. |
| Need pill | `.pa5-need` (Today only) | **extended**: markup `ps-need` inside the existing 48 button | Only Today renders it. |
| Status disc | `PhoneDisc` / `V3Glyph` | **extended**: `PsDisc` = `PhoneDisc` at 40 | The existing StatusDot on its stage band; no new drawing. |
| Slim header | `.pa5-mini` | **extended, scoped** `[data-pin="today"]` | Shared by every root page. |
| Tabs | `.pa5-tabs` | **extended, scoped** `[data-page="today"]` | Shared with Materials. |
| Birds-eye row | `.pa5-be-row` (Today only) | **extended** | Only BirdsBlockV5 renders it; the track still starts 116 in. |
| Snackbar | v3/v4 toasts | **new** `ps-snack` (part only) | No screen changed in this pack uses one. |
| Sheet | `.pa4-sheet`, `.pa-sheet` | **token only** (`--ps-r-sheet`, `--ps-sh-raised`) | No sheet is rebuilt here. |
| Loading shapes | none on Today | **new** `ps-skel` | — |

## Today: before and after

After, at 390 × 844 (the same states at 360 × 740 sit beside them in `shots/`):
- `shots/today-390x844-top.png`
- `…-scrolled.png`
- `…-offer.png` (the lead card is the harness's offer, Tom Ellery, "Decide")
- `…-ordinary.png` (Jonathan Marsh, full requested, "Send")
- `…-one-query.png`

Before, on the base build: `before/shots/today-390x844-top.png`. On the base build, "scrolled" is the same picture as top (the base has none of the new markers to scroll to). Its offer, ordinary and one-query states don't exist: the review aid that makes them is new.

PS1 on Today, per state:

| | PS1-1 | PS1-2 | PS1-3 | PS1-4 | PS1-10 | total |
|---|--:|--:|--:|--:|--:|--:|
| before (base) | 4 | 57 | 1 | 1 | 32 | 95 |
| after | 0 | 0 | 0 | 0 | 0 | **0** |

## The locks

| Lock | Where | Green reading | Mutation → red |
|---|---|---|---|
| Phase 1 tokens (source) | `src/components/phone/phoneStyleTokens.test.ts` | 6 passed: 38 `--ps-*` tokens against the ref's own block; `--pa-page` is the desktop's oat; exactly 13 `--pa-inset-legacy` readers; no old page colour left | `--ps-rule` and `--pa-page` mutated → 2 failed |
| PS2 parts (measured, `#/ps-lab`, 390 × 844) | `tests/e2e/phoneStyle.measure.ts` lab | 73 checks against probes styled with the tokens in the page (74 with the Birds-eye row's 16 inset, fixed after the first deploy) | `lab-radius` (`.ps-card` 12) → exactly "a card: radius 16" |
| PS1 Today, hard gate (390 × 844, 360 × 740; top, scrolled, offer, ordinary, one-query) | measure file, `today` | 110 checks, 0 red | ps-size → PS1-1 ×10; ps-gutter → PS1-4 ×10; ps-target → PS1-5 ×10; ps-loose → PS1-10 ×8 (and PS1-6 ×8: the moved row's grey is then on the page) |
| PSL lead card | measure file, `lead` | 11 checks: the button reads To do's words for the same task (as built: "Decide"), both open PhoneTaskScreen at the same task, and with no task there is no card | `lead-verb` → exactly the two words checks |
| PSR rulings 1a and 1b | measure file, `audit` | 1a: the task screen's fade and every seal ring on the page equal the page. 1b: the gaps sheet's inset and the pressed Settings row are pixel-identical inside themselves (clear of 24px corners) at either page colour, and all 13 keep `#f8f6f2` by their class chain | — |
| PA5-4, re-pointed at the tiles | `tests/e2e/phoneAppV5.measure.ts` | the counts are the three tiles, With you the navy one; filters as before | `nofilter` → 4 PA5-4 checks, 0 others |
| PA5-13, widened (4b) | same | "text ≥ 14 except elements marked `data-ps-cap`" | — |
| PA5-1…14 | same, `--project=pixel` | 8 tests passed (9.4 min) | — |
| PA5-15, the desktop | same, `--project=measure` | the second base capture against new: DOM and pixels identical on Dashboard, Queries, Agents, Letters, Packages and the calendar | — (see False premise 8 for the first capture) |
| The census ratchet (4c, CI) | `src/lib/phoneStyle.census.test.ts` + `phoneStyle.baseline.json` | 4 passed; `phoneStyle.css` held at 0 | a 15px font-size in phoneV5.css → "font 19 → 20" |

**0.6, PA5 on the served branch before any edit:** not run. I ran the baseline unit gates before editing, but not the PA5 e2e locks. Their first run came after Phase 3 and was green.

## The census baseline (Phase 4c)

78 phone stylesheets, **1,001 breaches**:

| Kind | Count |
|---|--:|
| font | 413 |
| hex | 210 |
| `--pa-inset-legacy` readers | 13 |
| radius | 177 |
| shadow | 188 |

The largest files:

| File | Breaches |
|---|--:|
| queriesPhone.css | 159 |
| packagesPhone.css | 95 |
| pagesPhone.css | 83 |
| phoneV5.css | 72 |
| todoPhoneV1.css | 66 |

## The audit, headline (Phase 5; full: `audit.md`, `review.html`)

Every one of 28 screens was reached, plus Today's Queries tab as the calibration (0). Breaches across the audited screens:

| Rule | Breaches |
|---|--:|
| PS1-1 sizes | 196 |
| PS1-2 weights | 233 |
| PS1-3 page and cards | 70 |
| PS1-4 gutter | 53 |
| PS1-5 targets | 177 |
| PS1-6 grey on the page | 210 |
| PS1-7 coloured cards | 0 |
| PS1-8 filled buttons | 0 |
| PS1-9 dashes | 1 |
| PS1-10 loose rows | 114 |

The heaviest screens:

| Screen | Breaches | Mostly |
|---|--:|---|
| The full query list | 425 | names at 700, grey on the oat, 88 loose rows |
| The phone landing | 125 | |
| Pricing | 107 | |
| To do | 105 | 98 rows at 60 high |
| The full Birds-eye view | 63 | |

Other findings:
- **Pressed states:** v4/v5 declare no `:active` rules at all, so outside Today nearly nothing shows one. Settings is the exception: 6 of 8.
- **Loads:** no spinner anywhere. To do's reload jumps (layout shift 1.2); the query list's jumps 0.44.
- **Icons:** 351 of the phone's icons are 24 × 24 with a 1.7 line, not the sheet's 1.8.
- **Seal ring and fold corner:** no seal ring was found sitting on a white card. The page-fold corner did not appear on a crawled screen.
- **Not measured:** saves without a snackbar, beyond the two that existing locks already save and undo (both show the snackbar).

The proposed roll-out order, sizes and visible changes are in `audit.md` / `review.html`.

## Gates against baseline (`set -o pipefail`, counts read)

| Gate | Baseline (before any edit) | Final |
|---|---|---|
| tsc | clean | clean |
| functions tsc | clean | clean |
| build:dev | clean | clean |
| Vitest | 5 failed / 13,128 passed (3 files) | 4 failed / 13,139 passed (2 files) |

The final Vitest failures are all baseline failures: events.test ×2 and firestoreTarget.test ×2. The baseline's fifth, marketingLinks (an 18 s timeout), passed. No new red.

## Dev

- **Stacked:** `dev/main-material-icons-v1-pst1` = `phone-style-v1` merged onto `origin/dev/main-material-icons-v1` (`e0ed0becd`). The one conflict was `design-refs/.refhashes.json`: the served branch's list with this pack's two refs enrolled again.
- **Checked on the merged tree:** tsc clean; phone, census and shell specs 634 passed; PS1 Today and PSL green.
- **Deployed:** from a clean checkout of the pushed tip, guarded on dev still serving `index-CLHUY0SC.js`. Served afterwards = built: see the final commit for the bundle after the Birds-eye inset fix.

## Worktrees

- **Removed** at the start, both clean and pushed: the scratchpad `deploy2` checkout (detached, on `origin/main`) and `ScriptAlly-acv21b` (`agent-card-v2-1`).
- **Left alone:**
  - `ScriptAlly-live`: the prod folder.
  - `ScriptAlly-cfin` and `ScriptAlly-mi1`: live sessions with unpushed commits (mi1 has since gone).
  - `ScriptAlly-rsp6`: uncommitted edits.
  - `ScriptAlly-tdf`: unpushed.
- **This pack's own:** `ScriptAlly-pst1` and the scratchpad deploy checkout are removed at the end of the session (see the wrap-up).

## Questions for Nick

1. **PA5-13 was widened** to allow 12px on elements marked `data-ps-cap`: the dock's labels and badge, chart axis labels (Today's months, the Birds-eye months and the Today pill), and a numeral's unit (the lead card's "weeks"). Keep it, or raise those to 14?
2. **The roll-out order** from the audit (`audit.md`): finish Today (Agents and Activity), then To do, the query list, one query, the Birds-eye view, the task screen, Materials, the sheets, Profile and Settings, set-up, and last the public pages. Agree, or reorder?
3. **Values the sheet did not give, which Today needed:**
   - a. A selected filter when With you is always the navy tile. Done here: the label goes ink and semibold.
   - b. The Today point's soft ring, drawn as a 7px outline in blush at .22 (from the ref's svg: r 13 behind r 6).
   - c. The pattern's lower strength, done as the same artwork under a 50% navy veil (.07 → .035), since the artwork itself is not to be touched.
   - d. The lead card when the time since is under a day: no numeral, unit "today".
   - e. The headline's colour: the ref's `#1c130f` (the marks' ink) or the sheet's ink `#1f2633`. Ink was used.
4. **The lead card repeats To do.** On the harness it is To do's own first card, with the same headline ("Answer Tom's offer") and button. It says "Decide", where the query page's own button for the same moment says "Record your answer": two words for one act, which Phone catch-up v1 will meet when it changes `verbOf`.
5. **The public pages:** should the phone landing and pricing follow the app's phone sheet at all? They are a different tier, and the census counts marketing.css's phone rules today.
6. **The icon set** is drawn at a 1.7 line; the sheet says 1.8. Change the set, or the sheet?
