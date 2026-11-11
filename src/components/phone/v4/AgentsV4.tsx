/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — AGENTS (design-refs/phone-app-v4/phone-app-v4-pages.html, "Agents" · "An agent's card" · "Everyone's
 * been queried"): who to query next under the Scout.
 *   - Best fit on your list: the not-yet-queried agent first in the writer's own Agent fit order (lib/agentFit `fitOrder`:
 *     the stars, then the shorter reply time) — nothing cleverer (baked decision 6);
 *   - Then: the next agents in the same order, as a sideways shelf;
 *   - Waiting on: the faces of with-the-agent queries, each opening that query;
 *   - Everyone on your list (v3's list, pushed) and Discover (pushed; its line is Discover's own count and the row hides
 *     at zero — Discover stays reachable from search's page list).
 * The agent's card is the pull-up sheet as drawn: three fact tiles, fit, asks, wishlist, one button, "Edit details".
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { closeV3, openV3, openV3Agent, openV3Query } from "../v3/v3Store";
import { askTags } from "../v3/AgentsV3";
import { fitWord } from "../../agents/card/agentPills";
import { howWords, replyWords } from "../../../lib/agentsPhone";
import { bestFit } from "../../../lib/phoneV4";
import { dayMonth } from "../../../lib/dates";
import type { V3Query } from "../../../lib/phoneV3";
import type { Agent } from "../../../types";
import { useDiscoverCount } from "../../agents/phone/AgentsPhone";
import { V4Page } from "./V4Chrome";
import { CAST, Chev, Cta, Hero, IconBtn, LapCard, Link4, Seal } from "./V4Parts";
import "./phoneV4.css";

const firstOf = (n: string) => (n || "").trim().split(/\s+/)[0] || "them";
const agencyOf = (a: Agent) => (a.agency ?? "").trim() || "Agency not added";

export const Stars: React.FC<{ n: number | null | undefined }> = ({ n }) => {
  const k = n && n >= 1 ? Math.min(5, n) : 0;
  return <span className="pa4-stars" role="img" aria-label={k ? `${k} of 5` : "Not rated yet"}>{"★".repeat(k)}<i>{"★".repeat(5 - k)}</i></span>;
};

/** the latest query to each agent (a live one over a closed one) */
export function queryByAgent(qs: readonly V3Query[]): Map<string, V3Query> {
  const m = new Map<string, V3Query>();
  for (const q of qs) {
    const id = (q.row.query as { agentId?: string }).agentId ?? "";
    const was = m.get(id);
    if (!was || (was.court === "closed" && q.court !== "closed") || (was.court === q.court && q.row.lastMs > was.row.lastMs)) m.set(id, q);
  }
  return m;
}

const Face: React.FC<{ name: string; status?: string | null; on?: boolean; onTap: () => void; pa4: string; id?: string; children?: React.ReactNode }> = ({ name, status, on, onTap, pa4, id, children }) => (
  <button type="button" className={`pa4-face${on ? " on" : ""}`} data-pa4={pa4} data-id={id} aria-pressed={on || undefined} onClick={onTap}>
    <span className="rg">{children ?? <Seal name={name} dark={on} status={status} />}</span>
    <span className="pa4-s">{firstOf(name)}</span>
  </button>
);
export { Face as FaceV4 };

export const AgentsV4: React.FC = () => {
  const v = useV3Data();
  const navigate = useNavigate();
  const { agents, queries } = v.core.db;
  const fits = useMemo(() => bestFit(agents, queries), [agents, queries]);
  const waiting = useMemo(() => v.qs.filter((q) => q.court === "agent").sort((a, b) => (a.replyMs ?? Infinity) - (b.replyMs ?? Infinity)), [v.qs]);
  const discover = useDiscoverCount();
  const queried = agents.length - fits.length;
  const top = fits[0] ?? null;
  const corner = <IconBtn label="Add an agent" n="plus" pa4="add-agent" onClick={() => openV3({ type: "add" })} />;
  const head = !agents.length ? "No agents on your list yet." : top
    ? <>{fits.length} still to query.<br />{queried} queried.</>
    : `All ${agents.length} queried.`;

  return (
    <div className="pa4 pa4-agents" data-pa4="agents" data-tq={fits.length}>
      <Hero pa4="agents-hero" lap kick="Agents" head={head} cast={{ src: CAST.scout, width: 112 }} corner={corner} />
      {top ? (
        <LapCard pa4="best-fit">
          <div className="pa4-s" style={{ marginBottom: 16 }}>Best fit on your list</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <Seal name={top.name} size={56} />
            <div style={{ minWidth: 0 }}><h2 className="pa4-h" data-pa4="fit-name">{top.name}</h2><div className="pa4-s">{agencyOf(top)}</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}><Stars n={top.starRating} /><span className="pa4-s">{fitWord(top.starRating)}</span></div>
          {askTags(top).length ? <div className="pa4-tags" style={{ marginBottom: 16 }} data-pa4="fit-asks">{askTags(top).map((t) => <span key={t} className="pa4-tag">{t}</span>)}</div> : null}
          <div className="pa4-s" style={{ marginBottom: 24 }}>{[replyWords(top.responseTimeWeeks) ? `Replies in about ${replyWords(top.responseTimeWeeks)}` : "No reply time saved", howWords(top.submissionMethod, top.submissionMethodOther)?.toLowerCase().replace(/^by /, "takes queries by ")].filter(Boolean).join(" · ")}</div>
          <Cta pa4="fit-log" onClick={() => openV3({ type: "log", agentId: top.id })}>Log a query to {firstOf(top.name)}</Cta>
          <Link4 pa4="fit-card" style={{ minHeight: 56 }} onClick={() => openV3Agent(top.id)}>Open {firstOf(top.name)}’s card</Link4>
        </LapCard>
      ) : (
        <LapCard pa4="all-queried">
          {discover > 0 ? (<>
            <h2 className="pa4-h" style={{ marginBottom: 8 }}>The Scout has found {discover} more</h2>
            <p className="pa4-b pa4-body" style={{ marginBottom: 24 }}>Agents open to submissions who represent books like yours.</p>
            <Cta pa4="see-scout" onClick={() => navigate("/agents/discover")}>See who the Scout found</Cta>
            <Link4 pa4="add-yourself" style={{ minHeight: 56 }} onClick={() => openV3({ type: "add" })}>Add an agent yourself</Link4>
          </>) : (<>
            <h2 className="pa4-h" style={{ marginBottom: 8 }}>{agents.length ? "Everyone on your list has a query" : "Start your list"}</h2>
            <p className="pa4-b pa4-body" style={{ marginBottom: 24 }}>Add the next agent you’d like to query, and they’ll wait here until you do.</p>
            <Cta pa4="add-next" onClick={() => openV3({ type: "add" })}>Add an agent</Cta>
            <div style={{ height: 16 }} />
          </>)}
        </LapCard>
      )}
      <div className="pa4-inset">
        {fits.length > 1 ? (<>
          <div className="pa4-sec"><h2 className="pa4-h">Then</h2></div>
          <div className="pa4-hs" data-pa4="shelf">
            {fits.slice(1, 8).map((a) => (
              <button key={a.id} type="button" className="pa4-card" style={{ flex: "none", width: 168, padding: 16, textAlign: "left", borderRadius: 20 }} data-pa4="shelf-card" data-id={a.id} onClick={() => openV3Agent(a.id)}>
                <Seal name={a.name} />
                <span className="pa4-b" style={{ display: "block", fontWeight: 600, marginTop: 12, overflowWrap: "anywhere" }}>{a.name}</span>
                <span className="pa4-s" style={{ display: "block", marginBottom: 8, overflowWrap: "anywhere" }}>{agencyOf(a)}</span>
                <Stars n={a.starRating} />
              </button>
            ))}
          </div>
        </>) : null}
        {waiting.length ? (<>
          <div className="pa4-sec tight"><h2 className="pa4-h">Waiting on</h2></div>
          <div className="pa4-hs" style={{ gap: 4 }} data-pa4="waiting">
            {waiting.map((q) => <Face key={q.id} id={q.id} pa4="waiting-face" name={q.row.agentName} status={q.row.status} onTap={() => openV3Query(q.id)} />)}
          </div>
        </>) : null}
        <div className="pa4-card" style={{ padding: "0 24px", marginTop: 8 }} data-pa4="agent-rows">
          <button type="button" className="pa4-tap" style={{ minHeight: 72 }} data-pa4="everyone" onClick={() => openV3({ type: "agents-all" })}>
            <Seal name="A Z" size={40} />
            <span className="pa4-x"><b>Everyone on your list</b><span className="pa4-s">{agents.length} {agents.length === 1 ? "agent" : "agents"}</span></span><Chev />
          </button>
          {discover > 0 ? (
            <button type="button" className="pa4-tap" style={{ minHeight: 72 }} data-pa4="discover" onClick={() => navigate("/agents/discover")}>
              <img src={CAST.scout} alt="" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--pa-st-slate)", objectFit: "cover", objectPosition: "top" }} />
              <span className="pa4-x"><b>Discover</b><span className="pa4-s">{discover} {discover === 1 ? "agent" : "agents"} the Scout matched to your book</span></span><Chev />
            </button>
          ) : null}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
};

/* ── the agent's card (the pull-up sheet) ── */
export const AgentSheetV4: React.FC<{ id: string }> = ({ id }) => {
  const v = useV3Data();
  const a = v.core.db.agents.find((x) => x.id === id);
  const q = useMemo(() => queryByAgent(v.qs).get(id) ?? null, [v.qs, id]);
  if (!a) return null;
  const first = firstOf(a.name);
  const asks = askTags(a);
  const tiles: [string, string][] = [
    [replyWords(a.responseTimeWeeks) ?? "Not saved", "to reply"],
    [howWords(a.submissionMethod, a.submissionMethodOther) ?? "Not saved", "to submit"],
    [q ? q.status : "Not sent", "your query"],
  ];
  return (
    <div className="pa4-sheet" role="dialog" aria-modal="true" aria-label={a.name} data-pa4="asheet" data-id={a.id}>
      <div className="pa4-grab" />
      <div style={{ display: "flex", gap: 16, alignItems: "center", margin: "0 8px 24px" }}>
        <Seal name={a.name} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}><h2 className="pa4-h">{a.name}</h2><div className="pa4-s">{agencyOf(a)}</div></div>
        <IconBtn label="Close" n="x" pa4="sheet-close" onClick={closeV3} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }} data-pa4="facts">
        {tiles.map(([x, l]) => <div key={l} className="pa4-card" style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 16, boxShadow: "none", overflowWrap: "anywhere" }}><div className="pa4-b" style={{ fontWeight: 600 }}>{x}</div><div className="pa4-s">{l}</div></div>)}
      </div>
      <div className="pa4-card" style={{ padding: "16px 24px", marginBottom: 16, boxShadow: "none" }}>
        <div className="pa4-s" style={{ marginBottom: 8 }}>Your fit</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }} data-pa4="fit"><Stars n={a.starRating} /><span className="pa4-b">{fitWord(a.starRating)}</span></div>
        <div className="pa4-s" style={{ marginBottom: 8 }}>Asks for</div>
        {asks.length ? <div className="pa4-tags" style={{ marginBottom: 16 }} data-pa4="asks">{asks.map((t) => <span key={t} className="pa4-tag">{t}</span>)}</div> : <p className="pa4-b pa4-body" style={{ marginBottom: 16 }}>Nothing saved yet.</p>}
        <div className="pa4-s" style={{ marginBottom: 4 }}>Wishlist</div>
        <p className="pa4-b pa4-body" style={{ overflowWrap: "anywhere" }}>{a.mswlNotes?.trim() || "Nothing saved yet."}</p>
      </div>
      {q ? <Cta pa4="open-query" onClick={() => openV3Query(q.id)}>Open your query</Cta>
        : <Cta pa4="log-to" onClick={() => openV3({ type: "log", agentId: a.id })}>Log a query to {first}</Cta>}
      <Link4 pa4="edit-agent" onClick={() => openV3({ type: "add", editId: a.id })}>Edit details</Link4>
    </div>
  );
};

/* ── Everyone on your list (v3's list, pushed) ── */
type AChip = "all" | "tq" | "qd";
export const AgentsListPageV4: React.FC = () => {
  const v = useV3Data();
  const { agents } = v.core.db;
  const [chip, setChip] = useState<AChip>("all");
  const byAgent = useMemo(() => queryByAgent(v.qs), [v.qs]);
  const sorted = useMemo(() => [...agents].sort((x, y) => x.name.localeCompare(y.name)), [agents]);
  const tq = sorted.filter((a) => !byAgent.has(a.id));
  const qd = sorted.filter((a) => byAgent.has(a.id));
  const CH: [AChip, string, number][] = [["all", "All", agents.length], ["tq", "To query", tq.length], ["qd", "Queried", qd.length]];
  const row = (a: Agent) => {
    const q = byAgent.get(a.id) ?? null;
    return (
      <button key={a.id} type="button" className="pa4-ib2" data-pa4="arow" data-id={a.id} data-queried={q ? "1" : "0"} onClick={() => openV3Agent(a.id)}>
        <Seal name={a.name} status={q?.row.status ?? null} />
        <span className="pa4-x">
          <span className="pa4-nm" style={{ display: "block" }}>{a.name}</span>
          <span className="pa4-pv">{agencyOf(a)}</span>
          <span className="pa4-pv" data-pa4="afact">{q ? `${q.status} · ${q.court === "closed" ? dayMonth(q.row.lastMs) : q.day != null ? `day ${q.day}` : "not dated"}` : replyWords(a.responseTimeWeeks) ? `Replies in ${replyWords(a.responseTimeWeeks)}` : "No reply time saved"}</span>
        </span>
        <Chev />
      </button>
    );
  };
  return (
    <V4Page title="Everyone on your list" onBack={closeV3} pa4="agents-all"
      extra={<IconBtn label="Add an agent" n="plus" pa4="add-agent" onClick={() => openV3({ type: "add" })} />}>
      <div className="pa4-chips" data-pa4="achips">
        {CH.map(([k, l, n]) => <button key={k} type="button" className={`pa4-chip${chip === k ? " on" : ""}`} data-pa4="achip" data-k={k} data-count={n} onClick={() => setChip(k)}><span>{l} <i>{n}</i></span></button>)}
      </div>
      {chip !== "qd" ? (<><div className="pa4-grp"><h2 className="pa4-h">To query</h2><span className="pa4-s">{tq.length}</span></div>{tq.length ? tq.map(row) : <p className="pa4-b pa4-empty" style={{ padding: "8px 24px" }}>Everyone on your list has been queried.</p>}</>) : null}
      {chip !== "tq" ? (<><div className="pa4-grp"><h2 className="pa4-h">Queried</h2><span className="pa4-s">{qd.length}</span></div>{qd.length ? qd.map(row) : <p className="pa4-b pa4-empty" style={{ padding: "8px 24px" }}>No queries yet.</p>}</>) : null}
      <div style={{ height: 32 }} />
    </V4Page>
  );
};
