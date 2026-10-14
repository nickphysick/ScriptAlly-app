/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 §J — ONE INITIALS CIRCLE. Who the agent is to you, never whose turn it is:
 *
 *   none      not queried  `#f4eee5` with an inset 1.5px `#2a3a52` ring, ink initials
 *   querying  querying     `#2a3a52`, cream initials
 *   closed    closed       `#b3aca5`, `#2b2622` initials (the one stone grey)
 *
 * The initials are JetBrains Mono 700, scaled to the size (0.31 of it, at least 8.5px). `selected` is the list's
 * select-several state: ink with a white ✓. `tone="agency"` is the import review's agency-only circle, which keeps
 * its own tone (no agent name to stand for).
 *
 * ⚠️ NO OTHER STYLESHEET SETS AN INITIALS CIRCLE'S BACKGROUND: this file's `agentDisc.css` is the only one (lock J1).
 */
import React from "react";
import "./agentDisc.css";

export type DiscStanding = "none" | "querying" | "closed";

export const AgentDisc: React.FC<{
  initials: string;
  standing: DiscStanding;
  size: number;
  selected?: boolean;
  /** the import review's agency-only circle */
  tone?: "agency";
  className?: string;
  title?: string;
  /** passed through, for the pages' own probes */
  attrs?: Record<string, string | undefined>;
}> = ({ initials, standing, size, selected = false, tone, className, title, attrs }) => (
  <span
    className={`sa-disc${className ? ` ${className}` : ""}`}
    data-disc={standing} data-tone={tone} data-selected={selected ? "" : undefined}
    title={title} aria-hidden={title ? undefined : true}
    style={{ width: size, height: size, fontSize: Math.max(8.5, Math.round(size * 0.31 * 2) / 2) }}
    {...attrs}
  >
    {selected ? <svg className="sa-disc-tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg> : initials}
  </span>
);
