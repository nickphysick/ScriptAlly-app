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
 * ⚠️ THE PRIVACY POLICY'S §4 COVERS SMART IMPORT AND MUST KEEP DOING SO. Uploading a spreadsheet
 * sends its CONTENTS to Anthropic's API (functions/src/smartImport.ts), as does the email drop and
 * the comps suggester. The section is not trimmable.
 */

import React from "react";
import { LEGAL_DOCUMENTS, LEGAL_COPY_REVIEWED, DRAFT_TAG, LegalDocumentKey, LegalBlock } from "./legalCopy";
import { DocumentShell } from "./DocumentShell";
import { MarketingFooter } from "./MarketingFooter";
import { LegalPlate } from "./marketingMarks";
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

export const LegalPage: React.FC<{ doc: LegalDocumentKey; onNavigate: Nav }> = ({ doc, onNavigate }) => {
  const document_ = LEGAL_DOCUMENTS[doc];

  return (
    <div>
      <DocumentShell
        documentTitle={document_.documentTitle}
        eyebrow={document_.eyebrow}
        title={document_.title}
        meta={`Last updated ${document_.lastUpdated}`}
        /* ⚠️ ONE FLAG, ONE EFFECT. Setting LEGAL_COPY_REVIEWED true removes the ribbon and changes
           nothing else on the page — no copy, no geometry, no route. A document that looks
           finished and is not is worse than an obviously unfinished one, because nobody chases it. */
        draft={LEGAL_COPY_REVIEWED ? undefined : { tag: DRAFT_TAG, body: document_.draftBody }}
        plate={<LegalPlate doc={doc} />}
      >
        <p className="mk-doclede">{document_.lede}</p>

        {document_.sections.map((section, i) => (
          <section className="mk-docsection" key={section.heading}>
            {/* The number is derived from position, so inserting a section renumbers the rest —
                a hand-written label would leave two sections called 07 and a cross-reference
                pointing at the wrong one. */}
            <div className="mk-seclabel">{String(i + 1).padStart(2, "0")}</div>
            <h2 className="mk-sectitle">{section.heading}</h2>
            {section.blocks.map((block, j) => <Block key={j} block={block} onNavigate={onNavigate} />)}
          </section>
        ))}
      </DocumentShell>

      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};
