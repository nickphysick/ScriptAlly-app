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
                  {r.went ? <tspan className="n a13-rust" fontSize={15}>{r.went}</tspan> : null}
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

/* ── Response rate: two 100% share bars ── */
const ShareBar: React.FC<{ k: string; title: string; note: string; segs: { key: string; label: string; count: number; bucket: StateBucket }[]; missing: string }> = ({ k, title, note, segs, missing }) => {
  const mark = useMark();
  const W = 1200, H = 96, h = 40;
  const total = segs.reduce((n, s) => n + s.count, 0);
  let x = 0;
  return (
    <Fig k={k} title={title} note={note} population={total} missing={missing}
      keyItems={segs.map((s) => ({ label: `${s.count} ${s.label}`, swatch: <Sw fill={STATE_FILL[s.bucket]} /> }))}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="a13-svg" role="img" aria-label={title}>
        {segs.map((s) => {
          const w = (W * s.count) / total;
          const sx = x;
          x += w;
          return (
            <g key={s.key}>
              <rect x={sx + 1} y={0} width={Math.max(0, w - 2)} height={h} rx={3} fill={STATE_FILL[s.bucket]} stroke={EDGE}
                {...mark(`${s.count} · ${s.label}`, [`${Math.round((s.count / total) * 100)}% of ${total}`])} />
              {w > 30 ? <text className="n" x={sx + 12} y={h / 2 + 9} fontSize={24}>{s.count}</text> : null}
              {/* ⚠️ a label that would run past the bar's end is anchored to its segment's end instead
                  (measured: the last segment's label clipped at the figure's edge); a segment too narrow
                  for it leaves its name to the key beneath */}
              {w > 80 ? (sx + s.label.length * 7.4 > W
                ? <text className="ax" x={sx + w - 1} y={h + 26} textAnchor="end">{s.label.toUpperCase()}</text>
                : <text className="ax" x={sx + 1} y={h + 26}>{s.label.toUpperCase()}</text>) : null}
            </g>
          );
        })}
      </svg>
    </Fig>
  );
};

export const ShareBars: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const r = model.v13.rate;
  return (
    <>
      <ShareBar k="share-all" title={r.allTitle} note="share of all queries" segs={r.all} missing="no queries sent yet" />
      <ShareBar k="share-req" title={r.reqTitle} note="share of all requests" segs={r.req} missing="no requests yet" />
    </>
  );
};

/* ── Response window honesty: the stated window as a bar, the reply as a dot, a dotted rust leader when late ── */
export const ReplyWindow: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const r = model.v13.reply;
  const rowH = 32;
  const W = 1200, H = Math.max(160, r.rows.length * rowH + 50), x0 = 170, x1 = W - 30, per = (x1 - x0) / r.maxWeeks;
  const ticks: number[] = [];
  for (let w = 4; w <= r.maxWeeks; w += 4) ticks.push(w);
  return (
    <Fig k="reply" title="Stated window and actual reply" note={r.figNote} population={r.rows.length} missing="no replies against a stated window yet"
      keyItems={[
        { label: "Stated window the agent gives", swatch: <Sw line="bar" /> },
        { label: "Reply, coloured by what it was", swatch: <Sw dot fill={STATE_FILL.requested} /> },
        { label: "How late it came", swatch: <Sw line="dash" /> },
      ]}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="a13-svg" role="img" aria-label="Stated window and actual reply">
        {ticks.map((w) => (
          <g key={w}>
            <line x1={x0 + w * per} y1={0} x2={x0 + w * per} y2={H - 34} stroke={FAINT} />
            <text className="ax" x={x0 + w * per} y={H - 12} textAnchor="middle">{w} WEEKS</text>
          </g>
        ))}
        {r.rows.map((row, i) => {
          const y = 6 + i * rowH + rowH / 2;
          const title = row.sub ? `${row.name} · ${row.sub}` : row.name;
          return (
            <g key={row.id}>
              <text className="nm" x={0} y={y + 4}>{row.name}</text>
              <rect x={x0} y={y - 7} width={row.windowWeeks * per} height={14} rx={7} fill={STRUCT} opacity={0.85}
                {...mark(title, [`States ${row.windowWeeks} weeks`])} />
              {!row.inside ? <line x1={x0 + row.windowWeeks * per} y1={y} x2={x0 + row.replyWeeks * per} y2={y} stroke={RUST} strokeWidth={1.2} strokeDasharray="2 4" /> : null}
              <circle cx={x0 + row.replyWeeks * per} cy={y} r={8} fill={STATE_FILL[row.bucket]} stroke="var(--sp-ink)" strokeWidth={1.6}
                {...mark(title, [
                  `Said ${row.windowWeeks} weeks · replied in ${Math.round(row.replyWeeks * 10) / 10} (${row.inside ? "inside" : "after"} the window)`,
                  `Queried ${row.sentMs === null ? "undated" : dayMonth(row.sentMs)} · ${row.query.state}`,
                ])} />
            </g>
          );
        })}
      </svg>
    </Fig>
  );
};

/* ── Wait times by stage: range bars with a rust median tick, and a dot plot of weeks to an ending ── */
const GAP_ORDER = ["q-r", "r-s", "s-f", "f-o"] as const;
const GAP_LABEL: Record<string, string> = { "q-r": "Queried → requested", "r-s": "Requested → sent", "s-f": "Sent → full requested", "f-o": "Full → offer" };

export const StageGaps: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const gaps = GAP_ORDER.map((k) => model.v13.waits.gaps.find((g) => g.key === k)!);
  const population = gaps.reduce((n, g) => n + g.days.length, 0);
  const maxD = Math.max(95, ...gaps.flatMap((g) => g.days));
  const step = maxD > 180 ? 60 : 30;
  const W = 600, H = 260, x0 = 196, x1 = W - 84, per = (x1 - x0) / maxD, rowH = (H - 40) / 4;
  const ticks: number[] = [];
  for (let d = step; d <= maxD; d += step) ticks.push(d);
  return (
    <Fig k="stage" title="Stage to stage" note="in days" population={population} missing="no dated step from one stage to the next yet"
      keyItems={[{ label: "Fastest to slowest", swatch: <Sw line="bar" /> }, { label: "Median", swatch: <Sw line="med" /> }]}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="a13-svg" role="img" aria-label="Stage to stage, in days">
        {ticks.map((d) => (
          <g key={d}>
            <line x1={x0 + d * per} y1={0} x2={x0 + d * per} y2={H - 34} stroke={FAINT} />
            <text className="ax" x={x0 + d * per} y={H - 12} textAnchor="middle">{d} DAYS</text>
          </g>
        ))}
        {gaps.map((g, i) => {
          const y = 10 + i * rowH + rowH / 2;
          const n = g.days.length;
          return (
            <g key={g.key}>
              <text className="nm" x={0} y={y + 4}>{GAP_LABEL[g.key]}</text>
              {g.lo === null || g.hi === null || g.medianDays === null ? (
                <text className="nm a13-muted" x={x0} y={y + 4}>{DASH} {g.missing}</text>
              ) : (
                <>
                  <rect x={x0 + g.lo * per} y={y - 8} width={Math.max(8, (g.hi - g.lo) * per)} height={16} rx={8} fill={STRUCT} opacity={0.55}
                    {...mark(GAP_LABEL[g.key], [`Fastest ${g.lo} · median ${g.medianDays} · slowest ${g.hi} days`, `${n} ${n === 1 ? "query" : "queries"}`])} />
                  <line x1={x0 + g.medianDays * per} y1={y - 12} x2={x0 + g.medianDays * per} y2={y + 12} stroke={RUST} strokeWidth={2.4} />
                  <text className="n a13-rust" x={x0 + g.medianDays * per + 8} y={y - 14} fontSize={13}>{g.medianDays}d</text>
                  {n < 5 ? <text className="ax" x={x0 + Math.max(g.hi * per, 8) + 10} y={y + 4}>{n} {n === 1 ? "QUERY" : "QUERIES"}</text> : null}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </Fig>
  );
};

const END_LABEL: Record<string, string> = { rejected: "Rejected", noresponse: "No response", withdrawn: "Withdrawn", offer: "Offer" };

export const Endings: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const lanes = model.v13.waits.endings;
  const points = model.v13.waits.points;
  const population = Object.values(points).reduce((n, l) => n + l.length, 0);
  const maxW = Math.max(26, ...Object.values(points).flatMap((l) => l.map((p) => p.weeks)));
  const step = maxW > 52 ? 16 : 8;
  const W = 600, H = 260, x0 = 116, x1 = W - 10, per = (x1 - x0) / maxW, rowH = (H - 40) / 4;
  const ticks: number[] = [];
  for (let w = step; w <= maxW; w += step) ticks.push(w);
  return (
    <Fig k="endings" title="Weeks to an ending" note={model.endings.undatedClosed ? `one dot per closed query · ${model.endings.undatedClosed} undated not drawn` : "one dot per closed query"}
      population={population} missing="no query has reached an ending yet"
      keyItems={[{ label: "Closed", swatch: <Sw dot fill={STATE_FILL.closed} /> }, { label: "Offer", swatch: <Sw dot fill={STATE_FILL.offer} /> }, { label: "Median", swatch: <Sw line="med" /> }]}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="a13-svg" role="img" aria-label="Weeks to an ending">
        {ticks.map((w) => (
          <g key={w}>
            <line x1={x0 + w * per} y1={0} x2={x0 + w * per} y2={H - 34} stroke={FAINT} />
            <text className="ax" x={x0 + w * per} y={H - 12} textAnchor="middle">{w} WEEKS</text>
          </g>
        ))}
        {lanes.map((l, i) => {
          const y = 10 + i * rowH + rowH / 2;
          const pts = points[l.key] ?? [];
          return (
            <g key={l.key}>
              <text className="nm" x={0} y={y + 4}>{END_LABEL[l.key]}</text>
              <line x1={x0} y1={y} x2={x1} y2={y} stroke={FAINT} />
              {pts.map((p) => (
                <circle key={p.q.id} cx={x0 + p.weeks * per} cy={y} r={7} fill={STATE_FILL[l.key === "offer" ? "offer" : "closed"]} stroke="var(--sp-ink)" strokeWidth={1.4}
                  {...mark(p.q.agency ? `${p.q.agent} · ${p.q.agency}` : p.q.agent, [`${END_LABEL[l.key]} · ${p.weeks} weeks from query to ending`, `Queried ${p.q.sentMs === null ? "undated" : dayMonth(p.q.sentMs)}`])} />
              ))}
              {l.medianWeeks !== null && pts.length > 0 ? <line x1={x0 + l.medianWeeks * per} y1={y - 12} x2={x0 + l.medianWeeks * per} y2={y + 12} stroke={RUST} strokeWidth={2.4} /> : null}
            </g>
          );
        })}
      </svg>
    </Fig>
  );
};

/* ── How things stand: one line per query against time, a rust TODAY line ── */
export const Lanes: React.FC<{ model: AnalyticsModel }> = ({ model }) => {
  const mark = useMark();
  const L = model.v13.lanes;
  const rows = L.rows;
  const rowH = 20, top = 30;
  const W = 1200, H = Math.max(200, top + rows.length * rowH + 30), x0 = 170, x1 = W - 30;
  const start = L.startMs ?? L.nowMs;
  const DAY = 86400000;
  const span = Math.max(1, (L.nowMs - start) / DAY);
  const per = (x1 - x0) / span;
  const xAt = (ms: number) => x0 + ((ms - start) / DAY) * per;
  const monthTicks: { ms: number; label: string }[] = [];
  const d = new Date(start); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1);
  const every = span > 400 ? 3 : 1;
  for (let i = 0; d.getTime() <= L.nowMs; d.setMonth(d.getMonth() + 1), i++) {
    if (i % every === 0) monthTicks.push({ ms: d.getTime(), label: dayMonth(d.getTime()).split(" ")[1] });
  }
  return (
    <Fig k="lanes" title="Every query against time" note={L.undated ? `hover a line for its dates and status · ${L.undated} undated not drawn` : "hover a line for its dates and status"}
      population={rows.length} missing="no dated queries yet"
      keyItems={[
        { label: "Still waiting", swatch: <Sw fill={STATE_FILL.queried} /> },
        { label: "Material requested", swatch: <Sw fill={STATE_FILL.requested} /> },
        { label: "Being read", swatch: <Sw fill={STATE_FILL.sent} /> },
        { label: "Offer", swatch: <Sw fill={STATE_FILL.offer} /> },
        { label: "Ended", swatch: <Sw fill={STATE_FILL.closed} /> },
        { label: "Today", swatch: <Sw line="med" /> },
      ]}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="a13-svg" role="img" aria-label="Every query against time">
        {monthTicks.map((m) => (
          <g key={m.ms}>
            <line x1={xAt(m.ms)} y1={18} x2={xAt(m.ms)} y2={H - 28} stroke={FAINT} />
            <text className="ax" x={xAt(m.ms) + 4} y={12}>{m.label.toUpperCase()}</text>
          </g>
        ))}
        {rows.map((q, i) => {
          const y = top + i * rowH + rowH / 2;
          const a = q.sentMs as number;
          const b = q.endMs ?? L.nowMs;
          return (
            <g key={q.id}>
              <text className="nm" x={0} y={y + 4}>{q.agent}</text>
              <rect x={xAt(a)} y={y - 5} width={Math.max(4, xAt(b) - xAt(a))} height={10} rx={5} fill={STATE_FILL[q.bucket]} stroke={EDGE}
                {...mark(q.agency ? `${q.agent} · ${q.agency}` : q.agent, queryLines(q, L.nowMs))} />
            </g>
          );
        })}
        <line x1={x1} y1={16} x2={x1} y2={H - 26} stroke={RUST} strokeWidth={2} />
        <text className="ax a13-rust" x={x1 - 4} y={H - 8} textAnchor="end">TODAY</text>
      </svg>
    </Fig>
  );
};
