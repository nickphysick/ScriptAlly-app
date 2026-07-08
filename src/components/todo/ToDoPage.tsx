/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToDoPage — the "To-do" workspace under the Querying parent (design ref:
 * design-refs/todo-desk-to-ledger.html). It opens in a "Clear the Desk" focus flow for the
 * urgent (writer's-turn) items and falls through to "the Ledger" — a two-pane workspace over
 * three streams (Do next · Housekeeping · Notes).
 *
 * PROMPT 1 SCOPE (this commit): the themed shell only — masthead + empty Ledger skeleton +
 * the page-level mode switch. No task logic, no Notes, no writes. The focus flow (Prompt 2)
 * and the derived streams (Prompt 3) / Notes store (Prompt 4) land in later commits.
 *
 * THEMES come from the Queries-Hub theme layer, NOT a new module: the page renders inside the
 * AppShell root (which carries .t-capp / .t-bold / .t-edn), so it consumes the same `--hub-*`
 * tokens and the same Cappuccino-only inset frame (scoped in todo.css, mirroring .qhbar::after).
 * No hardcoded / invented theme values — every surface reads a hub token.
 *
 * Layout follows THE DESK RULE: the list is FURNITURE (fills the column, scrolls internally); the
 * working pane is a DOCUMENT (clamps between a tunable floor and the viewport line, footer-closed).
 */
import React, { useState } from "react";
import { HubHeaderBar } from "../shell/HubHeaderBar";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";
import "./todo.css";

type Mode = "focus" | "ledger";
type Stream = "all" | "do" | "hk" | "note";

/** Tunable document floor for the working pane (mirrors the mockup's .pane min-height). */
const TODO_PANE_FLOOR_PX = 430;

const STREAM_SEGS: { key: Stream; label: string }[] = [
  { key: "all", label: "All" },
  { key: "do", label: "Do next" },
  { key: "hk", label: "Housekeeping" },
  { key: "note", label: "Notes" },
];

/** A small quill, matching the mockup's empty-desk motif. */
const Quill: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--hub-label)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 4c-6 1-11 6-13 12l-2 4 4-2c6-2 11-7 12-13z" />
    <path d="M14 7l3 3" />
  </svg>
);

export interface ToDoPageProps {
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
}

export const ToDoPage: React.FC<ToDoPageProps> = () => {
  // Prompt 2 resolves the real default (focus on first-visit-today / newer urgent item);
  // Prompt 1 opens straight in the Ledger. `mode` is introduced now so later prompts extend it.
  const [mode, setMode] = useState<Mode>("ledger");
  const [stream, setStream] = useState<Stream>("all");
  // Referenced now so the mode switch is a real (if single-branch) part of the shell; the focus
  // branch is built in Prompt 2. Marked void to keep the setter live without an unused warning.
  void mode;
  void setMode;

  return (
    <div
      className="todo-root"
      style={{ height: "100%", display: "flex", flexDirection: "column", minWidth: 0, background: "var(--hub-desk)", padding: "6px 28px 26px" }}
    >
      <HubHeaderBar
        title="To-do List"
        subtitle="Your writing desk"
        style={{ padding: "24px 28px", margin: "12px 0 16px", boxShadow: "0 8px 20px rgba(29,23,18,.14)" }}
        titleStyle={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 40, color: "var(--hub-head, #1d1712)" }}
      />

      {/* Filter bar — Show segments + Sort. Wired for active styling; counts + Notes-gating land
          in Prompt 3/4. */}
      <div className="todo-filter">
        <span className="todo-segl" style={{ fontFamily: FONT_MONO, color: "var(--hub-label)" }}>Show</span>
        <div className="todo-segs" style={{ background: "var(--hub-list)", border: "var(--bdw) solid var(--bd)" }}>
          {STREAM_SEGS.map((s) => {
            const on = stream === s.key;
            return (
              <button
                key={s.key}
                type="button"
                className="todo-seg"
                onClick={() => setStream(s.key)}
                style={{
                  fontFamily: FONT_MONO,
                  background: on ? "var(--hub-toggle-on)" : "transparent",
                  color: on ? "var(--hub-toggle-on-tx)" : "var(--hub-item)",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="todo-sort" style={{ fontFamily: FONT_MONO, background: "var(--hub-list)", border: "var(--bdw) solid var(--bd)", color: "var(--hub-item)" }}>
          Sort · Due date ▾
        </div>
      </div>

      {/* Ledger grid — list (furniture) + working pane (document). */}
      <div className="todo-ledger">
        {/* LIST — fills the column, scrolls internally. Prompt 3 fills it with the derived streams. */}
        <div className="todo-list" style={{ background: "var(--hub-list)", border: "var(--bdw) solid var(--bd)", borderRadius: "var(--hub-radius)" }}>
          <div className="todo-list-scroll">
            <div className="todo-list-empty" style={{ fontFamily: FONT_MONO, color: "var(--hub-label)" }}>Your list will appear here</div>
          </div>
        </div>

        {/* PANE — document: clamps between the floor and the viewport line, footer-closed. */}
        <div
          className="todo-pane"
          style={{ background: "var(--hub-pane-process)", border: "var(--bdw) solid var(--hub-pane-bd)", borderRadius: "var(--hub-radius)", minHeight: TODO_PANE_FLOOR_PX }}
        >
          <div className="todo-pane-inner">
            <div className="todo-pane-body">
              <Quill />
              <div className="todo-pane-empty" style={{ fontFamily: FONT_SERIF, color: "var(--hub-label)" }}>Select an item to work on</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToDoPage;
