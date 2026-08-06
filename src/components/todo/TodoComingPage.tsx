/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The To-do workspace's two UNBUILT pages — Calendar and Noteboard (workspace pack P1).
 *
 * They are routed NOW, ahead of their builds, for one reason: To-do became a four-page section
 * in the sidebar, and a nav entry that leads nowhere is worse than no nav entry. So each has its
 * real route, its real breadcrumb, its real header — and a body that says plainly what it will
 * be and where to go meanwhile. It does not pretend: no skeleton rows, no greyed mock of a
 * calendar, nothing that could be mistaken for data still loading. A placeholder that imitates
 * the finished thing teaches the reader to distrust the finished thing.
 *
 * Both are replaced wholesale by the pack that builds them; this file goes with them.
 */
import React from "react";
import { PageHeader } from "../shell/PageHeader";
import "./todoComing.css";

export type TodoComingKind = "calendar" | "noteboard";

const COPY: Record<TodoComingKind, { title: string; description: string; body: string; where: string }> = {
  calendar: {
    title: "Calendar",
    description: "Your tasks and notes, by the day they fall on.",
    body:
      "The calendar will show dated tasks on their days, with completed work struck through where it was cleared — the same records the To-do list holds, read by date instead of by type.",
    where: "Dated tasks live on the To-do list until then, and today's on the Today page.",
  },
  noteboard: {
    title: "Noteboard",
    description: "Notes to self — the undated half of the workspace.",
    body:
      "The noteboard will hold everything you wrote down without a date. Give a note a date and it becomes a task, which is why it needs a home of its own rather than a lane borrowed from the list.",
    where: "Your notes are on the To-do list meanwhile, in the Your tasks & notes group.",
  },
};

export const TodoComingPage: React.FC<{
  kind: TodoComingKind;
  /** Router-direct navigation — the one link out, back to the list. */
  onNavigatePath: (path: string) => void;
}> = ({ kind, onNavigatePath }) => {
  const copy = COPY[kind];
  return (
    <div className="tdc-wrap">
      <PageHeader title={copy.title} description={copy.description} />
      <div className="tdc-body">
        <div className="tdc-card">
          <p className="tdc-kicker">Not built yet</p>
          <p className="tdc-lede">{copy.body}</p>
          <p className="tdc-where">{copy.where}</p>
          <button type="button" className="tdc-back" onClick={() => onNavigatePath("/todo")}>
            Go to the To-do list
          </button>
        </div>
      </div>
    </div>
  );
};
