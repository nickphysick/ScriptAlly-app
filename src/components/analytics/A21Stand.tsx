/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v21 §G — HOW THINGS STAND (design-refs/analytics-v21/analytics-v21.html, `.sect-ws`): one workspace,
 * shaped like the Query Centre list sheet's top — an ink bar (an art slot rising out of it, the title, the lede,
 * "{n} your move" and "{n} waiting"), a chip strip (All · Still waiting · Being read · Offer · Ended, and the sort),
 * and v17's lanes in the white body. On the phone the bar and strip are not drawn and v17's banner stands.
 *
 * ⚠️ THE CHIPS' COUNTS ARE `standing` — the header card's own derivation — so the two cannot disagree; pressing one
 *    keeps that bucket's lanes and nothing else. The lane fills are the status fills, unchanged.
 * ⚠️ THE ART SLOT SHIPS EMPTY: a dashed placeholder with no caption until the art exists (`artSrc`).
 */
import React from "react";
import type { AnalyticsModel } from "../../lib/analyticsModel";
import type { StandingKey, V21 } from "../../lib/analyticsV21";
import { Section } from "./A17Frame";
import { Lanes } from "./A17Figures";
import type { V17Banner } from "../../lib/analyticsModel";

export const A21Stand: React.FC<{ model: AnalyticsModel; v21: V21; banner: V17Banner; artSrc?: string }> = ({ model, v21, banner, artSrc }) => {
  const [chip, setChip] = React.useState<StandingKey | null>(null);
  const [order, setOrder] = React.useState<"sent" | "activity">("sent");
  const only = React.useMemo(() => {
    if (!chip) return null;
    return new Set(v21.standing.find((r) => r.key === chip)?.ids ?? []);
  }, [chip, v21.standing]);
  const waiting = v21.standing.find((r) => r.key === "waiting")?.count ?? 0;
  const bar = (
    <div className="a21-ws" data-a21="ws">
      <div className="a21-wkbar" data-a21="ws-bar">
        <span className="a21-wkart" aria-hidden="true"><span data-a21="ws-art">{artSrc ? <img src={artSrc} alt="" /> : null}</span></span>
        <div className="a21-wkt"><h2>How things stand</h2><p>One line per query, from the day it went out to today or the day it ended</p></div>
        <span className="a21-sp" />
        {v21.yourMove > 0 ? <span className="a21-wpl r" data-a21="ws-move"><i aria-hidden="true" /><b>{v21.yourMove}</b> your move</span> : null}
        <span className="a21-wpl b" data-a21="ws-waiting"><i aria-hidden="true" /><b>{waiting === 0 ? "None" : waiting}</b> waiting</span>
      </div>
      <div className="a21-wkstrip" data-a21="ws-strip" role="group" aria-label="Show">
        <button type="button" className="a21-chip" aria-pressed={chip === null} data-a21="ws-chip" data-k="all" onClick={() => setChip(null)}>All {model.sent}</button>
        {v21.standing.map((r) => (
          <button key={r.key} type="button" className="a21-chip" aria-pressed={chip === r.key} data-a21="ws-chip" data-k={r.key}
            disabled={r.count === 0} onClick={() => setChip(chip === r.key ? null : r.key)}>
            {r.label} <em data-a21="ws-chip-n">{r.count}</em>
          </button>
        ))}
        <span className="a21-sp" />
        <button type="button" className="a21-chip ghost" data-a21="ws-sort" aria-label={`Sort by ${order === "sent" ? "date sent" : "latest activity"}; press for ${order === "sent" ? "latest activity" : "date sent"}`}
          onClick={() => setOrder(order === "sent" ? "activity" : "sent")}>
          Sort: {order === "sent" ? "Date sent" : "Latest activity"} {"⌄"}
        </button>
      </div>
    </div>
  );
  return (
    <Section sec={7} banner={banner} readings={model.v17.lanes.readings} tint wsBar={bar}>
      <Lanes model={model} only={only} order={order} activity={v21.activity} />
    </Section>
  );
};
