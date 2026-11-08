# Comparable titles v30 — report

**Base:** `dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41-cl262-db21-sip12-pk41w-qc152-fn121-pk42-qc1521-sr1-qc1522-td51-td511-cb2-sm1-qc1522b-cb21-db22-ql1-rv2-td52-qc1522c-pw1-td52b`
@ `0e21b57a68daeebcd8d29a58f6c4e6ef478e887a` — the branch dev was serving (`index-D507mjK0.js`) when the work started.
Cut from there on Nick's correction ("cut comps-v30 from the branch dev serves now"), not from `main`.
**Branch:** `comps-v30`, worktree `/Users/nickphysick/ScriptAlly-comps30`. **Not merged to `main`.** Prod is untouched.
**Ref:** `design-refs/comps-v30/` (all 23 SHA256SUMS lines verified; the HTML enrolled in `.refhashes.json`).

**Baseline on the base, before any edit:** tsc 0 · `build:dev` 0 · `vite build` 0 · Vitest 6 files / 4 tests failed
(`functions/eval/run.test.ts`, `functions/src/email.test.ts`, `functions/src/smartImportPhotos.test.ts`,
`functions/src/smartImportCore.test.ts`, `src/test/emuGuard.test.ts`, two in `src/test/firestoreTarget.test.ts`),
11,431 passed, 3 skipped. The four `functions/` reds were the worktree having no `functions/node_modules`; once linked
they pass.

**After (this branch):** tsc 0 (app and functions) · `build:dev` 0 · `vite build` 0, no `error`/`[WARNING]` lines
apart from the chunk-size note · Vitest 3 tests failed, all three on the base too (`emuGuard`, both `firestoreTarget`),
11,470 passed, 3 skipped. **No worse than baseline.**

## 1. False premises (first)

1. **The pack assumed `main`.** `main` has neither page width v1's shared column rule nor `ContactHeader26`; both are
   on the dev chain. Nick ruled to cut from the branch dev serves. The red gate on `main` is therefore not measured here.
2. **The ref pack was not in the repo root.** It was `~/Downloads/comps-v30-pack.zip`; hashes verified before use.
3. **`ContactHeader26` is not a reusable part.** Its ring and figures are wired to the Contact list's data. The comps
   header is built page-local under `cp30-`, reading its values (radius, padding, navy, type). Lift candidate.
4. **"One commit per part" does not fit the code.** The lib (`compsShelf.ts`) and the page file serve Parts A–D
   together, and a commit of A–D alone would fail its gates without E's drawer and the two re-pointed unit tests. Two
   commits instead: the page (A–E), then the locks and this report (F).
5. **The pack's "what makes a good comp?" opener (baked decision 1)** needs no new dialog: `CompsExplainDialog` exists
   and is opened unchanged.
6. **`notifyPrefs.comps` needs no rules change**, checked rather than assumed: `notifyPrefs` is in the user-update
   allowlist (firestore.rules:910) with no shape constraint. Written as one leaf (`updateUserPaths`).
7. **The drawer title shipped one letter per line in my own build** — a class collision (`cp30-dt` was both the
   toolbar's 9px dot and the drawer's `h3`). Caught by a screenshot, not a lock. Fixed (`cp30-dtl`) and locked: **D1t**.
8. **The comps page's N shortcut does nothing on arrival — on the base as well as here.** The Submission packages
   builder stays mounted on its hidden page with a step open by default, and that open step holds a page-level Escape
   layer app-wide (`packages/v26/Pk393Builder.tsx:293`). The comps page's keys stand down while any layer is open
   (`escapeDepth() > 0`), so N waits until the first Escape closes that hidden step. Found by a DOM diff around the
   first Escape: the only things that changed were `p93-open` and its `aria-expanded` button. This branch does not
   touch Submission packages and the comps key handler is unchanged from the base, so CV25 A1 (which presses N) is red
   on the base for the same reason. Out of this pack's scope; see §5.

## 2. What landed, by part

- **A · header and empty.** One navy title card on the shared column (`CompsTop30`). Its right side is the highlight:
  the comp agents ask for more with most among comps with at least five queries (ties: more queries, then the
  writer's order), else "Too soon to say", else "Nothing sent yet". The lead sentence states counts in words up to ten
  (a deviation from the mock's numeral for the total). Empty page: the card, the three steps, nothing else.
- **B · notice and shelf.** The blush notice unchanged in behaviour. "Your shelf": where it's used (segments with
  counts), Sort, Find, Cards / List. Cards are paper with a band by where (navy sent, blush draft, stone shelf) and a stat
  card on the foot. A new List view reads the same order. **No green anywhere; age tones are plain and old (rust).**
- **C · letters.** One card per query letter (sent by count, then drafts by name), each saying which comps it named,
  or that nothing was recorded, or that the draft names none; its rate where it went out.
- **D · Scout.** A section at the foot; the floating tab is gone. "Tell me when it's ready" writes `notifyPrefs.comps`.
  No call to `suggestComps`.
- **E · drawer and pop-up.** The drawer's head is navy with the type disc, title and byline; figures, "Why it
  compares", letters and queries in the body. The how-it-works pop-up is v30's. **Retired:** `CompsHeader`,
  `CompsShelf`, `CompsLanding`, `comps28/art.ts`, `CompsSteps`, `CompsHowDialog`, `CompsScout`, `compsSteps.test.tsx`;
  `comps28.css` pruned to the explainer and picker rules.

## 3. Locks

`tests/e2e/cp30.measure.ts` at 1280 × 800 and 1512 × 900, sidebar open, on the emulator (`demo-scriptally`),
fixture `seedComps30.mjs` (removed in `afterAll`). `CP30_PROVE=1` re-runs each lock with its named mutation from
`cp30Mutate.mjs` and requires it to go red.

| Lock | Holds | Mutation (must go red) | 1280 | 1512 |
|---|---|---|---|---|
| H1 | The title card and the shelf's grid share the page column's edges | the grid holds a 40px right margin | green · proved | green · proved |
| H2 | Ready: Tidewater (tie at 6 of 9, writer's order), its rate on the disc | the pill is removed | green · proved | green · proved |
| H2-early | Under five queries: "Too soon to say", no pill | a pill is drawn | green · proved | green · proved |
| H3 | The lead sentence, in words | "Two have" becomes "2 have" | green · proved | green · proved |
| S1 | The toolbar is one row (by centre line), no overflow, no sideways scroll | the toolbar wraps | green · proved | green · proved |
| S2 | Bands by where (navy / blush / stone); no green on the page | a draft band turns green | green · proved | green · proved |
| S3 | A sent comp's stat card names only the sent letters | it names the draft too | green · proved | green · proved |
| S4 | Cards and List read one order | the list is reversed | green · proved | green · proved |
| S5 | No control nested inside a button | a button is put inside the add card | green · proved | green · proved |
| L1 | Letter cards: sent by count, then drafts; their middles | the drafts move first | green · proved | green · proved |
| L2 | One rate in three places: the letter, the card, the header | the letter's figure changes | green · proved | green · proved |
| D1 | The drawer opens from a card, a list row and a letter's comp; ✕ centred; focus back to the opener | the ✕'s glyph moves off centre | green · proved | green · proved |
| D1t | The drawer's title runs across the head, at most two lines | the title takes the dot's 9px width | green · proved | green · proved |
| D2 | No small uppercase mono labels | the pills turn mono and uppercase | green · proved | green · proved |
| E1 | The empty page: the card and the steps, nothing else | a shelf section is added | green · proved | green · proved |
| SC1 | The Scout is a section; no floating tab; the request writes and survives a reload | the floating tab comes back | green · proved | green · proved |

152 readings, no failures; every mutation reddened its lock at both widths (`reports/comps-v30/readings.json`).

Unit locks in `src/lib/compsShelf.test.ts`; nine source mutations, each red, file restored byte-identical
(`reports/comps-v30/unit-mutations.json`).

Older comps locks re-pointed and run on the emulator: **CV25 A3, E2 · AD1–AD7, AD10 · X1 (v27.1) green.** CV25 A1 is
red on the base for the reason in §1.8 (it presses N with the hidden packages step's layer open); its edit step passed
before that. Re-pointing notes: AD1 reads the drawer's subline by `data-cv="drawer-sub"` (v28 read a class); AD7 drops
the "Matches on" label, which v30 does not draw; X1 checks four close buttons (the Scout drawer is gone) at v30's
40 / 16 for the drawer and pop-up; A3's last reading no longer asks for v28's logged-share ring (100%), which v30 does
not draw — the card's own rate is asked ÷ queries.

Retired and re-pointed e2e: `tests/e2e/RETIRED-comps-v30.md`. Three things lost their e2e cover and are recorded there
as gaps: the picker's tips, the two pop-ups' focus return, and loading against loaded.

## 4. Screenshots

`reports/comps-v30/shots/NN-name-{1280,1512}.png`, named as the ref's `design-refs/comps-v30/screens/`.

## 5. Follow-ups

- **A hidden page's open step blocks every page's keys.** `Pk393Builder`'s `useEscapeLayer(eff != null, …)` should be
  gated on its page being the one on screen, or its default-open step should not register a layer. Until then CV25 A1
  stays red. Every other page whose keys read `escapeDepth()` (the Query Centre list, the Contact list, Discover's picks,
  the To-do workspace, full-screen lists) should stand down the same way while that builder is mounted — read from the
  code, not measured. Submission packages is outside this pack.
- Lift candidates: the navy title card (`CompsTop30`) and the paper card with a stat foot.
- `CompsQueryLine.tsx` is still in the tree; only two source-reading tests name it.

## 6. Dev deploy

DEPLOY_LINE
