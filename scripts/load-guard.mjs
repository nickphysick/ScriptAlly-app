/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LOAD GUARD for the Log a query and Record a response measure specs (24 Nov 2026, reports/laq-specs-door-v1).
 *
 * On a busy Mac these specs go red for timing alone: on 24 Nov three reds (V21-4 stuck on the splash, V21-3's Next up
 * "absent", V22-0's card caught mid-animation) all came at a 1-minute load average of 8–11 and all passed on a rerun at
 * 2–5. So before such a run the runner (scripts/emu-e2e-inner.mjs) prints the load and, if the 1-minute figure is above
 * LIMIT, waits for it to drop, for up to five minutes. If it never drops, the run goes ahead and says so.
 *
 * ⚠️ This waits; it never retries and never raises a timeout. A red at load above LIMIT is reported as UNPROVEN until it
 *    is rerun below it (docs/decisions/testing-measurement.md).
 */
import { loadavg } from "node:os";

export const LOAD_LIMIT = 6;
export const LOAD_WAIT_MS = 5 * 60_000;
export const LOAD_POLL_MS = 10_000;

/** The specs the guard covers, by file name: Log a query (laq*) and Record a response (recordResponse*, recordCleanup). */
export const LOAD_SENSITIVE = /(^|\/)(laq[^/]*|recordResponse[^/]*|recordCleanup)\.measure\.ts$/;

/**
 * Whether a Playwright argument list will run any covered spec. An argument list naming no spec file runs the whole
 * suite, which includes them. Flags and their values (`--project=measure`, `-g "V21-4"`) are not spec files.
 */
export function coversLoadSensitive(args) {
  const files = args.filter((a) => /\.(measure|spec|setup)\.ts$/.test(a) || /^tests\//.test(a));
  if (!files.length) return true;
  return files.some((f) => LOAD_SENSITIVE.test(f) || /^tests\/e2e\/?$/.test(f));
}

export const oneMinuteLoad = () => loadavg()[0];
const fmt = (n) => n.toFixed(2);

/**
 * Prints the 1-minute load and, while it is above `limit`, waits (polling) for up to `waitMs`.
 * Returns { start, final, waitedMs, calm }. `calm` is false when the wait ran out with the load still above the limit.
 * `read`, `sleep`, `now` and `log` are injectable for the unit test.
 */
export async function waitForCalmLoad({
  limit = LOAD_LIMIT, waitMs = LOAD_WAIT_MS, pollMs = LOAD_POLL_MS,
  read = oneMinuteLoad, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = () => Date.now(), log = console.log,
} = {}) {
  const t0 = now();
  const start = read();
  log(`[load-guard] 1-minute load ${fmt(start)} at the start of the run (limit ${limit})`);
  let cur = start;
  while (cur > limit && now() - t0 < waitMs) {
    log(`[load-guard] above ${limit}: waiting (${Math.round((now() - t0) / 1000)}s of ${Math.round(waitMs / 1000)}s)`);
    await sleep(pollMs);
    cur = read();
  }
  const waitedMs = now() - t0;
  const calm = cur <= limit;
  if (calm && waitedMs > 0 && start > limit) log(`[load-guard] load ${fmt(cur)} after ${Math.round(waitedMs / 1000)}s — running`);
  if (!calm) log(`[load-guard] ⚠️ load still ${fmt(cur)} after ${Math.round(waitedMs / 1000)}s — running anyway; a red in this run is UNPROVEN until rerun below ${limit}`);
  return { start, final: cur, waitedMs, calm };
}
