import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Firestore boundary so the commit's orchestration can be exercised without a real DB.
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args: any[]) => ({ _kind: 'collection', path: args.slice(1) })),
  doc: vi.fn((...args: any[]) => ({ _kind: 'doc', path: args.slice(1) })),
  getDocs: vi.fn(async () => ({ docs: [] as any[] })),
  setDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteField: vi.fn(() => ({ _sentinel: 'deleteField' })),
  Timestamp: {
    fromMillis: (ms: number) => ({ _ts: ms }),
    fromDate: (d: Date) => ({ _ts: d.getTime() }),
  },
}));
vi.mock('./firebase', () => ({ db: {} }));
vi.mock('./recomputeQuery', () => ({ recomputeQuery: vi.fn(async () => {}) }));

import { setDoc, updateDoc } from 'firebase/firestore';
import { impliedRungs, assignTimes, commitSmartImport } from './smartImportCommit';
import { parseModel, modelToResult } from './smartImportReviewModel';
import { ParsedAgent, ParsedQuery, SmartImportResult } from '../types/smartImport';
import { QueryStatus } from '../types';

const mockSetDoc = vi.mocked(setDoc);
const mockUpdateDoc = vi.mocked(updateDoc);

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

  it('Offer → queried + offer rung, carrying its OWN offer date (not the queried rung)', () => {
    const rungs = impliedRungs(q({ status: QueryStatus.OFFER, dateQueried: '2025-11-05', offerDate: '2026-04-01' }));
    expect(rungs.map((r) => r.status)).toEqual([QueryStatus.QUERIED, QueryStatus.OFFER]);
    expect(rungs.find((r) => r.status === QueryStatus.QUERIED)?.date).toBe('2025-11-05');
    expect(rungs.find((r) => r.status === QueryStatus.OFFER)?.date).toBe('2026-04-01');
  });

  it('Revise & Resubmit → carries its OWN revise date on the R&R rung (a full was read)', () => {
    const rungs = impliedRungs(q({ status: QueryStatus.REVISE_RESUBMIT, reviseDate: '2026-05-05' }));
    expect(rungs.map((r) => r.status)).toContain(QueryStatus.FULL_SENT); // R&R implies a full was read
    expect(rungs.find((r) => r.status === QueryStatus.REVISE_RESUBMIT)?.date).toBe('2026-05-05');
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
  beforeEach(() => { mockSetDoc.mockClear(); mockUpdateDoc.mockClear(); });

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

  it('passes real dateQueried as dateSent for dated queries; clears dateSent (deleteField) for provisional ones', async () => {
    const { deps } = makeDeps();
    const r = result(
      [agent({ ref: 'a1' })],
      [
        q({ agentRef: 'a1', status: QueryStatus.QUERIED, dateQueried: '2026-03-15' }), // dated
        q({ agentRef: 'a1', status: QueryStatus.QUERIED, dateQueried: null }),           // provisional
      ]
    );
    await commitSmartImport(deps as any, r, 'ms1');
    const addQueryCalls = (deps.addQuery as any).mock.calls;
    // Dated query passes its real date through to addQuery.
    expect(addQueryCalls[0][0].dateSent).toBe('2026-03-15');
    // Provisional query omits dateSent from addQuery (addQuery would default it to today).
    expect(addQueryCalls[1][0].dateSent).toBeUndefined();
    // commitSmartImport then clears the today-stamp via updateDoc+deleteField for the provisional one.
    const clearCalls = mockUpdateDoc.mock.calls.filter(
      (c) => (c[1] as any)?.dateSent?._sentinel === 'deleteField'
    );
    expect(clearCalls.length).toBe(1);
  });

  it('collapses the dashboard feed into ONE "Smart import ·" summary (existing activity type)', async () => {
    const { deps } = makeDeps();
    const r = result(
      [agent({ ref: 'a1' }), agent({ ref: 'a2', name: 'Bob Lee', agency: 'Beta' })],
      [q({ agentRef: 'a1', status: QueryStatus.QUERIED }), q({ agentRef: 'a2', status: QueryStatus.FULL_SENT })]
    );
    await commitSmartImport(deps as any, r, 'ms1');
    const summaries = mockSetDoc.mock.calls.filter(
      (c) => typeof (c[1] as any)?.description === 'string' && (c[1] as any).description.startsWith('Smart import ·')
    );
    expect(summaries.length).toBe(1);
    expect((summaries[0][1] as any).description).toBe('Smart import · 2 agents added, 2 queries logged');
    expect((summaries[0][1] as any).activityType).toBe('Status Changed'); // allowlisted type → passes rules, shows in feed
  });
});

describe('commitSmartImport — deleted-agent exclusion (the masking case)', () => {
  // This test guards the specific failure mode where an agency-only undated agent was deleted on
  // the review screen but still committed. Before the B3 rules fix, the undated query write was
  // silently rejected by Firestore (dateSent is string check failed), making it appear to work.
  // After B3, absent dateSent is allowed, so the exclusion must hold at the model level.
  beforeEach(() => { mockSetDoc.mockClear(); mockUpdateDoc.mockClear(); });

  const makeDeps = () => {
    let n = 0;
    return {
      deps: {
        userId: 'u1',
        existingAgents: [] as any[],
        manuscriptTitle: 'My Novel',
        addAgent: vi.fn(async () => ({ success: true, id: `ag-${++n}` })),
        addQuery: vi.fn(async () => ({ success: true, id: `q-${++n}` })),
      },
    };
  };

  it('deleting an agency-only undated agent on the review screen excludes it and its query from the commit', async () => {
    const rawResult: SmartImportResult = {
      columnMapping: {}, statusTranslations: [], warnings: [],
      agents: [
        { ref: 'a1', name: 'Jane Doe', agency: 'Acme Lit', confidence: 'high' },
        { ref: 'a2', name: '', agency: 'Curtis Brown', confidence: 'high' }, // agency-only
      ],
      queries: [
        { agentRef: 'a1', dateQueried: '2026-03-15', status: QueryStatus.QUERIED, confidence: 'high' },
        { agentRef: 'a2', dateQueried: null, status: QueryStatus.QUERIED, confidence: 'high' }, // undated
      ],
    };

    // Simulate the review-screen remove() cascade: mark a2 deleted, its query removed.
    const { agents, queries } = parseModel(rawResult);
    const agencyOnlyAgent = agents.find((a) => a.id === 'a2')!;
    agencyOnlyAgent.deleted = true;
    const agencyOnlyQuery = queries.find((q) => q.agentRef === 'a2')!;
    agencyOnlyQuery.removed = true;

    // modelToResult produces the filtered SmartImportResult (what onImportClick hands to handleImport).
    const filteredResult = modelToResult(rawResult, agents, queries);

    // Guard: the filtered result must exclude the deleted agent + removed query.
    expect(filteredResult.agents.map((a) => a.ref)).toEqual(['a1']);
    expect(filteredResult.queries).toHaveLength(1);
    expect(filteredResult.queries[0].agentRef).toBe('a1');
  });

  it('cross-reference guard: if the cascade missed marking q.removed, the deleted agent ID check still excludes the query', async () => {
    const rawResult: SmartImportResult = {
      columnMapping: {}, statusTranslations: [], warnings: [],
      agents: [
        { ref: 'a1', name: 'Jane Doe', agency: 'Acme Lit', confidence: 'high' },
        { ref: 'a2', name: '', agency: 'Curtis Brown', confidence: 'high' },
      ],
      queries: [
        { agentRef: 'a1', dateQueried: '2026-03-15', status: QueryStatus.QUERIED, confidence: 'high' },
        { agentRef: 'a2', dateQueried: null, status: QueryStatus.QUERIED, confidence: 'high' },
      ],
    };

    const { agents, queries } = parseModel(rawResult);
    // Agent deleted, but simulate cascade MISS: q.removed is NOT set.
    agents.find((a) => a.id === 'a2')!.deleted = true;
    // queries[1] still has removed: false (the broken-link scenario)

    const filteredResult = modelToResult(rawResult, agents, queries);

    // The cross-reference guard must catch it: query whose agentRef points to a deleted agent is excluded.
    expect(filteredResult.agents.map((a) => a.ref)).toEqual(['a1']);
    expect(filteredResult.queries).toHaveLength(1);
    expect(filteredResult.queries[0].agentRef).toBe('a1');

    const { deps } = makeDeps();
    const out = await commitSmartImport(deps as any, filteredResult, 'ms1');
    expect(out.agentsCreated).toBe(1);
    expect(out.queriesImported).toBe(1);
    expect((deps.addAgent as any).mock.calls).toHaveLength(1);
    expect((deps.addAgent as any).mock.calls[0][0].agency).toBe('Acme Lit');
    expect((deps.addQuery as any).mock.calls).toHaveLength(1);
  });
});
