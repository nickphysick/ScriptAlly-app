import { describe, it, expect } from 'vitest';
import { activityEventLabel } from './activityEvent';
import { ActivityType, QueryStatus } from '../types';

/**
 * Tier 3 · Phase 2 — timeline events derive from typed fields (resultingStatus + activityType),
 * never from description prose. The input type doesn't even carry a description, so the central
 * claim — rewording a display string cannot change the derived event — is structural; the tests
 * below lock the mapping table and the inert fallback.
 */
describe('activityEventLabel — typed fields only', () => {
  it.each([
    [QueryStatus.PARTIAL_REQUESTED, 'Partial requested'],
    [QueryStatus.PARTIAL_SENT, 'Partial sent'],
    [QueryStatus.FULL_REQUESTED, 'Full requested'],
    [QueryStatus.FULL_SENT, 'Full sent'],
    [QueryStatus.REVISE_RESUBMIT, 'Revise & resubmit'],
    [QueryStatus.OFFER, 'Offer received'],
    [QueryStatus.REJECTED, 'Rejected'],
    [QueryStatus.WITHDRAWN, 'Withdrawn'],
    [QueryStatus.NO_RESPONSE, 'No response'],
  ])('resultingStatus %s → %s', (rs, label) => {
    expect(activityEventLabel({ activityType: ActivityType.STATUS_CHANGED, resultingStatus: rs })).toBe(label);
  });

  it('rewording the description does not change the derived event (prose carries no meaning)', () => {
    const a = { activityType: ActivityType.STATUS_CHANGED, resultingStatus: QueryStatus.REJECTED, description: 'Rejection received from Jane Doe' };
    const b = { activityType: ActivityType.STATUS_CHANGED, resultingStatus: QueryStatus.REJECTED, description: 'Jane said the pass was hard but the pages sparkled' };
    expect(activityEventLabel(a)).toBe('Rejected');
    expect(activityEventLabel(b)).toBe('Rejected');
  });

  it('prose that LOOKS status-laden but has no typed signal is inert — null, never mis-mapped', () => {
    expect(activityEventLabel({ activityType: ActivityType.AGENT_UPDATED, description: 'rejected the old email, requested a partial refund' } as any)).toBeNull();
    expect(activityEventLabel({ description: 'full manuscript sent to the printers' } as any)).toBeNull();
  });

  it('NUDGE_SENT rows label without any resultingStatus', () => {
    expect(activityEventLabel({ activityType: ActivityType.NUDGE_SENT })).toBe('Nudge sent');
  });

  it('the send is never repeated as an event (QUERY_SENT, and QUERIED rungs generally)', () => {
    expect(activityEventLabel({ activityType: ActivityType.QUERY_SENT, resultingStatus: QueryStatus.QUERIED })).toBeNull();
    expect(activityEventLabel({ activityType: ActivityType.STATUS_CHANGED, resultingStatus: QueryStatus.QUERIED })).toBeNull();
  });

  it('camelCase resultingStatus variants are not status-bearing (the shared normaliser rejects them)', () => {
    expect(activityEventLabel({ activityType: ActivityType.STATUS_CHANGED, resultingStatus: 'partialRequested' })).toBeNull();
  });
});
