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

export type ManuscriptTabKey = "pitch" | "details" | "comps" | "packages";

/**
 * ⚠️ THE KEYS ARE INTERNAL, THE LABELS ARE THE PRODUCT. `details` reads "The record" now — the
 * reframe's name for the pane — and the key is left alone because renaming it would churn every
 * call site to say the same thing twice.
 *
 * ⚠️ `The pitch` ARRIVED WITH ITS PANE, in Phase 3, and took the default with it — it was held back
 * from Phase 2 precisely so the dossier never opened onto a tab with nothing behind it. The house
 * law is that the shell renders what EXISTS, never what is planned.
 *
 * ⚠️ AND IT IS FIRST BECAUSE IT IS WHAT THE PAGE IS FOR. The reframe's whole complaint about the
 * old page was that nothing on it had been put there by the writer; the pitch shelf is the answer,
 * so it is what the dossier opens on.
 */
export const MANUSCRIPT_TABS: { key: ManuscriptTabKey; label: string }[] = [
  { key: "pitch", label: "The pitch" },
  { key: "details", label: "The record" },
  { key: "comps", label: "Comparable titles" },
  { key: "packages", label: "Submission packages" },
];

/** The tab the card opens on. */
export const DEFAULT_MANUSCRIPT_TAB: ManuscriptTabKey = "pitch";

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
