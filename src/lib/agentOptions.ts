/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared option lists for the agent forms (Add-Agent + the v12 Edit Agent drawer), so the allowed
 * genres, social platforms, submission methods, and countries have ONE source of truth.
 */

/** Allowed genres (the GenreCombobox restricts typed input to this list). */
export const AGENT_GENRES = [
  "Action & adventure", "Children’s", "Commercial fiction", "Contemporary", "Cosy crime",
  "Crime", "Dystopian", "Fantasy", "Historical fiction", "Horror", "Literary fiction",
  "Magical realism", "Memoir", "Middle grade", "Mystery", "Non-fiction", "Picture book",
  "Romance", "Romantasy", "Sci-fi", "Speculative fiction", "Thriller", "Upmarket",
  "Women’s fiction", "Young adult",
];

/** Social platforms. The first three are ALSO mirrored into the discrete twitter/bluesky/instagram
 *  agent fields (see [[agent-socials-display-backlog]]); keep these labels stable. */
export const SOCIAL_PLATFORMS = ["X / Twitter", "Bluesky", "Instagram", "QueryTracker", "TikTok", "Other"];

/** Submission methods. */
export const METHOD_OPTIONS = ["Email", "QueryManager", "Agency form", "Post", "Other"];

/** Countries, likely-first (UK → the main English-language markets), then a common-second tier,
 *  then "Other". A flat ordered list — the dropdown shows them in this order. */
export const COUNTRIES = [
  "United Kingdom", "Ireland", "United States", "Canada", "Australia", "New Zealand",
  "France", "Germany", "India", "Italy", "Netherlands", "Spain", "Sweden",
  "Other",
];
