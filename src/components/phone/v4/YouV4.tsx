/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — YOU (design-refs/phone-app-v4/phone-app-v4-pages.html, "You" · "Early days"): the campaign as a
 * profile under the Archivist. The book's title, "Since {first query} · day N", the three figures (the Responses page's
 * own counts, `pageCounts`), What's landing (packageMetrics' own ranking, compared only once a package clears its own
 * sample threshold, MIN_SENDS_FOR_CLAIM), the streak (the Goals page's), the Wall of no, and rows for everything else.
 * ⚠️ NOTHING v3 MADE REACHABLE BECOMES UNREACHABLE (PA4-8): Responses, Query letters and Synopses and comps sit beside the
 *    drawn Packages, Your book and Corkboard. Early days says words, not zeros.
 */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { pageCounts, pctOf, respItems } from "../../../lib/responses";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { activePackageId } from "../../../lib/queryActions/packages";
import { MIN_SENDS_FOR_CLAIM, rankPackagesByRequests, strongestPackage } from "../../../lib/packageMetrics";
import { buildQcRows } from "../../../lib/qcSummary";
import { buildRows } from "../../../lib/analytics";
import { dayN, firstSentMs, streakLine } from "../../../lib/phoneV4";
import { dayMonth } from "../../../lib/dates";
import { YOU_PATH } from "../../../lib/phoneV3Nav";
import type { Activity } from "../../../types";
import { CAST, Check, Chev, Hero, IconBtn, LapCard, Link4 } from "./V4Parts";
import "./phoneV4.css";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const YOU_ROWS: [string, string][] = [
  ["Packages", "/queries/packages"], ["Your book", "/manuscripts"], ["Corkboard", "/todo/corkboard"],
  ["Responses", "/queries/responses"], ["Query letters", "/manuscripts#materials"], ["Synopses and comps", "/manuscripts#comps"],
];

export const YouV4: React.FC = () => {
  const navigate = useNavigate();
  const { queries, agents, activities, manuscripts, packages, currentUser } = useScriptAllyDb();
  const nowMs = useMemo(() => Date.now(), [queries]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => buildQcRows(queries, agents, activities, nowMs), [queries, agents, activities, nowMs]);
  const c = useMemo(() => pageCounts(respItems(rows), rows), [rows]);
  const arows = useMemo(() => buildRows(queries, activities as Activity[], agents, nowMs), [queries, activities, agents, nowMs]);
  const first = useMemo(() => firstSentMs(arows), [arows]);
  const streak = useMemo(() => streakLine(arows, currentUser?.queryingGoals, nowMs), [arows, currentUser?.queryingGoals, nowMs]);
  const ms = useMemo(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { /* storage refused */ }
    return resolveScopedManuscript(manuscripts, stored);
  }, [manuscripts]);
  const pkgs = useMemo(() => (packages ?? []).filter((p) => p.manuscriptId === ms?.id), [packages, ms]);
  const ranked = useMemo(() => rankPackagesByRequests(pkgs, queries).filter((r) => r.stat.sent > 0), [pkgs, queries]);
  const best = useMemo(() => strongestPackage(pkgs, queries), [pkgs, queries]);
  const activeId = ms ? activePackageId(ms, packages ?? []) : null;
  const early = c.replies === 0;
  const asked = pctOf(c.more, c.sent);
  const figs: [string, string][] = early
    ? [[String(c.sent), c.sent === 1 ? "query sent" : "queries sent"], [String(c.waiting), "with agents"]]
    : [[String(c.sent), c.sent === 1 ? "query sent" : "queries sent"], [String(c.more), "asked for more"], [asked != null ? `${asked}%` : "—", "request rate"]];

  return (
    <div className="pa4 pa4-you" data-pa4="you" data-pa5="profile" data-early={early ? "1" : "0"}>
      <Hero pa4="you-hero" lap kick="Your campaign" head={ms?.title?.trim() || "Your book"}
        sub={first != null ? `Since ${dayMonth(first)} · day ${dayN(first, nowMs)}` : "No queries sent yet"}
        cast={{ src: CAST.archivist, width: 128, style: { margin: "0 -20px 0 0" } }}
        corner={<IconBtn label="Settings" n="gear" pa4="settings" onClick={() => navigate("/account")} />} />
      <LapCard pa4="figures" style={early ? { padding: 24 } : undefined}>
        <div className="pa4-figs" data-pa4="figs">{figs.map(([n, l]) => <div key={l}><b data-pa4="fig">{n}</b><span className="pa4-s">{l}</span></div>)}</div>
        {early ? <p className="pa4-b pa4-body" style={{ marginTop: 24 }}>{c.sent ? "No replies yet." : "Nothing sent yet."}</p> : null}
        <Link4 sb pa4="full-picture" style={{ marginTop: early ? 16 : 24 }} onClick={() => navigate("/queries/analytics")}>See the full picture</Link4>
      </LapCard>
      <div className="pa4-inset">
        <div className="pa4-sec" style={{ marginBottom: 4 }}><h2 className="pa4-h">What’s landing</h2></div>
        {best ? (<>
          <div className="pa4-s" style={{ margin: "0 8px 12px" }}>Requests from queries, by package</div>
          <div className="pa4-hs" data-pa4="landing">
            {ranked.map((r) => (
              <button key={r.pkg.id} type="button" className="pa4-paper" data-pa4="paper" data-id={r.pkg.id} onClick={() => navigate(`/queries/packages?pkg=${encodeURIComponent(r.pkg.id)}`)}>
                <span className="dear">Dear agent,</span><u style={{ width: "86%" }} /><u /><u style={{ width: "72%" }} />
                <span className={`m${r.pkg.id === best.pkg.id ? " hot" : ""}`}>{r.stat.requests} from {r.stat.sent}</span>
                <span className="pa4-b" style={{ display: "block", fontWeight: 600, overflowWrap: "anywhere" }}>{r.pkg.packageName}</span>
                <span className="pa4-s">{r.pkg.id === activeId ? "Going out now" : r.ranked ? plural(r.stat.responses, "reply", "replies") : `Fewer than ${MIN_SENDS_FOR_CLAIM} sent`}</span>
              </button>
            ))}
          </div>
        </>) : (
          <p className="pa4-b pa4-body" style={{ margin: "0 8px 16px" }} data-pa4="landing-early">
            This compares your packages once one has gone out {MIN_SENDS_FOR_CLAIM} times.
            {ranked[0] ? ` So far, ${ranked[0].pkg.packageName} has gone out ${ranked[0].stat.sent === 1 ? "once" : ranked[0].stat.sent === 2 ? "twice" : `${ranked[0].stat.sent} times`}.` : " Nothing has gone out with a package yet."}
          </p>
        )}
        <button type="button" className="pa4-card" style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", padding: 24, marginTop: 8, textAlign: "left" }} data-pa4="streak-card" onClick={() => navigate("/goals")}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <h2 className="pa4-h">{streak.weeks > 0 ? `${plural(streak.weeks, "week")} running` : "This week"}</h2>
            <span className="pa4-s">{streak.count} of your {plural(streak.target, "query", "queries")} this week</span>
          </span>
          {Array.from({ length: Math.min(streak.target, 5) }, (_, k) => <i key={k} className={`pa4-ck${k < streak.count ? "" : " off"}`}>{k < streak.count ? <Check /> : null}</i>)}
        </button>
        <div className="pa4-card" style={{ padding: "24px 24px 8px", marginTop: 16 }} data-pa4="wall">
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6 }} aria-hidden="true">{[-5, 4, -2].map((r) => <i key={r} style={{ display: "block", width: 40, height: 52, background: "var(--pa-paper)", boxShadow: "0 2px 6px rgba(31,38,51,.18)", transform: `rotate(${r}deg)`, borderTop: "6px solid var(--pa-rust)" }} />)}</div>
            <div style={{ flex: 1 }}><h2 className="pa4-h">Wall of no</h2><div className="pa4-s">{c.passed ? `${c.passed} so far` : "Nothing on it yet"}</div></div>
          </div>
          <p className="pa4-b pa4-body" style={{ marginBottom: 8 }}>Every no is proof you asked.</p>
          <Link4 sb pa4="open-wall" onClick={() => navigate("/queries/responses#wall")}>Open the wall</Link4>
        </div>
        <div className="pa4-card" style={{ padding: "0 24px", marginTop: 16 }} data-pa4="you-rows">
          {YOU_ROWS.map(([l, p]) => <button key={p} type="button" className="pa4-tap" data-pa4="you-row" data-path={p} onClick={() => navigate(p)}><span className="pa4-x pa4-b" style={{ fontWeight: 600 }}>{l}</span><Chev /></button>)}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
};
export { YOU_PATH };
