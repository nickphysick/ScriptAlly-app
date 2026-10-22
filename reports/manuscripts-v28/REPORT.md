# Manuscripts v28: the edit drawer, genres, UK ages and the page foot

Branch `manuscripts-v28` (worktree `../ScriptAlly-ms28`), cut from **f37121e9**, the tip of `dev/css1-pv3-ms27`, which
dev served as `index-CCHtLZcn.js` (v27). One commit per part (D is two), then this commit with the locks and the report.

## False premises

1. **"Nick sees a centred pop-up, not the slide-in drawer"** is true, but the drawer it names did not exist for this page.
   Edit details was `Msv21EditDetails`, a centred modal (`useOverlay`), on every entry. v27's book view is not a drawer
   either: it is a full-screen book (`BookView`). The drawer the rest of the app uses is the shared `HalfDrawer`
   (`shell/HalfDrawer.tsx`, the Contact list's and Comparable titles'), and Edit details is now built on it.
2. **"`genre` holds the primary id and `subGenres` ids."** Both hold **labels** ("Thriller", "Literary Fiction"); the
   app has always stored labels and resolved them with `canonicalIdOf`. All ten manuscripts on the harness accounts store
   a label. v28 keeps labels (the storage convention every reader expects) and searches and matches by id.
3. **"List the distinct `ageCategory` values on dev agents."** Agents have no `ageCategory` field. The age an agent
   represents is read from their genre list (`agentAgeCategories`), and on the harness accounts no agent genre names an
   age at all. The normaliser covers both spellings there too.
4. **"Shots using Nick's own account."** I can't sign in as Nick (no password, and I may not enter one). Every shot and
   lock uses the dedicated harness account `ms21-filled` ("Harbour of Glass", by Isla Morven).
5. **The mock lists Psychological horror before Psychological thriller for "psych"; lock D1 wants thriller first.**
   Both score as a sub-genre prefix match, and the mock breaks the tie alphabetically. The search now breaks a tie by
   relatedness to genres already picked (Thriller is the main genre), then alphabetically. With nothing picked it
   matches the mock.
6. **The mock's drawer shows four statuses; the app has six** (Drafting, Revising, Ready to query, Querying, On
   submission, Shelved). All six are kept: a status the drawer couldn't show would be unsettable.
7. **"Remove Setting" covers two places, but only one could render.** v27's book view row is removed. v21's
   `bookFacts` (`lib/manuscriptV21.ts`) still names Setting but has no caller outside its tests, so it can't render.
   It is left alone. `setting` stays in the type and on stored records (two harness books hold "West Cork, today").

## Step 0

- **References:** all 11 files present and every SHA256 matched. Enrolled at `design-refs/manuscripts-v28/` and in
  `.refhashes.json` (742 guarded).
- **Edit details before:** `Msv21EditDetails`, a centred modal, from the header, the book view and the guide's steps.
- **Stored ages (read-only scan, `tests/e2e/ms28Scan.mjs`, five harness accounts):** manuscripts `"Adult"` × 10;
  agents none (no field; no age in any agent genre). **Nothing failed to map.**
- **Setting and series:** both optional strings. `setting` is read by v27's book view row (removed) and v21's
  uncalled `bookFacts`. `series` is read only by the book view and the drawer. Neither appears in exports, Smart
  Import or `functions/`. No stored `series` on any harness book.
- **Drop-downs reachable from the page and its drawer:**

  | Control | Outside press | Escape | Tab away | Pick |
  |---|---|---|---|---|
  | Genre search (drawer, new) | yes | yes, the drawer stays | yes | yes |
  | Age "Other" menu (drawer, new) | yes | yes, the drawer stays | yes | yes |
  | Guide popover (`PageChecklist`) | yes | yes | **no → yes** (opt-in `closeOnFocusOut`) | starts a step |
  | Status | — | — | — | a segment, not a menu |
  | Shell menus (Help, Log a query, folder +N, switcher, palette) | shared shell; inventoried, not changed | | | |

  The two new menus use one helper, `shell/useDismissable`. The guide's popover gets the same behaviour through an
  opt-in prop that only Manuscripts passes, so the Contact list and Query Centre keep exactly what they had.

## D2: aliases moved, and every matcher changed

**Aliases moved onto the new sub-genres:**
- thriller: "psychological thriller", "domestic thriller"
- crime: "noir"
- mystery: "whodunit", "whodunnit"
- cosy-crime: "cosy mystery", "cozy mystery"
- horror: "gothic", "gothic horror"
- fantasy: "epic fantasy"
- romance: "romcom", "rom-com", "romantic comedy"

Each alias now resolves to its sub-genre, which matching still counts as the parent.

**Matchers now going through `genreAndAncestors`:**
- `genreMatch.bookGenreHit`, via the new `bookKeys`. This covers `takesBook`/`takesMain`: the Contact list's tint and ready list, the strip, the next step, the Scout, Discover's picks and Housekeeping.
- `genreMatch.isGenreMatch`: the agent card's tint and `contactEdit`.
- `communityMatch`'s genre score (the Discover score): an agent listing only Thriller scores 20 for a psychological-thriller book.

**Agent pickers stay on main genres:** `GenrePicker` and onboarding's `GENRE_LIST` filter out `parent`.

## Locks (MSV28)

Rendered at 1512 × 900 and 1280 × 800 (`tests/e2e/manuscriptsV28.measure.ts`), green on this build at both widths:

| Lock | Green reading | Named mutation (1512) → red | Natural red (dev, v27) |
|---|---|---|---|
| A1 drawer | header, book view and guide step 1 each open it: fixed, right edge 8 from the viewport, left 864 / 632; no modal | — (v27 *is* the old modal) | "header: the form is inside the drawer" |
| A2 sections | The book · Logline · Elevator pitch · Synopsis · Series; no Setting | Setting row restored → "the book view" not /Setting/ | no drawer |
| B1 series | on writes "Part of a series", off omits the key; the book view reads it, then "Standalone" | `""` when off → "the key is omitted" | no drawer |
| B2 copy | both tags and hints exact | v27's pitch hint → mismatch | no drawer |
| C1 hint | 80,000 and 55,000 silent; 50,000 "well under"; 115,000 "well over" | 0% margin → 80,000 speaks | no drawer |
| D1 search | "psych" → Psychological thriller · in Thriller · 70,000 – 90,000 words first; "litfic" → Literary fiction; own row last; ↓ Enter picks row 2 | alias matching dropped → litfic finds nothing | no drawer |
| D2 promote | ↑ Main swaps in one press; stored `genre` "Psychological thriller", `subGenres` ["Thriller"] | ↑ Main does nothing → main stays Thriller | no drawer |
| E1 age | Adult · Young adult · Middle grade · Other; Other: Young fiction · Picture book · New adult | old order → order mismatch | no drawer |
| E2 legacy | "Early Reader" / "Middle Grade" / "Young Adult" show as Young fiction / Middle grade / Young adult in the book view and the control | normaliser removed → "Early Reader" | no drawer |
| F1 foot | foot 28.0 above the content bottom; tiles 275.25 = 275.25 (1512), 175.25 = 175.25 (1280) | flex fill removed → 139.25 | foot missing |
| G1 dismiss | 13 readings, all closed; Escape leaves the drawer open | four: opt-in removed (guide Tab), `focusin` removed (both menus' Tab), `pointerdown` removed, escape layer below the drawer | no drawer |

D3 and D4 are unit locks (`lib/manuscriptV28.test.ts`), and so are the unit halves of B1, E1, E2 and F1's copy
(`v28/msv28Smoke.test.tsx`, `lib/ageCategories.test.ts`). Proofs: `mutation-proofs.jsonl`, `natural-reds.jsonl`.

**The A1 mutation ("re-wire one entry to the old modal") is the natural red:** the old modal is deleted, and the v27
build dev serves *is* every entry on the old modal.

**The natural reds are coarse.** On v27 every drawer lock fails at "the drawer opens", before reaching its own claim.
The named mutations are the lock-specific reds.

**G1's first version was vacuous.** It read `offsetParent`, which is null for a `position: fixed` element. So the
fixed guide popover read as closed while it was open, and the first mutation stayed green. The helper now reads the
rendered box, and that mutation goes red.

**B1, D2 and E2 write to the ms21-filled book**, and put it back through `tests/e2e/ms28Fixture.mjs`, which checks the
restore. After every run the book read `{"genre":"Thriller","ageCategory":"Adult","wordCount":50000}`, as before.

### L1: no regression (this build)

All green:
- MSV27: 23 passed.
- CL19: 15. CL19.1: 9. CL19.2: 9. CL18.3 F-locks: 6. CL20-G: 3.
- QC139: 12. QC140 G: 2. QC140.1 B1: 3. QC141: 10. QC141.1: 5.
- Unit: genre, Smart Import, contact list, community match, Discover, agents and import: 24 files, 338 tests.

**Changed deliberately, in `manuscriptsV27.measure.ts`:**
- A1 expects the foot, not the strip.
- A4 is retired; its copy moved to F1 and the smoke test. The floor drops from 120 to 110.
- B2: Series is always a row ("Standalone"), and Setting is gone.
- C1: the new pitch hint.
- C2 measures the drawer's body.
- D1/D2 press Cancel by `data-ms21="cancel"`.

**Unit:** `msv27Smoke` drops the strip tests, `msv21Smoke` drops the edit-dialog test, and `setupScreens.test`'s
baseline swaps in the new age block.

### Gates

`tsc` clean. The production build has no CSS warnings. Vitest: 643 files pass. The same three `functions/` files are
red as at baseline (they need `functions/node_modules`, which the worktree doesn't have).

The marketing font lock fails on **commits A–D1**: the drawer's sheet named "Source Serif 4" literally until D2
replaced it with `var(--sp-serif)`. From D2 on it is green.

## Shots

In `shots/`, beside each `design-refs/manuscripts-v28/screens/*` file, at both widths, on the harness account (see
false premise 4).

## Left open

- **TODO(illustration):** the two tiles' art slots in the page foot.
- **TODO(gating):** whether Versions in the foot should read as Pro, as the sidebar's does.
- **Onboarding's genre step still promotes by pick order** (`pressGenre`). v28's rule (↑ Main) applies to the drawer
  only.
- **Shell menus** (Help, Log a query, folder +N, switcher, palette) don't all close on Tab away. They are shared and
  were out of scope.

## Integration and deploy

See the next section, added after the deploy.
