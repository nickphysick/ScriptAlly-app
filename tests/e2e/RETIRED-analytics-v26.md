# Retired by Analytics v26 (18 Nov 2026)

Analytics v26 (design-refs/analytics-v26) replaces the whole of `/queries/analytics`: v24's desk and seven
sections, the floating section tab, v21's header ring and white card, v17's at-a-glance strip and band, the navy
empty panel, the steps card and Ways to get started. Every lock below reads a part that no longer exists (`data-a17`,
`data-a21`, `data-a24`, `data-sec`), so each is retired by name with its file. The new locks are
`tests/e2e/analyticsV26.measure.ts` (AN26-A1 … L1).

## Files removed

| File | Locks |
|---|---|
| `tests/e2e/analyticsV17.measure.ts` | AN17-1 shell · AN17-2 band · AN17-3 the Query Centre's band · AN17-15 tab · AN17-16 thin sample · AN17-17 phone · AN17-18 manuscript |
| `tests/e2e/analyticsV21.measure.ts` | AN21-A1 header · AN21-A2 card · AN21-L1 overflow |
| `tests/e2e/analyticsV21Shots.measure.ts` | populated · one query · empty (report shots, not locks) |
| `tests/e2e/analyticsV24.measure.ts` | AN24-A3 ring · AN24-B1 desk · AN24-B2 thin · AN24-C1 sections · AN24-S1 pies · AN24-S2 bench · AN24-S3 months · AN24-S4 kept · AN24-S5 waiting · AN24-S6 moments · AN24-U1 units · AN24-I1 empty · AN24-R1 replies · AN24-R2 dates |
| `tests/e2e/analyticsV24Shots.measure.ts` | populated · peek · empty · states · figures · due (report shots, not locks) |

## What carries over, and where

- **The header's edges** (AN21-A1, AN24-A3): AN26-A1 holds the shared header to Queries' top, left, right and height.
- **Outside comparison reads the anchors** (AN24-S2's swap): AN26-F1, with `__SA_AN26_BENCH` in place of `__SA_AN24_BENCH`.
- **Overflow** (AN21-L1): AN26-L1.
- **A request is a reply** (AN24-R1): the headline's replies are `replyTally.all`, asserted in AN26-A1 against the model.
- **Not carried over:** AN17-18's manuscript-switch check (the page still keys its derivation on `location.key` and reads
  the active manuscript every render; no v26 lock switches books mid-run — a follow-up for Nick). AN24-R2's bad-date
  listing (v26 shows no list; bad dates are still left out of every timing figure by `isDatedReply`).

## Kept

- `tests/e2e/an17Lib.ts` — still imported by `onfTemplate.measure.ts`.
- `tests/e2e/seedAn21.mjs`, `tests/e2e/seedAn24.mjs` — seeders only; no lock reads them now.
