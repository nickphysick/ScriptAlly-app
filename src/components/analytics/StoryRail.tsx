/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "The story so far" — a dated spine of this book's querying (Analytics v2a, the right rail).
 *
 * ⚠️ EVERY EVENT IS DERIVED (`storyEvents` in analyticsModel): the first query, the first request,
 * the first full, an offer, a change of query letter, the busiest month, the most recent full, and
 * today. Nothing is authored and nothing is stored, so the spine can never state an event the record
 * does not hold.
 *
 * ⚠️ A STATUS IS DRAWN BY `StatusDot` AND NOTHING ELSE. The two events that are not a status (a new
 * letter, the busiest month) take a plain sand disc, and today a dashed ring — neither pretends to
 * be a stage.
 *
 * ⚠️ NO COUNTS LINE IN THE TRAY — the title only. The hawk's head that peeks from the tray's corner
 * in the ref is an illustration slot with no artwork yet; absent art renders no slot and no
 * placeholder (the header's own rule), so the tray is the title on blush until it is drawn.
 */
import React from "react";
import { PageRail } from "../containers/PageRail";
import { StatusDot } from "../StatusDot";
import type { StoryEvent } from "../../lib/analyticsModel";

const Marker: React.FC<{ e: StoryEvent }> = ({ e }) => {
  if (e.dotStatus) return <StatusDot status={e.dotStatus} overrideSize={15} decorative />;
  if (e.kind === "today") return <span className="anv-mk anv-mk--today" aria-hidden="true" />;
  return <span className="anv-mk anv-mk--plain" aria-hidden="true" />;
};

/**
 * The rail's list on its own (living headers v3 §5): the exhibition draws it inside a STATIC box with the
 * rail's own classes, because `PageRail` listens to the window to size itself — page behaviour, not a
 * picture of it. One list, two hosts, so the picture cannot drift from the rail.
 */
export const StoryRailBody: React.FC<{ events: StoryEvent[] }> = ({ events }) => (
  <div className="anv-railbody">
    {events.length === 0 ? (
      <p className="anv-railnone">Nothing has happened in this period yet.</p>
    ) : (
      <ol className="anv-tl" data-anv="timeline">
        {events.map((e, i) => (
          <li
            key={`${e.kind}-${i}`}
            className={`anv-ev${e.kind === "today" ? " anv-ev--now" : ""}`}
            data-anv="event"
            data-kind={e.kind}
            data-at={e.atMs}
          >
            <span className="anv-evmk"><Marker e={e} /></span>
            <div className="anv-tw anv-evdate">{e.date}</div>
            <div className={`anv-evwhat${e.kind === "today" ? " anv-tw" : ""}`}>{e.what}</div>
            {e.who ? <div className="anv-evwho">{e.who}</div> : null}
            {e.gap ? <span className="anv-evgap">{e.gap}</span> : null}
          </li>
        ))}
      </ol>
    )}
  </div>
);

export const StoryRail: React.FC<{ events: StoryEvent[]; foot: string | null }> = ({ events, foot }) => (
  <PageRail
    label="The story so far"
    className="anv-rail"
    trayClassName="anv-railtray"
    fill
    dataAttrs={{ "data-anv": "rail" }}
    tray={<h2 className="anv-tw anv-railtitle">The story so far</h2>}
    foot={foot ? <p className="anv-railfoot" data-anv="railfoot">{foot}</p> : undefined}
  >
    <StoryRailBody events={events} />
  </PageRail>
);
