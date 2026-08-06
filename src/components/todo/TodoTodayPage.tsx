/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoTodayPage — the Today route (To-do workspace pack; shell in Phase 1, body in Phase 3).
 *
 * ⚠️ THE PAGE'S SIDE CONTAINER IS HOSTED HERE, NOT IN THE PAGE BODY, because it belongs to every
 * To-do page rather than to one of them. Phase 3 fills the main column; the container, its LISTS
 * filter and the app-sidebar-is-the-only-nav rule are settled now so the body is written against
 * a page that already has its furniture.
 */
import React, { useMemo, useState } from "react";
import { PageHeader } from "../shell/PageHeader";
import { TodoSideContainer } from "./TodoSideContainer";
import { TODO_OPEN_TASK_SETTINGS, TodoListId } from "../../lib/todoRoutes";
import { useTodoCounts } from "./useTodoCounts";
import "./todoSide.css";

export interface TodoTodayPageProps {
  onNavigate: (tab: string, subPageName?: string) => void;
}

export const TodoTodayPage: React.FC<TodoTodayPageProps> = () => {
  const counts = useTodoCounts();
  const [list, setList] = useState<TodoListId | null>(null);

  /* Phase 3 renders the day's list and the suggested bench here; the derived subtitle lands with
     it. Until then the header states the page and nothing it cannot yet support. */
  const subtitle = useMemo(() => "The list you built for today.", []);

  return (
    <div className="tdw">
      <TodoSideContainer
        counts={counts.byList}
        active={list}
        onSelect={setList}
        onOpenTaskSettings={() => window.dispatchEvent(new CustomEvent(TODO_OPEN_TASK_SETTINGS))}
      />
      <div className="tdw-main">
        <PageHeader title="Today" description={subtitle} />
      </div>
    </div>
  );
};
