/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FEED TAB'S UNSEEN COUNT (Dashboard v59). Feed entries newer than the last time this account
 * opened the drawer; with no stored time, today's entries (the v58 tab's own "today" count).
 *
 * ⚠️ STORED PER ACCOUNT ON THIS DEVICE (`localStorage["sa.feedSeenAt.<uid>"]`), not on the user
 * document: a new user field would need a rules allowlist change, and this pack adds one rules
 * block and nothing else. Nothing stored this before v59 — `feedEntries`' `seenAt` is passed `null`.
 */
import type { FeedEntry } from "./dashFeed";
import { todayCount } from "./dashFeedDrawer";

export const feedSeenKey = (uid: string): string => `sa.feedSeenAt.${uid}`;

export function readFeedSeen(uid: string): number | null {
  if (!uid) return null;
  try {
    const v = Number(localStorage.getItem(feedSeenKey(uid)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
}

export function writeFeedSeen(uid: string, ms: number): void {
  if (!uid) return;
  try { localStorage.setItem(feedSeenKey(uid), String(Math.round(ms))); } catch { /* private mode */ }
}

/**
 * ⚠️ ONLY WHAT CAME IN COUNTS (Dashboard first visit v1, A5). The writer's own acts — a query logged, an agent
 * added, a close, an import — are entries in the feed, but they are not news to the person who did them, so they
 * never make the tab's badge. Measured before this: a brand-new account opened with a badge of 1, its own
 * "added a manuscript"; S5 read "9+" with nothing new from any agent. `dir` is the feed's own classification.
 */
export function unseenCount(entries: readonly FeedEntry[], seenAt: number | null, now: Date): number {
  const incoming = entries.filter((e) => e.dir === "in");
  return seenAt === null ? todayCount(incoming, now) : incoming.filter((e) => e.at > seenAt).length;
}

/** "9+" above nine; the badge is hidden at 0. */
export const badgeText = (n: number): string => (n > 9 ? "9+" : String(n));
