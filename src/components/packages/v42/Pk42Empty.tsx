/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v42 Part F (screen 15) — the empty state: with no live packages, the stat tiles and the builder
 * are hidden and this white card takes their place (framed like the builder): the Fledgling on the left, "No packages
 * yet" in the typewriter, one line on what a package is, and a navy "+ New package" that opens the New drawer. With
 * only retired packages the card shows with the "Retired (n)" link (the tile row, holding just that link). The ref
 * leaves an empty outline under the card; that is a mock artefact and is not built.
 */
import React from "react";
import { EMPTY_BODY, EMPTY_TITLE } from "../../../lib/packagesV42";

export const FLEDGLING = "/images/founding/founding-fledgling.png";

export const Pk42Empty: React.FC<{ onNew: () => void }> = ({ onNew }) => (
  <section className="p42-emp" aria-label={EMPTY_TITLE} data-pk42="empty">
    <img className="p42-emp-art" src={FLEDGLING} alt="" aria-hidden="true" />
    <div className="p42-emp-tx">
      <h2 className="p42-emp-h" data-pk42="empty-title">{EMPTY_TITLE}</h2>
      <p>{EMPTY_BODY}</p>
    </div>
    <button type="button" className="p42-emp-new" data-pk42="empty-new" onClick={onNew}>+ New package</button>
  </section>
);
