/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactWays — the empty page's ways in (v12 §7, the mock's `.ways4`): Smart import
 * (recommended) and the add card. Copy is the oracle's, verbatim. The downloadable template tile
 * went on 14 Nov (overnight fixes v1): Smart Import is the one way to bring a list in.
 */
import React from "react";

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
