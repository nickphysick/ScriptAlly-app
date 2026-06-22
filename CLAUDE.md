# ScriptAlly — Project Notes

## Deployment
- **Hosting is two separate sites on the prod project, wired via named targets** (`.firebaserc` `targets` + the `hosting` array in `firebase.json`) — never a bare `firebase deploy` (that would push functions + firestore rules + every site at once). Each site has its own script:
  - **App** (site `scriptally-app`, serves `dist`): `npm run deploy:app` → `firebase deploy --only hosting:app --project prod`
  - **Holding** (default site `gen-lang-client-0801391782`, serves `holding/`, the "Coming Soon" page): `npm run deploy:holding` → `firebase deploy --only hosting:holding --project prod`
  - **Dev** (project `scriptally-dev`, site `scriptally-dev`, serves `dist`): `npm run deploy:dev` → `firebase deploy --only hosting:dev --project dev`
- **Firestore rules** deploy separately and deliberately: `npm run deploy:rules` (dry-run: `npm run deploy:rules:dryrun`). **Functions** deploy separately: `firebase deploy --only functions[:<name>] --project prod`. Keep these out of hosting deploys.

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
