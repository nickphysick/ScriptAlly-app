# Plans page v3 — three columns

Branch `plans-v3`, pushed, **not merged**. Page commit `307dde207`. Dev deployed 14 Nov: before `index-BRmlF1iZ.js`, after `index-C1eM6OE5.js`. Prod untouched.

Ref: `design-refs/plans-v3.html`, sha256 `a45e0023…9962d`. It was in `~/Downloads`, untracked. It is now committed (`74f0fcb04`) and on the design-ref watchlist.

## False premises (read first)

1. **The line dev serves did not contain 4244e77e.** Dev served `shell-rail-menu-v1` (`c318c928e`). That branch has every *code* commit of `non-workspace-v1-1` but not its tip, 4244e77e, which only adds reports. `plans-v3` is cut from the served tip with `origin/non-workspace-v1-1` merged in (`e424f0dcf`, reports only). So it holds 4244e77e and dropped nothing that dev was serving.
2. **"This is the only emoji in the app" is not true.** ✨ was already in `todo/HousekeepingSweep.tsx` twice (live: "✨ Find these for me", "✨ Found · …") and in `Queries.tsx` behind a dead `false ?`. Both are To-do / Query Centre files, which were off limits. The lock therefore pins the census as it stands: these three files, and no other file may gain one. The page itself carries exactly one ✨ per state.
3. **At 390px the route does not draw this page.** `PlansRoute` renders the phone shell's `PlanPhone` below 768px, and the phone shell was off limits. This page reaches 390px only through the new `#/plans-lab`. The 390 locks and the 390 page shots use the lab. The dev route shot at 390 (`dev-route-390-phone-plan-page.png`) shows the phone page, which is what the e2e account sees.
4. **"You're on Pro until <date>" — the app holds no date.** The entitlement carries only `basis`, `pro`, `prompts` and `trialEndsMs`, and no payment exists. The Pro viewer's headline and card use only what the app holds (see "Words I wrote").
5. **Settings › Plan already offers "Finished querying? … Get in touch"** for founding writers (`AccountSettings.tsx`). Nothing was added there.
6. **No founding-cap constant existed on the client.** The live cap is a Firestore counter (dev 50; prod 100 until Nick sets it), and "first 50" is typed into Auth and Settings. `planRules.ts` was off limits, so the page names it once (`FOUNDING_CAP = 50` in `PlansPage.tsx`). Every "50" on the page reads it. Moving it into planRules is a follow-up for a run allowed to touch planRules.
7. **There is no "stop it rolling on" control anywhere**, so the Pro viewer's card has no foot, as the brief directs for that case.
8. **The emulator's e2e account is not a founding writer.** Its harness copy is `plan: "Free"` with no founding flag, and it draws the trial viewer. On dev the same account is founding. The route lock reads the viewer from the page (`data-plans-state`) and holds it to that viewer's order, lead and pill. The founding-only facts are locked in the lab.
9. **"document scrollWidth equals the viewport" cannot fail on this page.** The plane has `overflow-y: auto`, so its `overflow-x` can never be `visible`, and the document cannot scroll sideways whatever the cards do. The first E3 break stayed green. The lock now also asserts that the plane, the page's own scroll region, does not scroll sideways, and that turns red.

## What landed (`307dde207`)

- **`PlansPage.tsx`** is split three ways:
  - `plansModel(viewer, daysLeft, selling)` is pure. It decides the headline, the card order, the one lead card, which cards step back, pills, chips, price mode, picker, foot and the closed rows.
  - `PlansView` draws a model.
  - `PlansPage` reads the entitlement (`pending` → founding).
- **Founding writer (today's only real viewer):**
  - "The early bird gets the worm." / "Founding writers pay nothing. We only ask for your feedback."
  - Cards: Free · **Founding writer** (lead, "✨ Open now", "Your plan", thank-you foot) · Pro.
  - Free and Pro step back with "Opens at launch". Pro shows "From £3.75 a month" and "For 1, 3, 6 or 12 months.", with no picker.
  - Under the cards: one closed row, "Compare every feature", holding the existing `PlanTable` (viewer `founding`), unchanged.
  - Gone from this view: "Your founding place", "Then, once we launch", the small print and the Questions list.
- **After launch (built and locked in the lab):**
  - Cards: Free (full strength, "Open") · **Pro** (lead, "✨ Open") · Founding writer ("All 50 places taken", stepped back and paled).
  - **Trial:** "You have N days of Pro left." Free carries "Your plan" and the foot "Yours once your 14 days of Pro end."
  - **Free:** "You're on Free." Free carries "Your plan".
  - In both, Pro has the four-length picker two by two. Its foot is "Choose Pro" (cream) only when selling is on; otherwise it is the "Not on sale yet" chip.
  - **Pro:** see "Words I wrote". Pro carries "Your plan" and shows the from-price.
  - Two closed rows: "Compare every feature" and "Questions" (the existing after-launch questions).
- **`plansPage.css`:**
  - Three columns. The founding pink is four named tokens on `.pl-page` (`--pl-found` #e8b4a3, `--pl-found-body`, `--pl-found-art`, `--pl-found-closed`).
  - The lead is rotated −1.4° and raised 10px, with the 2px outline (terracotta on founding, navy on Pro) and the deeper shadow. Stepped-back cards: opacity .8, saturate .85, scale .97, no shadow.
  - Below 900px: one column, the lead first at −0.8°, nothing scaled.
  - The v2 rules for the removed sections are deleted.
  - Card names use the typewriter with the house claw-back, because brand.tsx forces `h3`.
- **Illustrations:** `public/images/tier-{free,pro,founding}-328.png` are 328px copies of the 800px art (2× its 164px draw), made with `sips`, 82–105 KB each. The `img` has `width`/`height` 164 and empty alt.
- **`#/plans-lab`** (`PlansLab.tsx`, gated `MODE !== "production"`, MODE first as the other labs) draws any viewer: `?v=founding|trial|free|pro&days=N&sell=1`. `sell=1` is the test flag; `PLANS_ON_SALE` is untouched. It is absent from the production bundle (grepped `final-dist`) and present on dev.
- **Locks:**
  - `src/components/plans/plansPageV3.test.tsx`: 18 cases.
  - `tests/e2e/plansV3.measure.ts`: 7 tests.
  - `planTable.test.tsx`'s four headline cases are re-pointed from the v2 wording to the ref's.
- **Not touched:** the Pricing page, `src/marketing`, PlanTable's drawing, planRules, the resolver, planComparison, the phone shell, Manuscripts, Query Centre, Contact list, Dashboard, Query letters, Versions, To-do, and prod configuration.

## Baseline → final

| Gate | Baseline (before any edit) | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| Vitest (2 workers) | 3 failed · 12449 passed · 4 skipped | 3 failed · 12467 passed · 4 skipped |
| `vite build` | clean, no warnings | clean, no warnings |
| e2e `plansV3.measure.ts` (emulator, 1 worker) | — | 7 passed |

The 3 Vitest failures are the same in both runs and are already on the line. `emuGuard` flags `tests/e2e/cb21Emu.sh`, and `firestoreTarget` flags old `cl25*` e2e scripts without the live guard; neither comes from this run. Logs are in `baseline/` and `final/`.

## Each lock and the break that turns it red

Unit breaks (`breaks-unit.txt`): each was a one-line mutation of `PlansPage.tsx`, run, then restored. The restore was checked with `cmp`.

| Lock | Break | Red |
|---|---|---|
| Card order per viewer | founding: Pro before Founding writer | founding order (+ the founding card's chip/foot slice) |
| Exactly one lead | Free also lead | founding lead count; ✨ count 2 |
| The lead's pill | "Open now" → "Open" | founding pill |
| Founding: no picker | picker on the founding Pro card | founding removals |
| Founding: no Questions | rows `["compare","questions"]` | founding removals; one closed row |
| Compare closed on load | `<details open>` | one closed row |
| Selling off: no Choose Pro | foot always `"buy"` | selling off |
| ✨ aria-hidden | `aria-hidden` dropped | every viewer + ✨ lock |
| Numbers never typed | the cap typed as "50" | typed-number lock |

E2e breaks (CSS mutations, each restored and checked with `cmp`):

| Lock | Break | Red |
|---|---|---|
| Only the lead is rotated | `.is-wait` also `rotate(1deg)` (`e2e-break-E1-rotation.txt`) | route + all 4 lab viewers, "rotated cards" |
| Lead opacity 1, stepped back below 1 | `.is-lead { opacity: .9 }` (`…E2-lead-opacity.txt`) | route + all 4, "lead opacity" |
| 390: no sideways scroll | `.pl3 { min-width: 480px }` below 768 (`…E3-390-scroll.txt`) | all 4 + selling, "the plane does not scroll sideways" (500–502 > 390) |

Not broken separately: the ✨ count and aria-hidden in the painted page are also read by the e2e (`sparkleCount`, `sparkleHidden`). Their unit twins carry the breaks.

## Deviations from the ref, with reasons

- **The closed founding pass also steps back** (opacity .8, saturate, scale .97) as well as paling. The ref only pales it, but the brief says unavailable cards step back and this one "steps back further". It is also what the opacity lock reads.
- **The Pro viewer's card shows the from-price and no foot.** The ref shows "£29 for 6 months · Ends 19 May" and "Stop it rolling on"; none of that is held (false premises 4 and 7).
- **The Questions are the existing five**, including "Will anything here charge me today?". The ref has four; the brief says the existing after-launch questions.
- **No "Fits your campaign" tag on the picker.** The ref's picker has none.
- **Free's illustration panel uses `--ink-paper`** (#fffdf9) for the ref's #fbf7f1, which no token carries.
- **Compare opens the real PlanTable**, with its own heading and "What Pro adds / Everything" switch, not the ref's simplified table, as the brief directs.
- **Below 768px (lab only)**, type is the settings chassis's own phone faces, not the ref's typewriter. That width belongs to `PlanPhone` on the route.
- **"Choose Pro" has no action.** No checkout exists. It renders only under the test flag and does nothing, as the rest of the selling path does.

## Words I wrote

- Pro viewer headline: **"You're on Pro."** Subheader: **"When it ends it rolls on monthly at £7.99, until you stop it."** (price from `ROLL_ON_PRICE`). These replace the ref's "until 19 May." / "Then it rolls on…".
- Trial headline for one day: **"You have 1 day of Pro left."** (the ref only shows the plural).

## Screenshots (`shots/`)

- **Dev route, as the e2e account (founding, `index-C1eM6OE5.js`):** `dev-route-1440-closed.png`, `dev-route-1440-open.png`. `dev-route-390-phone-plan-page.png` is the phone's own page, unchanged.
- **This page at 390, founding, from the dev lab:** `dev-lab-founding-390-closed.png`, `dev-lab-founding-390-open.png`.
- **After launch, from the dev lab at 1440:** `dev-lab-trial-1440.png`, `dev-lab-free-1440.png`, `dev-lab-pro-1440.png`, plus `dev-lab-free-selling-on-1440.png` (the test flag).

## Dev deploy

- From a clean detached checkout of the pushed tip `307dde207` in the scratchpad: `npm run build:dev`, then `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`.
- The command stopped itself unless dev served `index-BRmlF1iZ.js` beforehand. After the deploy the served hash matched the build (`index-C1eM6OE5.js`), and the three 328px images serve 200.
- Hosting only. No rules or functions changed.

## For the next run

- Move `FOUNDING_CAP` into `planRules` and repoint Auth's and Settings' typed "50"s at it (needs planRules in scope).
- Decide whether the To-do Housekeeping ✨ stays, given the brief's one-emoji intent.
- The page's lasting decisions are in this report: this line has no `docs/decisions/` file for Plans, and the run was held to two commits.
