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
import { parseModel, modelToResult, seedUnidentifiedSetAside, buildClusters } from './smartImportReviewModel';
import { ParsedAgent, ParsedQuery, SmartImportResult, TimelineEvent } from '../types/smartImport';
import { QueryStatus } from '../types';

const mockSetDoc = vi.mocked(setDoc);
const mockUpdateDoc = vi.mocked(updateDoc);

const q = (over: Partial<ParsedQuery> = {}): ParsedQuery => ({
  agentRef: 'a1', status: QueryStatus.QUERIED, sentDate: null, ...over,
});
const ev = (type: QueryStatus, date: string | null): TimelineEvent => ({ type, date, raw: null });

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

  it('a timeline partial event on a Full Sent query is still included', () => {
    expect(statuses(q({ status: QueryStatus.FULL_SENT, timeline: [ev(QueryStatus.PARTIAL_SENT, '2026-02-01')] }))).toEqual([
      QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
    ]);
  });

  it('Revise & Resubmit → implies a full was read', () => {
    expect(statuses(q({ status: QueryStatus.REVISE_RESUBMIT }))).toEqual([
      QueryStatus.QUERIED, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT,
    ]);
  });

  it('a terminal status → queried + the terminal rung, carrying its timeline-event date', () => {
    const rungs = impliedRungs(q({ status: QueryStatus.REJECTED, timeline: [ev(QueryStatus.REJECTED, '2026-03-03')] }));
    expect(rungs.map((r) => r.status)).toEqual([QueryStatus.QUERIED, QueryStatus.REJECTED]);
    expect(rungs.find((r) => r.status === QueryStatus.REJECTED)?.date).toBe('2026-03-03');
  });

  it('Offer → queried + offer rung, carrying the spine on queried and the event date on offer', () => {
    const rungs = impliedRungs(q({ status: QueryStatus.OFFER, sentDate: '2025-11-05', timeline: [ev(QueryStatus.OFFER, '2026-04-01')] }));
    expect(rungs.map((r) => r.status)).toEqual([QueryStatus.QUERIED, QueryStatus.OFFER]);
    expect(rungs.find((r) => r.status === QueryStatus.QUERIED)?.date).toBe('2025-11-05');
    expect(rungs.find((r) => r.status === QueryStatus.OFFER)?.date).toBe('2026-04-01');
  });

  it('Revise & Resubmit → carries its event date on the R&R rung (a full was read)', () => {
    const rungs = impliedRungs(q({ status: QueryStatus.REVISE_RESUBMIT, timeline: [ev(QueryStatus.REVISE_RESUBMIT, '2026-05-05')] }));
    expect(rungs.map((r) => r.status)).toContain(QueryStatus.FULL_SENT); // R&R implies a full was read
    expect(rungs.find((r) => r.status === QueryStatus.REVISE_RESUBMIT)?.date).toBe('2026-05-05');
  });

  it('carries the real date onto each dated rung and null onto the rest', () => {
    const rungs = impliedRungs(q({ status: QueryStatus.PARTIAL_SENT, sentDate: '2026-01-01', timeline: [ev(QueryStatus.PARTIAL_SENT, '2026-02-02')] }));
    const byStatus = Object.fromEntries(rungs.map((r) => [r.status, r.date]));
    expect(byStatus[QueryStatus.QUERIED]).toBe('2026-01-01');     // the spine
    expect(byStatus[QueryStatus.PARTIAL_REQUESTED]).toBeNull();   // implied, never fabricated
    expect(byStatus[QueryStatus.PARTIAL_SENT]).toBe('2026-02-02'); // the timeline event
  });

  it('a full-requested timeline event seeds an agent-response rung (the under-count fix)', () => {
    // A Queried-status row whose note says the full was requested: the event becomes a real
    // FULL_REQUESTED rung, which recomputeQuery counts as an agent response.
    const rungs = impliedRungs(q({ status: QueryStatus.QUERIED, sentDate: '2026-01-01', timeline: [ev(QueryStatus.FULL_REQUESTED, '2026-01-20')] }));
    expect(rungs.map((r) => r.status)).toContain(QueryStatus.FULL_REQUESTED);
    expect(rungs.find((r) => r.status === QueryStatus.FULL_REQUESTED)?.date).toBe('2026-01-20');
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

  const agent = (over: Partial<ParsedAgent> = {}): ParsedAgent => ({ ref: 'a1', name: 'Jane Doe', agency: 'Acme', ...over });
  const result = (agents: ParsedAgent[], queries: ParsedQuery[]): SmartImportResult => ({ agents, queries });

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
    expect(calls.lastIndexOf('agent')).toBeLessThan(calls.indexOf('query'));
  });

  it('imports a date-less query (provisional) — never zero', async () => {
    const { deps } = makeDeps();
    const out = await commitSmartImport(deps as any, result([agent()], [q({ sentDate: null, status: QueryStatus.QUERIED })]), 'ms1');
    expect(out.queriesImported).toBe(1);
    expect(out.queriesSkipped).toBe(0);
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

  it('passes real sentDate as dateSent for dated queries; clears dateSent (deleteField) for provisional ones', async () => {
    const { deps } = makeDeps();
    const r = result(
      [agent({ ref: 'a1' })],
      [
        q({ agentRef: 'a1', status: QueryStatus.QUERIED, sentDate: '2026-03-15' }), // dated
        q({ agentRef: 'a1', status: QueryStatus.QUERIED, sentDate: null }),          // provisional
      ]
    );
    await commitSmartImport(deps as any, r, 'ms1');
    const addQueryCalls = (deps.addQuery as any).mock.calls;
    expect(addQueryCalls[0][0].dateSent).toBe('2026-03-15');
    expect(addQueryCalls[1][0].dateSent).toBeUndefined();
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
    expect((summaries[0][1] as any).activityType).toBe('Status Changed');
  });
});

describe('commitSmartImport — deleted-agent exclusion (the masking case)', () => {
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

  const rawResult = (): SmartImportResult => ({
    agents: [
      { ref: 'a1', name: 'Jane Doe', agency: 'Acme Lit' },
      { ref: 'a2', name: '', agency: 'Curtis Brown' }, // agency-only
    ],
    queries: [
      { agentRef: 'a1', status: QueryStatus.QUERIED, sentDate: '2026-03-15' },
      { agentRef: 'a2', status: QueryStatus.QUERIED, sentDate: null }, // undated
    ],
  });

  it('deleting an agency-only undated agent on the review screen excludes it and its query from the commit', async () => {
    const raw = rawResult();
    const { agents, queries } = parseModel(raw);
    agents.find((a) => a.id === 'a2')!.deleted = true;
    queries.find((qq) => qq.agentRef === 'a2')!.removed = true;
    const filtered = modelToResult(raw, agents, queries);
    expect(filtered.agents.map((a) => a.ref)).toEqual(['a1']);
    expect(filtered.queries).toHaveLength(1);
    expect(filtered.queries[0].agentRef).toBe('a1');
  });

  it('cross-reference guard: if the cascade missed marking q.removed, the deleted agent ID check still excludes the query', async () => {
    const raw = rawResult();
    const { agents, queries } = parseModel(raw);
    agents.find((a) => a.id === 'a2')!.deleted = true; // cascade MISS: q.removed not set
    const filtered = modelToResult(raw, agents, queries);
    expect(filtered.agents.map((a) => a.ref)).toEqual(['a1']);
    expect(filtered.queries).toHaveLength(1);
    expect(filtered.queries[0].agentRef).toBe('a1');

    const { deps } = makeDeps();
    const out = await commitSmartImport(deps as any, filtered, 'ms1');
    expect(out.agentsCreated).toBe(1);
    expect(out.queriesImported).toBe(1);
    expect((deps.addAgent as any).mock.calls).toHaveLength(1);
    expect((deps.addAgent as any).mock.calls[0][0].agency).toBe('Acme Lit');
    expect((deps.addQuery as any).mock.calls).toHaveLength(1);
  });
});

// ── Agency-less agents — data-integrity guard (the Priya case) ────────────────────────────────────
// Locks the DOWNSTREAM (post-extraction) pipeline so a named agency-less agent can never be silently
// dropped again. If these pass but a live import still drops Priya, the cause is upstream EXTRACTION
// (functions/src/smartImportPrompt.ts), not parse/validate/commit. (Exact 14/16 counts depend on the
// real CSV + the live function; this proves the invariants the deterministic path must honour.)
describe('agency-less agents — data-integrity guard (downstream of extraction)', () => {
  const agent = (over: Partial<ParsedAgent> = {}): ParsedAgent => ({ ref: 'a1', name: 'Jane Doe', agency: 'Acme', ...over });
  const result = (agents: ParsedAgent[], queries: ParsedQuery[]): SmartImportResult => ({ agents, queries });
  const makeDeps = () => ({
    userId: 'u1', existingAgents: [] as any[], manuscriptTitle: 'My Novel',
    addAgent: vi.fn(async () => ({ success: true, id: `ag-${Math.random()}` })),
    addQuery: vi.fn(async () => ({ success: true, id: `q-${Math.random()}` })),
  });

  // The salient shape of the messy import: a clean agent, a named NO-agency agent (Priya), an
  // agency-only agent (no name), and an unidentifiable no-name-no-agency row ("follow up everyone").
  const messyish = (): SmartImportResult => result(
    [
      agent({ ref: 'a1', name: 'Clara Voss', agency: 'Pemberton Literary' }),
      agent({ ref: 'a2', name: 'Priya Raman', agency: '' }),        // named, NO agency — must survive
      agent({ ref: 'a3', name: '', agency: 'Westbrook Literary' }),  // agency-only — must survive
      agent({ ref: 'a4', name: '', agency: '' }),                    // "follow up everyone" — set aside
    ],
    [
      q({ agentRef: 'a1', status: QueryStatus.QUERIED }),
      q({ agentRef: 'a2', status: QueryStatus.PARTIAL_SENT }),       // Priya's query
      q({ agentRef: 'a3', status: QueryStatus.REJECTED }),
      q({ agentRef: 'a4', status: QueryStatus.QUERIED, notes: 'follow up everyone' }),
    ],
  );
  // The review flow up to the import seam: parse → auto-set-aside the unidentifiable → "use her name".
  const review = (r: SmartImportResult) => {
    let { agents, queries } = parseModel(r);
    ({ agents, queries } = seedUnidentifiedSetAside(agents, queries));
    agents = agents.map((a) => (a.id === 'a2' ? { ...a, agencyWaived: true } : a)); // Priya: "use her name"
    return { agents, queries };
  };

  it('1. a named agency-less agent survives modelToResult with an empty agency', () => {
    const r = messyish();
    const { agents, queries } = review(r);
    const priya = modelToResult(r, agents, queries).agents.find((a) => a.ref === 'a2');
    expect(priya).toBeDefined();
    expect(priya!.name).toBe('Priya Raman');
    expect(priya!.agency).toBe('');
  });

  it('2. an agency-only agent (no name) survives modelToResult', () => {
    const r = messyish();
    const { agents, queries } = review(r);
    const a3 = modelToResult(r, agents, queries).agents.find((a) => a.ref === 'a3');
    expect(a3).toBeDefined();
    expect(a3!.name).toBe('');
    expect(a3!.agency).toBe('Westbrook Literary');
  });

  it('3. no-name-no-agency is set aside AND present (with context), never silently absent', () => {
    const r = messyish();
    const { agents, queries } = review(r);
    const followUp = agents.find((a) => a.id === 'a4');
    expect(followUp).toBeDefined();                          // present, not silently dropped
    expect(followUp!.deleted).toBe(true);                    // set aside
    expect(followUp!.setAsideStage).toBe('unidentified');
    expect(followUp!.setAsideContext).toBe('follow up everyone'); // recoverable, with its own note
    const out = modelToResult(r, agents, queries);           // and excluded from the import (agent + query)
    expect(out.agents.some((a) => a.ref === 'a4')).toBe(false);
    expect(out.queries.some((qq) => qq.agentRef === 'a4')).toBe(false);
  });

  it('4. two agency-less agents are NOT clustered as duplicates', () => {
    const r = result(
      [agent({ ref: 'x1', name: 'Alice Smith', agency: '' }), agent({ ref: 'x2', name: 'Bob Jones', agency: '' })],
      [q({ agentRef: 'x1' }), q({ agentRef: 'x2' })],
    );
    const { agents } = parseModel(r);
    expect(agents.every((a) => a.mergeWith.length === 0)).toBe(true); // empty agency is not a match signal
    expect(buildClusters(agents)).toHaveLength(0);
  });

  it('5. end-to-end downstream: Priya is committed (agency ""), the unidentifiable row is not', async () => {
    const r = messyish();
    const { agents, queries } = review(r);
    const finalResult = modelToResult(r, agents, queries);
    const deps = makeDeps();
    const out = await commitSmartImport(deps as any, finalResult, 'ms1');

    const written = deps.addAgent.mock.calls.map((c: any[]) => c[0]);
    const priya = written.find((a: any) => a.name === 'Priya Raman');
    expect(priya, 'Priya must be written').toBeDefined();
    expect(priya.agency).toBe('');                                   // imported with an empty agency
    expect(written.some((a: any) => !a.name && !a.agency)).toBe(false); // follow-up never written
    expect(out.agentsCreated).toBe(3);                                // Clara + Priya + agency-only
    expect(out.queriesImported).toBe(3);                              // follow-up's query skipped, not the rest
  });
});
