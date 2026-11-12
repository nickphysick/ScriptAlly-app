/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase B — THE BIRDS-EYE BLOCK on Today's Queries tab (design-refs/phone-app-v5/phone-hub-v5.html
 * `beRender` with beP "B", `sumBar`, `mt`, `btrack`, `.bed-*`). Straight on the page: no card, no title, no art.
 * Below 768px only. It replaces v4.1's Birds-eye card on Today.
 *
 *   - The counts: a thin bar split in proportion, then the three figures (with you / with agents / gone quiet) — the
 *     ring card's own `v3Counts`. A figure filters the rows to its group and lifts onto a white tile; again, or "Show
 *     all", clears. A zero figure is greyed and cannot be tapped.
 *   - The rows: the desktop Birds-eye engine's own (`phoneGroups` → `beLine`, lib/qc150), nearest their date, up to
 *     eight. Each: the mini four-stage track, the surname, then a 12px bar (lib/phoneV5 `beTrack`). Past its date the
 *     bar carries on from the notch to today in a deeper tone — no line, no ring, no chip.
 *   - The window fits the rows on show (lib/phoneV5 `beWindow`). The today line runs from the pill to the last row, above
 *     the bars and below an opened row's detail; it lives right of the 116px name column only.
 *   - A row opens a detail under it (full name · agency, the one-line status, "Open" → the query page). One at a time.
 *   - The footer opens the full Birds-eye view, carrying the filter (`&court=`).
 * ⚠️ IT REPLAYS ONCE A DAY (v4.1's key, kept): the first time it scrolls into view each day the bars draw and the line
 *    slides in. With reduced motion it never plays (and phoneV4.css stops every animation under `.pa4`).
 * ⚠️ COPY: never "overdue" or "late" — the one-line status is v4.1's `longLabel` ("{Stage} · date was {date}").
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { beLine, type BeLine } from "../../../lib/qc150";
import { firstTimeToday, longLabel, phoneGroups } from "../../../lib/phoneV41";
import type { QcRow } from "../../../lib/qcSummary";
import type { V3Counts, V3Query } from "../../../lib/phoneV3";
import {
  BE_COUNT_WORDS, BE_COURTS, BE_FEW_LINE, beFooter, beLabel, beMonthLabels, beTrack, beViewPath, beWindow, cutRows,
  hasAsked, miniStage, surname, type BeCourt,
} from "../../../lib/phoneV5";
import { statusFill } from "../v3/V3Parts";
import { openV3Query } from "../v3/v3Store";
import "./phoneV5.css";

/** v4.1's once-a-day replay memory, kept */
export const BE_REPLAY_KEY = "pa41.birds-card.replayed";
const COURT_FILL: Record<BeCourt, string> = { you: "var(--pa-blush)", agent: "var(--pa-ring-agent)", quiet: "var(--pa-ring-quiet)" };

const reduced = (): boolean => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

/** the mini four-stage track (ref `mt`): four dots joined, filled to the current stage; the current a larger dot, or a
 *  hollow ring when the agent has asked for something */
const MiniTrack: React.FC<{ status: string }> = ({ status }) => {
  const n = miniStage(status), ring = hasAsked(status);
  const X = [5, 14, 23, 32];
  return (
    <svg className="pa5-mt" viewBox="0 0 37 14" role="img" aria-label={`Stage ${n + 1} of 4${ring ? ", the agent has asked" : ""}`} data-pa5="mini-track" data-stage={n} data-asked={ring ? "1" : "0"}>
      {X.slice(0, 3).map((x, i) => <line key={x} x1={x} y1="7" x2={X[i + 1]} y2="7" stroke={i < n ? "var(--pa-ink)" : "var(--pa-star-off)"} strokeWidth="1.5" />)}
      {X.map((x, i) => (i < n ? <circle key={x} cx={x} cy="7" r="2.5" fill="var(--pa-ink)" />
        : i === n ? (ring ? <circle key={x} cx={x} cy="7" r="3.5" fill="#fff" stroke="var(--pa-ink)" strokeWidth="2" data-pa5="mini-ring" /> : <circle key={x} cx={x} cy="7" r="4.5" fill="var(--pa-ink)" />)
        : <circle key={x} cx={x} cy="7" r="2.5" fill="var(--pa-star-off)" />))}
    </svg>
  );
};

interface Item { id: string; court: BeCourt; dueMs: number | null; line: BeLine; q: V3Query }

export const BirdsBlockV5: React.FC<{ qs: readonly V3Query[]; c: V3Counts; nowMs: number; initialFilter?: BeCourt | null }> = ({ qs, c, nowMs, initialFilter = null }) => {
  const navigate = useNavigate();
  const [f, setF] = useState<BeCourt | null>(initialFilter);
  const [open, setOpen] = useState<string | null>(null);

  /* the engine's open rows (closed dropped by the engine), each with its court from the ring card's own counts */
  const items = useMemo<Item[]>(() => {
    const byId = new Map(qs.map((q) => [q.id, q]));
    const out: Item[] = [];
    for (const e of phoneGroups(qs.map((q) => q.row as QcRow), nowMs).flatMap((g) => g.rows)) {
      const q = byId.get(e.row.id);
      if (!q || q.court === "closed") continue;
      const line = beLine(e, nowMs);
      out.push({ id: q.id, court: q.court, dueMs: line.dueMs, line, q });
    }
    return out;
  }, [qs, nowMs]);
  const { rows, cut } = useMemo(() => cutRows(items, f), [items, f]);
  const win = useMemo(() => beWindow(rows.map((r) => r.line), nowMs), [rows, nowMs]);
  const months = useMemo(() => beMonthLabels(win), [win]);
  const tp = ((nowMs - win.fromMs) / (win.toMs - win.fromMs)) * 100;

  /* the once-a-day replay, when the block first scrolls into view */
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); if (firstTimeToday(BE_REPLAY_KEY, Date.now())) setPlay(true); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* the today line never crosses a month label: a label under the line gives way (measured, so it holds at any text size) */
  const ruler = useRef<HTMLDivElement>(null);
  const [hide, setHide] = useState<ReadonlySet<number>>(() => new Set());
  useLayoutEffect(() => {
    const el = ruler.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const x = r.left + (r.width * tp) / 100;
      const next = new Set<number>();
      el.querySelectorAll<HTMLElement>("[data-pa5='be-month']").forEach((m) => {
        const b = m.getBoundingClientRect();
        if (x >= b.left - 3 && x <= b.right + 3) next.add(Number(m.dataset.ms));
      });
      setHide((p) => (p.size === next.size && [...next].every((k) => p.has(k)) ? p : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tp, months]);

  const pick = (k: BeCourt) => { setOpen(null); setF((p) => (p === k ? null : k)); };
  const total = f ? c[f] : c.you + c.agent + c.quiet;
  const sum = c.you + c.agent + c.quiet;

  return (
    <div ref={ref} className={`pa5-be${play ? " play" : ""}`} data-pa5="be" data-filter={f ?? ""} data-n={rows.length} data-play={play ? "1" : "0"}
      data-from={win.fromMs} data-to={win.toMs}>
      <div className="pa5-be-sm">
        <div className="pa5-be-sb" aria-hidden="true" data-pa5="be-bar">
          {sum > 0 ? BE_COURTS.filter((k) => c[k] > 0).map((k) => (
            <i key={k} data-k={k} style={{ flex: `${c[k]} 1 0`, background: COURT_FILL[k], opacity: f && f !== k ? 0.25 : 1 }} />
          )) : null}
        </div>
        <div className="pa5-be-sn">
          {BE_COURTS.map((k) => (
            <button key={k} type="button" className={f === k ? "on" : ""} aria-pressed={f === k} disabled={c[k] === 0}
              data-pa5="be-count" data-k={k} data-n={c[k]} onClick={() => pick(k)}>
              <b className="pa4-T">{c[k]}</b><span><i style={{ background: COURT_FILL[k] }} aria-hidden="true" />{BE_COUNT_WORDS[k]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="pa5-be-l">
        <span data-pa5="be-label">{beLabel(f, cut, rows.length)}</span>
        {f ? <button type="button" className="pa5-be-x" data-pa5="be-showall" onClick={() => { setOpen(null); setF(null); }}>Show all</button> : null}
      </div>
      <div className="pa5-be-b" data-pa5="be-rows" data-n={rows.length}>
        <div className="pa5-be-r" aria-hidden="true">
          <span />
          <div className="pa5-be-m" ref={ruler}>
            <strong data-pa5="be-pill" style={{ left: `${tp}%` }}>Today</strong>
            {months.map((m) => <em key={m.ms} data-pa5="be-month" data-ms={m.ms} style={{ left: `${m.l}%`, visibility: hide.has(m.ms) ? "hidden" : undefined }}>{m.label}</em>)}
          </div>
        </div>
        {rows.map((r) => {
          const tk = beTrack(r.line, win, nowMs);
          const op = open === r.id;
          const row = r.q.row;
          const cur = tk.cur;
          const past = !!r.line.cur?.overdue;
          return (
            <React.Fragment key={r.id}>
              <button type="button" className={`pa5-be-row${op ? " op" : ""}`} data-pa5="be-row" data-id={r.id} data-court={r.court}
                data-from={r.line.cur?.fromMs ?? ""} data-due={r.dueMs ?? ""} data-past={past ? "1" : "0"} data-status={String(row.status)}
                aria-expanded={op} aria-controls={op ? `pa5-be-d-${r.id}` : undefined} onClick={() => setOpen(op ? null : r.id)}>
                <span className="pa5-be-nm"><MiniTrack status={String(row.status)} /><b>{surname(row.agentName) || row.agentName}</b></span>
                <span className="pa5-be-tk" aria-hidden="true">
                  {tk.past.map((b, i) => <i key={i} className="pa5-be-p" style={{ left: `${b.l}%`, width: `${b.w}%`, background: statusFill(b.status) }} />)}
                  {cur ? (<>
                    {cur.rem > 0 ? <i className={`pa5-be-rm${cur.off ? " off" : ""}`} style={{ left: `${cur.l}%`, width: `${cur.rem}%`, background: statusFill(cur.status) }} /> : null}
                    <i className="pa5-be-s" data-pa5="be-solid" style={{ left: `${cur.l}%`, width: `${cur.solid}%`, background: statusFill(cur.status) }} />
                    {cur.deep ? <i className="pa5-be-dp" data-pa5="be-deep" style={{ left: `${cur.deep.l}%`, width: `${cur.deep.w}%`, background: statusFill(cur.status) }} /> : null}
                    {cur.notch != null ? <s data-pa5="be-notch" style={{ left: `${cur.notch}%` }} /> : null}
                  </>) : null}
                </span>
              </button>
              {op ? (
                <div className="pa5-be-d" id={`pa5-be-d-${r.id}`} data-pa5="be-detail" data-id={r.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pa4-b pa5-be-who"><b>{row.agentName}</b>{row.agency ? <span className="pa4-s"> · {row.agency}</span> : null}</div>
                    <div className="pa4-s pa5-be-say" data-pa5="be-say">{longLabel(row, nowMs)}</div>
                  </div>
                  <button type="button" className="pa5-be-o" data-pa5="be-open" onClick={() => openV3Query(r.id)}>Open ›</button>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
        {rows.length ? <i className="pa5-be-now" data-pa5="be-now" style={{ left: `calc(116px + (100% - 116px) * ${tp / 100})` }} aria-hidden="true" /> : null}
      </div>
      {rows.length < 3 ? <p className="pa4-s pa5-be-few" data-pa5="be-few">{BE_FEW_LINE}</p> : null}
      <button type="button" className="pa5-be-f" data-pa5="be-foot" data-court={f ?? ""} onClick={() => navigate(beViewPath(f))}>
        <span>{beFooter(total, f)}</span><span aria-hidden="true">›</span>
      </button>
    </div>
  );
};
