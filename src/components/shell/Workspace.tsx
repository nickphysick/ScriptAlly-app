/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workspace — the coloured ground a list sits on, under its open banner (Contact list v13, ruling
 * Q1; the v126 workspace's construction, lifted): 22px corners, 22/22/26 padding, 60px clear of
 * whatever follows. The colour is the page's — blush on the Query Centre, slate on the Contact list —
 * passed as `tray`, so one component draws both and only the colour tells the pages apart.
 *
 * ⚠️ ONLY THE CONTACT LIST USES IT IN THIS PACK (the Query Centre keeps `.qcv-work`).
 * ⚠️ z-index 1 under the banner's 2: the banner's perched figure stands over this edge.
 */
import React from "react";
import "./workspace.css";

export const Workspace: React.FC<{
  tray: string; probe?: string; className?: string; sectionRef?: React.Ref<HTMLDivElement>; children: React.ReactNode;
}> = ({ tray, probe, className, sectionRef, children }) => (
  <div ref={sectionRef} className={`wsp${className ? ` ${className}` : ""}`} data-wsp={probe ?? "workspace"}
    style={{ "--wsp-tray": tray } as React.CSSProperties}>
    {children}
  </div>
);
