/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE waitlist, shared by every sign-up on the site.
 *
 * ⚠️ THIS EXISTS BECAUSE THE SIGN-UP IS MOUNTED THREE TIMES AND THEY MUST NOT DISAGREE. The
 * landing hero's panel, the `/founders` hero and the sealed band at the foot of both pages are one
 * component in three places — and `/founders` carries TWO of them on screen at once. With per-
 * instance state a reader would sign up in the hero, scroll to the band, and be asked again by a
 * form that still says "idle"; with per-instance counts the same page could state two different
 * numbers of places claimed. Neither is a styling problem. Both are the page lying.
 *
 * ⚠️ AND THE COUNT IS FETCHED ONCE. Three mounts each running their own `GET` is three
 * unauthenticated reads of a public endpoint per visit, on an endpoint that has no rate limiting
 * yet. `ensureCount` is idempotent for the life of the module, so it is one request per page load
 * however many forms are on screen.
 *
 * A module-scope store rather than a context, deliberately: a provider would have to be mounted
 * by every page that carries a form, and forgetting it is a silent regression to per-instance
 * state — exactly the fault this file exists to prevent. Nothing to wire means nothing to forget.
 */

import { useSyncExternalStore } from "react";
import { joinWaitlist, fetchWaitlistCount, WaitlistCount } from "./waitlist";

/**
 * ⚠️ `full` IS REACHABLE NOW, AND IT ARRIVES FROM THE SERVER RATHER THAN FROM ARITHMETIC.
 * `functions/src/waitlist.ts` writes `status: "waiting"` past the cap and answers `full: true`;
 * `classifyJoin` reads that flag and nothing else. Deciding it here from `count >= cap` would be
 * the client inventing a policy — and two browsers racing past 100 would both read 99 and both be
 * told they were in. The state was declared here for a year before anything could produce it, so
 * the renderers were already exhaustive and the only change was the wiring, as intended.
 */
export type FoundingState = "idle" | "sending" | "sent" | "dupe" | "full" | "error" | "down";

export interface FoundingSnapshot {
  state: FoundingState;
  /** Real figures from the endpoint, or null. Null renders NOTHING, everywhere. */
  count: WaitlistCount | null;
}

let snapshot: FoundingSnapshot = { state: "idle", count: null };
const listeners = new Set<() => void>();
let countRequested = false;

const set = (next: FoundingSnapshot) => {
  snapshot = next;
  for (const l of [...listeners]) l();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

const getSnapshot = () => snapshot;

/** The shared reading. Every mount renders from this and only this. */
export const useFounding = (): FoundingSnapshot =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/** Idempotent: the first mount asks, every later mount rides along. */
export const ensureCount = (): void => {
  if (countRequested) return;
  countRequested = true;
  void fetchWaitlistCount().then((count) => {
    if (count) set({ ...snapshot, count });
  });
};

/**
 * One submission, whichever form it came from.
 *
 * ⚠️ THE COUNT FROM A SUCCESSFUL JOIN REPLACES THE ONE WE HAD, so the reader who has just claimed
 * a place sees a bar that includes them. A failure leaves the previous count alone — a request
 * that did not answer is not evidence that the number changed.
 */
export const submitFounding = async (email: string): Promise<void> => {
  set({ ...snapshot, state: "sending" });
  const outcome = await joinWaitlist(email);
  set({
    state: outcome.state,
    count: "count" in outcome && outcome.count ? outcome.count : snapshot.count,
  });
};

/* ⚠️ NO `__reset` EXPORT. One was written and deleted before it shipped: this repo's tests read
   SOURCE (`environment: 'node'`, no jsdom, no testing-library), so nothing here ever renders a
   state change and nothing would have called it. An exported reset with no caller is a knob that
   does nothing — the same fault the token lock's inverse half exists to catch, in TypeScript
   rather than CSS. If a rendering test arrives, it comes back with a caller. */
