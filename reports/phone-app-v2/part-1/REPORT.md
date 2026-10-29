# Phone app v2, Part 1 — the foundations and the shell

Branch `phone-app-v2`, worktree `/Users/nickphysick/ScriptAlly-pa2`. Design ref: `design-refs/phone-app-v2/` (all 69 files check against `MANIFEST.sha256`; `MANIFEST.sha256` and `phone-app-v2.html` match the stated hashes). Not merged to main, not on prod.

## False premises

1. **Dev's base was not `dev/pk391-qm1` (`index-DRG_02T1.js`).** On 29 Oct dev served `index-DQ0k846l.js`, the Dashboard first visit v1 stack, `origin/dev/pk391-qm1-pk392-calx-pk392b-td7-fv1` at `7d31b365`. That commit builds to the served hash byte for byte, so `phone-app-v2` was cut from it.
2. **The Corkboard is `/todo/corkboard`, not `/todo/noteboard`.** `/todo/calendar` is retired (To-do v7), so it is not in `WORKSPACE_PATHS`. This matters for Part 5.
3. **There was no single "To-do figure for tasks due today or earlier" to read.** The tray computes it inside `TodoTray` (`dayBuckets(...)` overdue + today, the headline "36 overdue"). `lib/todoDueTally.ts` runs the tray's own four functions in the tray's order and is held equal to that chain by a unit test. It is not a new count. (The old badge figure, `boardFigures(cols).cards` — "54" in the sidebar — is a different number and is not what the brief asked for.)
4. **The ref's + pills read "Add an agent · Task or note · Import"**, not "Add a task or note": the ref shortens it in code (`t.replace('Add a task or note','Task or note')`). The ref won.
5. **A file named `PhoneArt.tsx` cannot sit beside `phoneArt.ts` on this disk** (case-insensitive). The component is `PhoneArtSpot.tsx`.

## What Step 0 found, and what survives

- **Survives, unchanged in behaviour:**
  - `MobileSheet` — every existing caller is the same. It gains an opt-in `pa` mode.
  - `MobileChromeContext` and pushed detail screens — `ShellTopBar` still draws their back / Cancel / Done.
  - `UndoBar`, `ToastProvider`, `SearchPalette` and `FeedbackDock`.
  - The bodies of DashPhone and QueriesPhone. Parts 2 and 3 rebuild them.
- **Replaced:**
  - The five-tab bar (Home · Queries · Agents · Analytics · More) → the floating capsule.
  - The "you" sheet → the menu.
  - Home's `PhoneTopBar` and its + menu, and QueriesPhone's own list bar, title, book switcher and + sheet → the band, the tab bar's +, and the shell's "What happened?" sheet.
- **"You"-sheet items, and where each now lives:**
  - To-do → its tab.
  - Submission packages → the Materials tile.
  - Import your queries → Menu › Import queries.
  - Account settings → Menu › Settings.
  - Help → Menu › Help centre.
  - Sign out → the menu.
  - Upgrade → Menu › Plan & billing.
- **Now unreachable on a phone, flagged for Parts 2 and 3:**
  - `PhoneSearch`, the phone search sheet: its two openers were the retired bars. The band's search opens `SearchPalette`, as the brief says. The component and its dead state in DashPhone and QueriesPhone are left for those parts to delete when they rebuild the bodies.
  - Queries' Coming up screen: its button was on the retired bar. It is reachable only by URL (`?qm=coming`) until Part 3 retires it.

## Gates (baseline → final)

| Gate | Base `7d31b365` | Part 1 final |
|---|---|---|
| `tsc --noEmit` (root) | exit 0 | exit 0 |
| `tsc -p functions` | exit 0 | exit 0 |
| `build:dev`, grepped for `error\|[WARNING]` | clean | clean |
| Vitest | `Test Files 689 passed (689)` · `Tests 10724 passed \| 3 skipped (10727)` | `Test Files 690 passed (690)` · `Tests 10730 passed \| 3 skipped (10733)` |

## Commits

| Commit | Phase | Files |
|---|---|---|
| `b945303d` | 1A tokens, type, art table | design-refs/phone-app-v2/** (69), .refhashes.json, phone/{phoneTokens.css, phone.css, phoneArt.ts, PhoneArt.tsx, PhoneDisc.tsx, phoneIcons.tsx}, qm1Art.ts, AppShell.tsx, PROGRESS.md |
| `3d4385a4` | 1B the tab bar | BottomTabBar.tsx, phone/phoneShell.css, AppShell.tsx, mobileShell.test.tsx, lib/todoDueTally.ts (+ test) |
| `5f707d05` | 1C the band | phone/PhoneBand.tsx, phone/phoneBandStore.tsx, phoneShell.css, AppShell.tsx, DashPhone.tsx, PhoneTopBar.tsx, QueriesPhone.tsx |
| `be8fdc7c` | 1D the sheets | MobileSheet.tsx, phone/PhoneSheets.tsx, phoneShell.css, AppShell.tsx, mobileShell.css, mobileShell.test.tsx |
| `4e0f911c` | 1E snackbar and brand | PhoneArt.tsx → PhoneArtSpot.tsx, phoneArt.ts, phoneShell.css, UndoBar.tsx, ToastProvider.tsx, scripts/phone-brand-images.mjs, public/pwa/** (8), index.html, manifest.webmanifest, mobileShell.test.tsx |
| (this commit) | 1F locks, shots, report | see its message |

## Locks — PA2-1 (`tests/e2e/phoneAppV2Shell.measure.ts`)

Every lock was proved red before its green was trusted.

- **CSS mutations** run with `PA2_MUTATE=<name>` (defined in `tests/e2e/pa2Lib.ts`).
- **Code mutations** were each built into their own output folder from a source edit, then reverted from a path-derived backup. The script proved the revert clean with `git diff`. Each was served on its own port.

| Lock | What it asserts | Mutation | Red reading |
|---|---|---|---|
| S1 | Home · Queries · + · To-do · Agents; the chosen pill navy with a white icon; the badge on To-do = the tray's overdue + today (read off the desktop tray's own headline) | code `badge-yourmove` | `badge todo 16 vs 36` |
| S2 | the bar is away after 200 down and back after 20 up | code `no-tuck` | `after 200 down the bar is away` false |
| S3 | the band is navy; the title is Special Elite 400 and white; the tab band carries the chip; Home's title is the greeting | CSS `ink-title` | `the title is white — rgb(28, 19, 15)` (also reddens S8) |
| S4 | a menu page has the page band, a back arrow, no chip, no tab bar; back returns | code `bar-on-menu` | `"bar":true` on Analytics, Help, Settings |
| S5 | "What happened?", two rows, three pills; the + is its close button; each door opens its journey or page | code `swap-doors` | `plus-agent … http://…/todo` |
| S6 | eight tiles in the ref's order; every you-sheet row present; only computed figures carry numbers; the Responses tile's figure is on the Responses page | code `fake-line` | `analytics: no number of its own — 50% heard back` |
| S7 (writes) | after recording a pass: a navy pill above the bar, white text, Undo blush with black text on top, the picture; Undo puts the query back with the agent | CSS `snack-white` | `the snackbar is a navy pill — bg rgb(255, 255, 255)` |
| S8 | white on navy, ink on blush, no green or red, over the band, the bar and the phone layers; no image source twice | CSS `plus-rust` | `red fill on button.pa-plus (rgb(180, 85, 63))` |
| S9 | 1512 × 900 and 1280 × 800, five routes: DOM identical to the base, and pixels within the base's own variation | CSS `desk-bar` | 16 reds, e.g. `head 445797 px vs base-to-base 48 px` |

**Final green:**
- S1–S8 at 390 × 844 and 360 × 780.
- S9 at both desktop widths.
- Ledgers in `part-1/ledger/`, mutation ledgers alongside them.

**S9's pixel claim is stated relative to the base, and here is why.** The unchanged base Dashboard differs from itself between captures. The chart's first pin flips between two antialiasing states, and the founding card's tiles vary too: 48 px apart at 1512, up to 171 px at 1280.

- On the four deterministic pages that variation is 0, so the claim there is exact equality, and it holds.
- On the Dashboard, head is 0 px from the nearest base capture at 1512 and 17 px at 1280, against an envelope of 48 and 171.

**S7 records a pass and undoes it, rather than logging a query and undoing it.** It is the same UndoBar and the same snackbar, with far fewer steps on the shared account. The account was put back: the query read "With the agent · Queried" afterwards, and the lock asserts its court.

**Re-pointed or retired:**

- **`mobileShell.test.tsx`:**
  - the tab-bar block → the new bar;
  - the you-menu block → "the menu: everything the you-sheet offered is still reachable";
  - the manifest lock → navy, with `/pwa/` icons.
- **`queriesMobileV1.measure.ts`:**
  - L4's tab-bar reading → the new bar. Its Queries-badge claim is retired; S1 owns the badge.
  - The colour sweep's root → `.pa-tabbar`.
  - "the + sheet" → skipped, with the reason stated (S5 and S8 cover it).
- **`dashMobileV1.measure.ts`:** DM1-A1 (the phone top bar) and DM1-A2 (the search sheet it opened) → skipped, with reasons.
- **`queriesMobileV1Shots.measure.ts`:** skipped. It was the v1 report's shot generator, not a lock.

The QM1 and DM1 runs on head and on base are below.

## QM1 and DM1, head against base

| Suite | Base (`7d31b365`, served on :4392) | Part 1 head |
|---|---|---|
| `queriesMobileV1` | 2 failed — L4 (the re-pointed tab-bar reading; the base has no `.pa-tabbar`, so this red is the re-point working) | 7 passed, 4 skipped (the + sheet ×2, L1 capture/compare without `QM1_L1`) |
| `dashMobileV1` | 1 failed — **C1** "drop req+nudge+quiet: the hero is task 1 — hk:reply vs start:card" | 1 failed — the **same C1, identical message**; A1 and A2 skipped |

**DM1-C1 was red on the base, before this pack.** Its fixture expects the hero task to be a housekeeping card when the base serves "start:card", so it is not caused by Part 1 and is left alone. Part 2 rebuilds Up next and re-points it.

Two QM1 readings were re-pointed during the run.

- QM1-L2's population check looked for a pink element on the Closed chip, and the only ones had been the retired bar's pink + and badge. The sweep now also counts the shell's blush (`#e8c8bc`).
- Its ink rule accepts `#1f2633`, the brief's own second ink.

DM1-B1's "under the bar" now measures from the band.

## Where the app's derivation overrode the ref

- **Tile lines.** The ref's sample tile lines are not used. The app's own figures are:
  - Responses: `pageCounts(...).replies`, e.g. "31 replies".
  - Manuscript: the book's word count, "92,000 words". The ref shows "Draft 4"; the app has no figure that says that.
  - Comparable titles: `manuscriptComps(...).length`.
  - Analytics, Materials, Discover and Feedback show their name alone. No existing derivation gives one number for them; the closest, Analytics' reply rate, lives inside the page's components rather than in a lib.
- **The menu's plan line** is `planLine(plan).label` ("Free plan") where the ref draws "Founding writer · Fledgling". The founding rank comes from a callable that Home's founding card reads; it is not on the shell.
- **The To-do badge** is the tray's overdue + today: 36 on the harness account. The ref shows 5.

## Dev

- **Before:** dev served `index-DQ0k846l.js`. That is `7d31b365`, the commit `phone-app-v2` was cut from.
- **Integration branch:** `dev/pk391-qm1-pk392-calx-pk392b-td7-fv1-pa2-1`. It is `phone-app-v2` itself, because the branch is cut from the served commit and nothing needs merging. It is deployed from this worktree with the tree clean.
- **Gates there:** as in the table above. The locks were run against a local preview of the same build.
- **After:** see PROGRESS.md and the closing line of this part.

## Not done, and why — for Nick

1. **The band's search opens `SearchPalette`**, the shell palette, as the brief says. The phone-built `PhoneSearch` sheet is therefore unreachable. Should the phone keep the palette, or should Part 2 or 3 point the band at `PhoneSearch`?
2. **The Analytics, Materials, Discover and Feedback tiles show no line.** Analytics' "heard back" figure lives inside the page's components, not in a lib. Materials' package count would need the packages page's own filter, which I did not want to guess. Discover's "new" count and Feedback's "sent" count have no derivation. Should any of them get one?
3. **The book switcher's footnote ("During the beta, QueryHawk tracks one manuscript per writer")** is the ref's, and matches the code: adding a manuscript is disabled. But accounts that already hold several, like the harness account with eight, show it beside a list that contradicts it.
4. **Streaks & goals** has no route. Its tile is present and disabled ("Coming in Part 7").
5. **"Plan & billing" carries a "Founding" chip for everyone.** Per `entitlements.ts`, every account is a founding member during the beta.
6. **The installed app's colours are navy and the icons are new files in `public/pwa/`.** The old icon files are left in place, unreferenced.
7. **One unexplained hash.** The first gate's build of the 1E source hashed `index-FcVcgpa3.js`. Every later build of that same committed source was `index-sgvSamcD.js`, and stable. I found no source difference; the tree was clean. This is recorded, not explained.
8. **Text on blush is now ink `#1f2633` (`--pa-ink`) on the badge, the + and Undo.** The ref uses `#111`. The brief's colour law names `#1c130f` or `#1f2633`, and the law won.
9. **The desktop captures (51 MB of PNGs) are not committed.** They are in the session scratchpad. The ledger `part-1/ledger/desktop.json` records every comparison, and `desktop.mut-desk-bar.json` records the proof red.

## CLAUDE.md

A "Phone app v2" section was added (Part 8 consolidates it).

## Worktree

Kept: Parts 2–8 continue in it.
