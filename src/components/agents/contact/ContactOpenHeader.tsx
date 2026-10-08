/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15 §2 — THE OPEN HEADER: no card, no band, no container. A two-column grid on the page — the
 * text block (the count as the title, one line under it, two buttons: Add an agent, and View all agents, which
 * scrolls to the list) and the flying hawk to its right, the
 * two centred against each other — closed by a hairline.
 *
 * ⚠️ PAGE-LOCAL, NOT `PageHeader` (ruling 8): the shared header has no 72px typewriter title, no form without an
 * eyebrow, and no drawing in the flow beside the text. `/agents` therefore sits in the e2e censuses' own-header
 * list (`tests/e2e/plateRoutes.ts` OWN_HEADER_ROUTES), not the band or compact lists.
 *
 * ⚠️ THE TITLE KEEPS `data-page-title`, the hook the shared header gives every page title, so anything that asks
 * "has the page's title scrolled past?" finds this one too.
 *
 * ⚠️ THE ART IS SWAPPABLE BY FILE: no version query and no size the layout depends on — the sheet sets the width,
 * and the attributes only carry the drawing's ratio (a 2× export keeps it).
 */
import React from "react";
import "./contactV15.css";

/** the header's drawing: a flying hawk carrying an agent card, facing left, transparent */
export const CONTACT_HEADER_HAWK = { src: "/images/contact/contact-header-hawk.png", width: 576, height: 383 };

export const CONTACT_HEADER_SUB = "Your agent data underpins everything. Collate and manage it here.";

/** the banner above the list (v15.2 §4) — exact */
export const CONTACT_BANNER_LINE = "Your agent will be the one who champions your words.";

/** "{N} agents on file" — one agent is "1 agent on file" */
export const onFileTitle = (n: number): string => `${n} agent${n === 1 ? "" : "s"} on file`;

export const ContactOpenHeader: React.FC<{
  /** the living count; null while the page settles (the title holds its shape, painted over) */
  count: number | null;
  addRef?: React.Ref<HTMLButtonElement>;
  onAdd: () => void;
  /** scrolls to the list and puts the caret in its Find field (v15.2 §5) */
  onViewAll: () => void;
}> = ({ count, addRef, onAdd, onViewAll }) => {
  const loading = count === null;
  return (
    <header className="cl15-hd" data-cl15="header" data-own-header="" data-loading={loading ? "" : undefined}>
      <div className="cl15-txt" data-cl15="header-text">
        <h1 className="cl15-title" data-probe="title" data-page-title="">{onFileTitle(count ?? 0)}</h1>
        <p className="cl15-sub" data-cl15="sub">{CONTACT_HEADER_SUB}</p>
        <div className="cl15-acts">
          <button ref={addRef} type="button" className="cl15-b1" data-cl15="add" onClick={onAdd} disabled={loading}>+ Add an agent</button>
          <button type="button" className="cl15-b2" data-cl15="view-all" onClick={onViewAll} disabled={loading}>View all agents</button>
        </div>
      </div>
      <div className="cl15-art" data-cl15="header-art" aria-hidden="true">
        <img src={CONTACT_HEADER_HAWK.src} width={CONTACT_HEADER_HAWK.width} height={CONTACT_HEADER_HAWK.height} alt="" />
      </div>
    </header>
  );
};
