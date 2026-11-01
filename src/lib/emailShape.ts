/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The email shape check, on its own (split v1, phase 4). It used to live only in authActions, which
 * imports Firebase Auth, so the founding sign-up pulled the whole Auth SDK onto the public site for
 * one regular expression. authActions re-exports both names, so its callers are unchanged.
 */

/** A pragmatic email shape check (matches the mockup) — the real gate is Firebase itself. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => EMAIL_RE.test(email.trim());
