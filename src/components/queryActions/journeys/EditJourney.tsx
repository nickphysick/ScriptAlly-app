/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D7 · CORRECT THE RECORD (design-refs/query-actions-v11.html §3.16) — one step, the entry's own
 * name as its title, then the review. The date field adds an "As recorded" chip; the note is
 * editable. BLOCK: a date outside its neighbours (on or after the entry before it, on or before the
 * entry after it — today when it is the newest).
 *
 * The write is `editActivity` (both stores, then recompute), so the derived dates move with it. A
 * corrected SEND also moves `dateSent`; a corrected latest NUDGE moves `lastNudgeSentDate` — the
 * dates worked out from them follow, as the mock's consequence line says.
 *
 * The "told" variant (a `withdraw_tell` / `signed_tell` task): one step, "I've told …", which sets
 * `withdrawTold` and so retires the task that asked.
 */
import React, { useEffect, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { QueryStatus, type Query } from "../../../types";
import { activityEventLabel } from "../../../lib/activityEvent";
import { dayDiff, dayIso, dm, fmt, pastAnchors, toDay, up, type Anchor } from "../../../lib/queryActions/dates";
import { EVENT_LABEL, isEventKey } from "../../../lib/queryActions/eventKeys";
import { DateField, Fl, Note, TextBox, Toggle, Who } from "../controls";
import type { JourneyProps } from "../QueryDrawer";
import type { Guard, JourneyView } from "../journey";
import { emptyView } from "./ResponseJourney";
import { agentName, firstName, nrmnOf, whoLine } from "./common";

interface Entry { id: string; name: string; day: Date; note: string; status: string | null; isNudge: boolean }

const tsDay = (v: unknown): Date | null => toDay(v);

export function entryName(data: Record<string, unknown>): string {
  if (isEventKey(data.eventKey)) return EVENT_LABEL[data.eventKey];
  const type = String(data.type ?? "");
  const st = (data.resultingStatus as string | undefined) ?? ((Object.values(QueryStatus) as string[]).includes(type) ? type : null);
  if (st) return activityEventLabel({ resultingStatus: st }, { includeSend: true }) ?? st;
  return type || "Entry";
}

export function EditJourney({ req, today, children }: JourneyProps) {
  const db = useScriptAllyDb();
  const q = db.queries.find((x) => x.id === req.queryId) || null;
  const agent = q ? db.agents.find((a) => a.id === q.agentId) || null : null;
  const [log, setLog] = useState<Entry[] | null>(null);
  const [d, setD] = useState<Date | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [told, setTold] = useState(false);
  const [touched, setTouched] = useState(false);
  const tellMode = !req.entryId;

  useEffect(() => {
    if (!q || tellMode) return;
    let live = true;
    void db.readQueryActivity(q.id).then((rows) => {
      if (!live) return;
      const es = rows.map((r) => ({
        id: r.id, name: entryName(r.data), day: tsDay(r.data.createdAt) ?? today, note: String(r.data.note ?? ""),
        status: (r.data.resultingStatus as string) ?? null, isNudge: r.data.type === "Nudge sent",
      })).sort((a, b) => a.day.getTime() - b.day.getTime());
      setLog(es);
    });
    return () => { live = false; };
  }, [q?.id, tellMode]);

  if (!q) return children(emptyView("CORRECT THE RECORD", "Edit an entry"));
  const first = firstName(agent);
  const who = <Who name={agentName(agent)} sub={whoLine(agent, q)} nrmn={nrmnOf(q, agent)} />;

  if (tellMode) {
    const signed = q.closingReason === "accepted_offer";
    return children({
      eyebrow: "CORRECT THE RECORD", title: signed ? "Tell them you've signed" : "Tell them you've withdrawn",
      verb: "save", verbDone: "saved", button: "Save", ok: true,
      steps: [{
        title: `Tell ${first}`,
        summary: told ? "Told" : "Not yet",
        body: (
          <>
            <p className="qad-secs">{signed ? `You accepted an offer, and ${first}'s query closed with it.` : `You withdrew this query.`} It's courteous to let {first} know.</p>
            <Toggle testId="told" on={told} onClick={() => { setTold(!told); setTouched(true); }}>I’ve told {first}</Toggle>
          </>
        ),
      }],
      saves: told ? [{ text: `The “Tell ${first}” to-do comes off your list` }] : [{ text: "Nothing changes until you've told them" }],
      who, dirty: touched, touched: () => [q.id],
      commit: async () => {
        if (told) await db.updateQuery(q.id, { withdrawTold: true } as Partial<Query>);
        return { queryId: q.id, message: `Noted · ${agentName(agent)}`, sub: told ? `TOLD ${up(today)}` : "NOTHING CHANGED", touched: [q.id] };
      },
    });
  }

  const i = log ? log.findIndex((e) => e.id === req.entryId) : -1;
  const e = i >= 0 && log ? log[i] : null;
  if (!e) {
    return children({ ...emptyView("CORRECT THE RECORD", "Edit an entry"), preNote: <Note kind="info" tag="LOADING">Reading the entry…</Note>, who });
  }
  const orig = e.day;
  const day = d ?? orig;
  const text = note ?? e.note;
  const newer = log![i + 1] ?? null;
  const older = i > 0 ? log![i - 1] : null;
  const latestAllowed = newer ? newer.day : today;
  const bad: Guard | null = dayDiff(day, latestAllowed) > 0
    ? { level: "block", msg: `It must be on or before ${fmt(latestAllowed)}${newer ? `, when “${newer.name}” happened` : ""}` }
    : older && dayDiff(day, older.day) < 0
      ? { level: "block", msg: `It must be on or after ${fmt(older.day)}, when “${older.name}” happened` }
      : null;
  const anch: Anchor[] = [{ k: "orig", label: "As recorded", d: orig, sub: dm(orig) }, ...pastAnchors(today)];
  const moved = dayDiff(day, orig) !== 0;
  const isSend = e.status === QueryStatus.QUERIED || /query sent/i.test(e.name);
  const isLatestNudge = e.isNudge && !log!.slice(i + 1).some((x) => x.isNudge);

  const view: JourneyView = {
    eyebrow: "CORRECT THE RECORD", title: "Edit an entry", verb: "save", verbDone: "saved", button: "Save correction", ok: true,
    steps: [{
      title: e.name,
      summary: `${fmt(day)}${moved ? ` · was ${fmt(orig)}` : ""}`,
      guard: bad,
      body: (
        <>
          <p className="qad-secs">Correct the date or the note. The query's plan and reminders are worked out again from the new date.</p>
          <DateField id="edDate" label="DATE" value={day} anchors={anch} dir="past" onPick={(x) => { if (x) { setD(x); setTouched(true); } }} />
          <Fl>NOTE</Fl>
          <TextBox value={text} onChange={(v) => { setNote(v); setTouched(true); }} />
        </>
      ),
    }],
    saves: [
      ...(moved ? [{ text: `“${e.name}” moves from ${fmt(orig)} to ${fmt(day)}` }] : []),
      { text: "Dates worked out from it — reply expected, nudge reminders — move with it" },
    ],
    who, dirty: touched, touched: () => [q.id],
    commit: async () => {
      await db.editActivity(q.id, e.id, { ...(moved ? { date: dayIso(day) } : {}), ...(note !== null ? { details: text } : {}) });
      const extra: Record<string, unknown> = {};
      if (moved && isSend) extra.dateSent = dayIso(day);
      if (moved && isLatestNudge) extra.lastNudgeSentDate = dayIso(day);
      if (Object.keys(extra).length) await db.updateQuery(q.id, extra as Partial<Query>);
      return { queryId: q.id, message: `Entry corrected · ${agentName(agent)}`, sub: moved ? `${e.name.toUpperCase()} NOW ${up(day)}` : "NOTE UPDATED", touched: [q.id] };
    },
  };
  return children(view);
}
