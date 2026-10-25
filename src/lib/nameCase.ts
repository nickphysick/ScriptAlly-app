/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149.1 B5 — A NAME THAT ARRIVES SHOUTING IS TITLE-CASED; ANY OTHER NAME IS LEFT AS WRITTEN.
 * "PRIYA RAMAN" → "Priya Raman", "O'BRIEN" → "O'Brien", "SMITH-JONES" → "Smith-Jones", "J. K. ROWLING" → "J. K. Rowling".
 * Only a name with no lowercase letter at all is touched: "McDonald", "de la Cruz" and "bell hooks" are the writer's.
 * ⚠️ PLAIN TYPESCRIPT WITH NO IMPORTS, so the one-off migration (tests/e2e/migrateNameCase.mjs) runs this same function
 *    under Node's type stripping rather than a copy of it.
 * ⚠️ IT CANNOT KNOW "MC"/"MAC": "MCDONALD" becomes "Mcdonald". Stated rather than guessed.
 */
export function isShouting(name: string): boolean {
  return /[A-Z]{2}/.test(name) && !/[a-z]/.test(name);
}
export function nameCase(name: string): string {
  if (!isShouting(name)) return name;
  return name.toLowerCase().replace(/(^|[\s\-'’.])([a-zà-ÿ])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}
