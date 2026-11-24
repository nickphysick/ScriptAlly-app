# Card journeys v1 — Step 0 (recon, no edits)

- Hashes: 40/40 OK (`design-refs/card-journeys-v1/SHA256SUMS.txt`), pack from ~/Downloads (both copies md5 327b459d…).
- Dev line: `dev/…-rar211-laqunk-aa215-laqdoor` @ 822966fba, served bundle `index-DQIDPfLr.js`. Carries Record a response v2,
  v2.1 (216f66ae6, e9090fd55, afb22b6b5, 3459af5ef) and the Unknown fix (edd4d67c7 v2.1.1, 634fe254b Log a query). Only the
  two report-only commits of v2.1/v2.1.1 are not on it.
- Baseline: tsc 7 errors, all functions/ (no functions/node_modules in a worktree); build clean; Vitest 13264 passed,
  1 failed, 10 files fail to load (functions/ + AI SDK suites). Gate = no worse than this.

## False premises found
1. `TaskModal` no longer exists (deleted, ToDoPage.tsx:1083). The To-do desk (TodoWorkspace) has its own inline flows
   (`todo/ws/wsFlows.tsx`: sendFlow, offerFlow, quiet close) shared with the phone's PhoneTaskScreen.
2. The search palette has no door for any of the four (open query, Record a response, captures only).
3. The card's ⋯ menu has none of the four (Move to another agent, Delete).
4. Routing is BrowserRouter, not hash: the card on Queries is `/queries?q=<id>`; every other door is a store and does not
   navigate.
5. Reopen today has one form, the card composer's "reopen", and its "recorded by mistake" works only for a pass
   (Rejected): for No Response / Withdrawn it throws "No pass to take off" though offered.

## Doors (desktop) per action, before
- Mark sent: card footer (Mark partial/full sent, Mark sent, Mark resubmitted), grid chip, Materials tab ghost row → card
  composer (`open1522("sent")`). Dashboard Next up, Birds-eye pill, QcOpenCard fallback, agent card, Responses page,
  To-do "Open it ↗" / held task "I've sent it" → `openQueryDrawer({mode:"sent"})` (SentJourney, floating or stepped into
  a panel). To-do desk inline `sendFlow`.
- Close: card footer "Close it" (nudge / quiet states only) → composer "close". Dashboard `no_response_close`, Birds-eye,
  QcOpenCard, agent card (when next step is close), To-do dismiss "withdraw" → CloseJourney. To-do desk quiet flow.
- Answer an offer: card footer "Answer the offer" / "Accept or decline", grid chip → composer "offer" (summary, then
  tell / accept / decline). Dashboard offer tasks, Birds-eye, QcOpenCard, agent card "Record your answer", Responses
  "Answer the offer" → OfferJourney. To-do desk `offerFlow`.
- Reopen: card footer "Reopen" on a closed card; `respondOn` for a closed query → composer "reopen".

## Savers (all exist; none changes derivation)
- Send: `planRecord(pc, partial_sent|full_sent|resubmitted, day, materials)` (qc152Write) — the card's own; also
  `saveSent` (stepSaves) for the drawer. Reply time / nudge: the query patch `writerExpectedDate` + `writerExpectedSetAt`
  / `writerExpectedUnknownWrite`, `nudgeDate`, exactly as Record a response's send (respondStages.planOfResponse).
- Close: `planRecord(pc, "noresp" | "withdrawn" {token withdrew})`.
- Offer: accept `planSigned(c, todo, holders)` (Signed step + recompute + the tell marks); decline
  `planRecord(pc, "withdrawn", {token offer_declined, event offer_declined})`.
- Reopen: `planUnpass` = `planFix` removing the closing step (+ `replyRestartedOn`).
- All commit through `commitMany` (one snapshot, one batch); Undo = `restoreSnapshot`.

## Kinds of send
partial, full, rr (resubmission) — `sendKindOf`. The card composer reads status only, so an offer's "send the full" on a
Queried/Partial query records Partial Sent from the card; the journey uses `sendKindOf`.

## States after an offer answer
Accepted → `Signed` ("Signed" on the grid; footer "You have an agent"). Declined → `Withdrawn` with token
`offer_declined` (grid "Withdrawn"; footer "Closed · You declined"). The reference's "Offer accepted" / "Offer declined"
labels are stand-ins; the app's are used.

## Pip
Only Record a response reaches Pip; the four actions have no flow on him (doors no-op or open his panel). Unchanged.

## Phone
The card composer is desktop only (`qcDesk`). The phone uses the drawer journeys in PhoneFlowShell and the To-do
inline flows; none of them is deleted.
