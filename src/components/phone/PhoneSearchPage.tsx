/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Search on a phone (phone fixes v1, 3A; ref design-refs/phone-app-v2/src/overlays.js `ovSearch`).
 *
 * Full screen, the field focused with the keyboard up and "Cancel" beside it. Empty, it offers "Try" and
 * "Jump to"; typing groups results into Queries, Agents to query and Notes, each opening its item, or says
 * "Nothing matches “…”".
 *
 * ⚠️ THE SEARCH IS THE DESKTOP PALETTE'S, NOT A FORK. Queries and agents come from the palette's own corpus
 * (`buildCorpus`) ranked by its own `rankItems`; notes are scored by its `scoreItem`. The band's search used
 * to open the desktop palette itself, which draws nothing on a phone, so the button did nothing.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import { buildCorpus, rankItems, scoreItem, RANK, type PaletteItem } from "../../lib/searchPalette";
import { agentPrimary, agentSecondary } from "../../lib/agentDisplay";
import { isNoteTask } from "../../lib/todoBoard";
import { openAgentCard } from "../../lib/agentCardStore";
import { StatusDot } from "../StatusDot";
import { STAGE_NAME } from "../../lib/qcSummary";
import { initialsOf } from "../../lib/searchSuggestionsCore";
import { PI } from "./phoneIcons";
import type { QueryStatus } from "../../types";
import "./phoneSearch.css";

const JUMP: [string, string, React.ReactNode][] = [
  ["/queries/responses", "Responses", PI.inbox],
  ["/queries/analytics", "Analytics", PI.chart],
  ["/manuscripts", "Manuscript", PI.book],
];

export const PhoneSearchPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { agents, queries, manuscripts, userTasks } = useScriptAllyDb();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const corpus = useMemo(() => buildCorpus({
    agents, queries, manuscripts, now: Date.now(),
    agentLabel: (a) => ({ primary: agentPrimary(a), secondary: agentSecondary(a) }),
  }), [agents, queries, manuscripts]);
  const queried = useMemo(() => new Set(queries.map((q) => q.agentId)), [queries]);
  const notes = useMemo(() => userTasks.filter(isNoteTask), [userTasks]);

  const t = term.trim();
  const ranked = useMemo(() => rankItems(corpus, t), [corpus, t]);
  const qs = ranked.filter((i) => i.run.kind === "query");
  const as = ranked.filter((i) => i.run.kind === "agent" && !queried.has((i.run as { agentId: string }).agentId));
  const ns = t ? notes.filter((n) => scoreItem({ title: n.text ?? "", subtitle: n.detail ?? undefined }, t) > RANK.noMatch) : [];

  /* "Try": the writer's own words, never sample names — an agency, an agent and a status from their data */
  const tries = useMemo(() => {
    const out: string[] = [];
    const firstAgent = agents.find((a) => queried.has(a.id));
    if (firstAgent) { out.push(agentSecondary(firstAgent)); out.push(agentPrimary(firstAgent).split(" ")[0]); }
    const st = queries.find((q) => q.status)?.status as QueryStatus | undefined;
    if (st) out.push(STAGE_NAME[st] ?? st);
    return [...new Set(out.filter((x) => x && x.length > 1))].slice(0, 4);
  }, [agents, queries, queried]);

  const openQuery = (id: string) => { onClose(); navigate(`/queries?q=${encodeURIComponent(id)}`, { state: { qm1: true } }); };
  const go = (path: string) => { onClose(); navigate(path); };
  const agentOf = (i: PaletteItem) => agents.find((a) => a.id === (i.run as { agentId: string }).agentId);
  const queryOf = (i: PaletteItem) => queries.find((q) => q.id === (i.run as { queryId: string }).queryId);

  return createPortal(
    <div className="pss" role="dialog" aria-modal="true" aria-label="Search" data-pa="search">
      <div className="pss-top">
        <label className="pss-field">
          <span className="pss-ic" aria-hidden="true">{PI.search}</span>
          <input ref={input} type="search" enterKeyHint="search" value={term} onChange={(e) => setTerm(e.target.value)}
            placeholder="Search queries, agents and notes" autoComplete="off" aria-label="Search queries, agents and notes" data-pa="search-input" />
        </label>
        <button type="button" className="pss-cancel" onClick={onClose} data-pa="search-cancel">Cancel</button>
      </div>
      <div className="pss-res" data-pa="search-results">
        {!t ? (<>
          {tries.length ? (<>
            <div className="pss-gl">Try</div>
            <div className="pss-pills">{tries.map((s) => <button key={s} type="button" className="pss-chip" onClick={() => setTerm(s)} data-pa="search-try">{s}</button>)}</div>
          </>) : null}
          <div className="pss-gl">Jump to</div>
          <div className="pss-group">
            {JUMP.map(([p, w, ic]) => (
              <button key={p} type="button" className="pss-li" onClick={() => go(p)} data-pa="search-jump" data-path={p}>
                <span className="pss-ico">{ic}</span><span className="pss-lt">{w}</span><span className="pss-chev" aria-hidden="true">{PI.chev}</span>
              </button>
            ))}
          </div>
        </>) : qs.length + as.length + ns.length === 0 ? (
          <p className="pss-none" data-pa="search-none">Nothing matches “{t}”.</p>
        ) : (<>
          {qs.length ? (<>
            <div className="pss-gl">Queries</div>
            <div className="pss-group">
              {qs.map((i) => {
                const q = queryOf(i); const a = q ? agents.find((x) => x.id === q.agentId) : undefined;
                return (
                  <button key={i.id} type="button" className="pss-li" onClick={() => openQuery((i.run as { queryId: string }).queryId)} data-pa="search-query" data-id={q?.id}>
                    <StatusDot status={(q?.status ?? i.status) as QueryStatus} overrideSize={28} decorative />
                    <span className="pss-lt">{a ? agentPrimary(a) : i.title}<span className="pss-sub">{[a ? agentSecondary(a) : i.subtitle, q ? STAGE_NAME[q.status as QueryStatus] : null].filter(Boolean).join(" · ")}</span></span>
                    <span className="pss-chev" aria-hidden="true">{PI.chev}</span>
                  </button>
                );
              })}
            </div>
          </>) : null}
          {as.length ? (<>
            <div className="pss-gl">Agents to query</div>
            <div className="pss-group">
              {as.map((i) => {
                const a = agentOf(i);
                return (
                  <button key={i.id} type="button" className="pss-li" onClick={() => { onClose(); if (a) openAgentCard(a.id); }} data-pa="search-agent" data-id={a?.id}>
                    <span className="pss-av" aria-hidden="true">{initialsOf(a ? agentPrimary(a) : i.title)}</span>
                    <span className="pss-lt">{a ? agentPrimary(a) : i.title}<span className="pss-sub">{a ? agentSecondary(a) : i.subtitle}</span></span>
                    <span className="pss-chev" aria-hidden="true">{PI.chev}</span>
                  </button>
                );
              })}
            </div>
          </>) : null}
          {ns.length ? (<>
            <div className="pss-gl">Notes</div>
            {ns.map((n) => (
              <button key={n.id} type="button" className="pss-note" onClick={() => go("/todo/corkboard")} data-pa="search-note">{[n.text, n.detail].filter(Boolean).join(" — ")}</button>
            ))}
          </>) : null}
        </>)}
      </div>
    </div>,
    document.body,
  );
};
