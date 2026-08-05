import { describe, it, expect } from 'vitest';
import { responseToastTitle, ResponseStyle } from './responseToastTitle';

/**
 * Tier 3 · Phase 1 — every member of the REAL response union gets its intended title. The old
 * inline mapper compared against phantom camelCase statuses, so "partial"/"full"/"rr"/"close"
 * silently fell to the generic title. The compile-time guarantee (a non-member string is
 * rejected; an unhandled member fails the never-guard) rides the type system; this locks the
 * runtime pairs.
 */
describe('responseToastTitle — the real union, each with its intended title', () => {
  const expected: [ResponseStyle, string][] = [
    ['partial', 'Partial request recorded'],
    ['full', 'Full request recorded'],
    ['rr', 'R&R recorded'],
    ['offer', 'Offer recorded'],
    ['rejected', 'Rejection recorded'],
    ['close', 'Query closed'],
    ['queried', 'Response recorded'],
  ];

  it.each(expected)('%s → %s', (resType, title) => {
    expect(responseToastTitle(resType)).toBe(title);
  });

  it('null (no specific type — the focus-form message path) → the honest generic', () => {
    expect(responseToastTitle(null)).toBe('Response recorded');
  });
});
