/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CONTACT LIST'S DESK — three BADGE CARDS (header panel v2, Part D; ref design-refs/shell/header-panel-v2.html
 * `#cl`). The Query Centre v135 card's construction, ported value for value into contactDeskBadge.css: the figure in a
 * white disc breaking out of the card's top edge, a tinted strip with the title and an illustration slot, an inner
 * border, and a body of two tiles, a chart and one full-width line. All three cards are the SLATE court.
 *
 * ⚠️ BUILT BESIDE `QcDesk`, NOT LIFTED: the two badge desks are a lift candidate, and this pack does not lift them.
 * ⚠️ THE FIGURES ARE `deskModel`'s (lib/contactDesk), every one. The only new one is "added this month".
 * ⚠️ THE CHARTS ARE THE SHARED ONES (`shell/desk/DeskCard`: WeekBars, RingChart, BarChart), drawn in this card's chart
 *    box and coloured by this card's sheet. `DeskCard` itself is no longer used here; other pages still use it.
 * ⚠️ NO SELECTED STATE. Queried sets the list to Queried and Profiles opens Housekeeping, as built; the week card is
 *    not pressable. Accessible names and press labels are the ones the icon cards had.
 * ⚠️ THE BADGE IS A CHILD OF THE CARD, never of the strip: inside the strip the inner border paints across it.
 */
import React from "react";
import { BarChart, RingChart, WeekBars } from "../../shell/desk/DeskCard";
import type { DeskModel, MoM } from "../../../lib/contactDesk";
import { CONTACT_DESK_ART_PROFILES, CONTACT_DESK_ART_QUERIED, CONTACT_DESK_ART_WEEK, type ContactArt } from "./ContactOpenHeader";
import "./contactDeskBadge.css";

export type DeskCardKey = "week" | "queried" | "profiles";
export const DESK_BADGE_TITLE: Record<DeskCardKey, string> = { week: "Added this week", queried: "Queried", profiles: "Profiles complete" };
export const DESK_ART_LABEL = "Art to come";
const DESK_ART: Record<DeskCardKey, ContactArt | null> = { week: CONTACT_DESK_ART_WEEK, queried: CONTACT_DESK_ART_QUERIED, profiles: CONTACT_DESK_ART_PROFILES };

/** A review aid for the art slots, as on the Query Centre: `window.__SA_CONTACT_DESK_ART = { week: "/a.png" }` fills a
    slot in a build that is not production (HP2 D6). The MODE test is at this call site and is replaced at build time. */
function artFor(key: DeskCardKey): string | null {
  if (import.meta.env.MODE !== "production" && typeof window !== "undefined") {
    const o = (window as unknown as { __SA_CONTACT_DESK_ART?: Partial<Record<DeskCardKey, string>> }).__SA_CONTACT_DESK_ART;
    if (o?.[key]) return o[key]!;
  }
  return DESK_ART[key]?.src ?? null;
}

interface Tile { n: number; text: string; hot?: boolean }

const BadgeCard: React.FC<{
  probe: DeskCardKey;
  figure: string;
  label: string;
  tiles: [Tile, Tile];
  mom: MoM | null;
  chart: React.ReactNode;
  onPress?: () => void;
  pressLabel?: string;
}> = ({ probe, figure, label, tiles, mom, chart, onPress, pressLabel }) => {
  const art = artFor(probe);
  return (
    <section className={`cdb-card${onPress ? " is-press" : ""}`} role="group" aria-label={label} data-dk={probe} data-cdb="card">
      {onPress && <button type="button" className="cdb-hit" data-dk-press={probe} aria-label={pressLabel ?? label} onClick={onPress} />}
      <span className={`cdb-badge${figure.endsWith("%") ? " cdb-badge--pct" : ""}`} data-cdb="badge"><b data-dk-part="figure">{figure}</b></span>
      <div className="cdb-strip" data-cdb="strip">
        <b className="cdb-title" data-cdb="title">{DESK_BADGE_TITLE[probe]}</b>
        <span className={`cdb-art${art ? " cdb-art--img" : ""}`} data-cdb="art" aria-hidden="true">
          {art
            ? <img src={art} alt="" />
            : <span className="cdb-artlb"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>{DESK_ART_LABEL}</span>}
        </span>
      </div>
      <div className="cdb-bd" data-cdb="body">
        <ul className="cdb-rows">
          {tiles.map((t, i) => (
            <li key={i} className="cdb-row" data-cdb="row">
              <b className={`cdb-tile${t.hot ? " is-hot" : ""}`} data-cdb="tile">{t.n}</b>
              <span className="cdb-lb" data-cdb="tile-label">{t.text}</span>
            </li>
          ))}
        </ul>
        <span className="cdb-ch" data-cdb="chart">{chart}</span>
        {/* the line keeps its box when there is nothing true to say (no month-on-month for profiles) */}
        <span className={`cdb-mom${mom ? ` is-${mom.dir}` : " is-empty"}`} data-dk-part="mom" data-cdb="mom" data-dir={mom?.dir}>
          {mom && mom.dir !== "none" && (
            <svg viewBox="0 0 11 11" aria-hidden="true"><path d={mom.dir === "up" ? "M5.5 1 L10.5 10 H0.5 Z" : "M5.5 10 L10.5 1 H0.5 Z"} /></svg>
          )}
          {mom ? mom.text : "\u00a0"}
        </span>
      </div>
    </section>
  );
};

export const ContactDesk: React.FC<{
  model: DeskModel;
  onQueried: () => void;
  onProfiles: () => void;
}> = ({ model, onQueried, onProfiles }) => {
  const { week, queried, profiles } = model;
  const gaps = Math.max(0, profiles.total - profiles.filled);
  return (
    <div className="cl15-desk cdb-desk" data-cl15="desk" data-v="hp2">
      <BadgeCard probe="week" figure={week.figure} label={week.label} mom={week.mom}
        tiles={[{ n: week.total, text: "in the last 8 weeks" }, { n: week.month, text: "this month" }]}
        chart={<WeekBars values={week.bars} caption="added per week" />} />
      <BadgeCard probe="queried" figure={queried.figure} label={queried.label} mom={queried.mom}
        onPress={onQueried} pressLabel={`${queried.label}. Show them in the list`}
        tiles={[{ n: queried.active, text: "active" }, { n: queried.closed, text: "closed" }]}
        chart={<RingChart active={queried.active} closed={queried.closed} total={queried.total} caption="active · closed" />} />
      <BadgeCard probe="profiles" figure={profiles.figure} label={profiles.label} mom={profiles.mom}
        onPress={onProfiles} pressLabel={`${profiles.label}. Open Housekeeping`}
        tiles={[{ n: profiles.filled, text: "complete" }, { n: gaps, text: "with gaps to fill", hot: gaps > 0 }]}
        chart={<BarChart pct={profiles.pct} caption={`${profiles.filled} of ${profiles.total}`} />} />
    </div>
  );
};
