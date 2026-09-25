/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE OPTED-OUT REGISTER — the pages that decline the shared page-header treatment.
 *
 * ⚠️ ONE REGISTER, AND EVERY SUITE IMPORTS IT. No measurement declares its own array. A page that
 * opts out opts out EVERYWHERE AT ONCE, or it ends up exempt from two suites and red on a third for
 * a reason nobody can find — which is exactly how this pass went: the Query Centre declined the
 * shared masthead, `mastheadMatrix` was given a named exemption, and `gapAudit`, `headerFix` and
 * `subWrap` went on reaching for a masthead and a subtitle that are not there (Nick's condition,
 * 20 Sep).
 *
 * ⚠️ IT LIVES HERE RATHER THAN IN `mastheadMatrix.measure.ts`, WHICH IS WHERE IT WAS. Importing a
 * `*.measure.ts` from another `*.measure.ts` executes its `test()` calls in the importer's file
 * scope, so every page of that matrix would be registered twice and run twice. The SET is
 * unchanged and `mastheadMatrix` still asserts it, both ways, against what the pages render — the
 * module moved so the other three could read it, not so the claim could.
 *
 * ⚠️ AND THE ENTRY IS A PAGE NAME, matching the `name` in each suite's own page census. Keeping it
 * to names rather than routes means a census that lists a page twice (two widths, two variants)
 * cannot半 exempt it.
 */

/**
 * Pages that draw their own head instead of `PageHeader`'s.
 *
 * **Query Centre** (v11, 19 Sep): its head is the page's own — "Query Centre" in the app's type, a
 * facts sentence, and "+ Log a query" — on the page ground with no slab. Its subtitle deliberately
 * leaves the shared wrap treatment too (Nick, 20 Sep): the head line is a facts sentence between a
 * Special Elite title and two action pills, a shape no other page has, so holding it to the shared
 * rule would enforce the remains of a treatment this page no longer uses.
 */
export const OPTED_OUT: readonly string[] = ["Query Centre", "Contact list"];

/** Routes of the opted-out pages, for suites whose census is keyed by route rather than by name. */
export const OPTED_OUT_ROUTES: readonly string[] = ["/queries", "/agents"];

export const isOptedOut = (nameOrRoute: string): boolean =>
  OPTED_OUT.includes(nameOrRoute) || OPTED_OUT_ROUTES.includes(nameOrRoute);
