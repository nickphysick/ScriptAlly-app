/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Where a manuscript stands — its status, and "N with you" when it has live queries. ONE function for
 * the sidebar's manuscript selector (`BarSwitcher`) and the dashboard header's eyebrow (Dashboard
 * v60.1), so the two cannot say different things. Moved here from BarSwitcher.tsx so the dashboard
 * does not import a shell component to reach it.
 *
 * ⚠️ THE STATUS IS THE MANUSCRIPT'S OWN `ManuscriptStatus` VALUE, never a phrase of the page's own.
 */
import type { Manuscript, Query } from "../types";
import { isWithYou } from "./qcSummary";
import { isClosedStatus } from "./qcStages";

export function switcherStanding(ms: Pick<Manuscript, "status">, msQueries: readonly Pick<Query, "status">[]): { status: string | null; withYou: number | null } {
  const live = msQueries.filter((q) => !isClosedStatus(q.status));
  return {
    status: ms.status ? String(ms.status) : null,
    withYou: live.length > 0 ? live.filter((q) => isWithYou(q.status)).length : null,
  };
}
