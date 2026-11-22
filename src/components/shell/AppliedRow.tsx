/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * List filters v1 Phase 5 (design-refs/list-filters-v1, "bar, applied row, list") — THE APPLIED ROW, one look on the
 * Queries list and the Agents list, each in its own position. Drawn only while a filter or a search is set (the caller
 * decides): paper ground and a 1px rule beneath, "Filtered by", one chip per choice the writer made, "Clear all".
 *
 *   a chip         navy, cream text, a × at 75%; pressing it removes that one choice
 *   a stage chip   a whole stage (lib/qc140 `appliedChips`' `stage`): on the stage's band with its edge line, ink text
 *                  and the stage's StatusDot mark — the one place a stage colour appears in the row
 *
 * ⚠️ PRESENTATION ONLY: the chips and their removals are the page's (lib/qc140 `appliedChips`, lib/contactV27
 *    `appliedChoices`). Its probes are the caller's hook attribute: `applied`, `applied-chip`, `applied-clear`.
 * ⚠️ "Clear all" is the only word for clearing filters on these two pages (List filters v1 baked decision 11).
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { STAGE_COLOURS, stageInk, type Stage } from "../../lib/stageColours";
import "./appliedRow.css";

export interface AppliedChip {
  key: string;
  label: string;
  /** a whole stage's chip: drawn on that stage's band */
  stage?: Stage;
  /** the stage chip's mark (a StatusDot status) */
  mark?: string;
  onRemove: () => void;
}

export const AppliedRow: React.FC<{ hook: `data-${string}`; chips: readonly AppliedChip[]; onClearAll: () => void; className?: string }> = ({ hook, chips, onClearAll, className }) => {
  const h = (v: string) => ({ [hook]: v });
  return (
    <div className={`lf-ap${className ? ` ${className}` : ""}`} role="status" {...h("applied")}>
      <span className="lf-apl">Filtered by</span>
      {chips.map((c) => (
        <button key={c.key} type="button" className={`lf-apc${c.stage ? " lf-apc--stage" : ""}`} {...h("applied-chip")} data-k={c.key} data-stage={c.stage}
          aria-label={`Remove ${c.label}`} onClick={c.onRemove}
          style={c.stage ? ({ background: STAGE_COLOURS[c.stage].band, color: stageInk(c.stage), "--sf-edge": STAGE_COLOURS[c.stage].edge } as React.CSSProperties) : undefined}>
          {c.stage && c.mark ? <StatusDot status={c.mark} overrideSize={14} decorative /> : null}
          <span>{c.label}</span><i aria-hidden="true">×</i>
        </button>
      ))}
      <button type="button" className="lf-apx" {...h("applied-clear")} onClick={onClearAll}>Clear all</button>
    </div>
  );
};
