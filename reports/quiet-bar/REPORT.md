# The quiet bar — run report (28–29 Sep)

**On `main`:** P1 `f7599e60` (the bar), P2 `417746b6` (left-aligned headers). **Not deployed** — Nick deploys.
Ref: `design-refs/shell/quiet-bar-v1.html`, SHA256 `84adcc6a6e3d64ebda99a581275b135ed6efe0d2c51e013000be6ce4b1a65f4a`, enrolled (97 refs guarded).

## False premises, first

1. **The brief was not on `main` when the switcher brief first arrived.** Nothing had touched the bar since page header v2, so that brief stopped at its Step 0. This pass is the quiet bar the switcher builds on.
2. **Reading the title from the scroll event's own target is not enough — three corrections, each found by the Step 0 census:**
   - **Inner panels fire the wrap's capture listener too.** These are the Birds-eye rail, the Housekeeping rail, the Dashboard's lists and the Comps rail. Read off the target, scrolling one of them with the page at the top would wake the bar and, having no title, name the page through the fallback. The shell instead reads the page's **outermost** overflowing scroller between the target and the wrap.
     - This also fixes a small pre-existing fault: before this pass, a rail scrolled on its own gave the bar its drop shadow.
   - **Calendar and Noteboard scroll a zone below their header.** A lookup inside the scroller never finds their title, so the fallback would name the page while its title was in plain view. The title is looked up from the scroller's page root (`.wpg`) instead, never the document. On those two pages the hairline comes in when the zone scrolls, and the name never does, because the title never goes behind the bar.
   - **Import, Plans and Help scroll the stage itself**, which holds other mounted pages' headers too. Only a **visible** title counts.
3. **"Reduced motion: 0s" is 0.01ms in this app.** The shell has one reduced-motion rule, `.ws-app *` with `transition-duration: 0.01ms !important`, and it overrides any local rule. A local `transition: none` was written, measured to change nothing, and taken out. Q9 is held to the shell's 0.01ms, and it was proved red by deleting that rule.
4. **Two locks can't be red on `main`.** `main` shows the page name at all times, which satisfies Q5 (no-title name at 3) and Q7 (nothing moves when the name appears). Both were proved red by their mutations instead.

## Step 0

**Baselines:** tsc 0 · `build:dev` clean · Vitest 8,243 passed | 3 skipped (8,246). `functions/node_modules` has to be linked in a fresh worktree, or `email.test.ts` fails to import.

**Every workspace route, measured at 1440**, including whether its title sits inside its scroller. Every scroller is inside `.ws-winwrap`, so the ✗ ("scrolls somewhere the capture listener can't see") does not fire.

| Route | PageHeader | Scroller(s), outermost first | Title inside the scroller |
|---|---|---|---|
| /dashboard | none | `#app-stage-scroll`; `.os-scroll` ×2 inner | — (fallback) |
| /queries | full | `.wpg-scroll`; `.qcv-be-scroll` inner | yes |
| /queries/analytics | compact | `.wpg-scroll` | yes |
| /agents | full | `.wpg-scroll`; `.clv-railbody` inner | yes |
| /agents/discover | compact | `.wpg-scroll` | yes |
| /manuscripts | none (its own; untouched) | `.wpg-scroll` | — (fallback) |
| /manuscripts/comps | full | `.wpg-scroll`; `.sa-prail-body` inner | yes |
| /manuscripts/packages | full | `.wpg-scroll` | yes |
| /todo | compact | `.wpg-scroll` | yes |
| /todo/calendar | compact | `.tl-rows` | **no** — header above the zone |
| /todo/noteboard | compact | `.tpl-zone` | **no** — header above the zone |
| /import | compact | `#app-stage-scroll` | yes (visible one only) |
| /account/profile | none | does not overflow at 1440 | — |
| /plans | compact | `#app-stage-scroll` | yes (visible one only) |
| /help | compact | `#app-stage-scroll` | yes (visible one only) |

**Tests that pinned the bar's colour, its shadow, the 920 frame or the page name's visibility:**
- pageHeaderV2 §1 (colour, name visible);
- pageHeaderV2Lib §4.3 (920 frame, mock frame position);
- pageHeaderV2 §4.5/§4.6 (the page name as an outside-press target);
- shellV3Lib L2 (colour, edge), L5 (order) and L8 (name box);
- compsMat S1 and pkgMat S1 (colour);
- compsMat S7 and pkgMat S7 (no shell file changed since a fixed commit);
- unit: the frozen PageHeader strings, `pageHeader.test`, `materialsPageSmoke`.

Each is retargeted or retired, and named, in the P1 and P2 commits.

## The locks

All nine are in `tests/e2e/quietBar.measure.ts`: rendered, fonts loaded, 15 routes, at 1280 and 1440.

| Lock | Red before (count) | Mutation that turned it red |
|---|---|---|
| Q1 ground | on `main` ×34 | bar back to `--shell-side` ×29 |
| Q2 rest | on `main` ×34 | hairline always on ×15 |
| Q3 hairline | on `main` ×28 | name shown on any scroll ×12 |
| Q4 name | on `main` ×24 | name never shown ×10 |
| Q5 no-title | green on `main` (see premise 4) | fallback dropped ×2 |
| Q6 route | on `main` ×2 | route reset removed ×2 |
| Q7 stable | green on `main` (see premise 4) | name mounted only when shown ×10 |
| Q8 left | the 920 frame in place: 8 full lefts, 6 drawings | the same: the 920 frame back |
| Q9 motion | on `main` ×4 | the shell's reduced-motion rule deleted ×2 |

Branches entered at both widths:
- Q1–Q7: 10 titled, 2 untitled, 2 fixed-title (Calendar, Noteboard), 1 still (settings).
- Q8: 8 full, 16 compact, 6 drawings (Comparable titles passes no art).

Evidence ledgers are in `reports/quiet-bar/red-on-main/`.

**Regression against the new build:** quietBar, pageHeaderV2, shellV3, compsMat, pkgMat and contactV11 — **97/97**.

## Pictures

`reports/quiet-bar/shots/` holds the Query Centre, the Contact list and Submission packages, each at rest, scrolled (3) and named, at 1280 and 1440.

## Deferred, with a proposed owner

- **chromeGround's three cases crash on retired selectors** (`getComputedStyle` on null; `getAttribute` of undefined). The crashes are identical on dev's pre-change build. They need re-pointing. Owner: whoever next owns the shell's measurement suites.
- **The Query Centre's eyebrow renders in a serif** where the Contact list's is mono. It's visible in `queries-1280-scrolled.png`, and the likely cause is the page's `.qcv-own` font reset reaching the header's `p`. It's inside the Query Centre's hero, which was out of bounds here. Owner: the Query Centre session.
- **`.qcv-head` / `.qcv-line` orphan rules** in `qcvPage.css`, carried over from page header v2. Owner: the Query Centre session.
