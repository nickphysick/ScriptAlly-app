# Log a query — step 3 opens on a Package / Materials fork (v1)

Branch `laq-materials-fork-v1`, cut from `dev/smv31-vv6-cp32` @ 345ccfed1 (what dev served: `index-C_PGqmGZ.js`).
Design pack: `~/Downloads/log-query-materials-fork-v1-pack.zip`, every checksum OK.

## What changed

One component and its stylesheet. Nothing else in the wizard, the data model or the save.

- `src/components/queries/centre/QcLogStages.tsx`: the Materials stage is now three screens under "3 Materials":
  the fork (two tile buttons), the packages, and the pieces (three single-choice groups). New state on `FlowState`:
  `mat` (`"fork" | "pkg" | "pcs"`, which replaced `custom`) and `picked` (the pieces screen's own picks). The old
  tick-box rows, their value pills and the "Which letter / synopsis / version?" pop-up menus are gone.
- `src/components/queries/centre/qcLogStages.css`: the fork and group styles added; the 32 lines that only styled
  the old picker deleted.
- `src/lib/queryActions/logStages.ts`: the ask card's difference line now says "Synopsis isn't chosen." (it said
  "ticked", and nothing is ticked now). The unit test follows.
- No component added. `LogStagesHost` (the one host, used by the Query Centre, the Contact list and the drawer's
  panel) is unchanged.

### How it holds state

- **Only the screen carried on from is saved.** A package tap writes `pieces` from the package, exactly as before
  (`usePackage` is the same code). The pieces screen works on `picked`, and Carry on copies `picked` into `pieces`.
  `answers()`, `planOf`, `logPayload` and `saveLog` are untouched, so the record is built the same way from the same
  four values (`packageId`, `letterId`, `synopsisId`, `sample`).
- **Picks survive** Back to the fork, and a trip to the packages, for the life of the wizard.
- **Coming back to step 3** (Back from How, or the stepper's Materials) opens the screen carried on from, with the
  choice showing (`matOf`).
- A door that names a package (a package's builder) opens step 3 on the packages with it pressed. "Log another"
  carrying a package opens on the packages; carrying pieces opens on the pieces.

## The four cases

1. **Could the old picker carry on without a letter, synopsis or version?** Yes. Continue was enabled with any one
   piece ticked (`disabled={!anyPiece}`). Kept: Carry on shows as soon as any one piece is picked, and a second tap
   on a picked choice clears it, so a piece can still be left out. So "one of each" would be untrue, and I shipped:
   - Materials tile foot line: **"Choose what went"** (proposed; the prompt had "Choose one of each")
   - Pieces screen tip: **"Pick at least one to carry on"** (proposed; the prompt had "Pick one of each to carry on")
2. **No saved packages / packages on the plan.** The log flow does not gate packages by plan: it shows whatever
   packages the book has (`packagesFor`), on any plan. There is no upsell or empty state in step 3 today. With no
   packages the fork keeps both tiles, the package tile says **"No saved packages yet"**, and tapping it leads to what
   step 3 showed with no packages: the pieces. "Use a saved package instead" is hidden then, as "Back to your
   packages" was. No new copy beyond that foot line.
3. **A type with nothing in it.** The old picker used a stand-in (ticked, recorded with no version id): a letter
   named "Query letter", a synopsis named "Synopsis". The groups keep it: one choice with that name. A book with no
   book versions recorded the sample with no version; the version group then offers one choice named after the
   book's title. No "none sent" option.
4. **Other entry points.** There is no edit-an-existing-query path into this step (editing is on the query card).
   Every door (Query Centre, Dashboard, Contact list, agent card, package builder, the drawer's panel) mounts the same
   `LogStagesHost` → `QcLogStages`, so all get the three screens. The dashboard first-visit flow does not reach it.
   **Not phones:** under the phone breakpoint `QueryDrawer` still walks the older `LogJourney` ("until the phone has
   a design of its own"), which has its own materials step. Left alone: out of scope, and a different design.

## Copy changed from the prompt

- "Choose one of each" → "Choose what went"; "Pick one of each to carry on" → "Pick at least one to carry on" (case 1).
- "No saved packages yet" for the package tile with none (the prompt's own suggestion, case 2).
- The nil hint "…so tell us what went." is used on all three screens, not only the fork: nothing is ticked anywhere now.
- The ask card's "isn't ticked" → "isn't chosen", and its screen-reader mark "not ticked" → "not chosen".

## What the mock does not show, and what I kept

- **The sample's size.** The old picker recorded how much of the opening went (chapters / pages / words, a section).
  That is saved data, so it stays: once a version is picked, a line says "Sending the first 3 chapters of
  {version}." with **Change**, which opens the app's own sample control (unchanged) inline. When the agent's card
  says nothing, it opens the moment a version is first picked, as the old picker opened on ticking Opening pages.
- **The ask card** ("What Marcus asks for", "Use what … asks for") stays on all three screens, as it was on both old
  views. On the fork with no packages it offers the button without "None of your packages matches it."
- **Starting picks.** When the agent's card states what they ask for, the pieces start from it (as before). When it
  says nothing, the pieces start empty (the mock's 03): the old picker pre-ticked the newest letter and synopsis.

## What I could not match

- **Side by side only on the wide panel.** The log panel is 540 wide above 1400px of window and 504 at or below, so
  the prompt's "stack below roughly 520 of modal" means the tiles stack on most laptop screens (1280: stacked;
  1440: side by side). Measured: MF-1. If side by side should hold at 504 too, the breakpoint is one line.
- **Sizes.** The mock was drawn at 640 wide; the panel is 504–540, so tiles are 248 tall (not 320), options 52
  (not 64), type a step smaller. Colours and radii are the mock's; the shell is the live modal's.

## Measurements (emulator, `npm run e2e:emu`)

`tests/e2e/laqFork.measure.ts` (new), over `seedLaq13.mjs` (which gained a read-only `--materials` reader):

- MF-1 the fork: two button tiles, ≥44 tall, the nil hint, "2 saved packages", "Choose what went", "Tap one to carry
  on"; side by side at 540 (237 + 237), stacked at 504; Tab reaches a tile with a focus ring.
- MF-2 each tile opens its screen; Back from either is the fork; three groups in order, each "Pick one"; nothing
  labelled "Opening".
- MF-3 tip until a piece is picked, then Carry on; the footer 69px tall both ways (no shift); aria-pressed and a filled
  ring; one per group; a second tap clears; picks survive Back.
- MF-4 pick pieces, switch, tap First round → How; the stepper reads "First round"; back on step 3 lands on the
  packages with it pressed; the picks are still there; Carry on → "3 pieces"; Back from How → the pieces.
- MF-5 saved records, read back from the emulator and undone in the run:
  - package: `sentHow: package`, `sentPackageId`/`packageId: laq13-pa`, `sentVersions: [la, s1]`,
    "First round package: Query letter Letter A · Synopsis One-page synopsis · first 10 pages · Version 2"
  - pieces: `sentHow: individual`, `packageId: ""`, `sentVersions: [lb, s2]`,
    "Query letter Letter B · Synopsis Two-page synopsis · first 10 pages · Prologue cut, flashback first"

**Byte-for-byte:** shown by the code path, not by a side-by-side run against the old build. The save is built only
from `answers()`, which this change does not touch, and both screens hand it the same `Pieces` shape the old picker
did. A run of the old bundle on the same fixture was not done.

Updated to the new screens: `laqV1`, `laqV12` (V12-4/V12-5 now drive the groups and Change), `laqV13` (V13-1 rewritten
for the groups), `qc149`, `laqShots`, `laqScreens11`, `qc149Shots` (through the shared `carryOnMaterials`).
`laqFidelity12` deleted: every one of its states was the v1.2 Materials stage this replaces. `laqFidelity13` panels
01–02 retired (the v1.3 pieces). The fidelity and screenshot walkers were not run (old designs' references).

Touched specs, one run on the final code: **18 of 19 pass** (laqFork MF-1–5, laqV1, laqV12, laqV13). The one red is
V13-4's last check, "the Query Centre's slip says the same": it looks for `[data-qc153="slip"]` on the Query Centre,
which Query Centre v154 replaced with `QcCard154` (`data-qc154`). Its step-3 path, the save and the close date
surviving a reload all pass; the stale selector is not this change's. Reran alone once: same.

Two things the runs caught and this branch fixes: the pieces screen painted empty for a frame before the agent's
asks filled it (the picks are now set as the screen opens); and the sample control's Done line stopped 3px short of
view (the scroll was measured during the control's 3px fade-in; it now waits for the fade to finish).

## Gates

tsc clean (with an 8 GB heap: the default heap runs out). Build clean. Vitest: 12,707 pass; 4 fail in 3 files, 3 of
them pre-existing on the base and not in this diff: `emuGuard.test.ts` (`tests/e2e/cb21Emu.sh` calls the emulator
directly) and `firestoreTarget.test.ts` ×2 (23 older `tests/e2e/*.mjs` scripts). The fourth was mine (a duplicate
`.laq` rule and a radio class that clashed with the Nudge stage's) and is fixed.

## For the merge

`docs/decisions/query-actions.md` is on main but not on the dev line: add a "Materials fork v1" section there from
"How it holds state" and "What the mock does not show" above.
