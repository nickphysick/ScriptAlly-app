/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v13 — the figures (design-refs/analytics-v13.html), ported from the ref's SVG.
 *
 * ⚠️ A MARK THAT IS A QUERY TAKES THAT QUERY'S STATUS FILL — the five `--state-*` tokens and nothing
 * else. Anthracite and rust are STRUCTURE ONLY: the funnel's bars, the stated window, the median ticks,
 * today's line. No burgundy anywhere, no red, no gridlines — a baseline, faint ticks at round numbers,
 * mono-caps axis labels and Special Elite counts.
 *
 * ⚠️ EVERY MARK CARRIES A TOOLTIP (`useMark`) with the agent, the agency, the dates and the status.
 *
 * ⚠️ A FIGURE WHOSE POPULATION IS ZERO DRAWS NO MARKS AND SAYS WHAT IS MISSING (the thin-sample rule);
 * it never hides itself.
 */
import React from "react";
import { AnalyticsModel, DASH, STATE_FILL, StateBucket, V13Query, dayMonth } from "../../lib/analyticsModel";
import { useMark } from "./A13Frame";

const STRUCT = "var(--sp-anthracite)";
const RUST = "var(--o-ms)";
const FAINT = "var(--shell-rule)";
const EDGE = "var(--shell-hairline)";

/** A figure under a single dark rule: a typewriter title, a small grey note, then the drawing and its key. */
export const Fig: React.FC<{ k: string; title: string; note: string; population: number; children: React.ReactNode; keyItems?: { label: string; swatch: React.ReactNode }[]; missing?: string }> = ({ k, title, note, population, children, keyItems, missing }) => (
  <div className="a13-fig" data-a13="fig" data-key={k} data-population={population}>
    <div className="a13-fh"><h3 className="a13-tw">{title}</h3><small>{note}</small></div>
    {population === 0 ? <p className="a13-none"><span className="a13-tw a13-dash">{DASH}</span>{missing ?? "nothing to draw yet"}</p> : children}
    {keyItems && keyItems.length && population > 0 ? (
      <div className="a13-key">{keyItems.map((i) => <span key={i.label}>{i.swatch}{i.label}</span>)}</div>
    ) : null}
  </div>
);

export const Sw: React.FC<{ fill?: string; dot?: boolean; line?: "dash" | "med" | "bar" }> = ({ fill, dot, line }) => {
  if (line === "dash") return <i className="a13-sw a13-sw--dash" />;
  if (line === "med") return <i className="a13-sw a13-sw--med" />;
  if (line === "bar") return <i className="a13-sw a13-sw--bar" />;
  return <i className={`a13-sw${dot ? " a13-sw--dot" : ""}`} style={{ background: fill }} />;
};

export const STATE_KEY: { b: StateBucket; label: string }[] = [
  { b: "queried", label: "Still waiting for a reply" },
  { b: "requested", label: "Material requested" },
  { b: "sent", label: "Material sent" },
  { b: "offer", label: "Offer" },
  { b: "closed", label: "Closed" },
];

const when = (ms: number | null) => (ms === null ? "undated" : dayMonth(ms));
export const queryLines = (q: V13Query, nowMs: number): string[] => {
  const end = q.endMs !== null ? ` · ended ${when(q.endMs)}` : q.sentMs !== null ? ` · ${Math.floor((nowMs - q.sentMs) / 86400000)} days so far` : "";
  return [`Queried ${when(q.sentMs)} · ${q.state}${end}`];
};
const titleOf = (q: V13Query) => (q.agency ? `${q.agent} · ${q.agency}` : q.agent);

/* ── Fall-off by stage: a stepped-row funnel, a dotted join between the bar ends ── */
export const Funnel: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const f = model.v13.funnel;
  const W = 1200, H = 360, x0 = 340, x1 = W - 10, rowH = H / 4, bh = 34;
  const top = Math.max(1, f.rows[0].count);
  const width = (n: number) => Math.max(28, ((x1 - x0) * n) / top);
  return (
    <Fig k="funnel" title="Queries by the furthest stage reached" note={f.figNote} population={model.v13.sent} missing="no queries sent yet">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="a13-svg" role="img" aria-label="Queries by the furthest stage reached">
        {f.rows.map((r, i) => {
          const y = i * rowH;
          const w = width(r.count);
          const cy = y + rowH / 2;
          const next = f.rows[i + 1];
          return (
            <g key={r.name}>
              <text className="n" x={0} y={cy + 16} fontSize={46}>{r.display}</text>
              <text className="ax" x={92} y={cy - 6}>{r.name.toUpperCase()}</text>
              <text className="nm" x={92} y={cy + 14}>{r.desc}</text>
              {r.count > 0 ? (
                <rect x={x0} y={cy - bh / 2} width={w} height={bh} rx={4} fill={STRUCT} opacity={1 - i * 0.18}
                  {...mark(`${r.count} · ${r.name}`, [r.desc, ...(i > 0 && f.rows[i - 1].count > 0 ? [`${Math.round((r.count / f.rows[i - 1].count) * 100)}% of the previous stage`] : [])])} />
              ) : null}
              {i === 0 && f.since && r.count > 0 ? (
                <text className="n a13-oninverse" x={x0 + w - 10} y={cy + 5} textAnchor="end" fontSize={14}>{f.since}</text>
              ) : null}
              {i > 0 && (r.went || r.note) ? (
                <text x={x0 + (r.count > 0 ? w : 0) + 16} y={cy + 5}>
                  {r.went ? <tspan className="n" fontSize={15} fill={RUST}>{r.went}</tspan> : null}
                  {r.note ? <tspan className="nm a13-muted" dx={r.went ? 12 : 0}>{r.note}</tspan> : null}
                </text>
              ) : null}
              {next && next.count > 0 && r.count > 0 ? (
                <>
                  <path d={`M${x0} ${cy + bh / 2} L${x0} ${cy + rowH - bh / 2}`} stroke={FAINT} />
                  <path d={`M${x0 + w} ${cy + bh / 2 + 2} L${x0 + width(next.count)} ${cy + rowH - bh / 2 - 2}`} stroke={EDGE} strokeDasharray="2 4" fill="none" />
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
    </Fig>
  );
};

/* ── Queries sent: one block per query, stacked by month, in its status fill today, with the count above ── */
export const Volume: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const v = model.v13.sentByMonth;
  const W = 1200, H = 300, base = H - 40, gap = 22;
  const n = Math.max(1, v.months.length);
  const g = n > 14 ? 10 : gap;
  const bw = (W - g * (n - 1)) / n;
  const max = Math.max(1, ...v.months.map((m) => m.items.length));
  /* the ref's 48px block, smaller when a month holds more than the figure's height allows */
  const unit = Math.min(48, (base - 34) / max);
  const population = v.months.reduce((s, m) => s + m.items.length, 0);
  return (
    <Fig k="volume" title="Queries sent, month by month" note={v.undated ? `one block per query · ${v.undated} undated not drawn` : "one block per query"}
      population={population} missing="no dated queries yet"
      keyItems={STATE_KEY.map((s) => ({ label: s.label, swatch: <Sw fill={STATE_FILL[s.b]} /> }))}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="a13-svg" role="img" aria-label="Queries sent each month">
        <line x1={0} y1={base} x2={W} y2={base} stroke="var(--sp-ink)" strokeWidth={1} />
        {v.months.map((m, i) => {
          const x = i * (bw + g);
          let y = base;
          return (
            <g key={m.key}>
              {m.items.map((q) => {
                y -= unit;
                return <rect key={q.id} x={x} y={y + Math.min(3, unit * 0.08)} width={bw} height={unit - Math.min(6, unit * 0.16)} rx={3}
                  fill={STATE_FILL[q.bucket]} stroke={EDGE} {...mark(titleOf(q), queryLines(q, model.v13.lanes.nowMs))} />;
              })}
              <text className="ax" x={x + bw / 2} y={base + 22} textAnchor="middle">{m.label.toUpperCase()}</text>
              {m.items.length ? <text className="n" x={x + bw / 2} y={y - 8} fontSize={20} textAnchor="middle">{m.items.length}</text> : null}
            </g>
          );
        })}
      </svg>
    </Fig>
  );
};
