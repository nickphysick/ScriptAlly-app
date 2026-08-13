/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The card's tab row. Reference: design-refs/manuscripts-plate.html, `.tabs.rule`.
 *
 * ⚠️ TAB STATE IS LOCAL AND STAYS LOCAL — no route, no URL param, no persistence. The card owns a
 * `useState` and passes it down; this component is controlled and holds nothing. Routing is not in
 * this task's scope, and a tab that wrote to the URL would turn a within-card toggle into
 * navigation the shell would have to model.
 *
 * ⚠️ NO PRO CHIP ON ANY TAB. Submission packages carried one in the mockup, and the ruling removed
 * it: that route has no Pro gate today, so a chip would sell a feature the user already has. Tab
 * labels are all unchipped, and the lock says so — this is the second time a Pro-selling surface
 * has been retired from packages, and the mockup still draws it.
 */
import React from "react";
import "./manuscriptPlate.css";

export type ManuscriptTabKey = "details" | "comps" | "packages";

/**
 * ⚠️ THE KEYS ARE INTERNAL, THE LABELS ARE THE PRODUCT. `details` reads "The record" now — the
 * reframe's name for the pane — and the key is left alone because renaming it would churn every
 * call site to say the same thing twice.
 *
 * ⚠️ AND `The pitch` IS DELIBERATELY NOT HERE YET. The reframe makes it the fourth tab and the
 * default, but its pane is Phase 3's build — so adding the tab now would open the dossier onto
 * nothing for one commit. The house law is that the shell renders what EXISTS, never what is
 * planned; a tab that goes nowhere teaches the wrong shape of the page. It arrives WITH its pane,
 * and takes the default with it.
 */
export const MANUSCRIPT_TABS: { key: ManuscriptTabKey; label: string }[] = [
  { key: "details", label: "The record" },
  { key: "comps", label: "Comparable titles" },
  { key: "packages", label: "Submission packages" },
];

/** The tab the card opens on. */
export const DEFAULT_MANUSCRIPT_TAB: ManuscriptTabKey = "details";

export interface ManuscriptTabsProps {
  active: ManuscriptTabKey;
  onChange: (key: ManuscriptTabKey) => void;
}

export const ManuscriptTabs: React.FC<ManuscriptTabsProps> = ({ active, onChange }) => (
  <div className="msv-tabs" role="tablist">
    {MANUSCRIPT_TABS.map((t) => (
      <button
        key={t.key}
        type="button"
        role="tab"
        aria-selected={t.key === active}
        className={`msv-tab${t.key === active ? " on" : ""}`}
        onClick={() => onChange(t.key)}
      >
        {t.label}
      </button>
    ))}
  </div>
);
