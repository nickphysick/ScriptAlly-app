# Contact list principles v2 — Agent fit by each name, List health nudged in, the ring in brand colours

Branch `cl-principles-v2` (pushed), cut from `dev/…-pa4-qc155-pa41-clp1` @ 6eaa7ff61. Reference
`design-refs/contact-list-principles-v2/contact-list-principles-v4.html`, SHA256 `06b6c7fc…cad598` (matches, enrolled).
Locks: `tests/e2e/clp2.measure.ts` (R0 recon, CLP15–22, `CLP_MUTATE` takes a comma list); `src/lib/contactPrinciples2.test.ts`.

**Deployed to dev:** `index-nf9qrdAM.js` → **`index-D2PwB95D.js`**, from a clean checkout of
`dev/…-pa41-clp1-ql2-prv1-clp2` @ 4c2ca579a (pushed). Not merged to main. Nothing to prod.

## False premises (and two of my own)

1. **"Remove the ring's extra top margin (14px today)."** There is none. The ring's `margin-top` computes to 0px and its
   centre already sat on the headline block's (Δ 0.01px at 1440, 0.00 at 1280; `R0-base.json`). Nothing changed; CLP19
   holds it and is proved by its mutation (a 14px margin → Δ 7px, red).
2. **"Bring it in 32px from the list frame's right edge."** As built, the List health block overhung the frame by 10px
   (block right 1400 vs frame right 1390 at 1440; 1240 vs 1230 at 1280). A 32px transform would have left it 22px inside.
   CLP18's 32px (±2) is met with a measured pull of 42px at both widths: frame − block = 32.00.
3. **"…at 1440, 1280 and 1100" (CLP19, CLP20).** At 1100 the page content is under 1000px and the header stacks (v1's
   narrow fold): the ring sits on its own row under the headline. CLP19 runs at 1440 and 1280 only; CLP20 at 1100 accepts
   "on its own row". The nudge is off when stacked.
4. **"Wherever the List health ring appears", navy arc.** The Housekeeping drawer's ring sits on the drawer's navy header
   (`#2a3a52`), where a navy arc would vanish. **Nick ruled (12 Nov): leave the drawer ring.** It keeps its score tones on
   navy (light green `#9fd0ad` at 80+, `#e0a188` at 60–79, `#f0603f` under 60, track cream 18%). CLP21/22 cover the
   Contact list and its card only.
5. **"This removes the last green."** Not quite: the Housekeeping drawer keeps two greens, its ring at 80+ and its "+n"
   points pills (`span.hk8-pts`, `span.hk8-each`, background `rgb(79, 154, 108)`), read by CLP22's base run.
6. **Mine: the card's green saved outline.** I asked Nick whether the agent card's green saved flash should go navy. It
   already is: `contactV262.css:286` overrides the green rule at :255 (dead CSS). Nothing changed; CLP22 keeps it as a guard.
7. **Mine: an over-tight lock.** CLP15 first held the stars' box centre within 3px of the name's; built exactly as
   specified (on the name's baseline, nudged up 3px, as the mock does), they read 3.5px apart because the two fonts' line
   boxes differ. The check now asserts the prompt's own terms (`top: -3px`) with ±5px on the centres.
8. **Dev moved twice during the job.** At the start it served `index-Bq5D30Du.js` (`…-pa41-clp1`); by the deploy it was
   `index-BTbKdg-q.js` (`…-clp1-ql2`, Query letters v2), then `index-nf9qrdAM.js` (`…-ql2-prv1`, Plan rules v1). By the
   house rule v2 went onto the served line each time; the deployed branch is `…-ql2-prv1-clp2`. `…-ql2-clp2` is pushed and
   superseded.

## Phase 0 · Recon

- **Dev:** `index-Bq5D30Du.js` from `dev/…-pa4-qc155-pa41-clp1` (built at 0e1b2a9f5; tip 6eaa7ff61 adds report commits
  only). Every Contact list principles v1 phase is in it.
- **Agent fit:** `Agent.starRating?: 1|2|3|4|5` (absent = unrated), written by the card (`cardDraft`). Words:
  `FIT_WORDS` in `card/agentPills.tsx`. The mounted row is `ContactSheet26`'s `Row26` (`ContactRows` is not mounted);
  the name is `<b data-cl26="name">` inside `.cl26-whot`.
- **Rings drawn (mounted):**

  | Where | File | Arc / track before | Badge before |
  |---|---|---|---|
  | Contact list header (light ground) | `ContactHealth26` via `ContactHeader27` | by score (`healthTone`): 80+ green `#4e7d60` / `#d6e4da`; 60–79 `#c9765d` / `#f1d9cf`; under 60 `#a2452a` / `#efcfc5` | cream `#f4eee5`, ink text, a 2.5px ring in the arc's tone + 5px page-colour halo |
  | Housekeeping drawer (navy header) | `HousekeepingDrawer` `HeadRing` | by score on navy: `#9fd0ad` / `#e0a188` / `#f0603f`, track cream 18% | none (the % is text beside it) |

  Not drawn by any route: `ContactHeader26` (navy-ground `ContactHealth26`), `ContactLightHeader`'s ring (reached only
  through the unmounted `ContactGlance251`). The phone Today card's List health is a bar (navy fill), not a ring. No
  Dashboard ring.
- **Header today (1440):** block 1079.5–1400 (top 171.6), ring 124px, `margin-top` 0, ring centre 233.64 vs headline
  block centre 233.63; list frame right 1390; headline text ends 911.6. At 1280: block right 1240, frame 1230.

## Phase 1 · Agent fit by the name (99df25adb)

- `Row26`: the name's line is a row (`.clp2-nl`) of the name and `FitStars` — five ★, the first n filled, `role="img"`,
  `title`/`aria-label` "Agent fit: {words}", no buttons. Unrated: nothing.
- CSS (`.cl27` only): 12.5px serif, letter-spacing 0.5px, filled `#2a3a52`, empty `#d3c9bb`, 10px after the name on its
  baseline, `top: -3px`. The name `flex: 0 1 auto` (truncates, ellipsis); the stars `flex: none` (never shrink).
- Live: the row reads the agent store, so a star on the card redraws the row (CLP15 presses 2, reads two, Undoes, reads four).

## Phase 2 · List health nudged in (082310ceb)

- `healthNudge` (lib/contactPrinciples2): pull = block right − (frame right − 32), capped so the block stays ≥ 24px from
  the headline block's ink; 0 when stacked; never negative.
- `ContactHeader27` measures on every render, on resize of the header and its group, and after fonts load, and writes
  `--clp2-nudge` straight to the right column; CSS `translateX(-nudge)` from 768px, `none` once stacked. The headline's
  column never changes width.
- The ink is each text node's line boxes plus each button's box. A single range over the block returned the title's
  full-column border box (the first build pulled only 10px; found by probe).

## Phase 3 · The ring in brand colours (d845cd4e3)

- `BRAND_RING` = arc `#2a3a52`, track `#ecc0ae`; `healthColours(pct, "light")` returns it at every score.
- Badge: white, navy text, inset 1.5px navy outline (the mock's rule). "{n} details missing" keeps its rust number; the
  Archivist stays inside the ring.

## Lock table

| Lock | Base (today's code) | Mutation (`CLP_MUTATE`) | After |
|---|---|---|---|
| CLP15 fit 4 → ★★★★☆ navy/empty, 12.5px, labelled, 10px after, live | red 2/11 (no stars) | stars green → red 8/11 | 11/11 |
| CLP16 no fit → nothing; rated rows do | red 2/3 (0/29 rated rows had stars) | five ☆ injected on unrated → red 2/3 | 3/3 |
| CLP17 long name truncates, stars whole inside the row (1440, 1100) | red 4/10 | stars allowed to shrink → red 8/10 | 10/10 |
| CLP18 block 32px (±2) inside the frame (1440, 1280) | red 0/2 (−10.00) | `transform: none` → red 0/2 | 2/2 (32.00) |
| CLP19 ring centre within 2px of the headline block's | green 2/2 (Δ 0.01 / 0.00) | 14px top margin → red 0/2 (Δ 7) | 2/2 |
| CLP20 headline ink → ring ≥ 24px (1440, 1280, 1100 × harness and long headline) | green 6/6 | −200px → red 4/6 (1440) | 6/6 (min 33.4 at 1100 stacked, 105.7 side by side) |
| CLP21 header ring navy / pink; badge navy on white | red 0/3 | arc green → red 2/3 | 3/3 |
| CLP22 no green on the Contact list or its card (incl. saved outline) | green 3/3 (harness scores 69: fair tone) | title green → red 2/3 | 3/3 |
| unit: `healthColours` light = brand for pct 0–100; `healthNudge` cases | — | — | green |

CLP19/20/22 were green on today's code, so the named mutation is the proof. CLP20's mutation goes red only at 1440: at
1280 and 1100 the gap outlasts a 200px break. Ledgers: `ledger/base-*`, `ledger/mut-*`, `ledger/CLP*`.

## Re-pointed suites (81f1a112c)

- **CL26-H1** "the ring beside the text" and **CL27-H1** "art | title block | List health, left to right" compared
  List health's box with the title block's; the nudge pulls it into the column gap by design. Both now take the right
  column's transform back out (the laid-out columns); CLP18/20 hold the moved position.
- **CL26-H2** held healthTone's light tones and the pill ink on cream; now the brand arc at 93/72/44 and the pill navy on white.
- `contactHeader27.test.tsx` re-pointed from `RING_TONES` light tones to the brand pair.

## Known reds, confirmed

| Red | Before (served line, without v2) | On the deploy line | Identical |
|---|---|---|---|
| CL26-H10 Sort "exactly the four" | `["Surname","Date added","Reply time","Query status","Agent fit"]` (v1's reading) | the same | yes |
| qc155 S4 · 1440 | `n 206197, box [52,129,1416,891]` (`…-prv1`) | first run `n 206634, box [14,68,…]`; re-run `n 206197, box [52,129,1416,891]` | yes on re-run (S4's sidebar pixels vary run to run, as v1 reported) |
| qc155 S4 · 1920 | `n 798214, box [28,106,1911,1071]` | the same | yes |

**Six more reds, not in the prompt's three, identical on the branch dev served** (`…-clp1-ql2`, without v2; every
reading line equal): headerV3 H1–H7, H8, H11; pageHeaderV2 §4.5 the switcher, §4.5 the switcher on the Contact list,
§4.6 the add door. Nick approved the deploy with these (12 Nov). They want a fix-the-reds pass.
**QL2-F2** went red only when run after clp1 in one command: CLP7 sets the harness account to Pro for the rest of that
run (`clp1.measure.ts:288`), and F2 needs a Free writer. Alone on the deploy line: 14/14.

## Gates against baseline

| Gate | Baseline (6eaa7ff61) | v2 branch | Deploy line (`…-prv1-clp2`) |
|---|---|---|---|
| tsc (root) | 0 errors (needs `NODE_OPTIONS=--max-old-space-size=6144`; the default 2GB heap aborts) | 0 | 0 |
| tsc (functions) | 0 | 0 | 0 |
| vite build / build:dev | clean / clean | clean | clean / clean |
| Vitest | 3 failed: emuGuard, firestoreTarget ×2 | Contact list + lib files green | 3 failed, the same three |
| e2e | — | CLP15–22 green; cl26 + cl27 green but H10 | CLP1–14, CLP15–22, cl262, cl27, qc1541, QL2 (alone) green; reds as above |

## Screenshots

`shots/header-1440.png`, `shots/header-1280.png` (the built header and first rows) beside `shots/mock-1440.png`,
`shots/mock-1280.png` (the reference, notes card on "2 · Nudged in" and fit by the name).

## Left as found

- The Housekeeping drawer's ring and its green points pills (Nick's ruling).
- `RING_TONES`' green still exists in `lib/contactV256.ts`, read by the drawer and the unmounted `ContactLightHeader`.
- `contactV262.css:255`, a green saved-outline rule that a later rule overrides (dead).
