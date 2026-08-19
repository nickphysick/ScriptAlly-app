/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskPaneBody — the mockup's `body` block, ported.
 *
 * ⚠️ THIS IS `DATA.now.body(0)` FROM `design-refs/todo-materials-contract.html`, element for
 * element: a `What goes` label over a row of `.chip`s, a `When` label over a `.seg` of three
 * buttons, an `Anything else?` label over `textarea.note-in`, and the free plan's `.upsell`. No
 * control here is from the retired pane, and none was invented — the segmented control has the
 * mockup's three options in the mockup's order, and `Another date…` is its own word.
 *
 * ⚠️ THE FIELDS REPORT UPWARD; THEY DO NOT WRITE. The pane's primary is the one completion path, so
 * the body's whole job is to hold what the writer typed and hand it over when asked. That is the
 * carried behaviour — a body that wrote on its own would be a second way to finish a task.
 */
import React from "react";

export interface SendBodyValues {
  /** the material labels left ticked, in the order the card states them */
  materials: string[];
  /** which of the mockup's three `When` options is chosen */
  when: "Today" | "Yesterday" | "Another date…";
  /** the free text under "Anything else?" */
  also: string;
}

export interface TaskPaneBodyProps {
  /** what the card says is going — one `.chip` each */
  materials: { label: string; detail?: string }[];
  value: SendBodyValues;
  onChange: (v: SendBodyValues) => void;
  /** the mockup's free-plan `.upsell`; omitted for Pro, exactly as its `body(plan)` does */
  upsell?: React.ReactNode;
}

/** the mockup's three, in its order */
const WHEN: SendBodyValues["when"][] = ["Today", "Yesterday", "Another date…"];

export const TaskPaneBody: React.FC<TaskPaneBodyProps> = ({ materials, value, onChange, upsell }) => (
  <>
    <label className="f-lbl">What goes</label>
    {/* ⚠️ THE MOCKUP PUTS THIS ROW'S LAYOUT IN A `style` ATTRIBUTE, and so does the port — it is
        four declarations with no class name behind them, and inventing one would be a decision. */}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {materials.map((m) => (
        <span className="chip" key={m.label}>
          <span className="tick">✓</span> {m.label}{m.detail ? ` · ${m.detail}` : ""}
        </span>
      ))}
    </div>

    <label className="f-lbl">When</label>
    <div className="seg" style={{ marginBottom: 16 }}>
      {WHEN.map((w) => (
        <button type="button" key={w} className={value.when === w ? "on" : undefined}
          onClick={() => onChange({ ...value, when: w })}>{w}</button>
      ))}
    </div>

    <label className="f-lbl">Anything else?</label>
    <textarea className="note-in" placeholder="e.g. included the revised opening"
      value={value.also} onChange={(e) => onChange({ ...value, also: e.target.value })} />

    {upsell && <div className="upsell">{upsell}</div>}
  </>
);
