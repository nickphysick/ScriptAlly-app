import { describe, it, expect } from 'vitest';
import { parseModel, modelToResult, applyAgentRemoval, quoteStatuses, queryReasonText, statusDirectionChoices, reviewTallies, seedUnidentifiedSetAside, decideStageEntry, doneStageMessage, ReviewQuery } from './smartImportReviewModel';
import { QueryStatus } from '../types';
import { ParsedAgent, ParsedQuery, SmartImportResult } from '../types/smartImport';

const agent = (over: Partial<ParsedAgent> = {}): ParsedAgent => ({ ref: 'a1', name: 'Jane Doe', agency: 'Acme', ...over });
const query = (over: Partial<ParsedQuery> = {}): ParsedQuery => ({ agentRef: 'a1', status: QueryStatus.QUERIED, sentDate: null, ...over });
const result = (agents: ParsedAgent[], queries: ParsedQuery[]): SmartImportResult => ({ agents, queries });

describe('parseModel — the new structured query shape', () => {
  it('reads the sent date (spine), timeline, and typed reasons', () => {
    const { queries } = parseModel(result([agent()], [query({
      status: QueryStatus.FULL_REQUESTED,
      sentDate: '2024-03-14', sentDateRaw: '14/03/2024',
      timeline: [{ type: QueryStatus.FULL_REQUESTED, date: '2024-03-20', raw: '20/3' }],
      reasons: ['two-dates'],
    })]));
    expect(queries[0].sentDate).toBe('2024-03-14');
    expect(queries[0].sentDateRaw).toBe('14/03/2024');
    expect(queries[0].timeline).toEqual([{ type: QueryStatus.FULL_REQUESTED, date: '2024-03-20', raw: '20/3' }]);
    expect(queries[0].reasons).toEqual([{ code: 'two-dates', resolved: false }]);
  });

  it('a null status defaults to Queried; unknown reason codes are dropped', () => {
    const { queries } = parseModel(result([agent()], [query({ status: null, reasons: ['no-date', 'bogus' as any] })]));
    expect(queries[0].status).toBe(QueryStatus.QUERIED);
    expect(queries[0].reasons).toEqual([{ code: 'no-date', resolved: false }]);
  });

  it('a clean query carries no reasons (Ready)', () => {
    const { queries } = parseModel(result([agent()], [query({ sentDate: '2026-01-01' })]));
    expect(queries[0].reasons).toEqual([]);
  });

  it('strips agent-identity codes (check-name / needs-identifying) from query reasons — they belong to the agent', () => {
    const { queries } = parseModel(result([agent()], [query({ reasons: ['check-name', 'no-date', 'needs-identifying'] })]));
    expect(queries[0].reasons.map((r) => r.code)).toEqual(['no-date']); // only the genuine query reason survives
  });
});

describe('seedUnidentifiedSetAside — graceful handling of the truly unidentifiable', () => {
  it('no-name-no-agency agent → auto-set-aside (unidentified) with the note as context; its query removed', () => {
    const r = result([agent({ ref: 'a1', name: '', agency: '' })], [query({ agentRef: 'a1', notes: 'submitted via QueryManager' })]);
    const m = parseModel(r);
    const out = seedUnidentifiedSetAside(m.agents, m.queries);
    const a = out.agents.find((x) => x.id === 'a1')!;
    expect(a.deleted).toBe(true);
    expect(a.setAsideStage).toBe('unidentified');
    expect(a.setAsideContext).toBe('submitted via QueryManager');
    expect(out.queries[0].removed).toBe(true); // dependent flags follow the record off-screen
  });

  it('has-name-no-agency agent (Priya) is NOT auto-set-aside — that stays the needs-agency card', () => {
    const r = result([agent({ ref: 'a1', name: 'Priya Raman', agency: '' })], [query({ agentRef: 'a1' })]);
    const m = parseModel(r);
    const out = seedUnidentifiedSetAside(m.agents, m.queries);
    expect(out.agents.find((x) => x.id === 'a1')!.deleted).toBe(false);
    expect(out.queries[0].removed).toBe(false);
  });
});

describe('modelToResult — the edited spine + timeline round-trip', () => {
  it('writes the edited sent date and status straight through', () => {
    const r = result([agent()], [query({ status: QueryStatus.QUERIED })]);
    const m = parseModel(r);
    m.queries[0].sentDate = '2026-03-03';
    m.queries[0].status = QueryStatus.PARTIAL_SENT;
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].sentDate).toBe('2026-03-03');
    expect(out.queries[0].status).toBe(QueryStatus.PARTIAL_SENT);
  });

  it('round-trips a timeline event', () => {
    const r = result([agent()], [query({
      status: QueryStatus.FULL_REQUESTED, sentDate: '2024-03-14',
      timeline: [{ type: QueryStatus.FULL_REQUESTED, date: '2024-03-20', raw: '20/3' }],
    })]);
    const m = parseModel(r);
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].timeline).toEqual([{ type: QueryStatus.FULL_REQUESTED, date: '2024-03-20', raw: '20/3' }]);
  });

  it('a still-needed sent date stays null — never fabricated', () => {
    const r = result([agent()], [query({ status: QueryStatus.FULL_SENT, sentDate: null })]);
    const m = parseModel(r);
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.queries[0].sentDate).toBeNull();
  });
});

describe('queryReasonText — copy derived from the code (Form-11 voice)', () => {
  const q = (over: Partial<ReviewQuery> = {}): ReviewQuery => ({
    id: 'q0', agentRef: 'a1', status: QueryStatus.QUERIED, sentDate: null, sentDateRaw: null, timeline: [], reasons: [], notes: '', removed: false, ...over,
  });
  it('missing-day quotes what they wrote', () => {
    expect(queryReasonText('missing-day', q({ sentDateRaw: 'March 2024' }))).toContain('March 2024');
  });
  it('status-direction asks sent vs requested for the full', () => {
    expect(queryReasonText('status-direction', q({ status: QueryStatus.FULL_REQUESTED }))).toMatch(/full manuscript/i);
  });
  it('two-dates names both dates', () => {
    const text = queryReasonText('two-dates', q({ sentDate: '2024-03-14', timeline: [{ type: QueryStatus.FULL_REQUESTED, date: '2024-03-20', raw: '20/3' }] }));
    expect(text).toContain('14 Mar 2024');
    expect(text).toContain('20 Mar 2024');
  });
  it('check-name reads as note-not-name and quotes the kept annotation', () => {
    const text = queryReasonText('check-name', q({ notes: 'submitted, agent TBC' }));
    expect(text).toMatch(/note than a name/i);
    expect(text).toContain('submitted, agent TBC');
  });
  it('needs-identifying asks who it was and quotes the kept phrase', () => {
    const text = queryReasonText('needs-identifying', q({ notes: 'submitted via QueryManager' }));
    expect(text).toMatch(/who/i);
    expect(text).toContain('submitted via QueryManager');
  });
});

describe('statusDirectionChoices — the two real choices', () => {
  it('offers the full pair for a full status', () => {
    expect(statusDirectionChoices(QueryStatus.FULL_REQUESTED).map((c) => c.status))
      .toEqual([QueryStatus.FULL_SENT, QueryStatus.FULL_REQUESTED]);
  });
  it('offers the partial pair for a partial status', () => {
    expect(statusDirectionChoices(QueryStatus.PARTIAL_SENT).map((c) => c.status))
      .toEqual([QueryStatus.PARTIAL_SENT, QueryStatus.PARTIAL_REQUESTED]);
  });
});

describe('decideStageEntry — intro before walk on first entry, suppressed after', () => {
  it('first flagged visit → intro (the welcome plays before the walk)', () => {
    expect(decideStageEntry({ flagged: true, introSeen: false, escaped: false })).toBe('intro');
  });
  it('revisit after the intro has been seen → walk (no replay)', () => {
    expect(decideStageEntry({ flagged: true, introSeen: true, escaped: false })).toBe('walk');
  });
  it('escaped via "View all" → none (stay on the list, no intro, no walk)', () => {
    expect(decideStageEntry({ flagged: true, introSeen: true, escaped: true })).toBe('none');
    expect(decideStageEntry({ flagged: true, introSeen: false, escaped: true })).toBe('none');
  });
  it('zero flagged items → none (clean list, no empty overlay)', () => {
    expect(decideStageEntry({ flagged: false, introSeen: false, escaped: false })).toBe('none');
  });
});

describe('reviewTallies — per-population, never pooled (the "37" fix)', () => {
  it('each population reconciles to its own total; agents use fix, queries use sharpen', () => {
    const r = result(
      [
        agent({ ref: 'a1', name: 'Clean', agency: 'Acme' }),          // agent ready
        agent({ ref: 'a2', name: 'NoAgency', agency: '' }),            // agent fix (no agency)
      ],
      [
        query({ agentRef: 'a1', reasons: ['no-date'] }),              // query sharpen
        query({ agentRef: 'a1' }),                                    // query ready
      ]
    );
    const { agents, queries } = parseModel(r);
    const t = reviewTallies(agents, queries);
    expect(t.agents).toEqual({ total: 2, ready: 1, fix: 1, sharpen: 0 });
    expect(t.queries).toEqual({ total: 2, ready: 1, fix: 0, sharpen: 1 });
    // each column reconciles to its own total — agents+queries are NEVER summed together
    expect(t.agents.ready + t.agents.fix).toBe(t.agents.total);
    expect(t.queries.ready + t.queries.sharpen).toBe(t.queries.total);
  });

  it('a query with TWO reasons (status-wording + no-date) counts once in sharpen, not twice', () => {
    const r = result([agent()], [query({ agentRef: 'a1', reasons: ['status-wording', 'no-date'] })]);
    const { agents, queries } = parseModel(r);
    const t = reviewTallies(agents, queries);
    expect(t.queries).toEqual({ total: 1, ready: 0, fix: 0, sharpen: 1 });
  });

  it('an unresolved duplicate cluster marks every member as a fix (agent-side)', () => {
    const r = result(
      [
        agent({ ref: 'a1', name: 'Jonathan Pryce', agency: 'Pryce Literary' }),
        agent({ ref: 'a2', name: 'J. Pryce', agency: 'Pryce Lit' }),
      ],
      [query({ agentRef: 'a1' })]
    );
    const { agents, queries } = parseModel(r); // parseModel clusters these as likely-dupes
    const t = reviewTallies(agents, queries);
    expect(t.agents).toEqual({ total: 2, ready: 0, fix: 2, sharpen: 0 });
    expect(t.queries).toEqual({ total: 1, ready: 1, fix: 0, sharpen: 0 });
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
    expect(next.queries[0].removed).toBe(true);
    expect(next.queries[0].removedReason).toBe('Agent removed');
    expect(next.queries[1].removed).toBe(false);
  });

  it('cascade path into modelToResult: deleted agent and its queries excluded from output', () => {
    const r = result([agent({ ref: 'a1' }), agent({ ref: 'a2', name: 'Bob', agency: 'Beta' })],
                     [query({ agentRef: 'a1' }), query({ agentRef: 'a2' })]);
    const m = parseModel(r);
    const next = applyAgentRemoval(m.agents, m.queries, 'a1');
    const out = modelToResult(r, next.agents, next.queries);
    expect(out.agents.map((a) => a.ref)).toEqual(['a2']);
    expect(out.queries.length).toBe(1);
    expect(out.queries[0].agentRef).toBe('a2');
  });
});

describe('modelToResult — exclusions & merge repointing', () => {
  it('drops deleted agents and removed queries; carries a merge-repointed agentRef', () => {
    const r = result(
      [agent({ ref: 'a1' }), agent({ ref: 'a2', name: 'Bob', agency: 'Beta' })],
      [query({ agentRef: 'a1' }), query({ agentRef: 'a2' })]
    );
    const m = parseModel(r);
    m.agents.find((a) => a.id === 'a1')!.deleted = true;  // a1 merged into a2
    m.queries[0].agentRef = 'a2';                         // a1's query repointed to survivor a2
    const out = modelToResult(r, m.agents, m.queries);
    expect(out.agents.map((a) => a.ref)).toEqual(['a2']);
    expect(out.queries.length).toBe(2);
    expect(out.queries.every((qq) => qq.agentRef === 'a2')).toBe(true);
  });
});

describe('doneStageMessage — the all-sorted message tells the truth', () => {
  const chip = 'Queries all sorted — ready to import';

  it('claims "all sorted" + shows the chip ONLY when nothing was skipped', () => {
    const m = doneStageMessage({ fixesLeft: false, skipped: 0, sortedChip: chip });
    expect(m.heading).toBe('All sorted ✦');
    expect(m.chip).toBe(chip);
  });

  it('does NOT claim all-sorted (no chip) when items were skipped/left open', () => {
    const m = doneStageMessage({ fixesLeft: false, skipped: 2, sortedChip: chip });
    expect(m.chip).toBeNull();                 // never the false "ready to import" claim
    expect(m.heading).not.toBe('All sorted ✦');
    expect(m.body).toMatch(/still open/);
    // the two states must read differently
    expect(m).not.toEqual(doneStageMessage({ fixesLeft: false, skipped: 0, sortedChip: chip }));
  });

  it('singular vs plural wording for the open count', () => {
    expect(doneStageMessage({ fixesLeft: false, skipped: 1, sortedChip: chip }).body).toMatch(/^One is still open/);
    expect(doneStageMessage({ fixesLeft: false, skipped: 3, sortedChip: chip }).body).toMatch(/^3 are still open/);
  });

  it('a blocking fix shows "Almost there", never the chip', () => {
    const m = doneStageMessage({ fixesLeft: true, skipped: 0, sortedChip: chip });
    expect(m.heading).toBe('Almost there');
    expect(m.chip).toBeNull();
  });
});
