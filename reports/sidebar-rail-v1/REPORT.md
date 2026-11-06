# Sidebar rail v1 — report (on dev's nav)

**On dev:** https://scriptally-dev.web.app serves `index-gBdGm9sz.js` (hosting only, 6 Nov), built from local branch
`dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41-cl262-db21-sip12-pk41w-qc152-fn121-pk42-qc1521-sr1` — which is
`sidebar-rail-v1-dev`. Prod untouched. **Nothing pushed.**

## The base moved, and the rebase followed it

Your note named `dev/…-qc152-fn121`. By the time I started, dev was serving `index-BPUwFsPv.js` from the next line,
`dev/…-qc152-fn121-pk42-qc1521` (Submission packages v42 and Query Centre v152.1 on top). Rebasing onto the older
branch would have taken both off dev, so I rebased onto the one dev was serving, after rebuilding it and matching the
hash. It contains `…-qc152-fn121`.

The rebase replays the four commits onto a new branch, `sidebar-rail-v1-dev`. The original `sidebar-rail-v1` (on
`main`) is left as it was.

## Commits (on `sidebar-rail-v1-dev`)

| Commit | What |
|---|---|
| `77df05fe8` | Phase 1 replayed — the nav model (conflicts resolved to dev's nav, see below) |
| `b4f65c7f0` | Phase 2 replayed — the 80px rail |
| `b79257c2b` | Phase 3 replayed — the full sidebar, RAIL · FLOAT · PINNED |
| `19372a894` | Phase 4 replayed — the first report (superseded by this one) |
| `c9de54f8c` | Phase 5 — dev's nav finished in the rail, plus three fixes the dev line exposed |
| `6dfb6c9c2` | the five screenshots |
| this commit | this report |

⚠️ **`77df05fe8`'s message still describes the Manuscript/Materials split it made on `main`.** The replay resolved it
to dev's nav instead. I did not amend it (the house rule), so `c9de54f8c`'s message records what happened.

## The conflicts, and how each was resolved

The replay conflicted in 16 files over three commits (the earlier attempted merge showed 12).

| File | Resolution |
|---|---|
| `lib/workspaceNav.ts` | Dev's model, reordered to your list; my section icons and rail helpers added. Detail below. |
| `lib/workspaceShell.ts` | Both: dev's `noHeading` and `navLabel`, my section `icon`. `pro` became one field naming its entitlement (`"packages" \| "discover" \| "versions"`), replacing dev's boolean. |
| `lib/searchPalette.ts` | Mine: the palette's nav pages come from the nav. Dev's `/queries/packages` path and the Versions blurb moved into its metadata. |
| `lib/entitlements.ts` | Both: dev's `packagesViaFounding`, `VERSIONS_FOUNDING_ACCESS` and `versionsUnlocked`, plus my `discoverUnlocked`. |
| `components/shell/WorkspaceShell.tsx` | Dev's `noHeading` flag decides Dashboard's heading. Rows print dev's short labels (`sidebarLabel`) but are named by their full page name, per the pack. My `pickPage` closes a floating sidebar. |
| `components/shell/inkShell.css` | My box rules; dev's PRO-tag and ellipsis rules kept; the retired `.sb-collapsed` rules dropped from both sides. |
| `design-refs/.refhashes.json` | Dev's, with the two refs enrolled again. |
| 9 test files | Dev's versions, then retargeted to the new order and the dormant tags. |

## Your nav, as built

- **Rail (most-used first):** Dashboard, then a hairline rule · **Queries** (Query Centre, Responses, Analytics,
  Packages) · **Agents** (Contact list, Discover) · **Your book** (Manuscripts, Versions, Comps) · **Tasks**
  (To-do list, Corkboard).
- **Full sidebar:** the same order under mono headings. Rows print "Packages" for Submission packages, as asked.
  **Query Centre prints "Queries"**, dev's 25 Oct short label. Nick ruled to keep it (6 Nov).
- **No Materials and no Calendar** anywhere a writer reads.

**Renamed:**
- Pro marks now name their entitlement (`pro: true` → `"packages"`, `"discover"`, `"versions"`).
- `ESC_LEVEL` gains `sidebarFloat` (25).
- `SHELL_SECTIONS`' "Queries Hub" is now "Query Centre", and its Packages row points at `/queries/packages`.
- **Not renamed:** Your book's internal id is still `materials` (dev's choice, so every lookup keyed on it holds).

**Pro tags are dormant everywhere:** drawn only for an account that isn't entitled. Versions' tag used to show to
everyone; it no longer does.

**Discover (item 4) — confirmed.** `DISCOVER_OPEN_TO_ALL = true` and `discoverUnlocked()` sit in
`lib/entitlements.ts` beside `PACKAGES_OPEN_TO_ALL`, in the same pattern. They're read in one place only: whether the
tag is drawn. Nothing gates Discover for anyone.

**Carried through:**
- **Last-page memory:** stored entries for retired or moved pages (`tasks: calendar`, `materials: m-pkg`) are dropped
  on the next write, and a click falls back to the section's first page. Unit-locked.
- **Off-nav routes:** unchanged.
- **Folder tab:** on `/manuscripts` it shows Versions and Comparable titles; on `/queries/packages`, Query Centre,
  Responses and Analytics.
- **Phone:** dev's phone titles its tab pages by the tab ("Queries") and everything under `/manuscripts` as
  "Manuscripts". Pages off the tabs take the crumb, which reads the workspace nav. "Queries Hub" appears nowhere.

**Card labels (10px Source Serif):** 51 rail labels measured across six routes; **none wraps, escapes its row or is
cut.**

## Item 5 — the height: no change needed

At 1512×982, pinned, the full sidebar shows all 12 rows and the full Give feedback card:
- nav 617 of 617px, no scroll;
- card bottom at 906 of 982;
- no row outside the nav's box.

Dev's 25 Oct spacing was kept as it was, and dropping Calendar gives back a row. Locked as SR5, and proved red by
forcing rows to 40px.

## Three things the dev line exposed (fixed in `c9de54f8c`)

1. **A floating sidebar shut itself on dev.** The dashboard's How-it-works modal stays mounted with its box while
   closed (opacity 0, `aria-hidden`, `inert`), and my "a dialog opened" rule counted it. "Opened" now means shown. A
   dialog that fades in is checked again 220ms later, because a fade makes no DOM change.
2. **Escape didn't reach the floating sidebar.** Dev routes Escape through one shared stack on `window`. The float is
   now a layer on it (`ESC_LEVEL.sidebarFloat`). The layer stands down while focus is in a menu the sidebar opened,
   so that menu closes first.
3. **"Click the page" in the tests hit a tab.** Dev's folder-tab siblings sit over the bar's spacer. Test-only fix.

## Gates

| | Result |
|---|---|
| tsc | clean |
| `build:dev` | clean, no warnings |
| Vitest | 11,424 passed, 2 failed |
| Rail e2e | **22 of 22 pass** (emulators) |

The two Vitest failures are both in `src/test/firestoreTarget.test.ts`, listing 28 seeding scripts from the dev line
(`cl251Agents.mjs` and others). None of them differs between dev's tip and this branch, so they are red on dev
already.

**Readings (1512×982, `/queries`):**

| Case | Measured |
|---|---|
| RAIL → FLOAT | 9 intermediate widths; the page's left edge stays at 80 |
| FLOAT → PINNED | one re-layout (80 → 248), then 10–11 frames of glide |
| PINNED → RAIL | left edge at 80 throughout; ends 80/80 |
| Rail nav scroll | 982 and 900: no scroll · 760: 480 of 480, fits (it scrolled with six sections) · 640: scrolls, 458 in 360, head and foot in view |
| Fonts | 78 labels; none in Source Sans |

**The flaky test (SR3.2), 3 runs:** 3 of 3 pass, with 11, 10 and 11 glide frames. The re-layout frame on dev's
`/queries` takes 117–133ms; the page is held still during it.

**Red-before on this branch:** 7 locks broken on purpose, all 7 red on their own claim:

| Lock | Broken by | Failed on |
|---|---|---|
| SR2.1 | label size | "Query Centre sits inside its row" |
| SR2.4 | full layer forced visible | "the full layer is hidden on the rail" |
| SR3.1 | margin transition removed | "the page's left edge never moves" |
| SR3.2 | glide removed | "frames of the transform moving" |
| SR3.3 | margin transition removed | "no frame … moves the page's left edge" |
| SR3.10 | label fonts set to inherit | "labels in Source Sans" |
| SR5 | rows forced to 40px | "rows outside the nav's box" |

## Found on dev, not fixed (not this pack's)

- **Escape does not close the ⌘K palette on dev**, with or without this pack. I checked by building dev's tip untouched
  and probing it: open the palette, press Escape, and it stays open, on `/queries` and `/queries/responses`. SR3.4
  reloads the page rather than relying on it.

## The 23 older e2e suites (item 6)

None of them uses the Calendar route or the old Materials nav. `qcV126` only names `todoCalendar.css` in a list of
stylesheets. `rs2.measure.ts` isn't on this branch. Not run, not rewritten.

## Worktrees (item 8) — none removed

There are 9 besides the main checkout now; the set has changed since the 7 I counted on 5 Nov.

| Worktree | Branch | State | Safe to remove? |
|---|---|---|---|
| `scratchpad/wt-emu` (another session) | detached | 63 modified | **No**: uncommitted edits |
| `scratchpad/wt-qc1522-proof` (another session) | detached | 1 modified, process running in it | **No**: in use |
| `scratchpad/wt-rr` (another session) | detached | 6 modified | **No**: uncommitted edits |
| `ScriptAlly-cl263` | contact-list-v26-3 | clean, level with origin | **Yes** |
| `ScriptAlly-live` | release/live-1 | clean (1 untracked file), level with origin | **No**: it's the only prod deploy folder |
| `ScriptAlly-qc1521` | query-centre-v152-1 | 6 modified, 2 commits unpushed | **No** |
| `ScriptAlly-rsp6` | responses-v6 | 8 modified, 12 untracked | **No** |
| `ScriptAlly-rail2` (mine) | sidebar-rail-v1-dev | clean once this report is committed; not pushed | Yes once you've decided about pushing. The branch survives removal. |

## Screenshots (1512×982, deviceScaleFactor 2)

`reports/sidebar-rail-v1/`:
- `1-rail-query-centre.png`
- `2-rail-your-book-versions.png`
- `3-floating-sidebar.png`
- `4-pinned-contact-list.png`
- `5-settings-rail.png`

## Reproduce

```
SR_SHOTS=<dir> npm run e2e:emu -- tests/e2e/sidebarRail.measure.ts --project=measure
SR_MUTATE=frames,glide,font,tall,fullshow,label npm run e2e:emu -- tests/e2e/sidebarRail.measure.ts --project=measure
```

Another session held the emulator ports for this whole run, so my runs used their own ports through a temporary
patch, which was reverted after each run. Nothing from it is committed.
