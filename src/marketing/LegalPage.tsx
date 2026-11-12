/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Terms and Privacy — public marketing-tier routes at /terms and /privacy.
 *
 * ⚠️ THESE HAVE TO BE IN-APP ROUTES, NOT STATIC FILES. Both hosting configs rewrite `**` to
 * `/index.html`, so `scriptally.ink/terms` served the SPA rather than a document however the file
 * was placed — which is why the sign-up screen's Terms and Privacy links pointed at pages that
 * could not exist. A route is the only shape that resolves.
 *
 * ⚠️ THE WORDS LIVE IN `legalCopy.ts` AND NOWHERE ELSE. This file builds the ROUTE; replacing the
 * wording after legal review is an edit to that one file with no component work at all.
 *
 * ⚠️ ONE LAYOUT FOR BOTH (12 Nov, design-refs/contact-terms-unsubscribe-v1.html): the Terms take the
 * privacy page's navy drawer, "The short version" and the contents beside numbered sections. The old
 * document card (`DocumentShell`, `LegalPlate` and the `.mk-doc*` rules) is deleted with the move.
 * Privacy's rendered markup is byte-identical to before (`legalPage.test.tsx` holds its hash).
 *
 * ⚠️ THE PRIVACY POLICY'S §4 COVERS SMART IMPORT AND MUST KEEP DOING SO. Uploading a spreadsheet
 * sends its CONTENTS to Anthropic's API (functions/src/smartImport.ts), as does the email drop and
 * the comps suggester. The section is not trimmable.
 */

import React, { useEffect } from "react";
import { LEGAL_DOCUMENTS, LEGAL_COPY_REVIEWED, DRAFT_TAG, LegalDocumentKey, LegalBlock } from "./legalCopy";
import "./privacy.css";
import { Runs } from "./CopyRuns";

type Nav = (tab: string, subPageName?: string) => void;

/** One block of a section — a paragraph, a list, or the pulled-out clause a reader must not skim. */
const Block: React.FC<{ block: LegalBlock; onNavigate: Nav }> = ({ block, onNavigate }) => {
  if (block.kind === "list") {
    return (
      <ul>
        {block.items.map((item, i) => (
          <li key={i}><Runs runs={item} onNavigate={onNavigate} /></li>
        ))}
      </ul>
    );
  }
  if (block.kind === "callout" && block.tone === "navy") {
    return <div className="mk-pv-callout mk-pv-callout--navy"><p><Runs runs={block.runs} onNavigate={onNavigate} /></p></div>;
  }
  if (block.kind === "callout") {
    return (
      <div className="mk-callout">
        <span className="mk-corule" aria-hidden="true" />
        <p><Runs runs={block.runs} onNavigate={onNavigate} /></p>
      </div>
    );
  }
  return <p><Runs runs={block.runs} onNavigate={onNavigate} /></p>;
};

/** The rust ring-and-tick the landing page's lists use, here in blush on navy. */
const Tick: React.FC = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="8" fill="none" stroke="#e8b4a3" strokeWidth="1.6" />
    <path d="M6.2 10.3 8.8 12.8 13.8 7.6" fill="none" stroke="#e8b4a3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "1. Who we are" → the section's anchor id. */
export const privacySectionId = (i: number) => `priv-s${i + 1}`;
/** The Terms' anchors: their own prefix, so the two documents never share an id. */
export const termsSectionId = (i: number) => `terms-s${i + 1}`;

/**
 * /privacy — privacy page v1 (2 Nov; ref design-refs/privacy-v1.html): the landing page's navy drawer
 * with the title, the date and "The short version", then a cream body with the contents beside
 * numbered sections. The words are `legalCopy.ts`'s; the bar and footer are the shell's bare mode.
 * ⚠️ NO BRACKETED PLACEHOLDER AND NO WORKING-DRAFT RIBBON (PRIV-1); the only links are mailto,
 * ico.org.uk and the contents' own anchors (PRIV-2).
 *
 * /terms — the same view (12 Nov), with the full chrome, its own anchors, and the working-draft
 * ribbon at the head of the body while `LEGAL_COPY_REVIEWED` is false.
 */
const DocumentView: React.FC<{ doc: LegalDocumentKey; onNavigate: Nav }> = ({ doc, onNavigate }) => {
  const d = LEGAL_DOCUMENTS[doc];
  const sectionId = doc === "privacy" ? privacySectionId : termsSectionId;
  /* Privacy's root is exactly as it was (`data-privacy`); the Terms' marks itself the same way. */
  const rootMark = doc === "privacy" ? { "data-privacy": true } : { "data-terms": true };
  /* ⚠️ ONE FLAG, ONE EFFECT. Setting LEGAL_COPY_REVIEWED true removes the ribbon and changes nothing
     else on the page. A document that looks finished and is not is worse than an obviously
     unfinished one, because nobody chases it. Privacy is `ribbonOff` (PRIV-1). */
  const ribbon = !LEGAL_COPY_REVIEWED && !d.ribbonOff;
  useEffect(() => {
    const prev = document.title;
    document.title = d.documentTitle;
    return () => { document.title = prev; };
  }, [d.documentTitle]);
  /* The contents scroll smoothly to each section, and the address keeps the anchor. */
  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };
  return (
    <div className="mk-pv" {...rootMark}>
      <header className="mk-pv-hero">
        <div className="mk-pv-in">
          <h1 className="mk-pv-h1">{d.title}</h1>
          <p className="mk-pv-upd">Last updated {d.lastUpdated}</p>
          {d.shortVersion && (
            <section className="mk-pv-short" aria-labelledby="mk-pv-short-h">
              <h2 className="mk-pv-shorth" id="mk-pv-short-h">The short version</h2>
              <ul>{d.shortVersion.map((t) => <li key={t}><Tick /><span>{t}</span></li>)}</ul>
            </section>
          )}
        </div>
      </header>
      <div className="mk-pv-body">
        {ribbon && (
          <div className="mk-pv-in">
            <div className="mk-draftribbon" role="note">
              <span className="mk-drtag">{DRAFT_TAG}</span>
              <p>{d.draftBody}</p>
            </div>
          </div>
        )}
        <div className="mk-pv-in mk-pv-grid">
          <nav className="mk-pv-toc" aria-labelledby="mk-pv-toc-h">
            <h2 className="mk-pv-toch" id="mk-pv-toc-h">On this page</h2>
            <ol>
              {d.sections.map((s, i) => (
                <li key={s.heading}>
                  <a href={`#${sectionId(i)}`} onClick={(e) => go(e, sectionId(i))}>{i + 1}. {s.heading}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="mk-pv-doc">
            {d.sections.map((s, i) => (
              <section className="mk-pv-sec" id={sectionId(i)} key={s.heading}>
                <h2 className="mk-pv-h2"><span className="mk-pv-n">{i + 1}</span>{s.heading}</h2>
                {s.blocks.map((block, j) => <Block key={j} block={block} onNavigate={onNavigate} />)}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const LegalPage: React.FC<{ doc: LegalDocumentKey; onNavigate: Nav }> = ({ doc, onNavigate }) =>
  <DocumentView doc={doc} onNavigate={onNavigate} />;
