import { describe, it, expect } from 'vitest';
import { parseModel, modelToResult, dateFieldForStatus } from './smartImportReviewModel';
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

describe('parseModel — the single date is the current-status rung date (honest)', () => {
  it('a Full Sent query reads its date from fullSentDate', () => {
    const { queries } = parseModel(result([agent()], [query({ status: QueryStatus.FULL_SENT, dateQueried: '2026-01-01', fullSentDate: '2026-02-02' })]));
    expect(queries[0].date).toBe('2026-02-02');
  });
  it('a Full Sent query with only a queried date shows "date needed" for the full-sent rung (null)', () => {
    const { queries } = parseModel(result([agent()], [query({ status: QueryStatus.FULL_SENT, dateQueried: '2026-01-01' })]));
    expect(queries[0].date).toBeNull(); // not mis-shown as the full-sent date
  });
  it('a Queried query reads dateQueried', () => {
    const { queries } = parseModel(result([agent()], [query({ status: QueryStatus.QUERIED, dateQueried: '2026-01-01' })]));
    expect(queries[0].date).toBe('2026-01-01');
  });
});

describe('modelToResult — a date attaches to the rung matching the current status', () => {
  it('THE FIX: a date set on a Full Sent query seeds fullSentDate, NOT dateQueried', () => {
    const r = result([agent()], [query({ status: QueryStatus.FULL_SENT, dateQueried: null })]);
    const m = parseModel(r);
    m.queries[0].date = '2026-02-20'; // user fills the "date needed"
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].fullSentDate).toBe('2026-02-20'); // seeds the full-sent rung
    expect(out.queries[0].dateQueried).toBeNull();           // NOT the queried rung
  });
  it('preserves the original queried anchor while setting the full-sent date', () => {
    const r = result([agent()], [query({ status: QueryStatus.FULL_SENT, dateQueried: '2026-01-01' })]);
    const m = parseModel(r);
    m.queries[0].date = '2026-02-20';
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].dateQueried).toBe('2026-01-01'); // queried rung preserved
    expect(out.queries[0].fullSentDate).toBe('2026-02-20'); // full-sent rung dated
  });
  it('a Queried query round-trips its date to dateQueried', () => {
    const r = result([agent()], [query({ status: QueryStatus.QUERIED })]);
    const m = parseModel(r);
    m.queries[0].date = '2026-03-03';
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].dateQueried).toBe('2026-03-03');
  });
  it('THE FIX: a date set on an Offer query seeds offerDate, NOT dateQueried', () => {
    const r = result([agent()], [query({ status: QueryStatus.OFFER, dateQueried: '2025-11-05' })]);
    const m = parseModel(r);
    m.queries[0].date = '2026-01-10'; // when the offer came in
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].offerDate).toBe('2026-01-10');   // seeds the offer rung
    expect(out.queries[0].dateQueried).toBe('2025-11-05');  // queried anchor preserved
  });
  it('THE FIX: a date set on a Revise & Resubmit query seeds reviseDate, NOT dateQueried', () => {
    const r = result([agent()], [query({ status: QueryStatus.REVISE_RESUBMIT, dateQueried: '2025-11-05' })]);
    const m = parseModel(r);
    m.queries[0].date = '2026-02-15';
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

describe('modelToResult — exclusions & merge repointing', () => {
  it('drops deleted agents and removed queries; carries a repointed agentRef', () => {
    const r = result(
      [agent({ ref: 'a1' }), agent({ ref: 'a2', name: 'Bob', agency: 'Beta' })],
      [query({ agentRef: 'a1' }), query({ agentRef: 'a2' })]
    );
    const m = parseModel(r);
    m.agents.find((a) => a.id === 'a2')!.deleted = true;          // agent removed
    m.queries[1].removed = true;                                  // its query excluded
    m.queries[0].agentRef = 'a2';                                 // (pretend) merge-repoint survives
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.agents.map((a) => a.ref)).toEqual(['a1']);         // deleted agent gone
    expect(out.queries.length).toBe(1);                           // removed query gone
    expect(out.queries[0].agentRef).toBe('a2');                   // repointed ref carried
  });
});
