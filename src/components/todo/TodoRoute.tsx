/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `/todo` chooses its page by width (To-do list v5): the tray and the desk on a desktop (768px up), the v2 page on
 * a phone. One is mounted at a time, so the two never both read the arrival keys (`sa.todoCompose`,
 * `sa.todoOpenTask`) or both bind the keys.
 */
import React, { useEffect, useState } from "react";
import { ToDoPage, type ToDoPageProps } from "./ToDoPage";
import { TodoTray } from "./v5/TodoTray";

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
  return desk ? <TodoTray onNavigate={props.onNavigate} /> : <ToDoPage {...props} />;
};
