# Your notes v1 — report

Branch `your-notes-v1`, cut from the line dev serves (`dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1-td53-cl27-td54-cl27b` @ 1bb3e371f). Worktree `../ScriptAlly-notes`. NOT merged to `main`.

## False premises

1. **The base is not on `main`.** Dashboard v2.2 and Query Centre v153.x (`foundingBand.ts`, `foundingCard.ts`, `qc1531.ts`, `QcHeader1531`, `doodle-tile.svg`, …) exist only on the dev line. I built on the branch dev serves, not on `main`.
2. **Dev has no feedback at all.** `betaFeedback` and `foundingStats` are both empty on scriptally-dev, so Part A's "two writers' totals before and after" could not be read off dev. I ran the old and new rules over the same two writers' notes instead (below), and seeded six `yn1-` notes for the harness account to build and measure the page.
3. **The Dashboard band has no "All your notes" link.** The dashboard-v2-2 ref draws one in the "Your last note" strip; the built band never had it. Part E adds it there (one link, the ref's look).
4. **The band's buttons and the pop-up already share one send path.** The band sets the kept draft's kind and opens `FeedbackDock`; both send through `lib/sendFeedback`. No second sender.
5. **`QcHeader1531` and `QcStageRing1531` were not shared.** To-do v54 and Contact list v27 copy the markup and wear the classes. I extracted both properly (below) and the Query Centre now renders through the shared parts.
6. **The baseline is not green**, and was red for an environmental reason first: the shared `node_modules` (symlinked from the primary checkout) lacked `@sentry/react`, which this dev line needs. I added it there with `npm install --no-save` at the lockfile's version (11.11.0); no package file changed. After that: tsc clean, build clean, Vitest 3 reds (emuGuard, firestoreTarget ×2 — pre-existing), functions Vitest 16 reds (aiSpendGuard, foundingEmails, smartImportCore — pre-existing).

## §0 recon

1. **Base.** All present on the dev line (branch above): `foundingBand.ts`, `foundingStats.ts` (TIERS 1 · 3 · 8 · 15 · 25), `foundingCard.ts` (COMPOSE, DONT_CHIPS, sentCopy, HOW_SLIDES), `Dash2Founding`, `functions/src/foundingContributions.ts`, `functions/src/foundingStats.ts`, the `betaFeedback` owner-read rule, `QcHeader1531`, `QcStageRing1531`, `qc1531.ts`, `public/images/qc/doodle-tile.svg`. None of them is on `main`.
2. **Feedback today.** A `betaFeedback` doc carries: `kind`, `message`, `severity`, `wantsReply`, `pageName`, `route`, `viewport`, `browser`, `browserName`, `appVersion`, `screenshotPath`, `uid` (from the token), `email` (only when a reply is wanted), `createdAt` (server time), then `emailed` and, on a failed email, `emailError`. `status`, `title` and `statusAt` are set by hand in the console. **On dev today: none of them, because dev has no betaFeedback docs at all** (and no foundingStats docs).
3. **The band's compose.** The band's Like / Don't like / Idea set the kept draft's kind and call `openFeedback()`, which opens `FeedbackDock`. One send path (`lib/sendFeedback` → `sendBetaFeedback`). No second sender.
4. **Navigation.** One list, `workspaceSections` (lib/workspaceNav.ts), feeds the rail's More panel (`moreGroups`: every page not flagged `rail`), the full sidebar, the folder tab and the palette's Pages (`PALETTE_PAGES`, with a subtitle from `NAV_PAGE_META` in lib/searchPalette.ts). A new route also needs `WORKSPACE_PATHS` (marketing/routeTiers.ts), `shellForRoute.ts`, an icon key in `WORKSPACE_ICONS` (AppShell.tsx — a parallel surface, locked by workspaceNav.test.ts) and a `StagePage` in App.tsx. The Give feedback card is in WorkspaceShell.tsx (`.ws-fbk`); the rail's Feedback button in SidebarRail.tsx. The band had no "All your notes" link (false premise 3).
5. **Shared header.** Not shared: `QcHeader1531` was hard-wired (the armchair hawk, "queries sent", the two query buttons) and `QcStageRing1531` to the five query buckets and the rail's stage filter; To-do v54 and Contact list v27 copy their markup and wear the `qc1531-*` classes. Cleanest reuse without forking: extract the frames — `shell/OpenHeader` (slots) and `shell/OpenRing` (buckets as a prop), plus `ringArcsFor` in lib/qc1531 — and have the Query Centre render through them. Proved not to change its rendering: its markup is byte-identical in nine states (below), and the CSS is untouched.
6. **Counting.** `BUILT_BONUS = 3`, applied only to `status === "built"`; `fixed` counted 1 like read and planned. `WEEKLY_CAP = 3` (the earliest three per London ISO week; the bonus is not capped). `peakTier`: the stored tier is the higher of the derived and the stored peak, so a rank never goes down. Locked by `functions/src/foundingContributions.test.ts` (eligibility, the cap, the bonus, tiers, peak, standing), `src/lib/foundingStats.test.ts` (the client's copied TIERS equal to the server's) and `functions/src/foundingStats.emulator.spec.ts`.

## The parts

| Part | Commit | What |
|---|---|---|
| A | `84db5c5b4` | `functions/src/foundingContributions.ts` (+ test): `BONUS_STATUSES = ["built", "fixed"]` |
| B | `820efe381` | `firestore.rules` (thread block) + 4 rules tests; `functions/src/feedbackNotes.ts`, `feedbackNotesCore.ts` (+ 10 unit tests), `index.ts`, `firestoreHandle.test.ts` |
| C 1/4 | `7cb501e26` | `shell/OpenHeader`, `shell/OpenRing`, `ringArcsFor`; `QcHeader1531` / `QcStageRing1531` render through them; the byte-identity lock + fixture |
| ref | `4549df2b7` | `design-refs/your-notes-v1/your-notes-v1.html`, enrolled in the design-ref watchlist |
| C | `cecb906b1` | `lib/yourNotes` (+ 16 tests), `lib/yourNotesStore`, `components/notes/*`, the route, the nav section and its icons, the band's `noLast` prop, the smoke file, the nav locks |
| D | `eef82bc77` | `FeedbackDock` restyled; `feedbackPop.css`; `feedbackPanel.css` pruned; `betaChrome.test.tsx` retargeted |
| E | `c7c3f6dfe` | sidebar "See your notes" + pill, rail dot, band "All your notes", palette line, the count in AppShell |
| report | (this) | report, measurement spec, seeder, screenshots |

### Part A — the before and after

Dev has no notes to recompute (false premise 2). The same two writers' notes through the old and the new rules (`computeAll`):

| Writer | Notes | Before | After |
|---|---|---|---|
| A | fixed, read, fixed (a week apart) | 3, Archivist | 9, Scout |
| B | built, planned | 5, Archivist | 5, Archivist |

The new "fixed earns 4" and "fixed is not capped by the week" tests were run red against the old rule before the fix.

## Deploys (dev only)

- `firebase deploy --only functions:foundingStatsOnFeedback,functions:foundingStatsNightly --project scriptally-dev` — both "Successful update operation".
- `firebase deploy --only functions:addFeedbackNote,functions:markFeedbackSeen --project scriptally-dev` — both "Successful create operation".
- `firebase deploy --only firestore:rules --config firebase.dev.json --project scriptally-dev` — release `updateTime` moved from 2026-11-07T09:25:51Z to **2026-11-09T18:15:35Z**, and the uploaded source carries `match /thread/{msg}`.
- `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev` from a clean checkout of the pushed tip (`origin/your-notes-v1`). Before: `index-DIr9O0zd.js` (this branch's base, unchanged). After: **`index-jVsm42PS.js`**.

## Tests, baseline against now

| Gate | Baseline | Now |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `tsc -p functions` | clean | clean |
| `npm run build:dev` | clean (after the `@sentry/react` repair) | clean, no warnings |
| Vitest (root) | 3 failed · 11,767 passed | 3 failed (the same: emuGuard, firestoreTarget ×2) · **11,811 passed** |
| Vitest (functions) | 16 failed · 316 passed | 16 failed (the same three files) · **330 passed** |
| Rules (`firestore.rules.test.ts`, emulator) | — | **187/187**, incl. 4 new thread cases |
| `yourNotesV1.measure.ts` (dev build, live dev data, harness) | — | **11/11** |

New locks: `foundingContributions.test.ts` (fixed earns 4, not capped by the week — red before the fix), `feedbackNotesCore.test.ts` (N1–N4), `yourNotes.test.ts` (YN1–YN6, incl. the copied counting rule summing to the server's `writerTotals`), `openHeaderShared.test.tsx` (the Query Centre header and ring byte-identical in nine states — red on a one-word change), `yourNotesPageSmoke.test.tsx`. Retargeted, each keeping its law: two `betaChrome` cases; the nav locks (`workspaceNav`, `todoWorkspace`, `workspaceTasksNav`) to the new section.

**YN-E1** sent one real follow-up through `addFeedbackNote` on dev: "Still happening" on a fixed note reopened it (its chip went to Not read yet) and the message reached the thread. One `[Still happening]` email went to dev's `FEEDBACK_TO`. The seeder was re-run afterwards.

## Measured on the rendered page

| | 1512 × 982 | 1280 × 800 |
|---|---|---|
| Header columns (art · title block · ring) | 190 · 538 · 560 | 190 · 306 · 560 |
| Ring | 214 × 214 | 214 × 214 |
| Side column | 380 | 380 |
| Note panel | 560 × 962 | 560 × 780 |
| Pop-up | 500 wide | 500 wide |
| Phone (390) | page 390 = 390 (no sideways scroll); ring centred at 214 | |

## Screenshots (`reports/your-notes-v1/shots/`)

`page-*`, `page-full-*`, `empty-*`, `panel-thread-*` (reply and thread), `panel-reopen-*` (still happening), `pop-idle-*`, `pop-dont-*`, `pop-sent-*` at both sizes; `rail-more.png`; `dash-band-link.png`; `phone-390*.png`.

### Differences from the ref, kept on purpose

1. **The ring and legend are the Query Centre's own** (`shell/OpenRing`): legend rows for an empty bucket are disabled but not greyed (the ref greys them), and a legend row shows no pressed state (the ref has none either, so I pass `isOn = false`). Not restyled, because the ring is shared.
2. **The header's art column stays 190 below 1400px.** The ref narrows it to 150 there; the shared header keeps the Query Centre's 190 so the two pages cannot drift. The placeholder itself narrows to 150 × 190 as the ref's does.
3. **The empty panel line says "No reply yet. If one comes, it'll be here."** The ref adds "and we'll email you". Nothing emails a writer when the desk replies (the desk is a later prompt), so the copy says only what the code does.
4. **The "Sent with it" line names the page, the browser and the account** (the ref's words). The note also carries the window size and the app version, which the old panel listed. Worth a look (below).
5. **The pop-up's screenshot drop zone is kept for Don't like**, though the ref draws none. It never renders while `FEEDBACK_SCREENSHOTS` is false (Storage is not set up), so on screen it matches the ref.
6. **"Thank you, harness."** is the harness account's own name — `sentCopy` and the account, as specified.
7. **The panel's "What you sent · date · from page" line** is the ref's, though the brief does not list it.
8. **Phone:** one column in the order specified. The Dashboard band is not built for a phone: it scrolls sideways inside its own wrapper and its ask is cramped. The pop-up uses the existing phone sheet. The switch's four buttons are tight at 390. Not redesigned, per the brief.

## What Nick needs to do

1. **Look at it on dev** (`/your-notes`, as the harness account, or open More › Founding writer). Six `yn1-` notes are seeded for the harness account; remove them with `node tests/e2e/seedYourNotes.mjs --clean` from the branch.
2. **Prod is yours, when you are ready:** the functions `addFeedbackNote`, `markFeedbackSeen`, `foundingStatsOnFeedback` and `foundingStatsNightly`; the rules (the thread block); and hosting. Note that `release/live-1` still runs functions on Node 20 (see memory) and prod has no `functions/.env.<prod>` for the database id.
3. **Decide the context line** (difference 4): keep the ref's three things, or name the window size and version as well.
4. **The founder's desk is the next prompt:** it writes `status`, `statusLog`, `reply` and `thread` messages from `"founder"`. The page reads all four today; until then a status set by hand in the console still shows (the timeline is derived from `statusAt`).
5. **The Dashboard band's last-note chip still says "Sent"** for an unread note, where Your notes says "Not read yet". The band was out of scope; one word to align when you next touch it.
6. **Merge the branch** when you are happy: `your-notes-v1` is cut from the dev line, not `main`.
