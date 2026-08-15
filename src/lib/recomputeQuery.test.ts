import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Firestore boundary so we can exercise the orchestration without a real DB.
// queryDerivation is left REAL — these tests prove recomputeQuery derives + writes correctly.
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args: any[]) => ({ _kind: 'collection', path: args.slice(1) })),
  doc: vi.fn((...args: any[]) => ({ _kind: 'doc', path: args.slice(1) })),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteField: vi.fn(() => ({ __deleteField: true })),
}));
vi.mock('./firebase', () => ({
  db: {},
  handleFirestoreError: vi.fn((e: unknown) => { throw e; }),
  OperationType: { UPDATE: 'update' },
}));

import { readdirSync, readFileSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDocs, updateDoc } from 'firebase/firestore';
import { subcollectionDocToDerivable, monotonicEventTime, recomputeQuery, computeRecomputedFields } from './recomputeQuery';
import { QueryStatus } from '../types';

const mockGetDocs = vi.mocked(getDocs);
const mockUpdateDoc = vi.mocked(updateDoc);
const DELETED = { __deleteField: true };

const snap = (docs: { id?: string; data: () => any }[]) => ({ docs } as any);
const iso = (s: string) => new Date(s).toISOString();

beforeEach(() => vi.clearAllMocks());

describe('subcollectionDocToDerivable (pure)', () => {
  it('reads resultingStatus when canonical', () => {
    expect(subcollectionDocToDerivable('a1', { resultingStatus: QueryStatus.OFFER, createdAt: 'x' }))
      .toEqual({ id: 'a1', resultingStatus: QueryStatus.OFFER, date: 'x' });
  });
  it('falls back to the legacy `type` field', () => {
    expect(subcollectionDocToDerivable('a1', { type: QueryStatus.REJECTED, createdAt: 'x' }).resultingStatus)
      .toBe(QueryStatus.REJECTED);
  });
  it('a camelCase resultingStatus is dropped, falling back to a canonical type', () => {
    expect(subcollectionDocToDerivable('a1', { resultingStatus: 'partialRequested', type: QueryStatus.FULL_REQUESTED, createdAt: 'x' }).resultingStatus)
      .toBe(QueryStatus.FULL_REQUESTED);
  });
  it('non-status docs yield null', () => {
    expect(subcollectionDocToDerivable('a1', { createdAt: 'x' }).resultingStatus).toBeNull();
  });
});

describe('monotonicEventTime', () => {
  it('clamps to 1ms past the latest log entry when the desired time is earlier', async () => {
    mockGetDocs.mockResolvedValue(snap([{ data: () => ({ createdAt: 1000 }) }, { data: () => ({ createdAt: 5000 }) }]));
    expect(await monotonicEventTime('u', 'q', 3000)).toBe(5001);
  });
  it('keeps the desired time when it is already past the latest', async () => {
    mockGetDocs.mockResolvedValue(snap([{ data: () => ({ createdAt: 5000 }) }]));
    expect(await monotonicEventTime('u', 'q', 9000)).toBe(9000);
  });
  it('an empty log uses the desired time (latest treated as 0)', async () => {
    mockGetDocs.mockResolvedValue(snap([]));
    expect(await monotonicEventTime('u', 'q', 3000)).toBe(3000);
  });
});

describe('recomputeQuery — derives the query fields from the log and writes them once', () => {
  it('writes the derived status + stage date, and deleteField for absent stages', async () => {
    mockGetDocs.mockResolvedValue(snap([
      { id: 'a1', data: () => ({ resultingStatus: QueryStatus.QUERIED, createdAt: iso('2026-01-01T10:00:00Z') }) },
      { id: 'a2', data: () => ({ resultingStatus: QueryStatus.PARTIAL_REQUESTED, createdAt: iso('2026-01-03T10:00:00Z') }) },
    ]));
    await recomputeQuery('u1', 'q1');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const written: any = mockUpdateDoc.mock.calls[0][1];
    expect(written.status).toBe(QueryStatus.PARTIAL_REQUESTED);
    expect(written.hasAgentResponded).toBe(true);
    expect(written.revisionRound).toBe(1);
    expect(written.partialRequestedDate).toBe(iso('2026-01-03T10:00:00Z'));
    expect(written.partialSentDate).toEqual(DELETED);
    expect(written.fullRequestedDate).toEqual(DELETED);
    expect(written.fullSentDate).toEqual(DELETED);
    // The partial request is the earliest (and only) incoming rung — and the latest rung, so
    // lastStatusChange lands on the same time here.
    expect(written.responseReceivedAt).toBe(iso('2026-01-03T10:00:00Z'));
    expect(written.lastStatusChange).toBe(iso('2026-01-03T10:00:00Z'));
  });

  it('an empty log derives back to Queried (no response), all stage dates cleared', async () => {
    mockGetDocs.mockResolvedValue(snap([]));
    await recomputeQuery('u1', 'q1');
    const written: any = mockUpdateDoc.mock.calls[0][1];
    expect(written.status).toBe(QueryStatus.QUERIED);
    expect(written.hasAgentResponded).toBe(false);
    expect(written.partialRequestedDate).toEqual(DELETED);
    expect(written.responseReceivedAt).toEqual(DELETED);
    expect(written.lastStatusChange).toEqual(DELETED);
  });

  it('responseReceivedAt = the EARLIEST incoming rung; rejectedDate = the closing rejection', async () => {
    mockGetDocs.mockResolvedValue(snap([
      { id: 'a1', data: () => ({ resultingStatus: QueryStatus.PARTIAL_REQUESTED, createdAt: iso('2026-02-01T10:00:00Z') }) },
      { id: 'a2', data: () => ({ resultingStatus: QueryStatus.REJECTED, createdAt: iso('2026-03-01T10:00:00Z') }) },
    ]));
    await recomputeQuery('u1', 'q1');
    const written: any = mockUpdateDoc.mock.calls[0][1];
    expect(written.status).toBe(QueryStatus.REJECTED);
    expect(written.responseReceivedAt).toBe(iso('2026-02-01T10:00:00Z'));
    expect(written.rejectedDate).toBe(iso('2026-03-01T10:00:00Z'));
    expect(written.lastStatusChange).toBe(iso('2026-03-01T10:00:00Z'));
  });

  it('rejectedDate is deleteField when the query is not closed by rejection', async () => {
    mockGetDocs.mockResolvedValue(snap([
      { id: 'a1', data: () => ({ resultingStatus: QueryStatus.OFFER, createdAt: iso('2026-03-01T10:00:00Z') }) },
    ]));
    await recomputeQuery('u1', 'q1');
    expect((mockUpdateDoc.mock.calls[0][1] as any).rejectedDate).toEqual(DELETED);
  });

  it('a date-provisional closing rejection → deleteField (rejected, date unknown)', async () => {
    mockGetDocs.mockResolvedValue(snap([
      { id: 'a1', data: () => ({ resultingStatus: QueryStatus.REJECTED, createdAt: iso('2026-03-01T10:00:00Z'), dateProvisional: true }) },
    ]));
    await recomputeQuery('u1', 'q1');
    const written: any = mockUpdateDoc.mock.calls[0][1];
    expect(written.status).toBe(QueryStatus.REJECTED);
    expect(written.rejectedDate).toEqual(DELETED);
  });

  it('a date-provisional earliest incoming rung → deleteField (responded, date unknown)', async () => {
    mockGetDocs.mockResolvedValue(snap([
      { id: 'a1', data: () => ({ resultingStatus: QueryStatus.PARTIAL_REQUESTED, createdAt: iso('2026-02-01T10:00:00Z'), dateProvisional: true }) },
    ]));
    await recomputeQuery('u1', 'q1');
    const written: any = mockUpdateDoc.mock.calls[0][1];
    expect(written.hasAgentResponded).toBe(true);
    expect(written.responseReceivedAt).toEqual(DELETED);
  });

  it('derives revisionRound 2 from an R&R → Full Sent resubmission', async () => {
    mockGetDocs.mockResolvedValue(snap([
      { id: 'a1', data: () => ({ resultingStatus: QueryStatus.REVISE_RESUBMIT, createdAt: iso('2026-01-01T10:00:00Z') }) },
      { id: 'a2', data: () => ({ resultingStatus: QueryStatus.FULL_SENT, createdAt: iso('2026-01-05T10:00:00Z') }) },
    ]));
    await recomputeQuery('u1', 'q1');
    const written: any = mockUpdateDoc.mock.calls[0][1];
    expect(written.status).toBe(QueryStatus.FULL_SENT);
    expect(written.revisionRound).toBe(2);
  });
});

// The pure payload builder recomputeQuery is built on. Extracted for the (since-removed) one-off
// sweep tool, kept because it is the honest unit: the derivation with no Firestore in it, so the
// null ⇄ deleteField mapping is testable at the boundary rather than through a mock.
describe('computeRecomputedFields — the pure derivation behind the live write', () => {
  const LOG = [
    { id: 'a1', data: { resultingStatus: QueryStatus.QUERIED, createdAt: iso('2026-01-01T10:00:00Z') } },
    { id: 'a2', data: { resultingStatus: QueryStatus.PARTIAL_REQUESTED, createdAt: iso('2026-02-01T10:00:00Z') } },
    { id: 'a3', data: { resultingStatus: QueryStatus.REJECTED, createdAt: iso('2026-03-01T10:00:00Z') } },
  ];

  it('is PURE — deriving the payload touches no Firestore call, read or write', async () => {
    computeRecomputedFields(LOG);
    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('MIRRORS the live write exactly: null ⇄ deleteField, value ⇄ value (one derivation, not two)', async () => {
    const pure = computeRecomputedFields(LOG);
    mockGetDocs.mockResolvedValue(snap(LOG.map((d) => ({ id: d.id, data: () => d.data }))));
    await recomputeQuery('u1', 'q1');
    const written: any = mockUpdateDoc.mock.calls[0][1];

    // Anchor: the write and the preview cover the same ten keys.
    expect(Object.keys(written).sort()).toEqual(Object.keys(pure).sort());
    for (const [key, value] of Object.entries(pure)) {
      if (value === null) expect(written[key]).toEqual(DELETED);
      else expect(written[key]).toEqual(value);
    }
    // …and this log's substance, spelled out: rejected, so a rejectedDate exists.
    expect(pure.status).toBe(QueryStatus.REJECTED);
    expect(pure.rejectedDate).toBe(iso('2026-03-01T10:00:00Z'));
    expect(pure.responseReceivedAt).toBe(iso('2026-02-01T10:00:00Z'));
    expect(pure.partialSentDate).toBeNull();
  });

  it('honours the provisional guard (an imported stage rung yields null, never a made-up date)', () => {
    const pure = computeRecomputedFields([
      { id: 'p1', data: { resultingStatus: QueryStatus.PARTIAL_REQUESTED, createdAt: iso('2026-02-01T10:00:00Z'), dateProvisional: true } },
    ]);
    expect(pure.status).toBe(QueryStatus.PARTIAL_REQUESTED);
    expect(pure.partialRequestedDate).toBeNull();
    expect(pure.hasAgentResponded).toBe(true); // responded — date unknown
  });

  /**
   * ⚠️ §7b — THE SUPERSEDED PROVISIONAL RUNG IS DROPPED BEFORE `stageProvisional` SEES IT, and this
   * is the case that made it worth doing in the derivation rather than only on screen.
   *
   * `stageProvisional` takes the LAST rung at the highest time, and an import's `createdAt` is an
   * ordering key — it can tie or beat a real one. When it does, the stage reports "date needed"
   * against a date the writer had already recorded, and `recomputeQuery` writes null over it.
   * Nothing on screen shows that; the field is simply absent.
   */
  it('⚠️ a REAL rung supersedes the import\'s, so its date is written rather than nulled', () => {
    /* ⚠️ THE ORDER IS THE REAL ONE, NOT A CONVENIENT ONE. `assignTimes` stamps import rungs at
       `importBaseMs` — the moment of the import — so a RE-import over an already-recorded response
       writes its provisional rung LATER than the real one. That is the case `stageProvisional`
       gets wrong, because it takes the last rung at the highest time. A fixture with the import
       first passes without the fix at all: I wrote that one first and it stayed green. */
    const pure = computeRecomputedFields([
      { id: 'resp-p1', data: { resultingStatus: QueryStatus.PARTIAL_REQUESTED, createdAt: iso('2026-02-09T10:00:00Z') } },
      { id: 'imp-p1', data: { resultingStatus: QueryStatus.PARTIAL_REQUESTED, createdAt: iso('2026-03-20T09:00:00Z'), dateProvisional: true } },
    ]);
    expect(pure.status).toBe(QueryStatus.PARTIAL_REQUESTED);
    expect(pure.partialRequestedDate).toBe(iso('2026-02-09T10:00:00Z'));
  });

  it('⚠️ AND THE PROVISIONAL GUARD STILL BITES where nothing has superseded it', () => {
    /* asserted beside the case above, because a collapse written too broadly would fabricate a date
       from an ordering key — which is the fault the provisional flag exists to prevent. */
    const pure = computeRecomputedFields([
      { id: 'imp-p1', data: { resultingStatus: QueryStatus.PARTIAL_REQUESTED, createdAt: iso('2026-02-09T10:00:00Z'), dateProvisional: true } },
      { id: 'resp-o1', data: { resultingStatus: QueryStatus.OFFER, createdAt: iso('2026-03-01T10:00:00Z') } },
    ]);
    expect(pure.partialRequestedDate).toBeNull();
  });

  it('an empty log previews the clean-slate state (everything datey cleared)', () => {
    const pure = computeRecomputedFields([]);
    expect(pure.status).toBe(QueryStatus.QUERIED);
    expect(pure.hasAgentResponded).toBe(false);
    expect(pure.revisionRound).toBe(1);
    expect(pure.lastStatusChange).toBeNull();
    expect(pure.rejectedDate).toBeNull();
  });
});

describe('single-writer lock — the derived date fields', () => {
  // A write is the object-key form `<field>:` (a payload assignment or the derived-fields
  // interface). Reads are `q.<field>` and the Query type declares `<field>?:` — neither matches
  // the pattern, so the sweep flags writers only.
  const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const ALLOWED = new Set(['lib/queryDerivation.ts', 'lib/recomputeQuery.ts']);
  const offendersFor = (field: string): string[] => {
    const pattern = new RegExp(`${field}\\s*:`);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) continue;
        if (pattern.test(readFileSync(p, 'utf8'))) offenders.push(relative(SRC_ROOT, p));
      }
    };
    walk(SRC_ROOT);
    return offenders;
  };

  it.each(['responseReceivedAt', 'rejectedDate', 'lastStatusChange'])(
    '%s: no non-test file outside the derivation pair carries the write key',
    (field) => {
      const offenders = offendersFor(field);
      // Anchors first: the two allowed homes DO carry the key, proving the sweep sees real writes.
      expect(offenders).toContain('lib/queryDerivation.ts');
      expect(offenders).toContain('lib/recomputeQuery.ts');
      expect(offenders.filter((f) => !ALLOWED.has(f))).toEqual([]);
    },
  );
});
