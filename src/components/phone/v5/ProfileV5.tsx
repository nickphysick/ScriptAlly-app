/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase G — PROFILE (no ref): v4's "You" page (YouV4, retired) re-laid under v5's header — "Profile" in the
 * typewriter face as Today, To do and Materials are, the book and "Since {first query} · day N" under it, the Settings
 * gear on the right. Below 768px; `/you` (PageRoutes `YouRoute`); a computer is sent to the dashboard.
 *   - the campaign figures (the Responses page's own counts, `pageCounts`) and "See the full picture" (Analytics);
 *   - the streak card (the Goals page's streak; it opens Streaks and goals) and the Wall of no ("Open the wall");
 *   - the founding writer card (FoundingCardV5, founding writers only; its buttons open the feedback sheet), then a
 *     row to Your notes;
 *   - rows for Responses, Your book, Corkboard and Settings (lib/phoneV5 `PROFILE_ROWS`).
 * ⚠️ WHAT LEFT: What's landing and the materials rows (Packages, Query letters, Synopses and comps) — they are the
 *    Materials tab now (Packages · Letters · Versions · Comps). Early days says words, not zeros (v4's rule, kept).
 */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { pageCounts, pctOf, respItems } from "../../../lib/responses";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { buildQcRows } from "../../../lib/qcSummary";
import { buildRows } from "../../../lib/analytics";
import { dayN, firstSentMs, streakLine } from "../../../lib/phoneV4";
import { dayMonth } from "../../../lib/dates";
import { PROFILE_ROWS, YOUR_NOTES_PATH } from "../../../lib/phoneV5";
import type { Activity } from "../../../types";
import { CAST, Check, Chev, IconBtn, LapCard, Link4 } from "../v4/V4Parts";
import { FoundingCardV5 } from "./FoundingCardV5";
import "../v4/phoneV4.css";
import "./phoneV5.css";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const ProfileV5: React.FC = () => {
  const navigate = useNavigate();
  const { queries, agents, activities, manuscripts, currentUser } = useScriptAllyDb();
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
  const early = c.replies === 0;
  const asked = pctOf(c.more, c.sent);
  const figs: [string, string][] = early
    ? [[String(c.sent), c.sent === 1 ? "query sent" : "queries sent"], [String(c.waiting), "with agents"]]
    : [[String(c.sent), c.sent === 1 ? "query sent" : "queries sent"], [String(c.more), "asked for more"], [asked != null ? `${asked}%` : "—", "request rate"]];

  return (
    <div className="pa4 pa5 pa5-prof" data-pa5="profile" data-pa4="you" data-early={early ? "1" : "0"}>
      <header className="pa5-hd pa5p-hd" data-pa5="profile-hd" data-pa4="you-hero">
        <img className="pa5-hd-sh" src={CAST.shadow} alt="" />
        <div className="pa5-hd-t">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="pa5-hd-h">Profile</h1>
            <div className="pa4-s pa5-hd-day pa5p-book" data-pa5="profile-book">{ms?.title?.trim() || "Your book"}</div>
            <div className="pa4-s pa5-hd-day" data-pa5="profile-since">{first != null ? `Since ${dayMonth(first)} · day ${dayN(first, nowMs)}` : "No queries sent yet"}</div>
          </div>
          <span style={{ marginRight: -12 }}><IconBtn label="Settings" n="gear" pa4="settings" onClick={() => navigate("/account")} /></span>
        </div>
      </header>
      <LapCard pa4="figures" style={early ? { padding: 24 } : undefined}>
        <div className="pa4-figs" data-pa4="figs">{figs.map(([n, l]) => <div key={l}><b data-pa4="fig">{n}</b><span className="pa4-s">{l}</span></div>)}</div>
        {early ? <p className="pa4-b pa4-body" style={{ marginTop: 24 }}>{c.sent ? "No replies yet." : "Nothing sent yet."}</p> : null}
        <Link4 sb pa4="full-picture" style={{ marginTop: early ? 16 : 24 }} onClick={() => navigate("/queries/analytics")}>See the full picture</Link4>
      </LapCard>
      <div className="pa4-inset">
        <button type="button" className="pa4-card" style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", padding: 24, marginTop: 16, textAlign: "left" }} data-pa4="streak-card" onClick={() => navigate("/goals")}>
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
        {/* the founding writer card (founding writers only), then Your notes — where every note sent shows how it's going */}
        <FoundingCardV5 uid={currentUser?.id ?? null} />
        <div className="pa4-card" style={{ padding: "0 24px", marginTop: 16 }}>
          <button type="button" className="pa4-tap" data-pa5="your-notes-row" data-path={YOUR_NOTES_PATH} onClick={() => navigate(YOUR_NOTES_PATH)}>
            <span className="pa4-x pa4-b" style={{ fontWeight: 600 }}>Your notes</span><Chev />
          </button>
        </div>
        <div className="pa4-card" style={{ padding: "0 24px", marginTop: 16 }} data-pa5="profile-rows">
          {PROFILE_ROWS.map((r) => (
            <button key={r.path} type="button" className="pa4-tap" data-pa5="profile-row" data-pa4="you-row" data-path={r.path} onClick={() => navigate(r.path)}>
              <span className="pa4-x pa4-b" style={{ fontWeight: 600 }}>{r.label}</span><Chev />
            </button>
          ))}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
};
