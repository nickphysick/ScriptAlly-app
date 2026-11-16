# Manuscript spine v1 — report

16 Nov 2026 · branch `manuscript-spine-v1`, cut from the dev line
`dev/srm1-plv3-qc156-clq1-tdi-qc1561-tdi-clq11-td56-ql24-align-pk43-wsh1-wsh11-onf1-co1` @ 72200ba17
(the line dev was serving, `index-BEFE4y63.js`) · worktree `/Users/nickphysick/ScriptAlly-msp1`
· ref `design-refs/shell/manuscript-spine-v1.html` (SHA256 `3eba93d2…1917f`, matched).

## False premises

1. **The collapsed rail's selector is BarSwitcher with `placement="rail"`, not `"side"`.** `"side"` is the
   expanded sidebar's picker (`.ws-pin`). Both are BarSwitcher, both stay mounted (the hidden one `inert`), so the
   spirit of the STOP condition holds and I carried on. All rail work is on the `"rail"` branch; `"side"` is
   untouched.
2. **The ref was not in the repo.** It was in `~/Downloads/manuscript-spine-v1.html` (and an identical
   `… (1).html`), hash matching. Copied in and enrolled in Phase 1.
3. **The rail's tile tooltip was the shell's `railTipFor` ("{title} · switch manuscript"), not a native `title`.**
   The rail button had no `title` attribute; the expanded picker's button does and keeps it. The rail's tooltip is
   retired with the tile, and the new button carries no `title` (locked, MSP-U1).
4. **"The same condition that shows the SOON tag in the menu"** is not a condition today: the menu's
   "Add a manuscript" row is drawn disabled with SOON unconditionally. I added one exported constant,
   `ADD_MANUSCRIPT_SOON = true`, that the label reads. I left the menu's row alone, because the brief puts it out
   of bounds. Its comment says that switching adding on means flipping the constant and enabling that row in the
   same change.
5. **The harness account holds seven manuscripts**, so "many" is the natural state. The one-, two- and
   no-manuscript cases delete and restore manuscripts inside the test.

Not a premise, but worth knowing: `shell-tabs-v2` (worktree `ScriptAlly-st2`) has open changes to `inkShell.css`
and `sidebarRail.css`. They touch the logo (`.wsr-lgo { top: -4px }`, relative, so nothing moves) and the rail's
background, not BarSwitcher or the rail's foot, so that STOP did not apply. `git worktree list` showed 6 worktrees
besides the primary (over the CLAUDE.md threshold of 5); none were cleaned.

## Step 0 — what the collapsed rail was

- **Selector:** `SidebarRail.tsx` rendered `<div className="wsr-mswrap">{switcher}</div>` directly under
  `.wsr-lgo` (the hawk). `switcher` was `<BarSwitcher placement="rail" railTileFor={railTileNode} railTipProps=…>`
  from `WorkspaceShell.tsx`. Its button was `.ws-ms-btn.wsr-ms` holding `railTileNode`'s `.wsr-init`: a cream
  30×40 paper tile with the title's initials from `lib/railTile.ts` (e.g. "MD"). CSS: `.wsr-mswrap`,
  `.wsr .wsr-ms` and its `:hover` background, and `.wsr-init` in `sidebarRail.css`.
- **Foot:** `.wsr-fb` (the Feedback button: `.wsr-fbi` outline icon, `.wsr-t` label, `data-probe="feedback-rail"`,
  `margin: 12px 0`) then `.wsr-foot` holding `.wsr-av` (the initials, which open the account menu).
- **Menu:** the portalled `.ws-ms-menu--port.sa-pop`, placed at `{ left: btn.right + 10, top: btn.top }` on the
  rail.

## Commits

| Commit | What | Files |
|---|---|---|
| `e618d4cd1` | Phase 1: cloth spine at the foot of the collapsed rail | `design-refs/.refhashes.json`, `design-refs/shell/manuscript-spine-v1.html`, `src/components/shell/BarSwitcher.tsx`, `SidebarRail.tsx`, `WorkspaceShell.tsx`, `manuscriptSpine.css` (new), `sidebarRail.css` |
| `a3ce30627` | Phase 2: the cloth label | `src/components/shell/BarSwitcher.tsx`, `SpineLabel.tsx` (new), `manuscriptSpine.css`, `spineFacts.test.ts` (new) |
| `02b8daebb` | Phase 1 fix: the shelf line 10px above Feedback, as measured | `src/components/shell/manuscriptSpine.css` |
| PHASE3-SHA | Phase 3: locks, measures and screenshots | `src/components/shell/manuscriptSpine.test.tsx` (new), `tests/e2e/manuscriptSpine.measure.ts` (new), this report, `readings.txt`, `shots/` |

The fix commit exists because the first measurement found Phase 1 wrong. Phase 1 had set the slot's
`margin-bottom: -2px`, reasoning from Feedback's declared `.wsr-fb { margin: 12px 0 }`. On the rendered page that
margin is **0**: `.wsr button { margin: 0 }` outranks it. The line landed 2px *inside* Feedback's box
(line bottom 874, Feedback top 872). A slot margin of 10px measures 10.0 at both sizes.

## Gates — baseline against final

Gates are "no worse than baseline". Each line below is quoted whole from its output.

| | tsc | build | vitest |
|---|---|---|---|
| Baseline (72200ba17) | `tsc exit 0`, 0 errors | `build exit 0` (the chunk-size note only) | `Tests  3 failed \| 12612 passed \| 4 skipped (12619)` · `Test Files  2 failed \| 872 passed \| 1 skipped (875)` |
| Phase 1 | 0 errors | exit 0 | `Tests  3 failed \| 12612 passed \| 4 skipped (12619)` |
| Phase 2 | 0 errors | exit 0 | `Tests  3 failed \| 12617 passed \| 4 skipped (12624)` (+5 spineFacts) |
| Final (fix + phase 3 tree) | 0 errors | exit 0 | `Tests  3 failed \| 12627 passed \| 4 skipped (12634)` · `Test Files  2 failed \| 874 passed \| 1 skipped (877)` (+10 spine locks) |

The three failures are the same at every step and were there before any edit:
`emuGuard.test.ts › no recipe under tests/ starts an emulator without the guard` (it names
`tests/e2e/cb21Emu.sh`), and the two `firestoreTarget.test.ts › every e2e and script entry point carries the live
guard` cases.

Two notes on the environment. `tsc` on this line runs out of heap at the default 2 GB (exit 134), so every run used
`NODE_OPTIONS=--max-old-space-size=8192`. The very first vitest run had 12 failed files because the worktree had no
`functions/node_modules`. I symlinked the primary's (as CLAUDE.md does for the root one) and re-ran; that re-run is
the baseline above.

## Component by component — the old collapsed tile

| Part | Fate |
|---|---|
| `.wsr-mswrap` slot under the logo | **Retired** (markup and CSS). The nav moved up into it. |
| `.ws-ms-btn.wsr-ms` button, its hover square | **Retired** on the rail. The new button is `.ms-spine-btn`: no hover or open background, no outline at rest. |
| `.wsr-init` initials tile, `railTile()` | **Kept** — the expanded picker (`placement="side"`) still wears it; the rail no longer passes `railTileFor`. |
| `railTipProps` prop and the "· switch manuscript" rail tooltip | **Retired** (prop removed from BarSwitcher; only the rail used it). |
| Uploaded cover on the rail | **Retired**: the spine is always cloth. The expanded picker and the menu rows are unchanged. |
| `data-shell="switcher"`, `data-placement="rail"`, the `.ws-ms` root | **Kept**, now also `.ms-shelfwrap`. |
| The menu, `onPick`, the toast, `STAGE_REPLAY_EVENT`, the M key's guards | **Kept**. The menu's placement on the rail changed (stands on the spine's foot, grows up). With one manuscript the rail renders no menu at all. |
| `aria-keyshortcuts`, the accessible name | **Kept / reworded**: "Manuscript: {title}" (was "Manuscript: {title}. Switch manuscript"). |

## Locks

No existing lock asserted on the collapsed tile. A search for `wsr-ms`, `wsr-mswrap`, `wsr-init`,
`railTipProps`, `ws-ms--rail`, `placement="rail"` and "switch manuscript" across `src/` and `tests/` found only
`sidebarRail.css` (the `.wsr-init` rule the expanded picker still uses) and an unrelated word in `genreMatch.ts`.
The Step 0 list, each kept as it is:

| Lock | Disposition |
|---|---|
| `src/components/shell/barSwitcher.test.tsx` (S2 cover) | **Kept** — renders the default `"bar"` placement; unchanged and green. |
| `tests/e2e/switcherV2.measure.ts`, `switcherV2Shots.measure.ts` | **Kept** — the bar's tile and menu; already retired by INK10 / bar-era. Not run. |
| `tests/e2e/shellMenus.measure.ts`, `inkShell.measure.ts` | **Kept** — they click `#ws-sidebar [data-shell='switcher'] .ws-ms-btn`, which is now only the expanded picker (the rail's button was also `.ws-ms-btn` before, so on the rail that locator used to match two). Not run here. |
| `tests/e2e/shellV3.measure.ts` | **Kept** — skipped, retired by INK1/7/9/11. |
| `tests/e2e/sidebarRail.measure.ts` | **Run**, because the nav's sizing changed. SR2.1 (labels one line inside their rows, 36 measured) and SR2.2 (no nav scroll at 982/900/760/640, head and foot in view) are green. **SR2.4 is red before and after this work, and not because of it**: it expects the settings rail's old labels (`Profile, Security, … Alerts, Settings, Tasks`), but the dev line renders `Back, You, Preferences, Emails, Plan, Your data` (non-workspace v1). |
| `src/lib/railTile.test.ts` | **Kept** — `railTile()` still draws the expanded picker's initials. |

**Added**, each proven red when its fix is removed:

| Lock | What it holds | Red-before |
|---|---|---|
| MSP-U1 (unit) one manuscript | no `aria-haspopup`, no menu rendered | `railSingle = false` → 2 red |
| MSP-U1 two manuscripts | `aria-haspopup="menu"`, the menu | (the same mutation's converse; green) |
| MSP-U1 name/description | `aria-label "Manuscript: {title}"`, `aria-describedby`, `aria-keyshortcuts`, **no `title`** | a `title="Switch manuscript"` on the spine → red |
| MSP-U1 cloth / empty | title on the cloth, no `<img>` for a cover, no `wsr-init`; empty spine named "Add a manuscript" | `railSingle = false` → red (rows draw the cover) |
| MSP-U2 order | the rail's DOM: nav < settings nav < `{switcher}` < Feedback (the tab order) | spine removed from before Feedback → red |
| MSP-U2 retired | no `wsr-mswrap` in markup or CSS, no `.wsr .wsr-ms`, the rail mount passes no tile/tip props | — |
| MSP-U3 stylesheet | no `var()` in `@keyframes`, no `color-mix()`; the ref's tilt and its three triggers; both reduced-motion rules | label reduced motion → `animation-duration: .01s` → red |
| spineFacts ×5 | the four cases + `switcherFacts` unchanged | (unit, Phase 2) |
| MSP1 (e2e) | foot on line ≤1px; line 10px ±1 above Feedback; 50px, centred; first nav row = old slot top ±0.5; `none` at rest; hovered = the ref's matrix ±0.01; tipped box inside the rail and below the nav | `shelf` (slot `margin-bottom: -2px`) → "the line is 10px above Feedback"; `nav` (`margin-top: 18px`) → "the first nav row starts where the slot did"; `tilt` (hover `transform: none`) → "hovered, the spine has a matrix" |
| MSP2 (e2e) | label hidden at rest; shown on hover; left = rail right + 8 ±1; centre ±2 of the spine's; title, meta, facts, "Add a manuscript \| coming soon"; gone at once on pointer leave | `label-left` (`margin-left: 6px`) → "8px right of the rail" ×4 |
| MSP2.1 (e2e) | Tab from the last nav row → the spine → Feedback; the ref's `solid 2px rgb(157, 183, 216)` ring; focus tips it and shows the label; Escape hides it | — (green; no break written) |
| MSP3 (e2e) | reduced motion: tilt at its end position at once, zero running animations on spine and label, label opacity 1 | `motion` alone → "no transition running on the spine", "no animation running on the label", "the label is fully there at once" |
| MSP4 (e2e) | one manuscript: click → `/manuscripts?m=…`, no menu open; M → the same | — (see the finding below) |
| MSP5 (e2e) | two: click opens the menu; bottom ±2 of the spine's foot; left = button right + 10 ±1; inside the window; label hidden; spine tipped | — |
| MSP6 (e2e) | 1280×600: spine < 152, ≥ 72, below the nav, shelf above Feedback | `short` (`--msp-h: 152px`) → "shorter than 152" (and "below the nav", "above Feedback") |
| MSP7 (e2e) | no manuscript: the empty spine, named "Add a manuscript", dashed, label "Add your manuscript", tips | — |

The e2e assertions are `expect.soft`, so a single mutated run reports every lock its break reaches. The counts
(spines = 1, shelf lines = 1, routes × sizes = 4, labels = 36) are hard asserts, so a population can never be
vacuously empty. Every reading is in `readings.txt`.

### ⚠️ Finding outside the brief: a stale modal disables M (and every plain-key shortcut)

`src/components/dashboard/v105/Dash105How.tsx` keeps its closed "How it works" dialog mounted with
`aria-modal="true"`, at opacity 0 and 520px wide. Because every workspace page stays mounted, `shortcuts.ts`
`modalOpen()` sees a visible modal, so `shortcutBlocked()` is true **on every page**. MSP4's first runs showed it:
`"modal":["DIV.d105-how"]`, and M did nothing. The brief keeps M's guards, and the dashboard is out of scope, so
nothing in the app changed. MSP4 takes the closed dialog out of the guard's sight in-page (logged: 1 dialog), and
then M opens the manuscript's page. The fix belongs in `Dash105How` (`aria-modal={open}`, or unmount when closed).

## Measurements

Rendered page, collapsed rail, emulators (`demo-scriptally`). `/materials/letters` gave identical readings to
`/queries` at both sizes.

| Reading | 1512×982 | 1280×720 |
|---|---|---|
| Spine's foot / shelf line top | 861 / 861 | 599 / 599 |
| Shelf line bottom → Feedback top | 862 → 872 = **10.0** | 600 → 610 = **10.0** |
| Shelf width / centre / rail centre | 50 / 40 / 40 | 50 / 40 / 40 |
| Old slot top (logo's bottom + the slot's old 12px / 8px margin) | 91.75 + 12 = **103.75** | 91.75 + 8 = **99.75** |
| First nav row's top | **103.75** | **99.75** |
| Spine height | 152 | 152 |
| Transform at rest | `none` | `none` |
| Transform hovered (want `rotate(-7deg) translateY(-3px)`) | `matrix(0.992546, -0.121869, 0.121869, 0.992546, -0.365608, -2.97764)` | same |
| Tipped box (left…right, within the 0…80 rail) | 5.35 … 55.63 | 5.35 … 55.63 |
| Label left (rail right + 8) | 88 | 88 |
| Label centre / spine centre | 785.1 / 785 | 523.1 / 523 |
| Label text | Murphy's Day Out · Thriller · 50,000 words · 14 queries since 14 Mar · Add a manuscript / coming soon | same |
| Focus ring | `solid 2px rgb(157, 183, 216)` | same |
| Two books: menu bottom / spine foot; left / button right + 10 | 861.1 / 861; 70 / 70 | 599.1 / 599; 70 / 70 |

About the old slot's top: I did not render the old build in this run. The "before" number is the logo's measured
bottom plus the old slot's margin from the pre-change `sidebarRail.css` (12px, or 8px under 920px tall). The nav's
measured top equals it exactly.

- **Reduced motion:** 0 running animations on the spine and the label, transition 0s, label opacity 1 at once, tilt
  at its end position.
- **One manuscript** (`seed-ms-1` kept, 6 deleted and restored, 7 back): click → `/manuscripts?m=seed-ms-1`, no
  menu open (the expanded picker's closed menu is the one `.ws-ms-menu--port` left in the DOM); M → the same page.
- **1280×600:** spine 72px (shorter than 152, at its floor), button top 401 below the nav's bottom 383, shelf
  bottom 480 above Feedback's top 490. The nav scrolls here (it gives way first, by design).
- **No manuscript** (all 7 deleted and restored): the empty spine, `aria-label "Add a manuscript"`, a dashed
  outline, label "Add your manuscript", tips on hover.

## Screenshots

All in `shots/`:

- At rest: `rest-1512x982-queries.png`, `rest-1280x720-queries.png` (and `…-materialsletters.png`)
- Hovered with the label: `hover-1512x982-queries.png`, `hover-1280x720-queries.png` (and Letters)
- Keyboard-focused: `focus-1512x982.png`, `focus-1280x720.png`
- Two manuscripts, the menu open: `menu-two-1512x982.png`, `menu-two-1280x720.png`
- The empty spine: `empty-1512x982.png`
- 600px tall: `short-1280x600.png`; below it, `obs-1280x540.png`, `obs-1280x480.png`
- **Side by side, hovered, against the ref:** `side-by-side-hover.png` (the ref's live demo, rendered from the
  enrolled ref file, beside the app at 1512×982). The app's reading is "14 queries since 14 Mar" because that is
  the harness account's book; the ref's copy is an example.

![Hovered, the ref beside the app](shots/side-by-side-hover.png)

## Below 600px of window height (observation only)

The spine holds its 72px floor; the nav gives way instead, shrinking and scrolling. Nothing overlaps.

| Window | Spine | Nav (scroll height / visible) | Spine's button top vs nav bottom | Shelf bottom → Feedback top | Initials' bottom |
|---|---|---|---|---|---|
| 1280×600 | 72 | scrolls | 401 vs 383 | 480 → 490 | — |
| 1280×540 | 72 | 298 / 223 | 341 vs 323 | 420 → 430 | 528 |
| 1280×480 | 72 | 298 / 163 | 281 vs 263 | 360 → 370 | 468 |

At 480 the nav shows about half its five rows; the rest scroll, with the rail's scrollbar hidden and no fade, so a
cut-off row reads as the last one. The spine's title is cut to a few letters at 72px (see `short-1280x600.png`).

## Dev deploy

PLACEHOLDER-DEPLOY
