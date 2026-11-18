/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v6 — "Compare your versions" (the ref's `league()` on its live path, `S.co = 8`): one framed card with a stone
 * band (illustration slot, title, the line naming the minimum, the Each to its own scale / Same scale switch); three
 * measure tiles; then one funnel card per version, ranked versions first.
 *
 * ⚠️ ORDER AND RANKING ARE lib/versionsV2's `rated` RULE AND `leagueOrder` (via lib/versionsV6's compareOrder); a tile
 *    names `leaderFor`, the first ranked card under its measure, so a tile and the cards can never disagree.
 * ⚠️ THE SCALE IS NOT STORED: the page opens on "Each to its own scale" every time.
 * ⚠️ EVERY FUNNEL STARTS ON ONE LINE: the card head has a fixed height whatever the name's length (C2).
 */
import React from "react";
import { MIN_SENT_FOR_RATE, type VersionFacts, type VersionsModel } from "../../../lib/versionsV2";
import { MEASURES, compareOrder, factsCounts, leaderFor, toRank, type MeasureKey } from "../../../lib/versionsV6";
import { BandsFunnel, Disc, InUseTag, V6Frame, V6Seg } from "./V6Parts";

export type Scale = "own" | "same";

const TILE: Record<MeasureKey, { label: string; fig: (f: VersionFacts) => string }> = {
  rate: { label: "Highest request rate", fig: (f) => `${f.ratePct}%` },
  sent: { label: "Most sent", fig: (f) => `${f.n} ${f.n === 1 ? "query" : "queries"}` },
  fast: { label: "Fastest replies", fig: (f) => (f.avgReply != null ? `${f.avgReply} ${f.avgReply === 1 ? "day" : "days"}` : "–") },
};
/** The figure at a card's foot under the chosen measure (the ref's FIG, first two parts). */
const FOOT: Record<MeasureKey, (f: VersionFacts) => [string, string]> = {
  rate: (f) => [`${f.ratePct}%`, "asked for more"],
  sent: (f) => [String(f.n), f.n === 1 ? "query sent" : "queries sent"],
  fast: (f) => (f.avgReply != null ? [`${f.avgReply} ${f.avgReply === 1 ? "day" : "days"}`, "average reply"] : ["–", "no replies yet"]),
};
const ORD = (i: number) => String(i + 1);

export interface V6CompareProps { m: VersionsModel; sel: string | null; measure: MeasureKey; scale: Scale; onMeasure: (k: MeasureKey) => void; onScale: (s: Scale) => void; onPick: (id: string) => void }

export const V6Compare: React.FC<V6CompareProps> = ({ m, sel, measure, scale, onMeasure, onScale, onPick }) => {
  const fs = m.live.map((v) => m.facts.get(v.id)!).filter(Boolean);
  const { ranked, unranked } = compareOrder(fs, measure);
  const enough = ranked.length >= 2;
  const maxSent = Math.max(1, ...fs.map((f) => f.n));
  return (
    <section className="v6-res" id="v6-res" data-vv6="compare" aria-labelledby="v6-res-h">
      <V6Frame tone="stone" probe="compare-card" as="div" band={<>
        <div className="v6-bandl">
          <div className="v6-ph sm" aria-hidden="true" data-vv6="compare-art">Illustration</div>
          <div><h2 className="v6-bt" id="v6-res-h">Compare your versions</h2><p>Pick a measure to rank by. A version is ranked once it has {MIN_SENT_FOR_RATE} queries sent.</p></div>
        </div>
        {enough ? <V6Seg value={scale} onChange={onScale} label="Scale" probe="scale"
          options={[{ key: "own", label: "Each to its own scale" }, { key: "same", label: "Same scale" }] as const} /> : null}
      </>}>
        {enough ? (
          <>
            <div className="v6-tiles" role="group" aria-label="Rank by" data-vv6="tiles">
              {MEASURES.map((k) => {
                const b = leaderFor(fs, k)!;
                return (
                  <button key={k} type="button" className="v6-tile" data-vv6="tile" data-k={k} data-leader={b.v.id} aria-pressed={measure === k} onClick={() => onMeasure(k)}>
                    <small>{TILE[k].label}</small><b>{TILE[k].fig(b)}</b>
                    <span><Disc v={b.v} />{b.v.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="v6-fcs" data-vv6="fcards">
              {ranked.map((f, i) => {
                const [fig, word] = FOOT[measure](f);
                const use = f.v.id === m.inUse;
                return (
                  <button key={f.v.id} type="button" className={`v6-fc${f.v.id === sel ? " cur" : ""}`} data-vv6="fcard" data-id={f.v.id} data-rank={i + 1} onClick={() => onPick(f.v.id)}>
                    <span className="v6-fc-h" data-vv6="fc-head"><i>{ORD(i)}</i><Disc v={f.v} on={use} /><span><b>{f.v.name}</b>{use ? <InUseTag /> : null}</span></span>
                    <BandsFunnel c={factsCounts(f)} W={240} H={88} base={scale === "same" ? maxSent : f.n} gap="#f7f4ef" probe="fc-funnel" />
                    <span className="v6-fz"><span><b>{f.n}</b>sent</span><span><b>{f.replied.length}</b>replied</span><span><b>{f.more.length}</b>more</span><span><b>{f.full}</b>full</span></span>
                    <span className="v6-fc-f" data-vv6="fc-figure"><b>{fig}</b> {word}</span>
                  </button>
                );
              })}
              {unranked.map((f) => (
                <button key={f.v.id} type="button" className={`v6-fc un${f.v.id === sel ? " cur" : ""}`} data-vv6="fcard" data-id={f.v.id} data-rank="" onClick={() => onPick(f.v.id)}>
                  <span className="v6-fc-h" data-vv6="fc-head"><i>–</i><Disc v={f.v} on={f.v.id === m.inUse} /><span><b>{f.v.name}</b>{f.v.id === m.inUse ? <InUseTag /> : null}</span></span>
                  <span className="v6-mks" data-vv6="fc-marks" aria-label={`${f.n} of ${MIN_SENT_FOR_RATE} sent`}>
                    {Array.from({ length: MIN_SENT_FOR_RATE }, (_, k) => <i key={k} className={`v6-sq${k < f.n ? "" : " g"}`} data-ghost={k < f.n ? undefined : ""} />)}
                  </span>
                  <span className="v6-fc-f">Ranked after {toRank(f)} more {toRank(f) === 1 ? "query" : "queries"}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="v6-notyet" data-vv6="not-yet">
            <div className="v6-wait"><b>Not enough queries yet</b>A version is ranked once it has {MIN_SENT_FOR_RATE} queries sent. The comparison appears when two versions are ranked.</div>
            {[...ranked, ...unranked].map((f) => (
              <button type="button" key={f.v.id} className="v6-prog" data-vv6="prog" data-id={f.v.id} onClick={() => onPick(f.v.id)}>
                <Disc v={f.v} on={f.v.id === m.inUse} /><b>{f.v.name}</b>
                <span className="v6-segs" aria-hidden="true">{Array.from({ length: MIN_SENT_FOR_RATE }, (_, k) => <i key={k} className={k < f.n ? "on" : ""} />)}</span>
                <span className="v6-prog-n">{Math.min(f.n, MIN_SENT_FOR_RATE)} of {MIN_SENT_FOR_RATE} sent</span>
              </button>
            ))}
          </div>
        )}
      </V6Frame>
    </section>
  );
};
