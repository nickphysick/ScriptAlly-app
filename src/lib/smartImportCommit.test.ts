import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Firestore boundary so the commit's orchestration can be exercised without a real DB.
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args: any[]) => ({ _kind: 'collection', path: args.slice(1) })),
  doc: vi.fn((...args: any[]) => ({ _kind: 'doc', path: args.slice(1) })),
  getDocs: vi.fn(async () => ({ docs: [] as any[] })),
  setDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  Timestamp: {
    fromMillis: (ms: number) => ({ _ts: ms }),
    fromDate: (d: Date) => ({ _ts: d.getTime() }),
  },
}));
vi.mock('./firebase', () => ({ db: {} }));
vi.mock('./recomputeQuery', () => ({ recomputeQuery: vi.fn(async () => {}) }));

import { setDoc } from 'firebase/firestore';
import { impliedRungs, assignTimes, commitSmartImport } from './smartImportCommit';
import { ParsedAgent, ParsedQuery, SmartImportResult } from '../types/smartImport';
import { QueryStatus } from '../types';

const mockSetDoc = vi.mocked(setDoc);

const q = (over: Partial<ParsedQuery> = {}): ParsedQuery => ({
  agentRef: 'a1', dateQueried: null, status: QueryStatus.QUERIED, confidence: 'high', ...over,
});

describe('impliedRungs — the history shape a final status implies', () => {
  const statuses = (qq: ParsedQuery) => impliedRungs(qq).map((r) => r.status);

  it('Queried → just the queried rung', () => {
    expect(statuses(q({ status: QueryStatus.QUERIED }))).toEqual([QueryStatus.QUERIED]);
  });

  it('Partial Sent → queried, partial requested, partial sent (sent implies requested)', () => {
    expect(statuses(q({ status: QueryStatus.PARTIAL_SENT }))).toEqual([
      QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
    ]);
  });

  it('Full Sent → queried, full requested, full sent (no partial implied)', () => {
    expect(statuses(q({ status: QueryStatus.FULL_SENT }))).toEqual([
      QueryStatus.QUERIED, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
    ]);
  });

  it('a dated partial stage on a Full Sent query is still included', () => {
    expect(statuses(q({ status: QueryStatus.FULL_SENT, partialSentDate: '2026-02-01' }))).toEqual([
      QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
    ]);
  });

  it('Revise & Resubmit → implies a full was read', () => {
    expect(statuses(q({ status: QueryStatus.REVISE_RESUBMIT }))).toEqual([
      QueryStatus.QUERIED, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT,
    ]);
  });

  it('a terminal status → queried + the terminal rung, carrying its closed date', () => {
    const rungs = impliedRungs(q({ status: QueryStatus.REJECTED, closedDate: '2026-03-03' }));
    expect(rungs.map((r) => r.status)).toEqual([QueryStatus.QUERIED, QueryStatus.REJECTED]);
    expect(rungs.find((r) => r.status === QueryStatus.REJECTED)?.date).toBe('2026-03-03');
  });

  it('carries the real date onto each dated rung and null onto the rest', () => {
    const rungs = impliedRungs(q({ status: QueryStatus.PARTIAL_SENT, dateQueried: '2026-01-01', partialSentDate: '2026-02-02' }));
    const byStatus = Object.fromEntries(rungs.map((r) => [r.status, r.date]));
    expect(byStatus[QueryStatus.QUERIED]).toBe('2026-01-01');
    expect(byStatus[QueryStatus.PARTIAL_REQUESTED]).toBeNull(); // never fabricated
    expect(byStatus[QueryStatus.PARTIAL_SENT]).toBe('2026-02-02');
  });
});

describe('assignTimes — ordering keys for derivation (never surfaced)', () => {
  it('all-dated rungs keep their real times', () => {
    const out = assignTimes(
      [{ status: QueryStatus.QUERIED, date: '2026-01-01' }, { status: QueryStatus.PARTIAL_SENT, date: '2026-02-01' }],
      1_000_000
    );
    expect(out.every((r) => !r.provisional)).toBe(true);
    expect(out[0].ms).toBe(new Date('2026-01-01').getTime());
    expect(out[1].ms).toBe(new Date('2026-02-01').getTime());
  });

  it('a provisional rung after a known anchor sits 1ms later and is flagged', () => {
    const out = assignTimes(
      [{ status: QueryStatus.QUERIED, date: '2026-01-01' }, { status: QueryStatus.PARTIAL_REQUESTED, date: null }],
      1_000_000
    );
    expect(out[1].provisional).toBe(true);
    expect(out[1].ms).toBe(out[0].ms + 1);
  });

  it('leading provisional rungs sit just before the first known date, in order', () => {
    const out = assignTimes(
      [
        { status: QueryStatus.QUERIED, date: null },
        { status: QueryStatus.PARTIAL_REQUESTED, date: null },
        { status: QueryStatus.PARTIAL_SENT, date: '2026-05-05' },
      ],
      1_000_000
    );
    expect(out[2].ms).toBe(new Date('2026-05-05').getTime());
    expect(out[1].ms).toBe(out[2].ms - 1);
    expect(out[0].ms).toBe(out[1].ms - 1);
    // monotonic increasing ⇒ the dated final rung derives as the status
    expect(out[0].ms).toBeLessThan(out[1].ms);
    expect(out[1].ms).toBeLessThan(out[2].ms);
  });

  it('a fully-undated query gets a synthetic monotonic key from import-base + ladder index', () => {
    const out = assignTimes(
      [
        { status: QueryStatus.QUERIED, date: null },
        { status: QueryStatus.PARTIAL_REQUESTED, date: null },
        { status: QueryStatus.PARTIAL_SENT, date: null },
      ],
      9_000_000
    );
    expect(out.every((r) => r.provisional)).toBe(true);
    expect(out.map((r) => r.ms)).toEqual([9_000_000, 9_000_001, 9_000_002]); // ladder order preserved
  });
});

describe('commitSmartImport — orchestration', () => {
  beforeEach(() => { mockSetDoc.mockClear(); });

  const agent = (over: Partial<ParsedAgent> = {}): ParsedAgent => ({ ref: 'a1', name: 'Jane Doe', agency: 'Acme', confidence: 'high', ...over });
  const result = (agents: ParsedAgent[], queries: ParsedQuery[]): SmartImportResult => ({
    columnMapping: {}, statusTranslations: [], agents, queries, warnings: [],
  });

  const makeDeps = () => {
    const calls: string[] = [];
    let n = 0;
    return {
      calls,
      deps: {
        userId: 'u1',
        existingAgents: [] as any[],
        manuscriptTitle: 'My Novel',
        addAgent: vi.fn(async () => { calls.push('agent'); return { success: true, id: `ag-${++n}` }; }),
        addQuery: vi.fn(async () => { calls.push('query'); return { success: true, id: `q-${++n}` }; }),
      },
    };
  };

  it('writes every agent before any query, and creates each non-dropped query', async () => {
    const { calls, deps } = makeDeps();
    const r = result(
      [agent({ ref: 'a1' }), agent({ ref: 'a2', name: 'Bob Lee', agency: 'Beta' })],
      [q({ agentRef: 'a1', status: QueryStatus.PARTIAL_SENT }), q({ agentRef: 'a2', status: QueryStatus.QUERIED })]
    );
    const out = await commitSmartImport(deps as any, r, 'ms1');
    expect(out.agentsCreated).toBe(2);
    expect(out.queriesImported).toBe(2);
    // every agent call precedes every query call
    expect(calls.lastIndexOf('agent')).toBeLessThan(calls.indexOf('query'));
  });

  it('imports a date-less query (provisional) — never zero', async () => {
    const { deps } = makeDeps();
    const out = await commitSmartImport(deps as any, result([agent()], [q({ dateQueried: null, status: QueryStatus.QUERIED })]), 'ms1');
    expect(out.queriesImported).toBe(1);
    expect(out.queriesSkipped).toBe(0);
    // a provisional rung was seeded with dateProvisional:true
    const provisional = mockSetDoc.mock.calls.some((c) => (c[1] as any)?.dateProvisional === true);
    expect(provisional).toBe(true);
  });

  it('writes an agency-only (no-name) agent with an empty name', async () => {
    const { deps } = makeDeps();
    const out = await commitSmartImport(deps as any, result([agent({ name: '', agency: 'Curtis Brown' })], [q({ status: QueryStatus.QUERIED })]), 'ms1');
    expect(out.agentsCreated).toBe(1);
    expect((deps.addAgent as any).mock.calls[0][0].name).toBe('');
    expect((deps.addAgent as any).mock.calls[0][0].agency).toBe('Curtis Brown');
    expect(out.queriesImported).toBe(1);
  });
});
