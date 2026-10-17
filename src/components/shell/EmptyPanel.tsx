/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EmptyPanel — the app's "nothing here yet" header (`.ae-panel` in design-refs/analytics-v24 and
 * design-refs/comps-v28): a navy panel, an eyebrow, a two-line typewriter title, a paragraph, two buttons, and the
 * page's drawing on the right. Its pair once the page has something is `LightHeader`.
 *
 * ⚠️ LIFTED FROM PAGE-LOCAL COPIES (comps v28 §0.1): Analytics' `A21Empty` panel and the Query Centre's
 *    `QcEmpty138` draw it themselves. Comparable titles is the first page on the shared part.
 * ⚠️ lib/brand.tsx forces h1: the face is stated with two classes and `!important`.
 */
import React from "react";
import "./emptyPanel.css";

export const EmptyPanel: React.FC<{
  eyebrow: string;
  /** visible title (a `<br />` is the caller's); `titleLabel` is what a screen reader reads */
  title: React.ReactNode;
  titleLabel: string;
  body: React.ReactNode;
  acts: React.ReactNode;
  art?: React.ReactNode;
  className?: string;
  attrs?: Record<string, string | undefined>;
}> = ({ eyebrow, title, titleLabel, body, acts, art, className, attrs }) => (
  <div className={`epn${className ? ` ${className}` : ""}`} data-epn="panel" data-own-header="" {...attrs}>
    <div className="epn-t">
      <p className="epn-k" data-epn="eyebrow">{eyebrow}</p>
      <h1 className="epn-h1" data-page-title="" data-epn="title" tabIndex={-1} aria-label={titleLabel}><span aria-hidden="true">{title}</span></h1>
      <p className="epn-p" data-epn="body">{body}</p>
      <div className="epn-b" data-epn="acts">{acts}</div>
    </div>
    {art ? <div className="epn-art" data-epn="art">{art}</div> : null}
  </div>
);
