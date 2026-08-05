/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoPlaceholderPage — Calendar and Noteboard, routed now and built next.
 *
 * ⚠️ THE ROUTES EXIST SO NAVIGATION NEVER DEAD-ENDS. The app sidebar's To-do group lists four
 * pages; two of them are not built. The alternatives were both worse: omitting them makes the
 * group disagree with the pack's IA and hides the plan, and greying them out in the nav puts a
 * dead-looking row in permanent chrome. A real route with an honest page is the third option.
 *
 * ⚠️ IT INVENTS NOTHING. No sample grid, no fake pips, no placeholder counts — a page that shows
 * plausible-looking content is read as data, and this one has none to show yet. It says what it
 * will be and what to use meanwhile.
 *
 * TODO(todo-calendar) · TODO(todo-noteboard): the full builds are the next pack. The Calendar's
 * shape is already settled by audit item 5 — it renders completed pips FROM THE ACTIVITY LOG,
 * struck through, on the day of completion, because Done-at-midnight clears the working surfaces
 * only and the log keeps everything.
 */
import React from "react";
import { CalendarDays, StickyNote } from "lucide-react";

export interface TodoPlaceholderPageProps {
  page: "calendar" | "noteboard";
}

const COPY = {
  calendar: {
    icon: <CalendarDays aria-hidden="true" />,
    title: "Calendar",
    line: "Your dated work on a month grid, with completed items struck through on the day you cleared them.",
    meanwhile: "Until then, dated tasks surface on Today and the full list lives on the To-do list.",
  },
  noteboard: {
    icon: <StickyNote aria-hidden="true" />,
    title: "Noteboard",
    line: "Your undated notes to self, kept together and out of the way of the work that has a date.",
    meanwhile: "Until then, notes sit in their own group on the To-do list.",
  },
} as const;

export const TodoPlaceholderPage: React.FC<TodoPlaceholderPageProps> = ({ page }) => {
  const c = COPY[page];
  return (
    <div className="tdph">
      <div className="tdph-ic" aria-hidden="true">{c.icon}</div>
      <h2 className="tdph-t">{c.title}</h2>
      <p className="tdph-l">{c.line}</p>
      <p className="tdph-m">{c.meanwhile}</p>
    </div>
  );
};
