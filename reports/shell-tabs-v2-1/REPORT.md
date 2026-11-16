# Shell tabs v2.1 — the guide pill folds, and the account tabs keep their order

16 Nov 2026 · branch `shell-tabs-v2-1`, cut from the line dev served (`dev/msp1-st2-rar1` @ `7b98b65f8`).

## False premises

1. **"Cut from `dev/msp1-st2`."** Dev had moved by the time this started: it served `index-B8GmFPmc.js` from
   `dev/msp1-st2-rar1` (Record a response v1, stacked on `dev/msp1-st2`). Shell tabs v2's code (`043f5e638`,
   `2f4ea9d90`) is on that line; `aa62f99f0` is not, but it only added the deploy note to the v2 report. Cut from there.
2. **"Does the pill already have an icon-only form?"** Not quite. Below 1100px of window it already drops its words
   ("{Page} guide") but keeps the ring **and the count** ("0 of 4"), at its pill shape — narrower, not a 38 square,
   and keyed to the window, not to the bar's room. The new fold is the bar's, keyed to the tabs.
3. **G2 is not a red-before lock.** "With Sign in current it curves into the sheet on both sides" was already true on
   the base: since v2 every current tab draws both curves. Before this change Sign in was simply the first tab when
   current. G2 holds the curve in its new place (second) and sees its mutation; it was green before and after.
4. **G3's mutation cannot be a stylesheet.** On a phone the account frame draws only the current tab — the other tab
   and the group label are hidden (`onboarding.css`) — so "apply the fixed order on phones" is a code change. G3's red
   was proved against a build (`ST21_G3_MUTANT=1`, SetupFrame's phone branch given the desktop's fixed-pair strip),
   made in this worktree and reverted after the run.

## Step 0

1. **The base.** Dev served `index-B8GmFPmc.js` from `dev/msp1-st2-rar1` @ `7b98b65f8`; v2's three phases and report
   are on it (see premise 1).
2. **The guide pill.** `PageChecklist` (`src/components/shell/guide/PageChecklist.tsx`), portalled into the bar's page
   slot (`lib/barSlot`, the `.ws-pageslot` left of Help). Mounted by Versions (`VersionsV2Page`), Manuscripts
   (`ManuscriptPage`), the Query Centre (`Queries`) and the Contact list (`AgentList`), while the page's guide is
   unfinished. On Versions at 1512 it is **192px** ("Versions guide 0 of 4"), 202 with its 10px margin. Icon-only form:
   see premise 2.
3. **The fold today.** `planWithFold` in `FolderTab.tsx`, fed by `TabStrip`'s fit: it plans the strip in the room left of
   the open field (`SEARCH_W` 168) and, if any tab would lose its name, in the room left of the folded one
   (`SEARCH_FOLD_W` 38), both read from the field's right edge. It reported a boolean through `onFold`.
4. **The account tabs.** `SetupFrame.tsx` built the desktop strip as "the current page, then the other mode's"
   (`stripTabs`, current id `__cur`), from Auth's `name`/`otherTab`. On phones `FolderTab` draws the current tab and the
   sibling, which `onboarding.css` hides on the account form.
5. **Pinned and narrow.** `useSidebarState`: a pinned sidebar stays pinned from **1100px** up; below 1100
   (`NARROW_QUERY`, max-width 1099) it shows as the rail with the preference kept, and pinning is refused ("Pinning
   needs a wider window"). Nothing between 1100 and 1280 changes it. So at 1100 a pinned sidebar is a real 248px
   column. Unchanged.

## Phase 1 · the guide pill folds second — `6d891801f`

- `FolderTab.tsx`: `planWithFold` (two rooms, a boolean) replaced by **`planWithFolds`** (a list of rooms, a level).
  `TabStrip`'s fit reads the page slot: its width now, the pill's width, and the slot's open width kept from the last
  time the pill was seen open. All rooms are read from where the field's right edge would be with the pill open or
  folded. Levels: 0 nothing, 1 search, 2 search and the pill; the old retreat (icons, then "+N") only after level 2.
- `WorkspaceShell.tsx`: `foldLevel` replaces `searchFolded`; level 2 sets `data-fold` on the page slot and publishes it.
- `lib/barSlot.ts`: `setBarSlotFolded` / `useBarSlotFolded`.
- `PageChecklist.tsx`: folded, the pill gets a tooltip with its full label ("Versions guide · 0 of 4"). Its
  `aria-label`, its click and what it opens are unchanged.
- `inkShell.css`: `.ws-pageslot[data-fold] .pck-pill` — 38 × 38, radius 10, the folded search's fill and ring, the
  ring alone.
- `searchFold.test.ts`: the order, no pill, reverse unfold, and the pill's 38 held to the stylesheet.

| Lock | Red before (base) | Mutation red | Green after |
|---|---|---|---|
| F1 pill folds (Versions, 1100, rail) | **red** — Manuscript cut to its icon, pill 192px | the pill's label restored → "191.9 × 36 with its label", "m-ms is cut to ic" | ✓ |
| F2 order — **width 1316** (rail) | green (search alone folds there today) | pill folded before search → both flagged | ✓ |
| F3 wide (1512, rail and pinned) | green | fold forced → both flagged, both modes | ✓ |
| F4 unfold | **red** — nothing to unfold | fold latched → "at 1512 still folded" ×2 | ✓ — the pill's label back at **1190**, the field at **1322** |

## Phase 2 · the account tabs keep their order — `70306169c` (+ `e013ab6b7`, the G locks' harness)

- `SetupFrame.tsx`: `ACCOUNT_TABS` = Create account (`signup`), Sign in (`signin`). On the account form, when
  `otherTab` is one of the pair, the desktop strip is the pair in that order and the current id is the one that is not
  `otherTab`. Anything else keeps current-first. Phones untouched.
- `tests/e2e/fixtures/shellTabsV21-phone-tabs.json`: the 390 × 844 tabs, recorded on the base before the edit.
- `e013ab6b7`: G1 re-opened the frame inside its reading, and the reload dropped the mutation's stylesheet (it read
  clean under the mutation); G3's mutation became a build (premise 4).

| Lock | Red before (base) | Mutation red | Green after |
|---|---|---|---|
| G1 order, both modes, no tab moves | **red** — current-first | row reversed → visual order wrong in both modes | ✓ |
| G2 curves with Sign in current | green (premise 3) | left curve removed → "left: at the corner rgb(27,36,51), not the sheet" | ✓ |
| G3 phones = baseline | — (baseline taken here) | mutant build with the fixed pair on phones → both modes differ | ✓ |

## The 15 ST2 locks

All green in one run on the final tree (A1–A3 ×4, B1/B3/B4/B5 ×4, B2 ×2, B4 sweep, C1 ×2, C2), 1512 × 900 and
1280 × 800, rail and pinned. ST2-C2 now reports Versions and Manuscripts at 1100 with **nothing cut** (clear of the
field by 91.7 and 50.3); it still carries v2's exemption for those two pages, which now passes on the whole check.

Gates: tsc 0, build clean, Vitest no worse than baseline (the same 3 failures in `emuGuard` / `firestoreTarget`;
12,654 passed against 12,650).

## Shots — `shots/before`, `shots/after`

- `versions-1100-rail.png` — before: Manuscript cut to its icon beside the folded search and the open pill. After:
  all five named, search and the pill folded.
- `frame-signup-1512.png`, `frame-signin-1512.png` — after: Create account, Sign in in both modes; before: the current
  one first.
- `frame-*-390.png` — the phone, unchanged.

## For Nick to rule on — the Materials tabs at 1100 with the sidebar pinned

`shots/after/pinned-1100_*.png`. 1100 is the narrowest window that pins (Step 0.5). After the pill fold:

| Route | Search · pill | Tabs |
|---|---|---|
| Letters, Packages, Comps | search folded (no pill on these pages) | **Manuscript cut to its icon** |
| Versions | both folded | **Manuscript cut to its icon** |
| Manuscripts | both folded | **Comps and Versions cut to icons** |

With a 248px sidebar the five names do not fit at 1100 however the bar folds. Options: leave it (icons with
tooltips); raise the pin threshold (pinning refused below ~1300); or let the pinned sidebar give way to the rail below
some width. Not changed here (baked decision 4).

## Deploy

See the end of this file once deployed.
