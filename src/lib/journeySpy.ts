/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2 (AC2-2) — WHICH JOURNEY A DOOR ASKED FOR, for the measurement. Every opening of a query journey (the
 * drawer, the query card's response composer, the query card itself from the agent card) is noted on
 * `window.__saJourneys` in the development and emulator builds only: the MODE literal is replaced at build time, so a
 * production bundle carries none of it (the `__saQueryDrawer` precedent).
 */
export function spyJourney(e: Record<string, unknown>): void {
  if ((import.meta.env.MODE === "emulator" || import.meta.env.MODE === "development") && typeof window !== "undefined") {
    const w = window as unknown as { __saJourneys?: Record<string, unknown>[] };
    (w.__saJourneys ??= []).push(e);
  }
}
