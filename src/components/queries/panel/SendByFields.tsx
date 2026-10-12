/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "When you'll send it by", on the correction desk's form (Query panel v2, ruling of 12 Oct): the response
 * journey's own date chips and reminder choices, after the entry's date and note, for the request the query is
 * waiting on. It holds no answer of its own — the page owns the state and saves it with the rest of the form.
 *
 * ⚠️ IT OPENS UNANSWERED. A recorded date shows as "As recorded"; none shows no chip lit. Nothing is written
 *    for a field the writer did not touch.
 */
import React, { useMemo, useState } from "react";
import { Chips, DateField, DrawerContext, Fl, Note } from "../../queryActions/controls";
import { dm, fmt, type Anchor } from "../../../lib/queryActions/dates";
import { REMIND, sendByAnswer } from "../../../lib/queryActions/sendBy";

export interface SendByDraft { mode: string | null; custom: Date | null; remind: string }
export const SEND_BY_BLANK: SendByDraft = { mode: null, custom: null, remind: "1d" };

export const SendByFields: React.FC<{
  today: Date;
  /** the send-by date the query carries now, if any */
  recorded: Date | null;
  draft: SendByDraft;
  onChange: (d: SendByDraft) => void;
  /** a revision: "resubmit by" */
  resubmit?: boolean;
}> = ({ today, recorded, draft, onChange, resubmit = false }) => {
  const [openCal, setOpenCal] = useState<string | null>(null);
  const ctx = useMemo(() => ({ today, openCal, setOpenCal }), [today, openCal]);
  const a = sendByAnswer(today, draft.mode, draft.custom, draft.remind);
  const anchors: Anchor[] = [...(recorded ? [{ k: "kept", label: "As recorded", d: recorded, sub: dm(recorded) }] : []), ...a.weeks, { k: "none", label: "No date given", d: null }];
  return (
    <DrawerContext.Provider value={ctx}>
      <div className="qsb" data-qp="send-by">
        <Fl>{resubmit ? "WHEN YOU'LL RESUBMIT BY" : "WHEN YOU'LL SEND IT BY"}</Fl>
        <DateField id="corSendBy" value={draft.mode ? a.sendBy : recorded} anchors={anchors} dir="future"
          forceKey={!draft.mode ? (recorded ? "kept" : "unset") : draft.mode === "custom" ? null : draft.mode}
          onPick={(x, k) => onChange(k === "kept" ? { ...draft, mode: null } : k === "custom" ? { ...draft, mode: "custom", custom: x } : { ...draft, mode: k })} />
        {draft.mode && !a.none ? (
          <>
            <Fl>REMIND ME</Fl>
            <Chips name="remind" value={draft.remind} onPick={(k) => onChange({ ...draft, remind: k })} options={REMIND.map(([k, l]) => [k, l] as [string, string])} />
          </>
        ) : a.none ? (
          <Note kind="info" tag="TIP">Agents who don't set a date still notice speed. A reminder goes on your to-do for <b>{fmt(a.noDateTask)}</b>, so it doesn't drift.</Note>
        ) : null}
      </div>
    </DrawerContext.Provider>
  );
};
