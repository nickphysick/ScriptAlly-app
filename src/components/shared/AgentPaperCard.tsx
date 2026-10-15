/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AgentPaperCard (Contact list v18 §E) — the landing page's agent card (`public/images/home-for-your-agents.png`, a
 * static image with nothing behind it) as a component, in three variants:
 *
 *   framed  a white card holding a 1px #a5837b frame, the status band INSIDE the frame, then the head and the sections
 *           (Housekeeping's intro)
 *   plain   the same sections with no frame, band or head, in one white card, plus Takes queries, Replies and Your
 *           queries (the agent panel's Profile tab)
 *   ghost   framed, every value a rounded bar, the frame at 60% (the intro's "with gaps" card)
 *
 * ⚠️ IT DRAWS WHAT IT IS GIVEN AND DERIVES NOTHING: the caller says the status, the words and which genre is the
 *    manuscript's. A value given as null is a dashed "+ Add …" pill when `onAdd` is supplied, and is left out when not.
 */
import React from "react";
import "./agentPaperCard.css";

export type PaperStatus = "none" | "querying" | "closed";
export const PAPER_STATUS_COLOUR: Record<PaperStatus, string> = { none: "#5e7189", querying: "#2d3a50", closed: "#a9a39c" };

export type PaperAddKey = "website" | "email" | "genres" | "wishlist" | "materials" | "takes" | "replies";

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
  /** plain only */
  takes?: string | null;
  replies?: string | null;
  policy?: string | null;
  queries?: React.ReactNode;
}

const Stars: React.FC<{ n: number }> = ({ n }) => (
  <span className="apc-stars" data-apc="stars" aria-label={`${n} of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => <i key={i} data-on={i <= n ? "" : undefined} aria-hidden="true">★</i>)}
  </span>
);

const Icon: React.FC<{ kind: "doc" | "pages" | "web" | "mail" }> = ({ kind }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "doc" ? <path d="M4 1.5h5.5L12.5 4.5v10h-8.5zM9.5 1.5v3h3" />
      : kind === "pages" ? <path d="M5.5 3.5h7v11h-7zM3.5 12.5v-11h7" />
      : kind === "web" ? <><circle cx="8" cy="8" r="6.2" /><path d="M1.8 8h12.4M8 1.8c2 2.2 2 10.2 0 12.4M8 1.8c-2 2.2-2 10.2 0 12.4" /></>
      : <><rect x="1.8" y="3.5" width="12.4" height="9" rx="1.2" /><path d="m2.2 4.2 5.8 4.6 5.8-4.6" /></>}
  </svg>
);

const hrefOf = (url: string): string => (/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);

export const AgentPaperCard: React.FC<{
  variant: "framed" | "plain" | "ghost";
  data: PaperCardData;
  /** a missing value's "+ Add …" pill; without it a missing value is left out */
  onAdd?: (k: PaperAddKey) => void;
  className?: string;
}> = ({ variant, data: d, onAdd, className }) => {
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
        {d.materials.map((m) => <span key={m.label} className="apc-mat"><Icon kind={m.kind} />{m.label}</span>)}
      </span>
    ) : add("materials", "+ Add what they ask for");
  const body = (
    <>
      {sec("genres", "Genres sought", genres)}
      {sec("wishlist", "Manuscript wishlist", wish)}
      {sec("materials", "Materials requested", mats)}
      {variant === "plain" ? (
        <>
          {sec("takes", "Takes queries", d.takes ? <p className="apc-v">{d.takes}</p> : add("takes", "+ Add how they take queries"))}
          {sec("replies", "Replies", d.replies
            ? <p className="apc-v">{d.replies}{d.policy ? <i className="apc-pol">{d.policy}</i> : null}</p>
            : add("replies", "+ Add their reply time"))}
          {sec("queries", "Your queries", <p className="apc-v" data-apc="queries">{d.queries ?? "None yet"}</p>)}
        </>
      ) : null}
    </>
  );
  if (variant === "plain") {
    return <div className={`apc apc--plain${className ? ` ${className}` : ""}`} data-apc="card" data-variant="plain" data-status={d.status}>{body}</div>;
  }
  const meta = [d.city?.trim(), d.weeks ? `Replies in about ${d.weeks} weeks` : null].filter(Boolean).join(" · ");
  return (
    <div className={`apc apc--${variant}${className ? ` ${className}` : ""}`} data-apc="card" data-variant={variant} data-status={d.status} aria-hidden={ghost || undefined}>
      <div className="apc-frame" data-apc="frame">
        <div className="apc-band" data-apc="band" style={{ background: PAPER_STATUS_COLOUR[d.status] }}>
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
                  {d.website ? <a href={hrefOf(d.website)} target="_blank" rel="noopener noreferrer"><Icon kind="web" />Website</a> : add("website", "+ Add their website")}
                  {d.email ? <a href={`mailto:${d.email}`}><Icon kind="mail" />Email</a> : add("email", "+ Add their email")}
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
