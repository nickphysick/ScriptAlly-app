/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The one place a caught error is reported from (crash reporting v1). Every error boundary calls
 * `reportBoundaryError`; nothing else in the app logs a boundary's catch. It goes to the console
 * and to Sentry (lib/sentry.ts), tagged with the boundary's name.
 *
 * It logs only the message, never the error object, for the same reason `handleFirestoreError`
 * does: an error's other fields can carry a writer's content into the console.
 */
import { captureBoundaryError, captureFirestoreError, markReported } from "./sentry";
import { normaliseFirestorePath } from "./sentryScrub";

export interface BoundaryContext {
  /** The page or panel the boundary wraps, e.g. "queries" or "panel:query-drawer"; "app" for the top level. */
  boundary: string;
  /** React's component stack: component names only, never props or text. */
  componentStack?: string;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function reportBoundaryError(error: unknown, ctx: BoundaryContext): void {
  console.error(`UI error boundary (${ctx.boundary}) caught:`, errorMessage(error));
  /* Phase 2: to Sentry, tagged with the boundary (a no-op where Sentry is off: no DSN, localhost, tests). */
  captureBoundaryError(error, ctx.boundary, ctx.componentStack);
}

/**
 * `handleFirestoreError`'s log and report, here so it can be tested without starting Firebase. It
 * returns the error `handleFirestoreError` has always thrown, with the same message, marked so the
 * global handler does not report it a second time when it goes unhandled.
 */
export function reportFirestoreError(message: string, original: unknown, operation: string, path: string | null): Error {
  console.error(`Firestore error [${operation}]${path ? ` ${path}` : ""}: ${message}`);
  captureFirestoreError(original, operation, normaliseFirestorePath(path));
  const thrown = new Error(`Firestore ${operation} failed${path ? ` at ${path}` : ""}: ${message}`);
  markReported(thrown);
  return thrown;
}
