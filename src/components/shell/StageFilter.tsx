/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * List filters v1 Phase 2 — STAGE as a filter: one bar and five labels (design-refs/list-filters-v1, "the stage bar and
 * stage labels"). The only place in the Filter panel where a stage colour appears, and it appears only on a stage.
 *
 *   StageBar     18px, round, 2px gaps on #f1ebe2: one segment per stage with a count, as wide as its count, filled with
 *                that stage's band. aria-hidden and out of the tab order: the labels are the accessible control, and
 *                pressing a segment does what its label does. While any stage is on, the segments that are off drop.
 *   StageLabel   a pill on the stage's band, a 1px line in its edge, the stage's StatusDot mark at 15px (ink), the name,
 *                the count. On: a white then navy ring and the name in 600; the band never changes. Zero and off: inert.
 *
 * ⚠️ EVERY COLOUR IS lib/stageColours' (`STAGE_COLOURS[stage].band` — a stage's sent band — and `.edge`), written inline so the rendered
 *    background IS the table's value (LF3). Offer is flat navy (Plumage colours v1).
 * ⚠️ STATUS MARKS ARE INK, drawn by StatusDot, never redrawn and never a stage colour.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { STAGE_COLOURS, stageInk, type Stage } from "../../lib/stageColours";
import { useFilterHook, Num } from "./FilterPanel";
import "./stageFilter.css";

export interface StageItem { stage: Stage; label: string; mark: string; n: number; on: boolean; onToggle: () => void }

const ground = (s: Stage): React.CSSProperties => ({ background: STAGE_COLOURS[s].band, color: stageInk(s), "--sf-edge": STAGE_COLOURS[s].edge } as React.CSSProperties);

export const StageBar: React.FC<{ items: readonly StageItem[] }> = ({ items }) => {
  const { h, loading } = useFilterHook();
  const some = items.some((x) => x.on);
  return (
    <div className={`sf-bar${some ? " is-some" : ""}`} aria-hidden="true" {...h("stage-bar")}>
      {items.filter((x) => x.n > 0).map((x) => (
        <span key={x.stage} className={`sf-seg${x.on ? " is-on" : ""}`} {...h("seg")} data-stage={x.stage} data-n={x.n}
          style={{ ...ground(x.stage), flexGrow: x.n }} onClick={loading ? undefined : x.onToggle} />
      ))}
    </div>
  );
};

export const StageLabel: React.FC<{ item: StageItem }> = ({ item: x }) => {
  const { h, loading } = useFilterHook();
  const zero = !x.on && x.n === 0;
  return (
    <button type="button" role="checkbox" aria-checked={x.on} className={`sf-lab${x.on ? " is-on" : ""}${zero ? " is-zero" : ""}`} {...h("stage")}
      data-stage={x.stage} data-n={x.n} style={ground(x.stage)} disabled={loading || zero} onClick={x.onToggle}>
      <StatusDot status={x.mark} overrideSize={15} decorative /><span className="sf-nm">{x.label}</span><Num n={x.n} className="sf-n" />
    </button>
  );
};

export const StageLabels: React.FC<{ items: readonly StageItem[] }> = ({ items }) => (
  <div className="sf-labs" role="group" aria-label="Stage">{items.map((x) => <StageLabel key={x.stage} item={x} />)}</div>
);
