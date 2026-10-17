# Retired and rewritten by Analytics v24 (17 Oct)

Analytics v24 (`design-refs/analytics-v24/analytics-v24.html`) replaces v21's sections C to H, and v17's phone sections,
with seven question sections. Each asks one question, answers it in its first sentence and draws one simple chart.
The empty page's "How it works" becomes the steps card. The header, the card, the desk's construction, the tint mechanism,
the navy empty panel, Ways to get started, the section tab and `AppFooter` stand.

Every case below was run against the base (`5f566578`, untouched, `vite preview` on its own port) and against v24, so a
retirement names a case that this pack turned red, not one that was red already. **AN17-17's disc readings were red on
the base too** (header v3 put the band in the shared panel, whose disc is not `[data-probe="band-disc"]`). They are
untouched here and still red: reported, not fixed.

## Retired whole

| Case | What it read | Why it goes | What holds the new page |
|---|---|---|---|
| AN21-C1 · tints | nine sections, tints on 2, 4, 6 and 8 | there are seven sections; tints on 2, 4 and 6 | AN24-C1 |
| AN21-D1 · window | v21's reply-window rows | the rows are deleted; S4's said-against-took pairs replace them | AN24-S4 |
| AN21-E1 · steps | v21's step-by-step journey | the journey is deleted (baked decision 6) | (none: retired by decision) |
| AN21-F1 · records | v21's records band and featured card | deleted; S6's dated moments replace them | AN24-S6 |
| AN21-G1 · workspace | the How things stand workspace | deleted (baked decision 6) | AN24-S5 (who you are waiting on) |
| AN21-I1 · empty | the empty page, including v21's example card ("37%", "10 of 27") | the example card is replaced by the steps card; the panel and ways stand | AN24-I1 |
| AN17-7 · funnel | v17's funnel bars | deleted on both widths | AN24-S1 |
| AN17-8 · log | v17's training log of weekly bars | deleted on both widths | AN24-S3 (monthly columns) |
| AN17-9 · shares | v17's share bars | deleted on both widths | AN24-S1 |
| AN17-12 · scrub | the log's scrub | deleted with the log | (none) |
| AN17-13 · lanes | v17's lanes (the campaign over time) | deleted (baked decision 6) | (none: retired by decision) |

## Rewritten (the law kept, the subject moved)

- **AN21-A3 → AN24-A3 · ring** — the label is "Replied on time" and the arc is kept ÷ placed (`ringOf(replyKeeping)`);
  pressing it scrolls to S4. Still no rust in the ring.
- **AN21-B1 → AN24-B1 · desk** — the three cards are Queries sent, Asked to read more and Your typical reply time; card 2
  is `requestRate`; card 3 draws one dot per reply with the TYPICAL mark at the typical (±1px). The cards go to S3, S1, S4.
- **AN21-L1 · overflow** — kept; the sections it scrolls to are 2, 4 and 5 (the widest rows) in place of v21's 4, 6 and 8,
  which no longer exist (a scroll to a missing section is a no-op that would have measured the top of the page).
- **AN17-15 · tab** — the seven questions, and a menu of seven.
- **AN17-16 · thin sample** — reads v24's readings (`reading-fig`) in place of v17's funnel counts and v21's record values.
  **It found a real fault on its first run**: S2's overdue reading drew a bare "0". Fixed (`ff49052f`).
- **AN17-17 · phone** — v17's phone figures (funnel rows, the log and its Show all, the share bar, the reply rows, the
  ≥9px chart labels) are deleted; the lock now asks for the seven sections on the phone and one-column readings. The disc
  readings are kept and are still the base's reds.
- **AN17-18 · manuscript** — S1's first pie stands in for the funnel's top count.

## Pinned

- **AN17 now pins "The Smoke Test" (`seed-ms-1`)** as AN21 and AN24 do. Mid-run on 17 Oct another session added a
  manuscript with no queries (`db60-pre`) to the shared harness account and AN17 opened it, so AN17-17 and AN17-18 read
  an empty page. The pin is written once per tab, so AN17-18's switch through the bar still holds.
