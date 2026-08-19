/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The panel-band icons — 19px line drawings, one per panel.
 *
 * ⚠️ THEY ARE `aria-hidden`, EVERY ONE. Each sits immediately left of the panel's own title, so a
 * screen reader announcing "chart, Sending and hearing back" reads the heading twice.
 *
 * ⚠️ AND THEY ARE NOT `StatusDot`. Nothing here draws a query status; these name the PANEL. Any
 * glyph standing for a status on this page goes through `StatusDot`, which is locked and app-wide.
 */
import React from "react";

export type PanelIconName = "journey" | "chart" | "donut" | "clock" | "hourglass" | "calendar" | "pages" | "mail";

const PATHS: Record<PanelIconName, React.ReactNode> = {
  journey: (<><path d="M3 12 L21 4 L13 15 L10 12 Z" /><path d="M10 12 L11 19 L13 15" /></>),
  chart: (<><path d="M4 19 V5" /><path d="M4 19 H20" /><path d="M7 14 L11 9 L14 12 L19 6" /></>),
  donut: (<><circle cx="12" cy="12" r="8" /><path d="M12 4 a8 8 0 0 1 8 8" /><circle cx="12" cy="12" r="3" /></>),
  clock: (<><circle cx="12" cy="12" r="8.2" /><path d="M12 7 v5.4 l3.4 2" /></>),
  hourglass: (<><path d="M6 3.5 h12" /><path d="M6 20.5 h12" /><path d="M7.5 3.5 c0 5 9 5 9 0" /><path d="M7.5 20.5 c0 -5 9 -5 9 0" /></>),
  calendar: (<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10 h16 M8 3 v4 M16 3 v4" /></>),
  pages: (<><path d="M5 4 h11 l3 3 v13 h-14 Z" /><path d="M9 12 h6 M9 15.5 h6" /></>),
  mail: (<><path d="M4 6 h16 v12 h-16 Z" /><path d="M4 7 l8 6 l8 -6" /></>),
};

export const PanelIcon: React.FC<{ name: PanelIconName }> = ({ name }) => (
  <svg className="an-hi" viewBox="0 0 24 24" fill="none" stroke="#5a6e58" strokeWidth={1.6} aria-hidden="true">
    {PATHS[name]}
  </svg>
);
