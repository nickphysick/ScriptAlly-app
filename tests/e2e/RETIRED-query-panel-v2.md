# Retired by Query panel v2

The open query is a side panel, and its actions step inside it. The four suites below measured surfaces that
no longer open. Each is skipped in place (a `beforeEach` that skips with the reason), by Nick's ruling of
12 Oct. All four were already in `RED-BACKLOG.md`: none went red because of the panel.

## Retired

| Suite | Tests | Why | Covered now by |
| --- | --- | --- | --- |
| `deskBounds.measure.ts` | 1 | It presses "Record response", "Mark sent" and "Nudge" and waits for a desk beside the query. Those desks stopped opening on 27 Sep, when the action drawer went live | QP2 V7 to V9 (an action steps the panel) |
| `deskPaint.measure.ts` | 1 | It reads what is painted at that desk's top edge. There is no desk | QP2 V7 to V9 |
| `drawer3.measure.ts` | 6 | §2 and §4 open the same three desks; §1 measures the old drawer's stage block, and the drawer is replaced by the panel | QP2 V1 to V13, QP1 |
| `moveEntry.measure.ts` | 1 | It enters through the old three-column list (`.f12-row`), which nothing renders. Its claim (move an entry to another query, undo, both sides recomputed) is `qcMove`'s first case | `qcMove.measure.ts`, re-pointed at the panel's ledger |

## Not retired

`deskPaint2.measure.ts` was not named in the ruling and is unchanged. It is in the red backlog for the same
reason as `deskPaint`.
