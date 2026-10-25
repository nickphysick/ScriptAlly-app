/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v24 Part C — the agent card's host: the Query Centre's panel. The shared `SidePanel` in the query
 * panel's own dress (`qsp`), at the same position and size, with the same slide-in, over the list with no scrim. Its
 * top is the shell bar's bottom, measured as QueryPanelHost measures it.
 *
 * ⚠️ ESCAPE IS A LAYER ON THE APP'S ONE STACK at the query panel's level (`pageDrawer`), above the full-screen mode's,
 *    so Escape closes the card before it leaves full screen, and after any menu open over it.
 * ⚠️ ONE RIGHT-HAND PANEL AT A TIME: opening this closes the feed, Birds-eye and query panels, and theirs close this.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SidePanel } from "../../shell/SidePanel";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { claimRightPanel, releaseRightPanel, subscribeRightPanel } from "../../../lib/queryPanelStore";
import "../../queries/queryPanelHost.css";

export const AgentCardPanel24: React.FC<{ agentId: string; onClose: () => void; children: React.ReactNode }> = ({ agentId, onClose, children }) => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEscapeLayer(true, () => closeRef.current(), ESC_LEVEL.pageDrawer);
  useEffect(() => {
    claimRightPanel("agent");
    const off = subscribeRightPanel((o) => { if (o && o !== "agent") closeRef.current(); });
    return () => { off(); releaseRightPanel("agent"); };
  }, []);
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const read = () => {
      const bar = [...document.querySelectorAll<HTMLElement>(".ws-pagebar")].find((b) => b.getBoundingClientRect().height > 0);
      const b = bar?.getBoundingClientRect().bottom ?? 0;
      if (b > 0) setTop(Math.round(b * 10) / 10);
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  /* focus the name on open; a swap to another agent moves nothing */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const h = document.querySelector<HTMLElement>("[data-cl24='panel'] [data-cl24='card-name']");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <SidePanel label="Agent" className="qsp cl24-panel" style={top != null ? ({ "--qsp-top": `${top}px` } as React.CSSProperties) : undefined}
      attrs={{ "data-cl24": "panel", "data-agent-id": agentId }}>
      {children}
    </SidePanel>
  );
};
