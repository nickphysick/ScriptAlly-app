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
