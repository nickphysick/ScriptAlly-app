/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — running a query's next step (lib/phoneV3 `nextActs`): each kind opens the app's existing journey. This
 * pack adds no writer and never writes status directly.
 */
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import type { V3ActKind } from "../../../lib/phoneV3";
import { openV3 } from "../v3/v3Store";

/* the query page stays open under the app's journey (its phone flow sits above the layer), so a save lands in its thread */
const door = (req: Parameters<typeof openQueryDrawer>[0]) => { openQueryDrawer(req); };

/** what the query looked like when a step was started from it: the page reads "just logged" once it changes */
let pending: { id: string; sig: string } | null = null;
export const querySig = (status: string, lastMs: number, msgs: number): string => `${status}|${lastMs}|${msgs}`;
export function markPending(id: string, sig: string): void { pending = { id, sig }; }
export const isFresh = (id: string, sig: string): boolean => !!pending && pending.id === id && pending.sig !== sig;
export function clearPending(id?: string): void { if (!id || pending?.id === id) pending = null; }

export function runAct(kind: V3ActKind, queryId: string, sig?: string): void {
  if (sig) markPending(queryId, sig);
  switch (kind) {
    case "sent": door({ mode: "sent", queryId }); return;
    case "nudge": door({ mode: "nudge", queryId }); return;
    case "close": door({ mode: "close", queryId }); return;
    case "offer": door({ mode: "offer", queryId, preset: { step: 1 } } as never); return;
    case "reply": openV3({ type: "reply", queryId }); return;
    default: { const unhandled: never = kind; void unhandled; }
  }
}
