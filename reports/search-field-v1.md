# Search field v1 — the bar's search grows to 280px when there's room

19 Nov 2026 · branch `search-field-v1`, cut from `dev/tct1-sv1-qc161` @ `003562e45`, the branch dev was serving
(`index-uSsspMoT.js`). That branch contains `search-v1`. Not deployed; it goes out with the next DEPLOY BATCH. Not
merged to main.

## False premises

1. **"The search field stays in the same spot on every page."** Not on a page whose bar slot holds a control. The
   page slot sits inside the Help wrapper, between the field and the "?" button. On `/agents` the Contact list's guide
   pill sits there at 220.2px, so the whole right group, field included, sits 220px further left: right edge 816.7 at
   1280, against 1036.8 on Dashboard. That was already true of the field before this pack, and this pack does not
   change it (moving the pill is outside "no change to Log a query or Help"). On every page without a slot control, the
   right edge is one x at every width measured (SF-R2, INK7).
2. **"Prove each lock red against the base first."** Only SF-R1 (and the three source/CSS unit locks) can be red on
   the base: there the field is 168 everywhere. The base already keeps the right edge fixed, the tabs named and the
   24px gap, so SF-R2, R3 and R4 were proved able to fail by a mutation of their own, on the base and again on the
   branch. The four new `planWithFolds` cases are green on the base too, by design: the function is unchanged and
   only fed one more room.
3. **"One commit."** Three: the change and its locks (`3ea78cf18`), an INK7 fix after its first green run found the
   `/agents` case above (`926c7b64d`; never amended), and this report.
4. **The reference was missing at the start.** It arrived as `~/Downloads/search-field-v1-pack.zip`. Its one file
   matched `18f290eb…bad031`, and it is enrolled at `design-refs/search-field-v1/search-position-v1.html` and in
   `.refhashes.json`.

## Step 0

Every recon fact held on `003562e45`:
- `FolderTab.tsx` exported `SEARCH_W = 168` and `SEARCH_FOLD_W = 38`.
- `rooms` was [search open, search folded] plus pill folded when there is a pill.
- `WorkspaceShell.tsx` set `searchFolded = foldLevel >= 1` and `slotFolded = foldLevel >= 2`.
- `searchFold.test.ts` held the constants equal to the CSS.

Only `WorkspaceShell` reads the level, through `onFold`.

Tests that read the fold levels or the field's width:
- `searchFold.test.ts`
- `shellTabsV2.measure.ts` (C2)
- `shellTabsV21.measure.ts` (F1–F4)
- `inkShell.measure.ts` (INK7)
- `shellNavV3.measure.ts` (reads the field's left as the strip's limit)
- `st2Recon.measure.ts` (recon only, no assertion on the width)

## The change

| Level | Field | Pill |
|---|---|---|
| 0 | 280 (`data-wide`) | open |
| 1 | 168 | open |
| 2 | 38 icon | open |
| 3 | 38 icon | 38 icon |

- `SEARCH_WIDE_W = 280`, and `rooms` gains a first entry built with it, read from the field's fixed right edge.
  `planWithFolds` and `planStrip` are untouched.
- In the CSS, `.ws-pagebar .ws-sfield[data-wide] { width: 280px; }` sits inside the 768px-and-wider block, so the
  phone is untouched. There is no width transition (the field's only transition is its background).
- Fit rule 5's comment is amended in both `inkShell.css` and `WorkspaceShell.tsx`.

## The four measured widths

| Window | Dashboard (1 tab) | Letters (5 tabs) |
|---|---|---|
| 1512 × 900 | **280** (right 1268.8, tabs clear by 756.1) | **280** (right 1268.8, clear by 309.7) |
| 1280 × 800 | **280** (right 1036.8, clear by 524.1) | **280** (right 1036.8, clear by 77.7) |

Log a query starts at 1280.8 (1512) and 1048.8 (1280) on both pages. Where the field does give way:
- On Versions (rail) the field is open, 280 or 168, down to 1320. It folds to its icon at 1316 with the pill still open, and the pill folds after (ST2.1-F2/F4; that sweep doesn't tell 280 from 168).
- At 1100, Letters, Packages and Comps fold the field (ST2-C2).

## Locks, red then green

**Unit, `searchFold.test.ts`, against the base:** 3 red (the wide width equals the CSS; the strip's rooms; the
shell's levels) and 4 green (the `planWithFolds` cases, as false premise 2 says). On the branch: 16/16.

**Rendered, `tests/e2e/searchField.measure.ts` (SF-R1…R4), on the base:**
- SF-R1 red at both sizes: "168 where 280 fits" on both pages. Dashboard's tab ends at 232.8; a 280 field would
  start at 988.8 (1512) or 756.8 (1280).
- R2, R3 and R4 were clean, and each saw its own mutation:
  - R2: the field shifted 20px on Letters.
  - R3: the tab names clipped.
  - R4: the strip pushed under the field. My first R4 mutation, a widened field, did not reach Dashboard's single
    tab, so it was replaced.

**On the branch:** SF-R1…R4 green at both sizes, and every mutation seen.

## Tests repointed

- **`inkShell.measure.ts` INK7.** Was "168px, at one x on every route" (the left edge). It is now "280 or 168px, 12px
  before Log a query, its right edge at one x on every route whose page slot is empty". Routes with a slot control
  (`/agents`) are logged and left out. Green at 1280, 1440 and 1710.
- **Unchanged and re-run green on the branch:**
  - `shellTabsV2` ST2-C2
  - `shellTabsV21` ST2.1-F1, F2, F3 (rail and pinned) and F4. Their `searchOpen` reads "wider than 100 with its word",
    which covers 280, and their mutations force 168 or 38 explicitly.
- **Not run:** `shellNavV3.measure.ts` (it reads the field's left edge as the strip's limit, which this change keeps
  correct by construction) and `st2Recon.measure.ts` (no assertion on the width).

## Gates

| | Baseline (`003562e45`) | Branch (`3ea78cf18`) |
|---|---|---|
| tsc | 0 errors | 0 errors (and 0 on `926c7b64d`) |
| build | clean | clean |
| Vitest | 12925 passed, 2 failed | 12932 passed, 2 failed |

The two Vitest failures are `src/test/firestoreTarget.test.ts`, the same two on both sides.
