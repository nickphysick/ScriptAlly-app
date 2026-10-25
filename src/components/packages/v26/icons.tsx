/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the ref's marks, path for path (its `I`, `PIC` and `DOT` tables). Each renders a bare
 * <svg>: the stroke, fill and size come from pk26.generated.css through the parent's class, as in the ref.
 */
import React from "react";
import type { PackageIcon } from "../../../types";

const P = (d: string) => <path d={d} />;

export type MarkKey = "let" | "syn" | "ver" | "ext" | "clip" | "pen" | "box";
const MARKS: Record<MarkKey, React.ReactNode> = {
  let: <><rect x="2.5" y="4.5" width="15" height="11" rx="2" />{P("M3 5.5l7 5.5 7-5.5")}</>,
  syn: <>{P("M5 2.5h7l3 3v12H5z")}{P("M8 9h5M8 12h5")}</>,
  ver: <>{P("M3 4.5c2.5-1 5-1 7 .5v11c-2-1.5-4.5-1.5-7-.5z")}{P("M17 4.5c-2.5-1-5-1-7 .5v11c2-1.5 4.5-1.5 7-.5z")}</>,
  ext: <>{P("M5 2.5h6.5l3.5 3.5v11.5H5z")}{P("M11.5 2.5V6H15M10 9.5v5M7.5 12h5")}</>,
  clip: <>{P("M14.5 9.5l-5.3 5.3a3 3 0 0 1-4.3-4.3l6-6a2 2 0 0 1 2.9 2.9l-5.8 5.8a1 1 0 0 1-1.4-1.4l5.2-5.2")}</>,
  pen: <>{P("M13.5 3.5l3 3L7 16H4v-3z")}</>,
  box: <>{P("M3 7l7-3.5L17 7v8l-7 3.5L3 15z")}{P("M3 7l7 3.5L17 7M10 10.5V18.5")}</>,
};
export const Mark: React.FC<{ k: MarkKey }> = ({ k }) => <svg viewBox="0 0 20 20" aria-hidden="true">{MARKS[k]}</svg>;

const PICS: Record<PackageIcon, React.ReactNode> = {
  box: <>{P("M3 7l7-3.5L17 7v8l-7 3.5L3 15z")}{P("M3 7l7 3.5L17 7M10 10.5V18.5")}</>,
  crown: <>{P("M3 15.5h14M3.5 6.5l3.5 4 3-6 3 6 3.5-4-1.5 9h-10z")}</>,
  globe: <><circle cx="10" cy="10" r="7.5" />{P("M2.5 10h15M10 2.5c2.2 2.2 2.2 12.8 0 15M10 2.5c-2.2 2.2-2.2 12.8 0 15")}</>,
  flag: <>{P("M4.5 17.5V3M4.5 3.5h10l-2 3.5 2 3.5h-10")}</>,
  feather: <>{P("M16 4c-6 0-10.5 4.5-10.5 10.5V16M5.5 14.5C11 14.5 16 10 16 4")}{P("M8 12h4.5")}</>,
  flask: <>{P("M8 2.5h4M8.5 2.5v5L4 15.5a1.5 1.5 0 0 0 1.3 2h9.4a1.5 1.5 0 0 0 1.3-2L11.5 7.5v-5")}{P("M6 13h8")}</>,
  star: <>{P("M10 2.8l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8.1l5-.7z")}</>,
  bolt: <>{P("M11 2.5L4.5 11h5l-1 6.5L15.5 9h-5z")}</>,
  heart: <>{P("M10 16.5S3 12.3 3 7.6A3.6 3.6 0 0 1 10 6a3.6 3.6 0 0 1 7 1.6c0 4.7-7 8.9-7 8.9z")}</>,
  compass: <><circle cx="10" cy="10" r="7.5" />{P("M12.8 7.2l-1.6 4-4 1.6 1.6-4z")}</>,
  pen: <>{P("M13.5 3.5l3 3L7 16H4v-3z")}{P("M11.5 5.5l3 3")}</>,
  key: <><circle cx="6.5" cy="13.5" r="3.5" />{P("M9 11l7.5-7.5M14 6l2 2M12.5 7.5l1.5 1.5")}</>,
};
/** A package's icon — the ref's `pic()`: an svg carrying `p6-pic`. */
export const Pic: React.FC<{ ic: PackageIcon }> = ({ ic }) => <svg viewBox="0 0 20 20" className="p6-pic" aria-hidden="true">{PICS[ic]}</svg>;
/** The bare paths, for the icon chooser's buttons (the ref draws those svgs without `p6-pic`). */
export const PicBare: React.FC<{ ic: PackageIcon }> = ({ ic }) => <svg viewBox="0 0 20 20" aria-hidden="true">{PICS[ic]}</svg>;

/** The two inline arrows the ref draws in its pills and buttons. */
export const Chevron: React.FC = () => <svg viewBox="0 0 20 20" aria-hidden="true">{P("M8 5l5 5-5 5")}</svg>;
export const PlayRing: React.FC = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M8.3 7l5 3-5 3z" fill="currentColor" stroke="none" /></svg>
);
