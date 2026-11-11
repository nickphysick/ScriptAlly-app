/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — running a query's next step (lib/phoneV3 `nextActs`): each kind opens the app's existing journey. This
 * pack adds no writer and never writes status directly.
 */
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import type { V3ActKind } from "../../../lib/phoneV3";
import { closeV3, openV3 } from "../v3/v3Store";

const door = (req: Parameters<typeof openQueryDrawer>[0]) => { closeV3(); openQueryDrawer(req); };
export function runAct(kind: V3ActKind, queryId: string): void {
  switch (kind) {
    case "sent": door({ mode: "sent", queryId }); return;
    case "nudge": door({ mode: "nudge", queryId }); return;
    case "close": door({ mode: "close", queryId }); return;
    case "offer": door({ mode: "offer", queryId, preset: { step: 1 } } as never); return;
    case "reply": openV3({ type: "reply", queryId }); return;
    default: { const unhandled: never = kind; void unhandled; }
  }
}
