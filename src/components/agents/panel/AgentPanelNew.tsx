/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3 §D — "+ ADD AN AGENT" IN THE AGENT PANEL: the panel's act view in a new-agent state. The ink head
 * (eyebrow "NEW AGENT", title "Add an agent", the quill, ✕, one line under it) and the act slot the card host portals the
 * editor into (since Contact list v25.2 the card's edit mode, `AgentEditMode` `mode="new"`). What it saves, and how, is the card's own: the
 * host's `onCreateAgent`, the same `addAgent` path the centred add card used.
 *
 * ⚠️ THE PANEL HOLDS NO AGENT: it is the same SidePanel and the same act-view classes as Edit profile, with no Profile,
 *    tabs or footer behind it. Escape and Cancel are the editor's own (it asks before discarding a draft).
 */
import React, { useLayoutEffect, useState } from "react";
import { SidePanel } from "../../shell/SidePanel";
import { FlowHead, FLOW_WORDS } from "../../shared/FlowHead";
import "../../queries/queryPanelHost.css";
import "./agentPanel.css";

/* v25.1 B — ADD_AGENT_LINE retired with the ink head (FLOW_WORDS.agent carries the line) */

/** ✕ is the editor's Escape, as Edit profile's is: a draft with answers asks before it goes */
const escape = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

/**
 * Mounted ONCE, by the app-level `AgentCardHost`, so "Add an agent" opens it over whichever page is on screen.
 * `over`: opened from Log a query's picker, it lies OVER the query drawer (agentPanel.css `.apn--over`).
 */
/**
 * Contact list v25.2 C3 — the SAME panel holds an existing agent's edit mode on every page but the Contact list (whose
 * own card turns into the editor): `edit` — no flow header (the edit mode draws its navy "EDITING {FIRST}" band).
 */
export const AgentPanelNew: React.FC<{ over?: boolean; edit?: boolean }> = ({ over = false, edit = false }) => {
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
    <SidePanel label={edit ? "Edit agent" : "Add an agent"} step={false} dim className={`qsp apn${over ? " apn--over" : ""}${edit ? " apn--edit" : ""}`}
      style={(top != null ? { "--qsp-top": `${top}px` } : {}) as React.CSSProperties}
      attrs={{ "data-ap": edit ? "panel-edit" : "panel-new", "data-ap-acting": edit ? "edit" : "new", "data-ap-over": over ? "drawer" : undefined }}>
      <div className="qad-root qad-root--panel is-open apn-actroot" data-ap="act" data-ap-act={edit ? "edit" : "new"}>
        <div className="qad-drawer qad-drawer--panel" role="group" aria-label={edit ? "Edit agent" : "Add an agent"}>
          {/* Contact list v25.1 B — the head is the flow header: "Adding new agent" and its line (the ink head, its
              eyebrow, quill and line are retired); ✕ is still the editor's Escape */}
          {edit ? null : <FlowHead title={FLOW_WORDS.agent.title} line={FLOW_WORDS.agent.line} onClose={escape} data={{ "data-ap": "new-head" }} />}
          <div className="apn-actslot" data-ap-act-slot="" />
        </div>
      </div>
    </SidePanel>
  );
};
