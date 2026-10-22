/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 Part E — THE AGE CONTROL (the mock's `.ag`): a four-button segment, Adult · Young adult · Middle grade
 * · Other ⌄, each with its age range in mono under the name. Other opens a menu of Young fiction, Picture book and New
 * adult, each with its one-line note; a pick puts it in the fourth button ("Young fiction · 5–8") and selects it. The
 * menu closes on an outside press, Escape, Tab away or a pick (useDismissable).
 */
import React, { useEffect, useId, useRef, useState } from "react";
import { useDismissable } from "../../shell/useDismissable";
import { AGE_LIST, normaliseAgeCategory } from "../../../lib/ageCategories";

export const AgeField: React.FC<{ value: string; onChange: (label: string) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const cur = normaliseAgeCategory(value);
  const other = AGE_LIST.find((a) => !a.main && a.label === cur);
  useDismissable(open, wrapRef, () => setOpen(false));
  const pick = (label: string) => { onChange(label); setOpen(false); };
  /* the menu opens below the segment; near the drawer's foot it would open out of sight, so it brings itself into view */
  useEffect(() => {
    if (open) wrapRef.current?.querySelector(".ag-menu")?.scrollIntoView({ block: "nearest" });
  }, [open]);
  return (
    <div className="ag" ref={wrapRef} data-ag="field">
      <div className="ag-seg" role="radiogroup" aria-label="Age category">
        {AGE_LIST.filter((a) => a.main).map((a) => (
          <button type="button" role="radio" key={a.label} aria-checked={cur === a.label} data-ag={a.label} onClick={() => pick(a.label)}>
            <b>{a.label}</b><small>{a.range}</small>
          </button>
        ))}
        <button type="button" className={`ag-oth${other ? " on" : ""}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? menuId : undefined}
          data-ag-oth="" onClick={() => setOpen((o) => !o)}>
          {other ? <><b>{other.label}</b><small>{other.range}</small></> : <><b>Other</b><small>⌄</small></>}
        </button>
      </div>
      {open ? (
        <ul className="ag-menu" id={menuId} role="listbox" aria-label="Other age categories" data-ag="menu">
          {AGE_LIST.filter((a) => !a.main).map((a) => (
            <li key={a.label} role="option" aria-selected={cur === a.label} tabIndex={0} data-ag-opt={a.label}
              onClick={() => pick(a.label)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(a.label); } }}>
              <span><b>{a.label}</b> <em>{a.range}</em></span><small>{a.note}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
