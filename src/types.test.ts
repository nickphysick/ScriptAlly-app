import { describe, it, expect } from 'vitest';
import { QueryStatus, ManuscriptStatus, ActivityType } from './types';

// Guards the canonical string contract documented in CLAUDE.md ("always use the exact QueryStatus
// enum strings; never camelCase"). An accidental rename here would silently break derivation, the
// Firestore rules allowlist, and StatusDot — so pin the exact values.
describe('QueryStatus enum', () => {
  it('has exactly the ten canonical values, verbatim', () => {
    expect(Object.values(QueryStatus)).toEqual([
      'Queried',
      'Partial Requested',
      'Partial Sent',
      'Full Requested',
      'Full Sent',
      'Revise & Resubmit',
      'Offer',
      'Rejected',
      'Withdrawn',
      'No Response',
    ]);
  });
  it('uses the ampersand spelling for R&R (not "R&R" or "Revise and Resubmit")', () => {
    expect(QueryStatus.REVISE_RESUBMIT).toBe('Revise & Resubmit');
  });
  it('contains no camelCase values', () => {
    for (const v of Object.values(QueryStatus)) {
      expect(v).not.toMatch(/^[a-z]+[A-Z]/); // camelCase shape
    }
  });
});

describe('ManuscriptStatus enum', () => {
  it('matches the values the Firestore rules accept', () => {
    expect(Object.values(ManuscriptStatus).sort()).toEqual(
      ['Drafting', 'Revising', 'Ready to Query', 'Querying', 'Shelved', 'On Submission'].sort()
    );
  });
});

describe('ActivityType enum', () => {
  it('exposes the status-changed type derivation relies on', () => {
    expect(ActivityType.STATUS_CHANGED).toBe('Status Changed');
  });
});
