/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v27 (design-refs/manuscripts-v27/manuscripts-v27.html) — the navy header (and the Versions page's hero):
 *
 *   Manuscripts v29 retired the book container (the logline strip) and the page foot: the page's desk is v29/Msv29Parts.
 *   What is left here is the navy header (`MsHeader`) and `V27Hero`, the Versions page's header.
 *
 * ⚠️ THE HEADER IS THE HEADER-RULES GEOMETRY (`--hero-*`, shell/pageHeroFrame.css) WITH TWO IN-CONTAINER OFFSETS: the
 *    right inset is 40px inside the card, the art sits 22px in, and the text starts at the hero's text column + 8.
 * ⚠️ `V27Hero` IS ALSO THE VERSIONS PAGE'S HEADER (no container, no card): one header shape for the two pages.
 */
import React from "react";
import heroArt from "../../../assets/manuscripts/hero-archivist.png";
import { PenIcon } from "../v29/Msv29Parts";
import { WorkspaceNavyHeader } from "../../shell/WorkspaceNavyHeader";

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

/* ══ the navy header (Workspace headers v1, 14 Nov; Manuscripts v29, 18 Nov) ══════════════════════════════════════
   The shared navy header (shell/WorkspaceNavyHeader): the book's title (it wraps, the header growing; never clipped,
   never smaller), "by {author}", ONE button — "Edit details" — and on the right the book's vitals, which the page
   supplies (v29/Msv29Parts `MsVitals`). With no book: "Let's add your book" (or "Add your book again") and the one
   button that state offers. */
export const MsHeader: React.FC<
  | { kind: "loading" }
  | { kind: "empty"; title: string; onAdd: () => void }
  | { kind: "book"; title: string; byline: string | null; words: string | null; status: string; vitals: React.ReactNode; onEdit: (opener: HTMLElement | null) => void }
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
  /* Manuscripts v29 (18 Nov): ONE button, "Edit details" (white, the pen), and on the right the book's vitals
     (v29/Msv29Parts `MsVitals`): the count with "words" beneath (or "Add a word count"), a hairline, then the main
     genre, the age category and the status line. The collapsed bar's button is "Edit details" too. */
  return (
    <WorkspaceNavyHeader page="manuscripts" art="manuscripts-header" wrap
      title={p.title}
      forLine={p.byline ? { lead: "by", text: p.byline } : null}
      actions={
        <button type="button" className="qc1531-b qc1531-b--n ms29-hb" data-ms29="edit-details" onClick={(e) => p.onEdit(e.currentTarget)}><PenIcon />Edit details</button>
      }
      right={p.vitals}
      bar={{
        title: p.title,
        aside: <>{p.words ? <b>{p.words} words</b> : null}<em>{p.status}</em></>,
        button: { label: "Edit details", onClick: () => p.onEdit(null) },
      }} />
  );
};

/* Manuscripts v29 retired the book container (the logline strip): the pitch frame (v29/Msv29Parts) holds the logline. */
