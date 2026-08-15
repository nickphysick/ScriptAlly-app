# Found on the way — the overnight run, 15 Aug

Standing instruction for this run: anything noticed in passing gets **one line here and no work**.
Nothing below is fixed. Nothing below was swept for siblings. They are candidates, not a backlog.

The one exception the run was allowed — something that would make a later phase wrong or unsafe —
is marked `[FIXED-IN-RUN]` with the reason it could not wait.

## The list

1. **The offer card's holders section ends with `HANDOFF_NOTE`, which is written for a send.**
   `TodoDock.tsx` renders "The send happens in your own email — come back and mark it, and the query
   moves with it" beneath "Who else holds material". On an offer that describes an act the section
   does not offer — the rows draft notes to *other* agents. Visible in
   `reports/card-conformance/decide-1920.png`.

2. **No card on dev has more than ONE timeline entry, so two of the three ring treatments have
   never rendered.** Every measured card shows either 0 entries or 1, and that 1 is always `r-now`.
   `r-out` and `r-in` — and the connector rule between rings, which needs two — are unexercised by
   the harness account's data. Not a code finding; a data one.

3. **`chase` and `close` cards show `Nothing logged yet.` on dev.** Five chases and two closes, all
   of them queries that were demonstrably sent, and none has a single activity row in its
   subcollection. Either the seed writes no per-query activity for those, or `useDockActivity` is
   not reaching it for that shape. Worth one look; not looked at.

4. **The offer on dev has no reply-by date**, so §2.6's `decide` branch — the `Reply by / 7 Sept`
   band fact — has never rendered either. The card is conformant (no forward fact → no band fact);
   the branch is simply untested by real data.

5. **A housekeeping `fix` card cannot be docked at all.** Clicking the Fix row leaves the previous
   card in the pane; the row does not take `sel`. That is `openDock` refusing an undockable key
   (5792a21) working as designed — but it means the `fix` bucket has no reachable card surface on
   the page, while §0 lists it as one of the six and §2/§3/§4 all specify its behaviour.

6. **§6.2 — `NO DATE ON RECORD` shows on 2 of 12 rail rows on dev**: the R&R for Iris Kwan and the
   `12 wish lists` housekeeping row. Both are cards with no anchor date to derive from rather than a
   derivation failing to reach a date that exists — so the wording is correct in both cases. It is
   the harness account's gaps, as §6.2 offered as one of its two explanations.

7. **`.tdk-tlw` keeps `white-space: nowrap` inside a now-fixed 66px grid track.** Harmless for
   `5 Jun`; a longer date string (`4 May 2024`, which the close cards' data can produce) would
   overflow its track rather than wrap. Not seen on dev; the data that would show it exists.
