/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — THE SHELL'S TWO PIECES: the slim navy header and the docked tab bar (ref `.hd`, `#tabs`).
 * Below 768px only: AppShell mounts these in place of PhoneBand and BottomTabBar when `useIsMobile()` says so, and at
 * 768px and up it renders exactly what it did before.
 *
 * ⚠️ WHAT LEFT THE HEADER (baked decision 3): the manuscript chip, the user disc, the feedback icon and the stat-tile
 *    band. A root carries its title, at most one page icon (`extra`) and search; a pushed page carries the back arrow,
 *    its title and, under the header, the page's own key figure (`slot`) where it set one.
 */
import React from "react";
import "./phoneV3.css";

/* Phone app v4: the slim header and the docked bar retired to phone/v4/V4Chrome.tsx; the page icon stays */
export const V3HeaderIcon: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; pa3?: string; pressed?: boolean }> = ({ label, onClick, children, pa3, pressed }) => (
  <button type="button" className="pa3-ib" aria-label={label} data-pa3={pa3} aria-pressed={pressed} onClick={onClick}>{children}</button>
);

