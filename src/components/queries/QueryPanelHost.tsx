/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryPanelHost — the open query's side panel (Query panel v1): the shared `SidePanel` container, with what
 * is the QUERY's about it — Escape, focus, and its turn at the window's right edge.
 *
 * ⚠️ ESCAPE IS A LAYER ON THE APP'S ONE STACK (`lib/escapeStack`), below the action drawer's. While a step is
 *    open the step owns the key (its own layer is higher) and this one is not registered at all, so Escape
 *    steps back first and closes second.
 * ⚠️ FOCUS: to the heading on open, back to the row on close. A swap (another row, ↑ ↓) moves neither.
 */
import React, { useEffect, useRef } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import { claimRightPanel, releaseRightPanel, subscribeRightPanel } from "../../lib/queryPanelStore";
import { SidePanel } from "../shell/SidePanel";
import { askDrawerToLeave, currentDrawerRequest } from "../../lib/queryActions/drawerStore";
import "./queryPanelHost.css";

export const QueryPanelHost: React.FC<{
  id: string;
  /** which page opened it: "queries" (the list, `?q`), or another page through the store */
  from: string;
  step: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ id, from, step, onClose, children }) => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const idRef = useRef(id);
  idRef.current = id;

  useEscapeLayer(!step, () => closeRef.current(), ESC_LEVEL.pageDrawer);

  /* one right-hand panel at a time: opening this closes the feed and Birds-eye drawers, and theirs close this */
  useEffect(() => {
    claimRightPanel("query");
    const off = subscribeRightPanel((o) => { if (o && o !== "query") closeRef.current(); });
    return () => { off(); releaseRightPanel("query"); };
  }, []);

  /* a step belongs to the query it was opened on: choosing another row, or closing the panel, asks it to leave
     (parked with answers, cancelled without — decision 8) */
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    if (currentDrawerRequest()?.panel) askDrawerToLeave();
    return undefined;
  }, [id]);
  useEffect(() => () => { if (currentDrawerRequest()?.panel) askDrawerToLeave(); }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const h = document.querySelector<HTMLElement>("[data-qp='panel'] .qcv-open-nm");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }, 0);
    return () => {
      window.clearTimeout(t);
      const row = document.getElementById(`query-row-${idRef.current}`);
      if (row && row.getBoundingClientRect().height > 0) row.focus({ preventScroll: true });
    };
  }, []);

  return (
    <SidePanel label="Query" step={step} className="qsp" attrs={{ "data-qp": "panel", "data-qp-id": id, "data-qp-from": from }}>
      {children}
    </SidePanel>
  );
};
