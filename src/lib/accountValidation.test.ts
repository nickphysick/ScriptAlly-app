import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDisplayName, validateNewPassword, PASSWORD_MIN } from './accountValidation';

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

describe("validateNewPassword — the one a federated account adds", () => {
  it("refuses an empty one, a short one, and a mismatched pair", () => {
    expect(validateNewPassword("", "").ok).toBe(false);
    expect(validateNewPassword("short", "short").ok).toBe(false);
    expect(validateNewPassword("longenough", "longenoug").ok).toBe(false);
    expect(validateNewPassword("longenough", "longenough").ok).toBe(true);
  });

  /* ⚠️ THE CONFIRMATION IS PART OF THE VALIDATION, not a check the caller might remember. A
     password you cannot reproduce locks you out of the account you were making safer, and a
     mistyped one is indistinguishable from a deliberate one to every layer below this. */
  it("names the mismatch rather than reporting a generic failure", () => {
    expect(validateNewPassword("longenough", "different").error).toMatch(/match/i);
  });

  /* ⚠️ NO COMPOSITION RULE. A digit-or-symbol requirement invented here would be enforced at ONE
     of the two doors into the same account — strengthened in settings, unenforced at sign-up. */
  it("imposes no composition rule, only length", () => {
    expect(validateNewPassword("aaaaaaaa", "aaaaaaaa").ok).toBe(true);
  });

  /**
   * ⚠️ THE SIGN-UP FORM'S LITERAL IS HELD AGAINST THIS CONSTANT.
   *
   * `Auth.tsx` states `password.length < 8` inline. That is a second declaration of one rule, and
   * the honest fix is for it to import `PASSWORD_MIN` — a change outside the phase that added this.
   * Until then the two are checked against each other rather than left to agree by memory: a rule
   * stated twice and checked once is safe; stated twice and checked nowhere is how an account gets
   * created under one policy and strengthened under another.
   */
  it("⚠️ Auth.tsx's sign-up floor is the same number", () => {
    const auth = readFileSync(resolve(__dirname, "../components/Auth.tsx"), "utf8");
    const m = auth.match(/password\.length\s*<\s*(\d+)/);
    expect(m, "Auth.tsx no longer states a length floor in that shape — re-anchor this").toBeTruthy();
    expect(Number(m![1])).toBe(PASSWORD_MIN);
  });
});
