import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  queriesForManuscript, queriesForAgent, activityIdsForQueries,
  flagIdsForCascade, destroyManifest, cascadePlan, canDestroy, chunkArray, DestroyData,
} from './cascade';
import { QueryStatus } from '../types';

const q = (id: string, manuscriptId: string, agentId: string, status: QueryStatus = QueryStatus.QUERIED) =>
  ({ id, manuscriptId, agentId, status }) as any;

const queries = [
  q('q1', 'm1', 'a1'),
  q('q2', 'm1', 'a2'),
  q('q3', 'm2', 'a1'),
  q('q4', 'm2', 'a3'),
];

describe('queriesForManuscript', () => {
  it('returns only the ids of queries for that manuscript', () => {
    expect(queriesForManuscript(queries, 'm1')).toEqual(['q1', 'q2']);
    expect(queriesForManuscript(queries, 'm2')).toEqual(['q3', 'q4']);
  });
  it('returns empty when no query references it (no over-deletion)', () => {
    expect(queriesForManuscript(queries, 'm-none')).toEqual([]);
  });
});

describe('queriesForAgent', () => {
  it('returns only the ids of queries to that agent', () => {
    expect(queriesForAgent(queries, 'a1')).toEqual(['q1', 'q3']);
    expect(queriesForAgent(queries, 'a3')).toEqual(['q4']);
  });
  it('returns empty when no query references it', () => {
    expect(queriesForAgent(queries, 'a-none')).toEqual([]);
  });
});

describe('activityIdsForQueries', () => {
  const activities = [
    { id: 'act1', queryId: 'q1' },
    { id: 'act2', queryId: 'q2' },
    { id: 'act3', queryId: 'q3' },
    { id: 'act4', queryId: '' }, // a non-query (e.g. manuscript-added) feed entry — must be left alone
  ];
  it('selects only the projections for the given queries', () => {
    expect(activityIdsForQueries(activities, ['q1', 'q2'])).toEqual(['act1', 'act2']);
  });
  it('leaves non-query feed entries (empty queryId) alone for real query sets', () => {
    // queriesForManuscript/queriesForAgent only ever yield real query ids, never "",
    // so a manuscript-added feed row (queryId "") is never swept into a cascade.
    expect(activityIdsForQueries(activities, ['q1', 'q2', 'q3']).includes('act4')).toBe(false);
  });
  it('empty query set selects nothing', () => {
    expect(activityIdsForQueries(activities, [])).toEqual([]);
  });
});

// ── Phase 6A: the guard + the full plan ─────────────────────────────────────

const DATA: DestroyData = {
  queries: [
    q('q1', 'm1', 'a1', QueryStatus.FULL_SENT), // materials OUT
    q('q2', 'm1', 'a2', QueryStatus.QUERIED),
    q('q3', 'm2', 'a1', QueryStatus.PARTIAL_SENT), // materials OUT (a1's other query)
  ],
  activities: [
    { id: 'act1', queryId: 'q1' },
    { id: 'act2', queryId: 'q2' },
    { id: 'act3', queryId: 'q3' },
    { id: 'actX', queryId: '' },
  ],
  taskFlags: [
    { id: 'f-q1', queryId: 'q1' },
    { id: 'f-q3', queryId: 'q3' },
    { id: 'f-a1', agentId: 'a1' }, // the dq stance on the agent itself
    { id: 'f-other', queryId: 'q-other' },
  ],
  versions: [{ id: 'v1', manuscriptId: 'm1' }, { id: 'v2', manuscriptId: 'm2' }],
  packages: [{ id: 'p1', manuscriptId: 'm1' }],
};

describe('flagIdsForCascade — stances die with their records', () => {
  it('collects query-keyed flags for the deleted queries', () => {
    expect(flagIdsForCascade(DATA.taskFlags, { queryIds: ['q1', 'q2'] })).toEqual(['f-q1']);
  });
  it('an agent delete also collects the agent-keyed stances', () => {
    expect(flagIdsForCascade(DATA.taskFlags, { queryIds: ['q1', 'q3'], agentId: 'a1' }).sort()).toEqual(['f-a1', 'f-q1', 'f-q3']);
  });
  it('never sweeps unrelated flags', () => {
    expect(flagIdsForCascade(DATA.taskFlags, { queryIds: [] })).toEqual([]);
  });
});

describe('destroyManifest — the "Goes with it" panel counts', () => {
  it('manuscript: queries + materials-out + activity + packages + versions + flags', () => {
    expect(destroyManifest('manuscript', 'm1', DATA)).toEqual({
      queries: 2, materialsOut: 1, activityRecords: 2, packages: 1, versions: 1, taskFlags: 1, attachments: 0,
    });
  });
  it('agent: queries + activity + its own stance flags; packages/versions never counted', () => {
    expect(destroyManifest('agent', 'a1', DATA)).toEqual({
      queries: 2, materialsOut: 2, activityRecords: 2, packages: 0, versions: 0, taskFlags: 3, attachments: 0,
    });
  });
  it('a zero-query agent is empty-handed (the light path trigger)', () => {
    const m = destroyManifest('agent', 'a-none', DATA);
    expect(m.queries).toBe(0);
    expect(m.activityRecords).toBe(0);
  });
});

describe('cascadePlan — children first, the parent ALWAYS last', () => {
  it('the plan deletes everything the panel counted (plan ⊇ manifest, per collection)', () => {
    const plan = cascadePlan('manuscript', 'm1', DATA);
    const m = destroyManifest('manuscript', 'm1', DATA);
    const by = (col: string) => plan.docs.filter((d) => d.col === col).length;
    expect(by('queries')).toBe(m.queries);
    expect(by('activities')).toBe(m.activityRecords);
    expect(by('packages')).toBe(m.packages);
    expect(by('versions')).toBe(m.versions);
    expect(by('taskFlags')).toBe(m.taskFlags);
  });
  it('the parent is the FINAL doc — a partial failure never orphans', () => {
    const ms = cascadePlan('manuscript', 'm1', DATA);
    expect(ms.docs[ms.docs.length - 1]).toEqual({ col: 'manuscripts', id: 'm1' });
    expect(ms.docs.slice(0, -1).some((d) => d.col === 'manuscripts')).toBe(false);
    const ag = cascadePlan('agent', 'a1', DATA);
    expect(ag.docs[ag.docs.length - 1]).toEqual({ col: 'agents', id: 'a1' });
    expect(ag.docs.slice(0, -1).some((d) => d.col === 'agents')).toBe(false);
  });
  it('agent plan carries the queries + flags incl. the agent-keyed stance', () => {
    const ag = cascadePlan('agent', 'a1', DATA);
    expect(ag.queryIds).toEqual(['q1', 'q3']);
    expect(ag.docs.filter((d) => d.col === 'taskFlags').map((d) => d.id).sort()).toEqual(['f-a1', 'f-q1', 'f-q3']);
  });
});

describe('canDestroy — the type-to-confirm gate', () => {
  it('requires the exact name (trimmed)', () => {
    expect(canDestroy('Lost Clockworks', 'Lost Clockworks', false)).toBe(true);
    expect(canDestroy('  Lost Clockworks ', 'Lost Clockworks', false)).toBe(true);
    expect(canDestroy('lost clockworks', 'Lost Clockworks', false)).toBe(false);
    expect(canDestroy('', 'Lost Clockworks', false)).toBe(false);
    expect(canDestroy('', '', false)).toBe(false); // a nameless record can't be confirm-typed into oblivion
  });
  it('light mode (nothing depends on it) always passes', () => {
    expect(canDestroy('', 'Jo Agent', true)).toBe(true);
  });
});

describe('chunkArray — Firestore batch chunking', () => {
  it('splits >500 docs into ≤450 chunks, nothing lost', () => {
    const refs = Array.from({ length: 1101 }, (_, i) => i);
    const chunks = chunkArray(refs, 450);
    expect(chunks.length).toBe(3);
    expect(chunks.map((c) => c.length)).toEqual([450, 450, 201]);
    expect(chunks.flat()).toEqual(refs);
  });
  it('empty input → no batches', () => {
    expect(chunkArray([], 450)).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   ATTACHMENTS IN THE CASCADE — the first child whose stranding costs money.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
describe('attachments join the cascade and the dialogue', () => {
  const data = {
    queries: [], activities: [], taskFlags: [],
    versions: [{ id: 'v1', manuscriptId: 'ms-1' }],
    packages: [{ id: 'p1', manuscriptId: 'ms-1' }],
    attachments: [
      { id: 'a1', manuscriptId: 'ms-1' },
      { id: 'a2', manuscriptId: 'ms-1' },
      { id: 'a3', manuscriptId: 'ms-OTHER' },
    ],
  };

  it('counts only this manuscript’s attachments', () => {
    expect(destroyManifest('manuscript', 'ms-1', data).attachments).toBe(2);
  });

  /** An agent delete never reaches a manuscript's files. */
  it('counts none for an agent', () => {
    expect(destroyManifest('agent', 'ag-1', data).attachments).toBe(0);
  });

  /**
   * ⚠️ THE PARENT STAYS LAST. Every child before it means a mid-way failure strands rather than
   * orphans — and with attachments in the plan, "strands" now includes a record whose blob db.tsx
   * removed a moment earlier, which is the visible half of the ruled order.
   */
  it('plans the attachments before the manuscript', () => {
    const plan = cascadePlan('manuscript', 'ms-1', data);
    const cols = plan.docs.map((d) => d.col);
    expect(cols).toContain('attachments');
    expect(cols[cols.length - 1]).toBe('manuscripts');
    expect(cols.indexOf('attachments')).toBeLessThan(cols.length - 1);
    expect(plan.docs.filter((d) => d.col === 'attachments').map((d) => d.id)).toEqual(['a1', 'a2']);
  });

  /**
   * ⚠️ `attachments` IS OPTIONAL ON `DestroyData`, WHICH MEANS A CALL SITE THAT FORGETS IT STILL
   * TYPECHECKS AND SILENTLY REPORTS ZERO. That is the exact shape the manifest exists to prevent —
   * "the dialog can never promise less than the delete removes" — so the two manuscript call sites
   * are asserted by source rather than trusted to the compiler.
   */
  it('both manuscript call sites actually pass attachments', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const page = strip(readFileSync(join(__dirname, '../components/AllManuscripts.tsx'), 'utf8'));
    const db = strip(readFileSync(join(__dirname, './db.tsx'), 'utf8'));
    expect(page, 'the dialogue would report 0 attached files').toMatch(
      /destroyManifest\("manuscript",[^)]*attachments[^)]*\)/,
    );
    expect(db, 'the cascade would leave every attachment record behind').toMatch(
      /cascadePlan\("manuscript",[^)]*attachments[^)]*\)/,
    );
  });
});
