/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoRowEditor — the in-row editor, and the draft it edits (to-do row round, 20 Sep;
 * ref `todo-journeys.html`'s `.edit`).
 *
 * ⚠️ IT OPENS ONLY WHEN THE DEFAULTS WERE WRONG. The tick has already committed with them; this is
 * `Change`, not a step. So every field arrives FILLED with what was actually written, and Cancel is
 * a real cancel — the record stands either way.
 *
 * ⚠️ AND IT IS ALSO WHERE THE DUPLICATE-SEND GUARD ASKS (Nick, 20 Sep). `useTaskCommit` refuses a
 * second send of the same materials; on this surface the refusal opens this editor pre-filled with
 * the warning above the fields and `Log it anyway` on Save, so the question has a home and the
 * optimistic path only runs when the guard passes.
 *
 * ⚠️ THE DRAFT IS NOT `JourneySendValues`. It is the four or five things this editor can actually
 * change; `draftToValues` widens it at the point of commit. A component holding the pane's whole
 * value object would be a second place that has to know what every journey needs.
 */
import React from "react";
import { DEFAULT_CHECKBACK_DAYS } from "../../lib/todoWalk";
import { CLOSE_REASONS } from "../../lib/todoJourneys";
import { defaultSentMaterials } from "../../lib/journeyMaterials";
import type { JourneySendValues, SendMethod } from "../../lib/paneJourney";
import type { TodoRow } from "../../lib/dashTodo";

/** the day the editor calls "today", as `YYYY-MM-DD` in the reader's own zone */
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (days: number): string => { const d = new Date(); d.setDate(d.getDate() + days); return ymd(d); };

/** "31 Oct" — the app's own short date, never a second format */
export const shortDate = (iso: string): string => {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? "" : t.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export interface RowDraft {
  /** what went, in the app's own material words */
  materials: string[];
  also: string;
  /** when it went — the editor edits a date, the three chips are shortcuts to one */
  sentDate: string;
  method: SendMethod;
  /** when a reply is expected: the agency's window added to the send, where they state one */
  expected: string;
  /** when to be reminded — empty means the writer said not to */
  remind: string;
  note: string;
}

/**
 * The defaults the tick committed with, so `Change` opens showing what was actually written.
 *
 * ⚠️ THE REPLY WINDOW IS THE AGENCY'S OWN WHERE THEY STATE ONE. `row.window` carries
 * `replyWindow`'s answer including whether it was STATED; an unstated window still fills the field
 * — the writer is allowed a date — but nothing here claims the agency gave it.
 */
export const blankDraft = (row: TodoRow): RowDraft => ({
  materials: defaultSentMaterials(row.taskType, row.title.who || "the agent"),
  also: "",
  sentDate: shift(0),
  method: "Email",
  expected: shift(row.windowDays),
  remind: shift(row.windowDays + 14),
  note: "",
});

/** the editor's draft → the one shape `useTaskCommit` reads */
export const draftToValues = (d: RowDraft, mode: "sent" | "nudge" | "close"): JourneySendValues => ({
  materials: d.materials,
  also: d.also,
  method: d.method,
  sentDate: d.sentDate,
  note: d.note,
  /* a nudge's "next nudge" is a lead in days from today — empty means the writer said don't */
  checkBackDays: d.remind ? Math.max(0, Math.round((new Date(d.remind).getTime() - Date.now()) / 86400000)) : DEFAULT_CHECKBACK_DAYS,
  noCheckIn: !d.remind,
  /* ⚠️ `no_reply` IS `CLOSE_REASONS[0]`, READ RATHER THAN SPELLED — the same reason the pane's own
     close journey uses, so "Close it, no reply" lands under No reply in Closed on both surfaces. */
  reason: mode === "close" ? CLOSE_REASONS[0].key : null,
  fixResponseWeeks: "",
  fixNoMeansNo: false,
  fixMaterials: [],
  fixMswl: "",
  recordRows: [],
  branch: null,
  decision: null,
  remindDate: d.remind,
  notifySel: {},
  notifyHolding: [],
  ...(mode === "sent" && d.expected ? { writerExpectedDate: d.expected } : {}),
  ...(mode === "nudge" && d.remind ? { nudgeDate: d.remind } : {}),
});

/**
 * The strip's sentence — what was logged, and the one date that follows from it.
 *
 * ⚠️ THE FOLLOW-ON DATE IS PER OUTCOME, NOT PER ROW, AND THE FIRST VERSION GOT THIS WRONG IN THE
 * ONE CASE THAT MATTERS. It computed the tail from the row's own window whatever had been
 * committed, so closing a query rendered **"Closed … Reply due 15 Nov"** — a date for a reply
 * nobody is waiting for any more, on the one outcome whose whole meaning is that the waiting has
 * stopped. Measured on the harness board.
 *
 * ⚠️ AND A CLOSE LEADS WITH ITS OWN WORDS RATHER THAN THE TOAST'S. `useTaskCommit`'s close toast
 * says `Done — "No response from Peter Vance for 6 months"`, which is the CARD's title quoted back;
 * the strip states what was recorded. Everywhere else the toast IS the app's own name for the write
 * and is used verbatim, because a second description is a second vocabulary for one event.
 */
export const stripFor = (
  row: TodoRow | undefined,
  logged: string,
  outcome: "sent" | "nudge" | "close" | "dismiss" = "sent",
): React.ReactNode => {
  if (!row) return <>{logged}</>;
  if (outcome === "dismiss") return <>{logged}</>;
  if (outcome === "close") {
    /* the elapsed figure is the row's own — the same one it was showing a moment ago */
    const span = row.days === null ? null : `${row.days} days`;
    return <>Closed: <b>no reply</b>{span ? ` after ${span}` : ""}. Counts as “No reply” in Closed.</>;
  }
  const follow = outcome === "nudge"
    ? shortDate(shift(28))
    : row.windowDays ? shortDate(shift(row.windowDays)) : "";
  const tail = outcome === "nudge"
    ? (follow ? ` Next nudge suggested ${follow}.` : "")
    : (follow ? ` Reply due ${follow}.` : "");
  return <>Logged: <b>{logged}</b>.{tail}</>;
};

const CHIP = (on: boolean) => `os-tdopt${on ? " os-tdopt--on" : ""}`;

export const TodoRowEditor: React.FC<{
  mode: "sent" | "nudge";
  draft: RowDraft;
  onChange: (d: RowDraft) => void;
}> = ({ mode, draft, onChange }) => {
  const set = (patch: Partial<RowDraft>) => onChange({ ...draft, ...patch });
  const when = (label: string, value: string) => (
    <button type="button" className={CHIP(draft.sentDate === value)} onClick={() => set({ sentDate: value })}>{label}</button>
  );

  return (
    <>
      {mode === "sent" ? (
        <div className="os-tder">
          <span className="os-tdk">What you sent</span>
          <span className="os-tdv" data-probe="ed-materials">
            {draft.materials.map((m) => <span key={m} className="os-tdopt os-tdopt--on">{m}</span>)}
            {draft.materials.length === 0 && <span className="os-tdk">Nothing recorded</span>}
          </span>
        </div>
      ) : (
        <div className="os-tder">
          <span className="os-tdk">How</span>
          <span className="os-tdv" data-probe="ed-method">
            {(["Email", "Agency portal", "Post"] as SendMethod[]).map((m) => (
              <button type="button" key={m} className={CHIP(draft.method === m)} onClick={() => set({ method: m })}>{m}</button>
            ))}
          </span>
        </div>
      )}

      <div className="os-tder">
        <span className="os-tdk">{mode === "nudge" ? "Sent" : "When"}</span>
        <span className="os-tdv" data-probe="ed-when">
          {when("Today", shift(0))}
          {when("Yesterday", shift(-1))}
          <input type="date" className="os-tdopt" aria-label="Pick a date"
            value={draft.sentDate} max={shift(0)} onChange={(e) => set({ sentDate: e.target.value })} />
        </span>
      </div>

      {mode === "sent" && (
        <div className="os-tder">
          <span className="os-tdk">Reply expected</span>
          <span className="os-tdv" data-probe="ed-expected">
            <input type="date" className="os-tdopt" aria-label="Reply expected"
              value={draft.expected} onChange={(e) => set({ expected: e.target.value })} />
          </span>
        </div>
      )}

      <div className="os-tder">
        <span className="os-tdk">{mode === "nudge" ? "Nudge again" : "Nudge reminder"}</span>
        <span className="os-tdv" data-probe="ed-remind">
          {draft.remind
            ? <input type="date" className="os-tdopt" aria-label="Remind me"
              value={draft.remind} onChange={(e) => set({ remind: e.target.value })} />
            : <span className="os-tdk">No reminder</span>}
          {/* ⚠️ "DON'T" IS NOT AN EMPTY DATE FIELD — it is the writer saying they do not want the app
              to suggest another, and `noCheckIn` is the flag the commit reads for exactly that. */}
          <button type="button" className={CHIP(!draft.remind)}
            onClick={() => set({ remind: draft.remind ? "" : shift(28) })}>
            {draft.remind ? "Don’t" : "Remind me"}
          </button>
        </span>
      </div>

      {mode === "sent" && (
        <div className="os-tder">
          <span className="os-tdk">Anything else</span>
          <span className="os-tdv">
            <input type="text" className="os-tdnote" style={{ minHeight: 0 }} placeholder="Anything else that went with it"
              aria-label="Anything else that went with it"
              value={draft.also} onChange={(e) => set({ also: e.target.value })} />
          </span>
        </div>
      )}

      <div className="os-tder">
        <span className="os-tdk">Note</span>
        <span className="os-tdv">
          <textarea className="os-tdnote" placeholder="Add a note for your file" aria-label="Add a note for your file"
            value={draft.note} onChange={(e) => set({ note: e.target.value })} />
        </span>
      </div>
    </>
  );
};
