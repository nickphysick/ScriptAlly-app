# Contact list header v2 — report

Branch `contact-list-header-v2`, cut from the dev line `dev/…-clp2-pa5-prv11` at `467a0ccbc`. A dev-mode build of that commit reproduced the served bundle `index-DHQJyaQy.js` byte for byte, so the base is exactly what dev was serving. Ref: `design-refs/contact-list-header-v2.html`, SHA256 `9b895264…dac749e`, which matched. It is committed, and enrolled in `.refhashes.json`.

## False premises (read first)

1. **(n=1, q=0) is day one, not "1 agent on file / 1 not yet queried".** `isDayOne` claims 1–3 agents with none queried, and day one was to stay unchanged. So clHeadline(1,0) still returns day one's sentence ("1 agent so far. Not queried yet."). The lock asserts that. The singular "1 not yet queried" appears only past day one, e.g. (4,3). The (1,1) → "Already queried" case holds as specified.
2. **The green ring tone does not reach this header, but it does reach Housekeeping.** Since principles v2, List health on the light ground draws `BRAND_RING` (navy `#2a3a52` on `#ecc0ae`) at every score, not `ringColours`. `RING_TONES.good` is still green: `#4e7d60` light, `#9fd0ad` navy. **The Housekeeping drawer's ring (`HousekeepingDrawer.tsx:122`, `ringColours(p, "navy")`) is mounted and draws `#9fd0ad` at 80% and over.** clp2.measure records your 12 Nov ruling to leave that ring alone (a navy arc would vanish on its navy header). The light tones' other reader, `HealthRing` in ContactLightHeader, appears to reach the page only through ContactGlance251; I did not trace that to a rendered root. Flagged below; nothing changed.
3. **The ref's ring is rust, the app's is navy.** The ref draws the low tone (`#a2452a` on `#efcfc5`). The brief said colours unchanged, so the app keeps the brand pair. It is the only visible difference from frames 1 and 2 apart from the nudge (next item).
4. **List health is nudged in, not flush right.** Principles v2's `healthNudge` places it 32px inside the list frame. The ref draws it flush right. The nudge is left as it is.
5. **"The rail, bar and tabs may or may not have landed":** shell nav v3 has not landed on this line. The served shell (the folder tab with "AGENTS", the BETA strip) is untouched.
6. **The dev line predates main's 11 Nov CLAUDE.md diet.** There is no `docs/decisions/contact-list.md` here, and none of `worktree-claim.mjs`. The lasting decisions are recorded at the end of this report; move them into that file when this line meets main.

All other premises held: the h1 came from clHeadline with the "need you" sentence, the "· you've queried" line sat under it, there were two buttons, List health had the Archivist with a pill and Open / Show me who, and the whole header scrolled away.

## Gates — baseline vs final

The worktree started with no `functions/node_modules`. That accounts for both baseline tsc errors and the `functions/` Vitest files. It was symlinked from the primary for the emulator login (`authUser.mjs` loads `firebase-admin` from `functions/`), so the final runs have those modules. Every final failure is in the baseline's failure list.

| Gate | Baseline | Final |
|---|---|---|
| `npx tsc --noEmit` (4 GB heap: it OOMs at the 2 GB default) | exit 2 — `functions/src/aiRateLimit.ts(25,32)` and `(26,28): error TS2307` | exit 0, 0 errors |
| `npm run build` (prod: the landing-only split) | `✓ 419 modules transformed.` `✓ built in 1.76s` | `✓ 419 modules transformed.` `✓ built in 1.54s` |
| `vite build --mode development` (the app) | `✓ 4010 modules transformed.` `✓ built in 17.41s`, `index-DHQJyaQy.js` | `✓ 4011 modules transformed.` `✓ built in 11.42s` |
| `npx vitest run` | `Test Files  7 failed \| 831 passed \| 1 skipped (839)` / `Tests  4 failed \| 12123 passed \| 4 skipped (12131)` | `Test Files  2 failed \| 836 passed \| 1 skipped (839)` / `Tests  3 failed \| 12177 passed \| 4 skipped (12184)` |

The final failures: `src/test/emuGuard.test.ts` (one) and `src/test/firestoreTarget.test.ts` (two), all in the baseline. The baseline also had `functions/eval/run.test.ts`, `functions/src/email.test.ts`, `functions/src/smartImportPhotos.test.ts`, `functions/src/smartImportCore.test.ts` and `src/lib/aiRefusal.test.ts`, all of them the missing modules.

One pre-existing e2e red, not touched: **CL26-H10** expects four Sort entries, and there are five (Agent fit came in with principles v2).

## Commits

| Commit | Files |
|---|---|
| `be8f1d6d5` phase 1: agents headline, subheader, one action | design-refs/contact-list-header-v2.html, design-refs/.refhashes.json, src/lib/contactPrinciples.ts (+ .test.ts), ContactHeader27.tsx, contactHeader27.test.tsx, contactPrinciples.css, contactV27.css, AgentList.tsx, tests/e2e/clh2.measure.ts, cl26/cl27/clp1 measures, ledgers |
| `a671cd2af` phase 2: List health as a ring with one action | ContactHealth26.tsx, ContactHeader27.tsx, AgentList.tsx, contactV27.css, contactHeader27.test.tsx + `__snapshots__/`, cl26/clh2/clp1/clp2 measures, ledgers, shots |
| `3ad7b591e` phase 3: slim pinned row on scroll | ContactSlimRow.tsx (new), ContactSheet26.tsx, contactPrinciples.css, AgentList.tsx, clh2/cl27 measures, ledgers, shots |

## Locks

The browser locks run on the emulator harness account (53 agents, 39 not yet queried). "Red-before" means the lock failed with its fix removed. For unit locks that is the previous commit's source restored into place; for browser locks it is the lock's own named break (`CLH2_MUTATE`, `CLP_MUTATE`, `CL26_MUTATE`).

**Added**
- **CLH2-1** (unit, contactPrinciples.test.ts): the clHeadline table. (17,12) → "17 agents on file" / "5 not yet queried" / link. (17,17) → "All of them queried" / plain. (1,1) → "Already queried". (1,0) → day one unchanged. (4,3) → "1 not yet queried". "need" never appears. Red-before: 7/7 failed on the old clHeadline.
- **CLH2-2/3** (unit, rendered markup): the h1 and the sub button; the plain all-queried sub; exactly one button in the action row; no "need you" or Discover; day one unchanged, Discover kept there; art 160. Red-before: 4 failed on the old header. The day-one and hook guards pass on both, by design.
- **CLH2-4** (browser): read nq from the subheader (39), proved non-zero and below every row (53), clicked it; rows = 39 and none queried. Red-before (click swallowed): `rows=53, nq=39`, `14 queried rows shown`.
- **CLH2-5** (browser, 1512 and 1280): one button "+ Add an agent", no "need you", no "Discover agents". Red-before (Discover injected): 4 reds.
- **CLH2-6** (unit and browser, 1512 and 1280): no image in the ring; the percentage inside the ring's box, 28px ink; exactly one "Fill the gaps" (79 details missing on the harness); none at 0 gaps (unit); clicking it opens Housekeeping. Red-before: unit 3 failed on Phase 1's code; browser (an image and an Open button injected) 4 reds.
- **CLH2-7** (unit): the navy ground, `ContactHeader26`'s whole markup, snapshotted against the pre-v2 component. It still matches after Phase 2, which is the "navy renders exactly as before" proof. No route mounts the navy ground, so there is no live navy use to screenshot.
- **CLH2-8** (browser, 1512 × 982 and 1280 × 720): at the top the row is not visible, inert, aria-hidden, and 0 of its 3 controls take focus. Red-before: visible, focusable=3.
- **CLH2-9**: after 600px the row is visible with 3 focusable controls, 48px high, bottom 60 = the toolbar's top 60, and the rail's top 72 is below it. Red-before (toolbar and rail at their old literal offsets): `row 60 toolbar 12`, `row 60 rail 24`.
- **CLH2-10**: back at the top the row is hidden and inert again, and the toolbar's top equals its first reading to under half a pixel. Red-before (row forced visible): the hidden half goes red. ⚠️ The to-the-pixel half cannot be broken this way: at the top of the page the toolbar is in flow, not stuck.
- **CLH2-11**: 767 and 390 wide (narrowed after sign-in at 1512, where the row is present), no `.clh2-slim` at the top or after scrolling. Red-before (a row injected): 4 reds.

**Rewritten**
- CLP2 (clp1.measure): the headline's cases (header v2), 15/15. Red-before: the old sentence injected.
- CL26-H1 and CL27-H1: title, subheader, one button, art 160.
- CL26-H2: the score centred in the ring, no archivist (the pill and archivist checks retired).
- CL26-H3: the ring and Fill the gaps open Housekeeping and do not filter. The "Show me who" half retired with the button. Red-before: Fill's click swallowed.
- CLP1: "Fill the gaps is an outline". Red-before: 0/4.
- CLP21: the score in ink with no badge. Red-before: green arc injected.
- clp2 `openDrawer`: clicks Fill.
- CL27-R1: the rail may sit up to 48px lower once the slim row shows.

**Retired**
- The v27 "List health is v26's block" equality: the light block now differs by design, and CLH2-7 holds the navy side.
- The CL26 shots script's `11-missing-details` shot: it was reached through "Show me who".

## Screenshots (reports/contact-list-header-v2/shots/)

- `ref-frame1.png`, `ref-frame2.png`, `ref-frame3.png`: the ref's frames.
- Frame 1 ↔ `header-1512.png`, `page-1512.png`, `header-1728.png`, `page-1728.png`. Visible differences: the ring is navy on pink, not rust (premise 3); List health sits inside the list's right edge (premise 4); the drawing and type otherwise match.
- Frame 2 ↔ `slim-some-not-queried-1512.png` (rust "39 not yet queried") and `slim-all-queried-1512.png` (the dev aid at 53/53, plain "All of them queried"). Same layout as the ref; the small ring is the brand pair.

## For Nick

- **The green ring tone.** `RING_TONES.good` is a green on both grounds (`#4e7d60` light, `#9fd0ad` navy). The Contact list header no longer draws it (BRAND_RING). The Housekeeping drawer does, at scores of 80 and over (`ringColours(p, "navy")`). Your 12 Nov ruling kept that ring out of the brand-pair change. Your ruling: recolour RING_TONES' good tone, or leave the drawer as ruled?
- **onShowWho / showMissing.** After Phase 2 neither had a mounted caller. `showMissing` is deleted from AgentList, and `onShowWho` from ContactHeader27's props. ContactHealth26 keeps `onShowWho`, now optional, for the classic (navy) block that ContactHeader26 still renders. Missing details stays reachable from the filter rail's "Missing details" quick pick.

## Lasting decisions (for docs/decisions/contact-list.md when this line meets main)

- The populated header is "{n} agents on file" over "{nq} not yet queried" (a button: `queried: "no"`, with Find, the group and the other filters cleared, so the list shows exactly nq) or "All of them queried" / "Already queried". "need you" lives only in the rail's Your move chip. One header action.
- List health in the Contact list header is `ContactHealth26 figure`: the score in the ring, one "Fill the gaps".
- The slim pinned row writes `--pin-cover` on `.clv-main` while it shows. The toolbar, margin labels and rail sit under `--pin-cover`; no literal 12 remains in `.cl27`'s pinned offsets or in ContactSheet26's reads.
