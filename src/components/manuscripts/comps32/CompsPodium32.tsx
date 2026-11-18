/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v32 §D: the podium — the top three comps (`podiumOf`) as paper cards on three typewriter-numbered
 * steps, standing on the page itself on a navy base that carries the heading (the ref's `.pod`, `.pcard`, `.pstep`,
 * `.pmark`, `.plinth`). Columns read 2nd · 1st · 3rd, bottoms aligned; equal rates share a place and say "equal".
 *
 * ⚠️ PLACES ARE `podiumOf`'s (lib/compsShelf), percentages `compRate`'s. Nothing here ranks or counts.
 * ⚠️ ONE NAVY ON THE PAGE: the 1st step, the base and the postmark are the header's own #2a3a52. No rust for a result.
 */
import React from "react";
import { READY_AT, type PodiumPlace } from "../../../lib/compsShelf";
import { Ic32, Postmark32 } from "./marks32";

const ORD = ["1st", "2nd", "3rd"] as const;
/** the columns' order on screen: 2nd, 1st, 3rd (indices into `podiumOf`'s list) */
const COLUMNS = [1, 0, 2] as const;
export const PODIUM_SUB = "Your top three, by the share of agents who asked for more.";
export const PODIUM_NONE = `Nothing to rank yet. Send ${READY_AT} queries with a letter that mentions comps and your top three will show here.`;
export const PODIUM_SPARE = `No comp here yet. A comp needs ${READY_AT} queries to be ranked.`;

export const CompsPodium32: React.FC<{
  places: PodiumPlace[];
  /** the letter name each comp was sent in, when there is one */
  sentIn: (key: string) => string;
  onOpen: (key: string) => void;
}> = ({ places, sentIn, onOpen }) => {
  const bare = places.length === 0;
  return (
    <section className={`cp32-res${bare ? " is-bare" : ""}`} data-cp="podium-sec" aria-labelledby="cp32-podium-h">
      <div className={`cp32-pod${bare ? " is-bare" : ""}`} data-cp="podium">
        {COLUMNS.map((i) => {
          const p = places[i];
          if (!p) {
            return (
              <div key={`spare-${i}`} className={`cp32-podc is-p${i + 1} is-off`} data-cp="podium-spare" data-slot={i + 1}>
                {bare ? null : <span className="cp32-pcard" data-cp="podium-spare-line">{PODIUM_SPARE}</span>}
                <span className="cp32-pstep" data-cp="podium-step">{i + 1}</span>
              </div>
            );
          }
          const r = p.row;
          return (
            <button key={r.key} type="button" className={`cp32-podc is-p${p.place}`} data-cp="podium-col" data-key={r.key}
              data-place={p.place} data-slot={i + 1} data-cx-key={`pod:${r.key}`}
              aria-label={`${ORD[p.place - 1]}${p.equal ? " equal" : ""}: ${r.comp.title}, ${p.pct}% asked for more`}
              onClick={() => onOpen(r.key)}>
              <span className="cp32-pcard">
                <Postmark32 pct={p.pct} />
                <span className="cp32-rdisc" aria-hidden="true"><Ic32 n={r.kind} /></span>
                <b data-cp="podium-title">{r.comp.title}</b>
                <span>{[r.comp.author?.trim(), r.comp.year ? String(r.comp.year) : ""].filter(Boolean).join(" · ")}</span>
                <span className="cp32-pres" data-cp="podium-res">{r.askedForMore} of {r.queries.length} agents asked for more</span>
                <span data-cp="podium-letters">{sentIn(r.key)}</span>
              </span>
              <span className="cp32-pstep" data-cp="podium-step">{p.place}{p.equal ? <small data-cp="podium-equal">equal</small> : null}</span>
            </button>
          );
        })}
      </div>
      <div className="cp32-plinth" data-cp="plinth"><h2 className="cp32-plh" id="cp32-podium-h">The podium</h2></div>
      <p className="cp32-plinth-s" data-cp="podium-sub">{bare ? PODIUM_NONE : PODIUM_SUB}</p>
    </section>
  );
};
