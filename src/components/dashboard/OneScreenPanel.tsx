/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenPanel — THE dashboard container. One card shell, four consumers.
 *
 * ⚠️ WHY THIS EXISTS. Before it there were four containers with four header treatments, three of
 * them structurally different: Tasks and Activity carried gradient bands that agreed on neither
 * padding (11/18 vs 10/16) nor title size, while Goals and Active queries had no band at all. Any
 * rule about "every dashboard container" — a mark slot, a rim, a band height — had to be written
 * four times, and a test asserting the four agreed would have been asserting a COINCIDENCE
 * maintained by hand. That is the fault this codebase keeps meeting: duplicate rules surviving
 * edits, two counters with one name, `.os-p` beside `.os-pill`.
 *
 * ⚠️ THIS COMMIT IS A VISUAL NO-OP, DELIBERATELY. Every container keeps the exact class list and
 * the exact head markup it had; the panel owns only the shell (classes, loading skeleton, and the
 * ref/handlers a consumer needs). No band is invented for Goals or Active queries here, no mark
 * slot is added, and the rim is untouched — those land on top, each as its own change, so that any
 * pixel that moves in THIS commit is a bug rather than a judgement call.
 *
 * ⚠️ THE HEAD IS A NODE, NOT A SHAPE. The four heads genuinely differ — a trio of count pills, an
 * expand control, an editable goal figure, a control cluster — and forcing them into one prop
 * signature now would either flatten real differences or grow a prop per consumer. The primitive
 * owns WHERE the head goes and what surrounds it; the consumer owns what is in it. When §3 gives
 * Goals and Active queries real bands, the band becomes the panel's job and the heads collapse
 * towards each other on their own.
 */
import React from "react";
import { Skel } from "./OneScreenDashboard";

export interface OneScreenPanelProps {
  /** The container's own class — `os-tasks`, `os-actv`, `os-goal`, `os-lead`. */
  variant: string;
  /** Firestore still resolving → the skeleton overlay, and the content goes `opacity: 0`. */
  loading?: boolean;
  /** Skeleton bar shape, per the existing `Skel` convention. */
  skel?: ("h" | "grow" | "")[];
  /** The header row — the consumer's own markup, rendered first inside the card. */
  head?: React.ReactNode;
  /** ⚠️ `os-lift` is the DEFAULT: every container has it today. Stated so a future opt-out is
   *  explicit rather than a class quietly dropped from one call site. */
  lift?: boolean;
  /** The activity card measures itself for the expand/click-away behaviour. */
  innerRef?: React.Ref<HTMLDivElement>;
  /**
   * ⚠️ THE REF-DIFF HARNESS'S HANDLE, AND IT IS A PROP RATHER THAN A CLASS ON PURPOSE.
   * `scripts/dash-refdiff.mjs` reads `[data-probe]` on both the design ref and this page and
   * compares the two boxes. A class would have to be styled by something to justify its existence;
   * an attribute is inert, which is exactly what a measurement handle should be — it can never
   * change what the page looks like, so it cannot be the reason a diff passes.
   */
  probe?: string;
  children?: React.ReactNode;
}

export const OneScreenPanel: React.FC<OneScreenPanelProps> = ({
  variant, loading = false, skel, head, lift = true, innerRef, probe, children,
}) => (
  <div
    ref={innerRef}
    data-probe={probe}
    className={`os-card${lift ? " os-lift" : ""} ${variant}${loading ? " isload" : ""}`}
  >
    {loading && skel && <Skel bars={skel} />}
    {head}
    {children}
  </div>
);
