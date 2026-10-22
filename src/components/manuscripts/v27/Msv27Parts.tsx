/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v27 (design-refs/manuscripts-v27/manuscripts-v27.html) — the page's two containers:
 *
 *   THE BOOK      (`.bkx`) a white card: the header-rules header inside it (art, eyebrow, the title, "by {name}", Edit
 *                 details · Full details) with the details card on the right, and the logline strip at its foot
 *   (v28 Part F retired the coming-soon strip that stood second; the page foot is v28/MsFoot)
 *
 * ⚠️ THE HEADER IS THE HEADER-RULES GEOMETRY (`--hero-*`, shell/pageHeroFrame.css) WITH TWO IN-CONTAINER OFFSETS: the
 *    right inset is 40px inside the card, the art sits 22px in, and the text starts at the hero's text column + 8.
 * ⚠️ `V27Hero` IS ALSO THE VERSIONS PAGE'S HEADER (no container, no card): one header shape for the two pages.
 */
import React from "react";
import heroArt from "../../../assets/manuscripts/hero-archivist.png";
import type { CardRow } from "../../../lib/manuscriptV27";
import { QuotedLine } from "../v28/QuotedLine";

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
            <button type="button" className="ms27-p1" data-ms27="edit" aria-label="Edit the book's details" onClick={onEdit}>Edit</button>
            <button type="button" className="ms27-p2" data-ms27="full" aria-label="View the book's summary" onClick={view}>View summary</button>
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
          /* v28.1: "Read it all" is gone (the details card still opens the book view); the line takes the strip's
             full width and closes with a rust ” */
          <p className="ms27-lg"><QuotedLine text={logline} /></p>
        ) : (
          <p className="ms27-lg is-empty">No logline yet. <button type="button" className="ms27-lnk" data-ms27="add-logline" onClick={onAddLogline}>Add one</button></p>
        )}
      </div>
    </section>
  );
};

/* The coming-soon strip (SoonStrip) is retired by Manuscripts v28 Part F: the page foot is v28/MsFoot. */
