import { describe, it, expect } from 'vitest';
import { validateSmartImport } from './smartImport';
import { ParsedAgent, ParsedQuery, SmartImportResult } from '../types/smartImport';
import { QueryStatus } from '../types';

const agent = (over: Partial<ParsedAgent> = {}): ParsedAgent => ({ ref: 'a1', name: 'Jane Doe', confidence: 'high', ...over });
const query = (over: Partial<ParsedQuery> = {}): ParsedQuery => ({
  agentRef: 'a1', dateQueried: '2026-01-01', status: QueryStatus.QUERIED, confidence: 'high', ...over,
});
const result = (agents: ParsedAgent[], queries: ParsedQuery[]): SmartImportResult => ({
  columnMapping: {}, statusTranslations: [], agents, queries, warnings: [],
});

describe('validateSmartImport — drop-and-report (never silently write a bad row)', () => {
  it('keeps a fully valid row', () => {
    const r = validateSmartImport(result([agent()], [query()]));
    expect(r.importable).toHaveLength(1);
    expect(r.skipped).toHaveLength(0);
  });

  it('drops a row with no status', () => {
    const r = validateSmartImport(result([agent()], [query({ status: null })]));
    expect(r.importable).toHaveLength(0);
    expect(r.skipped[0].reason).toMatch(/No readable status/);
  });

  it('drops a row with an unrecognised (non-enum) status', () => {
    const r = validateSmartImport(result([agent()], [query({ status: 'Bananas' as any })]));
    expect(r.skipped[0].reason).toMatch(/Unrecognised status/);
  });

  it('IMPORTS a row with no query date (provisional) — never drops it for a missing date', () => {
    const r = validateSmartImport(result([agent()], [query({ dateQueried: null })]));
    expect(r.importable).toHaveLength(1);
    expect(r.skipped).toHaveLength(0);
  });

  it('drops a row whose agentRef matches no agent', () => {
    const r = validateSmartImport(result([agent({ ref: 'a1' })], [query({ agentRef: 'ghost' })]));
    expect(r.skipped[0].reason).toMatch(/didn't match an agent/);
  });

  it("IMPORTS an agency-only (no-name) agent's query — agency is the identity", () => {
    const r = validateSmartImport(result([agent({ ref: 'a1', name: '   ', agency: 'Curtis Brown' })], [query({ agentRef: 'a1' })]));
    expect(r.importable).toHaveLength(1);
    expect(r.skipped).toHaveLength(0);
  });

  it("drops a row whose agent has neither a name nor an agency", () => {
    const r = validateSmartImport(result([agent({ ref: 'a1', name: '  ', agency: '' })], [query({ agentRef: 'a1' })]));
    expect(r.skipped[0].reason).toMatch(/no agent name or agency/);
  });

  it('flags out-of-order dates as a warning but STILL imports the row (never auto-fixed)', () => {
    const r = validateSmartImport(result([agent()], [query({ dateQueried: '2026-05-01', partialRequestedDate: '2026-01-01' })]));
    expect(r.importable).toHaveLength(1);
    expect(r.dateWarnings.length).toBeGreaterThan(0);
  });

  it('accepts every canonical QueryStatus value', () => {
    for (const s of Object.values(QueryStatus)) {
      const r = validateSmartImport(result([agent()], [query({ status: s })]));
      expect(r.importable, `status ${s}`).toHaveLength(1);
    }
  });
});
