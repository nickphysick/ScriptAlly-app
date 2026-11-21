# Next up v1.1 — short sentences, undated requests, the offer's full, and Coming up

Quick lane on the dev line. Branch `next-up-v1-1` (off `next-up-v1`), stacked onto what dev served
(`dev/cr1-qc163-db3-acv2-cr5-qcc-acv21-nu1-cr11-acv211` @ d80c2b92b, `index-BJO6iTBo.js`) as
`dev/cr1-qc163-db3-acv2-cr5-qcc-acv21-nu1-cr11-acv211-nu11`.

## False premises

1. **"18 characters at most" and "send partial / full / revision unchanged" disagree once.** "Send your revision." is 19.
   The ruling to leave the three unchanged won; the unit lock allows that one sentence 19, and the page check proves it
   fits with no ellipsis at both sizes (0px over).
2. **Marsh's missing date did not reproduce.** His query (cv25-q-09) has no `fullRequestedDate` and no activity rung
   in either store, but it does have `lastStatusChange` 24 Sep (seedCompsV25 wrote it with the send). `qcStages` dates
   a stage from `lastStatusChange` where the document has no date of its own, so Next up reads **"Full asked for ·
   24 Sep", 58 days waiting**, with "58 days" on his row. Measured on the emulator and on the **live dev page with the
   bundle dev served before this deploy**. Whatever showed no date, it is not that bundle reading this document today.
   My first answer (commit 49218f5b1) said nothing dated it; that was wrong, and c0e82e26d corrects it.
   Note that the date it shows is really the send date: the seed never recorded when the full was asked for.
3. **The Daniel O'Rourke row does not exist on what dev serves.** His query (cv25-q-04, Queried 20 Jun) has an agent
   with no reply time and no nudge booked, so `replyTask` raises no task, and with no reply date he is not "Coming up"
   either. The cv25 book's Next up on live dev reads: Tom Ellery's offer, then Jonathan Marsh's full (58 days), then
   Clara Beaumont's partial (2 months). If you saw an O'Rourke row, it was on another surface or another bundle.
4. **The offer's "send the full" query is not at Offer** (v1's report said it was). It is the *other* agent's query,
   told of the offer, at Queried, Partial requested, Partial sent or Full requested, with `offerReply: "full"`.

## Commits (`next-up-v1-1`)

| Commit | Item |
|---|---|
| e14238ac5 | 1 · sentences: no names, ≤18 (`LEAD_SENTENCE_MAX`); NU11-a (unit), NU11-F (page) |
| 49218f5b1 | 2 · "{Partial/Full/Revision} asked for · date not recorded" where nothing dates the request; NU11-b, NU11-D |
| c0e82e26d | 2 · correction: Marsh is dated by `lastStatusChange`; NU11-D locks the rule, not one answer |
| 56f32866b | 3 · one `sendKindOf` (lib/queryActions/sendKind.ts) for the slide-out, the To-do desk's send flow, its words and the parked chip; NU11-c |
| (this) | measurement ledger and report |

## Item 1 · the sentences

Nudge "Send a nudge." · Gone quiet "Close it or nudge?" · Offer "Answer the offer." · Tell "Tell the others." · Sends
unchanged. Measured (NU11-F, 1512×982 and 1280×720, Dashboard v3's column): every one of the eight runs **0px** past
its box. The ellipsis CSS stays as the safety net.

Recorded but not ruled (NU11-Fo): a task's own title still overflows: **"Add typical reply times for 20 agents."**
(160px over at 1280) and Coming up's **"Reply window ends for Hester Blaine."** (151px over at 1280). These are the
"other" kind's words, outside the list you ruled.

## Item 2 · undated requests

Where nothing dates the request, the label reads "Full asked for · date not recorded" (same for partial and revision);
the number and caption stay absent; the row shows no wait. Unit-locked for all three kinds (NU11-b). See false premise 2
for why Marsh himself is dated.

## Item 3 · the offer's full

`sendKindOf`: a revision first, then a full (asked for, or `offerReply: "full"` with an offer behind it), then a
partial. Before, the status-only reading had four copies: SentJourney, the To-do desk's `wsFlows` send flow (which also
saves), `todoWs` words (title, doing line, hawk line, strip), and `parking.ts` (the parked chip). All read the one
function now. The save path is unchanged; this task's kind is now "full", so it records **Full Sent**, not Partial
Sent. The To-do's ordinary sends are unchanged (unit-checked), and the door both pages call (`drawerDoorForTask`) is
the same `{ mode: "sent" }`.

Also fixed on the Next up card: this task dated "Full asked for" from the query's stage start (for a Queried query, the
send). It now dates the ask from `offerToldOn`, when the reply was recorded, or says "date not recorded".

Not measured on the page: the seed has no query with `offerReply: "full"`, so items 3's locks are unit and source.

## Item 4 · "Coming up" today (no change)

Seed example, seed-ms-1, Hester Blaine (`coming:seed-cal-soon-q`):

- **Sentence:** "Reply window ends for Hester Blaine." (other variants: "Response expected from {name}." after a send,
  "Send-by date for {name}.", "Offer decision date for {name}.")
- **Agent row:** seal, name, agency; **no number**.
- **Track:** the four stops, current stage ringed.
- **Label:** "Reply expected by 1 Dec" (or "Send by" / "Answer by").
- **Button:** one, filled: **"Record a response"**, which opens the record-a-response drawer for that query.
- **Rows beneath:** e.g. "Reply window ends for Alasdair Crewe", no wait.
- The sentence overflows Dashboard v3's column (151px at 1280).

## Measurement

`npm run e2e:emu -- tests/e2e/nextUp1.measure.ts tests/e2e/dashV3.measure.ts` on the dev line (merge a616ede79):
**28 of 29 passed; DB3 (Dashboard v3) 6/6.** The ledger (`ledger.json`, that run) holds 296 checks, **294 green**. The
two reds are NU11-D1/D2, which expected Marsh to read "date not recorded"; the page read "24 Sep · 58 days" (false
premise 2), so the lock was wrong, not the page. It was corrected in c0e82e26d to lock the rule instead.

**The re-run with the corrected lock did not run:** the emulator guard refused it at 16.4 GB free (floor 20 GB; the
volume went from 27 GB to 17 GB during the session, none of it in this worktree). So the corrected NU11-D is
unmeasured. What it checks was read directly on both the emulator (that run) and the live dev page
(`cv25-card-dev.json`): label "Full asked for · 24 Sep" with number 58, which the corrected lock passes.

Offsets unchanged: 16 / 76 / 121.5 / 159.5 / 192.5 on every tracked kind at both sizes. `cv25-card.json` is the cv25
book's card on the emulator; `cv25-card-dev.json` is the same read off the live dev page before this deploy.

## Deferred

- The "other" kind's own titles overflow (item 1, NU11-Fo): yours to rule.
- The seed has no `offerReply: "full"` query, so item 3 has no page check: whoever next seeds the offer journey.
- The decisions belong in `docs/decisions/dashboard.md` (main only) at merge.
