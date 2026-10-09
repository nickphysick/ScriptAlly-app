/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — a dev-only review aid. It fabricates nothing.
 *
 * `window.__SA_DASH_DROP = ["req", "nudge"]` leaves those groups OUT of the list, above the plan, so
 * the housekeeping, ready-to-query and coming-up states can be seen on an account that has work to
 * do. `window.__SA_DASH_NO_CLOSED = true` hands the closed card no queries. `__SA_DASH_HOLD_MS`
 * holds the loading state. Every item drawn is still the account's own, derived for real.
 *
 * ⚠️ THE CALLER CARRIES THE MODE GATE (`import.meta.env.MODE !== "production"`), so a production
 * build never reaches these readers.
 */
import { useEffect, useState } from "react";
import { LIST_ORDER, type ListGroupKey } from "./dashList";

type Flags = { __SA_DASH_DROP?: unknown; __SA_DASH_NO_CLOSED?: unknown; __SA_DASH_HOLD_MS?: unknown };
const flags = (): Flags => (typeof window === "undefined" ? {} : (window as unknown as Flags));

export interface DashAid { drop: ListGroupKey[]; noClosed: boolean }

export function dashAid(): DashAid {
  const f = flags();
  const drop = Array.isArray(f.__SA_DASH_DROP)
    ? (f.__SA_DASH_DROP as unknown[]).filter((k): k is ListGroupKey => LIST_ORDER.includes(k as ListGroupKey))
    : [];
  return { drop, noClosed: f.__SA_DASH_NO_CLOSED === true };
}

const holdMs = (): number => {
  const v = flags().__SA_DASH_HOLD_MS;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
};

/** True while the dev hold is running. The caller's MODE gate keeps it out of production. */
export function useDashHold(): boolean {
  const [held, setHeld] = useState<boolean>(() => holdMs() > 0);
  useEffect(() => {
    const ms = holdMs();
    if (!ms) return undefined;
    const t = window.setTimeout(() => setHeld(false), ms);
    return () => window.clearTimeout(t);
  }, []);
  return held;
}
