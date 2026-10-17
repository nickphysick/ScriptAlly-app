/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 S2 — BENCHMARKING. Two blocks: what you could expect by now (one stacked bar from `expectedByNow`,
 * a paragraph and three fixed cards), then how you compare with other writers (three You-against-Most-writers column
 * pairs, the verdicts from `benchmark`).
 *
 * ⚠️ "MOST WRITERS" IS `BENCHMARKS_QUERYTRACKER`, A FIXED ANCHOR, carried in `v.bench` / `v.anchors` and NEVER RESTATED here. No community data is
 *    collected or shown; the opt-in line in the caveat is copy only.
 * ⚠️ THE OVERDUE SEGMENT IS SAND WITH A 2px RUST INSET RING: rust marks time past what an agent said, and sand keeps
 *    the waiting status's meaning underneath it.
 */
import React from "react";
import { span, type Bench, type V24 } from "../../lib/analyticsV24";
import { DAY_MS } from "../../lib/analytics";
import { Block, type Reading } from "./A24Frame";

const ANTHRACITE = "#2a3a52";
export const RUST_RING = "inset 0 0 0 2px #b4553f";

export interface Seg { key: "replied" | "closed" | "overdue" | "inside"; n: number; fill: string; ink?: string; ring?: string; label: string }
export function s2Segments(v: V24): Seg[] {
  const e = v.expected;
  return [
    { key: "replied", n: e.replied, fill: ANTHRACITE, ink: "#fff", label: "Replied" },
    { key: "closed", n: e.closed, fill: "var(--state-closed)", label: "You closed or withdrew" },
    { key: "overdue", n: e.overdue, fill: "var(--state-queried)", ring: RUST_RING, label: "Overdue: past their time, still silent" },
    { key: "inside", n: e.inside, fill: "#fff", ink: "rgba(28, 19, 15, 0.6)", label: "Still inside their time" },
  ];
}

const WHEN = [
  ["First month", "Usually nothing. A reply this early is more often a request than a pass."],
  ["6 to 12 weeks", "Most replies that are coming arrive now. It is the time most agencies say they take."],
  ["Past 3 months", "A silence is most likely a no. Many agencies say so in their guidelines."],
] as const;

const PANELS: Record<Bench["key"], { title: string; note: string }> = {
  rate: { title: "Asked to read more", note: "Share of queries where the agent asked for more." },
  reply: { title: "Got any reply at all", note: "Of the queries past the time the agent gave." },
  sent: { title: "Queries sent so far", note: "How many queries a writer sends in all." },
};
const val = (n: number | null, unit: string) => (n === null ? "–" : `${n}${unit}`);

/** ⚠️ heights share one scale: the room left in the column once the value (22) and the label row (~24) and their gaps are taken */
const Panel: React.FC<{ b: Bench }> = ({ b }) => {
  const you = b.you ?? 0;
  const max = Math.max(you, b.typical, 1);
  const p = PANELS[b.key];
  return (
    <div className="a24-colp" data-a24="bench" data-k={b.key} data-verdict={b.verdict}>
      <h4>{p.title}</h4>
      <p>{p.note}</p>
      <div className="a24-cols">
        <div className="a24-col you" data-a24="col-you" data-v={b.you ?? ""}>
          <b>{val(b.you, b.unit)}</b>
          <i style={{ height: `calc((100% - 52px) * ${(you / max).toFixed(4)})` }} />
          <span>You</span>
        </div>
        <div className="a24-col typ" data-a24="col-typ" data-v={b.typical}>
          <b>{val(b.typical, b.unit)}</b>
          <i style={{ height: `calc((100% - 52px) * ${(b.typical / max).toFixed(4)})` }} />
          <span>Most writers</span>
        </div>
      </div>
      <div className="a24-verd" data-a24="verdict">{b.verdict}</div>
    </div>
  );
};

export function s2Readings(v: V24): Reading[] {
  const o = v.outcomes, m = v.monthly;
  const typical = Math.round(100 / v.anchors.requestRate);
  return [
    { fig: v.expected.overdue === 0 ? "None" : String(v.expected.overdue), line: "overdue: past the agent's time and still silent" },
    o.asked > 0
      ? { fig: `1 in ${Math.round(o.sent / o.asked)}`, line: `asked to read more; most writers see about 1 in ${typical}` }
      : { fig: "None", line: `asked to read more yet; most writers see about 1 in ${typical}` },
    m.firstMs !== null && m.lastMs !== null
      ? { fig: span((v.nowMs - m.firstMs) / DAY_MS), line: `your oldest query; the newest is ${span((v.nowMs - m.lastMs) / DAY_MS)} old` }
      : { fig: "None", line: "of your queries has a date sent" },
  ];
}

export const S2Body: React.FC<{ v: V24 }> = ({ v }) => {
  const e = v.expected, o = v.outcomes;
  const segs = s2Segments(v).filter((s) => s.n > 0);
  const out = e.noTime + e.undated;
  return (
    <>
      <Block title="What you could expect by now" aside="worked out from the time each agent says they take" probe="expect">
        {segs.length ? (
          <>
            <div className="a24-stack" data-a24="stack">
              {segs.map((s) => (
                <i key={s.key} data-a24="seg" data-k={s.key} data-n={s.n}
                  style={{ flex: `${s.n} 1 0`, background: s.fill, color: s.ink, boxShadow: s.ring ? `${s.ring}, inset 0 0 0 1px rgba(28, 19, 15, 0.14)` : undefined }}>{s.n}</i>
              ))}
            </div>
            <div className="a24-lg" data-a24="stack-key">
              {segs.map((s) => <span key={s.key}><em style={{ background: s.fill, boxShadow: s.ring }} />{s.label}</span>)}
            </div>
          </>
        ) : null}
        <p className="a24-exptxt" data-a24="expect-text">
          {e.past > 0 ? (
            <>
              <b>{e.past} of your {o.sent} queries</b> {e.past === 1 ? "is" : "are"} past the time the agent said they take, so you could reasonably have expected to hear about {e.past === 1 ? "it" : "those"}.
              {" "}{e.replied === 0 ? "None" : e.replied} did reply. {e.closed === 0 ? "None" : e.closed} you have closed yourself, and <b>{e.overdue} {e.overdue === 1 ? "is" : "are"} overdue</b> and still open.
              {e.inside > 0 ? ` The other ${e.inside} ${e.inside === 1 ? "is" : "are"} too recent to judge.` : ""}
            </>
          ) : e.inside > 0 ? <>None of your queries is past the time the agent said they take yet: all {e.inside} {e.inside === 1 ? "is" : "are"} too recent to judge.</> : <>None of your queries has an agent&rsquo;s stated time to judge it by.</>}
          {out > 0 ? ` ${out} ${out === 1 ? "has" : "have"} no stated time and ${out === 1 ? "is" : "are"} left out.` : ""}
        </p>
        <div className="a24-when" data-a24="when">
          {WHEN.map(([t, p]) => <div key={t}><b>{t}</b><p>{p}</p></div>)}
        </div>
      </Block>
      <Block title="How you compare with other writers" aside="against QueryTracker, where writers log their own queries" probe="compare">
        <div className="a24-colgrid">{v.bench.map((b) => <Panel key={b.key} b={b} />)}</div>
        <p className="a24-cav" data-a24="caveat">These figures are a rough guide, not a target. &ldquo;Most writers&rdquo; means writers who log their queries on QueryTracker, most of them querying US agents. Once enough QueryHawk writers have opted in, this will compare you with writers querying the same market and genre.</p>
      </Block>
    </>
  );
};
