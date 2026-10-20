/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3 §D — "+ ADD AN AGENT" IN THE AGENT PANEL: the panel's act view in a new-agent state. The ink head
 * (eyebrow "NEW AGENT", title "Add an agent", the quill, ✕, one line under it) and the act slot the card host portals the
 * editor into (`AgentCardEditor`, `mode="new"`, `variant="panel"`). What it saves, and how, is the card's own: the
 * host's `onCreateAgent`, the same `addAgent` path the centred add card used.
 *
 * ⚠️ THE PANEL HOLDS NO AGENT: it is the same SidePanel and the same act-view classes as Edit profile, with no Profile,
 *    tabs or footer behind it. Escape and Cancel are the editor's own (it asks before discarding a draft).
 */
import React, { useLayoutEffect, useState } from "react";
import { SidePanel } from "../../shell/SidePanel";
import { QadHead } from "../../queryActions/QadHead";
import "../../queries/queryPanelHost.css";
import "./agentPanel.css";

export const ADD_AGENT_LINE = "Name and agency are enough to start. Everything else can wait for Housekeeping.";

/** ✕ is the editor's Escape, as Edit profile's is: a draft with answers asks before it goes */
const escape = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

/**
 * Mounted ONCE, by the app-level `AgentCardHost`, so "Add an agent" opens it over whichever page is on screen.
 * `over`: opened from Log a query's picker, it lies OVER the query drawer (agentPanel.css `.apn--over`).
 */
export const AgentPanelNew: React.FC<{ over?: boolean }> = ({ over = false }) => {
  /* the panel starts under the shell's bar: its bottom edge, measured, as the agent panel does */
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
  return (
    <SidePanel label="Add an agent" step={false} dim className={`qsp apn${over ? " apn--over" : ""}`}
      style={(top != null ? { "--qsp-top": `${top}px` } : {}) as React.CSSProperties}
      attrs={{ "data-ap": "panel-new", "data-ap-acting": "new", "data-ap-over": over ? "drawer" : undefined }}>
      <div className="qad-root qad-root--panel is-open apn-actroot" data-ap="act" data-ap-act="new">
        <div className="qad-drawer qad-drawer--panel" role="group" aria-label="Add an agent">
          <QadHead onFrom={escape} eyebrow="NEW AGENT" title="Add an agent" onClose={escape}
            who={<p className="apn-newline" data-ap="new-line">{ADD_AGENT_LINE}</p>} />
          <div className="apn-actslot" data-ap-act-slot="" />
        </div>
      </div>
    </SidePanel>
  );
};
