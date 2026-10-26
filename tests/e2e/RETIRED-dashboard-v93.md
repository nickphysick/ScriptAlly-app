# Retired by Dashboard v93 (26 Oct)

| Suite | Case | Why | Replaced by |
|---|---|---|---|
| `dashV77.measure.ts` | **DB77 C1–C6** — v77's founding card: its variants, nothing cut in idle/write/sent, the copy table, the send path, the record | The card no longer takes feedback (the sidebar's Give feedback does); it shows the writer's contributions | DB93 C1–C7 (`dashV93.measure.ts`) |
| `dashV77Shots.measure.ts` | the v77 card's report shots (idle/write/sent) | drove the retired card's form | `dashV93Shots.measure.ts` |
| `src/lib/feedbackRecord.ts` (+ test) | the v77 record (live read of the writer's own `betaFeedback`) | imported only by v77's card; the contributions are now counted on the server (`foundingStats/{uid}`) | `functions/src/foundingContributions.ts`, `src/lib/foundingStats.ts` |

**Kept:** DB77 A1–A4 (the big-screen layout) and D1 ("us", not "Nick"); `lib/sendFeedback` (the dock uses it); the owner-read `betaFeedback` rule (harmless, and the console status workflow is unchanged).

**Re-pointed, not retired:** DB71 F3 reads Dash93Founding (`.d93-frame`, the variant on show, its picture); its `L2-fw-172` and `F3-art-140` breaks target the new card. DB71 C1/G1 and DB58 R2 read the task card's band (Part A).
