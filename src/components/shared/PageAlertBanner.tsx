/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PAGE ALERT BANNER — the Versions page's "queries without a version" banner (versions v2.2, `.wb`), lifted into a
 * shared component for the Query Centre v149 "waiting on you" banner (ruling on v149's Step 0 stop; lock QC149-L0).
 *
 * An icon disc, a headline over one line, up to N initials discs, and one action. The look lives in pageAlertBanner.css.
 *
 * ⚠️ `classPrefix` keeps a page's old class names beside the shared ones (Versions passes "wb"), as PageHeaderCard does.
 * ⚠️ `hidden` is the Query Centre's (the banner is absent at zero); Versions never passes it, so it renders as it did.
 */
import React from "react";
import "./pageAlertBanner.css";

type Data = Record<`data-${string}`, string>;
export interface BannerFace { key: string; initials: string; title?: string }
export interface PageAlertBannerProps {
  headline: React.ReactNode;
  line: React.ReactNode;
  /** the icon inside the disc; the warning triangle by default */
  icon?: React.ReactNode;
  faces?: readonly BannerFace[];
  action?: { label: React.ReactNode; onClick?: () => void; data?: Data };
  /** "rust" is the only tone today (Versions and the Query Centre both draw it) */
  tone?: "rust";
  hidden?: boolean;
  id?: string;
  headlineId?: string;
  facesId?: string;
  classPrefix?: string;
  className?: string;
  role?: string;
  data?: Data;
}

export const WARNING_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 2.8 19.5h18.4z" /><path d="M12 10v4.2M12 17.2v.1" /></svg>
);

export const PageAlertBanner: React.FC<PageAlertBannerProps> = ({ headline, line, icon = WARNING_ICON, faces, action, tone = "rust", hidden, id, headlineId, facesId, classPrefix, className, role = "status", data }) => {
  if (hidden) return null;
  const c = (part: string) => (classPrefix ? `pab${part} ${classPrefix}${part}` : `pab${part}`);
  return (
    <div className={[c(""), `pab--${tone}`, className].filter(Boolean).join(" ")} id={id} role={role} {...data}>
      <span className={c("-i")} aria-hidden="true">{icon}</span>
      <div className={c("-t")}>
        <p className={c("-h")} id={headlineId}>{headline}</p>
        <p className={c("-s")}>{line}</p>
      </div>
      {faces ? <span className={c("-g")} id={facesId}>{faces.map((f) => <span key={f.key} title={f.title}>{f.initials}</span>)}</span> : null}
      {action ? <button type="button" className={c("-b")} onClick={action.onClick} {...action.data}>{action.label}</button> : null}
    </div>
  );
};
