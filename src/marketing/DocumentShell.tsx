/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DocumentShell — the card every long-form public document is served in (refs:
 * scriptally-privacy.html and scriptally-terms.html, whose `.doc-plane` / `.doc-card` structure is
 * identical between them).
 *
 * Anatomy: an optional draft ribbon ABOVE the card, then the card itself — a band carrying the
 * mark plate, an eyebrow, the title and an optional right-hand meta line, over the body.
 *
 * ⚠️ THE RIBBON SITS OUTSIDE THE CARD, DELIBERATELY. It is a statement about the document rather
 * than a part of it, so removing it after legal review takes the whole element away and leaves the
 * card's own geometry untouched — one flag, no layout consequences. (`LEGAL_COPY_REVIEWED` in
 * `legalCopy.ts` is that flag.)
 *
 * ⚠️ THE PLATE IS A SLOT, NOT A FIXED GLYPH. Each document brings its own mark; the shell owns the
 * tinted square it sits in and nothing about what is drawn there. `ArtSlot` was considered and does
 * NOT fit: its own docblock rejects illustration in page headers, and its slot names are a closed
 * union belonging to the To-do workspace.
 */

import React, { useEffect } from "react";

export interface DocumentDraftNotice {
  /** The mono tag on the ribbon — "Working draft". */
  tag: string;
  /** One sentence saying what is unfinished. */
  body: string;
}

export const DocumentShell: React.FC<{
  /** Sets `document.title` for as long as the page is mounted. */
  documentTitle: string;
  /** Mono kicker above the title — "Legal · Privacy". */
  eyebrow: string;
  title: string;
  /** Right-hand line in the band — "Last updated 15 Aug 2026". Omitted, nothing renders. */
  meta?: string;
  /** Absent = no ribbon. Present = the document is not final and says so where a reader sees it. */
  draft?: DocumentDraftNotice;
  /** The mark, drawn by the caller. */
  plate?: React.ReactNode;
  children: React.ReactNode;
}> = ({ documentTitle, eyebrow, title, meta, draft, plate, children }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = documentTitle;
    return () => { document.title = prev; };
  }, [documentTitle]);

  return (
    <main className="mk-docplane">
      {draft && (
        <div className="mk-draftribbon" role="note">
          <span className="mk-drtag">{draft.tag}</span>
          <p>{draft.body}</p>
        </div>
      )}

      <article className="mk-doccard">
        <div className="mk-docband">
          {plate && <div className="mk-docplate" aria-hidden="true">{plate}</div>}
          <div>
            <div className="mk-doceyebrow">{eyebrow}</div>
            <h1 className="mk-doctitle">{title}</h1>
          </div>
          {meta && <div className="mk-docmeta">{meta}</div>}
        </div>

        <div className="mk-docbody">{children}</div>
      </article>
    </main>
  );
};
