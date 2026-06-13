import { describe, it, expect } from 'vitest';
import {
  normalizeResultingStatus,
  getActivityTime,
  deriveStatus,
  deriveResponseFlags,
  deriveRevisionRound,
  derivePipelineDates,
  deriveQueryFields,
  AGENT_RESPONSE_STATUSES,
  DerivableActivity,
} from './queryDerivation';
import { QueryStatus } from '../types';

const t0 = new Date('2026-01-01T10:00:00Z').getTime();
const at = (status: QueryStatus | string | null | undefined, daysAfter: number, id?: string): DerivableActivity => ({
  id,
  resultingStatus: status as any,
  date: new Date(t0 + daysAfter * 86400000).toISOString(),
});

describe('normalizeResultingStatus', () => {
  it('accepts every canonical QueryStatus value', () => {
    for (const v of Object.values(QueryStatus)) {
      expect(normalizeResultingStatus(v)).toBe(v);
    }
  });
  it('rejects camelCase variants (the silent-drop guard)', () => {
    for (const bad of ['partialRequested', 'fullRequested', 'reviseAndResubmit', 'rejected', 'offer', 'noResponse']) {
      expect(normalizeResultingStatus(bad)).toBeNull();
    }
  });
  it('rejects unknown strings and non-strings', () => {
    expect(normalizeResultingStatus('Something Else')).toBeNull();
    expect(normalizeResultingStatus('')).toBeNull();
    expect(normalizeResultingStatus(null)).toBeNull();
    expect(normalizeResultingStatus(undefined)).toBeNull();
    expect(normalizeResultingStatus(42 as any)).toBeNull();
    expect(normalizeResultingStatus({} as any)).toBeNull();
  });
});

describe('getActivityTime', () => {
  it('parses every date shape the two stores use', () => {
    const ms = Date.UTC(2026, 0, 1, 10, 0, 0);
    expect(getActivityTime('2026-01-01T10:00:00Z')).toBe(ms);
    expect(getActivityTime(ms)).toBe(ms);
    expect(getActivityTime(new Date(ms))).toBe(ms);
    expect(getActivityTime({ seconds: ms / 1000 })).toBe(ms);
    expect(getActivityTime({ _seconds: ms / 1000 })).toBe(ms);
    expect(getActivityTime({ toDate: () => new Date(ms) })).toBe(ms);
  });
  it('returns 0 for unparseable/empty so it never wins "latest"', () => {
    expect(getActivityTime(null)).toBe(0);
    expect(getActivityTime(undefined)).toBe(0);
    expect(getActivityTime('not a date')).toBe(0);
    expect(getActivityTime({})).toBe(0);
  });
});

describe('deriveStatus', () => {
  it('empty log → QUERIED', () => {
    expect(deriveStatus([])).toBe(QueryStatus.QUERIED);
  });
  it('query sent only → QUERIED', () => {
    expect(deriveStatus([at(QueryStatus.QUERIED, 0)])).toBe(QueryStatus.QUERIED);
  });
  it('most recent status-bearing activity wins', () => {
    const log = [at(QueryStatus.QUERIED, 0), at(QueryStatus.PARTIAL_REQUESTED, 2), at(QueryStatus.FULL_REQUESTED, 5)];
    expect(deriveStatus(log)).toBe(QueryStatus.FULL_REQUESTED);
  });
  it('order of input does not matter (sorted by time)', () => {
    const log = [at(QueryStatus.FULL_REQUESTED, 5), at(QueryStatus.QUERIED, 0), at(QueryStatus.PARTIAL_REQUESTED, 2)];
    expect(deriveStatus(log)).toBe(QueryStatus.FULL_REQUESTED);
  });
  it('camelCase resultingStatus is not status-bearing → ignored', () => {
    const log = [at(QueryStatus.PARTIAL_REQUESTED, 1), at('fullRequested', 3)];
    expect(deriveStatus(log)).toBe(QueryStatus.PARTIAL_REQUESTED);
  });
  it('same-day entries tie-break deterministically by id', () => {
    const a = { id: 'a', resultingStatus: QueryStatus.PARTIAL_REQUESTED, date: new Date(t0).toISOString() };
    const b = { id: 'b', resultingStatus: QueryStatus.FULL_REQUESTED, date: new Date(t0).toISOString() };
    expect(deriveStatus([a, b])).toBe(QueryStatus.FULL_REQUESTED);
    expect(deriveStatus([b, a])).toBe(QueryStatus.FULL_REQUESTED);
  });
});

describe('deriveResponseFlags — "one response per query"', () => {
  it('agent actions count as a response', () => {
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED]) {
      expect(deriveResponseFlags([at(QueryStatus.QUERIED, 0), at(s, 1)]).hasAgentResponded).toBe(true);
    }
  });
  it('writer-only actions and closes are NOT a response', () => {
    expect(deriveResponseFlags([at(QueryStatus.QUERIED, 0)]).hasAgentResponded).toBe(false);
    expect(deriveResponseFlags([at(QueryStatus.PARTIAL_SENT, 1)]).hasAgentResponded).toBe(false);
    expect(deriveResponseFlags([at(QueryStatus.FULL_SENT, 1)]).hasAgentResponded).toBe(false);
    expect(deriveResponseFlags([at(QueryStatus.NO_RESPONSE, 1)]).hasAgentResponded).toBe(false);
    expect(deriveResponseFlags([at(QueryStatus.WITHDRAWN, 1)]).hasAgentResponded).toBe(false);
  });
  it('multiple agent actions still resolve to a single boolean (counts at most once)', () => {
    const log = [at(QueryStatus.QUERIED, 0), at(QueryStatus.PARTIAL_REQUESTED, 1), at(QueryStatus.FULL_REQUESTED, 2), at(QueryStatus.REJECTED, 3)];
    const flags = deriveResponseFlags(log);
    expect(flags.hasAgentResponded).toBe(true);
    expect(typeof flags.hasAgentResponded).toBe('boolean');
  });
  it('AGENT_RESPONSE_STATUSES is exactly the five agent-acting statuses', () => {
    expect([...AGENT_RESPONSE_STATUSES].sort()).toEqual(
      [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED].sort()
    );
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(AGENT_RESPONSE_STATUSES.has(s)).toBe(false);
    }
  });
});

describe('deriveRevisionRound', () => {
  it('no activities → round 1', () => {
    expect(deriveRevisionRound([])).toBe(1);
  });
  it('plain full send → round 1', () => {
    expect(deriveRevisionRound([at(QueryStatus.FULL_SENT, 1)])).toBe(1);
  });
  it('R&R → full sent → round 2', () => {
    expect(deriveRevisionRound([at(QueryStatus.REVISE_RESUBMIT, 1), at(QueryStatus.FULL_SENT, 2)])).toBe(2);
  });
  it('double R&R → round 3', () => {
    const log = [at(QueryStatus.REVISE_RESUBMIT, 1), at(QueryStatus.FULL_SENT, 2), at(QueryStatus.REVISE_RESUBMIT, 3), at(QueryStatus.FULL_SENT, 4)];
    expect(deriveRevisionRound(log)).toBe(3);
  });
  it('deleting the R&R entry recomputes the round down', () => {
    const log = [at(QueryStatus.FULL_SENT, 2)];
    expect(deriveRevisionRound(log)).toBe(1);
  });
});

describe('derivePipelineDates', () => {
  it('caches each stage date and latest occurrence wins', () => {
    const log = [
      at(QueryStatus.PARTIAL_REQUESTED, 1),
      at(QueryStatus.FULL_REQUESTED, 3),
      at(QueryStatus.REVISE_RESUBMIT, 5),
      at(QueryStatus.FULL_SENT, 7),
    ];
    const d = derivePipelineDates(log);
    expect(d.partialRequestedDate).toBe(new Date(t0 + 1 * 86400000).toISOString());
    expect(d.fullRequestedDate).toBe(new Date(t0 + 3 * 86400000).toISOString());
    expect(d.fullSentDate).toBe(new Date(t0 + 7 * 86400000).toISOString());
    expect(d.partialSentDate).toBeNull();
  });
});

describe('deriveQueryFields — bundle + idempotence', () => {
  it('produces identical fields regardless of input order', () => {
    const log = [at(QueryStatus.QUERIED, 0), at(QueryStatus.PARTIAL_REQUESTED, 1), at(QueryStatus.FULL_REQUESTED, 2)];
    const a = deriveQueryFields(log);
    const b = deriveQueryFields([...log].reverse());
    expect(a).toEqual(b);
    expect(a.status).toBe(QueryStatus.FULL_REQUESTED);
    expect(a.hasAgentResponded).toBe(true);
    expect(a.revisionRound).toBe(1);
  });
});
