import { describe, it, expect } from 'vitest';
import {
  agentIsClosed,
  agentAlreadyQueried,
  splitSuggestions,
  agentBuckets,
  pickableManuscripts,
} from './lifecycle';
import { SubmissionStatus } from '../types';

const ag = (id: string, submissionStatus: SubmissionStatus, setAside = false) => ({ id, submissionStatus, setAside }) as any;
const q = (agentId: string, manuscriptId: string) => ({ agentId, manuscriptId }) as any;

describe('agentIsClosed — Unknown is NOT closed (treated as open)', () => {
  it('only Closed is closed', () => {
    expect(agentIsClosed(ag('a', SubmissionStatus.CLOSED))).toBe(true);
    expect(agentIsClosed(ag('a', SubmissionStatus.OPEN))).toBe(false);
    expect(agentIsClosed(ag('a', SubmissionStatus.UNKNOWN))).toBe(false);
  });
});

describe('agentAlreadyQueried — per-manuscript when given', () => {
  const queries = [q('a1', 'm1'), q('a2', 'm2')];
  it('scopes to the manuscript', () => {
    expect(agentAlreadyQueried('a1', queries, 'm1')).toBe(true);
    expect(agentAlreadyQueried('a1', queries, 'm2')).toBe(false); // queried, but not for m2
  });
  it('falls back to global when no manuscript', () => {
    expect(agentAlreadyQueried('a2', queries)).toBe(true);
    expect(agentAlreadyQueried('a9', queries)).toBe(false);
  });
});

describe('splitSuggestions — three labelled reasons, correct priority', () => {
  const agents = [
    ag('open', SubmissionStatus.OPEN),
    ag('unknown', SubmissionStatus.UNKNOWN),
    ag('closed', SubmissionStatus.CLOSED),
    ag('aside', SubmissionStatus.OPEN, true),
    ag('queried', SubmissionStatus.OPEN),
    ag('asideAndClosed', SubmissionStatus.CLOSED, true),
  ];
  const queries = [q('queried', 'm1')];
  const { suggested, excluded } = splitSuggestions(agents, queries, 'm1');

  it('suggests open + unknown, not-queried, not-set-aside', () => {
    expect(suggested.map((a) => a.id).sort()).toEqual(['open', 'unknown']);
  });
  it('already_queried wins over other reasons', () => {
    expect(excluded.find((e) => e.agent.id === 'queried')!.reason).toBe('already_queried');
  });
  it('set_aside wins over closed', () => {
    expect(excluded.find((e) => e.agent.id === 'asideAndClosed')!.reason).toBe('set_aside');
  });
  it('closed agents excluded with the closed reason', () => {
    expect(excluded.find((e) => e.agent.id === 'closed')!.reason).toBe('closed');
  });
});

describe('agentBuckets — closed/set-aside drop from idle, not from queried', () => {
  const agents = [
    ag('q-open', SubmissionStatus.OPEN),
    ag('q-closed', SubmissionStatus.CLOSED), // queried AND closed → still queried
    ag('q-aside', SubmissionStatus.OPEN, true), // queried AND set aside → still queried
    ag('idle-open', SubmissionStatus.OPEN),
    ag('idle-unknown', SubmissionStatus.UNKNOWN),
    ag('out-closed', SubmissionStatus.CLOSED),
    ag('out-aside', SubmissionStatus.OPEN, true),
  ];
  const queries = [q('q-open', 'm1'), q('q-closed', 'm1'), q('q-aside', 'm1')];
  const b = agentBuckets(agents, queries);

  it('queried counts every queried agent regardless of availability/set-aside', () => {
    expect(b.queried.map((a) => a.id).sort()).toEqual(['q-aside', 'q-closed', 'q-open']);
  });
  it('idle = not-queried, open/unknown, not set aside', () => {
    expect(b.idle.map((a) => a.id).sort()).toEqual(['idle-open', 'idle-unknown']);
  });
  it('not-queried closed/set-aside drop out of idle entirely', () => {
    expect(b.excludedFromIdle.map((a) => a.id).sort()).toEqual(['out-aside', 'out-closed']);
  });
});

describe('pickableManuscripts — shelved hidden', () => {
  it('drops shelved books', () => {
    const ms = [{ id: 'm1', shelved: false }, { id: 'm2', shelved: true }, { id: 'm3' }] as any;
    expect(pickableManuscripts(ms).map((m: any) => m.id)).toEqual(['m1', 'm3']);
  });
});
