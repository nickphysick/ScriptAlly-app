/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What `addQuery` writes for a query that arrives by import — the two decisions that used to
 * invent a date, stated as pure functions so they can be tested without the provider.
 *
 * A query logged by hand is sent now: its sent date defaults to now and `addQuery` writes its
 * first history steps, stamped now. An IMPORTED query happened in the past, on a date the file
 * either gave or did not. For it:
 *   · the sent date is the file's, or absent — never now;
 *   · `addQuery` writes NO history. The import writes the whole history itself, with the file's
 *     dates. A step stamped "now" beside it reads as a real, dated event, outranks the import's
 *     undated one, and dated every imported stage to the moment of import ("Asked today").
 */
export interface ImportedOpt { imported?: boolean }

/** The sent date to store: the one given; else now for a hand-logged query; else none. */
export function importedSentDate(given: string | undefined, opts: ImportedOpt | undefined, now: () => string): string | undefined {
  if (given) return given;
  return opts?.imported ? undefined : now();
}

/** Whether `addQuery` writes the query's first history steps itself. */
export function seedsOwnHistory(opts: ImportedOpt | undefined): boolean {
  return !opts?.imported;
}
