/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenPro — the Pro banner (v16 §5; ref design-refs/dashboard-v16.html).
 *
 * ⚠️ IT MOVED OUT OF THE RAIL and grew: full width beneath tasks, ~132px, room for a headline and
 * a sentence rather than a label and a link. The rail's mini is GONE — one upsell per screen, or
 * the page sells the same thing twice.
 *
 * ⚠️ PASTILLE-BLUE ONLY. Pro's accent is blue sitewide, and it is the only blue on this page —
 * which is exactly what makes it read as a different KIND of thing from the writer's own work.
 *
 * ⚠️ A PAYING USER IS NEVER SOLD TO (house law, panel-foot pack). The rail's mini did not check
 * the plan and showed to Pro users too; moving it is the moment that stops.
 */
import React from "react";
import { User } from "../../types";
import { isProUser } from "../../lib/suggestComps";
import { Skel } from "./OneScreenDashboard";

export const OneScreenPro: React.FC<{
  loading: boolean;
  currentUser: User | null;
  onNavigate: (tab: string, sub?: string) => void;
}> = ({ loading, currentUser, onNavigate }) => {
  if (isProUser(currentUser)) return null;
  return (
    <button type="button" className={`os-card os-probanner${loading ? " isload" : ""}`} onClick={() => onNavigate("plans")}>
      {loading && <Skel bars={["h", ""]} />}
      <span className="os-pimg2" aria-hidden="true">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
      </span>
      <span className="os-ptxt">
        <span className="os-plab2">ScriptAlly Pro</span>
        <span className="os-phead">More room for the journey</span>
        <span className="os-pline">Unlimited manuscripts, deeper querying analytics and live agent wishlist matching.</span>
      </span>
      <span className="os-plink2">See what&rsquo;s included <span className="os-arr">→</span></span>
    </button>
  );
};
