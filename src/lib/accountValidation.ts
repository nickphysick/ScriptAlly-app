/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure validation for the account-settings form. Kept separate from the component so it's testable
 * and so the constraints stay in lockstep with the Firestore rules (isValidUser: name 1–256 chars).
 */

export interface FieldValidation {
  ok: boolean;
  value: string; // trimmed
  error?: string;
}

/** Display name: required, trimmed, 1–256 chars (matches the user-doc rule). */
export function validateDisplayName(raw: string): FieldValidation {
  const value = (raw ?? "").trim();
  if (value.length < 1) return { ok: false, value, error: "Please enter a name." };
  if (value.length > 256) return { ok: false, value, error: "Name must be 256 characters or fewer." };
  return { ok: true, value };
}

/**
 * The minimum a new password may be.
 *
 * ⚠️ IT IS A CONSTANT HERE AND A LITERAL `8` IN `Auth.tsx`, AND THAT IS TWO DECLARATIONS OF ONE
 * RULE. The honest fix is for the sign-up form to read this; that file is outside this phase, so
 * the two are held together by a LOCK instead of by an import — `accountValidation.test.ts` reads
 * `Auth.tsx` and fails if its literal stops matching. A rule stated twice and checked once is safe;
 * a rule stated twice and checked nowhere is how an account gets created under one policy and
 * strengthened under another.
 */
export const PASSWORD_MIN = 8;

/**
 * A password being SET for the first time on an account that has none.
 *
 * ⚠️ IT CHECKS THE CONFIRMATION HERE RATHER THAN AT THE CALL SITE. Setting a password you cannot
 * reproduce locks you out of the account you were trying to make safer, and a mistyped one is
 * indistinguishable from a deliberate one to every layer below this. The two fields are one
 * decision, so they are one validation.
 *
 * ⚠️ AND IT IMPOSES NO COMPOSITION RULE — no digit, no symbol, no mixed case. Firebase enforces a
 * length floor and nothing else, so a rule invented here would be this app's opinion enforced at
 * one of the two doors into the same account: strengthened in settings, unenforced at sign-up.
 * Length is the one thing both doors agree on.
 */
export function validateNewPassword(raw: string, confirm: string): FieldValidation {
  const value = raw ?? "";
  if (value.length === 0) return { ok: false, value, error: "Please choose a password." };
  if (value.length < PASSWORD_MIN) {
    return { ok: false, value, error: `Use at least ${PASSWORD_MIN} characters.` };
  }
  if (value !== confirm) return { ok: false, value, error: "The two passwords don't match." };
  return { ok: true, value };
}
