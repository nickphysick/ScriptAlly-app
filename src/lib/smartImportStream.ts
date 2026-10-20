/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import's call, streamed: the same request and the same final result as the plain callable,
 * with the server's row count arriving on the way (functions/src/smartImportCore.ts streamHooks).
 * Firebase-free, so it can be tested with a fake callable.
 */

/** What the loader is told while a file is read. */
export type ImportUpdate =
  | { type: "rows"; rows: number }   // the server has read this many rows
  | { type: "retry" }                 // the server is having a second, stricter go; counts restart
  | { type: "quiet" }                 // no row count has arrived yet — fall back to the clock
  | { type: "plain" };                // the stream could not be opened; the plain call is in use

/** The slice of an httpsCallable this needs. `stream` honours only a signal, never a timeout. */
export interface StreamableCallable<Req, Res> {
  (data: Req): Promise<{ data: Res }>;
  stream(data: Req, options?: { signal?: AbortSignal }): Promise<{ stream: AsyncIterable<unknown>; data: Promise<Res> }>;
}

/** How long with no row count before the loader stops waiting for one and runs on the clock.
 *  Time to the model's first output is ~1 s (measured, 0.6–4.9 s); a server deployed before this
 *  pack streams nothing at all, which is what this guards. */
export const QUIET_AFTER_MS = 8000;

/**
 * True for the one error that proves nothing reached a server that could answer: the SDK's own
 * "the fetch failed" error, `FunctionsError("internal", "internal")` with no details. Every error our
 * function sends carries its own message ("Couldn't read the file right now.", the entitlement
 * reasons, "The mapping came back malformed. Try again."), so none of them can match.
 */
export function isTransportFailure(e: unknown): boolean {
  const err = e as { code?: unknown; message?: unknown; details?: unknown } | null;
  return !!err && err.code === "functions/internal" && err.message === "internal" && err.details === undefined;
}

/**
 * Call the function streamed, passing row counts to `onUpdate`, and resolve with its final result.
 *
 * TIMEOUT: `stream()` ignores the callable's `timeout` option (firebase 12.14 passes only a signal to
 * fetch), so the same limit is kept by aborting at `timeoutMs`.
 *
 * FALLBACK, and why it cannot charge the writer twice: the plain call is made ONLY when the stream
 * failed with a transport error AND no chunk had arrived. The import is charged on the server only
 * after a whole reply has been read and parsed — seconds to minutes after the first chunk would
 * have been sent — so "no chunk yet" means the first request had not been charged. If it did reach
 * the server and finishes anyway, the charge is a field set to the same value either way (the free
 * import used, or this month's Pro import), so two runs still record one import. What it CAN cost is
 * a second model call, on our bill rather than the writer's.
 */
export async function callWithProgress<Req, Res>(
  fn: StreamableCallable<Req, Res>,
  data: Req,
  onUpdate: (u: ImportUpdate) => void,
  timeoutMs: number,
  quietAfterMs = QUIET_AFTER_MS,
): Promise<Res> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  let chunks = 0;
  const quiet = setTimeout(() => { if (chunks === 0) onUpdate({ type: "quiet" }); }, quietAfterMs);
  try {
    const call = await fn.stream(data, { signal: ac.signal });
    void (async () => {
      try {
        for await (const c of call.stream) {
          chunks++;
          const m = c as { rows?: unknown; retry?: unknown };
          if (m && m.retry === true) onUpdate({ type: "retry" });
          else if (m && typeof m.rows === "number") onUpdate({ type: "rows", rows: m.rows });
        }
      } catch { /* the result promise carries the same error */ }
    })();
    return await call.data;
  } catch (e) {
    if (chunks === 0 && isTransportFailure(e) && !ac.signal.aborted) {
      onUpdate({ type: "plain" });
      return (await fn(data)).data;
    }
    throw e;
  } finally {
    clearTimeout(timer);
    clearTimeout(quiet);
  }
}
