/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Compose calendar — a compact, ANCHORED month grid for the in-place note composer. Deliberately
 * NOT BrandDatePicker's fixed popover: the dashboard's framer-motion `layout` ancestor turns
 * position:fixed into a contained box, so a fixed popover would escape onto other cards (the very
 * bug compose-in-place fixes). This renders in-flow inside the desk, with the "makes this a task"
 * advice on top. Dates stay ISO "YYYY-MM-DD" strings. Monday-first, matching BrandDatePicker.
 */
import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parchment, burgundy, deepBurgundy, FONT_SERIF, FONT_MONO, mutedInk, sageAccent } from "../../lib/designTokens";
import { todayLocalISO } from "./notesUtils";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string | null): Date => {
  const m = s && s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
};

export interface NoteComposeCalendarProps {
  value: string | null; // "YYYY-MM-DD"
  onPick: (iso: string) => void;
}

export const NoteComposeCalendar: React.FC<NoteComposeCalendarProps> = ({ value, onPick }) => {
  const today = todayLocalISO();
  const [view, setView] = useState<Date>(() => {
    const b = value ? fromISO(value) : new Date();
    return new Date(b.getFullYear(), b.getMonth(), 1);
  });

  const startDow = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
  const nav = (delta: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  const navBtn: React.CSSProperties = { width: 22, height: 22, borderRadius: 6, border: `0.5px solid rgba(124,58,42,0.25)`, background: "#fff", color: burgundy, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

  return (
    <div style={{ background: parchment, border: "1px solid rgba(124,58,42,0.22)", borderRadius: 12, padding: "11px 12px 10px", boxShadow: "0 10px 26px rgba(58,28,20,0.16)", width: 248 }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: burgundy, fontWeight: 500 }}>
        Adding a date makes this a task.
      </div>
      <div style={{ fontSize: 11, color: mutedInk, marginTop: 2, marginBottom: 10 }}>It'll show on your to-do list.</div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 500, color: deepBurgundy }}>
          {MONTHS[view.getMonth()]} {view.getFullYear()}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div role="button" aria-label="Previous month" style={navBtn} onClick={() => nav(-1)}><ChevronLeft size={13} /></div>
          <div role="button" aria-label="Next month" style={navBtn} onClick={() => nav(1)}><ChevronRight size={13} /></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
        {DOW.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontFamily: FONT_MONO, fontSize: 8, color: mutedInk, paddingBottom: 3 }}>{d}</div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const iso = toISO(c);
          const isToday = iso === today;
          const isSel = iso === value;
          return (
            <div
              key={i}
              role="button"
              onClick={() => onPick(iso)}
              style={{
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11.5,
                borderRadius: 6,
                cursor: "pointer",
                color: isSel ? "#fdfaf5" : "#5a4a40",
                background: isSel ? burgundy : "transparent",
                boxShadow: isToday && !isSel ? `inset 0 0 0 1px ${sageAccent}` : undefined,
                fontWeight: isSel ? 600 : 400,
              }}
            >
              {c.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
};
