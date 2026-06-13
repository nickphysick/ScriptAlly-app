import { describe, it, expect } from 'vitest';
import { validateDisplayName } from './accountValidation';

describe('validateDisplayName', () => {
  it('accepts a normal name and returns it trimmed', () => {
    expect(validateDisplayName('  Lucy Sterling  ')).toEqual({ ok: true, value: 'Lucy Sterling' });
  });
  it('rejects empty / whitespace-only', () => {
    expect(validateDisplayName('').ok).toBe(false);
    expect(validateDisplayName('   ').ok).toBe(false);
  });
  it('rejects names longer than 256 chars (the rule cap)', () => {
    expect(validateDisplayName('a'.repeat(257)).ok).toBe(false);
    expect(validateDisplayName('a'.repeat(256)).ok).toBe(true);
  });
});
