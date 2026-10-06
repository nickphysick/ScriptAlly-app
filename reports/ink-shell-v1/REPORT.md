# Ink shell v1 — report (6–7 Oct)

Built in a worktree at `main`'s tip (`46573d0a`) because the primary checkout carried another session's
uncommitted report PNGs. **Nothing is pushed and nothing is deployed.** The commits sit on the
worktree `../ScriptAlly-ink` (detached HEAD, tip in the last section) for Nick to fast-forward `main`.

## False premises (first)

1. **The pack is a zip.** `~/Downloads/ink-shell-pack/` does not exist; `ink-shell-pack.zip` does. All
   three hashes match the brief and are enrolled.
2. **The fillet path.** The brief quotes `M0 0V12H13V12A12 12 0 0 1 1 0Z` (13×12) *and* says "copy it
   from the reference verbatim"; the reference draws `M0 0V12H12A12 12 0 0 1 0 0Z` in a 12-unit viewBox
   stretched to 13px. Against the normative golden at 3×, the reference's path is **38** pixels off in the
   fillet's region and the quoted one **76** — **the reference's ships.**
3. **"Full names fit for every group at 1280" is false for Materials** — on all three of its pages the
   row needs 643–656px of a 597px limit (sidebar expanded), so its last sibling is an icon. At 1440 and
   1710 every group fits. INK6 asserts the rule against its own arithmetic at 1280.
4. **The feedback card does not fit at 820px.** The column needs ~917px with the card at 1440 (the ref's
   own column is ~918px of content in an 878px frame). At 900 the literal 820 put Noteboard under the
   card. **The fold is 920px** — a measured deviation; below 820 the button still shows.
5. **Neither toolbar named for the pinned hairline actually pins.** The To-do controls row scrolls with the
   page; the Contact list's letter tabs stopped being sticky in v13 (its slim bar draws its own rule).
   The utility is built and proved (INK15 injects a pinned toolbar); no page is opted in.
6. **There are far more overlays than named:** 11 right-hand drawers (brief: 4), 10 corner floats, 9 toast
   sites. Coverage below.
7. **Settings mode puts a second nav on the sidebar** (`SettingsRail`, dark on light) — restyled on ink.
8. **The beta strip renders on phones** — it retires only at ≥768px (INK19).
9. **`theme-color` was already set** (`#e7e0d5`) for every tier, marketing included — the shell sets ink
   while mounted at ≥768px and restores the original on unmount.
10. **The reference's collapse toggle is not 28px wide.** It has no `flex: none`, so in its own render it
    shrinks to its 16px icon and the logo row fits; ours held 28 and overflowed 11px (INK4 found it).
11. **The e2e suites already contradicted each other** about the bar before this pass (shellV3 L2 vs
    Q2/PH6, pageHeaderV1 vs Q3, shellV3 L6 vs dashTopRow).

## Deviations, deliberate

- **"Upgrade" folds into the plan line** ("Free plan · Upgrade"); the full-width row cost 44px the column
  does not have. It stops propagation inside the account row; the account menu and Settings remain routes.
- **The feedback panel opens from the sheet's bottom-LEFT**, beside the card that opens it (it was
  viewport bottom-right, beside the retired FAB). It used to hang off the dock's right edge — anchored
  left, it covered its own toggle; INK13 found that.
- **The To-do refusal toast keeps its pink** ("pink is for a refusal and only for a refusal"); it moves
  with the other toasts.
- **The Dashboard's status-undo toast is moved but keeps its inline parchment skin.**
- **`.sv2-fade` and `.wpg-hem` are hidden on the desktop, not deleted** — the phone still draws both.

## Step 0

In full: [`STEP0.md`](STEP0.md). No ✗ — `main` held Contact list v13 7/8 and 8/8; no page reads a shell
token this pass re-values (new `--ink-*` tokens only); `usePalette` already opens from a click.
Baselines: tsc clean, `build:dev` clean, Vitest 528 files / 8,355 tests.

## Commits

| | |
|---|---|
| `edb57910` | 0/6 — the pack enrolled, Step 0 |
| `d8457c5f` | 1/6 — the frame and the sheet, tokens, BETA chip, theme-color |
| `aed1b2fe` | 2/6 — the bar: folder tab, search field, Log a query, Help apart |
| `e24b0bd4` | 3/6 — the sidebar: logo row, selector, nav, feedback card, foot |
| `e7657218` | 4/6 — collapse |
| `f7b93278` | 5/6 — clean edge, inset drawers, floats and toasts on the sheet |
| `3e6846a7` | 6/6 — focus on ink, selection, scrollbars |
| `59bdff89` | the locks INK1–19, two fixes they found, CLAUDE.md, the retirement manifest |
| `d143aa5f` | the fillet takes the reference's path; INK4 checks the fillet's region |
| (this) | the report and screenshots |

Final gates: tsc clean, `build:dev` clean, **Vitest 530 files / 8,366 tests green**.

## The locks — red before, then green

`tests/e2e/inkShell.measure.ts`, rendered at 1280/1440/1710 with fonts loaded (INK3/4 at 3×, INK19 at
390). **Final run on the ink build: 20/20 green.**

- **Red on `main`** (run against a build of `46573d0a`): 18 of 19 red. INK19 is green on `main` by
  definition (it asserts the phone matches `main`); its proof is the mutation.
- **Mutations** (`mutation-proofs.jsonl`; applied *in the page* — a stylesheet or a DOM edit — via
  `INK_MUTATE`, not by rebuilding):

| Lock | Mutation | Kind | Verdict |
|---|---|---|---|
| INK1 | sidebar back to stone | CSS | red — `.ws-panel at 1280 in t-capp` |
| INK2 | tab given a literal | CSS | red — tab vs sheet |
| **INK3** | **remove the 1px overlap (`bottom: 0`)** | CSS | **GREEN — not proved.** At whole-pixel layout the tab's foot and the sheet's top abut exactly, so removing the overlap draws no seam. The overlap guards fractional layouts this harness does not produce. |
| INK4 | fillet → radial gradient | CSS | red — but only after adding a fillet-region check (112 px off vs a bar of 60; shipped 38). **The brief's 0.5%-of-the-crop budget alone stayed green (0.081%).** |
| INK5 | tab inset 24px | CSS | red — tab 272 vs sheet 248 |
| INK6 | current page put in "+N" | DOM | red |
| INK7 | search centred | CSS | red — gap 116.8 |
| INK8 | capture copy left in the sidebar | DOM | red |
| INK9 | Give feedback back in the bar | DOM | red |
| INK10 | old book-tile cover | DOM | red — cover is tile |
| INK11 | anthracite pill | CSS | red |
| INK12 | plain number | CSS | red |
| INK13 | card removed | DOM | red |
| INK14 | animate under reduced motion | CSS | red — durations 0.24s |
| INK15 | foot fade restored | CSS | red |
| INK16 | full-height drawer | CSS | red |
| INK17 | tab anchored to the window | CSS | red — right gap 12 |
| INK18 | toast at window-left | CSS | red — centre 131 vs 840 |
| INK19 | ink applied to mobile | CSS | red |

**Coverage, honestly:** INK16 measures Birds-eye and the action drawer; HalfDrawer, the To-do slide-over,
the query panel, the package drawer, the Noteboard and Calendar drawers are styled by the same rules but
not measured. INK17 measures the Birds-eye tab, the Housekeeping tab and the Analytics tab; the dock and
parked chips are restyled but not measured. INK18 measures the app toast; the undo bar, the To-do toast
and the edit-query toast share the rule but are not triggered.

## Toast sites moved

ToastProvider (`.sa-toasts`) · query undo bar (`.qad-toast`, was bottom-left) · To-do toast (`.tdb-toast`,
was bottom-left) · edit-query success (`App.tsx`, was bottom-right) · Dashboard status undo (position only)
· Dashboard note toast (inline position). **Not moved:** the Calendar receipt (`.tl-acttoast`, absolutely
positioned inside its page — page internals), the To-do v2 active-filters pill (not a toast), the Smart
Import pill (onboarding, outside the workspace).

## Screenshots (`shots/final/`)

Expanded and collapsed at 1440 and 1710: `qc-*`, `contacts-*`, `todo-*`, `comps-*`, `dash-*` ·
`drawers-1440.png` (Birds-eye with the action drawer on top) · `toast-1440/1710.png` ·
`overflow-1440/1710.png` ("lots of pages": names → icon → "+4", menu open) · `tab-foot-3x.png`.

## Deferred, with proposed owners

1. **Fast-forward `main` to this worktree and push** — Nick.
2. **The retired e2e suites** (`tests/e2e/RETIRED-ink-shell-v1.md`) will go red on the ink build: delete
   or re-point them — the next shell pass.
3. **The masthead eyebrow now duplicates the tab's group** on non-living routes (the shell still supplies
   it to `PageHeader`) — a page-header pass; this pass was told not to touch headers.
4. **The 820 vs 920 card fold** — Nick's ruling; 920 ships because it is what fits.
5. **INK3's mutation cannot be seen at integer layout** — a fractional-zoom variant of the lock, next harness pass.
6. **Opting real pinned toolbars into the hairline** once a page has one — whichever page pass adds it.
7. **The default page guide** (`.pgd`, viewport bottom-right) still overlaps the Birds-eye tab on the Query
   Centre, as it did before — the Query Centre pass.
8. **`.ws-panel.sb-ready .ws-pin`'s transition beats the settings-mode fade** (`.set-mode .ws-pin`) at
   higher specificity — pre-existing, noticed here, not changed.
9. **The `git checkout --` I used once in this worktree** to undo my own edit to `AppShell.tsx`: it is on
   CLAUDE.md's forbidden list for shared checkouts; this worktree was mine alone and nothing else was at
   risk, but it is recorded.
