/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PAGE HEADER CARD — the Versions page's title card (versions v2.2 A, `.hb`), lifted into a shared component for the
 * Query Centre v149 header (ruling on v149's Step 0 stop: lift it and prove Versions does not change; lock QC149-L0).
 *
 * Title on the left with an optional tag pill, a body line (rich, so a manuscript name can be bold), two buttons, and an
 * illustration on the right. The look lives in pageHeaderCard.css; the page owns only where the card sits.
 *
 * ⚠️ `classPrefix` KEEPS A PAGE'S OLD CLASS NAMES BESIDE THE SHARED ONES ("hb" → `hb`, `hb-tx`, `hb-tag`, …). Versions'
 *    own layout rules and its e2e suite read those names; with the prefix its DOM keeps every hook it had.
 */
import React from "react";
import "./pageHeaderCard.css";

type Data = Record<`data-${string}`, string>;
export interface HeaderCardButton {
  label: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** data attributes for the page's probes, e.g. { "data-vv2": "new" } */
  data?: Data;
  buttonRef?: React.Ref<HTMLButtonElement>;
}
export interface PageHeaderCardProps {
  /** the h1's text */
  title: React.ReactNode;
  /** a small pill after the title ("Pro"); omitted when absent */
  tag?: React.ReactNode;
  /** the body line, rich text */
  body: React.ReactNode;
  primary: HeaderCardButton;
  secondary?: HeaderCardButton;
  /** the illustration's src; the art box is decorative (aria-hidden) */
  art?: string;
  /** the h1's id (the section is labelled by it) */
  titleId: string;
  /** the page's own class names, kept beside the shared ones */
  classPrefix?: string;
  className?: string;
  /** data attributes on the section and the h1 */
  data?: Data;
  titleData?: Data;
}

export const PageHeaderCard: React.FC<PageHeaderCardProps> = ({ title, tag, body, primary, secondary, art, titleId, classPrefix, className, data, titleData }) => {
  const c = (part: string) => (classPrefix ? `phc${part} ${classPrefix}${part}` : `phc${part}`);
  return (
    <section className={[c(""), className].filter(Boolean).join(" ")} aria-labelledby={titleId} {...data}>
      <div className={c("-tx")}>
        <h1 id={titleId} {...titleData}>{title}{tag != null ? <> <span className={c("-tag")}>{tag}</span></> : null}</h1>
        <p>{body}</p>
        <div className={c("-b")}>
          <button type="button" className={c("-p")} ref={primary.buttonRef} disabled={primary.disabled} onClick={primary.onClick} {...primary.data}>{primary.label}</button>
          {secondary ? (
            <button type="button" className={c("-s")} ref={secondary.buttonRef} disabled={secondary.disabled} onClick={secondary.onClick} {...secondary.data}>{secondary.label}</button>
          ) : null}
        </div>
      </div>
      {art ? <div className={c("-art")} aria-hidden="true"><img src={art} alt="" /></div> : null}
    </section>
  );
};
