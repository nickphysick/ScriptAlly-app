# Query Centre — Record response, Mark sent and Nudge, in the desk

Run of 4–5 Sep 2026 · ref `design-refs/query-panel-v6-record-response-desk.html` (sha256 d7cda6bc…, verified before build) · commits `c5f2da61 → 6d37a748 → 325d44cb → b56639f4 → e0f6742f → f2c5eb55` (+ the report/shots commit carrying this file). Gate at every commit: tsc 0 · production build clean (whole log grepped, never tailed) · full Vitest **0 failed** (7,349 → 7,353 → 7,354 passed as locks were added). No deploys. No `git stash`. All commits `--only` with audited path lists; the calendar session's concurrent commits (`e504358c`, `22e038c1`) never rode one.

---

## ⚠️ False premises and surprises, first

1. **THE HEADLINE FINDING — partial, full and rejected records are DENIED on dev, and have been since 26 Aug.** Not this run's doing: `recordQueryResponse` writes `materialsType`/`materialsQuantity` (partial + full), `fullVersionSent` (full) and `feedbackType` (rejected) onto the NESTED rung, and `isValidActivityNested`'s ten-field allowlist — added 26 Aug — has none of them. The journey's own hardcoded `materialsQuantity: 0` stringifies to `"0"`, which is truthy, so **every** partial/full carries a denied key. Probed field-by-field on `cor-move-b`: the base ten-field shape ACCEPTED, then `+ materialsType/materialsQuantity` DENIED, `+ fullVersionSent` DENIED, `+ feedbackType` DENIED. The query-doc update and the feed twin are fine — only the nested create dies, so the lib's own revert runs and **nothing is left half-applied** (verified: cor-move-b byte-identical after a failed save). R&R, offer, no-reply and holding records carry none of the keys and work.
   - **Why nobody saw it: the monoculture fixture.** Since 26 Aug no harness committed a materials-bearing response — the correction suites commit through `patchActivity`/`deleteActivities`, the log-sheet run through `addQuery`. Every fixture exercised the clean branches. This run's post-save scene was the first real partial in ten days, and it failed on its first attempt.
   - **The fix is four fields in `firestore.rules`** (do-not-touch this run), in `isValidActivityNested`: add `'materialsType', 'materialsQuantity', 'fullVersionSent', 'feedbackType'` to the `hasOnly` list, with validators in the file's own idiom:
     ```
     && (!data.keys().hasAny(['materialsType']) || (data.materialsType is string && data.materialsType.size() <= 64))
     && (!data.keys().hasAny(['materialsQuantity']) || (data.materialsQuantity is string && data.materialsQuantity.size() <= 64))
     && (!data.keys().hasAny(['fullVersionSent']) || (data.fullVersionSent is string && data.fullVersionSent.size() <= 128))
     && (!data.keys().hasAny(['feedbackType']) || (data.feedbackType is string && data.feedbackType.size() <= 64))
     ```
     Then the dev rules deploy per the Deployment section (named config, named project, verify by `updateTime`, wait before probing) — and note `probeNested`'s four attempts above are the ready-made verification. **Until it lands, the record journey and the respond desk both fail closed on those three outcomes, with the error toast and no residue.**
2. **The v6 ref is committed but NOT enrolled in `.refhashes.json`** — the manifest was not quiet for 12h (the calendar session's commit sat 4h55m before this run began). Hash verified by hand instead; enrolment is one `--update` away once the window clears.
3. **`responseDraftToPayload` hardcodes `materialsType: "Pages", materialsQuantity: 0`** — the §2 desk OVERLAYS the collected qty/unit (and no-reply's close reason) rather than inheriting the zero. Proved red by dropping the overlay.
4. **A nudge draft template already existed** — `nudgeDraft` (`src/lib/nudgeDraft.ts`), shared by NudgeModal and the To-do walkthrough. Decision 4's first branch applied: used, never reinvented. `requestedProse` moved from FocusFlow into the lib so all three callers read ONE request-prose mapping.
5. **The desk is 460px** (was 440) — the ref's own geometry.
6. **MarkSentPopover carried a feature the brief never mentioned** — the version-sent field (the D5–D8 law). Ported into MarkSentDesk *before* the popover was deleted, so nothing was lost to the drawing.
7. **The mobile more-sheet still needs NudgeModal** — the desk has no mobile geometry (a fixed right-inset card). The modal keeps ONE mount, gated `isMobile`; every desktop route opens the desk. Conservative choice, flagged below.

---

## Step 0 — recon, and the red gate

**The gate did not fire**: the response sheet does NOT write status fields directly. `recordQueryResponse` (src/lib/recordResponse.ts) is activity-first — response fields + the twinned activity docs, then `recomputeQuery` derives status. One primitive, and the desk uses it unchanged.

Recon answers the brief asked for: `nudgeDraft` exists (§4 uses it); `logNudge`/`buildNudgeWrites` is the isolated nudge path (non-status activity, `nudgeDate`/`lastNudgeSentDate`, taskFlag snooze); `recordMaterialsSent` is the mark-sent primitive (twinned docs, one id); `deleteActivity`'s nudge branch already reconciles `nudgeDate`/`lastNudgeSentDate` from remaining nudges via `reconcileNudge` and releases the snoozed flag when none remain — the brief's "reminder rescheduled through `reconcileNudge`" is that machinery, reused not rebuilt.

## §1 — the desk targets the top bar *(commit 6d37a748)*

`CorrectionDesk` hosts a second tenant: `deskVerb` (`respond | marksent | nudge`), one desk at a time (opening a verb closes a correction and vice versa), the anchor travelling per call through the fork's own `correctingTriggerRef`. Width 460, notch clamped, Escape captured, focus returned. The opener wears `.qpn-act--live` — a `--stage-accent` ring from the same token the tab underline and the rung ring read. `QueryPanel` gained `onPrimary(anchor)`/`onNudge(anchor)`/`liveAction` — additive; the primary and Nudge visibility rules are untouched (decision 5; the turn gate `facts.turn === "sand" || "agent"` is now also locked).

Four pre-existing locks re-anchored: `correctionDesk.test`'s and `queryPanel.test`'s first-match `<CorrectionDesk` slices now anchor on the `{correcting && activeQuery && (` guard — the verb desk made the bare tag ambiguous.

## §2 — Record response *(commit 6d37a748)*

Six kind cards (real `StatusDot`s), offer routes OUT to the existing journey (`openRecord`), details step with When (max today), Their words, the partial's qty control (`stepQty`/`parseQty`/unit snapping), no-reply's close-reason segment, and the derived line.

**The ghost IS the saved rung** (decision 2): ONE proposed activity object, three readers — `buildTimelineRows` (the same renderer; `.tl-ev--ghost` is skin only), the derived line (status word = `deriveQueryFields` over the proposed events; court = `getPrimaryAction`), and the save's payload overlay. The waiting rung moots naturally because the rail's `primaryAction` derives from the proposed status — measured on the page (see the harness). Save = one `recordQueryResponse` with the qty/close-reason overlays; toast with the primitive's own `undo`; `.tl-ev--fresh` pulses the landed rung (resolver keyed on status + timestamp, cleared at 1.8s).

Locks proved red: ghost-text ≡ saved-text (a "(draft)" suffix reddened it) · the overlay (dropped) · one-call (doubled). `recordResponseShell`'s `status:` sweep caught a local field — renamed to `toStatus` rather than weakening a sweep that is right.

## §3 — Mark sent *(commits 325d44cb + e0f6742f)*

`MarkSentDesk`: sent-on (max today) · how (`CREATE_SEND_METHODS`) · what-went (qty pre-filled from the request's own recorded figure, editable) · the reminder chips with the agency's window as the leading sage pill · note · derived line. **The window rule is the log sheet's verbatim**: the desk feeds the SAME `draftExpectedOverrideIso`, so keeping the window pill writes NO override (proved red by inverting the spread's condition).

One send activity through **`markSentWithReceipt`** — a receipt-bearing face of the existing `recordMaterialsSent` (db.tsx, additive: the To-do handler table keeps its `Promise<void>` face) capturing `writerExpectedDate`/`writerExpectedSetAt`/`nudgeDate` BEFORE the write. **Undo = both halves**: `deleteActivities([activityId])` then the prior fields restored with `deleteField()` fallbacks.

**`e0f6742f` — the "as asked" label is honest**: it renders only while the draft still equals a figure the request RECORDED — never beside a default the agent never stated, never after an edit (the fabricated-value family). Proved red by reverting the condition.

## §4 — Nudge *(commit 325d44cb)*

`NudgeDesk`: the mail block — **To** the agent's recorded email (absent when none is recorded — absence, not a placeholder), "from your own mail client", the letter from `nudgeDraft({agentName, dateSent, msTitle, requested: requestedProse(status)})` — then nudge date (default today), How (Email), and "Nudge me again after" chips: the **existing reminder's own interval leads as the sage default** (nudgeDate − its anchor in whole weeks, else 4), then 6/8, Pick a date (min = nudge + 1), No more nudges. Derived line: *Records a **Nudged** rung … Status stays **{status}** … ScriptAlly never sends.*

Save: **clipboard FIRST, inside the click's gesture** (best-effort — a refusal never blocks the record), then ONE `logNudge` (return widened additively with `activityId` + prior `nudgeDate`/`lastNudgeSentDate`), toast `Nudged {agency} — draft copied · next nudge {date}`. **Undo**: `deleteActivities` — whose nudge branch reconciles from remaining nudges and releases the snoozed `nudge_overdue` flag when none remain — then the PRIOR reminder restored explicitly, because a reminder set at mark-sent time is backed by no nudge activity and the re-derivation alone would clear it. No ghost rung for a nudge: the ref draws none and a nudge proposes no status.

Locks proved red four ways: copy moved after the write · half an undo · a hand-written letter · the default chip losing its lead.

## §5 — the viewport surfaces retire *(commits b56639f4 + f2c5eb55)*

- **`MarkSentPopover` is DELETED**, not unmounted — its only importer was Queries.tsx (checked; the other five references were comments, all repaired in the same commit) and it had zero openers after §3. **The version-sent field moved into MarkSentDesk first**: gated at ≥2 versions, seeded `sendVersionDefault(openingRead(…))` (the shared derivation, said-not-guessed), saved as `bookVersionId || undefined` never `""`, the no-warning copy verbatim. `queryVersions.test`'s D5–D8 retargeted at the desk/page with each law stated; `queryAmbient`/`queriesMobile`'s standing-anchor locks retargeted at the retirement (the desk takes its anchor PER CALL — no standing ref to have two homes).
- **`NudgeModal` stays a component** (the dashboard's) and keeps ONE `#/queries` mount, **gated `isMobile`**. The drawer's closure-offer "Nudge now" opens the DESK notched to the button that asked (`QueryTimeline.onNudge` now carries the clicked control).
- **The ghost takes no ⋯** *(f2c5eb55, found on a live harness snapshot)*: `activityId: "__ghost"` is truthy, so the menu gate rendered "Correct this entry" on the proposal — a fork onto a nonexistent document that would also close the verb desk mid-compose. Both ⋯ sites gate on `!== ghostId`; locked by count (one real row → one menu) after the first draft's slice bounded on a class prefix and passed in both directions.
- **Reported, deliberately untouched**: the `GRID_IS_THE_PAGE = false` browsing branch (Queries.tsx ~6151–7949, dead behind a `true` constant) still holds three `setIsNudgeOpen(true)` callers and the `nudgeAsk` early-nudge confirm — a separate cleanup. `TimelineComposer` was already mounted nowhere before this run (its own retirement decision, not this cascade's).

## The harness *(tests/e2e/queryRespondNudge.measure.ts · shots in reports/query-respond-nudge-shots/)*

Measurement worktree at `f2c5eb55` (guarded `cd`, clean-tree proved inside it), `npm run build:dev`, `vite preview :4573`, `seedCorrection.mjs` re-run. Scenes at 1440 **and** 1920: the kind cards (desk 460 · six cards · accent ring on the opener · zero ghosts before a choice) · details + ghost (exactly one `.tl-ev--ghost`, the waiting rung mooted) · the notch measured against the BUTTON'S OWN CENTRE (computed `::after` + card rect vs button rect — never the arrow's derivation re-run) · the nudge desk (the letter opens "Dear …", the default chip leads selected, "No more nudges" present) · the with-you mark-sent desk (cor-move-a records no figure, so "as asked" is ABSENT — the honesty fix's rendered proof). Post-save at 1440: **an R&R** (see finding 1 — the outcome the deployed rules accept), one rung landing with the fresh pulse, Undo pressed inside the toast's lifetime with nothing navigating in between, the count restored by poll.

**8/8 passed (37.4s).** The measured numbers (`reports/query-respond-nudge.json`):

| claim | 1440 | 1920 |
|---|---|---|
| desk width | 460 | 460 |
| kind cards | 6 | 6 |
| opener's accent ring | ✓ | ✓ |
| ghosts before a choice | 0 | 0 |
| **notch centre vs button centre** | **29.992 vs 29.992** | **29.992 vs 29.992** |
| ghosts after the choice | 1 (`Partial requested · 5 SEPT`) | 1 |
| waiting rung mooted | ✓ | ✓ |
| nudge chips | `4 wks · 3 Oct` (sage, selected, leads) · 6 · 8 · Pick a date · No more nudges | same |
| the letter | opens `Dear …`, "from your own mail client" | same |
| mark-sent "as asked" | **absent** (cor-move-a records no figure — the honesty fix, rendered) | absent |
| mark-sent window chip | `8 wks · their window`, sage, leads | same |
| post-save (1440) | 1 real rung → 2, fresh pulse = 1, Undo polls back to 1 | — |

Three harness iterations, each a recorded lesson: the kind-card locator said "Partial requested" where the card says **"Asked for a partial"** (a test handing the page an input it does not render); the rung count used `.tl-ev`, which is FLAT across a successful save because the waiting rung leaves as the real one arrives (the composed-count trap — and the failed assert sat BEFORE the Undo press, leaving a rung standing once; the spec now captures, **presses immediately**, then asserts, and run 3's failed assert left the account untouched, probed); and `openDrawerOn` waited for `.tl-ev` where the real-docs precondition is the first `.tl-more` (the synthesised root renders instantly, so `before` read 0). Residue after each red was probed and cleaned (`seedCorrection.mjs` sweeps and rewrites).

## NOT RUN, with cause

- **A partial/full/rejected save end-to-end** — blocked by finding 1 (the deployed nested allowlist). The client half is lock-covered (§2's one-call + overlay + ghost-seam locks) and the failure mode is clean (error toast, full revert, no residue — probed). Re-run the post-save scene as a partial once the rules land; the spec's comment says so at the substitution.
- **Reduced-motion eyeballing** of the desk/pulse — same standing caveat as every pack: the pulse's `@media` off-switch is in the sheet, unverified on a real device.

## Open questions (conservative option taken, per the standing rule)

1. **Mobile nudge keeps the modal** (finding 7). Retiring it below md needs a mobile desk treatment or a sheet variant — Nick's call.
2. **Repeat-nudge undo leaves the `nudge_overdue` flag snoozed at the NEW check-back** when earlier nudges remain (the first-nudge case is fully released by `deleteActivity`'s reconcile). The brief's undo wording — "removes the activity and restores the previous reminder" — is met; un-snoozing the flag would need a flag receipt on `logNudge`.
3. **The rules fix** (finding 1) — Nick's deploy, or a follow-up run authorised to touch `firestore.rules`. The four lines are written above; `probeNested`'s four attempts are the verification.
4. **The v6 ref's enrolment** — one `scripts/check-design-refs.mjs --update` once the manifest has been quiet 12h.
