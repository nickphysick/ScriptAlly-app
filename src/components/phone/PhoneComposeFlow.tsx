/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 4 — "Add a task" and "Add a note" in the flow layout (ref FLOWS.task / FLOWS.note). The questions
 * are the To-do composer's own fields, in its order: the text (and its optional detail), then — a task only — the day
 * it is due. The save is the composer's: `addUserTask` with the same fields it writes (a task carries `dueDate` and
 * `surfaceOffset: "on-day"`, a note neither), so a task added here is the same document the To-do page would make.
 * Undo deletes what the save created and nothing else.
 */
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useScriptAllyDb } from "../../lib/db";
import { addDays, dayOf, ymd } from "../../lib/queryActions/dates";
import { closePhoneCompose, subscribePhoneCompose, type ComposeKind } from "../../lib/phoneCompose";
import { showUndoBar } from "../../lib/queryActions/drawerStore";
import { DateField, DrawerContext, Fl, TextBox, fmt } from "../queryActions/controls";
import type { JourneyStep, JourneyView } from "../queryActions/journey";
import { PhoneFlowShell } from "../queryActions/PhoneFlowShell";

export const PhoneComposeHost: React.FC = () => {
  const [kind, setKind] = useState<ComposeKind | null>(null);
  const [gen, setGen] = useState(0);
  useEffect(() => subscribePhoneCompose((k) => { setKind(k); if (k) setGen((g) => g + 1); }), []);
  if (!kind) return null;
  return <ComposeFlow key={gen} kind={kind} onDone={closePhoneCompose} />;
};

const ComposeFlow: React.FC<{ kind: ComposeKind; onDone: () => void }> = ({ kind, onDone }) => {
  const { addUserTask, deleteUserTask } = useScriptAllyDb();
  const today = useMemo(() => dayOf(new Date()), []);
  const [openCal, setOpenCal] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [detail, setDetail] = useState("");
  const [due, setDue] = useState<Date | null>(kind === "task" ? today : null);
  const task = kind === "task";
  const t = text.trim();

  const steps: JourneyStep[] = [{
    title: task ? "The task" : "The note",
    summary: t || (task ? "Write the task" : "Write the note"),
    guard: t ? null : { level: "block", msg: task ? "Write the task" : "Write the note" },
    body: (
      <>
        <TextBox value={text} onChange={setText} placeholder={task ? "e.g. Research five more agents" : "Write anything"} />
        {task ? <><Fl>More detail, if you want it</Fl><TextBox value={detail} onChange={setDetail} placeholder="Optional" /></> : null}
      </>
    ),
  }];
  if (task) {
    steps.push({
      title: "When",
      summary: due ? fmt(due) : "Choose a day",
      guard: due ? null : { level: "block", msg: "Choose a day" },
      body: (
        <DateField id="composeDue" value={due} dir="future" onPick={(d) => { if (d) setDue(d); }}
          anchors={[
            { k: "t", label: "Today", d: today },
            { k: "tm", label: "Tomorrow", d: addDays(today, 1) },
            { k: "nw", label: "Next week", d: addDays(today, 7) },
          ]} />
      ),
    });
  }
  const view: JourneyView = {
    eyebrow: task ? "ADD A TASK" : "ADD A NOTE",
    title: task ? "Add a task" : "Add a note",
    verb: "add", verbDone: "added",
    button: task ? "Add task" : "Pin it",
    ok: true,
    steps,
    saves: [{ text: task ? "It goes on your to-do list" : "It goes on your corkboard" }],
    dirty: !!t || !!detail.trim(),
    touched: () => [],
    commit: async () => {
      const id = "task-" + Math.random().toString(36).slice(2, 11);
      const got = task
        ? await addUserTask({ id, text: t, detail: detail.trim() || undefined, dueDate: due ? ymd(due) : undefined, surfaceOffset: "on-day" })
        : await addUserTask({ id, text: t });
      return { queryId: null, message: "", sub: "", touched: got ? [got] : [] };
    },
  };

  const save = async () => {
    const out = await view.commit();
    const id = out.touched[0];
    onDone();
    /* the ref's words: the composer itself says nothing on a save */
    showUndoBar({
      message: task ? "Added to your list." : "Pinned to your corkboard.",
      sub: "",
      ...(id ? { undo: async () => { await deleteUserTask(id); } } : {}),
    });
  };

  /* portalled like the query drawer, so it sits on the page's own layer rather than inside the shell's tree */
  return createPortal(
    <DrawerContext.Provider value={{ today, openCal, setOpenCal }}>
      <div className="qad-root is-open" data-pf-compose={kind}>
        <PhoneFlowShell view={view} mode={kind} open live={null}
          noPark onCancel={onDone} onPark={onDone} onSave={save} />
      </div>
    </DrawerContext.Provider>,
    document.body,
  );
};
