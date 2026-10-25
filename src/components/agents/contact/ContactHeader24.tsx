/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v24 Part A (design-refs/contact-list-v24/, screen 01) — the header the Versions page and the Query
 * Centre v149 use: the shared title card (`PageHeaderCard`), a List-health banner led by the ring (`PageAlertBanner`'s
 * `lead`), then the view row: All · Your move · Querying · Not queried · Closed, and Find on the right.
 *
 * ⚠️ THE BANNER'S FIGURES ARE HOUSEKEEPING'S OWN: the ring's percentage is List health (`listHealth`), n is
 *    Housekeeping's gap count and k the agents those gaps belong to (`bannerFigures`). At no gaps it is not drawn.
 * ⚠️ THE CHIPS ARE ONE SINGLE-SELECT SET over `AgentFacts.stand` (lib/contactV24). They combine with Filters and Find.
 * ⚠️ THE `h1` KEEPS `data-page-title` (the shell's folder tab and the guide read it).
 * ⚠️ The chips and Find wear the Query Centre's own rules (qcv149.css, selectors widened to `.clv-group`).
 */
import React from "react";
import { PageHeaderCard } from "../../shared/PageHeaderCard";
import { PageAlertBanner } from "../../shared/PageAlertBanner";
import { HealthRing } from "./ContactLightHeader";
import { SET_LABEL, SET_ORDER, missingWords, type BannerFigures, type SetCounts, type SetKey } from "../../../lib/contactV24";
import "../../queries/centre/qcv149.css";
import "./contactV24.css";

export const CONTACT_ART = "/images/contact-list-archivist.webp";

export const ContactHeader24: React.FC<{
  loading: boolean;
  msTitle: string | null;
  health: { pct: number } | null;
  banner: BannerFigures | null;
  onAdd: () => void;
  addRef?: React.Ref<HTMLButtonElement>;
  onDiscover?: () => void;
  onFill: () => void;
}> = ({ loading, msTitle, health, banner, onAdd, addRef, onDiscover, onFill }) => (
  <header className="cl24-hd" data-cl24="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    <PageHeaderCard className="cl24-card" titleId="cl24T" data={{ "data-cl24": "hd-card" }} titleData={{ "data-page-title": "true", "data-cl24": "title" }}
      title="Contact list" art={CONTACT_ART}
      body={<>Every agent you might query{msTitle ? <> with <b data-cl24="ms">{msTitle}</b></> : null}, in one place. Keep what they’re looking for, how long they take to reply and how to reach them, and QueryHawk shows you who’s next.</>}
      primary={{ label: "+ Add an agent", onClick: onAdd, disabled: loading, buttonRef: addRef, data: { "data-cl24": "add", "data-cl17": "add" } }}
      secondary={onDiscover ? { label: "Discover agents", onClick: onDiscover, data: { "data-cl24": "discover" } } : undefined} />
    <PageAlertBanner className="cl24-ban" hidden={loading || !banner || banner.gaps === 0} data={{ "data-cl24": "banner" }}
      lead={health ? <span className="cl24-ring" title="List health" data-cl24="ring"><HealthRing pct={health.pct} /></span> : undefined}
      headline={banner && health ? <>List health is <span data-cl24="banner-pct">{health.pct}</span>%. <b data-cl24="banner-n" data-n={banner.gaps}>{missingWords(banner.gaps)}</b> from <span data-cl24="banner-k" data-n={banner.agents}>{banner.agents}</span> {banner.agents === 1 ? "agent" : "agents"}.</> : null}
      line="Reply times and wishlists are what tell you who to query next. Most take a minute."
      faces={banner?.faces}
      action={{ label: "Fill in the gaps", onClick: onFill, data: { "data-cl24": "fill", "data-cl183": "fill" } }} />
  </header>
);

const SW: Record<SetKey, string> = { you: "you", agent: "agent", none: "none", closed: "closed" };

/** A3 — the views (left) and Find (right): 28 under the banner, 14 above the list */
export const ContactViewRow24: React.FC<{
  counts: SetCounts | null;
  total: number;
  set: SetKey | null;
  onSet: (k: SetKey | null) => void;
  find: string;
  onFind: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  loading: boolean;
}> = ({ counts, total, set, onSet, find, onFind, findRef, loading }) => (
  <div className="cl24-vr" data-cl24="views-row">
    <div className="qc149-vs" role="group" aria-label="Where they stand" data-cl24="views">
      <button type="button" className="qc149-v" data-cl24="view" data-k="all" data-n={counts ? total : undefined} aria-pressed={set === null}
        disabled={loading} onClick={() => onSet(null)}>
        <b>{counts ? total : ""}</b><span>All</span>
      </button>
      {SET_ORDER.map((k) => {
        const n = counts ? counts[k] : null;
        return (
          <button key={k} type="button" className="qc149-v" data-cl24="view" data-k={k} data-n={n ?? undefined} aria-pressed={set === k}
            disabled={loading || n === 0} onClick={() => onSet(set === k ? null : k)}>
            <i className={`qc149-sw cl24-sw--${SW[k]}`} aria-hidden="true" />
            <b>{n ?? ""}</b><span>{SET_LABEL[k]}</span>
          </button>
        );
      })}
    </div>
    <label className="qc149-find" data-cl24="find" data-nb1="find">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
      <input ref={findRef} value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find an agent or agency" aria-label="Find an agent or agency" autoComplete="off" disabled={loading} />
    </label>
  </div>
);
