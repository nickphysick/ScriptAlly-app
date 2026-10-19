/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 §C — the pinned band's figures (`bandFigures`): heard back is lib/responses' "more" and "passed"
 * over every query on the list, a No reply is never heard back, overdue is `pastExpected`, and this week is
 * lib/qcSentWeeks' Monday week.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { bandFigures, BAND_WEEKS } from "./qc140";

const NOW = new Date(2026, 9, 14, 12).getTime(); /* a Wednesday */
const DAY = 86_400_000;
const row = (status: QueryStatus, o: { past?: boolean; sent?: number | null } = {}) => ({ status, pastExpected: !!o.past, sentMs: o.sent ?? null });

describe("bandFigures", () => {
  const rows = [
    row(QueryStatus.QUERIED, { past: true, sent: NOW - DAY }),
    row(QueryStatus.QUERIED, { sent: NOW - 9 * DAY }),
    row(QueryStatus.PARTIAL_REQUESTED),
    row(QueryStatus.FULL_SENT, { past: true }),
    row(QueryStatus.OFFER),
    row(QueryStatus.REJECTED),
    row(QueryStatus.NO_RESPONSE),
    row(QueryStatus.SIGNED),
  ];
  const f = bandFigures(rows, NOW);
  it("heard back is (asked for more + passed) over every query, and a No reply is not heard back", () => {
    expect(f.total).toBe(8);
    expect(f.more).toBe(3);
    expect(f.passed).toBe(1);
    expect(f.heardPct).toBe(50);
  });
  it("overdue is the rows past their reply date", () => expect(f.overdue).toBe(2));
  it("this week and the week before come from the Monday weeks", () => {
    expect(f.weeks).toHaveLength(BAND_WEEKS);
    expect(f.thisWeek).toBe(1);
    expect(f.weekBefore).toBe(1);
  });
  it("an empty list reads 0%, never NaN", () => expect(bandFigures([], NOW).heardPct).toBe(0));
});
