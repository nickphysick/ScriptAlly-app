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
 * ⚠️ THE WORDS LIVE IN `legalCopy.ts` AND NOWHERE ELSE. This file builds the ROUTE and hands the
 * copy to the shared `DocumentShell`; replacing the wording after legal review is an edit to that
 * one file with no component work at all.
 *
 * ⚠️ THE PRIVACY POLICY MUST COVER SMART IMPORT. Uploading a spreadsheet sends its CONTENTS to
 * Anthropic's API for mapping (functions/src/smartImport.ts), as does the email drop
 * (functions/src/emailImport.ts) and the comps suggester. That is third-party processing of the
 * writer's own agent list and correspondence.
 */

import React from "react";
import { LEGAL_DOCUMENTS, LegalDocumentKey } from "./legalCopy";
import { DocumentShell } from "./DocumentShell";
import { MarketingFooter } from "./MarketingFooter";
import { LegalPlate } from "./marketingMarks";

export const LegalPage: React.FC<{
  doc: LegalDocumentKey;
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ doc, onNavigate }) => {
  const document_ = LEGAL_DOCUMENTS[doc];

  return (
    <div>
      <DocumentShell
        documentTitle={document_.documentTitle}
        eyebrow={document_.eyebrow}
        title={document_.title}
        /* ⚠️ THE PLACEHOLDER SAYS SO, IN THE PAGE, WHERE A READER SEES IT — not only in a comment
           where only we do. A legal page that looks finished and is not is worse than an obviously
           unfinished one, because nobody chases it. */
        draft={{ tag: "Working draft", body: `${document_.noticeHeading} ${document_.noticeBody}` }}
        plate={<LegalPlate doc={doc} />}
      >
        {document_.sections.map((section, i) => (
          <section className="mk-docsection" key={section.heading}>
            <div className="mk-seclabel">{String(i + 1).padStart(2, "0")}</div>
            <h2 className="mk-sectitle">{section.heading}</h2>
            {section.paragraphs.map((paragraph, j) => <p key={j}>{paragraph}</p>)}
          </section>
        ))}
      </DocumentShell>

      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};
