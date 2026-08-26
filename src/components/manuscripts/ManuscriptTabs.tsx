/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The book profile's tab rail, seated in the hero's bottom edge.
 * Reference: `design-refs/manuscripts-book-profile.html`, `.tabs`.
 *
 * ⚠️ TAB STATE IS LOCAL AND STAYS LOCAL — no route, no URL param, no persistence. The page owns a
 * `useState` above the card and passes it down; this component is controlled and holds nothing.
 * A tab that wrote to the URL would turn a within-card toggle into navigation the shell must model.
 *
 * ⚠️ THERE IS NO PACKAGES TAB, AND ITS ABSENCE IS THE POINT. Sample material points at a book
 * version; packages never reference a version. A Packages tab here would imply an edge between the
 * manuscript's versions and its packages that does not exist and must not be created — so packages
 * appear on this page as a footer link and nothing more.
 *
 * ⚠️ AND ONLY VERSIONS CARRIES A PRO PILL. Comparable titles is FREE (only its Scout is Pro) and
 * Submission packages has no gate at all, so a chip on either would sell a writer something they
 * already have. That has been got wrong on this page once already.
 */
import React from "react";
import "./manuscriptPlate.css";
import "./bookProfile.css";

export type ManuscriptTabKey = "overview" | "journey" | "comps" | "versions" | "notes";

export interface ManuscriptTabSpec {
  key: ManuscriptTabKey;
  label: string;
  /** True where the tab states how many things are behind it. */
  counted?: boolean;
  pro?: boolean;
}

/**
 * ⚠️ THE ORDER IS THE READING ORDER OF THE BOOK'S OWN STORY: what it is, where it has been, what
 * it stands beside, what shapes it has taken, what you have thought about it.
 */
export const MANUSCRIPT_TABS: readonly ManuscriptTabSpec[] = [
  { key: "overview", label: "Overview" },
  { key: "journey", label: "Journey" },
  { key: "comps", label: "Comparable titles", counted: true },
  { key: "versions", label: "Versions", counted: true, pro: true },
  { key: "notes", label: "Notes", counted: true },
];

/** The tab the profile opens on. */
export const DEFAULT_MANUSCRIPT_TAB: ManuscriptTabKey = "overview";

export interface ManuscriptTabsProps {
  active: ManuscriptTabKey;
  onChange: (key: ManuscriptTabKey) => void;
  /**
   * How many things sit behind each counted tab. A count is rendered ONLY where the tab declares
   * one and the caller supplies it — never as a `0` invented for a tab whose data has not loaded.
   */
  counts?: Partial<Record<ManuscriptTabKey, number>>;
}

export const ManuscriptTabs: React.FC<ManuscriptTabsProps> = ({ active, onChange, counts }) => (
  <div className="msp-tabs" role="tablist">
    {MANUSCRIPT_TABS.map((t) => {
      const n = t.counted ? counts?.[t.key] : undefined;
      return (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === active}
          className={`msp-tab${t.key === active ? " on" : ""}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {/* ⚠️ A COUNT OF NOUGHT IS STATED. "Comparable titles 0" is the fact that the shelf is
              empty; a tab that silently drops its count reads as though the number were unknown. */}
          {n !== undefined && <span className="msp-tabcnt">{n}</span>}
          {t.pro && <span className="msp-tabpro">Pro</span>}
        </button>
      );
    })}
  </div>
);
