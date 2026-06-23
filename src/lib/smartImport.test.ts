import { describe, it, expect } from 'vitest';
import { validateSmartImport } from './smartImport';
import { ParsedAgent, ParsedQuery, SmartImportResult } from '../types/smartImport';
import { QueryStatus } from '../types';

const agent = (over: Partial<ParsedAgent> = {}): ParsedAgent => ({ ref: 'a1', name: 'Jane Doe', ...over });
const query = (over: Partial<ParsedQuery> = {}): ParsedQuery => ({
  agentRef: 'a1', status: QueryStatus.QUERIED, sentDate: '2026-01-01', ...over,
});
const result = (agents: ParsedAgent[], queries: ParsedQuery[]): SmartImportResult => ({ agents, queries });

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

  it('IMPORTS a row with no sent date (provisional) — never drops it for a missing date', () => {
    const r = validateSmartImport(result([agent()], [query({ sentDate: null })]));
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

  it('flags out-of-order dates (sent date after a later timeline event) but STILL imports the row', () => {
    const r = validateSmartImport(result([agent()], [query({
      sentDate: '2026-05-01',
      timeline: [{ type: QueryStatus.PARTIAL_REQUESTED, date: '2026-01-01', raw: null }],
    })]));
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
