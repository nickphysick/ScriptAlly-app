import { describe, it, expect } from 'vitest';
import { queriesForManuscript, queriesForAgent, activityIdsForQueries } from './cascade';

const q = (id: string, manuscriptId: string, agentId: string) => ({ id, manuscriptId, agentId }) as any;

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
