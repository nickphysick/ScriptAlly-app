/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AgentPaperCard (Contact list v18 §E) — the landing page's agent card (`public/images/home-for-your-agents.png`, a
 * static image with nothing behind it) as a component, in three variants:
 *
 *   framed  a white card holding a 1px #a5837b frame, the status band INSIDE the frame, then the head and the sections
 *           (Housekeeping's intro)
 *   ghost   framed, every value a rounded bar, the frame at 60% (the intro's "with gaps" card)
 *   panel   (v18.1) the agent panel itself: framed's frame, band and head, with ✕ in the band, and the panel's tabs,
 *           body and footer as slots. The band is fixed; the head, tabs and body scroll together; the footer is fixed.
 *
 * ⚠️ THE BAND IS THE LIST HEADER'S SLATE, #3e5170 (v18.2 §B; v18.1 coloured it by whose move it was, and that rule is
 *    retired), EXCEPT where a caller passes `tone="pink"`: Contact list v20 §F gives a your-move card in the Cards view
 *    the app's pink. The panel's state is said by its stand slip, not by the band. `status` still travels as
 *    `data-kind` for anything that reads it, and is never a colour on its own.
 *
 * ⚠️ IT DRAWS WHAT IT IS GIVEN AND DERIVES NOTHING: the caller says the status, the words and which genre is the
 *    manuscript's. A value given as null is a dashed "+ Add …" pill when `onAdd` is supplied, and is left out when not.
 */
import React from "react";
import "./agentPaperCard.css";

export type PaperStatus = "you" | "none" | "querying" | "closed";
/** v18.2 §B — every band, in every variant and every state: the list header's slate */
export const PAPER_BAND = "#3e5170";
/** v20 §F — the Contact list's Cards view: a your-move card's band, the app's `--pink` */
export const PAPER_BAND_PINK = "#f5e2da";

export type PaperAddKey = "website" | "email" | "genres" | "wishlist" | "materials";

export interface PaperCardData {
  status: PaperStatus;
  /** the chip's words: "Not yet queried", "Partial requested", "Closed to submissions" */
  statusLabel: string;
  stars?: number | null;
  initials: string;
  name: string;
  agency?: string | null;
  city?: string | null;
  weeks?: number | null;
  website?: string | null;
  email?: string | null;
  genres: { label: string; hit: boolean }[];
  wishlist?: string | null;
  materials: { label: string; kind: "doc" | "pages" }[];
  /** panel only: "Your queries" (v18's words) */
  queries?: React.ReactNode;
}

const Stars: React.FC<{ n: number }> = ({ n }) => (
  <span className="apc-stars" data-apc="stars" aria-label={n ? `${n} of 5 stars` : "Not rated"}>
    {[1, 2, 3, 4, 5].map((i) => <i key={i} data-on={i <= n ? "" : undefined} aria-hidden="true">★</i>)}
  </span>
);

export const PaperIcon: React.FC<{ kind: "doc" | "pages" | "web" | "mail" }> = ({ kind }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "doc" ? <path d="M4 1.5h5.5L12.5 4.5v10h-8.5zM9.5 1.5v3h3" />
      : kind === "pages" ? <path d="M5.5 3.5h7v11h-7zM3.5 12.5v-11h7" />
      : kind === "web" ? <><circle cx="8" cy="8" r="6.2" /><path d="M1.8 8h12.4M8 1.8c2 2.2 2 10.2 0 12.4M8 1.8c-2 2.2-2 10.2 0 12.4" /></>
      : <><rect x="1.8" y="3.5" width="12.4" height="9" rx="1.2" /><path d="m2.2 4.2 5.8 4.6 5.8-4.6" /></>}
  </svg>
);

/** v18.1 · the panel variant's slots: what the panel owns, drawn inside the card's frame */
export interface PaperPanelSlots {
  onClose: () => void;
  closeLabel: string;
  /** the name's ref: focus arrives on it */
  nameRef?: React.Ref<HTMLHeadingElement>;
  /** the head's links, already built (Website, Copy email) */
  links: React.ReactNode;
  tabs: React.ReactNode;
  body: React.ReactNode;
  foot: React.ReactNode;
  /** the scrolling region's attributes (the tab it shows) */
  scrollAttrs?: Record<string, string | undefined>;
}

const hrefOf = (url: string): string => (/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);

export const AgentPaperCard: React.FC<{
  variant: "framed" | "ghost" | "panel";
  data: PaperCardData;
  /** a missing value's "+ Add …" pill; without it a missing value is left out */
  onAdd?: (k: PaperAddKey) => void;
  className?: string;
  /** the panel variant's slots */
  panel?: PaperPanelSlots;
  /** Contact list v20 §F — the band's tone. Absent: the list header's slate (every card, every variant, as v18.2). "pink":
   *  the app's pink with rust words, which only the Contact list's Cards view asks for, on a card whose next step is the
   *  writer's. The agent panel and Housekeeping never pass it. */
  tone?: "pink";
}> = ({ variant, data: d, onAdd, className, panel, tone }) => {
  if (variant === "panel" && panel) {
    return (
      <div className={`apc apc--panel${className ? ` ${className}` : ""}`} data-apc="card" data-variant="panel" data-status={d.status}>
        <div className="apc-frame" data-apc="frame">
          <div className="apc-band" data-apc="band" data-kind={d.status} style={{ background: PAPER_BAND }}>
            <span className="apc-st" data-apc="status">{d.statusLabel}</span>
            <span className="apc-bandr">
              <Stars n={d.stars ?? 0} />
              <button type="button" className="apc-x" data-apc="close" data-ap="close" aria-label={panel.closeLabel} onClick={panel.onClose}><span aria-hidden="true">{"×"}</span></button>
            </span>
          </div>
          <div className="apc-scroll" data-apc="scroll" {...panel.scrollAttrs}>
            <div className="apc-head" data-apc="head">
              <span className="apc-disc" aria-hidden="true">{d.initials}</span>
              <div className="apc-who">
                <h2 className="apc-nm" data-apc="name" data-ap="name" ref={panel.nameRef} tabIndex={-1}>{d.name}</h2>
                {[d.agency?.trim(), d.city?.trim()].filter(Boolean).length ? <span className="apc-ag" data-ap="place">{[d.agency?.trim(), d.city?.trim()].filter(Boolean).join(" · ")}</span> : null}
                {panel.links}
              </div>
            </div>
            {panel.tabs}
            {panel.body}
          </div>
          {panel.foot}
        </div>
      </div>
    );
  }
  const ghost = variant === "ghost";
  const bar = (w: number, h = 10) => <span className="apc-bar" style={{ width: w, height: h }} aria-hidden="true" />;
  const add = (k: PaperAddKey, label: string) => (onAdd && !ghost ? <button type="button" className="apc-add" data-apc="add" data-k={k} onClick={() => onAdd(k)}>{label}</button> : null);
  const sec = (k: string, label: string, body: React.ReactNode) => (body == null ? null : (
    <section className="apc-sec" data-apc="sec" data-k={k}><h5>{label}</h5>{body}</section>
  ));
  const genres = ghost ? <span className="apc-chips">{bar(110, 26)}{bar(80, 26)}</span>
    : d.genres.length ? (
      <span className="apc-chips" data-apc="genres">
        {d.genres.map((g) => <span key={g.label} className={`apc-chip${g.hit ? " is-hit" : ""}`} data-hit={g.hit ? "true" : undefined}>{g.hit ? "✓ " : ""}{g.label}</span>)}
      </span>
    ) : add("genres", "+ Add their genres");
  const wish = ghost ? <span className="apc-lines">{bar(260)}{bar(200)}</span>
    : d.wishlist ? <p className="apc-wish" data-apc="wishlist">{d.wishlist}</p> : add("wishlist", "+ Add their wishlist");
  const mats = ghost ? <span className="apc-chips">{bar(96, 28)}</span>
    : d.materials.length ? (
      <span className="apc-chips" data-apc="materials">
        {d.materials.map((m) => <span key={m.label} className="apc-mat"><PaperIcon kind={m.kind} />{m.label}</span>)}
      </span>
    ) : add("materials", "+ Add what they ask for");
  const body = (
    <>
      {sec("genres", "Genres sought", genres)}
      {sec("wishlist", "Manuscript wishlist", wish)}
      {sec("materials", "Materials requested", mats)}
    </>
  );
  const meta = [d.city?.trim(), d.weeks ? `Replies in about ${d.weeks} weeks` : null].filter(Boolean).join(" · ");
  return (
    <div className={`apc apc--${variant}${className ? ` ${className}` : ""}`} data-apc="card" data-variant={variant} data-status={d.status} data-tone={tone}
      aria-hidden={ghost || undefined}>
      <div className="apc-frame" data-apc="frame">
        <div className="apc-band" data-apc="band" data-kind={d.status} style={{ background: tone === "pink" ? PAPER_BAND_PINK : PAPER_BAND }}>
          <span className="apc-st" data-apc="status">{ghost ? bar(110, 12) : d.statusLabel}</span>
          {!ghost && d.stars ? <Stars n={d.stars} /> : null}
        </div>
        <div className="apc-head" data-apc="head">
          <span className="apc-disc" aria-hidden="true">{ghost ? null : d.initials}</span>
          <div className="apc-who">
            {ghost ? <>{bar(150, 18)}{bar(110)}{bar(170)}</> : (
              <>
                <b className="apc-nm" data-apc="name">{d.name}</b>
                {d.agency ? <span className="apc-ag">{d.agency}</span> : null}
                {meta ? <span className="apc-meta">{meta}</span> : null}
                <span className="apc-links">
                  {d.website ? <a href={hrefOf(d.website)} target="_blank" rel="noopener noreferrer"><PaperIcon kind="web" />Website</a> : add("website", "+ Add their website")}
                  {d.email ? <a href={`mailto:${d.email}`}><PaperIcon kind="mail" />Email</a> : add("email", "+ Add their email")}
                </span>
              </>
            )}
          </div>
        </div>
        {body}
      </div>
    </div>
  );
};
