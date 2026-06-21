import { describe, it, expect } from 'vitest';
import { parseModel, modelToResult, applyAgentRemoval, dateFieldForStatus, quoteStatuses } from './smartImportReviewModel';
import { QueryStatus } from '../types';
import { ParsedAgent, ParsedQuery, SmartImportResult } from '../types/smartImport';

const agent = (over: Partial<ParsedAgent> = {}): ParsedAgent => ({ ref: 'a1', name: 'Jane Doe', agency: 'Acme', confidence: 'high', ...over });
const query = (over: Partial<ParsedQuery> = {}): ParsedQuery => ({ agentRef: 'a1', dateQueried: null, status: QueryStatus.QUERIED, confidence: 'high', ...over });
const result = (agents: ParsedAgent[], queries: ParsedQuery[]): SmartImportResult => ({ columnMapping: {}, statusTranslations: [], agents, queries, warnings: [] });

describe('dateFieldForStatus — which rung a status date seeds', () => {
  it('ladder statuses map to their own rung field', () => {
    expect(dateFieldForStatus(QueryStatus.QUERIED)).toBe('dateQueried');
    expect(dateFieldForStatus(QueryStatus.PARTIAL_REQUESTED)).toBe('partialRequestedDate');
    expect(dateFieldForStatus(QueryStatus.PARTIAL_SENT)).toBe('partialSentDate');
    expect(dateFieldForStatus(QueryStatus.FULL_REQUESTED)).toBe('fullRequestedDate');
    expect(dateFieldForStatus(QueryStatus.FULL_SENT)).toBe('fullSentDate');
  });
  it('closed-family maps to closedDate', () => {
    expect(dateFieldForStatus(QueryStatus.REJECTED)).toBe('closedDate');
    expect(dateFieldForStatus(QueryStatus.WITHDRAWN)).toBe('closedDate');
    expect(dateFieldForStatus(QueryStatus.NO_RESPONSE)).toBe('closedDate');
  });
  it('Offer & Revise & Resubmit map to their own rung fields', () => {
    expect(dateFieldForStatus(QueryStatus.OFFER)).toBe('offerDate');
    expect(dateFieldForStatus(QueryStatus.REVISE_RESUBMIT)).toBe('reviseDate');
  });
});

describe('parseModel — queried anchor and current-status date kept separate', () => {
  it('a Full Sent query reads its status date from fullSentDate, anchor from dateQueried', () => {
    const { queries } = parseModel(result([agent()], [query({ status: QueryStatus.FULL_SENT, dateQueried: '2026-01-01', fullSentDate: '2026-02-02' })]));
    expect(queries[0].statusDate).toBe('2026-02-02');
    expect(queries[0].dateQueried).toBe('2026-01-01');
  });
  it('a Full Sent query with only a queried date has no status date (shows "add a date")', () => {
    const { queries } = parseModel(result([agent()], [query({ status: QueryStatus.FULL_SENT, dateQueried: '2026-01-01' })]));
    expect(queries[0].statusDate).toBeNull(); // not mis-shown as the full-sent date
    expect(queries[0].dateQueried).toBe('2026-01-01');
  });
  it('a Queried query keeps its date as the queried anchor, no separate status date', () => {
    const { queries } = parseModel(result([agent()], [query({ status: QueryStatus.QUERIED, dateQueried: '2026-01-01' })]));
    expect(queries[0].dateQueried).toBe('2026-01-01');
    expect(queries[0].statusDate).toBeNull();
  });
});

describe('modelToResult — a status date attaches to the rung matching the current status', () => {
  it('THE FIX: a status date on a Full Sent query seeds fullSentDate, NOT dateQueried', () => {
    const r = result([agent()], [query({ status: QueryStatus.FULL_SENT, dateQueried: null })]);
    const m = parseModel(r);
    m.queries[0].statusDate = '2026-02-20'; // user fills the full-sent date
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].fullSentDate).toBe('2026-02-20'); // seeds the full-sent rung
    expect(out.queries[0].dateQueried).toBeNull();           // NOT the queried rung
  });
  it('beyond Queried, both the queried anchor and the status date round-trip independently', () => {
    const r = result([agent()], [query({ status: QueryStatus.FULL_SENT })]);
    const m = parseModel(r);
    m.queries[0].dateQueried = '2026-01-01';
    m.queries[0].statusDate = '2026-02-20';
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].dateQueried).toBe('2026-01-01'); // queried rung
    expect(out.queries[0].fullSentDate).toBe('2026-02-20'); // full-sent rung
  });
  it('a Queried query round-trips its date to dateQueried', () => {
    const r = result([agent()], [query({ status: QueryStatus.QUERIED })]);
    const m = parseModel(r);
    m.queries[0].dateQueried = '2026-03-03';
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].dateQueried).toBe('2026-03-03');
  });
  it('THE FIX: a status date on an Offer query seeds offerDate, NOT dateQueried', () => {
    const r = result([agent()], [query({ status: QueryStatus.OFFER, dateQueried: '2025-11-05' })]);
    const m = parseModel(r);
    m.queries[0].statusDate = '2026-01-10'; // when the offer came in
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].offerDate).toBe('2026-01-10');   // seeds the offer rung
    expect(out.queries[0].dateQueried).toBe('2025-11-05');  // queried anchor preserved
  });
  it('THE FIX: a status date on a Revise & Resubmit query seeds reviseDate, NOT dateQueried', () => {
    const r = result([agent()], [query({ status: QueryStatus.REVISE_RESUBMIT, dateQueried: '2025-11-05' })]);
    const m = parseModel(r);
    m.queries[0].statusDate = '2026-02-15';
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].reviseDate).toBe('2026-02-15');
    expect(out.queries[0].dateQueried).toBe('2025-11-05');
  });
  it('a still-needed date stays null — never fabricated', () => {
    const r = result([agent()], [query({ status: QueryStatus.FULL_SENT, dateQueried: null })]);
    const m = parseModel(r);
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].fullSentDate ?? null).toBeNull();
  });
});

describe('quoteStatuses — statuses in prose render lowercase, single-quoted', () => {
  it('lowercases and single-quotes a status named in note prose', () => {
    expect(quoteStatuses("we mapped this to Queried — change it")).toBe("we mapped this to 'queried' — change it");
  });
  it('handles multi-word and already-quoted statuses', () => {
    expect(quoteStatuses("read as Full Sent")).toBe("read as 'full sent'");
    expect(quoteStatuses('"Rejected" by the agent')).toBe("'rejected' by the agent");
  });
});

describe('applyAgentRemoval — cascade path (real delete handler logic)', () => {
  it('marks the agent deleted and cascades all its queries to removed', () => {
    const r = result([agent({ ref: 'a1' }), agent({ ref: 'a2', name: 'Bob', agency: 'Beta' })],
                     [query({ agentRef: 'a1' }), query({ agentRef: 'a2' })]);
    const m = parseModel(r);
    const next = applyAgentRemoval(m.agents, m.queries, 'a1');
    expect(next.agents.find((a) => a.id === 'a1')!.deleted).toBe(true);
    expect(next.agents.find((a) => a.id === 'a2')!.deleted).toBe(false);
    expect(next.queries[0].removed).toBe(true);   // a1's query cascaded
    expect(next.queries[0].removedReason).toBe('Agent removed');
    expect(next.queries[1].removed).toBe(false);  // a2's query untouched
  });

  it('cascade path into modelToResult: deleted agent and its queries excluded from output', () => {
    const r = result([agent({ ref: 'a1' }), agent({ ref: 'a2', name: 'Bob', agency: 'Beta' })],
                     [query({ agentRef: 'a1' }), query({ agentRef: 'a2' })]);
    const m = parseModel(r);
    const next = applyAgentRemoval(m.agents, m.queries, 'a1');  // real cascade, not hand-set
    const out = modelToResult(r, next.agents, next.queries);
    expect(out.agents.map((a) => a.ref)).toEqual(['a2']);
    expect(out.queries.length).toBe(1);
    expect(out.queries[0].agentRef).toBe('a2');
  });
});

describe('modelToResult — exclusions & merge repointing', () => {
  it('drops deleted agents and removed queries; carries a merge-repointed agentRef', () => {
    // Merge scenario: a1 deleted (merged into a2). removeDuplicate repoints a1's queries to
    // the survivor (a2). The repointed agentRef must survive through modelToResult.
    const r = result(
      [agent({ ref: 'a1' }), agent({ ref: 'a2', name: 'Bob', agency: 'Beta' })],
      [query({ agentRef: 'a1' }), query({ agentRef: 'a2' })]
    );
    const m = parseModel(r);
    m.agents.find((a) => a.id === 'a1')!.deleted = true;          // a1 deleted (merged into a2)
    m.queries[0].agentRef = 'a2';                                 // a1's query repointed to survivor a2
    // q1 stays agentRef:'a2', not removed — both survive under a2
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.agents.map((a) => a.ref)).toEqual(['a2']);         // a1 gone, a2 survives
    expect(out.queries.length).toBe(2);                           // both queries survive
    expect(out.queries.every((q) => q.agentRef === 'a2')).toBe(true); // repointed ref carried
  });
});
