/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — THE ONE READ every v3 screen makes (lib/phoneV3.ts over the app's own engines). The bar's badge,
 * Today's tasks and hero, the Queries chips and groups, the query sheet and search rows all come from here.
 *
 * ⚠️ THE TASKS ARE THE DESKTOP TO-DO WORKSPACE'S OWN (`useWsCore`), in its own list order (`phoneOrder`), so the badge
 *    is Today's rows and Today's rows are the workspace's count (`TodoWorkspace`'s `all.length`).
 */
import { useMemo } from "react";
import { useWsCore } from "../../todo/ws/useWsCore";
import { phoneOrder } from "../../../lib/todoPhone";
import { buildQcRows } from "../../../lib/qcSummary";
import { quietWeeksOf } from "../../../lib/queryState";
import { todayGroups, v3Counts, v3Queries } from "../../../lib/phoneV3";

export function useV3(now: number) {
  const core = useWsCore(now);
  const { queries, agents, activities, currentUser } = core.db;
  const ordered = useMemo(() => phoneOrder(core.all), [core.all]);
  const quietWeeks = quietWeeksOf(currentUser);
  const rows = useMemo(() => buildQcRows(queries, agents, activities, now), [queries, agents, activities, now]);
  const qs = useMemo(() => v3Queries({ rows, agents, tasks: ordered, quietWeeks, nowMs: now }), [rows, agents, ordered, quietWeeks, now]);
  const counts = useMemo(() => v3Counts(qs), [qs]);
  const groups = useMemo(() => todayGroups(ordered), [ordered]);
  const byId = useMemo(() => new Map(qs.map((q) => [q.id, q])), [qs]);
  return { core, ordered, qs, counts, groups, byId, quietWeeks };
}

/** the bar's badge: Today's task rows (the same `ordered` Today draws) */
export function useV3TodayCount(now: number): number {
  const core = useWsCore(now);
  return useMemo(() => phoneOrder(core.all).length, [core.all]);
}
