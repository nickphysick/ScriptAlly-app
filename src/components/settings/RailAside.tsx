/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RailAside — the card that stops the left column looking stubby.
 *
 * ⚠️ ITS JOB IS DEPTH, NOT CONTENT. The nav is six rows tall and the work column is at least 520,
 * so the rail used to end a third of the way down beside a card that did not — the third of the
 * three faults this rework fixes. The aside FLEXES to fill whatever the nav leaves, which is why
 * it takes no height of its own and bottom-aligns what it says.
 *
 * ⚠️ AND IT READS THE PLAN DATA RATHER THAN RESTATING IT. `planAllowanceLine` derives its one line
 * from `PLAN_ROWS` — the same rows Plan & billing renders — so the rail cannot come to disagree
 * with the comparison two clicks away. Writing the sentence by hand here would rebuild exactly the
 * duplication an earlier phase spent its whole diff removing from `PlansPage`.
 */
import React from "react";
import { MountPanel } from "../MountPanel";
import { planAllowanceLine } from "../../lib/planComparison";

export const RailAside: React.FC<{ plan: "free" | "pro" }> = ({ plan }) => (
  <MountPanel className="acct-aside">
    <div className="acct-aside-in">
      {/* The illustration slot lands here in Phase 4, above the text. */}
      <div className="acct-aside-txt">
        <span className="acct-aside-k">Your plan</span>
        <span className="acct-aside-v">{plan === "pro" ? "Pro" : "Free"}</span>
        <span className="acct-aside-note">{planAllowanceLine(plan)}.</span>
      </div>
    </div>
  </MountPanel>
);
