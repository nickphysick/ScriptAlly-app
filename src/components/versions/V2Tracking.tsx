/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2 — Tracking & performance (P5–P7; the ref's `byV()`): the navy divider band, "How each version is doing"
 * (a carousel of cards that follow its sort) and the league table.
 *
 * ⚠️ R5: A PERCENTAGE ONLY FROM 5 SENT. Below it a card reads "Too early to tell", its row's rate is "–", and it can be
 *    neither ranked first, nor "Leading", nor named in the summary sentence. That includes the league's "Highest
 *    request rate" tile and the page-wide request rate (both "–" until 5 have gone).
 * ⚠️ R14: THE APP REPORTS. Nothing here suggests what to change.
 */
import React, { useEffect, useRef, useState } from "react";
import { QueryStatus } from "../../types";
import {
  MIN_SENT_FOR_RATE, carouselOrder, leadingId, leagueOrder, rated, type CarouselSort, type LeagueKey, type VersionFacts, type VersionsModel,
} from "../../lib/versionsV2";
import type { AnalyticsRow } from "../../lib/analytics";
import { Dot, Num, msDay, shortDay } from "./v2Bits";

export interface V2TrackingProps {
  m: VersionsModel;
  rows: Map<string, AnalyticsRow>;
  onOpen: (id: string, from: HTMLElement | null) => void;
  onPackage: (id: string) => void;
  onFill: () => void;
}

const SORTS: [CarouselSort, string][] = [["rate", "Asked for more"], ["sent", "Most sent"], ["fast", "Fastest replies"]];
const LCOLS: [LeagueKey | "bar", string][] = [["n", "Sent"], ["bar", "Where they stand"], ["rep", "Replies"], ["rate", "Rate"], ["req", "Requests"], ["avg", "Avg reply"]];

export const V2Tracking: React.FC<V2TrackingProps> = ({ m, rows, onOpen, onPackage, onFill }) => {
  const [cs, setCs] = useState<CarouselSort>("rate");
  const [ls, setLs] = useState<LeagueKey>("req");
  const trRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false, at0: true, atE: true });
  const live = m.live;
  const fs = live.map((v) => m.facts.get(v.id)!);
  const sent = fs.filter((f) => f.n > 0);
  const lead = leadingId(fs);
  const all = carouselOrder(fs, cs);

  const syncEdge = () => {
    const tr = trRef.current;
    if (!tr) return;
    const at0 = tr.scrollLeft < 10, atE = tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 10;
    setEdge({ l: !at0, r: !atE, at0, atE });
  };
  useEffect(() => { syncEdge(); const tr = trRef.current; if (!tr) return; const ro = new ResizeObserver(syncEdge); ro.observe(tr); return () => ro.disconnect(); }, [all.length, cs]);

  if (sent.length < 2) return null;

  const mxN = Math.max(1, ...sent.map((f) => f.n));
  const mnA = Math.min(999, ...sent.filter((f) => f.avgReply != null).map((f) => f.avgReply!));
  const tot = sent.reduce((a, f) => a + f.n, 0), totM = sent.reduce((a, f) => a + f.more.length, 0);
  const hi = rated(sent)[0];
  const fast = [...sent].filter((f) => f.avgReply != null).sort((a, b) => a.avgReply! - b.avgReply!)[0];
  const most = [...sent].sort((a, b) => b.n - a.n)[0];
  const top = lead ? m.facts.get(lead)! : null;
  const byId = new Map(m.versions.map((v) => [v.id, v]));

  const bar2 = (f: VersionFacts) => {
    const wt = f.qs.filter((q) => q.status === QueryStatus.QUERIED && !f.replied.includes(q)).length;
    const nr = f.qs.filter((q) => q.status === QueryStatus.NO_RESPONSE && !f.replied.includes(q)).length;
    const segs: [string, number][] = [["rq", f.more.length], ["rp", f.replied.length - f.more.length], ["wt", wt], ["nr", nr]];
    return <span className="lb">{segs.filter((s) => s[1] > 0).map(([c, n]) => <u key={c} className={c} style={{ flex: n }} />)}</span>;
  };

  const rcard = (f: VersionFacts, ri: number) => {
    const v = f.v, u2 = !f.n, isLead = v.id === lead, use = v.id === m.inUse;
    const par = v.parentId ? byId.get(v.parentId) ?? null : null;
    const nc = v.changes.length;
    const p = f.ratePct ?? 0;
    const H2: Record<CarouselSort, [React.ReactNode, string, string, number]> = {
      rate: [<>{p}<small>%</small></>, "asked for more", `${f.more.length} of ${f.n} queries`, p],
      sent: [`${f.n}`, f.n === 1 ? "query sent" : "queries sent", `since ${shortDay(msDay(f.firstMs))}`, (f.n / mxN) * 100],
      fast: [f.avgReply != null ? <>{f.avgReply}<small> days</small></> : "–", "average reply", f.avgReply != null ? `from ${f.replyN} ${f.replyN === 1 ? "reply" : "replies"}` : "No replies yet", f.avgReply != null ? (mnA / f.avgReply) * 100 : 0],
    };
    const h = H2[cs];
    const st: [CarouselSort, string, string][] = [
      ["rate", "Asked for more", f.early ? `${f.more.length} of ${f.n}` : `${p}%`], ["sent", "Sent", `${f.n}`], ["fast", "Avg reply", f.avgReply != null ? `${f.avgReply}d` : "–"],
    ];
    return (
      <article className={`vc3${use ? " use" : ""}${u2 ? " u" : ""}`} key={v.id} data-vv2="car-card" data-id={v.id}>
        <header className="vc3-h">
          <span className={`vc2-d${v.original ? " om" : ""}`}><Num v={v} /></span>
          <div className="vc3-t"><b>{v.name}</b><i>{v.original ? "Your original manuscript" : par ? `From ${par.original ? "the original" : par.name} · ${nc} ${nc === 1 ? "change" : "changes"}` : "First version"}</i></div>
          {u2 ? null : <span className="vc3-rk" title={`Place, sorted by ${{ rate: "asked for more", sent: "most sent", fast: "fastest replies" }[cs]}`}>#{ri + 1}</span>}
        </header>
        <div className="vc3-tags">{use ? <span className="vc2-tag n">In use</span> : null}{isLead ? <span className="vc2-tag b">Leading</span> : null}</div>
        {u2 ? (
          <>
            <div className="vc3-hero u"><p className="vc3-v">Not sent yet</p><p className="vc3-n">Saved {shortDay(v.createdDate)}. It counts once it goes out with a query.</p></div>
            <div className="vc2-bar e" />
            <div className="vc3-run e">No queries yet</div>
          </>
        ) : (
          <>
            {cs === "rate" && f.early
              ? <div className="vc3-hero u"><p className="vc3-v">Too early to tell</p><p className="vc3-n">{f.more.length} of {f.n} asked for more so far. A percentage shows once {MIN_SENT_FOR_RATE} have gone out.</p></div>
              : <div className="vc3-hero"><p className="vc3-v">{h[0]}</p><p className="vc3-l">{h[1]}<em>{h[2]}</em></p></div>}
            <div className="vc2-bar"><u style={{ width: `${Math.max(cs === "rate" && f.early ? 0 : h[3], 2)}%` }} /></div>
            <div className="vc3-run" aria-label="Every query, in the order sent">
              {f.qs.map((q) => <span key={q.id} className={f.more.includes(q) ? "hot" : ""}><Dot status={q.status} size={17} /></span>)}
            </div>
          </>
        )}
        {u2 ? null : <dl className="vc3-st">{st.map(([k, l, val]) => <div key={k} className={k === cs ? "on" : ""}><dt>{l}</dt><dd>{val}</dd></div>)}</dl>}
        <footer className="vc3-f">
          <span>Saved {shortDay(v.createdDate)}</span>
          {u2 ? <button type="button" className="cx-lnk" onClick={() => onPackage(v.id)}>Add to a package</button>
            : <button type="button" className="cx-lnk" onClick={(e) => onOpen(v.id, e.currentTarget)}>See queries</button>}
        </footer>
      </article>
    );
  };

  const step = (dir: number) => {
    const tr = trRef.current; if (!tr) return;
    const c = tr.querySelector<HTMLElement>(".vc3");
    tr.scrollBy({ left: dir * ((c ? c.offsetWidth : 300) + 20) * 2, behavior: "smooth" });
  };

  return (
    <section className="cx-band is-full" id="secH2hB" data-vv2="tracking">
      <div className="cx-sec" id="secH2h" aria-labelledby="msLH">
        <div className="tpd">
          <p className="tpd-k">— Tracking &amp; performance —</p>
          <h2 id="msLH">Which version gets agents asking for more?</h2>
          <p className="tpd-s">Every query with a version counts here, from the first one you sent.</p>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3v13M4.5 10.5 10 16l5.5-5.5" /></svg>
        </div>
        <div className="cv" id="h2h">
          <div className="oh"><div>
            <p className="oh-k">Your versions</p>
            <h3>How each version is doing</h3>
            <p className="oh-s"><b>{live.length}</b> saved, <b>{sent.length}</b> sent. {top ? <><b>{top.v.name}</b> is getting the most agents asking for more.</> : null}</p>
          </div></div>
          <div className="vcar" data-vv2="carousel">
            <div className="vcar-hd">
              <div className="vcar-sort" role="radiogroup" aria-label="Sort versions">
                <span>Sort by</span>
                {SORTS.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={cs === k} data-vv2={`cs-${k}`} onClick={() => setCs(k)}>{l}</button>)}
              </div>
              <span className="vcar-n">{all.length} versions</span>
              <div className="vcar-ar">
                <button type="button" aria-label="Scroll back" disabled={edge.at0} onClick={() => step(-1)}><svg viewBox="0 0 16 16"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                <button type="button" aria-label="Scroll on" disabled={edge.atE} onClick={() => step(1)}><svg viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></svg></button>
              </div>
            </div>
            <div className={`vcar-w${edge.l ? " more-l" : ""}${edge.r ? " more-r" : ""}`} id="vcarW">
              <div className="vcar-tr" id="vcarTr" ref={trRef} onScroll={syncEdge}>{all.map((f, i) => rcard(f, i))}</div>
            </div>
          </div>

          <div className="lg" data-vv2="league">
            <div className="lg-l">
              <div className="lg-art" aria-hidden="true"><span>Illustration<br /><small>A hawk with a trophy</small></span></div>
              <p className="oh-k">League table</p>
              <h3>Which version is out in front?</h3>
              <p className="oh-s">Every version side by side, ranked by the requests it’s earned. Click a heading to sort by something else.</p>
            </div>
            <section className="sh">
              <div className="sh-h"><span className="sh-t">How they compare, <span>by</span> version</span></div>
              <div className="sh-lead">
                <div><p className="rc-k">Request rate, all versions</p><p className="sh-big">{tot >= MIN_SENT_FOR_RATE ? `${Math.round((totM / tot) * 100)}%` : "–"}</p><p className="sh-i">{totM} requests from {tot} queries</p></div>
                <div><p className="rc-k">Highest request rate</p><p className="sh-n">{hi ? hi.v.name : "–"}</p><p className="sh-i">{hi ? `${hi.more.length} of ${hi.n} (${hi.ratePct}%)` : ""}</p></div>
                <div><p className="rc-k">Fastest replies</p><p className="sh-n">{fast ? fast.v.name : "–"}</p><p className="sh-i">{fast ? `${fast.avgReply} days on average` : ""}</p></div>
                <div><p className="rc-k">Most sent</p><p className="sh-n">{most ? most.v.name : "–"}</p><p className="sh-i">{most ? `${most.n} queries` : ""}</p></div>
              </div>
              <div className="sh-row sh-hd">
                <span>Version</span>
                {LCOLS.map(([k, n]) => k === "bar" ? <span key={k}>{n}</span>
                  : <button key={k} type="button" className={ls === k ? "on" : ""} data-vv2={`ls-${k}`} onClick={() => setLs(k as LeagueKey)}>{n}{ls === k ? <> <i>↓</i></> : null}</button>)}
              </div>
              {leagueOrder(fs, ls).map((f) => {
                const u2 = !f.n, thin = !u2 && f.n < MIN_SENT_FOR_RATE;
                return (
                  <div className={`sh-row${u2 ? " u" : ""}`} key={f.v.id} data-vv2="league-row" data-id={f.v.id} role="button" tabIndex={0}
                    onClick={(e) => onOpen(f.v.id, e.currentTarget)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(f.v.id, e.currentTarget); }}>
                    <span className="sh-v"><span className="sh-ic"><Num v={f.v} /></span><span><b>{f.v.name}</b>{u2 ? <i>Not sent yet</i> : thin ? <i>too early to tell</i> : f.v.id === m.inUse ? <i>In use</i> : null}</span></span>
                    <span className="sh-num">{u2 ? "–" : f.n}</span>
                    <span>{u2 ? <span className="lb e" /> : bar2(f)}</span>
                    <span className="sh-num">{u2 ? "–" : f.replied.length}</span>
                    <span className="sh-num">{u2 || thin ? "–" : `${f.ratePct}%`}</span>
                    <span className="sh-num">{u2 ? "–" : f.more.length}</span>
                    <span className="sh-num">{u2 || f.avgReply == null ? "–" : `${f.avgReply} days`}</span>
                  </div>
                );
              })}
              <div className="sh-f">
                <span className="key"><span><u className="rq" />Requests</span><span><u className="rp" />Other replies</span><span><u className="wt" />Still waiting</span><span><u className="nr" />No reply</span></span>
                <p>Rate is the share of sent queries where the agent asked for more. It shows from 5 sent.{m.unrecorded.length ? <> <button type="button" className="cx-lnk" onClick={onFill}>{m.unrecorded.length} without a version</button></> : null}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
};
