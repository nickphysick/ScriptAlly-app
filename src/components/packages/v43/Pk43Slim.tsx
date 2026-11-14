/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 Phase 4 (ref screen 02) — THE COLLAPSED HEADER: the Query Centre's bar, mounted as To-do v56
 * mounts it. Once the navy header has scrolled under the sheet's lip, the 60px bar takes its place: the headline
 * ("4 packages") on the left; on the right the package new queries go out with, its name in the typewriter and "goes
 * out with new queries" in italic (absent with none), then the navy "+ New package".
 *
 * ⚠️ IT IS THE QUERY CENTRE'S BAR: the frame is `shell/SlimBar` (the same reader, the ground across the sheet's full
 *    width, inert and aria-hidden while hidden); the look is qcv156.css §3, whose `:is(…)` lists name `.pk43` beside
 *    the other pages' roots at the same specificity.
 * ⚠️ IT OFFSETS NOTHING (as To-do's): the list's sticky top is a constant that already clears the bar (pk43.css §4),
 *    so nothing jumps when it appears.
 */
import React from "react";
import { SlimBar } from "../../shell/SlimBar";
import { SLIM_GOES_OUT } from "../../../lib/packagesV43";

const header = (row: HTMLElement) => row.parentElement?.querySelector<HTMLElement>(":scope > .pk43-hdw > header");
const cover = (): null => null;

export const Pk43Slim: React.FC<{ title: string; going: string | null; onNew: () => void }> = ({ title, going, onNew }) => (
  <SlimBar hook="data-pk43" header={header} cover={cover}
    title={title}
    right={going ? (
      <span className="qc156-sw" data-pk43="slim-going"><b>{going}</b><em>{SLIM_GOES_OUT}</em></span>
    ) : null}
    button={{ label: "+ New package", onClick: onNew, probe: "slim-new" }} />
);
