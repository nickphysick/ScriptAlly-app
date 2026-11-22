# Retired and rewritten with Comparable titles v30 (7 Nov)

The page at `/manuscripts/comps` was restyled: one navy title card (its right side the comp agents ask for more with
most, "Too soon to say", or "Nothing sent yet"), the blush notice, "Your shelf" (where it's used · Sort · Find ·
Cards / List over paper cards with a stat card on the foot), one card per query letter in place of "What's landing", and
the Scout as a section at the foot in place of the floating tab. The data model (`compIds` on Query Letter versions,
`lib/compUsage.ts`, `lib/compsLibrary.ts`) is unchanged.

The new suite is `tests/e2e/cp30.measure.ts` (CP30: H1, H2, H2-early, H3, S1–S5, L1, L2, D1, D2, E1, SC1) with
`cp30Lib.ts`, `cp30Mutate.mjs` (one named mutation per lock, applied by `CP30_PROVE=1`), `cp30Shots.measure.ts` and the
fixture `seedComps30.mjs`. Unit locks: `src/lib/compsShelf.test.ts` (S3 stat card, H3 lead sentence, H2 highlight, L1
letter cards, and the sort / filter / age derivations).

## Deleted files

- `tests/e2e/compsV28.measure.ts` (CX28 H1–H3, N1, S1–S5, D1–D2, E1–E3, L0), `cx28Lib.ts`, `cx28Mutations.py`,
  `cx28Shots.measure.ts` — every case reads v28's header, slip, type toggles or "What's landing", none of which render.

## Case by case

| Lock | What it held | Now |
|---|---|---|
| CX28 H1 header | LightHeader populated / EmptyPanel empty | **Rewritten: CP30 H1** (one navy card on the shared column in both states) and **E1** (the empty page). |
| CX28 H2 card counts | The header card's three counts and ring | **Retired.** The header's right side is the highlight now: **CP30 H2 / H2-early**; the counts are the toolbar's "where it's used" segments (**CP30 S1**). |
| CX28 H3 empty | Two buttons and the steps card | **Rewritten: CP30 E1.** |
| CX28 N1 notice | One banner, its button opens the picker | **Kept in substance**: the notice is unchanged in behaviour; CV25 A3 re-pointed drives it. |
| CX28 S1 grid | Columns and the one-row toolbar | **Rewritten: CP30 S1** (one row by centre line, no overflow, no sideways scroll) and **H1** (grid edges = panel edges). |
| CX28 S2 slip | The slip by state | **Rewritten: CP30 S2** (band by where, no green) and **S3** (the stat card's letters and rate). |
| CX28 S3 age | The age chip's text and tone | **Rewritten** at unit (plain / old; the sage "new" tone is gone). |
| CX28 S4 sort | The sort menu's orders | **Rewritten: CP30 S4** (cards and list read one order). |
| CX28 S5 filters | Where, type and find compose | **Rewritten: CP30 S1/S4**; the type toggles are gone (baked decision 3). |
| CX28 D1, D2 landing | "What's landing" by comp and by letter | **Retired** with the section. **CP30 L1** (letter cards, order and middles) and **L2** (one rate, three places). |
| CX28 E1 back step | Drawer Edit/Cancel/✕/Escape return to the detail | **Covered by AD10** (re-pointed): Escape returns to the detail, a second closes, focus returns to the card. |
| CX28 E2 focus | Focus back to the opener | **Rewritten: CP30 D1** for the drawer (focus returns to the card, the list row or the letter's comp that opened it). The two pop-ups' focus return is **not re-covered at e2e** — recorded as a gap. |
| CX28 E3 picker tips | Four ticked with one old shows both tips | **Not re-covered at e2e.** The picker's logic is untouched by v30 (out of scope); its unit locks stand. Recorded as a gap. |
| CX28 L0 loading | No flash of the empty panel | **Not re-covered at e2e.** The v30 loading card reserves the button row and the disc (`CompsTop30`, state `loading`), but no lock measures loading against loaded. Recorded as a gap. |
| CV25 A1, A3, E2 | Ids, fixed letters, the picker's save | **Kept**, re-pointed to `data-cp` probes. |
| AD1–AD7, AD10 | The add-and-edit form | **Kept**, re-pointed. |
| X1 (v27.1) | One centred close button | **Kept**, re-pointed; **CP30 D1** holds the restyled ✕ too. |
