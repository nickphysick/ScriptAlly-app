/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — QUERIES (ref `vQueries`): a scrolling chip row with counts (All · With you · With the agent · Gone
 * quiet · Closed), then the rows grouped under those headings, one white card per group. The header's icon swaps the
 * list for Birds-eye. No tile band.
 *
 * ⚠️ THE COUNTS ARE lib/phoneV3's courts, the same figures Today's hero shows (PA3-4). A row says its status once
 *    (PA3-5): no band above it repeats the group.
 */
import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useV3Data } from "./V3Provider";
import { QueryRowV3 } from "./V3Parts";
import { V3HeaderIcon } from "./V3Chrome";
import { V3I } from "./v3Icons";
import { usePhoneBandExtra } from "../phoneBandStore";
import { COURT_LABEL, courtRows, V3_COURTS, type V3Court, type V3Query } from "../../../lib/phoneV3";
import { dayMonth } from "../../../lib/dates";
import { openV3Query } from "./v3Store";
import { PhoneTaskScreen } from "../../todo/phone/PhoneTaskScreen";
import "./phoneV3.css";

type Chip = V3Court | "all";
const CHIPS: Chip[] = ["all", "you", "agent", "quiet", "closed"];
const DAY = 86_400_000;
const isChip = (x: string | null): x is Chip => !!x && (CHIPS as string[]).includes(x);

/** Birds-eye's right-hand words: "12 days to go", "3 weeks to go", "past 3 Nov" (ref) */
function leftWords(q: V3Query, nowMs: number): string {
  if (q.replyMs == null) return "";
  const left = Math.round((q.replyMs - nowMs) / DAY);
  if (left < 0) return `past ${dayMonth(q.replyMs)}`;
  return `${left < 14 ? `${left} ${left === 1 ? "day" : "days"}` : `${Math.round(left / 7)} weeks`} to go`;
}

export const QueriesV3: React.FC = () => {
  const v = useV3Data();
  const loc = useLocation();
  const asked = new URLSearchParams(loc.search).get("court");
  const [chipPick, setChip] = useState<Chip | null>(null);
  const chip: Chip = chipPick ?? (isChip(asked) ? asked : "all");
  const [bird, setBird] = useState(false);
  const [task, setTask] = useState<string | null>(null);
  /* the header's one page icon: Birds-eye ⇄ List */
  usePhoneBandExtra("/queries", (
    <V3HeaderIcon label={bird ? "List view" : "Birds-eye view"} pa3="qview" pressed={bird} onClick={() => setBird((b) => !b)}>
      <V3I n={bird ? "list" : "eye"} />
    </V3HeaderIcon>
  ), [bird]);
  /* a fresh `?court=` from Today's hero wins over the chip last tapped here */
  const [seen, setSeen] = useState(asked);
  if (asked !== seen) { setSeen(asked); setChip(null); setBird(false); }

  const c = v.counts;
  const groups = useMemo(() => (chip === "all" ? V3_COURTS : [chip]).map((k) => ({ k, rows: courtRows(v.qs, k) })).filter((g) => g.rows.length), [chip, v.qs]);
  const waiting = useMemo(() => v.qs.filter((q) => q.replyMs != null).sort((a, b) => (a.replyMs! - b.replyMs!)), [v.qs]);
  const onVerb = (q: V3Query) => { if (q.task) setTask(q.task.key); };

  return (
    <div className="pa3 pa3-queries" data-pa3="queries" data-chip={chip} data-view={bird ? "bird" : "list"}>
      <div className="pa3-page">
        {bird ? (<>
          <p className="pa3-note" style={{ margin: "0 4px 12px" }}>How far each query is through the agent’s usual reply time.</p>
          <div className="pa3-card" data-pa3="birds">
            {waiting.length ? waiting.map((q) => {
              const pct = Math.max(4, Math.min(100, Math.round((q.gone ?? 0) * 100)));
              const past = (q.replyMs ?? 0) < v.now;
              return (
                <button key={q.id} type="button" className="pa3-be" data-pa3="be-row" onClick={() => openV3Query(q.id)}>
                  <div className="pa3-top">{q.row.agentName}<span>{leftWords(q, v.now)}</span></div>
                  <div className="pa3-bar"><i className={past ? "past" : ""} style={{ width: `${pct}%` }} /></div>
                </button>
              );
            }) : <div className="pa3-empty">Nothing is waiting on an agent’s reply.</div>}
          </div>
        </>) : (<>
          <div className="pa3-chips" role="tablist" data-pa3="chips">
            {CHIPS.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={chip === k} className={`pa3-chip${chip === k ? " on" : ""}`} data-pa3="chip" data-k={k} data-count={c[k]}
                onClick={() => setChip(k)}>{k === "all" ? "All" : COURT_LABEL[k]} <i>{c[k]}</i></button>
            ))}
          </div>
          {groups.length ? groups.map((g) => (
            <React.Fragment key={g.k}>
              {chip === "all" ? <div className="pa3-sec" data-pa3="qgroup" data-k={g.k}><h2 className="pa3-h2">{COURT_LABEL[g.k]}</h2><span className="pa3-n">{g.rows.length}</span></div> : null}
              <div className="pa3-card" data-pa3="qcard" data-k={g.k} style={chip === "all" ? undefined : { marginTop: 0 }}>
                {g.rows.map((q) => <QueryRowV3 key={q.id} q={q} onOpen={openV3Query} onVerb={onVerb} />)}
              </div>
            </React.Fragment>
          )) : (
            <div className="pa3-card"><div className="pa3-empty"><b>Nothing here</b>No queries match this filter.</div></div>
          )}
        </>)}
      </div>
      {task ? <PhoneTaskScreen core={v.core} tasks={v.ordered} startKey={task} now={v.now} onClose={() => setTask(null)} /> : null}
    </div>
  );
};
