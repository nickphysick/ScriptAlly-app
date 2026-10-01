/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ANALYTICS EXHIBITION (living headers v3 §5) — how the page looks once a few queries have come
 * back: the funnel the ref draws (Queried 27 → Partial requested 5 → Full requested 2 → Offer 1) in
 * ONE ink at four tints, beside the page's own story list (`StoryRailBody`) over the example model.
 *
 * ⚠️ IT REPLACES `AnvEmpty` — its "Nothing to count yet" card and the three tagged feature rows —
 * which are deleted, not left beside it. The ref draws the empty state as a heading, a sentence and
 * the exhibition, nothing between.
 *
 * ⚠️ THE PAGE'S TILES (`AnvFacts`) ARE NOT IN THE PICTURE, AND THAT IS DELIBERATE. The only sample
 * they can be fed is `exampleModel`, eleven invented queries; beside a funnel of twenty-seven they
 * would state two different totals in one picture. The funnel's numbers are the ref's.
 *
 * ⚠️ IT READS NOTHING LIVE. `exampleModel` runs the real `analyticsModel` over invented queries at a
 * FIXED clock, so the band is the same picture on every render; no store, no fetch, no listener. The
 * rail is a static box with the rail's own classes — `PageRail` listens to the window to size itself.
 */
import React from "react";
import { exampleModel } from "../../lib/analyticsExample";
import { LivingExhibition } from "../shell/LivingExhibition";
import { StoryRailBody } from "./StoryRail";

export const ANALYTICS_EXHIBIT_LABEL = "HOW THE PAGE LOOKS ONCE A FEW HAVE COME BACK";

/** The ref's funnel: label, count, bar width as a share of the first row. */
export const ANALYTICS_SAMPLE_FUNNEL: readonly (readonly [string, number, number])[] = [
  ["Queried", 27, 100],
  ["Partial requested", 5, 19],
  ["Full requested", 2, 8],
  ["Offer", 1, 4],
];
/** One ink, four tints — the depth down the funnel, never a second colour. */
const TINTS = [1, 0.62, 0.4, 0.24];
/** The sample's own clock — fixed, so the story list is the same picture on every render. */
const SAMPLE_NOW = Date.UTC(2026, 9, 1, 12);

export const AnalyticsExhibit: React.FC = () => {
  const model = React.useMemo(() => exampleModel(SAMPLE_NOW), []);
  return (
    <LivingExhibition label={ANALYTICS_EXHIBIT_LABEL}>
      <div className="lh-expg">
        <div className="lh-exmc">
          <div className="anv-card anv-exfunnel" data-anv="ex-funnel">
            <div className="anv-exfhead"><span>What became of {ANALYTICS_SAMPLE_FUNNEL[0][1]} queries</span><span>all time</span></div>
            {ANALYTICS_SAMPLE_FUNNEL.map(([label, n, w], i) => (
              <div className="anv-exfrow" key={label}>
                <span className="anv-exflbl">{label}</span>
                <span className="anv-exftrack"><span className="anv-exfbar" style={{ width: `${w}%`, opacity: TINTS[i] }} /></span>
                <b className="anv-exfn">{n}</b>
              </div>
            ))}
          </div>
        </div>
        <aside className="sa-prail anv-rail lh-exrail">
          <div className="sa-prail-tray anv-railtray"><h2 className="anv-tw anv-railtitle">The story so far</h2></div>
          <div className="sa-prail-body"><StoryRailBody events={model.story.events} /></div>
        </aside>
      </div>
    </LivingExhibition>
  );
};
