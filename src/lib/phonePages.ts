/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v2, Part 7 — the small pure rules the phone's menu pages state, kept out of the components so a measurement
 * can read them without loading a page.
 */
import type { Fig } from "./packagesV38";

/** a package card's heading: the first answers it drew, in the ref's words; never a figure the record does not hold */
export function packageHeading(f: Pick<Fig, "sent" | "more" | "replies">): string {
  if (!f.sent) return "Not sent yet";
  if (f.more) return `${f.more} ${f.more === 1 ? "request" : "requests"} from ${f.sent}`;
  return f.replies ? `No requests from ${f.sent}` : "No replies yet";
}

/** Analytics' switch: All time, or the last 90 days — the Analytics glance's own window, (now − 90 days, now] */
export type PhoneRange = "all" | "d90";
export const D90_MS = 90 * 86_400_000;
export const inWindow = (sentMs: number | null, range: PhoneRange, nowMs: number): boolean =>
  range === "all" || (sentMs != null && sentMs > nowMs - D90_MS && sentMs <= nowMs);

/**
 * Queries before the first query (Part 8A, ref FRQ A): three example rows — a request with you, a sent partial and a
 * query out — taken from the app's own sample rows (the desktop exhibition's `QC_SAMPLE_ROWS`), never the writer's.
 */
export const EXAMPLE_STATUSES = ["Full Requested", "Partial Sent", "Queried"] as const;
export function exampleRows<R extends { status: string; agentName?: string }>(sample: readonly R[]): R[] {
  const out: R[] = [];
  for (const s of EXAMPLE_STATUSES) {
    /* three different agents where the sample allows it */
    const r = sample.find((x) => x.status === s && !out.some((o) => o.agentName === x.agentName)) ?? sample.find((x) => x.status === s);
    if (r) out.push(r);
  }
  return out;
}
