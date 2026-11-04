/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2 · the framed card (Part B): the landing page's look — a 7px white rim, a 1px inner frame, a tinted
 * band. ⚠️ IT RENDERS THE SAME THREE CLASSES THE BUILT HOOP CARDS DO (`os-card › os-frame › os-band`), so one sheet
 * (`dash2Frame.css`, scoped to `.d58.d2`) dresses all five cards and the two built ones are never forked.
 */
import React from "react";
import "./dash2Frame.css";

export type FrameTone = "sand" | "sage" | "stone" | "navy" | "rose";

export const Frame: React.FC<{
  tone: FrameTone;
  title: React.ReactNode;
  meta?: React.ReactNode;
  label: string;
  probe: string;
  loading?: boolean;
  className?: string;
  /** extra `data-*` attributes for the section (the founding card's figures, read by its lock) */
  data?: Record<string, string | number | undefined>;
  children: React.ReactNode;
}> = ({ tone, title, meta, label, probe, loading, className, data, children }) => (
  <section className={`os-card d2-card${className ? ` ${className}` : ""}`} role="group" aria-label={label} data-d2-card={probe} data-loading={loading ? "1" : "0"}
    {...Object.fromEntries(Object.entries(data ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [`data-${k}`, v]))}>
    <div className="os-frame">
      <div className={`os-band d2-tone--${tone}`}>
        <div className="os-bandrow">
          <h2 className="os-cardttl d2-cardttl">{title}</h2>
          {meta != null && <span className="d2-meta">{meta}</span>}
        </div>
      </div>
      {children}
    </div>
  </section>
);
