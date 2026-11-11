/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — THE BIRDS-EYE BAR (design-refs/phone-app-v4/phone-app-v4-pages.html, `brow` · `ptrack`): one bar per
 * open query, from the Birds-eye engine's own fraction (`eyeProgress`, via lib/phoneV4 `closeness`). Navy is time gone,
 * the status fill is time left; a query past its date has a full bar and the pulsing ring.
 * ⚠️ WORDS: "N wks past its date", never "overdue" or "late" (PA4-9).
 */
import React, { useMemo, useState } from "react";
import { V3Glyph, statusFill } from "../v3/V3Parts";
import { birdsGroups, closeWords, type Closeness } from "../../../lib/phoneV4";
import { COURT_LABEL, nextActs } from "../../../lib/phoneV3";
import { anyToMs } from "../../../lib/qcStages";
import { dayMonth, MONTHS_SHORT } from "../../../lib/dates";
import { QueryStatus, type Query } from "../../../types";
import { useV3Data } from "../v3/V3Provider";
import { openV3Query } from "../v3/v3Store";
import { CAST, Cta, IconBtn, Link4 } from "./V4Parts";
import { runAct } from "./acts";
import "./phoneV4.css";

const DAY = 86_400_000;

export const BirdBar: React.FC<{ c: Closeness; now: number; onTap: () => void; dim?: boolean; sel?: boolean }> = ({ c, now, onTap, dim, sel }) => {
  const r = c.q.row;
  const f = c.f;
  return (
    <button type="button" className={`pa4-brow${dim ? " dimd" : ""}`} data-pa4="be-bar" data-id={c.q.id} data-f={f ?? ""} data-past={c.past ? "1" : "0"}
      aria-pressed={sel || undefined} onClick={onTap}>
      <span className="l">
        <V3Glyph status={r.status} size={28} label={false} />
        <b>{r.agentName}</b>
        <span className={`pa4-s pa4-T${c.q.court === "you" ? " you" : ""}`} data-pa4="be-words">{closeWords(c, now)}</span>
      </span>
      {f == null ? (
        <span className="pa4-btr" style={{ boxShadow: "inset 0 0 0 1.5px rgba(42,58,82,.25)", background: "none" }} />
      ) : c.past ? (
        <span className="pa4-btr end"><i className="bdone" style={{ left: 0, width: "100%" }} /><i className="bbeacon" data-pa4="beacon" style={{ left: "100%" }} /></span>
      ) : (
        <span className="pa4-btr">
          <i className="brem" style={{ left: 0, width: "100%", background: statusFill(r.status) }} />
          <i className="bdone" style={{ left: 0, width: `${Math.max(2.5, f * 100)}%` }} />
        </span>
      )}
    </button>
  );
};

/* ── the dated views: real dates, month bands, today marked on every bar ── */
type Zoom = "close" | "m3" | "m6";
const ZOOMS: [Zoom, string][] = [["close", "How close"], ["m3", "3 months"], ["m6", "6 months"]];
/** days behind and ahead of today each dated view shows (the boards' axes) */
const SPAN: Record<Exclude<Zoom, "close">, [number, number]> = { m3: [39, 59], m6: [120, 62] };
interface Axis { a: number; b: number; p: (ms: number) => number; t: number }
function axis(nowMs: number, back: number, fwd: number): Axis {
  const a = nowMs - back * DAY, span = (back + fwd) * DAY;
  return { a, b: a + span, p: (ms) => Math.max(0, Math.min(100, ((ms - a) / span) * 100)), t: (back / (back + fwd)) * 100 };
}
const Months: React.FC<{ ax: Axis }> = ({ ax }) => {
  const out: [string, number, number][] = [];
  let d = new Date(ax.a); d = new Date(d.getFullYear(), d.getMonth(), 1);
  while (d.getTime() < ax.b) {
    const nx = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    out.push([MONTHS_SHORT[d.getMonth()], ax.p(Math.max(d.getTime(), ax.a)), ax.p(Math.min(nx.getTime(), ax.b))]);
    d = nx;
  }
  return (
    <div className="pa4-bmon" aria-hidden="true">
      {out.map((m, k) => <span key={k} className={k % 2 ? "" : "alt"} style={{ left: `${m[1]}%`, width: `${m[2] - m[1]}%` }}>{m[2] - m[1] > 9 ? m[0] : ""}</span>)}
      <b style={{ left: `${ax.t}%` }}>Today</b>
    </div>
  );
};
/** the earlier stages, from the query's own send dates: query, then partial, then full */
function pastStages(q: Query, untilMs: number | null): { status: string; from: number; to: number }[] {
  const marks = [
    [QueryStatus.QUERIED, anyToMs(q.dateSent)],
    [QueryStatus.PARTIAL_SENT, anyToMs(q.partialSentDate)],
    [QueryStatus.FULL_SENT, anyToMs(q.fullSentDate)],
  ].filter((m): m is [QueryStatus, number] => m[1] != null).sort((x, y) => x[1] - y[1]);
  const out: { status: string; from: number; to: number }[] = [];
  for (let i = 0; i < marks.length; i++) {
    const to = marks[i + 1]?.[1] ?? untilMs;
    if (to != null && to > marks[i][1]) out.push({ status: marks[i][0], from: marks[i][1], to });
  }
  return out;
}
const DatedBar: React.FC<{ c: Closeness; ax: Axis; now: number; onTap: () => void; dim?: boolean }> = ({ c, ax, now, onTap, dim }) => {
  const r = c.q.row;
  const l = c.fromMs != null ? ax.p(c.fromMs) : null, e = c.toMs != null ? ax.p(c.toMs) : null;
  const past = pastStages(r.query as Query, c.fromMs);
  return (
    <button type="button" className={`pa4-brow${dim ? " dimd" : ""}`} data-pa4="be-bar" data-id={c.q.id} data-f={c.f ?? ""} data-past={c.past ? "1" : "0"} onClick={onTap}>
      <span className="l"><V3Glyph status={r.status} size={28} label={false} /><b>{r.agentName}</b><span className={`pa4-s pa4-T${c.q.court === "you" ? " you" : ""}`} data-pa4="be-words">{closeWords(c, now)}</span></span>
      <span className="pa4-btr">
        {past.map((s, k) => { const a = ax.p(s.from), b = ax.p(s.to); return b > a ? <i key={k} className="bpast" style={{ left: `${a}%`, width: `${b - a}%`, background: statusFill(s.status) }} /> : null; })}
        {l != null && e != null ? (c.past ? (<>
          <i className="bdone" style={{ left: `${l}%`, width: `${Math.max(0, e - l)}%` }} />
          <i className="bover" style={{ left: `${e}%`, width: `${Math.max(0, ax.t - e)}%` }} />
          <i className="bbeacon" data-pa4="beacon" style={{ left: `${ax.t}%` }} />
        </>) : (<>
          <i className="brem" style={{ left: `${l}%`, width: `${Math.max(0, e - l)}%`, background: statusFill(r.status) }} />
          <i className="bdone" style={{ left: `${l}%`, width: `${Math.max(2.5, ax.t - l)}%` }} />
          <i className="btick" style={{ left: `${ax.t}%` }} />
        </>)) : <i className="btick" style={{ left: `${ax.t}%` }} />}
      </span>
    </button>
  );
};

/* ── the view ── */
export const BirdsViewV4: React.FC<{ switcher: React.ReactNode; corner: React.ReactNode }> = ({ switcher, corner }) => {
  const v = useV3Data();
  const [zoom, setZoom] = useState<Zoom>("close");
  const [sel, setSel] = useState<string | null>(null);
  const groups = useMemo(() => birdsGroups(v.qs, v.now), [v.qs, v.now]);
  const total = groups.reduce((s, g) => s + g.rows.length, 0);
  const ax = zoom === "close" ? null : axis(v.now, ...SPAN[zoom]);
  const picked = sel ? groups.flatMap((g) => g.rows).find((r) => r.q.id === sel) ?? null : null;
  const tap = (id: string) => setSel((s) => (s === id ? null : id));
  return (
    <div data-pa4="birds" data-zoom={zoom}>
      <header className="pa4-hero" style={{ paddingBottom: 16 }} data-pa4="birds-hero">
        <img className="pa4-shadow" src={CAST.shadow} alt="" />
        <div className="pa4-head" style={{ minHeight: 104, marginBottom: 16 }}>
          <div><div className="pa4-s pa4-kick">Queries</div><h1 className="pa4-d2" data-pa4="headline">{total} live {total === 1 ? "query" : "queries"},<br />by date.</h1></div>
          <img src={CAST.beHead} alt="" data-pa4="cast" style={{ flex: "none", width: 104, margin: "0 -8px -32px 0", position: "relative" }} />
          <div className="pa4-corner">{corner}</div>
        </div>
        <div style={{ position: "relative" }}>{switcher}</div>
      </header>
      <div style={{ display: "flex", gap: 8, padding: "8px 16px 0" }} role="tablist" data-pa4="zooms">
        {ZOOMS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={zoom === k} className={`pa4-chip${zoom === k ? " on" : ""}`} data-pa4="zoom" data-k={k} onClick={() => setZoom(k)}><span>{l}</span></button>
        ))}
      </div>
      <div className={ax ? "pa4-bscroll" : ""} data-pa4="be-track">
        <div style={ax ? { minWidth: zoom === "m6" ? "180%" : "130%" } : undefined}>
          {ax ? <div className="pa4-bwrap"><Months ax={ax} /></div> : null}
          {groups.length ? groups.map((g) => (
            <React.Fragment key={g.court}>
              <div className="pa4-grp" style={{ paddingTop: 16 }} data-pa4="be-group" data-k={g.court}><h2 className="pa4-h">{COURT_LABEL[g.court]}</h2><span className="pa4-s">{g.rows.length}</span></div>
              <div className="pa4-bwrap">
                {(ax ? [...g.rows].sort((a, b) => (a.toMs ?? Infinity) - (b.toMs ?? Infinity)) : g.rows).map((r) => ax
                  ? <DatedBar key={r.q.id} c={r} ax={ax} now={v.now} dim={!!sel && sel !== r.q.id} onTap={() => tap(r.q.id)} />
                  : <BirdBar key={r.q.id} c={r} now={v.now} dim={!!sel && sel !== r.q.id} sel={sel === r.q.id} onTap={() => tap(r.q.id)} />)}
              </div>
            </React.Fragment>
          )) : <p className="pa4-b pa4-empty" style={{ padding: "16px 24px" }}>No open queries to place on a date.</p>}
        </div>
      </div>
      <p className="pa4-s" style={{ padding: "16px 24px 24px" }}>{ax ? "Faded bars are earlier steps: query, then partial, then full." : "Navy is time gone, the paler part is time left. A ring at the end means the date has passed."}</p>
      {picked ? <Peek c={picked} now={v.now} onClose={() => setSel(null)} /> : null}
    </div>
  );
};

/** tapping a bar raises its three facts and the one step that fits */
const Peek: React.FC<{ c: Closeness; now: number; onClose: () => void }> = ({ c, now, onClose }) => {
  const q = c.q, r = q.row;
  const acts = nextActs(q);
  const agency = r.agency && r.agency !== "No agency" ? r.agency : "";
  const toWord = r.expectedKind === "sendBy" ? "send by" : r.expectedKind === "offer" ? "decide by" : "reply expected";
  const since = c.fromMs != null ? Math.max(0, Math.round((now - c.fromMs) / DAY)) : null;
  const facts: [string, string][] = [
    [c.fromMs != null ? dayMonth(c.fromMs) : "Not dated", q.court === "you" ? "asked" : "sent"],
    [c.toMs != null ? dayMonth(c.toMs) : "No date", toWord],
    [since == null ? "Not dated" : since < 14 ? `${since} ${since === 1 ? "day" : "days"}` : `${Math.round(since / 7)} weeks`, "since then"],
  ];
  return (
    <div className="pa4-peek" data-pa4="peek" data-id={q.id}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <V3Glyph status={r.status} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}><h2 className="pa4-h">{r.agentName}</h2><div className="pa4-s">{[agency, q.status].filter(Boolean).join(" · ")}</div></div>
        <IconBtn label="Close" n="x" pa4="peek-close" onClick={onClose} />
      </div>
      <div className="f3">{facts.map(([a, b]) => <div key={b}><div className="pa4-b pa4-T">{a}</div><div className="pa4-s">{b}</div></div>)}</div>
      {acts ? <Cta pa4="peek-act" onClick={() => runAct(acts.primary.kind, q.id)}>{acts.primary.label}</Cta> : null}
      <Link4 pa4="peek-open" onClick={() => openV3Query(q.id)}>Open this query</Link4>
    </div>
  );
};
