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
import { WorkspaceNavyHeader, WsnhFigure, WsnhWords } from "../../shell/WorkspaceNavyHeader";

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

/* ══ the navy header (Workspace headers v1, 14 Nov) ═════════════════════════════════════════════════════════════
   The shared navy header (shell/WorkspaceNavyHeader) in place of the hero above the book card: the book's title (two
   lines at most, the header growing; never clipped, never smaller), "by {author}", Edit and View summary, and on the
   right the details card as words — the word count large, then the genre and "{age} · {status} since {day}". Every
   value is `cardRows`'s, as the card showed it. With no book: "Let's add your book" (or "Add your book again") and
   the one button that state offers. */
export const MsHeader: React.FC<
  | { kind: "loading" }
  | { kind: "empty"; title: string; onAdd: () => void }
  | { kind: "book"; title: string; byline: string | null; rows: CardRow[]; words: string | null; onEdit: () => void; onView: (opener: HTMLElement) => void }
> = (p) => {
  if (p.kind === "loading") {
    return <WorkspaceNavyHeader page="manuscripts" art="manuscripts-header" loading title=" " actions={null} bar={null} />;
  }
  if (p.kind === "empty") {
    return (
      <WorkspaceNavyHeader page="manuscripts" art="manuscripts-header" title={p.title}
        actions={<button type="button" className="qc1531-b qc1531-b--n" data-ms21="add" onClick={p.onAdd}>+ Add your manuscript</button>}
        bar={{ title: p.title, button: { label: "+ Add your manuscript", onClick: p.onAdd } }} />
    );
  }
  const row = (k: CardRow["key"]) => p.rows.find((r) => r.key === k)!;
  const genre = row("genre"), age = row("age"), status = row("status"), since = row("since");
  const facts = <>{age.value} · {since.muted ? status.value : <>{status.value.toLowerCase()} since <b data-ms27="hd-since">{since.value}</b></>}</>;
  return (
    <WorkspaceNavyHeader page="manuscripts" art="manuscripts-header" wrap
      title={p.title}
      forLine={p.byline ? { lead: "by", text: p.byline } : null}
      actions={<>
        <button type="button" className="qc1531-b qc1531-b--n" data-ms27="edit" aria-label="Edit the book's details" onClick={p.onEdit}>Edit</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-ms27="full" aria-label="View the book's summary" onClick={(e) => p.onView(e.currentTarget)}>View summary</button>
      </>}
      right={<>
        {p.words ? <WsnhFigure small>{p.words}</WsnhFigure> : null}
        <WsnhWords lead={p.words ? "words" : "No word count yet"} name={<span data-ms27="hd-genre">{genre.value}</span>} sub={facts} />
      </>}
      bar={{
        title: p.title,
        aside: <>{p.words ? <b>{p.words} words</b> : null}<em>{status.value}</em></>,
        button: { label: "Edit", onClick: p.onEdit },
      }} />
  );
};

/* ══ the book container ═══════════════════════════════════════════════════════════════════════ */

/* Workspace headers v1: the hero and its details card left the container for the navy header above it; the card keeps
   the logline strip, as before */
export const BookContainer: React.FC<{
  logline: string;
  onAddLogline: () => void;
}> = ({ logline, onAddLogline }) => (
  <section className="ms27-bkx" aria-label="The book's logline" data-ms27="book">
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

/* The coming-soon strip (SoonStrip) is retired by Manuscripts v28 Part F: the page foot is v28/MsFoot. */
