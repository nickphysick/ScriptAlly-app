/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TopStrip — the 48px white strip above the content well: a page-name breadcrumb on the left and a
 * utility cluster (help · notifications · settings · avatar) on the right. White (#fff), same as the
 * sidebar, so the chrome reads as one continuous frame wrapping the cream well.
 */
import React from "react";
import { Breadcrumb } from "./Breadcrumb";
import { chromeWhite, navBorder } from "./shellTokens";

interface TopStripProps {
  breadcrumb: string[];
  onCrumbClick?: (index: number) => void;
  /** Right-hand utility cluster (help / notifications / settings / avatar). */
  utility?: React.ReactNode;
}

export const TopStrip: React.FC<TopStripProps> = ({ breadcrumb, onCrumbClick, utility }) => (
  <div
    style={{
      height: 48,
      flexShrink: 0,
      background: chromeWhite,
      borderBottom: `0.5px solid ${navBorder}`,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "0 22px",
    }}
  >
    <Breadcrumb steps={breadcrumb} onStepClick={onCrumbClick} />
    {utility && <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>{utility}</div>}
  </div>
);
