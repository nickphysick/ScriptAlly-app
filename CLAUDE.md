# ScriptAlly — Project Notes

## Deployment
- **Dev (review):** `npm run build:dev && firebase deploy --only hosting --config firebase.dev.json --project dev` → https://scriptally-dev.web.app. Hosting-only unless functions/rules changed. Nick deploys prod; deploy to dev only when asked.
- **Dual-database gotcha (cost a wasted re-test):** `scriptally-dev` has TWO Firestore DBs — `(default)` (what the app reads) and a named `ai-studio-…`. The plain `firebase.json` pins `ai-studio-…`, so **dev rules MUST use `--config firebase.dev.json --project dev`** or they silently hit the wrong DB. Prod rules: `npm run deploy:rules`. Functions are europe-west2; the dev functions deploy throws a transient "Internal error" — just retry.
- **Prod:** `git push` then `firebase deploy` (app site `scriptally-app`, pinned in `firebase.json`).

## Conventions & invariants
- **QueryStatus:** always use the exact `QueryStatus` enum strings (e.g. `"Partial Requested"`, `"Revise & Resubmit"`). Never camelCase or ad-hoc variants.
- **Undo:** undo must delete the original activity records this action created/modified — never append compensating entries.
- **Response counting:** each query counts as at most one response, regardless of pipeline stage.

## Dashboard — "Over to you" & the nudge flow
- **"Over to you" container** (`src/components/dashboard/OverToYou.tsx`): a height-capped, internally-scrolling MountCard with two zones — a pinned **"To-do list"** header (serif title + pulsing dot + burgundy urgent-count pill) above the urgent/overdue rows, then a **"When you have a moment"** recommended section whose buckets expand inline, and a footer hint shown (via IntersectionObserver on the Zone-B header) only while that section is off-screen. Ordering is deadline-asc, kept isolated in `buildOverToYouRows`.
- **Nudge flow:** the `nudge_overdue` row's button opens `NudgeModal` (`src/components/NudgeModal.tsx`, inside the Form-11 `FormShell`) with `CheckBackSlider` (`src/components/forms/CheckBackSlider.tsx`, a day-then-week sibling to `WeekSlider`). Logging a nudge runs `logNudge` — an **isolated path** (`src/lib/db.tsx` + the pure `src/lib/logNudge.ts` builder); do NOT fold it back into `dismissTask`.
- **logNudge field mechanics (smallest blast radius):** writes a **non-status** `NUDGE_SENT` activity (no `resultingStatus`, so `recomputeQuery` ignores it) to the top-level `activities` feed — description must start `"Nudge sent to {agent} at {agency}"` (drives the timeline clock glyph + pill), with the check-back + optional note in `details` (new activity fields are silently denied by the Firestore allowlist). Sets `nudgeDate` + `lastNudgeSentDate`, and hides-and-resurfaces the task via a **custom-date** `DismissedTask` (`resurfaceDate` = check-back). It **never** touches `status` / `responseDeadline` and never counts as a response.
- **Derived "Follow-up reminder" timeline node** (`QuerySlideInPanel`): a non-stored projection dated from `nudgeDate`, mirroring the future-only "Response Expected" node (both render only while their date is in the future). Never enters the log, `recomputeQuery`, the response count, or the deletable list.
- **Deferred (next):** the pages **"Mark sent"** and revise **"Record"** pop-ups are still navigate-only.

## Smart Import — loader (Phase 8) + the agency-less fix
- **Loader (`src/components/onboarding/ScatterSettleLoader.tsx`) — COMPLETE, on dev, NOT on prod.** Five beats: 8.1 timing spine `15412ac` (Intro→Work→Reveal; floor + 10s/30s safety + `onTimeout`) · 8.2 intro squeeze-pop `3125906` · 8.3 work-zone forms `9508acd` · 8.4 on-brand card `1087f6a` (white + `SheenWave` inset frame + `StatusDot` + data via `MountPanel` + the agency display helper) · 8.5 grid → squeeze → big sage tick → Overview `b49ee97`.
- **Reused, not rebuilt:** `SheenWave`, `StatusDot`, the agent display helper (`src/lib/agentDisplay.ts`, `4036ad0`), the big-tick pattern, `MountPanel`. Prop seam `{cards, complete, total, onProceed, onTimeout}` is stable — keep it.
- **Gate model:** Reveal fires only on `complete && elapsed >= floor (~2.8s)` — a fast import never flashes, and crystallise never runs before the real data lands. Watch the looping arc at the dev-only route `#/scatter-loader`.
- **Reduced-motion** path is **code-verified only** (shows cards already gridded, then squeeze→tick, still gated on extraction) — **eyeball it once on a real device** with Reduce Motion on; the one check the preview harness couldn't do.
- **Data-loss bug — FIXED + PROVEN dead:** a real dev import of the messy CSV returns **14 agents / 16 queries with Priya present** (the named agency-less record now survives the whole pipeline). Validity rule = **name OR agency**; an empty agency is never a drop condition. The gate was the Firestore rule `isValidAgent` (see the Deployment dual-DB note — the fix only bit once it reached the `(default)` DB).

## Open decisions — park for a fresh head (do NOT resolve tired)
1. **A/B gate** — do import-review flags **block** import (A, current) or merely **advise** (B, recommended)? Both reviews currently hard-block and MUST stay consistent with each other. Spec for B ready at `scriptally-gate-decision-answer.md`.
2. **"Responses Received" undercount** — imported Partial Sent / Full Sent queries derive `hasAgentResponded=false`, so they under-count. Fix when next doing CSV-import work: seed an implied mini-history, or derive the flag from status position (Partial Requested onward = agent has responded).

## Loose ends
- **Response-deadline formula — canonical util, ~5 inline copies remain (backlog, low risk):** the `dateSent + responseTimeWeeks*7` calc now has ONE source of truth, `src/lib/responseDeadline.ts` (`computeResponseDeadline`). The three that matter most already share it: **create** (`addQuery`, db.tsx), **recompute** (the Prompt-3 fan-out `computeAgentDeadlineWrites`), and the **display fallback** (`activityUtils.ts`) — so a stored deadline and an agent edit provably agree. Still inlined elsewhere (separate code paths, lower risk): `db.tsx` updateQueryStatus `calcDeadline` (~:1562), `recordResponse.ts` (~:428), `LogQueryFocusForm.tsx` (~:106), `Queries.tsx` (~:940), `MarkSentPopover.tsx` `addWeeks` (~:42, local-date variant). Repoint opportunistically when next in each file; verify each keeps its own anchor (now vs dateSent) and output format.
- **Security — `ANTHROPIC_API_KEY` rotation pending:** the key was pasted into chat in a prior session. Rotation (revoke → new key → re-set on BOTH projects → redeploy functions) was advised but never confirmed. **Verify rotation before any further Functions work.** (Do not paste the key into chat again.)

## Next session — start here
Confirm/skip the reduced-motion eyeball → call the A/B gate (Open decisions #1) → then either the loader pacing pass (taste iteration) or the next import source. **Prod deploy only after the gate call.**
