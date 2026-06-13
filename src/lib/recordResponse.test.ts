import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock only the boundaries — Firestore, the firebase wrapper, and recomputeQuery — so we exercise
// recordQueryResponse's real orchestration: status mapping, the activity write, the single-writer
// invariant (status is NOT written on the query doc; it's derived), and undo.
vi.mock('firebase/firestore', () => {
  class MockTimestamp {
    seconds: number; nanoseconds: number;
    constructor(seconds: number, nanoseconds = 0) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
    toMillis() { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6); }
    static fromDate(d: Date) { return new MockTimestamp(Math.floor(d.getTime() / 1000), (d.getTime() % 1000) * 1e6); }
    static fromMillis(ms: number) { return new MockTimestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6); }
    static now() { return MockTimestamp.fromMillis(Date.now()); }
  }
  return {
    doc: vi.fn((...a: any[]) => ({ __doc: a.slice(1).join('/') })),
    collection: vi.fn((...a: any[]) => ({ __col: a.slice(1).join('/') })),
    updateDoc: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    deleteField: vi.fn(() => ({ __deleteField: true })),
    serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
    Timestamp: MockTimestamp,
  };
});
vi.mock('./firebase', () => ({
  db: {},
  handleFirestoreError: vi.fn((e: unknown) => { throw e; }),
  OperationType: { WRITE: 'write', UPDATE: 'update' },
}));
vi.mock('./recomputeQuery', () => ({
  recomputeQuery: vi.fn(async () => {}),
  monotonicEventTime: vi.fn(async () => 1738368000000),
}));

import { updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { recomputeQuery } from './recomputeQuery';
import { recordQueryResponse, RecordResponseData } from './recordResponse';
import { QueryStatus } from '../types';

const mockUpdateDoc = vi.mocked(updateDoc);
const mockSetDoc = vi.mocked(setDoc);
const mockDeleteDoc = vi.mocked(deleteDoc);
const mockRecompute = vi.mocked(recomputeQuery);

const mkDeps = () => ({
  userId: 'u1',
  query: { id: 'q1', status: QueryStatus.QUERIED, agentId: 'ag1', manuscriptId: 'm1', sendMethod: 'Email' },
  agent: { id: 'ag1', name: 'Jane Doe', agency: 'Acme', responseTimeWeeks: 6 },
  manuscript: { title: 'My Book' },
});
const mkData = (over: Partial<RecordResponseData>): RecordResponseData => ({
  responseType: 'partial', materialsType: 'Pages', materialsQuantity: 50, materialsOtherText: '',
  expectedBy: '', sendReminderDate: '', dateReceived: '2026-02-01', rrNotes: '',
  feedbackType: 'Form', feedbackText: '', privateReflection: '', rejectionLesson: '',
  requeryPreference: '', offerDate: '', offerDeadline: '', offerNotes: '',
  closingReason: 'No response after expected window', closingNotes: '', ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('recordQueryResponse — status mapping (exact QueryStatus enum)', () => {
  it.each([
    ['partial', QueryStatus.PARTIAL_REQUESTED],
    ['full', QueryStatus.FULL_REQUESTED],
    ['rr', QueryStatus.REVISE_RESUBMIT],
    ['offer', QueryStatus.OFFER],
    ['rejected', QueryStatus.REJECTED],
  ] as const)('%s -> %s', async (rt, expected) => {
    const res = await recordQueryResponse(mkDeps() as any, mkData({ responseType: rt as any }));
    expect(res.newStatus).toBe(expected);
  });

  it('close + "Withdrew my submission" -> Withdrawn', async () => {
    const res = await recordQueryResponse(mkDeps() as any, mkData({ responseType: 'close', closingReason: 'Withdrew my submission' }));
    expect(res.newStatus).toBe(QueryStatus.WITHDRAWN);
  });
  it('close + another reason -> No Response', async () => {
    const res = await recordQueryResponse(mkDeps() as any, mkData({ responseType: 'close', closingReason: 'Agent no longer accepting queries' }));
    expect(res.newStatus).toBe(QueryStatus.NO_RESPONSE);
  });
});

describe('recordQueryResponse — single-writer invariant + the activity write', () => {
  it('stamps the per-query activity with resultingStatus = the canonical enum, then recomputes', async () => {
    await recordQueryResponse(mkDeps() as any, mkData({ responseType: 'rejected', feedbackType: 'Form' }));
    const activityPayload: any = mockSetDoc.mock.calls[0][1]; // first setDoc = the per-query activity
    expect(activityPayload.resultingStatus).toBe(QueryStatus.REJECTED);
    expect(activityPayload.type).toBe(QueryStatus.REJECTED);
    expect(mockRecompute).toHaveBeenCalledWith('u1', 'q1');
  });

  it('does NOT write status onto the query doc (status is derived, not set here)', async () => {
    await recordQueryResponse(mkDeps() as any, mkData({ responseType: 'partial' }));
    const queryUpdate: any = mockUpdateDoc.mock.calls[0][1];
    expect(queryUpdate.status).toBeUndefined();
    expect('responseReceivedAt' in queryUpdate).toBe(true);
  });

  it('a reversion to Queried writes no timeline activity but still recomputes', async () => {
    await recordQueryResponse(mkDeps() as any, mkData({ responseType: 'queried' }));
    expect(mockSetDoc).not.toHaveBeenCalled(); // neither the per-query nor the legacy activity
    expect(mockUpdateDoc).toHaveBeenCalled();   // response fields cleared
    expect(mockRecompute).toHaveBeenCalledWith('u1', 'q1');
  });
});

describe('recordQueryResponse — undo', () => {
  it('deletes the activity it wrote and recomputes from the restored log', async () => {
    const res = await recordQueryResponse(mkDeps() as any, mkData({ responseType: 'partial' }));
    mockRecompute.mockClear();
    await res.undo();
    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(mockRecompute).toHaveBeenCalledWith('u1', 'q1');
  });
});
