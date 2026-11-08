/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The one place a caught error is reported from (crash reporting v1). Every error boundary calls
 * `reportBoundaryError`; nothing else in the app logs a boundary's catch.
 *
 * It logs only the message, never the error object, for the same reason `handleFirestoreError`
 * does: an error's other fields can carry a writer's content into the console.
 */
export interface BoundaryContext {
  /** The page or panel the boundary wraps, e.g. "queries" or "panel:query-drawer"; "app" for the top level. */
  boundary: string;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function reportBoundaryError(error: unknown, ctx: BoundaryContext): void {
  console.error(`UI error boundary (${ctx.boundary}) caught:`, errorMessage(error));
}
