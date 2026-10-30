# Phone fixes v1 — progress

Branch `phone-fixes-v1`, worktree `/Users/nickphysick/ScriptAlly-pfx`, cut from `ba0513b6` (`dev/…-ppp1-pa2-8-sip1-pls1`), whose build is `index-4L_rFD9m.js` = what dev serves (confirmed by building).
Refs: phone-fixes-v1 MANIFEST a4c572a8…2c24, 9/9 OK; phone-app-v2 MANIFEST OK.
Baseline: tsc root 0, tsc functions 0, build clean, Vitest `Test Files 697 passed (697)` · `Tests 10774 passed | 3 skipped (10777)`.
Phone projects added to playwright.config.ts: `iphone` (iPhone 13, WebKit) and `pixel` (Pixel 5, Chromium), touch on. WebKit installed (Playwright webkit-2336).

| Phase | Commit | State |
|---|---|---|
| A one scroller per page | `8fd56b3b` | committed; PF1 F1 green on both phones (24 pages) |
| B frosted bar and edge fade | (this commit) | committed; PF1 F2, F3 green on both phones |

## Causes (recon, base build, Pixel and iPhone)
- 2 (no scroll): on a phone every page sits in the desktop's viewport-locked stage slot — `StagePage` (AppShell.tsx:141–153) gives `layout="fill" clip` slots `flex:1; min-height:0; overflow:hidden` inline, and `.ws-work--fit` (workspaceShell.css:464) is `flex:1 1 0; min-height:0`. Queries got a 358px box over a 3,786px page; nothing scrolled. Home's slot is `flow`, which is why it alone scrolled. Import also had a second scroller (`.wpg-scroll`).
- 1 (fade): `.sv2-fade` (AppShell.tsx:584, shellV2.css:739) is sticky at the stage's foot, which ends 20px above the tab bar's top (571–627 vs 647), so it floats with a gap.
- 3 (search): the band's search calls `openPalette` (AppShell.tsx:614), which mounts the desktop palette (`sp-pal`); nothing of it is visible on a phone.
- 4 (Birds-eye): `.pa-barh` is a span; its `display:block` exists only under `.pa-pg` (pagesPhone.css:192), and the Birds-eye sheet (QueriesPhone.tsx:262) is not under `.pa-pg`, so every bar collapses to nothing and the sheet reads as a plain list.
- 5 (Log a query): `autoFocus` on the agent field (LogJourney.tsx:595) scrolls the flow to it on open.

## Harness notes
- `tests/e2e/touch.ts`: native touch drag on Chromium (CDP); on WebKit Playwright has no native touch drag, so the touch events are dispatched (catching a cancelling listener) and the scroll is applied to the element the browser would pick.
- Navigate inside the app (`go()`: pushState + popstate) and wait for the stage height to settle; full reloads made WebKit measure half-rendered pages.

## Phase B notes
- The bar is `rgba(255,255,255,.6)` with `blur(20px) saturate(1.5)` (both prefixes), solid white where backdrop-filter is unsupported.
- `.sv2-fade` is not drawn below 768px. `.pa-edgefade` is drawn beside the bar by `BottomTabBar` (fixed, bottom 0, height 66 + 14 + 32 + safe area, z 39 under the bar's 40), off while the bar is tucked away or there is nothing more below (`fadeOn`, the stage's own "more below" state).
- The stage's phone bottom padding was already `100px + safe area` (bar 66 + offset 14 + 16 = 96), so nothing changed there; F1 holds the last item above the bar.
- Harness repair: `ensureSignedIn` (tests/e2e/measure.ts) raced the shell against the form only once; after `goto("/#/signin")` it read `isVisible()` before WebKit had drawn the shell and then waited the whole test for a form that never came. It races again there now (30s each side).
