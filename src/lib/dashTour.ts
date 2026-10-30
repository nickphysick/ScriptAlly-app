/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part D — THE FIRST-VISIT TOUR: its words, when it runs, and the "?" menu's door to it.
 *
 *  · `TOUR_STOPS` — three stops: the set-up card (or the resume card), Getting started, the empty feed.
 *  · `tourDecision` — on the FIRST dashboard load of an account: run it (pre-query or resume), or never (the first load
 *    already has queries, as after a finished Smart Import). After that it never runs by itself: finishing or skipping
 *    stores a per-user flag (`todoPrefs.dash.tour`, one dotted leaf).
 *  · the replay door — module scope, like `lib/pageGuide`'s: the dashboard registers "Show me round again" while it is
 *    in the pre-query or resume state, and the "?" menu offers it while one is registered.
 */
import type { UserPaths } from "./userPaths";
import type { DashState } from "./dashFirstVisit";

export interface TourStop { target: string; title: string; text: string }

/** The three stops, in order. `target` is a CSS selector for the element the spotlight opens on. */
export const TOUR_STOPS: readonly TourStop[] = [
  { target: '[data-fv2="start-card"]', title: "Start here", text: "This is your first step. It's based on what you told us when you signed up, and you can change it." },
  { target: '[data-fv2="gs"]', title: "Five things to set up", text: "Do them in any order. Each one ticks itself off once it's done." },
  { target: '[data-fv2="empty-feed"]', title: "Your activity", text: "Every query you log, and every reply from an agent, shows up here." },
];
export const TOUR_SKIP = "Skip";
export const TOUR_NEXT = "Next";
export const TOUR_LAST = "Got it";
export const tourKicker = (i: number): string => `${i + 1} of ${TOUR_STOPS.length}`;
export const SHOW_ME_ROUND = "Show me round again";

export const TOUR_DONE_PATH: UserPaths = { "todoPrefs.dash.tour": "done" };

/** The tour runs only in these states (and the replay is offered only in them). */
export const tourState = (s: DashState): boolean => s === "pre" || s === "resume";

/**
 * What the first loaded dashboard does about the tour: "run" it, "never" (record that it is not to run), or "none"
 * (already decided). `seen` is the stored flag.
 */
export function tourDecision(seen: boolean, s: DashState): "run" | "never" | "none" {
  if (seen) return "none";
  return tourState(s) ? "run" : "never";
}

/* ── the "?" menu's door ── */
type Listener = () => void;
let replay: (() => void) | null = null;
const listeners = new Set<Listener>();
export function registerTourReplay(fn: (() => void) | null): void { replay = fn; for (const l of listeners) l(); }
export const tourReplay = (): (() => void) | null => replay;
export function subscribeTourReplay(l: Listener): () => void { listeners.add(l); return () => { listeners.delete(l); }; }
