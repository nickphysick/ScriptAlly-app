/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2.1 — Tracking & performance before there's enough to compare (design-refs/versions-v2-1, S30; the mock's
 * `waitCard()`). Shown under the navy divider until two live versions have each gone out with 5 queries: what the
 * section will do, an estimate of when, each version's progress, and three faded examples of what comes.
 *
 * ⚠️ ONE THRESHOLD: the "5" in every line is MIN_SENT_FOR_RATE, and "sent" is each version's `n` (withdrawn excluded).
 * ⚠️ THE EXAMPLES ARE STATIC: no data, tagged EXAMPLE, so nothing here can be mistaken for a figure about the writer.
 * ⚠️ IT REPORTS. The estimate is arithmetic about the writer's own pace; nothing advises what to send or change (R14).
 */
import React from "react";
import type { Query } from "../../types";
import { MIN_SENT_FOR_RATE, READY_TO_COMPARE, warmNeed, warmOrder, warmPace, warmWeeks, type VersionsModel } from "../../lib/versionsV2";
import { Num } from "./v2Bits";

const ROWS = 5;
const q = (n: number) => (n === 1 ? "query" : "queries");

export const V2Warming: React.FC<{ m: VersionsModel; queries: readonly Query[]; today: string }> = ({ m, queries, today }) => {
  const fs = m.live.map((v) => m.facts.get(v.id)!);
  const ord = warmOrder(fs);
  const ready = fs.filter((f) => f.n >= MIN_SENT_FOR_RATE).length;
  const need = warmNeed(fs);
  const pace = warmPace(queries, today);
  const wk = warmWeeks(need, pace);
  return (
    <div className="wt" data-vv2="warming">
      <div className="wt-top">
        <div className="wt-art" aria-hidden="true"><span>Illustration<br /><small>A hawk keeping score with a stopwatch</small></span></div>
        <div className="wt-tx">
          <p className="oh-k">Warming up</p>
          <h3>This fills in once two versions have each gone out with {MIN_SENT_FOR_RATE} queries.</h3>
          <p>Then you’ll see which version gets agents asking for more: a card for every version, a league table, and how far each one gets. Until then, one or two replies can swing a percentage either way, so we wait for enough to go on.</p>
          {wk != null
            ? <p className="wt-eta" data-vv2="warm-eta"><b>About {wk} {wk === 1 ? "week" : "weeks"} away</b> at your pace: you sent {pace} {q(pace)} in the last 30 days, and {need} more {need === 1 ? "is" : "are"} needed.</p>
            : <p className="wt-eta" data-vv2="warm-eta"><b>{need} more {q(need)} needed.</b> Send with your versions and this fills in by itself.</p>}
        </div>
        <div className="wt-pg">
          <header data-vv2="warm-ready"><span>Progress</span>{" "}<b>{Math.min(ready, READY_TO_COMPARE)} of {READY_TO_COMPARE}</b> versions ready</header>
          <ul>
            {ord.slice(0, ROWS).map((f) => (
              <li key={f.v.id} className={f.n >= MIN_SENT_FOR_RATE ? "ok" : ""} data-vv2="warm-row">
                <span className={`vl-n${f.v.id === m.inUse ? " on" : ""}`}><Num v={f.v} /></span>
                <span className="wt-nm"><b>{f.v.name}</b><small>{f.n ? `${Math.min(f.n, 99)} sent` : "Not sent yet"}</small></span>
                <span className="wt-pp" aria-label={`${Math.min(f.n, MIN_SENT_FOR_RATE)} of ${MIN_SENT_FOR_RATE}`}>
                  {Array.from({ length: MIN_SENT_FOR_RATE }, (_, i) => <i key={i} className={i < f.n ? "on" : ""} />)}
                </span>
                <em>{f.n >= MIN_SENT_FOR_RATE ? "Ready" : `${MIN_SENT_FOR_RATE - f.n} to go`}</em>
              </li>
            ))}
          </ul>
          {ord.length > ROWS ? <p className="wt-more">and {ord.length - ROWS} more</p> : null}
        </div>
      </div>
      <p className="wt-k">What you’ll see here</p>
      <div className="wt-ex">
        <figure>
          <div className="wt-g g1" aria-hidden="true"><i className="d" /><b /><s /><u><em style={{ width: "40%" }} /></u><span><i /><i /><i /><i /><i /></span></div>
          <figcaption><b>A card for every version</b>Sort by asked for more, most sent or fastest replies.</figcaption>
        </figure>
        <figure>
          <div className="wt-g g2" aria-hidden="true">{[86, 62, 40, 24].map((w) => <p key={w}><i className="d" /><b /><u><em style={{ width: `${w}%` }} /></u></p>)}</div>
          <figcaption><b>A league table</b>Every version side by side, ranked by requests.</figcaption>
        </figure>
        <figure>
          <div className="wt-g g3" aria-hidden="true">
            <svg viewBox="0 0 120 70" aria-hidden="true">
              <path d="M8 4H112C108 14 96 18 92 22H28C24 18 12 14 8 4Z" fill="#d9d0c3" />
              <path d="M28 24H92C88 32 80 36 78 40H42C40 36 32 32 28 24Z" fill="#2a3a52" />
              <path d="M42 42H78C76 48 70 52 68 56H52C50 52 44 48 42 42Z" fill="#a2452a" />
              <path d="M52 58H68C66 62 64 64 64 67H56C56 64 54 62 52 58Z" fill="#ece6dc" />
            </svg>
          </div>
          <figcaption><b>How far each one gets</b>Sent, replied, asked for more, offers.</figcaption>
        </figure>
      </div>
    </div>
  );
};
