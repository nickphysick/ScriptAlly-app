/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Submission materials" — per-type version counts for this manuscript, derived live from the
 * Builder's versions collection (nothing pre-stored). Glyphs are the canonical TypeGlyph.
 */
import React from "react";
import { ComponentType, ManuscriptVersion } from "../../types";
import { TypeGlyph } from "../packages/TypeGlyph";

const MATERIAL_ROWS: { type: ComponentType; label: string }[] = [
  { type: ComponentType.QUERY_LETTER, label: "Query letter" },
  { type: ComponentType.SYNOPSIS, label: "Synopsis" },
  { type: ComponentType.SAMPLE_PAGES, label: "Sample pages" },
];

interface MaterialsCardProps {
  /** Versions already scoped to the active manuscript. */
  versions: ManuscriptVersion[];
  onOpenBuilder: () => void;
}

export const MaterialsCard: React.FC<MaterialsCardProps> = ({ versions, onOpenBuilder }) => (
  <div className="msv-panel">
    <div className="msv-band">
      <h3>Submission materials</h3>
    </div>
    <div className="msv-matbody">
      {MATERIAL_ROWS.map(({ type, label }) => {
        const count = versions.filter((v) => v.componentType === type).length;
        return (
          <div key={type} className="msv-matrow">
            <div className="msv-matglyph">
              <TypeGlyph type={type} size={13} />
            </div>
            <span className="msv-nm">{label}</span>
            <span className={`msv-st${count > 0 ? " ok" : ""}`}>
              {count > 0 ? `${count} ${count === 1 ? "VERSION" : "VERSIONS"}` : "—"}
            </span>
          </div>
        );
      })}
    </div>
    <div className="msv-fieldfoot">
      <button type="button" className="msv-linky" onClick={onOpenBuilder}>
        OPEN PACKAGE BUILDER &rarr;
      </button>
    </div>
  </div>
);
