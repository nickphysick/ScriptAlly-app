/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueriesRailContext — the Queries page's slot in the SidebarShell rail (manuscript selector ·
 * Filter · Sort), beneath the global nav divider.
 *
 * The live, state-bound filter/sort UI (QueriesRail) lives inside the Queries page — where its
 * filter state and the query data are — and is portalled into THIS slot via its id, so the rail and
 * the desk stay in lock-step without lifting state. This component is just the mount point.
 */
import React from "react";

export const QUERIES_RAIL_SLOT_ID = "queries-rail-slot";

export const QueriesRailContext: React.FC = () => (
  <div id={QUERIES_RAIL_SLOT_ID} style={{ display: "flex", flexDirection: "column", minHeight: 0 }} />
);

/** Appbar-heading slot in the shell top bar — the Queries page portals "Your Query Database" + the
 *  live query count into this, the same way the rail is fed (the count lives in Queries.tsx). */
export const QUERIES_APPBAR_SLOT_ID = "queries-appbar-slot";
