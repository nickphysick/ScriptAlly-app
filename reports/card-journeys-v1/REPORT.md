# Card journeys v1 — mark sent, close, answer an offer and reopen become journeys (dev only)

Branch `card-journeys-v1`, cut from the dev line `dev/…-aa215-laqdoor` @ 822966fba. Dev moved during the run to
`…-laqdoor-fw11` (feed wording v1.1, bundle built from 8a26b1f3e); the work is merged into it as
`dev/…-laqdoor-fw11-cj1`, which is what dev serves (bundle: see "Deploy" at the end). Nothing is on `main` or prod.

## False premises (and findings that need a ruling) — first

1. **`TaskModal` no longer exists** (ToDoPage.tsx:1083 deleted it). The To-do desk has its own inline flows
   (`todo/ws/wsFlows.tsx`), shared with the phone's task screen. The desk's send / R&R / offer buttons now open the
   journeys on the desktop; the phone keeps the inline flows.
2. **The search palette has no door** for any of the four, and **the card's ⋯ menu** has none (Move to another agent,
   Delete). Nothing to repoint.
3. **Routing is `BrowserRouter`, not hash.** The card on Queries is `/queries?q=<id>`; every journey leaves the path
   and query string as they were (measured).
4. **Reopen's old "recorded by mistake" only worked on a pass.** It was offered on every closed card, but threw "No
   pass to take off" for No Response and Withdrawn. The journey takes off any close.
5. **⚠️ NEEDS A RULING — the Firestore rules' expression ceiling blocks Mark sent on fuller queries.** With a reply date
   and a reminder, Mark sent on the harness's Full Requested and Revise & Resubmit queries is DENIED by the rules (the
   query update hits Firestore's 1,000-expression limit once about 17–18 optional fields are present; already noted by
   the Controls: entry v1 session). Everything up to and including the review is green for both. The same send with
   Unknown and no reminder (two fewer query fields) saves: reports/card-journeys-v1/evidence/rules-ceiling-probe.txt.
   **Record a response's own "Yes, it's gone" fails the same way on the dev line without this work** (recordResponse21
   P1, P2 are red on `…-laqdoor-fw11` alone). `firestore.rules` is out of scope; the smallest change that would carry it
   is a cheaper `isValidQuery` on update (validate only `affectedKeys()`), Nick's to schedule. Not worked around: writing
   fewer fields would change what the journey records.
6. **The same ceiling refuses the "tell the others" marks on some sibling queries** when an offer is accepted with the
   task. The host now uses Record a response's own ruled fallback (v152.1): each mark probed, the rest saved in one
   batch, the refused agents named in a toast.
7. **The reference's "Offer accepted" / "Offer declined" labels are stand-ins.** The app's own words are used: an
   accepted offer reads **Signed** (footer "You have an agent"); a declined one reads **Withdrawn** (footer "Closed ·
   You declined").
8. **No count of "requests sent" exists.** Mark sent's review shows two existing figures instead: "with your pages"
   (`holdsPages`) and "active queries" (`liveCount`). A "requests sent +1" figure needs a ruling on what it counts.

## Step 0 — doors and savers

The full door map is reports/card-journeys-v1/STEP0.md. In short, before this work:

| Action | Card (composer, `open1522`) | Drawer (`openQueryDrawer`) | To-do desk inline |
|---|---|---|---|
| Mark sent | footer "Mark partial/full sent", "Mark sent", "Mark resubmitted"; grid chip; Materials tab | Dashboard Next up, Birds-eye, QcOpenCard, agent card, Responses, To-do "Open it", held task "I've sent it" | sendFlow |
| Close | footer "Close it" (nudge / quiet) | Dashboard `no_response_close`, Birds-eye, QcOpenCard, agent card, To-do dismiss "withdraw" | quiet flow's close |
| Answer an offer | footer "Answer the offer" / "Accept or decline"; grid chip | Dashboard offer tasks, Birds-eye, QcOpenCard, agent card, Responses | offerFlow |
| Reopen | footer "Reopen" on a closed card; `respondOn` for a closed query | — | — |

After: every desktop door in the first two columns opens the journey (from the card: over the card, which steps back;
from anywhere else: over that page). The To-do desk's send / R&R / offer buttons open it. The phone is unchanged.

### Gap tables (what the old form asked → what the journey asks)

- **Mark sent.** Composer: When, What went (chips). Drawer SentJourney: the request, what you're sending, sent on / via,
  reading window (8/12/16 weeks or a date), nudge or nothing. Journey: What went (asked-for card, "I sent exactly that",
  tiles, the sample control, version, named synopses), Sent (Today / Yesterday / calendar, not before the request),
  Reply time (1–26 weeks + Unknown, one nudge tick). **Not carried:** SentJourney's "via" (how it went) — the card's
  own send does not record it either; to carry it, the send step's `sentVia` (already allowed on the nested log).
- **Close.** Composer: close as No response / I withdrew it, When. CloseJourney also had "They've stopped taking
  queries" (+ a recheck) and the withdrawal's why / told / remind-me. Journey: No reply (today), I withdrew it (When),
  {First} passed (→ Record a response). **Not built, needs a ruling:** "They've stopped taking queries" and the
  withdrawal's reason / "remind me to tell them" — the reference has neither; they stay on the phone's CloseJourney.
- **Answer an offer.** Composer: accept (close the others as withdrawn; to-do to tell those with pages) / decline (a
  note). Journey: accepted / turned down, When, Others (to-do with all n agents, or Not now). **Not carried:**
  "Close the others as withdrawn" on accept — not in the reference; the To-do's tell task remains. "Taking time to
  decide" and "I asked for more time" stay on the card ("Tell them") and the To-do.
- **Reopen.** Composer: "recorded by mistake" (passes only) / "got back in touch" (the composer's reply). Journey: I
  closed it too soon (any close) + a new reminder; {First} replied after all → Record a response.

### Kinds of send covered
Partial, full (asked for, or an offer's "send the full" — `sendKindOf`; the composer read status only and recorded a
partial there), resubmission after revise and resubmit. All three measured to the review; the partial to the finish.

## Per journey

| Phase | Commit | Save path (one `commitMany`, one snapshot; Undo = `restoreSnapshot` + notes removed) | Locks (red → green) |
|---|---|---|---|
| 1 Harness + mechanics | 62048668b | — | cardJourneyDoor C1–C4 (C1, C2, C4 red on the base files; C3 green before: lending is v2.1's); e2e J1–J4 ×4, red on the tree (the card's form opened): ledger/red-phase1 |
| 2 Mark sent | 96f3c2ea2, 35a792037 | `planRecord` partial_sent / full_sent / resubmitted with what went + `writerExpectedDate`/`SetAt` or the Unknown stamp + `nudgeDate` | cjSend M1–M5 (M3/M4 red before wiring; M5 red on the committed send, found on the side-by-sides); e2e J send 13/13, partial 18/18, Unknown 9/9, full & revision 11/11 to the review then DENIED (finding 5) |
| 3 Close | 80e4d4dc5 | `planRecord` noresp / withdrawn (withdrew) + nudgeDate, closePlan cleared | cjClose K1–K4 (K4 red before wiring); e2e J close 13/13, no reply 17/17, withdrawn 14/14, passed hand-over 3/3 |
| 4 Answer an offer | f96138f16 | accepted `planSigned` (+ tell marks on every other open query, in the snapshot); turned down `planRecord` withdrawn (offer_declined); refused-marks fallback | cjOffer O1–O4 (O4 red before wiring); e2e J offer 13/13, accepted 17/17 (red at the save before the fallback), declined 9/9 |
| 5 Reopen | a29f6f711 | `planUnpass` = `planFix` removing the closing step (found by `byEventOrder`) and its feed twin, `replyRestartedOn` + `nudgeDate` | cjReopen P1–P4 (P4 red before wiring); e2e J reopen 13/13, too soon with reminder 18/18, without 19/19, replied hand-over 3/3 (R2 red until the preview read the query's own log) |
| 6 Every door | a4a94bb9b | — | cardJourneyDoors E1–E4 (E1, E3, E4 red on Phase 5's files; E2, the phone keeping its drawer, green before and after); e2e Dashboard 4/4, To-do 5/5 |

### Shared mechanics (Phase 1), as measured
From the card: the journey opens over it; the card stays mounted, `translateX(-40px) scale(.955)` from its right edge,
dimmed .45, inert (30 presses of Tab never reach it); Escape, ✕ or a click on the dimmed card closes the journey and the
card comes forward unchanged; finishing shows the card behind already in its new state, and "Back to {First}'s card"
brings it forward. Agent step always done, not a button. Navy head with the Archivist's head. The form takes the
query's status colour, then the colour it is moving to. Reviews preview the real grid card from the save's own plans
(read from the query's own log as the journey opens). Nothing cut off at 1440 × 900 on any review (measured on all
nine review paths).

## Retired and left
Nothing deleted: every old form is still reachable somewhere.
- **The phone:** SentJourney, CloseJourney, OfferJourney (QueryDrawer / PhoneFlowShell); wsFlows sendFlow, offerFlow,
  quiet close (PhoneTaskScreen). Owner: the phone app.
- **The card composer's send / close / offer / accept / decline / reopen / unpass** (QcComposer1522 + Queries.tsx
  `save1522`): the fallback while a journey is not live (`CARD_JOURNEY_LIVE`), so each phase reverts alone. Owner: the
  query card. Delete once the four are ruled final.
- **The offer's "tell the others"** (composer "tell", OfferJourney step 1 from the tell tasks): not one of the four.
- **The To-do desk's quiet-task close** (inline, beside Keep waiting and They replied): left; a ruling can route it.

## Pip
Pip (the practice query) has none of the four today; the journeys ignore him (`practice-` ids are never intercepted)
and his flows are unchanged.

## Proposed, not individually ruled (built as the brief proposed)
Every headline and finish line above; the stamps "Closed" and "Reopened"; the resubmission wording ("Your revision's
gone. Great work!", "Logged. Revision sent!", "Your revision is with {First}."); skipping When for no reply; the reopen
slider's 1–26 weeks + "No reminder", starting at 4; an illustration slot on every finish screen.

## Side by side (reports/card-journeys-v1/compare/index.html)

Share of pixels that differ by more than 40/255 on any channel, the build drawn at the reference's size. The reference
pictures the app's card relabelled with stand-in people; the build uses the emulator account's own queries, so names,
dates, counts and the page behind (the Queries page's real header, the Dashboard) differ by design. Panels 4–11%;
whole pages 28–37% (the page behind).

| Screen | Diff | Screen | Diff | Screen | Diff |
|---|---|---|---|---|---|
| 01 send card before (page) | 33.0% | 14 close hand-over pass | 5.9% | 27 offer card after (page) | 35.0% |
| 02 send over card (page) | 27.8% | 15 close review no reply | 5.0% | 28 offer review declined | 5.3% |
| 03 send what went | 7.2% | 16 close closed no reply | 5.4% | 29 offer declined | 8.7% |
| 04 send what went scrolled | 10.9% | 17 close card after (page) | 30.9% | 30 reopen card before (page) | 30.8% |
| 05 send when | 4.7% | 18 close when withdrawn | 4.8% | 31 reopen why | 4.1% |
| 06 send when calendar | 6.1% | 19 close review withdrawn | 5.1% | 32 reopen hand-over reply | 7.9% |
| 07 send reply time | 5.6% | 20 close closed withdrawn | 5.4% | 33 reopen nudge | 5.2% |
| 08 send reply time unknown | 4.7% | 21 offer card before (page) | 37.0% | 34 reopen no reminder | 4.2% |
| 09 send review | 7.2% | 22 offer answer | 5.1% | 35 reopen review | 5.5% |
| 10 send logged | 11.1% | 23 offer when | 5.6% | 36 reopen reopened | 10.7% |
| 11 send card after (page) | 34.6% | 24 offer others | 4.6% | 37 reopen card after (page) | 31.2% |
| 12 close card before (page) | 31.6% | 25 offer review accepted | 5.8% | 38 from the Dashboard (page) | 32.5% |
| 13 close why | 4.7% | 26 offer signed | 10.9% | 39 discard bar | 7.6% |

Screen 38 is the Dashboard's lead task, which on the harness is an offer ("Record your answer"), not a send. Screens 14
and 32 are Record a response's own screens (the mock's are placeholders).

## Other specs on the merged tree
Record a response v2 (V0–V3, B1–B9) green; v2.1 P3, P4 green; **P1, P2 red — also red on `…-laqdoor-fw11` without this
work** (finding 5). Log a query V2, V21, V22, Unknown U1–U4 green; V23-D, V23-DW green; **V23-S, V23-T red — also red on
the dev line alone** (they wait for the header's "Log a query", which add-agent v2 moved behind Quick actions; the
laq-specs-door fix covered V21/V22 only); V23-E red in the combined run at load, green alone at load 2.8.

## Baseline against final
| | Baseline (822966fba) | Final (dev line + this) |
|---|---|---|
| tsc | 7 errors, all functions/ (no functions/node_modules in the worktree) | the same 7 (none outside functions/) |
| build | clean | clean |
| Vitest | 13,264 passed, 1 failed, 10 files not loading (functions/ + AI SDK) | 13,634 passed, 0 failed (W3 widened to name the card journeys' shell); functions/node_modules linked, so those files load |

## Deploy
See below (added after the deploy).
