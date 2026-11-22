/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v26 §D — "Is it getting better?" (`rounds`: the dated queries in send order, three runs) and "Who says
 * yes?" (`whoSaysYes`: by the genre the agent lists first, and by whether a personal note went with the query).
 * Everyday only; with no rounds, Who says yes? takes the full width.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { A26Card, A26Go, A26KeyMark, A26Mark, A26Means } from "./A26Bits";
import type { A26Links } from "./A26Next";
import { ROUND_NAMES, type Fate, type Round, type WhoSaysYes, type YesRow } from "../../lib/analyticsV26";

/** asked first, then passed or closed, then waiting */
const ORDER: Record<Fate, number> = { reading: 0, offer: 0, readPassed: 0, passed: 1, closed: 1, withdrew: 1, waiting: 2 };
const askedFate = (f: Fate) => ORDER[f] === 0;

export const A26Better: React.FC<{ rounds: Round[]; links: A26Links }> = ({ rounds, links }) => (
  <A26Card band="st" probe="better" title="Is it getting better?" aside="Your queries in the order you sent them">
    <div className="a26-pad">
      <p className="a26-lede">How many agents asked for more in each run of {rounds[0].ids.length} queries.</p>
      <div className="a26-cmp">
        {rounds.map((r) => (
          <div className="a26-cm a26-rd" key={r.index} data-a26="round" data-a26-round={r.index} data-a26-n={r.ids.length} data-a26-asked={r.asked} data-a26-waiting={r.waiting}>
            <h3>{ROUND_NAMES[r.index]} {r.ids.length}<span>{r.months}</span></h3>
            <p className="a26-rd-n"><b>{r.asked}</b> of {r.ids.length}</p>
            <p className="a26-cm-n">asked for more</p>
            <div className="a26-mks">
              {[...r.marks].sort((a, b) => ORDER[a.fate] - ORDER[b.fate]).map((m) => (
                <A26Mark key={m.id} mark={m} size="sm" probe={askedFate(m.fate) ? "round-asked" : undefined} />
              ))}
            </div>
            <p className="a26-cm-n a26-rd-w">{r.waiting ? `${r.waiting} still waiting` : "All answered or closed"}</p>
          </div>
        ))}
      </div>
      <div className="a26-key">
        <span><A26KeyMark status={QueryStatus.PARTIAL_REQUESTED} />Asked for more</span>
        <span><A26KeyMark status={QueryStatus.REJECTED} />Passed or closed</span>
        <span><A26KeyMark status={QueryStatus.QUERIED} />Still waiting</span>
      </div>
      <A26Means probe="better">
        <p>Rounds with queries still waiting can still go up.</p>
        <A26Go probe="rounds" onClick={links.queries}>See each round in Queries →</A26Go>
      </A26Means>
    </div>
  </A26Card>
);

const YesBar: React.FC<{ r: YesRow; probe: string }> = ({ r, probe }) => (
  <div className="a26-pr" data-a26="yes" data-a26-yes={probe} data-a26-asked={r.asked} data-a26-sent={r.sent}>
    <span>{r.label}</span>
    <b>{r.asked} of {r.sent}</b>
    <em data-a26="track"><i data-a26="bar" style={{ width: `${(r.asked / r.sent) * 100}%`, background: "var(--a26-bar-4)" }} /></em>
  </div>
);

export const A26Who: React.FC<{ who: WhoSaysYes; links: A26Links }> = ({ who, links }) => {
  const notes = [who.byNote.withNote, who.byNote.without].filter((r): r is YesRow => r !== null);
  return (
    <A26Card band="bl" probe="who" title="Who says yes?" aside="Out of the agents you queried">
      <div className="a26-pad">
        <h3 className="a26-h3">By the genre the agent lists first</h3>
        {who.byGenre.length ? (
          <div className="a26-path">{who.byGenre.map((r) => <YesBar key={r.label} r={r} probe="genre" />)}</div>
        ) : (
          <p className="a26-lede" data-a26="no-genre">Not enough queries to any one genre yet.</p>
        )}
        <h3 className="a26-h3" style={{ marginTop: 28 }}>By whether you added a personal note</h3>
        <div className="a26-path">{notes.map((r) => <YesBar key={r.label} r={r} probe="note" />)}</div>
        {who.lead && who.unqueried > 0 ? (
          <A26Means probe="who">
            <p><b data-a26="unqueried">{who.unqueried} {who.unqueried === 1 ? "agent" : "agents"} on your list</b> {who.unqueried === 1 ? "takes" : "take"} {who.lead.toLowerCase()} and {who.unqueried === 1 ? "hasn't" : "haven't"} been queried yet.</p>
            <A26Go probe="agents" onClick={links.agents}>{who.unqueried === 1 ? "See them in Agents →" : `See those ${who.unqueried} in Agents →`}</A26Go>
          </A26Means>
        ) : null}
      </div>
    </A26Card>
  );
};
