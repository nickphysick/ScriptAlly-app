/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — TODAY'S TASKS, READ FROM THE DESKTOP TO-DO WORKSPACE'S OWN MODEL (`useWsCore`), in its own list order
 * (`phoneOrder`). The bar's badge and Today's rows both read this, so the badge is the rows and the rows are the
 * workspace's own count (`TodoWorkspace`'s `all.length`).
 */
import { useMemo } from "react";
import { useWsCore } from "../../todo/ws/useWsCore";
import { phoneOrder } from "../../../lib/todoPhone";

export function useV3TodayCount(now: number): number {
  const core = useWsCore(now);
  return useMemo(() => phoneOrder(core.all).length, [core.all]);
}
