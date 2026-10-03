/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactWays — the empty page's three ways in (v12 §7, the mock's `.ways4`): Smart import
 * (recommended), the downloadable template, and the add card. Copy is the oracle's, verbatim.
 *
 * ⚠️ THE TEMPLATE TILE IS AN <a download> ON THE REAL ASSET — the sheet the import flow already
 * accepts back (public/QueryHawk-pipeline-import-template.xlsx). A button that fabricated a
 * download would be a second path to the same file; the anchor IS the download mechanism.
 */
import React from "react";

export const CONTACT_TEMPLATE_HREF = "/QueryHawk-pipeline-import-template.xlsx";

export interface ContactWaysProps {
  onImport: () => void;
  onAdd: () => void;
}

export const ContactWays: React.FC<ContactWaysProps> = ({ onImport, onAdd }) => (
  <div className="clv-ways" data-clv="ways">
    <button type="button" className="clv-cd cd clv-cd--pri" data-clv="way-import" onClick={onImport}>
      <span className="clv-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M4 17v3h16v-3" /><path d="M12 4v11" /><path d="M8 11l4 4 4-4" /></svg>
      </span>
      <span className="clv-cdbody">
        <h3>Smart import.<em className="clv-cdtag">Recommended</em></h3>
        <p>Paste or upload the list you’ve been keeping. QueryHawk reads the names, agencies and what they ask for, and shows you what it found before anything is saved.</p>
      </span>
      <span className="clv-cdgo">Import a spreadsheet</span>
      <small>CSV · XLSX · Google Sheets</small>
    </button>
    <a className="clv-cd cd" data-clv="way-template" href={CONTACT_TEMPLATE_HREF} download>
      <span className="clv-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
      </span>
      <span className="clv-cdbody">
        <h3>Downloadable template.</h3>
        <p>Not keeping a list yet? Start in a sheet you already know, fill it in at your own pace, then bring it back here in one go.</p>
      </span>
      <span className="clv-cdgo">Download the template</span>
      <small>XLSX · comes back as an import</small>
    </a>
    <button type="button" className="clv-cd cd" data-clv="way-add" onClick={onAdd}>
      <span className="clv-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z" /></svg>
      </span>
      <span className="clv-cdbody">
        <h3>Add manually.</h3>
        <p>Add your first agent by hand: name, agency, what they want. Everything else builds from there.</p>
      </span>
      <span className="clv-cdgo">Add an agent</span>
      <small>The card, step by step</small>
    </button>
  </div>
);
