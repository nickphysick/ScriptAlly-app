/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The founder's note is placeholder voice — the real story + name live in one constant
 * (content.ts → FOUNDER_NOTE). Paragraph text supports a simple {em}…{/em} accent.
 */
import React from "react";
import { FOUNDER_NOTE } from "./content";

/** Render a paragraph string, turning {em}…{/em} spans into Lora-italic accents. */
const withEm = (text: string): React.ReactNode =>
  text.split(/(\{em\}.*?\{\/em\})/g).map((part, i) => {
    const m = part.match(/^\{em\}(.*?)\{\/em\}$/);
    return m ? <em key={i}>{m[1]}</em> : <React.Fragment key={i}>{part}</React.Fragment>;
  });

export const FounderNote: React.FC = () => {
  const f = FOUNDER_NOTE;
  return (
    <section className="founder">
      <div className="founder-in">
        <div className="eye">{f.eyebrow}</div>
        <p className="lead">{withEm(f.lead)}</p>
        {f.paragraphs.map((p, i) => (
          <p key={i}>{withEm(p)}</p>
        ))}
        <div className="by">
          <span className="ava">{f.signatureInitial}</span>
          <span className="who">
            <span className="sg">{f.signatureName}</span>
            <span className="rl">{f.signatureRole}</span>
          </span>
        </div>
        {f.placeholderNote && <span className="placeholder">{f.placeholderNote}</span>}
      </div>
    </section>
  );
};
