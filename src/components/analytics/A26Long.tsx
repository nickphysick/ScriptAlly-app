/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v26 §E — "How long do replies take?" (`replyTimes`) and "Do nudges work?" (`nudgeResults`).
 *
 * ⚠️ ONE AXIS IN WEEKS, 0 TO `slowest` (at least 8; 0 to 13 with no dated reply). A reply's mark sits at its week,
 *    stacked when two share one; a waiting query's at its weeks out. Waiting queries out longer than the slowest reply
 *    (`beyond`) sit in the boxed zone to the right of the axis. With no reply yet, the zone holds those out over 13.
 * ⚠️ THE BAND (the middle half of the replies) needs 4 replies; the dashed line sits at `typical`.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { A26Card, A26Go, A26KeyMark, A26Mark, A26Means } from "./A26Bits";
import type { A26Links } from "./A26Next";
import { wk, type NudgeResults, type ReplyTimes } from "../../lib/analyticsV26";

export const NO_REPLY_AXIS = 13;
export const MIN_AXIS = 8;
export const axisOf = (t: ReplyTimes): number => (t.slowest === null ? NO_REPLY_AXIS : Math.max(t.slowest, MIN_AXIS));
/** a week's place along the plotted part, as a percentage */
export const xOf = (w: number, axis: number): number => (Math.min(w, axis) / axis) * 94 + 3;
const STEP = 31;
function ticks(axis: number): number[] {
  const step = axis <= 14 ? 2 : axis <= 28 ? 4 : axis <= 56 ? 8 : 16;
  const out: number[] = [];
  for (let w = 0; w <= axis; w += step) out.push(w);
  return out;
}
/** the stack index of each item among those that share its week */
function stacked<T extends { weeks: number }>(xs: T[]): { x: T; i: number }[] {
  const seen = new Map<number, number>();
  return xs.map((x) => { const i = seen.get(x.weeks) ?? 0; seen.set(x.weeks, i + 1); return { x, i }; });
}

export const A26Long: React.FC<{ t: ReplyTimes; links: A26Links }> = ({ t, links }) => {
  const has = t.replies.length > 0;
  const axis = axisOf(t);
  const limit = t.slowest ?? NO_REPLY_AXIS;
  const inside = t.waiting.filter((w) => w.weeks <= limit);
  const outside = t.waiting.filter((w) => w.weeks > limit);
  const reps = stacked([...t.replies].sort((a, b) => a.weeks - b.weeks || a.id.localeCompare(b.id)));
  const waits = stacked(inside);
  const h1 = Math.max(136, 16 + Math.max(0, ...reps.map((r) => r.i + 1)) * STEP + 8);
  const h2 = Math.max(104, 18 + Math.max(0, ...waits.map((r) => r.i + 1)) * STEP);
  const hasBand = t.bandFrom !== null && t.bandTo !== null;
  const band = (probe: string) => (hasBand
    ? <span className="a26-tl-band" data-a26={probe} style={{ left: `${xOf(t.bandFrom as number, axis) - 2.5}%`, width: `${xOf(t.bandTo as number, axis) - xOf(t.bandFrom as number, axis) + 5}%` }} />
    : null);
  const typ = (label: boolean) => (t.typical !== null
    ? <span className="a26-tl-typ" data-a26={label ? "typical" : "typical-2"} data-a26-week={t.typical} style={{ left: `${xOf(t.typical, axis)}%` }}>{label ? <span>Usually {wk(t.typical)}</span> : null}</span>
    : null);
  const zone = t.slowest !== null ? `Longer than ${wk(t.slowest)}` : `Longer than ${wk(NO_REPLY_AXIS)}`;
  return (
    <A26Card band="bu" probe="long" title="How long do replies take?" aside="Counted from the day you sent each query">
      <div className="a26-pad">
        <p className="a26-lede" data-a26="long-lede">{has ? <>
          Replies usually reach you in about <b>{wk(t.typical as number)}</b>. The quickest took {wk(t.quickest as number)} and the slowest {wk(t.slowest as number)}.
        </> : <>No replies recorded yet, so there{"’"}s nothing to measure. Your waiting queries are shown below by how long they{"’"}ve been out.</>}</p>
        <div className="a26-tl" data-a26="timeline" data-a26-axis={axis}>
          <div className="a26-tl-row a26-tl-r1">
            <div className="a26-tl-l">Replies you{"’"}ve had<small>{has ? `${t.replies.length} so far` : "None yet"}</small></div>
            <div className="a26-tl-p">
              <div className="a26-tl-m" data-a26="plot-replies" style={{ height: h1 }}>
                {band("band")}{typ(true)}
                {reps.map(({ x, i }) => (
                  <A26Mark key={x.id} mark={x.mark} status={x.replyStatus} probe="reply-mark"
                    style={{ left: `${xOf(x.weeks, axis)}%`, bottom: 8 + i * STEP }} />
                ))}
              </div>
              <div className="a26-tl-x" style={{ height: h1 }} />
            </div>
          </div>
          <div className="a26-tl-row">
            <div className="a26-tl-l">Still waiting<small>{t.waiting.length} {t.waiting.length === 1 ? "query" : "queries"}</small></div>
            <div className="a26-tl-p">
              <div className="a26-tl-m" data-a26="plot-waiting" style={{ height: h2 }}>
                {band("band-2")}{typ(false)}
                {waits.map(({ x, i }) => (
                  <A26Mark key={x.id} mark={x.mark} probe="wait-mark" style={{ left: `${xOf(x.weeks, axis)}%`, bottom: 10 + i * STEP }} />
                ))}
              </div>
              <div className="a26-tl-x" data-a26="beyond-zone" style={{ minHeight: h2 }}>
                {outside.map((w) => <A26Mark key={w.id} mark={w.mark} probe="beyond-mark" />)}
              </div>
            </div>
          </div>
          <div className="a26-tl-ax">
            <span />
            <div>
              <div className="a26-tl-t" data-a26="ticks">{ticks(axis).map((w) => <i key={w} data-a26-tick={w} style={{ left: `${xOf(w, axis)}%` }}>{w}</i>)}</div>
              <div className="a26-tl-xl">{zone}</div>
            </div>
          </div>
          <p className="a26-tl-cap">Weeks since the query was sent</p>
        </div>
        <div className="a26-key">
          <span><A26KeyMark status={QueryStatus.PARTIAL_REQUESTED} />Asked to read more</span>
          <span><A26KeyMark status={QueryStatus.REJECTED} />Passed</span>
          <span><A26KeyMark status={QueryStatus.QUERIED} />Still waiting</span>
          {hasBand ? <span><i className="a26-sw" />When most of your replies came</span> : null}
        </div>
        <A26Means probe="long">
          {!has ? <p>The top row fills in with your first reply.</p>
            : t.beyond.length ? <>
              <p><b data-a26="beyond-n">{t.beyond.length} of your {t.waiting.length} waiting {t.waiting.length === 1 ? "query" : "queries"}</b> {t.beyond.length === 1 ? "is" : "are"} further out than any reply you{"’"}ve had. Your slowest reply took {wk(t.slowest as number)}.</p>
              <A26Go probe="long-beyond" onClick={links.queries}>{t.beyond.length === 1 ? "See it in Queries →" : `See those ${t.beyond.length} in Queries →`}</A26Go>
            </> : <p>All of your waiting queries are still inside the time replies have taken so far.</p>}
        </A26Means>
      </div>
    </A26Card>
  );
};

const dayWords = (d: number): string => (d === 0 ? "the same day" : `${d} ${d === 1 ? "day" : "days"} later`);
export const NUDGE_ROWS = 6;

export const A26Nudges: React.FC<{ n: NudgeResults; links: A26Links }> = ({ n, links }) => {
  const total = n.rows.length;
  const days = n.rows.map((r) => r.repliedDays).filter((d): d is number => d !== null);
  const min = days.length ? Math.min(...days) : 0, max = days.length ? Math.max(...days) : 0;
  const nudgeWord = (k: number) => (k === 1 ? "nudge" : "nudges");
  return (
    <A26Card band="sd" probe="nudges" title="Do nudges work?" aside={`${total} ${nudgeWord(total)} sent`}>
      <div className="a26-pad">
        <p className="a26-lede" data-a26="nudge-lede">{n.replied === 0
          ? <>None of your {total} {nudgeWord(total)} has had a reply yet.</>
          : <><b>{n.replied} of your {total} {nudgeWord(total)}</b> got a reply, {n.replied === 1 || min === max ? dayWords(min) : min === 0 ? `between the same day and ${max} days later` : `between ${min} and ${max} days later`}.</>}</p>
        <ul className="a26-nl">
          {n.rows.slice(0, NUDGE_ROWS).map((r) => (
            <li key={`${r.queryId}-${r.atMs}`} data-a26="nudge" data-a26-days={r.repliedDays ?? ""}>
              <span className={`a26-ndot${r.repliedDays !== null ? " a26-ndot--on" : ""}`} aria-hidden="true" />
              <span className="a26-nl-x"><b>{r.agent}</b>{r.agency && r.agency !== r.agent ? r.agency : null}</span>
              <span className="a26-nl-r" data-a26="nudge-r">{r.repliedDays !== null ? `Replied ${dayWords(r.repliedDays)}` : "No reply since"}</span>
            </li>
          ))}
        </ul>
        {n.due > 0 ? (
          <A26Means probe="nudges">
            <p><b data-a26="due-n">{n.due} waiting {n.due === 1 ? "query" : "queries"}</b> {n.due === 1 ? "is" : "are"} past {n.due === 1 ? "its" : "their"} nudge date and {n.due === 1 ? "hasn't" : "haven't"} been nudged.</p>
            <A26Go probe="nudges" onClick={links.queries}>{n.due === 1 ? "See it in Queries →" : `See those ${n.due} in Queries →`}</A26Go>
          </A26Means>
        ) : null}
      </div>
    </A26Card>
  );
};
