import { describe, it, expect } from 'vitest';
import { tidyPairs } from './ImportTidyAnimation';
import { QueryStatus } from '../../types';
import { SmartImportResult } from '../../types/smartImport';

const result = (agents: any[], queries: any[]): SmartImportResult => ({ agents, queries });

describe('tidyPairs — real messy→clean pairs from data in hand (no fabrication)', () => {
  it('pairs raw cells with their parsed dates and leads with the set-aside junk case', () => {
    const r = result(
      [
        { ref: 'a1', name: 'Gregory Salt', agency: 'Penhallow Literary' },
        { ref: 'a2', name: '', agency: '' }, // unidentifiable
      ],
      [
        { agentRef: 'a1', status: QueryStatus.NO_RESPONSE, sentDateRaw: '44621', sentDate: '2022-03-01' },
        { agentRef: 'a2', status: QueryStatus.QUERIED, notes: 'submitted via QueryManager' },
      ]
    );
    const pairs = tidyPairs(r);
    expect(pairs[0]).toEqual({ raw: 'submitted via QueryManager', clean: 'set aside — name it any time' });
    expect(pairs.some((p) => p.raw === '44621' && p.clean.includes('1 Mar 2022'))).toBe(true);
  });

  it('a fully-clean result yields no fabricated mess', () => {
    const r = result([{ ref: 'a1', name: 'Clean', agency: 'Acme' }], [{ agentRef: 'a1', status: QueryStatus.QUERIED }]);
    expect(tidyPairs(r)).toEqual([]);
  });

  it('caps the sample at 8', () => {
    const queries = Array.from({ length: 20 }, (_, i) => ({ agentRef: 'a1', status: QueryStatus.QUERIED, sentDateRaw: `1${i}.4.24`, sentDate: '2024-04-10' }));
    const r = result([{ ref: 'a1', name: 'A', agency: 'B' }], queries);
    expect(tidyPairs(r).length).toBe(8);
  });
});
