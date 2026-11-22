/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Corkboard's two task dialogs (Corkboard v2, Part E; ref design-refs/corkboard-v13/, screens 06 and 07).
 *
 * CbAddTask — "Add a task" opens the To-do list's OWN composer, centred over the Corkboard: v51's "A new task" form
 *   (`AddTask`, exported from ws/TodoWorkspace — never a copy). The page's save writes exactly what the To-do list's
 *   add writes, `{ text, dueDate, detail? }` (lock CB9). It is dressed by the To-do list's own sheet (todoWs.css,
 *   already in the bundle) through a `tws-layer` wrapper, which declares that sheet's palette.
 *   (Re-pointed on the dev line: v51 retired the desk's compose card, which this hosted on the Corkboard v2 branch.)
 *
 * CbTurnTask — Turn into a task: the note, then the To-do composer's due choices (This week, Next week, Later, Pick a
 *   date with BrandDatePicker). The page writes the date as before (`makeTask`); the note stays on the board.
 *
 * Both portal to `document.body` and carry `.cb2-layer`.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AddTask } from "../ws/TodoWorkspace";
import { DUE_CHIPS, dayLabel, sundayOf } from "../../../lib/corkboard";
import { BrandDatePicker } from "../../forms/BrandDatePicker";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";

/** today, local, YYYY-MM-DD */
export const todayLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (ymd: string, n: number) => { const [y, m, dd] = ymd.split("-").map(Number); const d = new Date(y, m - 1, dd + n, 12); return todayLocal(d); };

export interface CbAddTaskProps {
  /** today, local */
  today: Date;
  onAdd: (text: string, due: string, detail: string) => Promise<void>;
  onClose: () => void;
}

export const CbAddTask: React.FC<CbAddTaskProps> = ({ today, onAdd, onClose }) => {
  const opener = useRef<Element | null>(typeof document !== "undefined" ? document.activeElement : null);
  useEffect(() => { const back = opener.current; return () => { if (back instanceof HTMLElement) back.focus(); }; }, []);
  return createPortal(
    <div className="cb2-layer cb2-scrim" data-cb2="task-dialog" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cb2-taskhost tws-layer" role="dialog" aria-modal="true" aria-label="New task">
        {/* the form's own Escape layer closes it (AddTask → onCancel) */}
        <AddTask today={today} onCancel={onClose} onAdd={onAdd} />
      </div>
    </div>,
    document.body,
  );
};

export interface CbTurnTaskProps {
  todayYmd: string;
  hex: string;
  text: string;
  onSave: (dueYmd: string) => void;
  onClose: () => void;
}

export const CbTurnTask: React.FC<CbTurnTaskProps> = ({ todayYmd, hex, text, onSave, onClose }) => {
  const [when, setWhen] = useState<"this" | "next" | "later" | "pick" | null>(null);
  const [date, setDate] = useState("");
  const opener = useRef<Element | null>(typeof document !== "undefined" ? document.activeElement : null);
  const first = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { first.current?.focus(); const back = opener.current; return () => { if (back instanceof HTMLElement) back.focus(); }; }, []);
  useEscapeLayer(true, onClose, ESC_LEVEL.pageDrawer);
  const sunday = sundayOf(todayYmd);
  const due = when === "pick" ? (date || null) : when ? plusDays(sunday, DUE_CHIPS.find((c) => c.k === when)!.add) : null;
  return createPortal(
    <div className="cb2-layer cb2-scrim" data-cb2="turn-dialog" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cb2-tdlg" role="dialog" aria-modal="true" aria-labelledby="cb2-tt-h"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && due) { e.preventDefault(); onSave(due); } }}>
        <h2 id="cb2-tt-h" className="cb2-dh">Turn into a task</h2>
        <p className="cb2-lede">It goes on your to-do list for the date you pick. The note stays here, unchanged.</p>
        <div className="cb2-lnk cb2-lnk--note" style={{ background: hex }}><span className="cb2-ttext">{text}</span></div>
        <div className="cb2-q">
          <div className="cb2-qh"><b>When is it due?</b><span>{due ? `Due by ${dayLabel(due)}` : ""}</span></div>
          <div className="cb2-chps">
            {DUE_CHIPS.map((c, i) => (
              <button key={c.k} ref={i === 0 ? first : undefined} type="button" className="cb2-chp" data-when={c.k} aria-pressed={when === c.k}
                onClick={() => setWhen(c.k)}>
                {c.label}<small>by {dayLabel(plusDays(sunday, c.add))}</small>
              </button>
            ))}
            <button type="button" className="cb2-chp" data-when="pick" aria-pressed={when === "pick"} onClick={() => setWhen("pick")}>Pick a date</button>
          </div>
          {when === "pick" ? (
            <div className="cb2-pickdate"><BrandDatePicker value={date} onChange={setDate} placeholder="Choose a date" /></div>
          ) : null}
        </div>
        <div className="cb2-dacts">
          <button type="button" className="cb2-btn" data-cb2="cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="cb2-btn cb2-btn--navy" data-cb2="add-to-todo" disabled={!due} onClick={() => due && onSave(due)}>Add to my to-do list</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
