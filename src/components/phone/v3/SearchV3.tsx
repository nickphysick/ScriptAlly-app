/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — SEARCH (ref `oSearch`, `searchRes`): full screen, the field and Cancel on navy; empty, "Jump to";
 * typed, the agents and queries that match (a queried agent shows as its query row, the rest as agent rows), then the
 * pages. Rows come from the one read (lib/phoneV3), so a query row here says what it says on Queries.
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useV3Data } from "./V3Provider";
import { QueryRowV3 } from "./V3Parts";
import { LRow } from "./YouV3";
import { V3I, type V3IconName } from "./v3Icons";
import { closeV3, openV3Agent, openV3Query } from "./v3Store";

const PAGES: [string, string, V3IconName][] = [
  ["Responses", "/queries/responses", "mail"], ["Analytics", "/queries/analytics", "chart"], ["Packages", "/queries/packages", "box"],
  ["Query letters", "/manuscripts#materials", "file"], ["Wall of no", "/queries/responses#wall", "wall"], ["Corkboard", "/todo/corkboard", "pin"],
  ["Your book", "/manuscripts", "book"], ["Streaks and goals", "/goals", "flame"], ["Help centre", "/help", "help"], ["Settings", "/account", "gear"],
  ["Import queries", "/import", "upload"],
];

export const SearchV3: React.FC = () => {
  const v = useV3Data();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const t = term.trim().toLowerCase();
  const go = (path: string) => { closeV3(); navigate(path); };
  const byAgent = useMemo(() => {
    const m = new Map<string, (typeof v.qs)[number]>();
    for (const q of v.qs) { const id = (q.row.query as { agentId?: string }).agentId ?? ""; const was = m.get(id); if (!was || (was.court === "closed" && q.court !== "closed")) m.set(id, q); }
    return m;
  }, [v.qs]);
  const agents = t ? v.core.db.agents.filter((a) => `${a.name} ${a.agency ?? ""}`.toLowerCase().includes(t)).slice(0, 30) : [];
  const pages = t ? PAGES.filter((p) => p[0].toLowerCase().includes(t)) : PAGES.slice(0, 5);
  return (
    <div className="pa3-full" role="dialog" aria-modal="true" aria-label="Search" data-pa3="search-page">
      <div className="pa3-top">
        <div className="pa3-bar" style={{ gap: 8 }}>
          <label className="pa3-field" style={{ flex: 1, margin: 0, height: 44 }}><V3I n="search" />
            <input data-pa3="sterm" autoFocus placeholder="Agents, agencies, pages" value={term} autoComplete="off" onChange={(e) => setTerm(e.target.value)} />
          </label>
          <button type="button" data-pa3="scancel" style={{ flex: "none", color: "#fff", fontWeight: 600, padding: "10px 6px" }} onClick={closeV3}>Cancel</button>
        </div>
      </div>
      <div className="pa3-body">
        {!t ? <div className="pa3-sec"><h2 className="pa3-h2">Jump to</h2></div> : null}
        {agents.length ? (<>
          <div className="pa3-sec"><h2 className="pa3-h2">Agents and queries</h2></div>
          <div className="pa3-card" data-pa3="s-agents">
            {agents.map((a) => {
              const q = byAgent.get(a.id);
              return q ? <QueryRowV3 key={a.id} q={q} onOpen={openV3Query} /> : (
                <LRow key={a.id} icon="agents" t={a.name} s={(a.agency ?? "").trim() || "Agency not added"} onOpen={() => openV3Agent(a.id)} pa3="s-agent" />
              );
            })}
          </div>
        </>) : null}
        {pages.length ? (<>
          {t ? <div className="pa3-sec"><h2 className="pa3-h2">Pages</h2></div> : null}
          <div className="pa3-card" data-pa3="s-pages">{pages.map(([l, p, i]) => <LRow key={p + l} icon={i} t={l} onOpen={() => go(p)} pa3="s-page" />)}</div>
        </>) : null}
        {t && !agents.length && !pages.length ? <div className="pa3-empty"><b>No matches</b>Try a name or an agency.</div> : null}
      </div>
    </div>
  );
};
