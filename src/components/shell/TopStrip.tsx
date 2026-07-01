/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TopStrip — the appbar above the content well: a page heading on the left (the Queries page portals
 * "Your Query Database" + its live count into the QUERIES_APPBAR_SLOT via id) and the utility cluster
 * (help · notifications · settings · avatar) on the right. Cream (#faf5ee) with a grey hairline base.
 * (The old breadcrumb is retired; breadcrumb/onCrumbClick stay in the prop shape for the caller.)
 */
import React from "react";
import { QUERIES_APPBAR_SLOT_ID } from "./QueriesRailContext";

interface TopStripProps {
  breadcrumb: string[];
  onCrumbClick?: (index: number) => void;
  /** Right-hand utility cluster (help / notifications / settings / avatar). */
  utility?: React.ReactNode;
}

export const TopStrip: React.FC<TopStripProps> = ({ utility }) => (
  <div
    style={{
      flexShrink: 0,
      background: "#faf5ee",
      borderBottom: "1px solid #d6cfc4",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "16px 28px",
    }}
  >
    {/* Appbar heading slot — Queries portals its Playfair heading + live count in here */}
    <div id={QUERIES_APPBAR_SLOT_ID} style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }} />
    {utility && <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>{utility}</div>}
  </div>
);
