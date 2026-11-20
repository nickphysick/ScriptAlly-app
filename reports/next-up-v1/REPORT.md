# Next up v1 — journey cards and buttons that say what they do

Branch `next-up-v1`, cut from `dev/cr1-qc163-db3-acv2-cr5-qcc` @ a03e20053 (what dev served, `index-CxA-G9nt.js`; Dashboard v3 is in it).
Design ref `design-refs/next-up-v1.html`, SHA256 `64fb6331…468e34` (checked, committed alone at fcd612b04).

## False premises

1. **"Open task" did not open a step.** For every query task, Next up's button and rows called `openQueryPanel(qid)`: the slide-out with no step open. The task's own door (`drawerDoorForTask`, carried on the item as `action`) was only used by the To-do.
2. **The answer step is not the offer task's door.** `offer_received`'s door opens the offer journey at step 1, "The others". The answer is step 3, "Your decision". "Record your answer" asks for step 3. The To-do's door is unchanged.
3. **"Queried {date}" on the nudge label is only true for a query.** A nudge after a partial or a full counts from that send, so the label names the send: "Partial sent 3 Sep · reply expected by …".
4. **"nudged {date}" on gone quiet:** `no_response_close` can be due with no nudge ever sent. The label then omits it rather than inventing one.
5. **Tell the other agents: two different counts.** The brief asks for the queries still open ("still reading"). The task counts the queries marked with this offer and not yet told. The card shows the brief's count, which is 38 on the seed, against 6 to tell.
6. **The seed has no tell task.** It is derived only once an offer's step carries `tellLater` and other queries carry `offerRefQueryId` with `offerTold: false`. The measurement sets this up for its own case and restores it.

## Step 0: task kinds → the reference's cards

| In Next up today (group · taskType) | Card | What "Open task" opened | Now opens |
|---|---|---|---|
| req · `partial_requested` | Send partial | query panel, no step | panel at `sent` |
| req · `full_requested`, `offer_send_full` | Send full | query panel | panel at `sent` |
| req · `revise_resubmit` | Send revision | query panel | panel at `sent` |
| nudge · `nudge_overdue` | Nudge due | query panel | panel at `nudge` (I've sent it) |
| quiet · `no_response_close`, `nudge_overdue` (nudge-again) | Gone quiet | query panel | panel at `close` (no reply) / `nudge` |
| req · `offer_received` | Answer the offer | query panel | panel at `offer`, Your decision |
| req · `offer_tell_all`, `offer_tell` | Tell the other agents | the offering query's panel | panel at `offer`, The others |
| house · `hk:*` | Not about a query | agent card, the gap's field in edit | unchanged ("Fill in") |
| ready · `ready:*` | Not about a query | log drawer, agent prefilled | unchanged ("Log a query") |
| **coming · `coming:*`** | **no match** | query panel | the response composer ("Record a response", the item's own action) |

Getting started never reaches this card (`start: null` since first visit v2).

**Opening at a step:** the drawer already had a mode per step, and `preset.step` for the offer journey. The Query Centre already steps a panel into a journey: open the panel, then `openQueryDrawer({…, panel})` once the panel's slot exists (`Queries.tsx` `stepRow` → `pendingStepRef`). So the one change is an optional `step` argument on `openQueryPanel`. No journey logic is touched, and the red gate did not trip.

**Sources:** the request date is `QcRow.stageStartMs`. The expected reply date is `QcRow.expectedMs` (`expectedFor`). The last nudge is `Query.lastNudgeSentDate`. The offer date is `Query.offerDate` (else `stageStartMs`). The last event is `QcRow.lastMs`. The queries still open are `QcRow.court !== "closed"`, on the same book.

## Commits

| Phase | Commit | Files | Measured |
|---|---|---|---|
| ref | fcd612b04 | design-refs/next-up-v1.html | hash |
| 1 · lead card | 63e05a23e | lib/nextUp.ts (+test), Dash2Next.tsx, nextUp.css, dash2.test.tsx (DB2-B retired) | unit (NU1 a–c) |
| 2 · rows | 85f4ae699 | lib/nextUp.ts (+test), Dash2Next.tsx, nextUp.css, nextUp.test.tsx | unit (NU1-d, card) |
| 3 · buttons | 14de295b8 | lib/nextUp.ts (+test), lib/queryPanelStore.ts, Dash58.tsx, Dash2Next.tsx, nextUp.css | unit (NU1 e–f) |
| measurement | (this commit) | tests/e2e/nextUp1.measure.ts, the review aid in Dash2Next.tsx, the agent row's height fix in nextUp.css, DB3's filled-button lock, reports | page, below |

## Measured on the page (emulator harness, 1512×982 and 1280×720)

`npm run e2e:emu -- tests/e2e/nextUp1.measure.ts tests/e2e/dashV3.measure.ts`: **28 passed**. NU1 is 22/22, with 274 ledger rows and 0 red; DB3 is 6/6. Ledger: `reports/next-up-v1/ledger.json`. Shots: `reports/next-up-v1/shots/`.

Each kind is put in the lead by the card's dev-only review aid (`window.__SA_NEXT_LEAD`). The plan and its order are untouched, and the production bundle carries none of it (grepped). Every kind leads on `seed-ms-1`: partial, full, revision, nudge, quiet, offer, tell (seeded, then restored), housekeeping, ready, coming.

- **R:** the five rows sit at the same offsets on all seven tracked kinds: 16 / 76 / 121.5 / 159.5 / 192.5px from the lead's top, at both sizes. The first run found nudge and coming 4.6px shorter: a card with no agency line had a shorter agent row. Fixed with one height for the agent row (`min-height: 46px`).
- **A:** the first stop's centre is under the seal's centre (0.0px), and the last stop's right edge is under the number's right edge (0.0px), at both sizes.
- **W:** no text wraps (counted as text lines, not box height), nothing leaves the card, and there is no horizontal overflow. No "ago" in the rows. The head reads "3 of N · See all". One filled button per card.
- **E:** a 40-character name and a 40-character agency leave the lead's height unchanged (247.1 → 247.1).
- **B:** each button opens the panel at its step: sent "The request"; nudge "The nudge"; close "Where it stands"; offer "Your decision"; offer "The others". Closing with ✕ (then Discard where asked) wrote nothing on Firestore's channel. The activity log was 117 rungs before and after.

## Built as proposed but not individually ruled

- The arrows mark on the Full stop for a revision request (the current stop draws the query's own status, R&R).
- "months quiet" is counted from the query's last event (`lastMs`); weeks under two months.
- Days up to 60, then whole months (`floor(days / 30.4375)`); 0 reads "today" with no caption.
- The fallback destination for "Tell the other agents" was not needed: the task's own door (the offer journey at "The others") is useful, so "See who to tell" opens that.
- A stop the query never passed through stays faint (a full asked for straight from the query: the Partial stop is faint), as in the reference.
- Housekeeping across several agents shows the gap's two letters and "20 agents" in the agent row.
- Coming up (no match) keeps the track and labels its date ("Reply expected by …"). Its button is its own action.
- Gone quiet's caption is "weeks quiet" / "months quiet". Nudge's is "days past date" (three words, as the brief's table says).

## For Nick

- **The sentence shortens in Dashboard v3's narrow column.** At 1280 the card is about 330px wide, so "Close it, or nudge aga…" and "Tell the others you have an …" lose words (shots quiet-1280x720, tell-1512x982). One-line-with-ellipsis is honoured. A wider left column or a smaller sentence size would fix it; both are outside this card's brief.
- **Noticed, not changed:** `SentJourney` picks its kind from the query's status, so an `offer_send_full` task (status Offer) would open the sent journey as a partial. That door was already shared with the To-do.

## Deferred

- The sentence width above (owner: Nick, a ruling).
- Moving these decisions into `docs/decisions/dashboard.md` when this line meets main. The file exists only on main, so writing it here would only make a conflict (owner: whoever merges the dev line).
