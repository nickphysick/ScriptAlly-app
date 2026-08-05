/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryAnalytics — the Queries section's second destination (Amendment 1, H3).
 *
 * ⚠️ A PLACEHOLDER, AND HONEST ABOUT IT. The amendment adds Analytics to the nav so the sidebar
 * carries destinations rather than filters; the analysis itself is not in this pack. A nav entry
 * that opened onto nothing at all would be the dead link the shell's whole IA rule exists to
 * prevent, so the route exists and says plainly what it is.
 *
 * ⚠️ IT INVENTS NO FIGURES. A placeholder showing plausible-looking numbers is worse than an
 * empty one: it is read as data. There are none here.
 *
 * TODO(analytics-page): the real page — response rates over time, agent-by-agent outcomes, and
 * the reply-window distribution that packageMetrics already derives.
 */
import React from "react";

export const QueryAnalytics: React.FC = () => (
  <div className="qa-wrap">
    <h1 className="qa-title">Analytics</h1>
    <p className="qa-note">
      Response rates, reply times and outcomes across your queries — coming soon.
    </p>
  </div>
);
