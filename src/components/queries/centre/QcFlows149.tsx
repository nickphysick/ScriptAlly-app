/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 Part D (design-refs/query-centre-v149/, screens 11–14) — THE HEADER'S ACTIONS, IN THE SAME PANEL.
 *
 *   ("+ Log a query" was QcLogFlow149 here; Log a query v1 retired it for the staged journey, QcLogStages.)
 *   QcWhoReplied149  — "Record a response" with no query open: Step 1 of 2, Who replied? The live queries, in two
 *                      groups with their status pills; a pick opens that query's card in respond mode.
 *
 * ⚠️ IT SAVES NOTHING ITSELF: a pick opens that query's card in respond mode.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import type { QueryStatus } from "../../../types";
import { FlowHead, FLOW_WORDS } from "../../shared/FlowHead";
import "../../../marketing/heroCard.css";
import "./qcv149card.css";
import "../../shared/agentRowParts.css";

const SEARCH = <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#2a3a52" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.6" /><path d="M12.8 12.8l4 4" /></svg>;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export interface WhoItem { id: string; initials: string; name: string; agency: string; status: QueryStatus; statusLabel: string; you: boolean }

export const QcWhoReplied149: React.FC<{ items: WhoItem[]; onPick: (id: string) => void; onClose: () => void }> = ({ items, onPick, onClose }) => {
  const [find, setFind] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  const q = norm(find.trim());
  const shown = useMemo(() => items.filter((i) => !q || norm(`${i.name} ${i.agency}`).includes(q)), [items, q]);
  const wait = shown.filter((i) => !i.you);
  const you = shown.filter((i) => i.you);
  const row = (i: WhoItem) => (
    <button key={i.id} type="button" className="qc149f-ag" data-qc149f="who-item" data-id={i.id} data-group={i.you ? "you" : "waiting"} onClick={() => onPick(i.id)}>
      {/* Contact list v25.2 B — a reply waiting on the writer: the navy disc with the rust "!" */}
      <span className={`qc149f-d${i.you ? " cl252-yd" : ""}`} data-cl252={i.you ? "yd" : undefined}>{i.initials}</span><span><b>{i.name}</b><small>{i.agency}</small></span>
      <span className={`qc149f-st${i.you ? " y" : ""}`}><StatusDot status={i.status} overrideSize={13} />{i.statusLabel}</span>
    </button>
  );
  return (
    <div className="qc149f qcv-legacy" data-qc149f="who">
      <div className="mk-lc-in qc149c-in">
        {/* Contact list v25.1 B — the header: "Recording response", no line until an answer is picked (respond mode) */}
        <FlowHead title={FLOW_WORDS.record.title} onClose={onClose} data={{ "data-qc149f": "band" }} closeData={{ "data-qc149f": "close" }} />
        <div className="qc149f-pg2">
          <h4>Step 1 of 2</h4>
          <div className="qc149f-ttl">Who replied?</div>
          <label className="qc149f-srch">{SEARCH}<input ref={ref} value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find the agent" aria-label="Find the agent" /></label>
          <div className="qc149f-ags" data-qc149f="who-list">
            <div className="qc149f-grp" data-qc149f="who-group" data-group="waiting">Waiting to hear back · {wait.length}</div>
            {wait.map(row)}
            <div className="qc149f-grp" data-qc149f="who-group" data-group="you">Already with you · {you.length}</div>
            {you.map(row)}
          </div>
        </div>
        <div className="qc149c-mft">
          <button type="button" className="qc149c-cx" data-qc149f="cancel" onClick={onClose}>Cancel</button>
          <span className="qc149c-sp" />
        </div>
      </div>
    </div>
  );
};
