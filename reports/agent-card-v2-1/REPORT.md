# Agent card v2.1 — report (20 Nov 2026)

Branch `agent-card-v2-1` (worktree `ScriptAlly-acv21`), cut from what dev served. Integration branch
`dev/cr1-qc163-db3-acv2-cr5-qcc-acv21`. Not merged to main; prod untouched.

## False premises

1. **"Every QC163 lock passes unchanged."** There are no QC163 locks in any branch. `tests/e2e/qc163.measure.ts` exists only
   as an untracked file in another session's worktree (`ScriptAlly-qc1612`, branch `query-card-v163`). I didn't touch it.
   v163's *code* is on the base, so the border colour and the light are built (Phase 4 in full).
2. **"QC1612's, QC160's and QC1611's locks pass unchanged."** On the untouched base (`362d5bfbe`), 15 of QC1611 + QC1612's
   31 tests are already red. They assert v161.x values that v163 changed (pop "above 1.03"; breath "above 1.008"; "breathing
   before it"). On this branch the **same 15** are red and the other 16 green: diffed test by test, identical. QC1612-6 is green
   on both. So the query card is no worse, but "pass" was never true at the base.
3. **"`MaterialsField`'s logic."** The agent card's editor never used `MaterialsField`: it used `MaterialPills`
   (`agentPills.tsx`). I lifted MaterialPills' transitions unchanged into `lib/matOps` (`MAT_OPS`). Both the pills and the new
   tick list call them, so the two dresses can't store different things.
4. **"The lean is `rotate`."** The agent card's lean is `transform: rotate(-1.2deg)` on `.cl262-lean` (the panel), not the
   `rotate` property on the frame. Untouched. The pop's `scale` sits on the card inside it, so the two compose.
5. **Known reds, as listed:** confirmed at baseline: Vitest `firestoreTarget` ×2 and `events.test` ×2. CO17/CO19/CO20 are
   skipped. QC158-15 and QC161-11 not run: the slot time went to the QC1611/QC1612 base comparison above.
   **Also red before this pack, not listed:** coMergeFocus **M1** (and **M2**) are red on the untouched base: the dim, inert and
   aria-modal state while browsing (CO17/CO19's cause). On this branch M2 is green and M1 red as on the base.
6. **"Add your own genre" as the list's last row.** The built door reads `Add “{typed}” as a new genre`. I kept the built
   words (the brief says the door stays), as the list's last row.

## 1. Base and dev

- Base: `dev/cr1-qc163-db3-acv2` @ `362d5bfbe` (dev served `index-CRNhfAUC.js` at the start, as the brief says). Agent card
  v2 is in it (only v2's report commit `d3c5f3f41` isn't).
- By the deploy, dev had moved to `index-CxA-G9nt.js`. That is `dev/cr1-qc163-db3-acv2-cr5-qcc` @ `a03e20053`. Built here,
  that tip gives `index-C5riHcFu.js`; its AppRoot chunk is byte-for-byte the same size as the served one and differs only in
  chunk names. Those follow from the entry's release stamp (`"unknown"` on dev, the commit sha here). The integration branch
  is cut from that tip.
- After: see §8.

## 2. Step 0

1. **v2 on dev:** yes (the base). The four rulings are in: pin, the agency line, the add doors, the editable old note.
2. **How a section opened:** `AgentCard262`'s `Section` drew the `.cl262-sec.is-edit` box (`contactV262.css`: `#f7f4ef` tint,
   navy inset ring, 12px inset) with its `h5` header and "Close", around the edit components: `EditContact`, `EditHow`
   (the offers), `EditWishlist` (`WishlistArea`), `EditGenres` (`GenreChips`), `EditMaterials` (`MaterialPills`). All gone.
3. **Saving a part:** one form (`useAgentForm`), one save (`kit.onSave` → host `saveDraft` → `commitCardSave` →
   `cardPatch(agent, base, draft)`). `cardPatch` writes only fields that differ between base and draft, and every field's
   write depends only on its own section's fields. So a part draft (`{...base, ...section's fields from draft}`) writes exactly
   what the whole save wrote for those fields. **No stop.** The snapshot is per save. The "also changes" offers come only from
   How's fields, so only How's tick carries the plan.
4. **qcMotion160:** `PRESS {to .985, ms 120, backMs 150, net 4000}`, `BUMP {620ms, peak 1.03 at .42}`, `SINK {.975 at .3}`,
   `BREATHE {peak 1.01, 3200ms, enter 320 + after 300, rest 180, close 120, idle 2000}`, `RIM163 {.72, hold 280, fade 700,
   back 150}`, `LIGHT {1300ms, −40°→320°}`, `SETTLE {420ms, from 1.015}`, `FOOT {320, at 120, rise 6}`, `FOLD`,
   `TOAST_OUT {220, 8}`. All take any frame, except the colour: `stageAt` read the query card's `[data-qc152='card']`. The
   query card's frame draws its paper with `::before`. The agent card's drew it on the element (white background and
   shadow); v2.1 moves them to `::before`, and the look at rest is the same.
5. **v163:** on the base. Tint: `breathStart` and `tintHold` set the colour on the rim layer's `b` (`rimOf`, a span over the
   7px ring); `landRim` runs the light (`i`, a 920px conic) clockwise, or mirrored and backwards on `kind: "undo"`. Colour
   table: `STAGE_COLOURS[stage].rim / rimHi`. Each could take the agent card's frame once given a colour (see Phase 4).
6. **QC1612-6:** scoped to the query card (`frameOf()` is `.closest(".spanel")`). Unaffected; green before and after.
7. **The anchor rule:** holds. Part D notes the section acted in (or the first visible) and puts `scrollTop` back to the
   same distance after every render. Kept unchanged.
8. **Flags:** `flagFor(iso)` → flag-icons classes (`fi fi-xx`), as `ContactGroupMark` and `CountryPills` use. The agent stores
   `country` as an ISO code (legacy names normalised by `normaliseCountry`) and `city` as text; "not set" is the key omitted.

## 3. Commits

The four phases are **one commit**. I built them in one pass through `AgentCard262.tsx`, and this shell has no hunk-level
staging to split them afterwards. I'd rather say that than fake a sequence.

- `ff715f5c2` — design refs (24 hashes verified)
- `340321496` — Phases 1–4 (source and unit tests)
- `7a93647f2` — the AC21 locks; earlier locks re-pointed or retired
- (this commit) — the report, its ledgers, shots, stills and recordings; the decisions file; the pictures spec
- `f633b10af` — the integration merge (clean)

What qcMotion160 gained, parameters only: `rimColours(frame)` reads the frame's own `data-qc163-rim` /
`data-qc163-rim-hi`, else the stage as before. `pressIn` / `pressAtPointer` / `pressThen` take `{ tint: false }` (a star or
Add note with nothing open). `bump` takes `{ light: false }`. The rim CSS selector covers `.cl262-card.acv2` through
`--qc163-rim-w/-r`, whose defaults are the query card's 7px / 20px. `stageColours` adds `NO_QUERY_RIM` beside the table.
`qcv160.test.ts`'s source locks are re-pointed to the new text (35/35).

## 4. Locks — red, then green

All on the emulator, `tests/e2e/acv21.measure.ts`, per-test timeout 90s (×n for multi-part tests), seed calls with 60s
timeouts. Ledgers are in `ledger/` (`mut-…` = under mutation).

| Lock | Green | Red under | Readings that caught it |
|---|---|---|---|
| AC21-1 | 23/23 | `order`, `pill`, `flagcity` | 15/23: order ×2 sizes, "Copy email" ×2, copy size ×2, IE and US flags |
| AC21-2a | 22/22 | `bandpen`, `isedit`, `headerbar` | 14/22: band pencil; no tint ×4; heading moved |
| AC21-2b | 3/3 | `oldorder` | the controls' order |
| AC21-2c | 13/13 | `flagcity` | "typing a city never changes the flag" |
| AC21-2d | 14/14 | `label`, `wholedraft` | 9/14: the encoder; wishlist only; genres untouched; genre draft gone |
| AC21-2e | 10/10 | — (no named mutation) | — |
| AC21-2f | 16/16 | `hoveronly` | 11/16: every pencil's focus |
| AC21-3 | 12/12 | `suggap` | the 14px gap |
| AC21-4a | 8/8 | `frame` | the ordinary click never landed (timed out): the frame itself scaling |
| AC21-4b | 18/18 | `popfrom1`, `lightall` | "first rising frame 1.0000"; "a star pops with no light — lights 1" |
| AC21-4c | 8/8 | `navy`, `leaveon` | 1/8: both colours navy; every close route left a breath |

Two of these mutations are weaker than the rest, and I want that clear. `label` is expectation-side: there is no way to make
the page store the label string from outside, so the lock's comparison is shown to notice a label-shaped store. `frame` turns
4a red by a timeout, not a reading.

Harness fixes along the way (no page change behind any): Chrome snaps a 1.5px outline to 1px at DPR 1, so the lock reads the
declared width. Opening a section straightens the card from its lean, so "holds still" is read in the card's layout, and the
reveal scroll gets its own reading. React flushes a click in a microtask, so "the same frame" is read after microtasks with no
animation frame passed. Presses wait for the smooth reveal scroll to settle. Only lights that start inside a trace count.

**Earlier locks.** Re-pointed, same intent: AC2-8; CO8, CO10–CO16, CO18 (How's own tick and cross; the snackbar names the
section); coMergeFocus; AA9, AA11, AA12, AA14. Retired, each with its reason in place as `test.skip`:
- **AC2-6:** the save bar's Save and Cancel are gone, and v2's motion with them. The pop, no pop on discard or cross,
  reduced motion and the exact Undo are now AC21-4.
- **CO9:** the save bar's second line.
- **AA10:** the band pencil opening every section, and the save bar's names.
- **CL262's editing shots.**

Green after: AC2-1…5, 7, 8, 9; CO8, CO10–CO16, CO18; AA1–AA9, AA11–AA14; coMergeFocus M2–M4.

## 5. Shots

`shots/{1512,1280}-NN-*.png` beside the reference's screens 01–14 and 19 (30 files). Two differences from the reference:

- **City field wraps (05, 06):** with "Elsewhere" kept, as the brief asks, four country pills and the city don't fit one row
  in the 540px card. The city field wraps beneath the pills.
- **Pills hidden while typing (10):** the "Suggested" pills hide while text is typed, as the built `GenreChips` does.

## 6. Recordings

`~/ScriptAlly-backups/agent-card-v2-1/acv21-cpu1x.webm` and `acv21-cpu4x.webm` (12 MB each; no report keeps video in the
public repo), at 1512 × 900 with motion suppression lifted. Made by `tests/e2e/acv21Shots.measure.ts`. The sequence follows the
brief, and the light is seen after each tick, after Save all, and running back on Undo.

## 7. Stills

`stills/`:
- `breath-{queried,partial,full,offer,closed}.png` (each stage, in v163's rim for it), and `breath-nq.png` (no query, slate)
- `held-mid-save.png`
- `light-a-third-round.png`
- `undo-light-a-third-round.png`

## 8. Dev bundle

(filled after the deploy)

## 9. For Nick

- **One commit for Phases 1–4** (§3).
- **The QC1611/QC1612 locks are stale against v163** (15 red on the base), and **v163's own locks aren't committed** anywhere.
  Worth asking the v163 session to commit `qc163.measure.ts` and re-point QC1611/QC1612.
- **coMergeFocus M1/M2 were red before this pack** (dim, inert and aria-modal while browsing); not mine to fix.
- **Not built, by the brief:** History's "You changed…" lines (Agent history v1).
- **A thing the undo removes folds away:** there is nothing to apply it to. Adding a note has no Undo on the agent card today
  (its snackbar has none), so no fold runs.
- **Ruling wanted:** with Elsewhere kept, the Based in row wraps at 540px. Keep, or move Elsewhere's combobox below the city?
- **Worktrees:** there were six besides the primary when I started (rule: more than five → tell you). Mine is removed at the
  end; the scratch base and deploy checkouts too.
