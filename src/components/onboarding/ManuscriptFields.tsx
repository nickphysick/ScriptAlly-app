/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared manuscript field set for the onboarding branches (A3a / A3b / B2), matching the
 * approved sketches: mono labels, white Form 11 inputs, paired age/genre dropdowns, a removable
 * sub-genre pill row with an "add additional sub-genre" link, and a word-count input whose muted
 * placeholder is the typical range for the chosen primary genre (never pre-filled).
 */
import React, { useState } from "react";
import { BrandDropdown } from "../forms";
import { PREDEFINED_GENRES, AGE_CATEGORIES, genreWordCountRange } from "../../lib/manuscripts";
import "./onboarding.css";

/**
 * A field's label: mono, upper case, with its qualifier quiet beside it. The WORDS are unchanged
 * from the card this replaced — "Strapline (optional)", "Genre (primary)" — only the dress moved
 * to the set-up sheet's (onboarding v5).
 */
export const OnbLabel: React.FC<{ children: React.ReactNode; optional?: string }> = ({ children, optional }) => (
  <label className="sf-lab">
    {children}
    {optional && <span className="sf-labq"> ({optional})</span>}
  </label>
);

const ageOptions = AGE_CATEGORIES.map((a) => ({ value: a, label: a }));
const genreOptions = PREDEFINED_GENRES.map((g) => ({ value: g, label: g }));

export interface ManuscriptFieldsState {
  title: string;
  strapline: string;
  ageCategory: string;
  genre: string;
  subGenres: string[];
  wordCount: string; // raw digits as typed; parsed on save
}

export const emptyManuscriptFields = (): ManuscriptFieldsState => ({
  title: "",
  strapline: "",
  ageCategory: "Adult",
  genre: "",
  subGenres: [],
  wordCount: "",
});

export interface ManuscriptFieldsProps {
  value: ManuscriptFieldsState;
  onChange: (v: ManuscriptFieldsState) => void;
  titleLabel?: string;
  titleOptional?: boolean;
  /** Strapline shown for the full field set (A3a / B2); hidden on the lighter A3b. */
  showStrapline?: boolean;
  /** Word count shown for the full field set; hidden on the lighter A3b. */
  showWordCount?: boolean;
}

export const ManuscriptFields: React.FC<ManuscriptFieldsProps> = ({
  value,
  onChange,
  titleLabel = "Manuscript title",
  titleOptional = false,
  showStrapline = true,
  showWordCount = true,
}) => {
  const [addingSub, setAddingSub] = useState(false);
  const set = (patch: Partial<ManuscriptFieldsState>) => onChange({ ...value, ...patch });

  const subGenreOptions = PREDEFINED_GENRES
    .filter((g) => g !== value.genre && !value.subGenres.includes(g))
    .map((g) => ({ value: g, label: g }));

  const range = genreWordCountRange(value.ageCategory, value.genre);

  return (
    <div className="sf-fields">
      <div className="sf-field">
        <OnbLabel optional={titleOptional ? "optional" : undefined}>{titleLabel}</OnbLabel>
        <input
          type="text" className="sf-in"
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="e.g. The Salt Path Home"
        />
      </div>

      {showStrapline && (
        <div className="sf-field">
          <OnbLabel optional="optional">Strapline</OnbLabel>
          <input
            type="text" className="sf-in"
            value={value.strapline}
            onChange={(e) => set({ strapline: e.target.value })}
            placeholder="One line that sells the story…"
          />
        </div>
      )}

      {/* Age category and genre share a row from 900 wide. Both stay pick-lists. */}
      <div className="sf-fieldrow">
        <div className="sf-field">
          <OnbLabel>Age category</OnbLabel>
          <BrandDropdown value={value.ageCategory} options={ageOptions} onChange={(v) => set({ ageCategory: v })} />
        </div>
        <div className="sf-field">
          <OnbLabel optional="primary">Genre</OnbLabel>
          <BrandDropdown
            value={value.genre}
            options={genreOptions}
            onChange={(v) => set({ genre: v, subGenres: value.subGenres.filter((s) => s !== v) })}
            placeholder="Select…"
          />
        </div>
      </div>

      {/* Sub-genre pills + the "add" link. */}
      <div className="sf-subs">
        {value.subGenres.map((sg) => (
          <span key={sg} className="sf-pill">
            {sg}
            <button type="button" aria-label={`Remove ${sg}`} onClick={() => set({ subGenres: value.subGenres.filter((s) => s !== sg) })}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        ))}
        {addingSub ? (
          <span className="sf-subadd">
            <BrandDropdown
              value=""
              options={subGenreOptions}
              placeholder="Pick a sub-genre…"
              onChange={(v) => {
                set({ subGenres: [...value.subGenres, v] });
                setAddingSub(false);
              }}
            />
          </span>
        ) : (
          <button type="button" className="sf-link sf-link--quiet sf-addsub" onClick={() => setAddingSub(true)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            add additional sub-genre
          </button>
        )}
      </div>

      {showWordCount && (
        <div className="sf-field">
          <OnbLabel>Word count</OnbLabel>
          <input
            type="text" className="sf-in"
            inputMode="numeric"
            value={value.wordCount}
            onChange={(e) => set({ wordCount: e.target.value.replace(/[^\d,]/g, "") })}
            placeholder={range ?? "e.g. 85,000"}
          />
        </div>
      )}
    </div>
  );
};
