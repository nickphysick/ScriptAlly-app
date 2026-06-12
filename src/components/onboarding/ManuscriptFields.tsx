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
import { BrandInput, BrandDropdown } from "../forms";
import { PREDEFINED_GENRES, AGE_CATEGORIES, genreWordCountRange } from "../../lib/manuscripts";
import { FONT_MONO } from "./chrome";

export const OnbLabel: React.FC<{ children: React.ReactNode; optional?: string }> = ({ children, optional }) => (
  <label
    style={{
      fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em",
      color: "#9c8878", marginBottom: 6, display: "block",
    }}
  >
    {children}
    {optional && (
      <span style={{ textTransform: "none", letterSpacing: 0, color: "#c0b0a0" }}> ({optional})</span>
    )}
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
    <div>
      <OnbLabel optional={titleOptional ? "optional" : undefined}>{titleLabel}</OnbLabel>
      <BrandInput
        value={value.title}
        onChange={(e) => set({ title: e.target.value })}
        placeholder="e.g. The Salt Path Home"
      />

      {showStrapline && (
        <>
          <OnbLabel optional="optional">Strapline</OnbLabel>
          <BrandInput
            style={{ fontStyle: value.strapline ? "normal" : "italic" }}
            value={value.strapline}
            onChange={(e) => set({ strapline: e.target.value })}
            placeholder="One line that sells the story…"
          />
        </>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <OnbLabel>Age category</OnbLabel>
          <BrandDropdown value={value.ageCategory} options={ageOptions} onChange={(v) => set({ ageCategory: v })} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <OnbLabel optional="primary">Genre</OnbLabel>
          <BrandDropdown
            value={value.genre}
            options={genreOptions}
            onChange={(v) => set({ genre: v, subGenres: value.subGenres.filter((s) => s !== v) })}
            placeholder="Select…"
          />
        </div>
      </div>

      {/* sub-genre pill row + add link */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7, margin: "-5px 2px 14px" }}>
        {value.subGenres.map((sg) => (
          <span
            key={sg}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, background: "#f5e2da",
              border: "0.5px solid #e8c8bc", borderRadius: 7, padding: "4px 8px 4px 10px",
              fontSize: 12, color: "#7c3a2a",
            }}
          >
            {sg}
            <button
              aria-label={`Remove ${sg}`}
              onClick={() => set({ subGenres: value.subGenres.filter((s) => s !== sg) })}
              style={{ cursor: "pointer", display: "flex", opacity: 0.7, background: "none", border: "none", color: "inherit", padding: 0 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        ))}
        {addingSub ? (
          <span style={{ minWidth: 180 }}>
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
          <button
            onClick={() => setAddingSub(true)}
            style={{
              fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.04em", color: "#9c8878",
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
              background: "none", border: "none", padding: "4px 2px", transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#7c3a2a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9c8878")}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            add additional sub-genre
          </button>
        )}
      </div>

      {showWordCount && (
        <>
          <OnbLabel>Word count</OnbLabel>
          <BrandInput
            inputMode="numeric"
            value={value.wordCount}
            onChange={(e) => set({ wordCount: e.target.value.replace(/[^\d,]/g, "") })}
            placeholder={range ?? "e.g. 85,000"}
            style={{ marginBottom: 0 }}
          />
        </>
      )}
    </div>
  );
};
