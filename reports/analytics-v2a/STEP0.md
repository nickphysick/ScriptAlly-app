# Analytics v2a — Step 0 recon (29 Sep)

## Ref
`design-refs/analytics-v2a.html` was ABSENT from the repo. Found in `~/Downloads/analytics-v2a.html`:
SHA256 `66c208d5…cbce`, 39,398 bytes — both match the prompt. Copied into `design-refs/`.

## Baseline (worktree `ScriptAlly-analytics-v2a`, branch `analytics-v2a` off `main` @ 5a9956aa)
- tsc: 0 errors, exit 0.
- vite build: exit 0; no `error`/`[WARNING]` lines; the two standing dynamic-import notices + chunk note.
- Vitest: 498 files, 8,204 passed, 3 skipped, 0 failed (after symlinking `functions/node_modules`
  into the worktree — without it `functions/src/email.test.ts` fails to import; a worktree artefact).

## A. What exists
- Route `/queries/analytics` → `src/components/QueryAnalytics.tsx`, mounted by `App.tsx` in a
  `StagePage layout="fill" clip`. It uses `WorkspacePageGrid` with a `PageHeader variant="workspace"`
  (the COMPACT header) and a toolbar row (PageTally + RangeToggle + ExportButton).
- Components mounted: StatStrip (the five inset-framed tiles), JourneyFunnel, SendingChart,
  StatusDonut, ReplyHistogram, AgingChart, Horizon, FullsPanel, LatestResponses, ShareCard,
  IllustrationSlot, Panel/PanelRow. Data: `src/lib/analytics.ts` (`buildRows`, `statSet`,
  `funnelStages`, `rangeWindow`, `safePct`, `median`, …).
- App shell v3 HAS landed (`7f95ec95`…`33113f0c`), and page header v2 (`4ff10499`…`1ba1154e`):
  the Stone sidebar, the bar with `BarSwitcher`, and the full `PageHeader`. Gate A passes.

## B. Manuscript scope
`localStorage["scriptally_active_manuscript_id"]`, written by `BarSwitcher`, which then re-opens
the route. No context or store. The page reads the key every render and resolves it with
`resolveScopedManuscript`; App re-renders on navigation, so the page re-renders. Per the house
law the new page also keys on `useLocation().key`. Gate B passes (a live source exists; it is a
key + a navigation, not a subscription).

## C. Derivability
- sent / still out / requests / rate: yes — `buildRows` (`reachedRequest`/`reachedFull`/`reachedOffer`
  read history, not current status).
- median wait: yes — `replyDays`, from the activity log's first incoming rung.
- reply window: yes where stated — `Agent.responseTimeWeeks` (WEEKS, number; 0 = not stated).
  Seeded agents all state one (22 agents in `seed.mjs`, the two no-window agencies omit it).
- stage-to-stage: yes, from `stageMs` (earliest dated activity per status) falling back to the
  query's own `partialRequestedDate` / `partialSentDate` / `fullRequestedDate` / `fullSentDate` / `offerDate`.
  A row with a missing endpoint is excluded and counted, never guessed.
- weeks to an ending: yes — the close rung's own date (`stageMs[REJECTED|NO_RESPONSE|WITHDRAWN]`,
  then `rejectedDate`, then `lastStatusChange`); offers from the offer rung.
- volume: yes — `sentMs` month + today's status.
- story rail: first query / first request / first full / offer / busiest month / most recent full —
  yes. Letter-version change: yes — `sentPackageId ?? packageId` → `SubmissionPackage.queryLetterVersionId`
  → `ManuscriptVersion.versionName`. Emitted only when the version CHANGES along send order.

## D. Share card — OMITTED
`ShareCard.tsx` opens a dialog whose only output, "Download PNG", is `disabled`
(`TODO(analytics-share-png)`). There is no way to share anything. No mechanism → no button.

## E. Export — OMITTED
`ExportButton` renders `disabled` ("Export is not wired up yet", `TODO(analytics-export)`).

## F. Existing tests touching Analytics
Unit: `analytics/{analyticsPageSmoke,charts,clickThrough,horizon,journeyFunnel,outcomes,waits}.test.tsx`
(they import the retiring components — retire with them), `lib/analytics` tests, `queriesPageSmoke.test.tsx`
(renders QueryAnalytics — survives), `workspacePageGrid.test.tsx` (census names QueryAnalytics as a
workspace-header page — must be re-enrolled as opted out), `pageStructure.test.ts` (TDZ/order lock —
survives), `workspaceShell.test.tsx` (route/bar name — survives).
Playwright: `analyticsChain`, `analyticsPolish`, `analyticsShot` read `.an-*`/`.qa-*` selectors that
this rebuild retires — presumed vacuous. ~20 census suites list the route (masthead matrix, gap
audit, etc.); they will be re-pointed via the ONE opted-out register (`tests/e2e/optedOut.ts`).

## G. Seed
Reported from the rendered dev page in Phase 2 (see the run report).

## H. Themes / tokens
`design-refs/themes.md` last regenerated at `4ff10499` (27 Sep) — current for the shell.
- The five state fills exist as THEME-INDEPENDENT `:root` tokens in `f12.css`:
  `--state-queried` (sand #f7efe3) · `--state-agent` (sage #e0e5dd) · `--state-you` (blush #f5e6df) ·
  `--state-offer` (slate #d7e0e8) · `--state-closed` (grey #e4e1db). Same value under all three themes,
  by design (they are locked). Not listed in themes.md.
- Anthracite: `--sp-anthracite` (#2a3a52, `:root`, primitives.css). Ink: `--sp-ink` (#1c130f).
- Blush for the rail head = `--state-you` (identical hex).
- **Cream #f8f4ec — NO TOKEN.** Nearest: `--sp-cream` #f5f1eb, `--mat-parch-2` #f7f3ee. The build
  uses `--sp-cream` (the shell's own cream) and flags the 3-unit difference.
- Stone #e7e3dc = `--shell-side`. Parchment #fdfaf5 = `--shell-card`. Ref's lane ground #faf7f1: no
  token; uses `--mat-parch-2`.
- Faces: titles `--sp-type` (Special Elite), body `--sp-serif` (Source Serif 4) — both already the app's.

## StatusDot at 80px
Renders (overrideSize is uncapped above 12). The stroke is 2 on a 24 viewBox, so at 80px it draws
~6.7px where the ref's hand-drawn ring is 4.2px. Not forked, not changed — a visible difference.
