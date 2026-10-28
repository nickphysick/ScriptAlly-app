/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The phone dashboard's last two sections (Dashboard on the phone v1, Part D; ref screens 02–03): the founding writer
 * row (v105's figures, from the writer's own `foundingStats` doc) and Recent (the activity feed's two newest entries).
 */
import React from "react";
import { ChevronRight } from "lucide-react";
import type { FeedEntry } from "../../../lib/dashFeed";
import type { DrawerEvent } from "../../../lib/dashFeedDrawer";
import { feedFamily } from "../v58/feedFamily";
import { BellGlyph, GearGlyph } from "../v58/Dash58Feed";
import { StatusDot } from "../../StatusDot";
import { useFoundingStats } from "../../../lib/foundingStats";
import { foundingRow, RECENT_ROWS } from "../../../lib/dashPhone";
import { EggNest, headFor } from "../v105/foundingArt";
import { dayMonth } from "../../../lib/dates";

export const PhoneFounding: React.FC<{ uid: string | null; onOpen: () => void }> = ({ uid, onOpen }) => {
  const { loading, stats } = useFoundingStats(uid);
  const row = foundingRow(stats);
  const head = headFor(row.tier);
  return (
    <button type="button" className={`dm1-found${loading ? " is-loading" : ""}`} data-dm1="founding" data-tier={row.tier} onClick={onOpen}>
      <span className="dm1-ftile" aria-hidden="true">{head ? <img src={head} alt="" draggable={false} /> : <EggNest className="dm1-nest" />}</span>
      <span className="dm1-ftxt">
        <span className="dm1-fttl" data-dm1="founding-title">Founding writer · {row.rank}</span>
        <span className="dm1-fline" data-dm1="founding-line">{loading ? " " : row.line}</span>
      </span>
      <ChevronRight className="dm1-chev" aria-hidden="true" />
    </button>
  );
};

const Disc: React.FC<{ e: FeedEntry }> = ({ e }) => {
  const family = feedFamily(e);
  return (
    <span className="dm1-rdisc dm1-fdisc" data-family={family} aria-hidden="true">
      {family === "housekeeping" ? <GearGlyph /> : family === "nudge" || !e.status ? <BellGlyph /> : <StatusDot status={e.status} overrideSize={22} decorative />}
    </span>
  );
};

/** Recent: the feed's two newest, in the feed drawer's own words (`drawerEvents`: its tag, then who, over the agency). */
export const PhoneRecent: React.FC<{ loading: boolean; events: readonly DrawerEvent[]; onFeed: () => void }> = ({ loading, events, onFeed }) => {
  const rows = events.slice(0, RECENT_ROWS);
  return (
    <section className="dm1-sec" data-dm1="recent" aria-labelledby="dm1-recent-h">
      <div className="dm1-sechead">
        <h2 id="dm1-recent-h" className="dm1-h">Recent</h2>
        <button type="button" className="dm1-link" data-dm1="feed-link" onClick={onFeed}>Activity feed</button>
      </div>
      {!loading && rows.length > 0 ? (
        <ul className="dm1-group dm1-rows" data-dm1="recent-rows">
          {rows.map(({ entry: e, tag }) => (
            <li key={e.id}>
              <div className="dm1-row dm1-rrow" data-dm1="recent-row" data-id={e.id}>
                <Disc e={e} />
                <span className="dm1-rtxt">
                  <span className="dm1-rttl">{tag}{e.who ? ` · ${e.who}` : ""}</span>
                  {(e.agency || e.provenance) && <span className="dm1-rline">{e.agency.split(" · ")[0] || e.provenance}</span>}
                </span>
                <time className="dm1-rdate">{dayMonth(e.at)}</time>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dm1-quiet" data-dm1="recent-none">{loading ? " " : "Nothing in the last thirty days."}</p>
      )}
    </section>
  );
};
