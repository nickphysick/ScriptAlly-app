/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4.1 — THE BIRDS-EYE CARD ON TODAY (design-refs/phone-app-v4-1/phone-today-v4-1.html, `bev`), in the ring
 * card's place. A still picture of the same engine as the full view:
 *   - the three counts (with you / with agents / gone quiet) are the ring card's own (`v3Counts`), each opening Queries;
 *   - the rows are the five most urgent open queries in the desktop drawer's own order (`bvdGroups`: past their date
 *     first, then soonest due), and each row's bars are the desktop timeline's own (`tlRow`);
 *   - a navy month band, today marked with a pill and one line through every row.
 * No dragging here: a row opens the full view scrolled to that query and expanded.
 * ⚠️ IT REPLAYS ONCE A DAY: the first time it scrolls into view each day the today line sweeps in while the bars draw
 *    (about 1.6s). The day is remembered in local storage; with reduced motion it never replays.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MONTHS_SHORT, dayMonth } from "../../../lib/dates";
import { tlRow, type TlBar } from "../../../lib/qcTimeline";
import { cardWindow, firstTimeToday, shortSay, urgentRows } from "../../../lib/phoneV41";
import type { QcRow } from "../../../lib/qcSummary";
import type { V3Counts, V3Query } from "../../../lib/phoneV3";
import { V3Glyph, statusFill } from "../v3/V3Parts";
import { CAST, I4, Link4 } from "./V4Parts";
import "./phoneV4.css";

/** one row's bars in a window, as percentages: the past stages faded, the current solid to today and paler to its
 *  date, and past the date the overrun line and the ring at today. Shared with the full view. */
export interface BarsIn { fromMs: number; toMs: number; nowMs: number }
export function barPieces(bars: readonly TlBar[], w: BarsIn): { past: { l: number; w: number; status: string }[]; cur: null | { l: number; rem: number; solid: number; status: string; over: null | { l: number; w: number } } } {
  const span = w.toMs - w.fromMs;
  const p = (ms: number) => Math.max(0, Math.min(100, ((ms - w.fromMs) / span) * 100));
  const past = bars.filter((b) => !b.current).map((b) => ({ l: p(b.fromMs), w: Math.max(0, p(b.toMs) - p(b.fromMs)), status: String(b.status) })).filter((x) => x.w > 0);
  const c = bars.find((b) => b.current);
  if (!c) return { past, cur: null };
  const l = p(c.fromMs), t = p(w.nowMs);
  /* past its date the bar ends at the date; the overrun line carries on to today */
  const end = p(c.overFromMs ?? c.toMs);
  return {
    past,
    cur: {
      l, rem: c.overFromMs != null ? 0 : Math.max(0, end - l), solid: Math.max(0, Math.min(t, end) - l), status: String(c.status),
      over: c.overFromMs != null ? { l: p(c.overFromMs), w: Math.max(0, t - p(c.overFromMs)) } : null,
    },
  };
}

const reduced = (): boolean => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

export const BirdsCardV41: React.FC<{ qs: readonly V3Query[]; c: V3Counts; next: V3Query | null; nowMs: number }> = ({ qs, c, next, nowMs }) => {
  const navigate = useNavigate();
  const rows = useMemo(() => urgentRows(qs.map((q) => q.row as QcRow), nowMs, 5), [qs, nowMs]);
  const win = useMemo(() => cardWindow(nowMs), [nowMs]);
  const tp = ((nowMs - win.fromMs) / (win.toMs - win.fromMs)) * 100;
  const months = useMemo(() => {
    const out: { l: number; w: number; label: string }[] = [];
    const d = new Date(win.fromMs); d.setDate(1); d.setHours(0, 0, 0, 0);
    for (; d.getTime() < win.toMs; d.setMonth(d.getMonth() + 1)) {
      const n = new Date(d); n.setMonth(n.getMonth() + 1);
      const a = Math.max(0, ((d.getTime() - win.fromMs) / (win.toMs - win.fromMs)) * 100), b = Math.min(100, ((n.getTime() - win.fromMs) / (win.toMs - win.fromMs)) * 100);
      if (b - a > 8) out.push({ l: a, w: b - a, label: MONTHS_SHORT[d.getMonth()] });
    }
    return out;
  }, [win]);

  /* the once-a-day replay, when the card first scrolls into view */
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); if (firstTimeToday("pa41.birds-card.replayed", Date.now())) setPlay(true); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const open = (id?: string) => navigate(`/queries?view=birds${id ? `&focus=${encodeURIComponent(id)}` : ""}`);
  const counts: ["you" | "agent" | "quiet", number, string, string][] = [
    ["you", c.you, "with you", "var(--pa-blush)"], ["agent", c.agent, "with agents", "var(--pa-ring-agent)"], ["quiet", c.quiet, "gone quiet", "var(--pa-ring-quiet)"],
  ];
  return (
    <div ref={ref} className={`pa4-card pa41-be${play ? " play" : ""}`} data-pa41="birds-card" data-play={play ? "1" : "0"}>
      <div className="pa41-be-hd">
        <div style={{ flex: 1, minWidth: 0 }}><h2 className="pa4-h">Birds-eye view</h2><div className="pa4-s">Every live query against its date</div></div>
        <img src={CAST.beHead} alt="" data-pa4="cast" />
      </div>
      <div className="pa41-be-st" data-pa41="card-counts">
        {counts.map(([k, n, l, col]) => (
          <button key={k} type="button" data-pa41="card-count" data-k={k} data-n={n} onClick={() => navigate(`/queries?court=${k}`)}>
            <b className="pa4-T">{n}</b><span className="pa4-s"><i style={{ background: col }} aria-hidden="true" />{l}</span>
          </button>
        ))}
      </div>
      {rows.length ? (<>
        <div className="pa41-be-rl" aria-hidden="true">
          <div className="pa41-be-m">{months.map((m) => <span key={m.label + m.l} style={{ left: `${m.l}%`, width: `${m.w}%` }}>{m.label}</span>)}</div>
          <b style={{ left: `${tp}%` }}>Today</b>
        </div>
        <div className="pa41-be-body" data-pa41="card-rows" data-n={rows.length}>
          <i className="pa41-be-now" data-pa41="card-now" style={{ left: `calc(16px + (100% - 32px) * ${tp / 100})` }} aria-hidden="true" />
          {rows.map((r, k) => {
            const pieces = barPieces(tlRow(r, nowMs).bars, { ...win, nowMs });
            const say = shortSay(r, nowMs, "past date");
            return (
              <button key={r.id} type="button" className="pa41-be-r" data-pa41="card-row" data-id={r.id} data-due={r.expectedMs ?? ""} data-past={say.past ? "1" : "0"}
                style={{ ["--k-d" as string]: `${k * 0.08}s` }} onClick={() => open(r.id)}>
                <span className="pa41-be-t">
                  <V3Glyph status={String(r.status)} size={28} label={false} />
                  <b className="pa41-be-nm">{r.agentName}</b>
                  <span className={`pa4-s pa4-T pa41-be-say${say.past ? " hot" : ""}`}>{say.text}</span>
                </span>
                <span className="pa41-be-tr" aria-hidden="true">
                  {pieces.past.map((b, i) => <i key={i} className="pa41-b past" style={{ left: `${b.l}%`, width: `${b.w}%`, background: statusFill(b.status) }} />)}
                  {pieces.cur ? (<>
                    <i className="pa41-b rem" style={{ left: `${pieces.cur.l}%`, width: `${pieces.cur.rem}%`, background: statusFill(pieces.cur.status) }} />
                    <i className="pa41-b" style={{ left: `${pieces.cur.l}%`, width: `${pieces.cur.solid}%`, background: statusFill(pieces.cur.status) }} />
                    {pieces.cur.over ? (<><i className="pa41-ov" style={{ left: `${pieces.cur.over.l}%`, width: `${pieces.cur.over.w}%` }} /><i className="pa41-bc" data-pa41="beacon" style={{ left: `${tp}%` }} /></>) : null}
                  </>) : null}
                </span>
              </button>
            );
          })}
        </div>
      </>) : <p className="pa4-b pa4-empty" style={{ padding: "0 24px 16px" }}>Nothing live to place on a date yet.</p>}
      {next ? (
        <div className="pa41-be-nx" data-pa4="next-reply"><I4 n="clock" style={{ width: 20, height: 20, color: "var(--pa-navy)" }} /><span className="pa4-s">Next reply expected: <b>{next.row.agentName}, by {dayMonth(next.replyMs as number)}</b></span></div>
      ) : null}
      <Link4 sb pa4="open-birds" style={{ padding: "0 24px" }} onClick={() => open()}>Open the Birds-eye view</Link4>
    </div>
  );
};
