/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE OPEN HEADER (Your notes v1, extracted from Query Centre v153.1's `QcHeader1531`): straight on the page's ground,
 * three columns — the drawing, the title block (the big title, the rule-flanked "for" line, the buttons) and the ring.
 * What goes in each slot is the caller's; the frame is this one component.
 *
 * ⚠️ IT RENDERS THE QUERY CENTRE'S OWN CLASSES (`qc1531-*`, queries/centre/qcv1531.css); a page that mounts it carries
 *    `.qc151` on a wrapper so the rules scoped to that page reach it (To-do v54 does the same). `QcHeader1531` renders
 *    through this, and openHeaderShared.test.tsx holds its markup byte-identical to the pre-extraction capture.
 * ⚠️ `data-*` PROBES ARE THE CALLER'S (`attrs`, `titleAttrs`, `forAttrs`): every lock on the Query Centre reads its own.
 */
import React from "react";
import "../queries/centre/qcv1531.css";

type Attrs = Record<string, string>;

export const OpenHeader: React.FC<{
  /** classes after `qc1531-hd` */
  className?: string;
  attrs?: Attrs;
  /** the drawing (the slot is `aria-hidden`: the drawing is decoration) */
  art: React.ReactNode;
  artClassName?: string;
  title: React.ReactNode;
  titleAttrs?: Attrs;
  /** the rule-flanked line: "<em>for</em> Murphy's Day Out", or nothing */
  forLine?: { lead: string; text: React.ReactNode; attrs?: Attrs } | null;
  actions: React.ReactNode;
  ring?: React.ReactNode;
}> = ({ className, attrs, art, artClassName, title, titleAttrs, forLine, actions, ring = null }) => (
  <header className={`qc1531-hd${className ? ` ${className}` : ""}`} {...attrs}>
    <div className={`qc1531-art${artClassName ? ` ${artClassName}` : ""}`} aria-hidden="true">{art}</div>
    <div className="qc1531-main">
      <h1 className="qc1531-t" data-page-title="true" {...titleAttrs}>{title}</h1>
      {forLine ? (
        <p className="qc1531-for" {...forLine.attrs}><i aria-hidden="true" /><span><em>{forLine.lead}</em> {forLine.text}</span><i aria-hidden="true" /></p>
      ) : null}
      <div className="qc1531-acts">{actions}</div>
    </div>
    <div className="qc1531-rc">{ring}</div>
  </header>
);
