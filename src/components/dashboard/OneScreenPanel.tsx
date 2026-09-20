/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenPanel — THE dashboard container. One card shell, five consumers.
 *
 * ⚠️ WHY THIS EXISTS. Before it there were four containers with four header treatments, three of
 * them structurally different: Tasks and Activity carried gradient bands that agreed on neither
 * padding (11/18 vs 10/16) nor title size, while Goals and Active queries had no band at all. Any
 * rule about "every dashboard container" — a mark slot, a rim, a band height — had to be written
 * four times, and a test asserting the four agreed would have been asserting a COINCIDENCE
 * maintained by hand. That is the fault this codebase keeps meeting: duplicate rules surviving
 * edits, two counters with one name, `.os-p` beside `.os-pill`.
 *
 * ⚠️ AND SINCE 20 SEP IT CARRIES ONE TREATMENT, NOT FIVE — solid navy, cream title, no tint per card.
 * The `tone` prop went with the tints; `.os-band` in oneScreen.css says why.
 *
 * ⚠️ SINCE v33 THE BAND IS THE PANEL'S JOB. The heads used to be the consumer's own markup rendered
 * first inside the card (`head`), because they differed structurally; they are one construction now —
 * a band across the top of the frame — so the panel draws it and the consumer supplies only what is
 * IN it. The `head` prop is retired with the last consumer that passed one.
 */
import React from "react";
import { Skel } from "./OneScreenDashboard";

export interface OneScreenPanelProps {
  /** The container's own class — `os-qa`, `os-lead`, `os-cl`, `os-feed`, `os-todo`. */
  variant: string;
  /** Firestore still resolving → the skeleton overlay, and the content goes `opacity: 0`. */
  loading?: boolean;
  /** Skeleton bar shape, per the existing `Skel` convention. */
  skel?: ("h" | "grow" | "")[];
  /**
   * ⚠️ THE HEADER BAND (v33) — the card's title row, drawn INSIDE the burgundy line, edge to edge,
   * taking the frame's top corners (the frame's `overflow: hidden` does the clipping). The consumer
   * passes the row's contents; the panel owns the band itself, so all five are one construction.
   */
  band?: React.ReactNode;
  /** A card with no visible title still has a name: `role="group"` + this as its `aria-label`. */
  label?: string;
  /** ⚠️ `os-lift` is the DEFAULT: every container has it today. Stated so a future opt-out is
   *  explicit rather than a class quietly dropped from one call site. */
  lift?: boolean;
  innerRef?: React.Ref<HTMLDivElement>;
  /**
   * ⚠️ THE MEASUREMENTS' HANDLE, AND IT IS A PROP RATHER THAN A CLASS ON PURPOSE.
   * `tests/e2e/dashTopRow.measure.ts` and `dashStages.measure.ts` read `[data-probe]` on this page
   * (and the former measures the design ref by the same ruler) and compare boxes. (The original
   * reader, `scripts/dash-refdiff.mjs`, was retired on 19 Sep with the v16 mockup it targeted.)
   * A class would have to be styled by something to justify its existence;
   * an attribute is inert, which is exactly what a measurement handle should be — it can never
   * change what the page looks like, so it cannot be the reason a diff passes.
   */
  probe?: string;
  children?: React.ReactNode;
}

/**
 * ⚠️ THE CARD IS A WHITE RIM WITH A FRAME INSIDE IT (v33 — "MountCard v2"). `.os-card` is the 6px
 * rim, its radius and its shadow; `.os-frame` is the 1px burgundy line, 11px radius, and it CLIPS —
 * which is what lets the band run edge to edge and take the top corners without a radius of its own.
 *
 * ⚠️ THIS IS THE DASHBOARD'S OWN CARD AND NOT THE SHARED `MountCard`/`MountPanel`. Those have some
 * twenty-five importers across settings, plans, import and the Query Centre; a rim change there
 * repaints all of them.
 */
export const OneScreenPanel: React.FC<OneScreenPanelProps> = ({
  variant, loading = false, skel, band, label, lift = true, innerRef, probe, children,
}) => (
  <div
    ref={innerRef}
    data-probe={probe}
    role={label ? "group" : undefined}
    aria-label={label}
    className={`os-card${lift ? " os-lift" : ""} ${variant}${loading ? " isload" : ""}`}
  >
    {loading && skel && <Skel bars={skel} />}
    <div className="os-frame" data-probe={probe ? `${probe}-frame` : undefined}>
      {band !== undefined && <div className="os-band" data-probe={probe ? `${probe}-band` : undefined}>{band}</div>}
      {children}
    </div>
  </div>
);
