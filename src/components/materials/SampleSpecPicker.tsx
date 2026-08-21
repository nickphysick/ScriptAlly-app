/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SampleSpecPicker — the opening sample's units and amounts, as ONE control.
 *
 * ⚠️ THE MODEL IS NOT NEW AND IS NOT RESTATED HERE. `agentMaterials` already owns the sample's
 * vocabulary (`SAMPLE_UNITS`), its physics (`UNIT_CFG` / `stepAmount` / `snapToUnit`) and its
 * encoding (`materialsWantedFromRows`). This component is the missing SURFACE, not a second model —
 * every number it shows and every step it takes comes from those functions, so a picker and the
 * thing it writes cannot disagree about what "3 chapters" is.
 *
 * ⚠️ UNITS ARE INDEPENDENT, BECAUSE AGENCIES REALLY DO ASK THAT WAY. "Three chapters or fifty
 * pages" is one requirement with two measures, and `materialRowsFromAgent` has emitted one row per
 * selected unit since decision 12. A single-select control would have to drop one of them on read.
 *
 * ⚠️ AND THE READING IS THE CALLER'S TO DECLARE — `join`. Requirements offer a choice ("or"); a
 * record of what went describes one parcel twice ("·"). See `formatSampleSpecs`.
 *
 * ⚠️ SWITCHING A UNIT ON SEEDS THAT UNIT'S OWN DEFAULT; SWITCHING IT OFF CLEARS THE AMOUNT.
 * Never a conversion — 3 chapters is not 3 pages, and carrying the number across would state a
 * quantity nobody chose.
 */
import React from "react";
import "./sampleSpecPicker.css";
import {
  SAMPLE_UNITS,
  UNIT_CFG,
  snapToUnit,
  stepAmount,
  formatSampleSpecs,
  type SampleUnit,
  type SampleJoin,
  type MaterialRow,
} from "../../lib/agentMaterials";

type QtyRow = Extract<MaterialRow, { kind: "qty" }>;
const isQty = (r: MaterialRow): r is QtyRow => r.kind === "qty";

export interface SampleSpecPickerProps {
  /** The full row set — the picker owns only the `sample` rows within it. */
  rows: MaterialRow[];
  onChange: (rows: MaterialRow[]) => void;
  /** How two units read together. Requirements choose "or"; records choose "and". */
  join: SampleJoin;
  /**
   * ⚠️ WHAT THE PICKER IS FOR, AND IT CHANGES THE ARITHMETIC OF SELECTION (pane round, Phase 3).
   *
   * `"wanted"` (the default, and every existing caller) records what an AGENCY ASKED FOR, which is
   * genuinely multi-unit: "three chapters or fifty pages" is one requirement with two measures, and
   * `materialRowsFromAgent` has emitted a row per unit since decision 12.
   *
   * `"sent"` records what YOU PUT IN THE ENVELOPE, and that is one parcel measured one way. The
   * contract says it in as many words — "Pick the unit you actually sent in — one only" — and it
   * is not a styling preference: two units ticked here would encode a claim that the same pages
   * were sent twice, in two measures, which is not a thing that can have happened.
   *
   * So in `"sent"` a unit REPLACES the selection rather than adding to it. Unticking the chosen
   * unit still clears to the unticked row, exactly as before; the difference is only that there
   * can never be a second one.
   */
  mode?: "wanted" | "sent";
  /** Distinguishes this instance's inputs when several sit on one page (the bulk table). */
  idPrefix?: string;
  /** The bulk table renders many of these — it states its own summary instead. */
  hideSummary?: boolean;
  disabled?: boolean;
}

/** Which units are currently selected, read from the rows rather than held in a second state. */
export function selectedUnits(rows: readonly MaterialRow[]): SampleUnit[] {
  return rows.filter(isQty).filter((r) => r.on).map((r) => r.unit);
}

export const SampleSpecPicker: React.FC<SampleSpecPickerProps> = ({
  rows, onChange, join, mode = "wanted", idPrefix = "ssp", hideSummary, disabled,
}) => {
  const chosen = selectedUnits(rows);
  const qtyRows = rows.filter(isQty).filter((r) => r.on);

  /* One unit on/off. The rows carry the truth, so this rewrites them rather than tracking a set. */
  const toggleUnit = (unit: SampleUnit) => {
    if (disabled) return;
    const on = chosen.includes(unit);
    if (on) {
      const left = rows.filter((r) => !(isQty(r) && r.on && r.unit === unit));
      /* The last unit off leaves ONE unticked sample row — the shape `materialRowsFromAgent`
         produces for an agent asking for no sample, so the row set stays round-trippable. */
      onChange(left.some(isQty) ? left : [...left, { key: "sample", kind: "qty", name: "Opening sample", on: false, unit: "Chapters", amount: "" }]);
      return;
    }
    const seeded: QtyRow = { key: "sample", kind: "qty", name: "Opening sample", on: true, unit, amount: snapToUnit(unit) };
    /* ⚠️ ONE PARCEL, ONE MEASURE. In `"sent"` the new unit REPLACES every sample row rather than
       joining them — see `mode`. The seed is the unit's own default, never a conversion of the
       amount that was there: 3 chapters is not 3 pages, and carrying the number across would state
       a quantity nobody chose. */
    if (mode === "sent") {
      onChange([...rows.filter((r) => !isQty(r)), seeded]);
      return;
    }
    const blank = rows.find((r) => isQty(r) && !r.on);
    onChange(blank ? rows.map((r) => (r === blank ? seeded : r)) : [...rows, seeded]);
  };

  const patch = (row: QtyRow, amount: string) =>
    onChange(rows.map((r) => (r === row ? { ...r, amount } : r)));

  /**
   * ⚠️ THE EXPANDING PILL, AND THE ONE THING IT MUST NOT DO IS RE-RENDER ITS INPUT WHILE FOCUSED
   * (steer round, Phase 3).
   *
   * This is the wipe-on-snapshot fault from the finishing round, one level down. There, an effect
   * reset the whole form on every Firestore snapshot; here, the same snapshot re-renders the picker
   * and a controlled input would take its value back from props MID-KEYSTROKE — the caret jumps to
   * the end, or the digits you just typed vanish. It cannot be seen in a unit test, because a unit
   * test never has a snapshot arrive while a field has focus.
   *
   * So the field holds a DRAFT while it owns the caret, and reads from props only when it does not.
   * The draft is the writer's; the props are the record's; the only moment they must agree is when
   * the writer stops typing.
   */
  const [draft, setDraft] = React.useState<string | null>(null);
  const commit = (row: QtyRow, raw: string) => {
    const cfg = UNIT_CFG[row.unit];
    const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    /* ⚠️ CLAMPED TO THE UNIT'S OWN MIN, never to a house number. 500 words is a floor for words and
       nonsense for chapters, which is why the floor lives in `UNIT_CFG` beside the step. */
    patch(row, String(Number.isFinite(n) ? Math.max(cfg.min, n) : cfg.min));
    setDraft(null);
  };

  return (
    <div className="ssp" data-join={join}>
      <div className="ssp-units units" role={mode === "sent" ? "radiogroup" : "group"} aria-label="Sample unit">
        {SAMPLE_UNITS.map((u) => {
          const on = chosen.includes(u);
          const row = rows.find((r): r is QtyRow => isQty(r) && r.on && r.unit === u);
          const cfg = UNIT_CFG[u];
          return (
          <button
            key={u}
            type="button"
            /* ⚠️ THE ROLE FOLLOWS THE ARITHMETIC. A single-select group announced as toggle buttons
               tells a screen reader it may pick several; `radio`/`radiogroup` says one of three,
               which is what `"sent"` enforces. */
            {...(mode === "sent"
              ? { role: "radio" as const, "aria-checked": on }
              : { "aria-pressed": on })}
            className={mode === "sent" ? (on ? "upill on" : "upill") : (on ? "on" : "")}
            disabled={disabled}
            onClick={() => {
              /* ⚠️ THE CHOSEN PILL CANNOT TOGGLE OFF in `sent`. Something was sent; un-choosing the
                 unit would leave a parcel with no measure, which is not a state the record has. */
              if (mode === "sent" && on) return;
              toggleUnit(u);
              /* choosing a unit puts the caret where the next answer goes */
              if (mode === "sent") setTimeout(() => {
                document.getElementById(`${idPrefix}-${u.toLowerCase()}`)?.focus();
              }, 0);
            }}
          >
            {u}
            {/* ⚠️ THE QUANTITY LIVES INSIDE THE PILL, ON THE SAME ROW — the row's height never
                changes, which is what makes this an expansion rather than a second control
                appearing. Rendered only in `sent`; `wanted` keeps its separate amount rows. */}
            {mode === "sent" && on && row && (
              <span
                className="qty"
                /* ⚠️ ONE stopPropagation AT THE ZONE, NOT A GUARD PER BUTTON. Every click in here
                   is inside the pill, so without this a stepper press re-triggers the pill's own
                   select handler — and on the CHOSEN pill that is a no-op today, which is exactly
                   how it would go unnoticed until a fourth unit made it re-seed the amount. */
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button type="button" aria-label={`Fewer ${u.toLowerCase()}`} disabled={disabled}
                  onClick={() => patch(row, stepAmount(row.amount, u, -1))}>−</button>
                <input
                  id={`${idPrefix}-${u.toLowerCase()}`}
                  type="text" inputMode="numeric"
                  aria-label={`Amount in ${u.toLowerCase()}`}
                  disabled={disabled}
                  value={draft ?? row.amount}
                  onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={(e) => commit(row, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { commit(row, (e.target as HTMLInputElement).value); return; }
                    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                    e.preventDefault();
                    setDraft(null);
                    patch(row, stepAmount(row.amount, u, e.key === "ArrowUp" ? 1 : -1));
                  }}
                />
                <span className="u">{u.toLowerCase()}</span>
                <button type="button" aria-label={`More ${u.toLowerCase()}`} disabled={disabled}
                  onClick={() => patch(row, stepAmount(row.amount, u, 1))}>+</button>
              </span>
            )}
          </button>
          );
        })}
      </div>

      {/* ⚠️ `wanted` KEEPS ITS SEPARATE AMOUNT ROWS, UNCHANGED. A requirement can name two units
          at once ("three chapters or fifty pages") and two expanded pills on one line would be a
          row of controls rather than a choice. The expansion is `sent`'s alone. */}
      {mode === "wanted" && qtyRows.map((row) => {
        const cfg = UNIT_CFG[row.unit];
        const id = `${idPrefix}-${row.unit.toLowerCase()}`;
        return (
          <div className="ssp-amt" key={row.unit}>
            <label className="ssp-lbl" htmlFor={id}>{row.unit}</label>
            <span className="ssp-step">
              <button
                type="button" aria-label={`Fewer ${row.unit.toLowerCase()}`} disabled={disabled}
                onClick={() => patch(row, stepAmount(row.amount, row.unit, -1))}
              >−</button>
              {/* ⚠️ `type="text"` + inputMode, not `type="number"` — the unit rides IN the field as a
                  suffix, and a number input's spinners would sit on top of it. The arrow keys are
                  wired by hand so the keyboard still steps by the unit's own step. */}
              <input
                id={id}
                type="text"
                inputMode="numeric"
                value={row.amount}
                disabled={disabled}
                aria-label={`Amount in ${row.unit.toLowerCase()}`}
                aria-describedby={`${id}-unit`}
                onChange={(e) => patch(row, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                  e.preventDefault();
                  patch(row, stepAmount(row.amount, row.unit, e.key === "ArrowUp" ? 1 : -1));
                }}
              />
              <span className="ssp-suffix" id={`${id}-unit`}>{row.unit.toLowerCase()}</span>
              <button
                type="button" aria-label={`More ${row.unit.toLowerCase()}`} disabled={disabled}
                onClick={() => patch(row, stepAmount(row.amount, row.unit, 1))}
              >+</button>
            </span>
            {cfg.min > 1 && <span className="ssp-floor">at least {cfg.min}</span>}
          </div>
        );
      })}

      {/* ⚠️ ABSENCE IS STATED, NEVER LEFT BLANK — but only where the caller wants the line. */}
      {!hideSummary && (
        <p className="ssp-sum">
          {formatSampleSpecs(rows, join) ?? <span className="ssp-none">No sample</span>}
        </p>
      )}
    </div>
  );
};
