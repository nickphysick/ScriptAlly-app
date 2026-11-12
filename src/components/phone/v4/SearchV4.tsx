/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — SEARCH (design-refs/phone-app-v4/phone-app-v4-pages.html, "Searching"): v3's search in the board's
 * layout. Results as you type: "Your queries" (the inbox row), then "Not queried yet" with a "Log query" pill that opens
 * the quick log on that agent. v3's page list stays, so nothing it reached becomes unreachable (PA4-8).
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { closeV3, openV3, openV3Agent, openV3Query } from "../v3/v3Store";
import { QRowV4 } from "./QueriesV4";
import { Chev, I4, Seal } from "./V4Parts";
import { QueryStatus } from "../../../types";
import "./phoneV4.css";

/** every page the phone can reach, by name (v3's list, unchanged) */
export const SEARCH_PAGES: [string, string][] = [
  ["Responses", "/queries/responses"], ["Analytics", "/queries/analytics"], ["Packages", "/queries/packages"],
  ["Query letters", "/manuscripts#materials"], ["Synopses and comps", "/manuscripts#comps"], ["Wall of no", "/queries/responses#wall"],
  ["Corkboard", "/todo/corkboard"], ["Your book", "/manuscripts"], ["Streaks and goals", "/goals"], ["Discover", "/agents/discover"],
  ["Help centre", "/help"], ["Settings", "/account"], ["Import queries", "/import"],
];
const wk = (w: number) => `${w} ${w === 1 ? "week" : "weeks"}`;

export const SearchV4: React.FC = () => {
  const v = useV3Data();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const t = term.trim().toLowerCase();
  const go = (path: string) => { closeV3(); navigate(path); };
  const queried = useMemo(() => new Set(v.core.db.queries.filter((q) => q.status !== QueryStatus.WITHDRAWN).map((q) => q.agentId)), [v.core.db.queries]);
  const mine = t ? v.qs.filter((q) => `${q.row.agentName} ${q.row.agency ?? ""}`.toLowerCase().includes(t)).slice(0, 30) : [];
  const fresh = t ? v.core.db.agents.filter((a) => !queried.has(a.id) && `${a.name} ${a.agency ?? ""}`.toLowerCase().includes(t)).slice(0, 30) : [];
  const pages = t ? SEARCH_PAGES.filter((p) => p[0].toLowerCase().includes(t)) : SEARCH_PAGES;
  return (
    <div className="pa4-page pa4" role="dialog" aria-modal="true" aria-label="Search" data-pa4="search-page" data-pa3="search-page">
      <div className="pa4-topbar" style={{ padding: "max(8px, calc(env(safe-area-inset-top, 0px) + 4px)) 8px 16px 16px" }}>
        <label className="pa4-field" style={{ flex: 1, boxShadow: "0 0 0 2px var(--pa-blush)", color: "var(--pa-ink)" }}>
          <I4 n="search" />
          <input data-pa4="sterm" data-pa3="sterm" autoFocus placeholder="Find an agent or agency" value={term} autoComplete="off" onChange={(e) => setTerm(e.target.value)} />
        </label>
        <button type="button" className="pa4-link" style={{ width: "auto", color: "#fff", padding: "0 12px" }} data-pa4="scancel" data-pa3="scancel" onClick={closeV3}>Cancel</button>
      </div>
      <div className="pa4-scroll">
        {mine.length ? (<>
          <div className="pa4-grp"><h2 className="pa4-h">Your queries</h2><span className="pa4-s">{mine.length}</span></div>
          {mine.map((q) => <QRowV4 key={q.id} q={q} now={v.now} onOpen={openV3Query} />)}
        </>) : null}
        {fresh.length ? (<>
          <div className="pa4-grp"><h2 className="pa4-h">Not queried yet</h2><span className="pa4-s">{fresh.length}</span></div>
          {fresh.map((a) => (
            <div key={a.id} className="pa4-ib2" data-pa4="s-agent" data-id={a.id}>
              <button type="button" style={{ display: "flex", gap: 16, alignItems: "center", flex: 1, minWidth: 0, minHeight: 56 }} onClick={() => openV3Agent(a.id)}>
                <Seal name={a.name} />
                <span className="pa4-x"><span className="pa4-nm" style={{ display: "block" }}>{a.name}</span><span className="pa4-pv">{[(a.agency ?? "").trim(), a.responseTimeWeeks ? `replies in ${wk(a.responseTimeWeeks)}` : ""].filter(Boolean).join(" · ") || "Agency not added"}</span></span>
              </button>
              <button type="button" className="pa4-chip" data-pa4="s-log" onClick={() => openV3({ type: "log", agentId: a.id })}><span>Log query</span></button>
            </div>
          ))}
        </>) : null}
        {pages.length ? (<>
          <div className="pa4-grp"><h2 className="pa4-h">{t ? "Pages" : "Jump to"}</h2></div>
          <div className="pa4-inset"><div className="pa4-card" style={{ padding: "0 24px" }} data-pa4="s-pages">
            {pages.map(([l, p]) => <button key={p + l} type="button" className="pa4-tap" data-pa4="s-page" data-path={p} onClick={() => go(p)}><span className="pa4-x pa4-b" style={{ fontWeight: 600 }}>{l}</span><Chev /></button>)}
          </div></div>
        </>) : null}
        {t && !mine.length && !fresh.length && !pages.length ? <p className="pa4-b pa4-empty" style={{ padding: "16px 24px" }}>No matches. Try a name or an agency.</p> : null}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
};
