/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 Part A (design-refs/contact-list-v26-2/) — THE PANEL IS THE CARD. No backdrop, no padding and no
 * panel background: the landing page's framed card sits straight over the page, 14 from the window's top and bottom
 * and 16 from its right, 580 wide (540 at a window of 1280 or less), leaning −1.2°. No scrim; the list stays live.
 *
 * ⚠️ "THE WINDOW" IS THE APP'S SHEET (`.ws-window`), NOT THE BROWSER'S: the mock's card sits 14 inside the sheet, below
 *    the shell's bar. Its box is measured (as the query panel measures the bar) and written as the host's top, bottom
 *    and right; the width is the stated one.
 *
 *   arrival   the host slides in from the right (420ms) while the card swings into its lean (700ms) — once, at the
 *             open; paging ‹ › swaps the content and replays nothing, because this host stays mounted
 *   editing   the card straightens to 0° (350ms) while any section is being edited, and leans back after
 *   close     ✕ and Esc ask the card first (`closeRequest`: Part D's discard guard), then the host slides out the way it
 *             came and only then tells the page
 *   reduced   no slide and no swing: it appears leaning and straightens without animating
 *
 * ⚠️ ESCAPE IS A LAYER ON THE APP'S ONE STACK at the query panel's level (`pageDrawer`); the card's own editing layer
 *    sits above it, so Esc reaches the guard before it reaches the host.
 * ⚠️ ONE RIGHT-HAND PANEL AT A TIME: opening this closes the feed, Birds-eye and query panels, and theirs close this.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { claimRightPanel, releaseRightPanel, subscribeRightPanel } from "../../../lib/queryPanelStore";
import { prefersReducedMotion } from "../../../lib/agentMotion";
import "./contactV262.css";

/** the card's say before the host closes: true lets the close go ahead (no unsaved change, or a confirmed discard) */
export type CloseGuard = () => boolean;

export const AgentCardPanel262: React.FC<{
  agentId: string;
  onClose: () => void;
  /** Part D — the card answers whether the close may go ahead; absent, it always may */
  guardRef?: React.MutableRefObject<CloseGuard | null>;
  /** the card is being edited: it straightens */
  editing?: boolean;
  children: React.ReactNode;
}> = ({ agentId, onClose, guardRef, editing = false, children }) => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const reduce = useRef(prefersReducedMotion()).current;
  const [arriving, setArriving] = useState(!reduce);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!arriving) return undefined;
    const t = window.setTimeout(() => setArriving(false), 720);
    return () => window.clearTimeout(t);
  }, [arriving]);
  /** slide out the way it came, then close; nothing is asked here (the guard is the card's) */
  const leave = useCallback(() => {
    if (reduce) { closeRef.current(); return; }
    setLeaving(true);
    window.setTimeout(() => closeRef.current(), 300);
  }, [reduce]);
  const requestClose = useCallback(() => {
    if (leaving) return;
    const g = guardRef?.current;
    if (g && !g()) return;
    leave();
  }, [guardRef, leave, leaving]);
  useEscapeLayer(true, requestClose, ESC_LEVEL.pageDrawer);
  /* the page's close (another panel claiming the right, the route leaving) is not asked again */
  useEffect(() => {
    claimRightPanel("agent");
    const off = subscribeRightPanel((o) => { if (o && o !== "agent") closeRef.current(); });
    document.body.classList.add("spanel-open");
    return () => { off(); releaseRightPanel("agent"); document.body.classList.remove("spanel-open"); };
  }, []);
  /* the sheet's box: the host sits 14 inside its top and bottom and 16 inside its right */
  const [box, setBox] = useState<{ top: number; bottom: number; right: number } | null>(null);
  useLayoutEffect(() => {
    const read = () => {
      const w = [...document.querySelectorAll<HTMLElement>(".ws-window")].find((e) => e.getBoundingClientRect().height > 0);
      const r = w?.getBoundingClientRect();
      if (!r || r.height <= 0) { setBox(null); return; }
      setBox({ top: r.top + 14, bottom: window.innerHeight - r.bottom + 14, right: window.innerWidth - r.right + 16 });
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  /* the card's ✕ asks through the same request */
  useEffect(() => {
    const on = () => requestClose();
    window.addEventListener("sa:cl262-close", on);
    return () => window.removeEventListener("sa:cl262-close", on);
  }, [requestClose]);
  return createPortal(
    <div className="cl262-panel" data-cl262="panel" data-cl24="panel" data-agent-id={agentId} role="dialog" aria-modal="false" aria-label="Agent"
      data-arrive={arriving ? "" : undefined} data-leave={leaving ? "" : undefined} data-reduce={reduce ? "" : undefined}
      style={box ? { top: box.top, bottom: box.bottom, right: box.right } : undefined}>
      <div className="cl262-lean" data-cl262="lean" data-cl24="agent-card" data-editing={editing ? "" : undefined}>
        {children}
      </div>
    </div>,
    document.body,
  );
};

/** the card's ✕: asks the host, which asks the guard */
export const requestCardClose = () => window.dispatchEvent(new Event("sa:cl262-close"));
