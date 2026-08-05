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
import { subcollectionDocToDerivable, monotonicEventTime, recomputeQuery } from './recomputeQuery';
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
    // The partial request is the earliest (and only) incoming rung.
    expect(written.responseReceivedAt).toBe(iso('2026-01-03T10:00:00Z'));
  });

  it('an empty log derives back to Queried (no response), all stage dates cleared', async () => {
    mockGetDocs.mockResolvedValue(snap([]));
    await recomputeQuery('u1', 'q1');
    const written: any = mockUpdateDoc.mock.calls[0][1];
    expect(written.status).toBe(QueryStatus.QUERIED);
    expect(written.hasAgentResponded).toBe(false);
    expect(written.partialRequestedDate).toEqual(DELETED);
    expect(written.responseReceivedAt).toEqual(DELETED);
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

  it.each(['responseReceivedAt', 'rejectedDate'])(
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
