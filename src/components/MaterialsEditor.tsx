/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MaterialsEditor — the ONE materials editor, shared by Log a Query and the query edit form.
 *
 * Each selected material can carry a type (pages/words/chapters/other) and a quantity, so the
 * record captures what was actually sent ("50 pages") rather than a bare label. Items with no
 * type/quantity are stored as plain label strings, so a query that only ticks "Query Letter"
 * stays backward-compatible.
 *
 * Sharing one editor across both forms is deliberate: it's how editing a query's materials can
 * never silently downgrade the quantities (the edit form is no longer a label-only UI).
 */
import React, { useState } from "react";
import { BrandDropdown } from "./forms";
import { materialLabel, type MaterialType } from "../lib/materials";
import type { QueryMaterial } from "../types";

const TYPE_OPTIONS = [
  { value: "", label: "Whole document" },
  { value: "pages", label: "Pages" },
  { value: "words", label: "Words" },
  { value: "chapters", label: "Chapters" },
  { value: "other", label: "Other" },
];

interface MaterialsEditorProps {
  value: (string | QueryMaterial)[];
  onChange: (next: (string | QueryMaterial)[]) => void;
  /** Base palette of materials offered as chips. */
  palette?: string[];
  /** Allow adding an arbitrary custom material name. */
  allowCustom?: boolean;
  /**
   * Materials that take a type + quantity ("50 pages"). Only these get the quantity row —
   * a synopsis or query letter is a whole document, so a quantity is meaningless for them.
   * (Attaching the actual letter/synopsis file is a separate, future capability.)
   */
  quantifiable?: string[];
}

export const MaterialsEditor: React.FC<MaterialsEditorProps> = ({
  value,
  onChange,
  palette = ["Query Letter", "Synopsis", "Sample Pages"],
  allowCustom = false,
  quantifiable = ["Sample Pages"],
}) => {
  const isQuantifiable = (label: string) =>
    quantifiable.some((q) => q.toLowerCase() === label.toLowerCase());
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState("");

  const indexOf = (label: string) =>
    value.findIndex((it) => materialLabel(it).toLowerCase() === label.toLowerCase());
  const isSelected = (label: string) => indexOf(label) >= 0;

  const toggle = (label: string) => {
    const i = indexOf(label);
    if (i >= 0) {
      const next = value.slice();
      next.splice(i, 1);
      onChange(next);
    } else {
      onChange([...value, label]); // added unquantified — just the label
    }
  };

  // Structured view of a selected material, for the type + quantity controls.
  const detailOf = (label: string): { type: MaterialType | ""; quantity: string } => {
    const i = indexOf(label);
    const it = i >= 0 ? value[i] : undefined;
    if (it && typeof it !== "string") {
      return { type: (it.type as MaterialType) || "", quantity: it.quantity != null ? String(it.quantity) : "" };
    }
    return { type: "", quantity: "" };
  };

  const setDetail = (label: string, type: MaterialType | "", quantity: string) => {
    const i = indexOf(label);
    if (i < 0) return;
    const next = value.slice();
    if (!type && !quantity) {
      next[i] = label; // back to a plain label
    } else {
      let q: number | string | undefined;
      if (quantity === "") q = undefined;
      else if (type === "other") q = quantity;
      else {
        const digits = quantity.replace(/[^0-9.]/g, "");
        q = digits === "" || isNaN(Number(digits)) ? quantity : Number(digits);
      }
      next[i] = { material: label, type: type || undefined, quantity: q };
    }
    onChange(next);
  };

  // Palette plus any custom/extra labels already present in the value.
  const extras = value
    .map(materialLabel)
    .filter((l) => !palette.some((p) => p.toLowerCase() === l.toLowerCase()));
  const allChips = [...palette, ...extras];
  // Only quantifiable materials (Sample Pages) get a type+quantity row; the others are
  // whole documents and have no meaningful quantity.
  const quantifiableSelected = allChips.filter((l) => isSelected(l) && isQuantifiable(l));

  return (
    <div>
      <div className="sa-chips">
        {allChips.map((label) => (
          <div
            key={label}
            role="button"
            aria-pressed={isSelected(label)}
            className={`sa-chip${isSelected(label) ? " sel" : ""}`}
            onClick={() => toggle(label)}
          >
            {label}
          </div>
        ))}
        {allowCustom &&
          (showCustom ? (
            <input
              autoFocus
              className="sa-input sa-mat-custom"
              value={customText}
              placeholder="Material name…"
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const t = customText.trim();
                  if (t && !isSelected(t)) onChange([...value, t]);
                  setCustomText("");
                  setShowCustom(false);
                } else if (e.key === "Escape") {
                  setCustomText("");
                  setShowCustom(false);
                }
              }}
              onBlur={() => {
                setCustomText("");
                setShowCustom(false);
              }}
            />
          ) : (
            <div role="button" className="sa-chip sa-chip-add" onClick={() => setShowCustom(true)}>
              + Add
            </div>
          ))}
      </div>

      {quantifiableSelected.length > 0 && (
        <div className="sa-mat-rows">
          {quantifiableSelected.map((label) => {
            const { type, quantity } = detailOf(label);
            return (
              <div key={label} className="sa-mat-row">
                <span className="sa-mat-row-label">{label}</span>
                <BrandDropdown
                  value={type}
                  options={TYPE_OPTIONS}
                  onChange={(v) => setDetail(label, v as MaterialType | "", v === "" ? "" : quantity)}
                />
                {type !== "" && (
                  <input
                    className="sa-input sa-mat-qty"
                    value={quantity}
                    placeholder={type === "other" ? "describe…" : "Qty"}
                    inputMode={type === "other" ? "text" : "numeric"}
                    onChange={(e) => setDetail(label, type, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
