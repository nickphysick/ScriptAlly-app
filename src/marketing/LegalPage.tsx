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
 * ⚠️ THE BODY IS A MARKED PLACEHOLDER AND MUST NOT SHIP AS IF IT WERE POLICY. This file builds the
 * ROUTE and the document shell; the words are a lawyer's job, not a build's. The shell takes its
 * copy as a constant so replacing it is an edit to `legalCopy.ts` and nothing else.
 *
 * ⚠️ WHOEVER WRITES THE PRIVACY POLICY MUST COVER SMART IMPORT. Uploading a spreadsheet sends its
 * CONTENTS to Anthropic's API for mapping (functions/src/smartImport.ts), as does the email drop
 * (functions/src/emailImport.ts) and the comps suggester. That is third-party processing of the
 * writer's own agent list and correspondence, and nothing on any current surface says so.
 */

import React, { useEffect } from "react";
import { LEGAL_DOCUMENTS, LegalDocumentKey } from "./legalCopy";

export const LegalPage: React.FC<{
  doc: LegalDocumentKey;
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ doc, onNavigate }) => {
  const document_ = LEGAL_DOCUMENTS[doc];

  useEffect(() => {
    const prev = document.title;
    document.title = document_.documentTitle;
    return () => { document.title = prev; };
  }, [document_.documentTitle]);

  return (
    <div>
      <article className="mk-legal">
        <div className="mk-eyebrow">{document_.eyebrow}</div>
        <h1>{document_.title}</h1>

        {/* ⚠️ THE PLACEHOLDER SAYS SO, IN THE PAGE, WHERE A READER SEES IT — not only in a comment
            where only we do. A legal page that looks finished and is not is worse than an obviously
            unfinished one, because nobody chases it. */}
        <div className="mk-legalnotice" role="note">
          <strong>{document_.noticeHeading}</strong>
          <p>{document_.noticeBody}</p>
        </div>

        {document_.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>

      <footer className="mk-foot">
        <div className="mk-brand">
          <span className="mk-monogram">S</span>
          <span className="mk-wordmark">ScriptAlly</span>
        </div>
        <div className="mk-footlinks">
          <button type="button" onClick={() => onNavigate("landing")}>Home</button>
          <button type="button" onClick={() => onNavigate("pricing")}>Pricing</button>
          {doc === "terms"
            ? <button type="button" onClick={() => onNavigate("privacy")}>Privacy</button>
            : <button type="button" onClick={() => onNavigate("terms")}>Terms</button>}
        </div>
      </footer>
    </div>
  );
};
