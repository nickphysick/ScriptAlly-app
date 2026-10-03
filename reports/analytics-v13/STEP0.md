# Analytics v13 — Step 0 recon (3 Oct)

## Ref
`design-refs/analytics-v13.html` was ABSENT from the repo; `~/Downloads/analytics-v13.html` matches the
prompt exactly (SHA256 `dcc58775…3a38f`, 37,629 bytes) and is committed from there.

**The ref is incomplete as a stylesheet.** Its markup uses `.fig`, `.fh`, `.key` (and the `i.sand` /
`i.rose` / … swatches), `.two`, `.chap.white`, `.n` and `.nm`, and its `<style>` declares none of
them. Rendered at 1440×820 it therefore draws: no white section containers, the two-up stacked, the
keys run together as one unstyled line, and the chart numerals in the default face. Where the ref is
silent the prompt's baked decisions are the spec (white containers on sections 1/3/5, a dark rule
over each figure, keys with swatches, the two-up side by side).

## Baseline (worktree `ScriptAlly-analytics-v13`, branch `analytics-v13`, off `origin/main` @ da30cf1a)
tsc 0 errors · build exit 0, no error/WARNING · Vitest 511 files, 8,237 passed, 3 skipped.

## A. What exists
- `/queries/analytics` → `src/components/QueryAnalytics.tsx`. **Analytics v2a ran and is merged**
  (`bebf63a0`, 29 Sep) — the prompt's "never run" is false. On top of it, **living headers v3 (`2c0cd923`)
  gave the page a living header**: `PageHeader … living={…}` with `analyticsHeaderCopy` (lib/livingHeaders),
  a dev count override, and an empty-state exhibition (`AnalyticsExhibit.tsx`, the funnel over a sample).
- Mounted today: PageHeader (living), AnvSkeleton, AnalyticsExhibit, StoryRail (on PageRail), AnvHero,
  AnvRange (All / 6m / 3m), AnvJourney, AnvFacts, AnvReplyChart, AnvEndings, AnvStages, AnvVolume, AnvCaveats.
- **Removed by this pass:** the living header on this page, its copy function `analyticsHeaderCopy` and its
  tests, `AnalyticsExhibit`, the story rail, the hero, the range control, the fact line, and the v2a
  charts (re-drawn in the v13 forms). **Kept:** `/queries/analytics` in `LIVING_ROUTES` — that table is
  what puts the page name in the bar's breadcrumb, which the prompt wants.
- App shell v3 landed (`7f95ec95`…). Living headers v2/v3 landed (`04cf479b`…`11f28bf1`). Gate passes.

## B. Scope
Unchanged since v2a: `localStorage["scriptally_active_manuscript_id"]`, written by `BarSwitcher`, which
re-opens the route; the page reads it every render and keys its derivation on `useLocation().key`. Gate passes.

## C. Derivability (all from `buildRows` + the query document's dated rungs; nothing stored)
- Funnel (furthest stage, closed queries included): yes — `reachedRequest/Full/Offer`.
- Per month, each query's status today: yes.
- **Share of all queries — the ref's four segments do not cover every query.** asked for more / no reply
  yet / closed for silence / withdrawn sums to 27 only because the ref has no cold rejection. Real data
  does, so the bar adds **"passed on the letter"** (rejected with no request). All derivable.
- Share of requests: offer / still reading / passed after reading — plus **"requested, not sent yet"**,
  which the ref has no segment for and real data has.
- Stated window: `Agent.responseTimeWeeks`, in WEEKS (0 = not stated). Dev seed: every seeded agent
  states one except the two deliberately window-less agencies.
- First reply date: yes (log first, the document's dated incoming rungs where the log has none).
- Stage gaps, weeks to an ending, lanes (start, and close date if closed): yes.
- Nothing had to be left out.

## D. Export and time range
Export was already omitted by v2a (it had never worked). The range control (All / 6m / 3m) filtered the
whole page through `rangeWindow`; only `analyticsV2a.measure.ts` depends on it. **Both are removed in this
pass** — the ref has neither. Flagged for Nick.

## E. Tests touching Analytics
Unit: `analytics/analyticsPageSmoke.test.tsx` (rewritten), `lib/analyticsModel.test.ts` (extended),
`lib/livingHeaders.test.ts` (its Analytics copy cases retire with the function),
`shell/livingExhibitSource.test.ts` (its AnalyticsExhibit rows retire), `lib/livingRoutes.test.ts` (unchanged),
`shell/workspacePageGrid.test.tsx` (census unchanged: still opted out), `queriesPageSmoke`,
`pageStructure` (unchanged). Playwright: `analyticsV2a.measure.ts` (retired — superseded by
`analyticsV13.measure.ts`), `livingHeadersV3.measure.ts` (its Analytics row retires), ~20 census suites
(see the v2a manifest; unchanged status).

## F. Seed
Reported from the rendered page in the run report.

## G. Tokens
State fills: `--state-queried` sand, `--state-you` rose/blush, `--state-agent` sage, `--state-offer` slate,
`--state-closed` stone — `:root`, theme-independent by design. Anthracite `--sp-anthracite`. Hairline
`--shell-hairline` / `--shell-rule`. Ink `--sp-ink`.
**No token:** the ref's chart rust `#b4553f` (nearest: `--o-ms` #8a4a3c, which is also the ref's own CSS
`--rust`) · `#4a5d78` / `#7f8ea3` anthracite steps (drawn as `--sp-anthracite` at reduced opacity, as the
ref's funnel already does) · the placeholder tint `rgba(233,201,184,.35)` (→ `--state-you`) · the page
`#f5f1eb` (the shell paints the page; nothing here repaints it).
`design-refs/themes.md` last regenerated 27 Sep (`4ff10499`) — current for the shell; it does not list the
`--state-*` fills.
