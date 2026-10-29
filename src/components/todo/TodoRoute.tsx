/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `/todo` chooses its page by width (To-do list v5): the tray and the desk on a desktop (768px up), and since Phone app
 * v2 Part 5 the phone's own To-do (TodoPhone) below it. One is mounted at a time, so the two never both read the arrival keys (`sa.todoCompose`,
 * `sa.todoOpenTask`) or both bind the keys.
 */
import React, { useEffect, useState } from "react";
import type { ToDoPageProps } from "./ToDoPage";
import { TodoTray } from "./v5/TodoTray";
import { TodoPhone } from "./phone/TodoPhone";

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
  /* Phone app v2, Part 5: below 768px the phone's own To-do (TodoPhone) — the v2 page is no longer reached on a phone */
  return desk ? <TodoTray onNavigate={props.onNavigate} /> : <TodoPhone />;
};
