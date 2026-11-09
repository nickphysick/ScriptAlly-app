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
