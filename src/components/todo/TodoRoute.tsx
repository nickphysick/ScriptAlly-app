/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `/todo` chooses its page by width (To-do list v51): the task workspace on a desktop (768px up), and since Phone app
 * v2 Part 5 the phone's own To-do (TodoPhone) below it. One is mounted at a time, so the two never both read the arrival keys (`sa.todoCompose`,
 * `sa.todoOpenTask`) or both bind the keys.
 */
import React, { useEffect, useState } from "react";
/* ⚠️ KEPT AS A SIDE-EFFECT IMPORT, NOT TYPE-ONLY. The phone no longer renders ToDoPage, but its stylesheets (todo.css,
   todoSplit.css, the shell's todoShell.css …) size the desktop Corkboard's grid too. A type-only import erased the
   module and those sheets from the bundle, and the desktop Corkboard's scroller grew to its content (measured: port
   786px → 1918px; PA2-1 S9 on /todo/corkboard). This keeps the bundle, and the sheets' order, exactly as before. */
import "./ToDoPage";
import type { ToDoPageProps } from "./ToDoPage";
import { TodoWorkspace } from "./ws/TodoWorkspace";

const QUERY = "(min-width: 768px)";

export const TodoRoute: React.FC<ToDoPageProps> = (props) => {
  const [desk, setDesk] = useState(() => typeof window === "undefined" || !window.matchMedia || window.matchMedia(QUERY).matches);
  useEffect(() => {
    const m = window.matchMedia?.(QUERY);
    if (!m) return undefined;
    const on = () => setDesk(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  /* Phone app v3: To-do has no page of its own on a phone — `/todo` lands on Today (App.tsx), and its tasks are Today's.
     The slot stays mounted (every workspace page does), so below 768px it renders nothing. */
  return desk ? <TodoWorkspace onNavigate={props.onNavigate} /> : null;
};
