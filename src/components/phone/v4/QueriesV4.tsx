/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — QUERIES (design-refs/phone-app-v4/phone-app-v4-pages.html, "Queries" · "Before the first query"):
 * an inbox of agents under the Courier, with a List | Birds-eye switch the session remembers. Chip and group names are
 * the app's own (`COURT_LABEL`), never "Need you" (PA4-9). A row is the seal with its StatusDot badge, the name, the time
 * since the last event and v3's one line; with-you rows are bold with the blush dot, with-the-agent rows carry the thin
 * progress line. A row opens the query page.
 */
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { openV3, openV3Query } from "../v3/v3Store";
import { COURT_LABEL, courtRows, V3_COURTS, type V3Court, type V3Query } from "../../../lib/phoneV3";
import { QueryStatus } from "../../../types";
import { CAST, Cta, Hero, IconBtn, LapCard, Link4, Seal } from "./V4Parts";
import { BirdsViewV4 } from "./BirdsV4";
import "./phoneV4.css";

const DAY = 86_400_000;
type Chip = V3Court | "all";
const CHIPS: Chip[] = ["all", "you", "agent", "quiet", "closed"];
const isChip = (x: string | null): x is Chip => !!x && (CHIPS as string[]).includes(x);

/** "today", "5d", "3w" — the time since the last event */
export function sinceWord(ms: number, nowMs: number): string {
  const d = Math.floor((nowMs - ms) / DAY);
  if (d < 1) return "today";
  return d < 14 ? `${d}d` : `${Math.round(d / 7)}w`;
}

const VIEW_KEY = "pa4.queries.view";
const readView = (): "list" | "bird" => { try { return window.sessionStorage.getItem(VIEW_KEY) === "bird" ? "bird" : "list"; } catch { return "list"; } };
const saveView = (v: "list" | "bird") => { try { window.sessionStorage.setItem(VIEW_KEY, v); } catch { /* storage refused */ } };

export const QRowV4: React.FC<{ q: V3Query; now: number; onOpen?: (id: string) => void }> = ({ q, now, onOpen = openV3Query }) => {
  const un = q.court === "you";
  const line = `${q.status}${q.short ? ` · ${q.short}` : ""}`;
  return (
    <button type="button" className={`pa4-ib2${un ? " un" : ""}`} data-pa4="qrow" data-id={q.id} data-court={q.court} onClick={() => onOpen(q.id)}>
      <Seal name={q.row.agentName} dark={un} status={q.row.status} />
      <span className="pa4-x">
        <span className="pa4-l1"><span className="pa4-nm">{q.row.agentName}</span><span className="pa4-s pa4-T">{sinceWord(q.row.lastMs, now)}</span></span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="pa4-pv" style={{ flex: 1 }} data-pa4="qline">{line}</span>{un ? <i className="pa4-dot" aria-label="Your move" /> : null}</span>
        {q.court === "agent" && q.gone != null ? <span className="pa4-prog" aria-hidden="true"><i style={{ width: `${Math.max(3, Math.min(100, q.gone * 100))}%` }} /></span> : null}
      </span>
    </button>
  );
};

export const ViewSwitch: React.FC<{ bird: boolean; onPick: (b: boolean) => void }> = ({ bird, onPick }) => (
  <div className="pa4-bsw" role="tablist" aria-label="View" data-pa4="view-switch">
    <button type="button" role="tab" aria-selected={!bird} className={bird ? "" : "on"} data-pa4="view" data-k="list" onClick={() => onPick(false)}>List</button>
    <button type="button" role="tab" aria-selected={bird} className={bird ? "on" : ""} data-pa4="view" data-k="bird" onClick={() => onPick(true)}>Birds-eye</button>
  </div>
);

export const QueriesV4: React.FC = () => {
  const v = useV3Data();
  const loc = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(loc.search);
  const asked = params.get("court");
  const askedView = params.get("view");
  const [chipPick, setChip] = useState<Chip | null>(null);
  const chip: Chip = chipPick ?? (isChip(asked) ? asked : "all");
  const [bird, setBirdState] = useState<boolean>(() => askedView === "birds" || (askedView == null && !asked && readView() === "bird"));
  const setBird = (b: boolean) => { setBirdState(b); saveView(b ? "bird" : "list"); };
  /* a fresh `?court=` or `?view=` from Today wins over what was last tapped here */
  const [seen, setSeen] = useState(loc.search);
  if (loc.search !== seen) {
    setSeen(loc.search); setChip(null);
    if (askedView === "birds") setBird(true); else if (asked) setBird(false);
  }
  const c = v.counts;
  const groups = useMemo(() => (chip === "all" ? V3_COURTS : [chip]).map((k) => ({ k, rows: courtRows(v.qs, k) })).filter((g) => g.rows.length), [chip, v.qs]);
  const corner = <IconBtn label="Search" n="search" pa4="search" onClick={() => openV3({ type: "search" })} />;

  if (!v.qs.length) {
    return (
      <div className="pa4 pa4-queries" data-pa4="queries" data-view="empty">
        <Hero pa4="queries-hero" lap kick="Queries" head="Nothing sent yet." cast={{ src: CAST.courier, width: 124, style: { margin: "0 -22px -4px 0" } }} corner={corner} />
        <LapCard pa4="first-query">
          <h2 className="pa4-h" style={{ marginBottom: 8 }}>Log your first query</h2>
          <p className="pa4-b pa4-body" style={{ marginBottom: 24 }}>Each agent you query gets a line here, with the last thing that happened and whose move it is.</p>
          <Cta pa4="log-first" onClick={() => openV3({ type: "plus" })}>Log a query</Cta>
          <Link4 pa4="import" style={{ minHeight: 56 }} onClick={() => navigate("/import")}>Bring a spreadsheet across</Link4>
        </LapCard>
        <div className="pa4-grp"><h2 className="pa4-h">How it will look</h2></div>
        <div style={{ opacity: 0.5 }} aria-hidden="true" data-pa4="how-it-looks">
          <div className="pa4-ib2 un"><Seal name="An agent" dark status={QueryStatus.PARTIAL_REQUESTED} /><span className="pa4-x"><span className="pa4-l1"><span className="pa4-nm">An agent who replied</span></span><span className="pa4-pv">Partial requested</span></span></div>
          <div className="pa4-ib2"><Seal name="An agent" status={QueryStatus.QUERIED} /><span className="pa4-x"><span className="pa4-l1"><span className="pa4-nm">An agent you’re waiting on</span></span><span className="pa4-pv">Queried · Reply expected by a date</span><span className="pa4-prog"><i style={{ width: "30%" }} /></span></span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pa4 pa4-queries" data-pa4="queries" data-chip={chip} data-view={bird ? "bird" : "list"}>
      {bird ? (
        <BirdsViewV4 switcher={<ViewSwitch bird onPick={setBird} />} corner={corner} />
      ) : (<>
        <Hero pa4="queries-hero" kick="Queries"
          head={<>{c.you} need{c.you === 1 ? "s" : ""} you.<br />{c.agent} {c.agent === 1 ? "is" : "are"} with agents.</>}
          cast={{ src: CAST.courier, width: 124, style: { margin: "0 -22px -4px 0" } }} corner={corner}
          after={<ViewSwitch bird={false} onPick={setBird} />} />
        <div className="pa4-chips" role="tablist" data-pa4="chips">
          {CHIPS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={chip === k} className={`pa4-chip${chip === k ? " on" : ""}`} data-pa4="chip" data-k={k} data-count={c[k]} onClick={() => setChip(k)}>
              <span>{k === "all" ? "All" : COURT_LABEL[k]} <i>{c[k]}</i></span>
            </button>
          ))}
        </div>
        {groups.length ? groups.map((g) => (
          <React.Fragment key={g.k}>
            <div className="pa4-grp" data-pa4="qgroup" data-k={g.k}><h2 className="pa4-h">{COURT_LABEL[g.k]}</h2><span className="pa4-s">{g.rows.length}</span></div>
            {g.rows.map((q) => <QRowV4 key={q.id} q={q} now={v.now} />)}
          </React.Fragment>
        )) : <p className="pa4-b pa4-empty" style={{ padding: "16px 24px" }}>No queries match this filter.</p>}
        <div style={{ height: 24 }} />
      </>)}
    </div>
  );
};
