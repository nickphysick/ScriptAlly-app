/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v27 (design-refs/manuscripts-v27/manuscripts-v27.html) — the page's two containers:
 *
 *   THE BOOK      (`.bkx`) a white card: the header-rules header inside it (art, eyebrow, the title, "by {name}", Edit
 *                 details · Full details) with the details card on the right, and the logline strip at its foot
 *   COMING SOON   (`.soon2`) a dashed strip: an illustration slot, "Multiple manuscripts", and two link cards
 *
 * ⚠️ THE HEADER IS THE HEADER-RULES GEOMETRY (`--hero-*`, shell/pageHeroFrame.css) WITH TWO IN-CONTAINER OFFSETS: the
 *    right inset is 40px inside the card, the art sits 22px in, and the text starts at the hero's text column + 8.
 * ⚠️ `V27Hero` IS ALSO THE VERSIONS PAGE'S HEADER (no container, no card): one header shape for the two pages.
 */
import React from "react";
import heroArt from "../../../assets/manuscripts/hero-archivist.png";
import type { CardRow } from "../../../lib/manuscriptV27";

/* ══ the header ════════════════════════════════════════════════════════════════════════════════ */

export const V27Hero: React.FC<{
  eyebrow: string;
  title: string;
  byline: string | null;
  acts: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  probe?: string;
}> = ({ eyebrow, title, byline, acts, right, className, probe = "header" }) => (
  <header className={`ms27-mh${className ? ` ${className}` : ""}`} data-ms27={probe} data-own-header="">
    <img className="ms27-mh-art" data-ms27="art" src={heroArt} alt="" aria-hidden="true" />
    <div className="ms27-mh-t" data-ms27="title-block">
      <p className="ms27-mh-k" data-ms27="eyebrow">{eyebrow}</p>
      <h1 className="ms27-h1" id="ms27-title" data-page-title="" data-ms27="title">{title}</h1>
      {byline ? (
        <p className="ms27-mh-by" data-ms27="byline"><i aria-hidden="true" /><em>by</em> {byline}<i aria-hidden="true" /></p>
      ) : null}
      <div className="ms27-mh-b" data-ms27="acts">{acts}</div>
    </div>
    {right ? <div className="ms27-mh-r" data-ms27="right">{right}</div> : null}
  </header>
);

/* ══ the book container ═══════════════════════════════════════════════════════════════════════ */

export const BookContainer: React.FC<{
  title: string;
  byline: string | null;
  rows: CardRow[];
  words: string | null;
  logline: string;
  onEdit: () => void;
  onView: (opener: HTMLElement) => void;
  onAddLogline: () => void;
}> = ({ title, byline, rows, words, logline, onEdit, onView, onAddLogline }) => {
  const view = (e: React.MouseEvent<HTMLElement>) => onView(e.currentTarget);
  const top = rows.filter((r) => r.key !== "words");
  const w = rows.find((r) => r.key === "words")!;
  return (
    <section className="ms27-bkx" aria-labelledby="ms27-title" data-ms27="book">
      <V27Hero
        eyebrow="— Manuscripts —" title={title} byline={byline}
        acts={(
          <>
            <button type="button" className="ms27-p1" data-ms27="edit" onClick={onEdit}>Edit details</button>
            <button type="button" className="ms27-p2" data-ms27="full" onClick={view}>Full details</button>
          </>
        )}
        right={(
          <button type="button" className="ms27-bf" data-ms27="card" aria-label="See the book's full details" onClick={view}>
            <dl>
              {top.map((r) => (
                <React.Fragment key={r.key}>
                  <dt>{r.label}</dt>
                  <dd className={r.muted ? "is-muted" : undefined} data-row={r.key}>{r.dot ? <i className="ms27-sd" aria-hidden="true" /> : null}{r.value}</dd>
                </React.Fragment>
              ))}
              <dt className="ms27-cw">{w.label}</dt>
              <dd className={`ms27-cw${w.muted ? " is-muted" : ""}`} data-row="words">{w.value}</dd>
            </dl>
            <i className="ms27-dv" aria-hidden="true" />
            <span className="ms27-wc" data-ms27="words-big">{words ? <><b>{words}</b><small>words</small></> : <small>No word count yet</small>}</span>
          </button>
        )}
      />
      <div className="ms27-bkl" data-ms27="logline">
        {logline.trim() ? (
          <>
            <p className="ms27-lg">{logline}</p>
            <button type="button" className="ms27-lnk" data-ms27="read-all" onClick={view}>Read it all</button>
          </>
        ) : (
          <p className="ms27-lg is-empty">No logline yet. <button type="button" className="ms27-lnk" data-ms27="add-logline" onClick={onAddLogline}>Add one</button></p>
        )}
      </div>
    </section>
  );
};

/* ══ the coming-soon strip ════════════════════════════════════════════════════════════════════ */

/** TODO(illustration): Nick's artist supplies the shelf drawing. Until then the slot draws the mock's placeholder. */
export const SOON_ILLUSTRATION: string | null = null;

const VersionsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="M8 3.5h7l3.5 3.5v10.5H8z" /><path d="M15 3.5V7h3.5" /><path d="M5.5 7v13.5H15" /><path d="M11 11.5h4.5M11 14.5h3" />
  </svg>
);
const ParcelIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="M3.5 8 12 4l8.5 4v8.5L12 20.5l-8.5-4z" /><path d="M3.5 8 12 12l8.5-4M12 12v8.5" /><path d="m7.8 6 8.4 4.1v3" />
  </svg>
);

export const SoonStrip: React.FC<{ onVersions: () => void; onPackages: () => void }> = ({ onVersions, onPackages }) => (
  /* TODO(gating): when Free plans return, hide these two links (or lock them) for Free accounts. Today every account is
     a founding member and PACKAGES_OPEN_TO_ALL is true, so everyone sees them. */
  <section className="ms27-soon" aria-labelledby="ms27-soon-h" data-ms27="soon">
    {SOON_ILLUSTRATION ? (
      <img className="ms27-s-ph is-art" src={SOON_ILLUSTRATION} alt="" data-ms27="soon-art" />
    ) : (
      <div className="ms27-s-ph" role="img" aria-label="Illustration placeholder: a shelf of manuscripts" data-ms27="soon-art">
        <svg viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
          <path d="M6 42h52" /><rect x="10" y="12" width="9" height="30" rx="1.5" /><rect x="21" y="8" width="9" height="34" rx="1.5" />
          <path d="M33 16.5l8.6-2.4 7.4 26.6-8.6 2.4z" /><path d="M13 18h3M24 14h3" /><circle cx="52" cy="12" r="1.2" fill="currentColor" />
          <path d="M52 6v3M52 15v3M46 12h3M55 12h3" />
        </svg>
        <span>Illustration</span>
      </div>
    )}
    <div className="ms27-s-tx" data-ms27="soon-text">
      <p className="ms27-s-k">Coming soon</p>
      <h2 className="ms27-s-h" id="ms27-soon-h">Multiple manuscripts</h2>
      <p className="ms27-s-d">In the meantime, founding members have full access to <button type="button" className="ms27-s-em" data-ms27="soon-versions" onClick={onVersions}>Versions</button> and <button type="button" className="ms27-s-em" data-ms27="soon-packages" onClick={onPackages}>Submission packages</button>.</p>
      <p className="ms27-s-d ms27-s-d2">We call this <strong className="ms27-s-sq">smart querying</strong>.</p>
      <p className="ms27-s-d ms27-s-d2">Build your library of materials, attach custom combinations to queries to track their journey, then use the analysis to hone your strategy and generate requests.</p>
    </div>
    <div className="ms27-s-go">
      <button type="button" className="ms27-s-ln" data-ms27="link-versions" onClick={onVersions}>
        <i className="ms27-s-ic"><VersionsIcon /></i><b>Versions</b><small>See which opening is landing</small><span aria-hidden="true">→</span>
      </button>
      <button type="button" className="ms27-s-ln" data-ms27="link-packages" onClick={onPackages}>
        <i className="ms27-s-ic"><ParcelIcon /></i><b>Submission packages</b><small>Bundle what goes out with a query</small><span aria-hidden="true">→</span>
      </button>
    </div>
  </section>
);
