/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Per-view defaults for the Query Centre's Sort and Group controls (the well round, §3).
 *
 * ⚠️ EACH VIEW STATES ONLY THE CONTROLS IT HAS AN OPINION ABOUT, and an absent key is not `none`.
 * The board is grouped by status by construction and says nothing about sort; the calendar is a
 * date surface and says nothing about grouping. Modelling those as `"none"` would make switching
 * to the board silently clear a grouping the writer had chosen for the grid — a default asserting
 * something the view never claimed.
 *
 * ⚠️ AND A DEFAULT ONLY APPLIES WHILE THE WRITER HAS NOT TOUCHED THAT CONTROL. Once they have
 * chosen a sort, it is theirs for the session and every later view switch leaves it alone. The
 * alternative — re-applying on every switch — silently discards a choice the pill is still
 * showing, which is the worst of both: the control lies about what the list is ordered by.
 */
import type { GroupKey } from "./queryCentreGrid";

export type QueryViewName = "grid" | "list" | "board" | "calendar";

/** Which controls the writer has changed by hand this session. Sticky once true. */
export interface TouchedControls {
  sort: boolean;
  group: boolean;
}

export interface ViewDefault {
  sort?: string;
  group?: GroupKey;
}

export const VIEW_DEFAULTS: Record<QueryViewName, ViewDefault> = {
  grid: { sort: "last_activity", group: "none" },
  list: { sort: "date_newest", group: "none" },
  /* the board IS grouped by status — the control is disabled and states that value */
  board: { group: "status" },
  /* a date surface: it orders by when things were sent and holds no view on grouping */
  calendar: { sort: "date_newest" },
};

/**
 * What to apply when the view becomes `view`. Returns only the keys that should actually change:
 * a control the writer has touched is absent, and so is one this view holds no opinion about.
 */
export function defaultsOnViewChange(view: QueryViewName, touched: TouchedControls): ViewDefault {
  const d = VIEW_DEFAULTS[view];
  const out: ViewDefault = {};
  if (!touched.sort && d.sort !== undefined) out.sort = d.sort;
  if (!touched.group && d.group !== undefined) out.group = d.group;
  return out;
}
