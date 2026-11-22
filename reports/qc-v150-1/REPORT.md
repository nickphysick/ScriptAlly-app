# Query Centre v150.1: At a glance, one width, typewriter bar, Birds-eye hover actions, full screen

Branch `query-centre-v150-1`, built on top of v150: dev served `dev/pk26-pvm-qc150` (`index-D8CuUQO2.js`, v150's own
deploy), so **case 1 applied** (v150 already built; this sits on it). Refs in `design-refs/query-centre-v150-1/`, all
14 hashes as given.

## False premises

1. **"Remove the 'Birds-eye view' button" from the header card (§2).** There is none to remove: v150 A2 shipped the
   header with only "+ Log a query" and "Record a response". The mock's header still carries a third button, hidden
   by its own freeze layer. §2 needed no change and has no commit.
2. **"W is 984px at 1280 × 800."** That assumes a 1032px sheet. This shell's sheet is 1024 at 1280, so W is 976. The
   formula min(S − 48, 1200) holds: 1200 at 1512, 976 at 1280. L1 asserts the formula.
3. **"The faces row as v150 B2" beside a 40px count, in a quarter-width card.** At 1280 a card is about 235px wide.
   Six discs and "+N" beside a two-digit count don't fit (the mock has the same overflow and hides discs with
   `nth-child`, which leaves its "+N" wrong). The discs shown are cut to the card's measured room, and "+N" grows to
   match, so shown + N is always the count.
4. **"Birds-eye pills keep their text labels at every width" while the list's Filters and Full screen are
   icon-only at 1280** (v149's step, which v150.1 doesn't mention and the 1280 ref still draws). Kept as drawn: list
   pills step down; Birds-eye pills don't.

## Commits (on `query-centre-v150-1`)

| Section | Commit | |
|---|---|---|
| §1 one width | f36b4e3b | W = min(S − 48, 1200) for the header, At a glance, Your queries and the list; refs enrolled |
| §2 header | — | nothing to change (premise 1) |
| §3 At a glance | 9917fd55 | heading, four equal cards, count beside faces; detail lines, "Next" and "Show them" gone |
| §4 Your queries | 1c216c02 | heading + count line left, switch right; QcViewSwitch150 extracted |
| §5 navy bar | de92c119 | one order in both views, Special Elite throughout, the two-box group icon |
| §6 hover actions | 4ff316bc | actions column removed; the action fades in on hover, focus or selection |
| §7 full screen | ec89d1a2 | compact switch first in the full-screen toolbar; Birds-eye keeps its centre date and zoom |
| Locks + report | (this commit) | QC1501 L1–L7, the L8 re-points, a 2px gap fix L5 found, the screens, this report |

**Measured:** cards 103px tall at 1512 and 95px at 1280 (the brief's ≈103 / ≈95); Birds-eye's axis ends 16px from
the card's edge; in full screen the date row pins flush under the toolbar (249.75 / 249.75 at 1512).

**One fix came out of the locks:** L5 found Birds-eye's pill pair 2px off the list's (an 8px gap against the bar's
10px). The gap is now the bar's; it is in the locks commit.

**One slip on the record:** the §7 commit ran after a Vitest exit of 1, chained with `;` rather than `&&`. The exit
was the known reporter RPC timeout (`Timeout calling "onTaskUpdate"`, 10,452 passed, none failed), so the commit is
sound, but the gate wasn't what stopped it.

## Locks (`tests/e2e/qc1501.measure.ts`, 1280 × 800 and 1512 × 900)

All 14 cases are green on v150.1. All 14 were red against the v150 build (`QC1501_BASE=1`, read off dev while it
served exactly v150; ledgers `reports/qc-v150-1/ledger/base-*`). Each was then red on its named mutation:

| Lock | Mutation | Red at |
|---|---|---|
| L1 one width | v150 C1's list width | "list width 984 vs 976" / "1216 vs 1200", edges |
| L2 glance | the subheading restored | "no subheading" |
| L3 cards | Your move at 1.7fr | "equal widths 421, 247.7, …" |
| L4 bar type | the serif back on Filters | 1512: "“Filters” Georgia". **1280 stays green**: Filters is icon-only there, so a serif label has no word to show in (red at 1280 against the v150 build) |
| L5 bar order | Birds-eye's pills before Filters | "order (birds)", "sort/group/Filters left" |
| L6 hover actions | the buttons always on | "hidden at rest: 71 of 71 shown" |
| L7 full screen | the switch left under the title | "the switch in the toolbar", "still Birds-eye" |

L4's population floor is three words at 1280 (the input and the two pills), because Filters and Full screen are icons.

### L8: no regression

| Suite | Result | Re-pointed |
|---|---|---|
| QC150 L1–L12 | 24/24 green | L2: discs ≤ cap and shown + N = count (§3). L4: list, header and cards all W (§1). L5: "Your queries"; the switch at the list's right, bottom-aligned with the count line (§4). |
| QC149 | green (L2–L4 skipped as before) | none |
| QC1491 | green | none |
| QC1492 | green | L1 and L2 to W = min(S − 48, 1200); L2's mutation now narrows the header by 64px (the old one, header = list, is a no-op when both are W) |
| QC142 L8, CSS1-L9, QC149-L0 @1280 | red | none; **red before v150 too**. The landing page is untouched |

Unit gates per section: tsc clean, production build clean, Vitest 663 files / 10,452 tests passed.

## Screens

Ours in `reports/qc-v150-1/shots/`, refs in `design-refs/query-centre-v150-1/screens/`:

| Screen | 1280 | 1512 |
|---|---|---|
| 01 top | [ours](shots/01-top-1280.png) · [ref](../../design-refs/query-centre-v150-1/screens/01-top-1280.png) | [ours](shots/01-top-1512.png) · [ref](../../design-refs/query-centre-v150-1/screens/01-top-1512.png) |
| 02 list | [ours](shots/02-list-1280.png) · [ref](../../design-refs/query-centre-v150-1/screens/02-list-1280.png) | [ours](shots/02-list-1512.png) · [ref](../../design-refs/query-centre-v150-1/screens/02-list-1512.png) |
| 03 Birds-eye hover | [ours](shots/03-birdseye-hover-1280.png) · [ref](../../design-refs/query-centre-v150-1/screens/03-birdseye-hover-1280.png) | [ours](shots/03-birdseye-hover-1512.png) · [ref](../../design-refs/query-centre-v150-1/screens/03-birdseye-hover-1512.png) |
| 04 group menu | [ours](shots/04-birdseye-group-menu-1280.png) · [ref](../../design-refs/query-centre-v150-1/screens/04-birdseye-group-menu-1280.png) | [ours](shots/04-birdseye-group-menu-1512.png) · [ref](../../design-refs/query-centre-v150-1/screens/04-birdseye-group-menu-1512.png) |
| 05 full screen, list | [ours](shots/05-full-list-1280.png) · [ref](../../design-refs/query-centre-v150-1/screens/05-full-list-1280.png) | [ours](shots/05-full-list-1512.png) · [ref](../../design-refs/query-centre-v150-1/screens/05-full-list-1512.png) |
| 06 full screen, Birds-eye | [ours](shots/06-full-birdseye-1280.png) · [ref](../../design-refs/query-centre-v150-1/screens/06-full-birdseye-1280.png) | [ours](shots/06-full-birdseye-1512.png) · [ref](../../design-refs/query-centre-v150-1/screens/06-full-birdseye-1512.png) |

The data is the harness account's (88 queries, several books, 26 Oct), not the mock's.

## Dev

- Dev served `dev/pk26-pvm-qc150` (`index-D8CuUQO2.js`, v150) throughout, and this branch fast-forwards from it, so the
  integration branch **`dev/pk26-pvm-qc1501`** is this branch's tip (6dc96dd9 at deploy). The gates and locks above
  ran on that tree.
- Deployed to dev (hosting only) from a clean checkout of the pushed tip, with the served hash checked in the same
  command: **dev serves `index-DGKZrxAU.js`**. QC1501 L1, L3, L5 and L7 re-run against the deployed site: green.
- Not merged to main. Prod not touched.

## Left undone, and why

- **v150's stat-card fields `next` and `detail`** are still computed by `lib/qc150 statCards` and no longer drawn.
  Left in place because the unit suite covers them and removing them is clean-up, not part of this brief.
- **The Filters menu's own text** (the large filter panel) keeps its faces: §5 names "the pill menus' items and
  titles", which reads as the group and sort menus. They are now Special Elite; the Filters panel is unchanged.
